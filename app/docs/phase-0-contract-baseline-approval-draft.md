# Six-Contract Baseline Approval Draft

Status: `PENDING_NAMED_TECHNICAL_APPROVAL`  
Prepared: 2026-09-02  
Network: Harmony Mainnet, chain ID `1666600000`

## Purpose

This is the single human-review worksheet for the six Phase 0 contract
baselines. It records reproducible source candidates, archive `CREATE` traces,
decoded constructor records, and current runtime hashes. It does **not**
approve a hash or enable writes until a named reviewer completes every row,
uses an immutable reference, and the final manifest/bundle digests verify.

## Candidate evidence reviewed

| Component | Address | Current runtime Keccak-256 | Creation transaction | Source/reproduction record |
| --- | --- | --- | --- | --- |
| RegistrarController | `0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb` | `0x5710e0139c49ee09983f1ba2ccd90afdde88b1177501b1bb53517344be3c97b1` | `0x4b0215a4071e2a40afd4d4c32b6c75fc451da9e59c454c04d69e3d33e3afbc8b` | ens-deployer `5e56258a…`, Solidity 0.8.17/200, immutable-normalized match |
| DC | `0x547942748Cc8840FEc23daFdD01E6457379B446D` | `0x1487a13fe7b543a393588b944de73b36a3f3e504d6f93292360fefabf740771b` | `0x86abe764bc2a2c64652c0fca9cbed1e6e7e613598a6e1421419528f895cc237c` | checked-in source, Solidity 0.8.17/200, metadata-stripped match |
| EWS | `0xf90dab949d3853c418bE361930028644B4EBcDE4` | `0xfcfd980bcd097a217a9aef5bd6996597df8102d3de72d5e81d4d16b221e32211` | `0x1b7296ecb43d959c9cc0af05b5558fe32888a5160f7d4fa601e87a02f007dec4` | dot-country-embedder `443365d…`, Solidity 0.8.17/200, metadata-stripped match |
| BaseRegistrar | `0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD` | `0x1f003201f580de20b6888b85c39369ef15ad107e6f8dfe7bd13d12a51078441c` | `0x2f2a51a5c76736ca3c6b5e1bff6b8108ec10548108dce06dbbe71c2333b0e95c` | ens-deployer `5e56258a…`, Solidity 0.8.17/200, metadata-stripped match |
| TLDNameWrapper | `0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5` | `0x2abe6afb12233a6fa8b27bcd0f85466b17589362a4449d6af8037b45c0283c4a` | `0x2f2a51a5c76736ca3c6b5e1bff6b8108ec10548108dce06dbbe71c2333b0e95c` | ens-deployer `5e56258a…`, Solidity 0.8.17/200, immutable-normalized match |
| PublicResolver | `0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D` | `0x4cb1367da73ecc2a124354fd12106bfcccf599777f257622696cd7aeda4156f5` | `0x2f2a51a5c76736ca3c6b5e1bff6b8108ec10548108dce06dbbe71c2333b0e95c` | `@ensdomains/ens-contracts@0.0.15`, Solidity 0.8.17/200, immutable-normalized match |

The exact artifact/ABI SHA-256 values, constructor-tail digests, archive trace
paths, and compiler inputs are in `phase-0-bytecode-reproduction.md`,
`phase-0-constructor-provenance.md`, and
`phase-0-contract-trace-review-draft.json`.

## Required reviewer attestation

For every component, the reviewer must confirm all of the following:

- the pinned source/artifact was rebuilt with the stated compiler settings;
- compiled creation prefix and decoded constructor tail match the archive trace;
- archive `CREATE` output matches the current on-chain runtime;
- the runtime hash above is accepted for this deployed address; and
- the record is linked to an immutable Git revision, IPFS CID, or equivalent
  durable review reference.

Reviewer: `<name / role>`  
Reviewed at: `<ISO-8601 timestamp>`  
Immutable review reference: `<git:<40-char-revision>:path | IPFS CID | signed record>`

## Final integration

After the attestation, populate the six `contracts.<component>` records in
`api/_lib/phase-zero/evidence-manifest.js` and the single bundle in
`api/_lib/phase-zero/contract-baseline-evidence-record.js`. Each contract must
have `source.status: "VERIFIED"`, an approved runtime hash, its own canonical
record digest, and a matching bundle entry. The bundle must name the same full
Git source revision as the eventual Vercel deployment.

Then run:

```bash
cd app
npm run phase0:record-digests -- --require-matches
npm run phase0:verify-contract-baselines
npm run phase0:validate
```

Do not copy this draft into the manifest verbatim. It is a review aid; the
gate deliberately rejects pending records, missing reviewer identity, mutable
references, or digests computed before the final record values are fixed.
