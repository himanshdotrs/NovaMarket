#!/usr/bin/env bash
# ============================================================================
# Nova Market — testnet deployment script (bash)
#
# 1. Verifies the `stellar` CLI is installed
# 2. Builds the Soroban contract (contract/)
# 3. Ensures a funded `deployer` identity exists on testnet
# 4. Resolves the native XLM Stellar Asset Contract id
# 5. Deploys the contract (constructor: admin = deployer, payment_token = SAC)
# 6. Prints the contract ID and writes it to client/.env.local
#
# Usage:  ./scripts/deploy.sh   (from the repo root, or from anywhere)
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
CONTRACT_DIR="$REPO_ROOT/contract"
WASM_PATH="$CONTRACT_DIR/target/wasm32v1-none/release/nft_marketplace.wasm"
ENV_FILE="$REPO_ROOT/client/.env.local"
NETWORK="testnet"
IDENTITY="deployer"

# --- 1. Verify stellar CLI ---------------------------------------------------
if ! command -v stellar >/dev/null 2>&1; then
    cat >&2 <<'EOF'
Error: the 'stellar' CLI was not found on your PATH.

Install it with one of:
  cargo install --locked stellar-cli
  brew install stellar-cli          # macOS

Docs: https://developers.stellar.org/docs/tools/cli/install-cli
EOF
    exit 1
fi
echo "==> stellar CLI: $(stellar --version | head -n 1)"

# --- 2. Build the contract ---------------------------------------------------
echo "==> Building contract..."
(cd "$CONTRACT_DIR" && stellar contract build)

if [[ ! -f "$WASM_PATH" ]]; then
    echo "Error: expected wasm not found at: $WASM_PATH" >&2
    exit 1
fi

# --- 3. Ensure deployer identity ----------------------------------------------
echo "==> Ensuring '$IDENTITY' identity exists (funded on $NETWORK)..."
if stellar keys address "$IDENTITY" >/dev/null 2>&1; then
    echo "    Identity '$IDENTITY' already exists: $(stellar keys address "$IDENTITY")"
else
    stellar keys generate "$IDENTITY" --network "$NETWORK" --fund
    echo "    Created and funded '$IDENTITY': $(stellar keys address "$IDENTITY")"
fi

# --- 4. Resolve the native XLM SAC --------------------------------------------
echo "==> Resolving native asset contract id..."
NATIVE_SAC="$(stellar contract id asset --asset native --network "$NETWORK" | tr -d '[:space:]')"
echo "    Native SAC: $NATIVE_SAC"

# --- 5. Deploy -----------------------------------------------------------------
echo "==> Deploying to $NETWORK..."
ADMIN_ADDRESS="$(stellar keys address "$IDENTITY" | tr -d '[:space:]')"
CONTRACT_ID="$(stellar contract deploy \
    --wasm "$WASM_PATH" \
    --source "$IDENTITY" \
    --network "$NETWORK" \
    -- \
    --admin "$ADMIN_ADDRESS" \
    --payment_token "$NATIVE_SAC" | tr -d '[:space:]')"

if [[ -z "$CONTRACT_ID" ]]; then
    echo "Error: deployment produced no contract ID." >&2
    exit 1
fi

# --- 6. Write client/.env.local -------------------------------------------------
LINE="NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID"
if [[ -f "$ENV_FILE" ]] && grep -q '^NEXT_PUBLIC_CONTRACT_ID=' "$ENV_FILE"; then
    tmp="$(mktemp)"
    sed "s|^NEXT_PUBLIC_CONTRACT_ID=.*|$LINE|" "$ENV_FILE" > "$tmp"
    mv "$tmp" "$ENV_FILE"
else
    echo "$LINE" >> "$ENV_FILE"
fi

echo ""
echo "================================================================"
echo "  Deployed successfully!"
echo "  Contract ID: $CONTRACT_ID"
echo "  Explorer:    https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo "  Wrote NEXT_PUBLIC_CONTRACT_ID to client/.env.local"
echo "================================================================"
