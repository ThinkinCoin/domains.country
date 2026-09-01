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

## Required decision

The contract owner and technical reviewer must choose one of these outcomes:

1. **Contract action:** deploy or upgrade to a controller with a non-zero minimum and a maximum greater than that minimum; record the deployment and the accepted values.
2. **No public registration:** keep registration writes disabled. This outcome cannot produce Phase 0 `READY` for the registration MVP.

No client-side delay, local-storage behavior, allowlist, or backend policy can substitute for an enforced contract minimum.

## Evidence required for approval

To set `commitmentPolicy.status` to `APPROVED`, the manifest must contain the exact observed values, the decision reference, and evidence that the configured RegistrarController bytecode and ABI are approved. The subsequent Phase 0 run must read the same non-zero values from Harmony Mainnet.

Until then, `registrarController.commitmentWindow` remains a required blocker.
