# ============================================================================
# Nova Market — testnet deployment script (PowerShell)
#
# 1. Verifies the `stellar` CLI is installed
# 2. Builds the Soroban contract (contract/)
# 3. Ensures a funded `deployer` identity exists on testnet
# 4. Resolves the native XLM Stellar Asset Contract id
# 5. Deploys the contract (constructor: admin = deployer, payment_token = SAC)
# 6. Prints the contract ID and writes it to client/.env.local
#
# Usage:  .\scripts\deploy.ps1   (from the repo root, or from anywhere)
# ============================================================================

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ContractDir = Join-Path $RepoRoot "contract"
$WasmPath = Join-Path $ContractDir "target\wasm32v1-none\release\nft_marketplace.wasm"
$EnvFile = Join-Path $RepoRoot "client\.env.local"
$Network = "testnet"
$Identity = "deployer"

function Assert-LastExitCode([string]$What) {
    if ($LASTEXITCODE -ne 0) {
        throw "$What failed (exit code $LASTEXITCODE)."
    }
}

# --- 1. Verify stellar CLI ---------------------------------------------------
if (-not (Get-Command "stellar" -ErrorAction SilentlyContinue)) {
    Write-Error @"
The 'stellar' CLI was not found on your PATH.

Install it with one of:
  cargo install --locked stellar-cli
  winget install --id Stellar.StellarCLI

Docs: https://developers.stellar.org/docs/tools/cli/install-cli
"@
    exit 1
}
Write-Host "==> stellar CLI: $(stellar --version | Select-Object -First 1)" -ForegroundColor Cyan

# --- 2. Build the contract ---------------------------------------------------
Write-Host "==> Building contract..." -ForegroundColor Cyan
Push-Location $ContractDir
try {
    stellar contract build
    Assert-LastExitCode "Contract build"
}
finally {
    Pop-Location
}

if (-not (Test-Path $WasmPath)) {
    throw "Expected wasm not found at: $WasmPath"
}

# --- 3. Ensure deployer identity ----------------------------------------------
Write-Host "==> Ensuring '$Identity' identity exists (funded on $Network)..." -ForegroundColor Cyan
$existing = stellar keys address $Identity 2>$null
if ($LASTEXITCODE -eq 0 -and $existing) {
    Write-Host "    Identity '$Identity' already exists: $existing"
}
else {
    stellar keys generate $Identity --network $Network --fund
    Assert-LastExitCode "Identity generation"
    Write-Host "    Created and funded '$Identity': $(stellar keys address $Identity)"
}

# --- 4. Resolve the native XLM SAC --------------------------------------------
Write-Host "==> Resolving native asset contract id..." -ForegroundColor Cyan
$NativeSac = (stellar contract id asset --asset native --network $Network).Trim()
Assert-LastExitCode "Native asset id resolution"
Write-Host "    Native SAC: $NativeSac"

# --- 5. Deploy -----------------------------------------------------------------
Write-Host "==> Deploying to $Network..." -ForegroundColor Cyan
$AdminAddress = (stellar keys address $Identity).Trim()
$ContractId = (stellar contract deploy `
        --wasm $WasmPath `
        --source $Identity `
        --network $Network `
        -- `
        --admin $AdminAddress `
        --payment_token $NativeSac).Trim()
Assert-LastExitCode "Contract deployment"

if (-not $ContractId) {
    throw "Deployment produced no contract ID."
}

# --- 6. Write client/.env.local -------------------------------------------------
$line = "NEXT_PUBLIC_CONTRACT_ID=$ContractId"
if (Test-Path $EnvFile) {
    $content = Get-Content $EnvFile
    if ($content -match "^NEXT_PUBLIC_CONTRACT_ID=") {
        $content = $content -replace "^NEXT_PUBLIC_CONTRACT_ID=.*", $line
    }
    else {
        $content += $line
    }
    Set-Content -Path $EnvFile -Value $content
}
else {
    Set-Content -Path $EnvFile -Value $line
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  Deployed successfully!" -ForegroundColor Green
Write-Host "  Contract ID: $ContractId" -ForegroundColor Green
Write-Host "  Explorer:    https://stellar.expert/explorer/testnet/contract/$ContractId" -ForegroundColor Green
Write-Host "  Wrote NEXT_PUBLIC_CONTRACT_ID to client\.env.local" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
