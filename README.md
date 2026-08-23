# Nova Market

**🔗 Live App:** [https://nova-market-dapp.vercel.app/](https://nova-market-dapp.vercel.app/)

## 🔗 Deployed Contract

| Property               | Value                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Network**            | Stellar Testnet                                                                                                                              |
| **Contract ID**        | `CAPTI5FMEUCVNH44T7UVRQDLMLA44FVXY4R36IZRAWQU6VLLGRQUVKTP`                                                                                   |
| **Deploy Transaction** | `523b1e1fbc4618f8594a1cafe8b40187a6e766ff0e3b755382f4f5481c7df083`                                                                           |
| **Explorer**           | [View contract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAPTI5FMEUCVNH44T7UVRQDLMLA44FVXY4R36IZRAWQU6VLLGRQUVKTP) |

A full-stack NFT marketplace built on **Stellar Testnet**, featuring a Rust/Soroban smart contract and a Next.js frontend.

Nova Market enables creators and collectors to mint, list, auction, and negotiate NFTs while enforcing **creator royalties at the smart-contract level**. Every sale path — fixed-price purchases, auctions, and offers — distributes royalties atomically.

---

## ✨ Features

* 🎨 **NFT Minting**

  * Mint NFTs with a name and metadata URI.
  * Set creator royalties from **0–50%**.
  * Royalties are permanently stored with the NFT.

* 🏷️ **Fixed-Price Listings**

  * List NFTs for a fixed XLM price.
  * Cancel listings at any time.
  * Purchases atomically transfer the NFT and split payment between seller and creator.

* ⚖️ **English Auctions**

  * Create time-boxed ascending auctions.
  * Bids are escrowed in the marketplace contract.
  * Previous highest bidders are refunded immediately when outbid.
  * NFTs are locked while an auction is active.
  * Anyone can settle an expired auction.
  * Final proceeds are atomically split between seller and creator.

* 🤝 **Escrowed Offers**

  * Anyone can make an offer on an NFT they do not own.
  * Offers are escrowed in XLM.
  * Buyers can raise or cancel their offers.
  * NFT owners can accept offers.
  * Creator royalties are enforced when an offer is accepted.

* 💰 **Enforced Creator Royalties**

  * Royalties are enforced by the Soroban contract.
  * Royalties cannot be bypassed through another marketplace flow.
  * Every completed sale distributes the royalty atomically.

* 📜 **On-Chain Sales History**

  * Every completed sale is recorded on-chain.
  * Query sales history with `get_sales`.
  * Read NFTs, listings, auctions, and offers directly from the contract.

* 👛 **Multi-Wallet Support**

  * Powered by StellarWalletsKit.
  * Supports Freighter and other compatible Stellar wallets.

* 📡 **Real-Time Event Feed**

  * Polls Soroban RPC `getEvents`.
  * Displays mints, listings, bids, sales, and other marketplace activity.

* 🔍 **Transaction Tracking**

  * Transaction status feedback.
  * Links to Stellar Expert for on-chain verification.

* 🌙 **Dark Mode**

* 📱 **Responsive UI**

* 🎨 **shadcn/ui Components**

---

## 🏗️ Architecture

```text
Nova Market
│
├── client/                         # Next.js frontend
│   └── src/
│       ├── app/                    # Next.js App Router
│       ├── components/             # UI components
│       ├── hooks/                  # Data & wallet hooks
│       ├── lib/                    # Stellar/Soroban helpers
│       ├── stores/                 # Zustand stores
│       └── types/                  # Shared TypeScript types
│
├── contract/                       # Soroban workspace
│   └── contracts/
│       └── contract/
│           └── src/
│               └── lib.rs          # NFT marketplace contract
│
└── scripts/
    ├── deploy.ps1                  # Windows deployment
    └── deploy.sh                   # macOS/Linux deployment
```

---

## 🧠 Smart Contract

The marketplace is implemented as a Rust/Soroban smart contract.

### Minting

Creators can mint NFTs using:

```text
mint
```

Each NFT stores:

* Token ID
* Owner
* Creator
* Metadata URI
* Name
* Royalty percentage

Royalty limits are enforced at the contract level:

```text
0–5,000 bps
0–50%
```

### Fixed-Price Sales

Owners can create listings using:

```text
list_fixed
```

Listings can be removed with:

```text
cancel_listing
```

A buyer purchases an NFT with:

```text
buy
```

The contract atomically:

1. Transfers XLM from the buyer.
2. Calculates the creator royalty.
3. Pays the creator.
4. Pays the remaining amount to the seller.
5. Transfers ownership of the NFT.

### Auctions

Owners can create English auctions using:

```text
create_auction
```

Bidders participate with:

```text
place_bid
```

Each bid is escrowed in the marketplace contract.

When a new highest bid is placed, the previous highest bidder is refunded.

After the auction deadline, anyone can call:

```text
settle_auction
```

The contract then:

1. Transfers the NFT to the winning bidder.
2. Calculates the creator royalty.
3. Pays the creator.
4. Pays the remaining proceeds to the seller.
5. Finalizes the auction.

### Offers

Buyers can make escrowed offers with:

```text
make_offer
```

Offers can be cancelled with:

```text
cancel_offer
```

The NFT owner can accept an offer using:

```text
accept_offer
```

When accepted, the contract performs the NFT transfer and royalty split atomically.

---

## 📚 Contract Read Methods

The frontend can query marketplace state directly from Soroban.

| Method          | Purpose                        |
| --------------- | ------------------------------ |
| `get_nft`       | Retrieve a specific NFT        |
| `list_nfts`     | List NFTs                      |
| `get_listing`   | Retrieve a fixed-price listing |
| `list_listings` | List active listings           |
| `get_auction`   | Retrieve an auction            |
| `list_auctions` | List auctions                  |
| `get_offers`    | Retrieve offers                |
| `get_sales`     | Retrieve completed sales       |

---

## 💎 Payment Token

All marketplace payments use the **native XLM Stellar Asset Contract (SAC)**.

The payment token is supplied to the contract constructor during deployment:

```text
__constructor(payment_token)
```

Default Testnet native XLM SAC:

```text
CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

---

## 🛠️ Tech Stack

| Layer                   | Technology                 |
| ----------------------- | -------------------------- |
| Frontend                | Next.js 16                 |
| Language                | TypeScript                 |
| Styling                 | Tailwind CSS               |
| UI                      | shadcn/ui                  |
| Wallets                 | StellarWalletsKit          |
| Blockchain SDK          | `@stellar/stellar-sdk` v17 |
| Smart Contract          | Rust                       |
| Contract SDK            | `soroban-sdk` 25           |
| State Management        | Zustand                    |
| Data Fetching           | TanStack Query             |
| Package Manager         | Bun                        |
| Blockchain              | Stellar Testnet            |
| Smart Contract Platform | Soroban                    |

---

# 🚀 Getting Started

## Prerequisites

Install the following tools before starting:

* **Bun** or Node.js 20+
* **Rust**
* **Stellar CLI**
* A Stellar-compatible wallet such as Freighter

### Install Bun

https://bun.sh

### Install Rust

Install Rust using the official Rust toolchain installer, then add the Soroban WASM target:

```bash
rustup target add wasm32v1-none
```

### Install Stellar CLI

```bash
cargo install --locked stellar-cli
```

For installation documentation, see the [Stellar CLI documentation](https://developers.stellar.org/docs/tools/cli/install-cli).

---

# 👛 Wallet Setup

Nova Market supports wallets through **StellarWalletsKit**.

### 1. Install a wallet

Install the [Freighter wallet](https://www.freighter.app/) browser extension or another wallet supported by StellarWalletsKit.

### 2. Switch to Testnet

Open your wallet settings and select:

```text
Stellar Testnet
```

### 3. Fund your account

You need Testnet XLM to interact with the marketplace.

You can fund an account through Freighter or Stellar's Friendbot:

https://friendbot.stellar.org

For a specific address:

```text
https://friendbot.stellar.org/?addr=G...
```

---

# ⚙️ Environment Configuration

Navigate to the frontend:

```bash
cd client
```

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then configure the following variables:

| Variable                            | Description                   | Default                                                    |
| ------------------------------------ | ----------------------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_CONTRACT_ID`           | Deployed marketplace contract | `CAPTI5FMEUCVNH44T7UVRQDLMLA44FVXY4R36IZRAWQU6VLLGRQUVKTP` |
| `NEXT_PUBLIC_SOROBAN_RPC_URL`       | Soroban RPC endpoint          | `https://soroban-testnet.stellar.org`                      |
| `NEXT_PUBLIC_HORIZON_URL`           | Horizon endpoint              | `https://horizon-testnet.stellar.org`                      |
| `NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT` | Native XLM SAC                | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |

Example:

```env
NEXT_PUBLIC_CONTRACT_ID=CAPTI5FMEUCVNH44T7UVRQDLMLA44FVXY4R36IZRAWQU6VLLGRQUVKTP
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NATIVE_TOKEN_CONTRACT=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

---

# 💻 Local Development

Install frontend dependencies:

```bash
cd client
bun install
```

Start the development server:

```bash
bun run dev
```

The application will be available at:

```text
http://localhost:3000
```

---

# 🦀 Smart Contract Development

The Soroban contract is located under:

```text
contract/contracts/contract/
```

Build the contract with:

```bash
stellar contract build
```

The resulting WASM file is generated at:

```text
contract/target/wasm32v1-none/release/nft_marketplace.wasm
```

---

# 🧪 Running Contract Tests

From the repository root:

```bash
cd contract
cargo test
```

---

# 🚢 Contract Deployment

Deployment scripts are provided for Windows and macOS/Linux.

## Windows

From the repository root:

```powershell
.\scripts\deploy.ps1
```

## macOS / Linux

```bash
./scripts/deploy.sh
```

The deployment process:

1. Verifies that the Stellar CLI is installed.
2. Builds the Soroban contract.
3. Creates and funds a `deployer` identity on Testnet if required.
4. Resolves the native XLM Stellar Asset Contract.
5. Deploys the marketplace contract.
6. Passes the XLM SAC to `__constructor(payment_token)`.
7. Prints the deployed contract ID.
8. Writes `NEXT_PUBLIC_CONTRACT_ID` to `client/.env.local`.

---

# ☁️ Vercel Deployment

Nova Market can be deployed using Vercel.

### 1. Import the repository

Create a new project using [Vercel](https://vercel.com/new).

### 2. Configure the root directory

Set:

```text
Root Directory: client
```

### 3. Add environment variables

Add the four `NEXT_PUBLIC_*` variables described in the environment configuration section.

### 4. Deploy

Vercel automatically detects the Next.js application and builds the frontend.

---

# 📡 Real-Time Events

The frontend polls Soroban RPC using:

```text
getEvents
```

The event feed can surface marketplace activity such as:

* NFT mints
* Fixed-price listings
* Listing cancellations
* Auction creation
* New bids
* Offer creation
* Offer cancellation
* Completed sales

This provides users with a near-real-time view of marketplace activity directly from the blockchain.

---

# 🔐 Royalty Enforcement

Creator royalties are a core part of Nova Market's architecture.

Royalties are **not implemented as a frontend convention**. Instead, the marketplace contract enforces the royalty split during every supported sale path.

```text
                 ┌──────────────┐
                 │   NFT Sale   │
                 └──────┬───────┘
                        │
              ┌─────────▼─────────┐
              │ Soroban Contract  │
              └─────────┬─────────┘
                        │
                 Calculate royalty
                        │
              ┌─────────┴─────────┐
              │                   │
       Creator royalty       Seller proceeds
              │                   │
              └─────────┬─────────┘
                        │
                  Atomic payout
```

Supported sale paths:

```text
Fixed-price buy
       │
       ├── Creator royalty
       └── Seller proceeds

Auction settlement
       │
       ├── Creator royalty
       └── Seller proceeds

Offer acceptance
       │
       ├── Creator royalty
       └── Seller proceeds
```

---

# 🗺️ Development Roadmap

The project is organized into four major development milestones.

### 1. Project Setup & Wallet Integration

* Next.js application scaffold
* Tailwind CSS
* shadcn/ui
* StellarWalletsKit
* Wallet connection flow

### 2. Smart Contract & Frontend Integration

* Soroban NFT marketplace contract
* NFT minting
* Fixed-price listings
* Purchases
* Auctions
* Escrowed offers
* Creator royalties
* Deployment scripts
* Typed contract bindings

### 3. Real-Time Events & Transaction Tracking

* Soroban RPC event polling
* Marketplace activity feed
* Transaction status handling
* Explorer links
* Transaction notifications

### 4. UI Polish & Documentation

* Dark mode
* Responsive design
* UI refinement
* README documentation
* Environment examples

---

# 🌐 Useful Links

* **Live App:** https://nova-market-dapp.vercel.app/
* **Stellar:** https://stellar.org/
* **Stellar Developers:** https://developers.stellar.org/
* **Stellar CLI:** https://developers.stellar.org/docs/tools/cli/install-cli
* **Freighter:** https://www.freighter.app/
* **Friendbot:** https://friendbot.stellar.org
* **Vercel:** https://vercel.com/
* **Stellar Expert:** https://stellar.expert/

---

# 📄 License

Add your project's license information here.

---

## Nova Market

**Mint. List. Bid. Offer. Trade — with creator royalties enforced on-chain.**
