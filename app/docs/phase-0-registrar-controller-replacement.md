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

## Candidate smoke test

The repository provides an evidence-only local test for the candidate artifact:

```bash
PHASE_ZERO_LOCAL_PRIVATE_KEY=<ephemeral-anvil-key> \
  npm run phase0:verify-safe-controller-local -- \
  --artifact <RegistrarController.json> \
  --source-revision <full-app-git-sha> \
  --candidate-source-revision 5e56258aee80bbe604c3424c9f997db6c74fa5d7 \
  --rpc http://127.0.0.1:18545 \
  --output docs/phase-0-safe-controller-local-smoke.json
```

The command refuses Harmony Mainnet and any chain other than local Anvil
`31337`. It deploys a disposable controller with a `60–3600` second window,
checks `baseExtension()` and both immutable ages, then submits a local
`commit`. It is a candidate-artifact smoke test only, never a deployment
procedure.

## Read-only post-deployment preflight

After an owner-authorized Harmony deployment and relationship migration, but
before changing the Phase 0 decision, run the read-only preflight:

```bash
npm run phase0:preflight-replacement-controller -- \
  --controller <new-controller-address> \
  --output docs/phase-0-replacement-controller-preflight.json
```

It uses no private key and sends no transaction. It verifies Harmony Mainnet,
runtime bytecode, `baseExtension()`, a non-zero commitment window,
NameWrapper/BaseRegistrar controller relationships, the DC controller pointer,
the approved controller baseline/ABI/commitment-policy records, and the
PublicResolver policy required when its trusted controller differs. Its best
possible result is `READY_FOR_PHASE_ZERO_REVIEW`; only the complete fresh
Phase 0 validation can return `READY`.

The preflight was executed on September 2, 2026 against the currently
configured controller. It observed runtime hash
`0x5710e0139c49ee09983f1ba2ccd90afdde88b1177501b1bb53517344be3c97b1`,
`baseExtension() == "country"`, NameWrapper controller permission enabled,
BaseRegistrar permission for the NameWrapper enabled, and DC pointing to the
same controller. It independently confirmed the unsafe `0–120` second window.
The discovery-only output is
`docs/phase-0-replacement-controller-preflight-observation.json`, evidence
SHA-256 `374519ea985e040ba191b1c54271b60323867789327bf02a6d2a0fd81347aaf6`.
It also reports the expected pending manifest baseline, ABI, commitment-policy,
and resolver-authorization records. This observation proves the replacement
requirement; it does not satisfy it.

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
