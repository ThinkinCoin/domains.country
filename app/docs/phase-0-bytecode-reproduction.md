# Phase 0 Bytecode Reproduction Notes

Date: 2026-09-01  
Network: Harmony Mainnet, chain ID `1666600000`  
Mode: local compilation plus read-only RPC comparison. No transaction was sent.

## Method

Candidate sources were compiled with `solc-js` using the compiler version and
optimizer settings declared by their source repositories. Runtime bytecode from
Harmony was read with `eth_getCode`. Comparisons record full runtime hash,
metadata-stripped hash, and, where Solidity `immutable` values are used, a hash
with compiler-declared immutable ranges normalized.

The comparison helper is versioned at
`scripts/compare-phase-zero-candidate.mjs`. It is evidence tooling only; it does
not update the approval manifest.

## Results

| Component | Source candidate | Compiler | Result | Notes |
| --- | --- | --- | --- | --- |
| RegistrarController | `ThinkinCoin/ens-deployer`, `contracts/RegistrarController.sol` | `0.8.17`, optimizer 200 | `IMMUTABLE_NORMALIZED_MATCH` | Compiled and deployed runtimes are both 8,324 bytes. Six immutable slots account for the full-hash difference. |
| DC | checked-in `contracts/contracts/DC.sol` | `0.8.17`, optimizer 200 | `METADATA_STRIPPED_MATCH` | Compiled and deployed runtimes are both 6,348 bytes. Difference is metadata only. |
| BaseRegistrar | `ThinkinCoin/ens-deployer`, `contracts/TLDBaseRegistrarImplementation.sol` | `0.8.17`, optimizer 200 | `METADATA_STRIPPED_MATCH` | Compiled and deployed runtimes are both 10,536 bytes. Difference is metadata only. |
| TLDNameWrapper | `ThinkinCoin/ens-deployer`, `contracts/TLDNameWrapper.sol` | `0.8.17`, optimizer 200 | `IMMUTABLE_NORMALIZED_MATCH` | Compiled and deployed runtimes are both 21,810 bytes. Three immutable slots account for the full-hash difference. |
| PublicResolver | `@ensdomains/ens-contracts@0.0.15`, `contracts/resolvers/PublicResolver.sol` | `0.8.17`, optimizer 200 | `IMMUTABLE_NORMALIZED_MATCH` | Compiled and deployed runtimes are both 11,287 bytes. Four immutable slots account for the full-hash difference. |
| EWS | `harmony-one/dot-country-embedder`, `contracts/EWS.sol` | `0.8.20`, optimizer 200 | `NO_RUNTIME_MATCH` | Candidate compiles to 12,288 bytes; deployed runtime is 13,225 bytes. The exact deployed EWS source remains unidentified. |

## Commands executed

```bash
cd app
NODE_PATH=/tmp/dot-country-ens-deployer.tz3y4X/contract/node_modules \
  node scripts/compare-phase-zero-candidate.mjs \
  --source-root /tmp/dot-country-ens-deployer.tz3y4X/contract \
  --solc-root /tmp/phase0-solc-0.8.17 \
  --entries contracts/RegistrarController.sol \
  --components registrarController

NODE_PATH=/tmp/dot-country-ens-deployer.tz3y4X/contract/node_modules \
  node scripts/compare-phase-zero-candidate.mjs \
  --source-root /mnt/d/rede/github/thinkincoin/dot-country/contracts \
  --solc-root /tmp/phase0-solc-0.8.17 \
  --entries contracts/DC.sol \
  --components dc

NODE_PATH=/tmp/dot-country-ens-deployer.tz3y4X/contract/node_modules \
  node scripts/compare-phase-zero-candidate.mjs \
  --source-root /tmp/dot-country-ens-deployer.tz3y4X/contract \
  --solc-root /tmp/phase0-solc-0.8.17 \
  --entries contracts/TLDBaseRegistrarImplementation.sol \
  --components baseRegistrar

NODE_PATH=/tmp/dot-country-ens-deployer.tz3y4X/contract/node_modules \
  node scripts/compare-phase-zero-candidate.mjs \
  --source-root /tmp/dot-country-ens-deployer.tz3y4X/contract \
  --solc-root /tmp/phase0-solc-0.8.17 \
  --entries contracts/TLDNameWrapper.sol \
  --components nameWrapper

NODE_PATH=/tmp/dot-country-ens-deployer.tz3y4X/contract/node_modules \
  node scripts/compare-phase-zero-candidate.mjs \
  --source-root /tmp/dot-country-ens-deployer.tz3y4X/contract \
  --solc-root /tmp/phase0-solc-0.8.17 \
  --entries node_modules/@ensdomains/ens-contracts/contracts/resolvers/PublicResolver.sol \
  --components publicResolver

NODE_PATH=/tmp/phase0-ews-node_modules:/tmp/dot-country-ens-deployer.tz3y4X/contract/node_modules \
  node scripts/compare-phase-zero-candidate.mjs \
  --source-root /tmp/dot-country-ews.wzeNBV/contract \
  --solc-root /tmp/phase0-solc-0.8.20 \
  --entries contracts/EWS.sol \
  --components ews
```

## Approval boundary

These matches are strong technical provenance, but they are not final approval.
The Phase 0 manifest still requires named approval, artifact SHA-256 values,
deployment transaction hashes, review timestamps, and immutable references for
each contract. EWS remains a hard blocker until its exact deployed source or a
verified deployment artifact is found.
