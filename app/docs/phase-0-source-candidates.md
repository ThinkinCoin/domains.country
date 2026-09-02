# Public Contract Source Candidates

Status: `DISCOVERY_ONLY`  
Collected: 2026-09-01

## Candidate repository

`ThinkinCoin/ens-deployer` commit `5e56258aee80bbe604c3424c9f997db6c74fa5d7` contains the public source family used by the active `.country` deployment. GitHub reports this commit as unsigned, and the repository currently exposes no public GitHub Actions runs for that commit.

| Source | SHA-256 | Relevant deployed component |
| --- | --- | --- |
| `contract/contracts/RegistrarController.sol` | `0bf2940773d43960bcb528cd620ad922f27e30f58a0dee3a14aadeb91c3a971d` | RegistrarController candidate |
| `contract/contracts/TLDBaseRegistrarImplementation.sol` | `8a0d89b336b97edb99fc04d941503f492589d09c66ba73fa14b1ef23c7743f0c` | BaseRegistrar candidate |
| `contract/contracts/TLDNameWrapper.sol` | `51c1a81c868849619b53fddf4af7ab4f0f7cd46ea289a1f099f88b87b982aa1f` | TLDNameWrapper candidate |
| `contract/.env.rc` | `8db3e06bb7e4879df761a5cfc1262ff773fa5d139dee6c555d74477377cf6ffb` | RegistrarController constructor inputs candidate |
| `contract/hardhat.config.ts` | `93be52b539a6ed420506eff83e2fb96289a9bea71b6ea4aa5910f87d2863d355` | Compiler settings |

The candidate specifies Solidity `0.8.17` with optimizer enabled and `200` runs. Its RegistrarController ABI contains `baseExtension()`, and its constructor accepts the base registrar, oracle, commitment ages, reverse registrar, wrapper, base node, TLD extension, and revenue account. The focused build/selector record is `docs/phase-0-registrar-controller-abi.md`.

The public `.env.rc` candidate records `TLD_BASE_REGISTRAR_IMPLEMENTATION=0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD`, `REVERSE_REGISTRAR=0x51e86d4cc8723FCa7014fd97C0aD0c737C86A2af`, `NAME_WRAPPER=0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5`, `MIN_COMMITMENT_AGE=0`, and `MAX_COMMITMENT_AGE=120`. This matches key read-only observations, but it does not identify the deployed RegistrarController transaction or approve the active address.

## Confirmed read-only consistency

On Harmony Mainnet, the configured RegistrarController returns `baseExtension() == "country"`, exposes the expected registration selectors, and reports a runtime hash of `0x5710e0139c49ee09983f1ba2ccd90afdde88b1177501b1bb53517344be3c97b1`.

The candidate source shows that `_consumeCommitment` enforces `minCommitmentAge` directly. The observed deployed value of zero therefore provides no contract-enforced waiting period.

## Why this is not a baseline approval

Local reproduction now matches all six deployed runtimes after metadata stripping
or immutable normalization. That is still insufficient: the public candidates
do not supply deployment transactions for every address, complete constructor
inputs and linked-library evidence, or a signed technical review for those
deployments. Explorer and Sourcify do not currently provide verified source
records for the six active addresses. The candidate commits themselves are not
approval authorities.

The explorer creation bytecodes also match the metadata-stripped prefixes of
all six compiled creation artifacts. Constructor-tail lengths were recovered.
Explorer creation links remain unavailable, but the read-only archive trace
snapshot now identifies a candidate creation transaction and CREATE path for
each configured contract. Independently approved decoded constructor records
are still unavailable. See `docs/phase-0-bytecode-reproduction.md` and
`docs/phase-0-creation-traces.json`.

Do not set `source.status` to `VERIFIED`, populate `approvedBytecodeHash`, or change the gate based on this document alone. Approval requires a reproducible build and deployment provenance for each contract.

See `docs/phase-0-bytecode-reproduction.md` for the current local reproduction
results. All six configured contracts now have metadata-stripped or
immutable-normalized bytecode matches against Harmony runtime code. For EWS,
the matching source is historical; the newer public source candidate does not
match.

## EWS candidate

`polymorpher/dot-country-embedder` commit
`443365d1e53bf270f2e403b65b41b96273e7bf30` is the matching public source
candidate for the configured EWS address. A local `solc 0.8.17`, optimizer-200
build of `contract/contracts/EWS.sol` produced 13,225 runtime bytes, matching
the deployed EWS runtime after stripping Solidity metadata.

Reproduction inputs and outputs are recorded locally: the EWS source file has
SHA-256 `6a9cf01227647db3c604402ab7cbfa1358923bd4907b8df53f51dc184f1b3729`, the
repository lockfile resolves `@openzeppelin/contracts` to `4.8.1`, and the
compiled artifact has SHA-256
`5095c9796083cdd92d4d9c774f9bae57acd605060d15312d677e33bb7963270c`. The
metadata-stripped runtime body hash is
`0x25c9bf492058ab0272f0d16a7ef5e255bb3cb87c6e089dda8663dac91978af81` for
both the local build and deployed code.

The newer commit `2524d1d5f4b4df3ac5a2f7f44b677075ea4c6e54` uses Solidity
`0.8.20` and OpenZeppelin 5.0.1, but compiles to 12,288 runtime bytes and does
not match the deployed contract. Use the 2023 commit above for reproduction.

The matching source still does not provide a mainnet deployment transaction,
constructor inputs, or a signed technical review. It is strong reproduction
evidence, not final baseline approval.
