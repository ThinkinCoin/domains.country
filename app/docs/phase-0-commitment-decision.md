# Commitment Window Risk Decision

Date: 2026-09-01  
Network: Harmony Mainnet, chain ID `1666600000`  
Contract: RegistrarController `0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb`

## Observed state

The read-only Phase 0 probe observed:

| Parameter | Observed value |
| --- | --- |
| `minCommitmentAge()` | `0` seconds |
| `maxCommitmentAge()` | `120` seconds |

The app must not present this configuration as a safe public `commit → register` flow. A zero minimum gives no enforced delay between the public commitment and registration attempt.

## Source confirmation

The current `ThinkinCoin/ens-deployer` `main` branch was inspected at commit
`5e56258aee80bbe604c3424c9f997db6c74fa5d7`. In
`contract/contracts/RegistrarController.sol`, both `minCommitmentAge` and
`maxCommitmentAge` are declared `immutable` and assigned only in the
constructor. No owner setter exists for either value. The deploy module
`contract/deploy/registrarController.ts` passes `MIN_COMMITMENT_AGE` and
`MAX_COMMITMENT_AGE` as constructor arguments and then transfers controller
ownership to the configured multisig.

Therefore the live `0–120` second window cannot be corrected by an app flag,
frontend delay, allowlist, owner transaction, or backend policy on the deployed
controller. Correcting it requires deploying a replacement
`RegistrarController` with a non-zero minimum commitment age, then updating and
revalidating the controller relationships that depend on it.

See `docs/phase-0-registrar-controller-replacement.md` for the prepared
no-transaction sequence: constructor inputs, owner-controlled relationship
changes, and post-deploy read-only validation. It does not authorize or
execute a Mainnet deployment.

## Required decision

The contract owner and technical reviewer must choose one of these outcomes:

1. **Contract action:** deploy a replacement controller with a non-zero minimum and a maximum greater than that minimum; update the dependent controller permissions, then record the deployment and accepted values.
2. **No public registration:** keep registration writes disabled. This outcome cannot produce Phase 0 `READY` for the registration MVP.

No client-side delay, local-storage behavior, allowlist, or backend policy can substitute for an enforced contract minimum.

## Evidence required for approval

To set `commitmentPolicy.status` to `APPROVED`, the manifest must contain the
exact controller address, the exact observed values, a durable reference to
its replacement deployment, the decision reference, and evidence that the
configured RegistrarController bytecode and ABI are approved. The subsequent
Phase 0 run must read the same non-zero values from Harmony Mainnet.

Until then, `registrarController.commitmentWindow` remains a required blocker.
