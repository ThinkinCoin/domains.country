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

The candidate specifies Solidity `0.8.17` with optimizer enabled and `200` runs. Its RegistrarController ABI contains `baseExtension()`, and its constructor accepts the base registrar, oracle, commitment ages, reverse registrar, wrapper, base node, TLD extension, and revenue account.

The public `.env.rc` candidate records `TLD_BASE_REGISTRAR_IMPLEMENTATION=0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD`, `REVERSE_REGISTRAR=0x51e86d4cc8723FCa7014fd97C0aD0c737C86A2af`, `NAME_WRAPPER=0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5`, `MIN_COMMITMENT_AGE=0`, and `MAX_COMMITMENT_AGE=120`. This matches key read-only observations, but it does not identify the deployed RegistrarController transaction or approve the active address.

## Confirmed read-only consistency

On Harmony Mainnet, the configured RegistrarController returns `baseExtension() == "country"`, exposes the expected registration selectors, and reports a runtime hash of `0x5710e0139c49ee09983f1ba2ccd90afdde88b1177501b1bb53517344be3c97b1`.

The candidate source shows that `_consumeCommitment` enforces `minCommitmentAge` directly. The observed deployed value of zero therefore provides no contract-enforced waiting period.

## Why this is not a baseline approval

The public candidate has not yet been compiled into a bytecode match against all six deployed addresses, and it does not supply the deployment transaction, constructor inputs, linked-library addresses, or a signed technical review for those deployments. Explorer and Sourcify do not currently provide verified source records for the six active addresses. The candidate commit itself is not signed, so it cannot be treated as an approval authority.

Do not set `source.status` to `VERIFIED`, populate `approvedBytecodeHash`, or change the gate based on this document alone. Approval requires a reproducible build and deployment provenance for each contract.

See `docs/phase-0-bytecode-reproduction.md` for the current local reproduction
results. RegistrarController, DC, BaseRegistrar, TLDNameWrapper, and
PublicResolver now have metadata-stripped or immutable-normalized bytecode
matches against Harmony runtime code. EWS does not match the currently known
public source candidate.

## EWS candidate

`harmony-one/dot-country-embedder` commit
`0253d832326fea508c34a7a72013f49d5ae55d61` is a separate public candidate for
the configured EWS address. Its `readme.md` assigns
`EMBEDDER_CONTRACT=0xf90dab949d3853c418bE361930028644B4EBcDE4` with Harmony
Mainnet chain ID `1666600000`; `contract/contracts/EWS.sol` has SHA-256
`07dba5a4a6ae7d0cdc59aec1fd513de93cde5ea3972b0457d0cb9f9c74535ed3`.

The candidate uses Solidity `0.8.20` with the optimizer enabled for 200 runs.
Its deployment script accepts a DC address and three fee values, then sets a
revenue account and optional maintainers. These facts are consistent with the
read-only EWS probes, but they do not provide a mainnet deployment transaction
or a bytecode reproduction. It is discovery evidence only.
