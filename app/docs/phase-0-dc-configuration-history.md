# DC Configuration-History Reconciliation

Status: `DISCOVERY_RECONCILED; APPROVAL_PENDING`
Date: 2026-09-02
Network: Harmony Mainnet (`1666600000`)

`DC` at `0x547942748Cc8840FEc23daFdD01E6457379B446D` accepts owner-only
changes to every integration endpoint and rental setting. Its setters do not
emit configuration-change events, so a current read alone cannot establish how
the deployment tuple became the active tuple. The read-only archive-RPC
reconciliation below identifies the successful internal calls that changed
every differing field.

## Decoded deployment tuple

The creation-bytecode tail reproduced from the candidate source decodes to:

| Field | Initial value |
| --- | --- |
| `owner` | `0x5cE1Da1f0Bd679669EEca577fe22f24E3cc2D35F` observed by historical `owner()` reads at the first-code and transition blocks |
| `registrarController` | `0xaE4A0880cD682CDC138688C056929AD23718a94a` |
| `nameWrapper` | `0x034A4ACe40dACaF40e5392bf55867d0228307bEB` |
| `baseRegistrar` | `0xaC60e74e5906C60D96E2645387952e6a7DE224dc` |
| `resolver` | `0x3Dc80D58903Bff9c0BBE893717cfC2d6a918b10C` |
| `reverseRecord` | `true` |
| `fuses` | `0` |
| `wrapperExpiry` | `18446744073709551615` |
| `duration` | `7776000` |

Decoded constructor arguments SHA-256:
`c80bf7f84d98890c730fb992a98838364c4a9d3b4090588aaf2d3fd37a19e9b4`.

## Active tuple observed in discovery

At the Phase 0 read-only snapshot, DC returned the configured active endpoints.
The focused snapshot was regenerated at Harmony block `93268532`; its
SHA-256 is
`437ba27eec8f0b06b0837bcabfb86c1b409f33617af9cc2b8867bed7f467e5ea` and
is stored in `docs/phase-0-dc-configuration-snapshot.json`.

| Field | Active value |
| --- | --- |
| `owner` | `0x5cE1Da1f0Bd679669EEca577fe22f24E3cc2D35F` |
| `registrarController` | `0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb` |
| `nameWrapper` | `0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5` |
| `baseRegistrar` | `0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD` |
| `resolver` | `0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D` |
| `reverseRecord` | `true` |
| `fuses` | `0` |
| `wrapperExpiry` | `18446744073709551615` |
| `duration` | `2592000` |

The fields that differ from the decoded constructor tuple are
`registrarController`, `nameWrapper`, `baseRegistrar`, `resolver`, and
`duration`. `reverseRecord`, `fuses`, and `wrapperExpiry` match the decoded
constructor tuple. `owner()` returns the current owner at the first-code and
each reconciled transition block.

Regenerate the focused snapshot with:

```bash
cd app
npm run phase0:collect-dc-config
```

## Reconciled on-chain transitions

The command npm run phase0:collect-dc-history combines all 2,271 direct
transactions returned by hmyv2_getTransactionsHistory, historical eth_call
values, and debug_traceTransaction for the exact transition blocks.

The direct history contains three attempted setDuration calls, but each receipt
has status 0x0 and changed no state. The effective calls are internal owner
calls:

| Block | Transaction | Effective configuration calls |
| ---: | --- | --- |
| 39546159 | 0xda4cbc92df4626f35061a90f91480ab917aed60297490d5f2115ce7d43982927 | BaseRegistrar to 0x4D64...9dDD; NameWrapper to 0x4Cd2...9ff5; RegistrarController to 0xACa2...0fF1 |
| 39547618 | 0x5fcf37d268098d77b2f43cafe0bba35e191ff113eb3a6e697aa2b14dde4d2478 | Resolver to 0x46E3...415D |
| 41687221 | 0x507986461df97014533512b43a1c934e99f8aaa7ad8366e11187a7c3f38fe777 | RegistrarController to 0x76c6...94Fb |
| 43922397 | 0xe7f2c331111ba5cdf661e5fb54e8385242e197c40dd1550a7dfd11c7e33e94be | Duration to 2592000 seconds |

Every successful trace has callFrom equal to the DC owner
0x5cE1Da1f0Bd679669EEca577fe22f24E3cc2D35F at the transition block. The
generated, digest-bound snapshot is
docs/phase-0-dc-configuration-history-observation.json.

## Approval requirement

Before `READY`, a named technical/governance approver must preserve and
approve the generated history observation, transaction traces, owner identity,
and active tuple in an immutable Git revision or equivalent durable reference.
Record its digest and reference in `contracts.dc.configurationHistory`. The
Phase 0 gate re-reads the active tuple and blocks on any mismatch, missing
evidence, altered owner, or absent documented transition. Discovery is now
reconciled; the remaining blocker is named approval and manifest integration.
