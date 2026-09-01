# DC Configuration-History Reconciliation

Status: `PENDING_EXTERNAL_EVIDENCE`  
Date: 2026-09-01  
Network: Harmony Mainnet (`1666600000`)

`DC` at `0x547942748Cc8840FEc23daFdD01E6457379B446D` accepts owner-only
changes to every integration endpoint and rental setting. Its setters do not
emit configuration-change events, so a current read alone cannot establish how
the deployment tuple became the active tuple.

## Decoded deployment tuple

The creation-bytecode tail reproduced from the candidate source decodes to:

| Field | Initial value |
| --- | --- |
| `owner` | Not a constructor argument; deployment transaction or signed governance evidence required |
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
The focused snapshot was regenerated at Harmony block `93251087`; its
SHA-256 is
`2234388935b1ee64668bdbbe2518fd49216a9fa63bc2578604b72c42ac59d89a` and
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
constructor tuple. `owner` is not a constructor argument in `DC.sol`, so it
requires independent deployment or ownership-transfer evidence.

Regenerate the focused snapshot with:

```bash
cd app
npm run phase0:collect-dc-config
```

## Approval requirement

Before `READY`, a named technical/governance approver must preserve an
immutable evidence bundle with the owner identity, transaction traces or a
signed owner attestation covering the five changed fields and the active tuple.
Record its digest and reference in `contracts.dc.configurationHistory`. The
Phase 0 gate re-reads the active tuple and blocks on any mismatch, missing
evidence, altered owner, or absent documented transition. This document is
discovery-only; it is not approval.
