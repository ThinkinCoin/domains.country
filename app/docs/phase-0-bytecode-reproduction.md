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
| EWS | `polymorpher/dot-country-embedder` commit `443365d1e53bf270f2e403b65b41b96273e7bf30`, `contracts/EWS.sol` | `0.8.17`, optimizer 200 | `METADATA_STRIPPED_MATCH` | Compiled and deployed runtimes are both 13,225 bytes. Difference is metadata only. |

## Creation bytecode comparison

The explorer-provided creation bytecode was compared with each locally
compiled creation artifact. Every deployed creation bytecode begins with the
candidate creation code after Solidity metadata is removed. The remaining
length is consistent with ABI-encoded constructor arguments:

| Component | Explorer creation bytes | Compiled creation bytes | Metadata-stripped prefix | Inferred constructor args |
| --- | ---: | ---: | --- | ---: |
| RegistrarController | 9,905 | 9,553 | match | 352 bytes |
| DC | 7,653 | 7,397 | match | 256 bytes |
| EWS | 13,768 | 13,640 | match | 128 bytes |
| BaseRegistrar | 11,393 | 11,297 | match | 96 bytes |
| TLDNameWrapper | 23,627 | 23,435 | match | 192 bytes |
| PublicResolver | 11,697 | 11,569 | match | 128 bytes |

This is stronger deployment-family evidence than a runtime-only comparison,
but it does not identify the transaction sender or creation transaction hash.
The constructor tails must still be decoded and reviewed against deployment
configuration, or replaced by a verified transaction/deployment artifact,
before approval.

`ens-deployer` was also reviewed for EWS after checking `main`, upstream `dev`,
and upstream `metadata-fix`. No EWS source is present on those branches. The
historical `contract/contracts/services/EAS.sol` is a different alias-forwarding
service and does not match the deployed EWS ABI or read-only probes.

The newer `polymorpher/dot-country-embedder` commit
`2524d1d5f4b4df3ac5a2f7f44b677075ea4c6e54` was also tested. It uses Solidity
`0.8.20` and OpenZeppelin 5, compiles to 12,288 runtime bytes, and does not
match the deployed EWS runtime. The deployed EWS matches the older 2023 source
commit above.

For the matching EWS reproduction, `contracts/EWS.sol` has SHA-256
`6a9cf01227647db3c604402ab7cbfa1358923bd4907b8df53f51dc184f1b3729`; its
lockfile resolves OpenZeppelin Contracts to `4.8.1`. The compiled artifact
SHA-256 is `5095c9796083cdd92d4d9c774f9bae57acd605060d15312d677e33bb7963270c`.
Both metadata-stripped runtime bodies hash to
`0x25c9bf492058ab0272f0d16a7ef5e255bb3cb87c6e089dda8663dac91978af81`.

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

NODE_PATH=/tmp/phase0-ews-481-node_modules:/tmp/dot-country-ens-deployer.tz3y4X/contract/node_modules \
  node scripts/compare-phase-zero-candidate.mjs \
  --source-root /tmp/ews-repro-443365d/contract \
  --solc-root /tmp/phase0-solc-0.8.17 \
  --entries contracts/EWS.sol \
  --components ews
```

## Approval boundary

These runtime and creation-code matches are strong technical provenance, but
they are not final approval.
The Phase 0 manifest still requires named approval, artifact SHA-256 values,
deployment transaction hashes, review timestamps, and immutable references for
each contract. EWS source reproduction is now available, but EWS still needs a
deployment transaction or formal deployment artifact plus named technical
approval before its manifest baseline can be marked verified.
