# Commitment Window Policy Decision

Date: 2026-09-01  
Network: Harmony Mainnet, chain ID `1666600000`  
Contract: RegistrarController `0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb`

## Observed state

The read-only Phase 0 probe observed:

| Parameter | Observed value |
| --- | --- |
| `minCommitmentAge()` | `0` seconds |
| `maxCommitmentAge()` | `120` seconds |

This is the established deployed window used by the legacy flow. It does not
provide an enforced anti-front-running delay, but the project has accepted
using it temporarily while a replacement controller is studied separately.

## Source confirmation

The current `ThinkinCoin/ens-deployer` `main` branch was inspected at commit
`5e56258aee80bbe604c3424c9f997db6c74fa5d7`. In
`contract/contracts/RegistrarController.sol`, both `minCommitmentAge` and
`maxCommitmentAge` are declared `immutable` and assigned only in the
constructor. No owner setter exists for either value. The deploy module
`contract/deploy/registrarController.ts` passes `MIN_COMMITMENT_AGE` and
`MAX_COMMITMENT_AGE` as constructor arguments and then transfers controller
ownership to the configured multisig.

Therefore the live `0–120` second window cannot be changed by an app flag,
frontend delay, allowlist, owner transaction, or backend policy on the deployed
controller. A stronger future policy requires deploying a replacement
`RegistrarController` with a non-zero minimum commitment age, then updating and
revalidating the controller relationships that depend on it.

## Controlled local validation

On 2026-09-02, the candidate RegistrarController artifact from
`ThinkinCoin/ens-deployer` commit
`5e56258aee80bbe604c3424c9f997db6c74fa5d7` was deployed only to an ephemeral
Anvil chain (`31337`) with `minCommitmentAge = 60` and
`maxCommitmentAge = 3600`. Read-only calls returned `baseExtension() ==
"country"` and the configured ages; a subsequent `commit(bytes32)` succeeded.

The machine-readable discovery record is
`docs/phase-0-safe-controller-local-smoke.json` (evidence SHA-256
`b86fe037e4eb5d8653336044f6e5d69c95430d0567c60046cef62c9e8f53a443`). It
proves that the reviewed candidate can encode and enforce a non-zero window in
an isolated environment. It does **not** prove a Harmony deployment, owner
authority, migration of wrapper/reverse-registrar permissions, or production
approval.

See `docs/phase-0-registrar-controller-replacement.md` for the prepared
no-transaction sequence: constructor inputs, owner-controlled relationship
changes, and post-deploy read-only validation. It does not authorize or
execute a Mainnet deployment.

## Current Phase 0 decision

For the current MVP/development path, the project will use the existing
deployed controller and accept the `0–120` second window as a temporary risk
decision. This preserves continuity with the legacy production model while
controller replacement is deferred.

The required compensating controls are:

- keep the commitment secret exclusively in the browser until `register`;
- show explicit user-facing copy that the current deployed commitment window is
  `0–120` seconds;
- keep replacement-controller work tracked as future hardening.

This policy accepts the deployed contract behavior. It does not claim that the
window is equivalent to a non-zero minimum.

## Future hardening path

The stronger production path remains: deploy a replacement controller with a
non-zero minimum and a maximum greater than that minimum, update dependent
controller permissions, then record the deployment and accepted values. The
local fork simulation proves this path is mechanically plausible, not that it
has been authorized or deployed.

## Evidence required for approval

To set `commitmentPolicy.status` to `APPROVED` for the current deployed
controller, the manifest must contain:

- `mode: "EXISTING_DEPLOYED_0_TO_120_ACCEPTED"`;
- the configured RegistrarController address;
- `minimumCommitmentAgeSeconds: 0`;
- `maximumCommitmentAgeSeconds: 120`;
- `riskAccepted: true`;
- controls including `browser-local-commitment-secret`,
  `explicit-user-risk-copy`, and `future-controller-replacement-tracked`;
- `deploymentReference: "existing-deployed-controller"`;
- named reviewer, timestamp, durable decision reference, and canonical
  `evidenceSha256`.

The subsequent Phase 0 run must read the same `0–120` values from Harmony
Mainnet. Without this explicit digest-bound risk decision,
`registrarController.commitmentWindow` remains a required blocker.
