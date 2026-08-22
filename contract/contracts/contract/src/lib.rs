#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, token,
    Address, BytesN, Env, String, Symbol, Vec,
};

// ----------------------------- Types --------------------------------------

/// A minted NFT. Metadata is stored on-chain for demo simplicity.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Nft {
    pub id: u64,
    pub owner: Address,
    pub creator: Address,
    /// Creator royalty in basis points (100 = 1%). Enforced on EVERY sale
    /// path: direct purchase, auction settlement and accepted offers.
    pub royalty_bps: u32,
    pub name: String,
    pub uri: String,
}

/// A fixed-price listing. The NFT stays with the owner but transfers are
/// locked until the listing is bought or cancelled.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Listing {
    pub token_id: u64,
    pub seller: Address,
    pub price: i128, // stroops of the payment token (XLM)
}

/// An ascending (English) auction. Bids are escrowed by the contract in the
/// payment token; an outbid bidder is refunded immediately.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Auction {
    pub id: u64,
    pub token_id: u64,
    pub seller: Address,
    pub reserve_price: i128,
    pub end_time: u64, // ledger timestamp when bidding closes
    pub highest_bidder: Option<Address>,
    pub highest_bid: i128,
    pub settled: bool,
}

/// A standing offer on an NFT. The amount is escrowed by the contract until
/// the offer is accepted or cancelled.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Offer {
    pub token_id: u64,
    pub buyer: Address,
    pub amount: i128,
}

/// A completed sale (any path). `kind` is one of "direct" | "auction" | "offer".
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Sale {
    pub token_id: u64,
    pub seller: Address,
    pub buyer: Address,
    pub price: i128,
    pub royalty_paid: i128,
    pub kind: Symbol,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    PaymentToken,
    TokenCount,
    AuctionCount,
    Nft(u64),
    Listing(u64),
    Auction(u64),
    /// token_id -> id of the auction currently locking this token.
    TokenAuction(u64),
    Offers(u64),
    Sales,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    TokenNotFound = 1,
    NotOwner = 2,
    InvalidAmount = 3,
    InvalidRoyalty = 4,
    AlreadyListed = 5,
    NotListed = 6,
    SelfPurchase = 7,
    AuctionNotFound = 8,
    AuctionActive = 9,
    AuctionEnded = 10,
    AuctionSettled = 11,
    BidTooLow = 12,
    SelfBid = 13,
    OfferNotFound = 14,
    TokenLocked = 15,
    HasBids = 16,
}

