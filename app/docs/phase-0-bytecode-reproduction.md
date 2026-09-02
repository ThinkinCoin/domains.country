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

The provenance collector `scripts/collect-phase-zero-provenance.mjs` now
records SHA-256 digests of the raw explorer address and smart-contract payloads
and distinguishes missing creation fields from unavailable endpoints. On the
2026-09-01 read-only run at Harmony block `93252694`, the explorer confirmed
all six addresses are contracts and exposes creation-link fields, but
`creation_transaction_hash` and `creator_address_hash` were `null` for all
six. That result keeps creation provenance at
`EXPLORER_CREATION_LINK_MISSING`; it does not satisfy the baseline approval
requirement.

The focused RegistrarController source/ABI review is recorded in
`docs/phase-0-registrar-controller-abi.md`. It confirms the deployed
`baseExtension()` accessor and records the candidate's source, ABI and
immutable-normalized runtime evidence.

## Results

| Component | Source candidate | Compiler | Result | Notes |
| --- | --- | --- | --- | --- |
| RegistrarController | `ThinkinCoin/ens-deployer` commit `5e56258aee80bbe604c3424c9f997db6c74fa5d7`, `contracts/RegistrarController.sol` | `0.8.17`, optimizer 200 | `IMMUTABLE_NORMALIZED_MATCH` | Compiled and deployed runtimes are both 8,324 bytes. Six immutable groups (16 reference occurrences) account for the full-hash difference. |
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

## Archive creation-trace recovery

The explorer lacks creation links, but an independent read-only archive-RPC
query recovered the first block containing code and the transaction trace that
created each configured contract. The reproducible discovery snapshot is
`docs/phase-0-creation-traces.json`, generated with
`npm run phase0:collect-creation-traces`. Its current SHA-256 is
`c0fac98642e87b1a1f3e7ef9e05c14c423ebea028b1141008446b51f6bb4d4c0`.

| Component | First code block | Creation transaction | Mode |
| --- | ---: | --- | --- |
| RegistrarController | 41,687,015 | `0x4b0215a4071e2a40afd4d4c32b6c75fc451da9e59c454c04d69e3d33e3afbc8b` | direct CREATE |
| DC | 39,380,534 | `0x86abe764bc2a2c64652c0fca9cbed1e6e7e613598a6e1421419528f895cc237c` | internal CREATE |
| EWS | 43,627,876 | `0x1b7296ecb43d959c9cc0af05b5558fe32888a5160f7d4fa601e87a02f007dec4` | direct CREATE |
| BaseRegistrar | 39,534,697 | `0x2f2a51a5c76736ca3c6b5e1bff6b8108ec10548108dce06dbbe71c2333b0e95c` | internal CREATE |
| TLDNameWrapper | 39,534,697 | `0x2f2a51a5c76736ca3c6b5e1bff6b8108ec10548108dce06dbbe71c2333b0e95c` | internal CREATE |
| PublicResolver | 39,534,697 | `0x2f2a51a5c76736ca3c6b5e1bff6b8108ec10548108dce06dbbe71c2333b0e95c` | internal CREATE |

This supplies concrete deployment-transaction candidates and trace paths for
the approval review. It remains `DISCOVERY_ONLY`: the reviewer must verify the
creation input and decoded constructor arguments against the candidate artifact,
then pin the resulting record to a committed full Git revision. No snapshot
hash or current RPC result is promoted automatically to an approved baseline.

`npm run phase0:verify-creation-traces` independently re-queries the archive
RPC and verifies the first-code block, transaction, receipt, target `CREATE`
path, and SHA-256/length of the creation input for all six entries.

`npm run phase0:generate-contract-trace-review` produced
`docs/phase-0-contract-trace-review-draft.json` with SHA-256
`6d6b2b1f1029647c31c0d1e0f1ec22fef19a849469e26a9aa5a65b68fc31b542`.
That draft additionally proves the archived `CREATE` output matches the
current Harmony runtime byte-for-byte for every configured contract.

## User-provided runtime copies

On 2026-09-01, local copies were supplied under the Git-ignored `tmp/`
directory. Each text file was parsed for its longest hexadecimal bytecode value
and compared independently with the current Harmony RPC runtime hash. All six
matched exactly:

| File | File SHA-256 | Bytecode SHA-256 | Runtime bytes | Keccak-256 / RPC match |
| --- | --- | --- | ---: | --- |
| `tmp/RegistrarController.txt` | `11ab784a2e47103d821b34a801ab09c5b44ea0eb4f1bb9e1c8a94c50d19f1250` | `443e9523224646e4d824f22f95e5446ec456db58d6b60576b8ca4d0d6325a5fc` | 8,324 | `0x5710…c97b1` / match |
| `tmp/DC.txt` | `a5103fc7b6985db774e30d94b93b546b8aba29eb4daa37e3771db4a5dd4a72a5` | `9c597e4bf7960f2fdabc8acdea1f4951f6ed4fde692f4ed48b51e8bbd2c4a181` | 6,348 | `0x1487…0771b` / match |
| `tmp/EWS.txt` | `bc674b20fd756e58477422334f33979a0d9b78c234bd047763b76fbc127c762a` | `cb67fd52bd7d24d8df0a85b0dd6ee3410ade765e5783d8064ad1a87a9c283fec` | 13,225 | `0xfcfd…2211` / match |
| `tmp/BaseRegistrar.txt` | `a8cf8241df1ba545c46d4925203c9b5ec1f5021bf75e2f8b2a5a283dca98ab1b` | `a1f54f5993388ab6ab752f65fe80e586fea15deedbf5dc6c0c477b9ac77fc3ee` | 10,536 | `0x1f00…441c` / match |
| `tmp/TLDNameWrapper.txt` | `aac43f55b8d2ae67d97694661e3639a1ac42ac5569e6dc5e19bfc299d3795d4e` | `bcf7c880aba30898a3bbd87d28354d6771d03c9f8d4b37a5276b60b68d5466aa` | 21,810 | `0x2abe…3c4a` / match |
| `tmp/PublicResolver.txt` | `1934e22a4effbe899ed3eb8843182db9a3cba9e16dc010db25609f7732c30348` | `d4cf1aefd6e33df3c67edf1947119ed31d69555d3dd3b663562cc40e30696f9b` | 11,287 | `0x4cb1…6f5` / match |

These files corroborate the RPC observation and provide stable local hashes for
an approver to compare against an original export. They do **not** establish
who exported them, a creation transaction, compiler inputs, or approval. Since
`tmp/` is ignored, an approver must place any accepted export in an immutable
evidence bundle and record its digest/reference in the manifest.

Re-run the local comparison whenever the files are available:

```bash
cd app
npm run phase0:verify-local-bytecodes
```

The same runtime copies also contain Solidity metadata CIDs. Extract and fetch
them with:

```bash
cd app
npm run phase0:collect-metadata-cids
```

The generated `docs/phase-0-bytecode-metadata-cids.json` is discovery evidence
only. A metadata CID can corroborate compiler/source settings, but it still
does not prove the deployment transaction, deployer, constructor tuple, or
named approval.

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
