# RegistrarController Replacement Runbook

Status: `PREPARED_ONLY; NO_MAINNET_TRANSACTION_SENT`  
Date: 2026-09-01  
Network: Harmony Mainnet, chain ID `1666600000`

## Purpose

The current RegistrarController at
`0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb` reports
`minCommitmentAge() == 0` and `maxCommitmentAge() == 120`. The reproduced
source declares both values `immutable`, so a safe public registration flow
requires a replacement controller. This runbook documents the required action;
it does not authorize or execute any Mainnet transaction.

## Constructor inputs to preserve or decide

The replacement must use the verified RegistrarController source and record
the exact compiler, optimizer, artifact hash, constructor arguments, deploy
transaction, and reviewer approval.

| Argument | Required value or decision |
| --- | --- |
| BaseRegistrar | `0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD` |
| Price oracle | `0x1fB07b1AdE6ad2C05b0d6186D654588fcad84229` unless a new oracle is separately approved |
| Minimum commitment age | Non-zero. The owner and technical reviewer must record the approved value and rationale. |
| Maximum commitment age | Greater than the approved minimum. The owner and technical reviewer must record the approved value and rationale. |
| ReverseRegistrar | `0x51e86d4cc8723FCa7014fd97C0aD0c737C86A2af` |
| TLDNameWrapper | `0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5` |
| Base node / extension | `namehash("country")` / `country` |
| Revenue account | Preserve the approved revenue account or attach a separate treasury decision. Current decoded candidate: `0x306b6fef4f9890a040fbe1ff708a7b64e4cd04bd`. |
| Owner | Transfer to the approved multisig/owner before readiness approval. |

## Required relationship changes

After deployment, but before enabling writes, owner-controlled transactions
must make the replacement controller operational:

1. Enable the replacement controller in `TLDNameWrapper.setController(address,bool)`.
2. Enable the replacement controller in `ReverseRegistrar.setController(address,bool)`.
3. Keep `BaseRegistrar.controllers(TLDNameWrapper) == true`; direct
   `BaseRegistrar.controllers(RegistrarController)` is informational only for
   the current wrapper-mediated flow.
4. Update `DC.setRegistrarController(address)` only if DC remains part of any
   active product path or if the six-contract relationship evidence continues
   to require DC's active tuple to match the app controller.
5. Recheck PublicResolver authorization. The deployed resolver currently trusts
   `0xaca2d31194689fd37962fe17d5a4e63213850ff1`, so registration DNS data must
   stay empty unless a new resolver or compatibility path is separately
   approved.

Do not disable the old controller until the owner has confirmed there are no
pending user commitments that can still be completed through it.

## Required no-write validation

Before copying the new address into production config, run:

```bash
npm run phase0:validate
npm test
npm run build
```

The report must show the replacement address, matching bytecode baseline,
approved ABI with `baseExtension() == "country"`, a non-zero
`minCommitmentAge()`, `maxCommitmentAge() > minCommitmentAge()`, and
`TLDNameWrapper.controllers(newController) == true`. The approved
`commitmentPolicy` must bind the exact replacement deployment.

## Manifest fields

The final manifest must update:

- `contracts.registrarController.address`, baseline, source, approval, and ABI;
- all configured references to the active RegistrarController;
- `commitmentPolicy` address, observed ages, deployment reference, approval,
  and evidence digest;
- `deployment.sourceRevision`;
- top-level approval source revision and integrity digest.

Until those fields are approved and a live read-only probe observes the same
non-zero window, `registrarController.commitmentWindow` must remain
`BLOCKED`.