const TTL_THRESHOLD: u32 = 100;
const TTL_EXTEND_TO: u32 = 172_800; // keeps state alive ~10 days
/// Royalties are capped at 50% so listings always leave value for the seller.
const MAX_ROYALTY_BPS: u32 = 5_000;

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    /// Deploy-time initialization: `admin` can upgrade the contract wasm;
    /// `payment_token` is the token used for all payments (native XLM
    /// Stellar Asset Contract on testnet).
    pub fn __constructor(env: Env, admin: Address, payment_token: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PaymentToken, &payment_token);
    }

    /// Admin-only wasm upgrade so fixes don't require redeploying (and
    /// therefore wiping) marketplace state.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    // -------------------- internal helpers (not exported) ----------------

    fn bump(env: &Env) {
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    fn extend(env: &Env, key: &DataKey) {
        env.storage()
            .persistent()
            .extend_ttl(key, TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    fn token_client(env: &Env) -> token::Client<'_> {
        let addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .unwrap();
        token::Client::new(env, &addr)
    }

    fn read_nft(env: &Env, id: u64) -> Nft {
        env.storage()
            .persistent()
            .get(&DataKey::Nft(id))
            .unwrap_or_else(|| panic_with_error!(env, Error::TokenNotFound))
    }

    fn write_nft(env: &Env, nft: &Nft) {
        let key = DataKey::Nft(nft.id);
        env.storage().persistent().set(&key, nft);
        Self::extend(env, &key);
    }

    fn read_listing(env: &Env, token_id: u64) -> Option<Listing> {
        env.storage().persistent().get(&DataKey::Listing(token_id))
    }

    fn active_auction_id(env: &Env, token_id: u64) -> Option<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::TokenAuction(token_id))
    }

    fn read_auction(env: &Env, id: u64) -> Auction {
        env.storage()
            .persistent()
            .get(&DataKey::Auction(id))
            .unwrap_or_else(|| panic_with_error!(env, Error::AuctionNotFound))
    }

    fn write_auction(env: &Env, auction: &Auction) {
        let key = DataKey::Auction(auction.id);
        env.storage().persistent().set(&key, auction);
        Self::extend(env, &key);
    }

    fn read_offers(env: &Env, token_id: u64) -> Vec<Offer> {
        env.storage()
            .persistent()
            .get(&DataKey::Offers(token_id))
            .unwrap_or_else(|| Vec::new(env))
    }

    fn write_offers(env: &Env, token_id: u64, offers: &Vec<Offer>) {
        let key = DataKey::Offers(token_id);
        env.storage().persistent().set(&key, offers);
        Self::extend(env, &key);
    }

    /// Royalty split for a sale by `seller`. No royalty is transferred when
    /// the seller IS the creator (they already receive the full amount).
    fn split(price: i128, nft: &Nft, seller: &Address) -> (i128, i128) {
        if nft.creator == *seller || nft.royalty_bps == 0 {
            return (0, price);
        }
        let royalty = price * (nft.royalty_bps as i128) / 10_000;
        (royalty, price - royalty)
    }

    fn record_sale(env: &Env, sale: Sale) {
        let mut sales: Vec<Sale> = env
            .storage()
            .persistent()
            .get(&DataKey::Sales)
            .unwrap_or_else(|| Vec::new(env));
        sales.push_back(sale);
        env.storage().persistent().set(&DataKey::Sales, &sales);
        Self::extend(env, &DataKey::Sales);
    }

    // ------------------------------ writes -------------------------------

    /// Mint a new NFT with an enforced creator royalty. Returns the token id.
    pub fn mint(env: Env, creator: Address, name: String, uri: String, royalty_bps: u32) -> u64 {
        creator.require_auth();
        Self::bump(&env);
        if royalty_bps > MAX_ROYALTY_BPS {
            panic_with_error!(&env, Error::InvalidRoyalty);
        }
        let id = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::TokenCount)
            .unwrap_or(0)
            + 1;
        env.storage().instance().set(&DataKey::TokenCount, &id);

        let nft = Nft {
            id,
            owner: creator.clone(),
            creator: creator.clone(),
            royalty_bps,
            name: name.clone(),
            uri,
        };
        Self::write_nft(&env, &nft);

        env.events().publish(
            (Symbol::new(&env, "minted"),),
            (id, creator, name, royalty_bps),
        );
        id
    }

    /// Create a fixed-price listing for an owned NFT.
    pub fn list_fixed(env: Env, seller: Address, token_id: u64, price: i128) {
        seller.require_auth();
        Self::bump(&env);
        if price <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let nft = Self::read_nft(&env, token_id);
        if nft.owner != seller {
            panic_with_error!(&env, Error::NotOwner);
        }
        if Self::active_auction_id(&env, token_id).is_some() {
            panic_with_error!(&env, Error::TokenLocked);
        }
        if Self::read_listing(&env, token_id).is_some() {
            panic_with_error!(&env, Error::AlreadyListed);
        }

        let listing = Listing {
            token_id,
            seller: seller.clone(),
            price,
        };
        let key = DataKey::Listing(token_id);
        env.storage().persistent().set(&key, &listing);
        Self::extend(&env, &key);

        env.events().publish(
            (Symbol::new(&env, "listed"),),
            (token_id, seller, price),
        );
    }

    /// Cancel an active fixed-price listing.
    pub fn cancel_listing(env: Env, seller: Address, token_id: u64) {
        seller.require_auth();
        Self::bump(&env);
        let listing = Self::read_listing(&env, token_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotListed));
        if listing.seller != seller {
            panic_with_error!(&env, Error::NotOwner);
        }
        env.storage()
            .persistent()
            .remove(&DataKey::Listing(token_id));

        env.events()
            .publish((Symbol::new(&env, "unlisted"),), (token_id, seller));
    }

    /// Buy a listed NFT at its fixed price. The creator royalty is paid
    /// atomically in the same invocation.
    pub fn buy(env: Env, buyer: Address, token_id: u64) {
        buyer.require_auth();
        Self::bump(&env);
        let listing = Self::read_listing(&env, token_id)
            .unwrap_or_else(|| panic_with_error!(&env, Error::NotListed));
        if buyer == listing.seller {
            panic_with_error!(&env, Error::SelfPurchase);
        }
        let mut nft = Self::read_nft(&env, token_id);

        let (royalty, seller_cut) = Self::split(listing.price, &nft, &listing.seller);
        let tok = Self::token_client(&env);
        if royalty > 0 {
            tok.transfer(&buyer, &nft.creator, &royalty);
        }
        tok.transfer(&buyer, &listing.seller, &seller_cut);

        nft.owner = buyer.clone();
        Self::write_nft(&env, &nft);
        env.storage()
            .persistent()
            .remove(&DataKey::Listing(token_id));

        Self::record_sale(
            &env,
            Sale {
                token_id,
                seller: listing.seller.clone(),
                buyer: buyer.clone(),
                price: listing.price,
                royalty_paid: royalty,
                kind: symbol_short!("direct"),
                timestamp: env.ledger().timestamp(),
            },
        );

        env.events().publish(
            (Symbol::new(&env, "purchase"),),
            (token_id, listing.seller, buyer, listing.price, royalty),
        );
    }

    /// Start a time-boxed ascending auction for an owned NFT.
    /// Returns the auction id. The token is locked until settlement.
    pub fn create_auction(
        env: Env,
        seller: Address,
        token_id: u64,
        reserve_price: i128,
        duration_secs: u64,
    ) -> u64 {
        seller.require_auth();
        Self::bump(&env);
        if reserve_price <= 0 || duration_secs == 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let nft = Self::read_nft(&env, token_id);
        if nft.owner != seller {
            panic_with_error!(&env, Error::NotOwner);
        }
        if Self::read_listing(&env, token_id).is_some() {
            panic_with_error!(&env, Error::AlreadyListed);
        }
        if Self::active_auction_id(&env, token_id).is_some() {
            panic_with_error!(&env, Error::TokenLocked);
        }

        let id = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::AuctionCount)
            .unwrap_or(0)
            + 1;
        env.storage().instance().set(&DataKey::AuctionCount, &id);

        let auction = Auction {
            id,
            token_id,
            seller: seller.clone(),
            reserve_price,
            end_time: env.ledger().timestamp() + duration_secs,
            highest_bidder: None,
            highest_bid: 0,
            settled: false,
        };
        Self::write_auction(&env, &auction);
        let lock_key = DataKey::TokenAuction(token_id);
        env.storage().persistent().set(&lock_key, &id);
        Self::extend(&env, &lock_key);

        env.events().publish(
            (Symbol::new(&env, "auction_created"),),
            (id, token_id, seller, reserve_price),
        );
        id
    }

    /// Place a bid. The amount is escrowed in the contract; the previously
    /// highest bidder is refunded immediately.
    pub fn place_bid(env: Env, bidder: Address, auction_id: u64, amount: i128) {
        bidder.require_auth();
        Self::bump(&env);
        let mut auction = Self::read_auction(&env, auction_id);
        if auction.settled {
            panic_with_error!(&env, Error::AuctionSettled);
        }
        if env.ledger().timestamp() >= auction.end_time {
            panic_with_error!(&env, Error::AuctionEnded);
        }
        if bidder == auction.seller {
            panic_with_error!(&env, Error::SelfBid);
        }
        if amount < auction.reserve_price || amount <= auction.highest_bid {
            panic_with_error!(&env, Error::BidTooLow);
        }

        let tok = Self::token_client(&env);
        tok.transfer(&bidder, &env.current_contract_address(), &amount);
        if let Some(prev) = auction.highest_bidder.clone() {
            tok.transfer(&env.current_contract_address(), &prev, &auction.highest_bid);
        }

        auction.highest_bidder = Some(bidder.clone());
        auction.highest_bid = amount;
        Self::write_auction(&env, &auction);

        env.events().publish(
            (Symbol::new(&env, "bid_placed"),),
            (auction_id, bidder, amount),
        );
    }

    /// Cancel an auction that has no bids yet. Only the seller may cancel;
    /// once a bid is escrowed the auction must run to its deadline so
    /// bidders can't be rugged.
    pub fn cancel_auction(env: Env, seller: Address, auction_id: u64) {
        seller.require_auth();
        Self::bump(&env);
        let mut auction = Self::read_auction(&env, auction_id);
        if auction.seller != seller {
            panic_with_error!(&env, Error::NotOwner);
        }
        if auction.settled {
            panic_with_error!(&env, Error::AuctionSettled);
        }
        if auction.highest_bidder.is_some() {
            panic_with_error!(&env, Error::HasBids);
        }

        env.storage()
            .persistent()
            .remove(&DataKey::TokenAuction(auction.token_id));
        auction.settled = true;
        Self::write_auction(&env, &auction);

        env.events().publish(
            (Symbol::new(&env, "auction_cancelled"),),
            (auction_id, auction.token_id, seller),
        );
    }

    /// Permissionless settlement once the deadline has passed.
    /// With a winner: NFT transfers to them and escrowed funds are split
    /// between seller and creator (royalty enforced). Without bids the token
    /// is simply unlocked.
    pub fn settle_auction(env: Env, auction_id: u64) {
        Self::bump(&env);
        let mut auction = Self::read_auction(&env, auction_id);
        if auction.settled {
            panic_with_error!(&env, Error::AuctionSettled);
        }
        if env.ledger().timestamp() < auction.end_time {
            panic_with_error!(&env, Error::AuctionActive);
        }

        env.storage()
            .persistent()
            .remove(&DataKey::TokenAuction(auction.token_id));

        match auction.highest_bidder.clone() {
            Some(winner) => {
                let mut nft = Self::read_nft(&env, auction.token_id);
                let (royalty, seller_cut) =
                    Self::split(auction.highest_bid, &nft, &auction.seller);
                let tok = Self::token_client(&env);
                if royalty > 0 {
                    tok.transfer(&env.current_contract_address(), &nft.creator, &royalty);
                }
                tok.transfer(&env.current_contract_address(), &auction.seller, &seller_cut);

                nft.owner = winner.clone();
                Self::write_nft(&env, &nft);

                Self::record_sale(
                    &env,
                    Sale {
                        token_id: auction.token_id,
                        seller: auction.seller.clone(),
                        buyer: winner.clone(),
                        price: auction.highest_bid,
                        royalty_paid: royalty,
                        kind: symbol_short!("auction"),
                        timestamp: env.ledger().timestamp(),
                    },
                );

                env.events().publish(
                    (Symbol::new(&env, "auction_settled"),),
                    (auction_id, auction.token_id, Some(winner), auction.highest_bid),
                );
            }
            None => {
                env.events().publish(
                    (Symbol::new(&env, "auction_settled"),),
                    (auction_id, auction.token_id, None::<Address>, 0i128),
                );
            }
        }

        auction.settled = true;
        Self::write_auction(&env, &auction);
    }

    /// Make (or raise) an escrowed offer on any NFT you don't own.
    pub fn make_offer(env: Env, buyer: Address, token_id: u64, amount: i128) {
        buyer.require_auth();
        Self::bump(&env);
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let nft = Self::read_nft(&env, token_id);
        if nft.owner == buyer {
            panic_with_error!(&env, Error::SelfPurchase);
        }

        let tok = Self::token_client(&env);
        tok.transfer(&buyer, &env.current_contract_address(), &amount);

        let mut offers = Self::read_offers(&env, token_id);
        // Replace (and refund) any previous offer from the same buyer.
        let mut i = 0;
        while i < offers.len() {
            let existing = offers.get_unchecked(i);
            if existing.buyer == buyer {
                tok.transfer(&env.current_contract_address(), &buyer, &existing.amount);
                offers.remove(i);
                break;
            }
            i += 1;
        }
        offers.push_back(Offer {
            token_id,
            buyer: buyer.clone(),
            amount,
        });
        Self::write_offers(&env, token_id, &offers);

        env.events().publish(
            (Symbol::new(&env, "offer_made"),),
            (token_id, buyer, amount),
        );
    }

    /// Cancel your standing offer and get the escrowed funds back.
    pub fn cancel_offer(env: Env, buyer: Address, token_id: u64) {
        buyer.require_auth();
        Self::bump(&env);
        let mut offers = Self::read_offers(&env, token_id);
        let mut found: Option<u32> = None;
        let mut i = 0;
        while i < offers.len() {
            if offers.get_unchecked(i).buyer == buyer {
                found = Some(i);
                break;
            }
            i += 1;
        }
        let idx = found.unwrap_or_else(|| panic_with_error!(&env, Error::OfferNotFound));
        let offer = offers.get_unchecked(idx);
        let tok = Self::token_client(&env);
        tok.transfer(&env.current_contract_address(), &buyer, &offer.amount);
        offers.remove(idx);
        Self::write_offers(&env, token_id, &offers);

        env.events().publish(
            (Symbol::new(&env, "offer_cancelled"),),
            (token_id, buyer),
        );
    }

    /// Accept a standing offer on your NFT. Escrowed funds are split between
    /// you and the creator (royalty enforced); the NFT transfers to the buyer.
    pub fn accept_offer(env: Env, owner: Address, token_id: u64, buyer: Address) {
        owner.require_auth();
        Self::bump(&env);
        let mut nft = Self::read_nft(&env, token_id);
        if nft.owner != owner {
            panic_with_error!(&env, Error::NotOwner);
        }
        if Self::active_auction_id(&env, token_id).is_some() {
            panic_with_error!(&env, Error::TokenLocked);
        }

        let mut offers = Self::read_offers(&env, token_id);
        let mut found: Option<u32> = None;
        let mut i = 0;
        while i < offers.len() {
            if offers.get_unchecked(i).buyer == buyer {
                found = Some(i);
                break;
            }
            i += 1;
        }
        let idx = found.unwrap_or_else(|| panic_with_error!(&env, Error::OfferNotFound));
        let offer = offers.get_unchecked(idx);

        let (royalty, seller_cut) = Self::split(offer.amount, &nft, &owner);
        let tok = Self::token_client(&env);
        if royalty > 0 {
            tok.transfer(&env.current_contract_address(), &nft.creator, &royalty);
        }
        tok.transfer(&env.current_contract_address(), &owner, &seller_cut);

        nft.owner = buyer.clone();
        Self::write_nft(&env, &nft);
        offers.remove(idx);
        Self::write_offers(&env, token_id, &offers);
        // A sale invalidates any fixed-price listing.
        env.storage()
            .persistent()
            .remove(&DataKey::Listing(token_id));

        Self::record_sale(
            &env,
            Sale {
                token_id,
                seller: owner.clone(),
                buyer: buyer.clone(),
                price: offer.amount,
                royalty_paid: royalty,
                kind: symbol_short!("offer"),
                timestamp: env.ledger().timestamp(),
            },
        );

        env.events().publish(
            (Symbol::new(&env, "offer_accepted"),),
            (token_id, owner, buyer, offer.amount),
        );
    }

    // ------------------------------- reads -------------------------------

    pub fn get_nft(env: Env, token_id: u64) -> Nft {
        Self::read_nft(&env, token_id)
    }

    pub fn list_nfts(env: Env) -> Vec<Nft> {
        let count = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::TokenCount)
            .unwrap_or(0);
        let mut out = Vec::new(&env);
        let mut id = 1u64;
        while id <= count {
            if let Some(nft) = env.storage().persistent().get(&DataKey::Nft(id)) {
                out.push_back(nft);
            }
            id += 1;
        }
        out
    }

    pub fn get_listing(env: Env, token_id: u64) -> Option<Listing> {
        Self::read_listing(&env, token_id)
    }

    pub fn list_listings(env: Env) -> Vec<Listing> {
        let count = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::TokenCount)
            .unwrap_or(0);
        let mut out = Vec::new(&env);
        let mut id = 1u64;
        while id <= count {
            if let Some(listing) = env.storage().persistent().get(&DataKey::Listing(id)) {
                out.push_back(listing);
            }
            id += 1;
        }
        out
    }

    pub fn get_auction(env: Env, auction_id: u64) -> Auction {
        Self::read_auction(&env, auction_id)
    }

    pub fn list_auctions(env: Env) -> Vec<Auction> {
        let count = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::AuctionCount)
            .unwrap_or(0);
        let mut out = Vec::new(&env);
        let mut id = 1u64;
        while id <= count {
            if let Some(auction) = env.storage().persistent().get(&DataKey::Auction(id)) {
                out.push_back(auction);
            }
            id += 1;
        }
        out
    }

    pub fn get_offers(env: Env, token_id: u64) -> Vec<Offer> {
        Self::read_offers(&env, token_id)
    }

    pub fn get_sales(env: Env) -> Vec<Sale> {
        env.storage()
            .persistent()
            .get(&DataKey::Sales)
            .unwrap_or_else(|| Vec::new(&env))
    }

    pub fn token_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get::<_, u64>(&DataKey::TokenCount)
            .unwrap_or(0)
    }

    pub fn auction_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get::<_, u64>(&DataKey::AuctionCount)
            .unwrap_or(0)
    }

    pub fn payment_token(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::PaymentToken)
            .unwrap()
    }
}

mod test;
