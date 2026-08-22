#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env, String,
};

fn setup(env: &Env) -> (ContractClient<'_>, TokenClient<'_>, StellarAssetClient<'_>) {
    env.mock_all_auths();
    let issuer = Address::generate(env);
    let admin = Address::generate(env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let token = TokenClient::new(env, &sac.address());
    let asset = StellarAssetClient::new(env, &sac.address());
    let contract_id = env.register(Contract, (admin, sac.address()));
    (ContractClient::new(env, &contract_id), token, asset)
}

fn s(env: &Env, v: &str) -> String {
    String::from_str(env, v)
}

#[test]
fn mint_assigns_ids_and_metadata() {
    let env = Env::default();
    let (client, _, _) = setup(&env);
    let alice = Address::generate(&env);

    let id1 = client.mint(&alice, &s(&env, "One"), &s(&env, "ipfs://1"), &500);
    let id2 = client.mint(&alice, &s(&env, "Two"), &s(&env, "ipfs://2"), &0);
    assert_eq!(id1, 1);
    assert_eq!(id2, 2);

    let nft = client.get_nft(&id1);
    assert_eq!(nft.owner, alice);
    assert_eq!(nft.creator, alice);
    assert_eq!(nft.royalty_bps, 500);
    assert_eq!(client.token_count(), 2);
    assert_eq!(client.list_nfts().len(), 2);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn mint_rejects_excessive_royalty() {
    let env = Env::default();
    let (client, _, _) = setup(&env);
    let alice = Address::generate(&env);
    client.mint(&alice, &s(&env, "Bad"), &s(&env, "ipfs://x"), &5_001);
}

#[test]
fn fixed_price_flow_pays_royalty() {
    let env = Env::default();
    let (client, token, asset) = setup(&env);
    let creator = Address::generate(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    asset.mint(&buyer, &1_000);

    // creator mints with 10% royalty, then we simulate a prior transfer to
    // `seller` via an offer accept (creator -> seller costs nothing here:
    // mint directly and hand over ownership through a zero-royalty sale).
    let id = client.mint(&creator, &s(&env, "Art"), &s(&env, "ipfs://a"), &1_000);
    client.list_fixed(&creator, &id, &100);
    asset.mint(&seller, &100);
    client.buy(&seller, &id); // creator sells own mint: no royalty split

    client.list_fixed(&seller, &id, &200);
    client.buy(&buyer, &id);

    // 10% of 200 = 20 to the creator, 180 to the seller.
    assert_eq!(token.balance(&creator), 100 + 20);
    assert_eq!(token.balance(&seller), 180);
    assert_eq!(client.get_nft(&id).owner, buyer);

    let sales = client.get_sales();
    assert_eq!(sales.len(), 2);
    let last = sales.get_unchecked(1);
    assert_eq!(last.royalty_paid, 20);
    assert_eq!(last.price, 200);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn buy_unlisted_rejected() {
    let env = Env::default();
    let (client, _, asset) = setup(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    asset.mint(&bob, &100);
    let id = client.mint(&alice, &s(&env, "A"), &s(&env, "u"), &0);
    client.buy(&bob, &id);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn only_owner_can_list() {
    let env = Env::default();
    let (client, _, _) = setup(&env);
    let alice = Address::generate(&env);
    let mallory = Address::generate(&env);
    let id = client.mint(&alice, &s(&env, "A"), &s(&env, "u"), &0);
    client.list_fixed(&mallory, &id, &100);
}

#[test]
fn auction_escrows_bids_and_refunds_outbid() {
    let env = Env::default();
    let (client, token, asset) = setup(&env);
    let seller = Address::generate(&env);
    let b1 = Address::generate(&env);
    let b2 = Address::generate(&env);
    asset.mint(&b1, &500);
    asset.mint(&b2, &500);

    let id = client.mint(&seller, &s(&env, "A"), &s(&env, "u"), &0);
    let auction_id = client.create_auction(&seller, &id, &100, &3_600);

    client.place_bid(&b1, &auction_id, &100);
    assert_eq!(token.balance(&b1), 400); // escrowed

    client.place_bid(&b2, &auction_id, &150);
    assert_eq!(token.balance(&b1), 500); // refunded
    assert_eq!(token.balance(&b2), 350);

    env.ledger().with_mut(|l| l.timestamp += 3_601);
    client.settle_auction(&auction_id);

    assert_eq!(client.get_nft(&id).owner, b2);
    assert_eq!(token.balance(&seller), 150);
    assert!(client.get_auction(&auction_id).settled);
}

#[test]
fn auction_without_bids_unlocks_token() {
    let env = Env::default();
    let (client, _, _) = setup(&env);
    let seller = Address::generate(&env);
    let id = client.mint(&seller, &s(&env, "A"), &s(&env, "u"), &0);
    let auction_id = client.create_auction(&seller, &id, &100, &60);

    env.ledger().with_mut(|l| l.timestamp += 61);
    client.settle_auction(&auction_id);

    assert_eq!(client.get_nft(&id).owner, seller);
    // token unlocked: listing it again works
    client.list_fixed(&seller, &id, &50);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn settle_before_deadline_rejected() {
    let env = Env::default();
    let (client, _, _) = setup(&env);
    let seller = Address::generate(&env);
    let id = client.mint(&seller, &s(&env, "A"), &s(&env, "u"), &0);
    let auction_id = client.create_auction(&seller, &id, &100, &3_600);
    client.settle_auction(&auction_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn low_bid_rejected() {
    let env = Env::default();
    let (client, _, asset) = setup(&env);
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    asset.mint(&bidder, &500);
    let id = client.mint(&seller, &s(&env, "A"), &s(&env, "u"), &0);
    let auction_id = client.create_auction(&seller, &id, &100, &3_600);
    client.place_bid(&bidder, &auction_id, &99);
}

#[test]
#[should_panic(expected = "Error(Contract, #13)")]
fn self_bid_rejected() {
    let env = Env::default();
    let (client, _, asset) = setup(&env);
    let seller = Address::generate(&env);
    asset.mint(&seller, &500);
    let id = client.mint(&seller, &s(&env, "A"), &s(&env, "u"), &0);
    let auction_id = client.create_auction(&seller, &id, &100, &3_600);
    client.place_bid(&seller, &auction_id, &100);
}

#[test]
fn cancel_auction_without_bids_unlocks_token() {
    let env = Env::default();
    let (client, _, _) = setup(&env);
    let seller = Address::generate(&env);
    let id = client.mint(&seller, &s(&env, "A"), &s(&env, "u"), &0);
    let auction_id = client.create_auction(&seller, &id, &100, &3_600);

    // Cancel while live and bid-free — no need to wait for the deadline.
    client.cancel_auction(&seller, &auction_id);
    assert!(client.get_auction(&auction_id).settled);

    // Token unlocked: listing it again works immediately.
    client.list_fixed(&seller, &id, &50);
}

#[test]
#[should_panic(expected = "Error(Contract, #16)")]
fn cancel_auction_with_bids_rejected() {
    let env = Env::default();
    let (client, _, asset) = setup(&env);
    let seller = Address::generate(&env);
    let bidder = Address::generate(&env);
    asset.mint(&bidder, &500);
    let id = client.mint(&seller, &s(&env, "A"), &s(&env, "u"), &0);
    let auction_id = client.create_auction(&seller, &id, &100, &3_600);
    client.place_bid(&bidder, &auction_id, &100);
    client.cancel_auction(&seller, &auction_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn cancel_auction_by_non_seller_rejected() {
    let env = Env::default();
    let (client, _, _) = setup(&env);
    let seller = Address::generate(&env);
    let mallory = Address::generate(&env);
    let id = client.mint(&seller, &s(&env, "A"), &s(&env, "u"), &0);
    let auction_id = client.create_auction(&seller, &id, &100, &3_600);
    client.cancel_auction(&mallory, &auction_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #15)")]
fn cannot_list_token_locked_in_auction() {
    let env = Env::default();
    let (client, _, _) = setup(&env);
    let seller = Address::generate(&env);
    let id = client.mint(&seller, &s(&env, "A"), &s(&env, "u"), &0);
    client.create_auction(&seller, &id, &100, &3_600);
    client.list_fixed(&seller, &id, &100);
}

#[test]
fn offers_escrow_replace_and_accept_with_royalty() {
    let env = Env::default();
    let (client, token, asset) = setup(&env);
    let creator = Address::generate(&env);
    let owner = Address::generate(&env);
    let buyer = Address::generate(&env);
    asset.mint(&buyer, &1_000);
    asset.mint(&owner, &100);

    // creator mints (20% royalty) and sells to `owner` at 100.
    let id = client.mint(&creator, &s(&env, "A"), &s(&env, "u"), &2_000);
    client.list_fixed(&creator, &id, &100);
    client.buy(&owner, &id);

    // buyer offers 100, then raises to 300 (first escrow refunded).
    client.make_offer(&buyer, &id, &100);
    assert_eq!(token.balance(&buyer), 900);
    client.make_offer(&buyer, &id, &300);
    assert_eq!(token.balance(&buyer), 700);
    assert_eq!(client.get_offers(&id).len(), 1);

    client.accept_offer(&owner, &id, &buyer);
    // royalty: 20% of 300 = 60 -> creator; 240 -> owner.
    assert_eq!(token.balance(&creator), 100 + 60);
    assert_eq!(token.balance(&owner), 240);
    assert_eq!(client.get_nft(&id).owner, buyer);
    assert_eq!(client.get_offers(&id).len(), 0);
}

#[test]
fn cancel_offer_refunds_escrow() {
    let env = Env::default();
    let (client, token, asset) = setup(&env);
    let owner = Address::generate(&env);
    let buyer = Address::generate(&env);
    asset.mint(&buyer, &500);

    let id = client.mint(&owner, &s(&env, "A"), &s(&env, "u"), &0);
    client.make_offer(&buyer, &id, &200);
    assert_eq!(token.balance(&buyer), 300);
    client.cancel_offer(&buyer, &id);
    assert_eq!(token.balance(&buyer), 500);
    assert_eq!(client.get_offers(&id).len(), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn owner_cannot_offer_on_own_token() {
    let env = Env::default();
    let (client, _, asset) = setup(&env);
    let owner = Address::generate(&env);
    asset.mint(&owner, &500);
    let id = client.mint(&owner, &s(&env, "A"), &s(&env, "u"), &0);
    client.make_offer(&owner, &id, &100);
}
