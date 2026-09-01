# RegistrarController ABI and Source Review

Status: `DISCOVERY_ONLY`  
Date: 2026-09-01  
Network: Harmony Mainnet, chain ID `1666600000`  
Address: `0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb`

## Source candidate

`ThinkinCoin/ens-deployer` `main` was inspected at commit
`5e56258aee80bbe604c3424c9f997db6c74fa5d7`.

| File | SHA-256 |
| --- | --- |
| `contract/contracts/RegistrarController.sol` | `0bf2940773d43960bcb528cd620ad922f27e30f58a0dee3a14aadeb91c3a971d` |
| `contract/hardhat.config.ts` | `93be52b539a6ed420506eff83e2fb96289a9bea71b6ea4aa5910f87d2863d355` |
| `contract/.env.rc` | `8db3e06bb7e4879df761a5cfc1262ff773fa5d139dee6c555d74477377cf6ffb` |
| `contract/yarn.lock` | `acafdeda06fb5ad3ad0199f513020bccea5615ddaa201acbbee33c61ce5e32fe` |

The candidate compiles with Solidity `0.8.17+commit.8df45f5f`, optimizer
enabled, 200 runs. A temporary Hardhat compile was executed with local-only
network placeholders so the config parser could load; no RPC call or
transaction was performed by the compile.

That Hardhat build's full artifact SHA-256 is
`53b96c76544f562c2afe2190cf3bfee04cca9e058ad29cd8cba01eb660132519` and
its build-info SHA-256 is
`789d0fd0d2e2cb6569876d0481b30b381139c88ba216a7e8c32a98f6147a1afc`.
Full artifact hashes are not interchangeable between build methods because
Solidity metadata includes the complete source-input graph. An approval must
record the exact build command, lockfile, artifact digest and immutable
reference that it reviewed. The ABI hash and immutable-normalized runtime
comparison below are the cross-method technical checks.

## ABI result

The generated ABI SHA-256 is
`7cb408739bc35504893f29655abced6e02c50a51b3f8e376311f55f7af44ee2f`.
`baseExtension()`, not `base()`, is the deployed TLD accessor for Phase 0.
The live read-only probe returns `country`.

Confirmed selectors include:

| Signature | Selector |
| --- | --- |
| `baseExtension()` | `0xc6682862` |
| `available(string)` | `0xaeb8ce9b` |
| `rentPrice(string,uint256)` | `0x83e7f6ff` |
| `minCommitmentAge()` | `0x8d839ffe` |
| `maxCommitmentAge()` | `0xce1e09c0` |
| `makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)` | `0xd555254a` |
| `commit(bytes32)` | `0xf14fcbc8` |
| `register(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)` | `0x7acaaf26` |
| `renew(string,uint256)` | `0xacf1a841` |

## Runtime comparison

| Field | Value |
| --- | --- |
| Compiled runtime bytes | 8,324 |
| Harmony runtime bytes | 8,324 |
| Compiled runtime hash | `0xbd6101e5ce508401928021709ea0ddfb0fbe80ad6ab78190ef82ec3db7325ce7` |
| Harmony runtime hash | `0x5710e0139c49ee09983f1ba2ccd90afdde88b1177501b1bb53517344be3c97b1` |
| Immutable-normalized body hash | `0xab3d82d75632885f2e4212caa9299451108f99d3294a8874591de7db6d6e2295` |
| Immutable reference occurrences | 16 |

The compiled and deployed full hashes differ because constructor immutables are
embedded in the runtime. After applying the compiler-declared immutable
reference ranges, the metadata-stripped runtime body matches.

## Commitment implication

The same source declares `minCommitmentAge` and `maxCommitmentAge` as
`immutable` constructor values. The live `0–120` second window cannot be
repaired by a setter or app/backend policy. A Phase 0 `READY` registration
flow requires a replacement controller with a non-zero minimum age and updated
controller relationship evidence.

## Approval boundary

This document supports ABI/source review only. It is not approval. The manifest
must still record named reviewer approval, a durable deployment reference or
approved creation-bytecode artifact, the approved runtime hash, and evidence
SHA-256 before `registrarController.abiProvenance` or the bytecode baseline can
pass.
