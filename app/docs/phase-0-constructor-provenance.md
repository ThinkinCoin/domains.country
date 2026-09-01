# Constructor Provenance Candidates

Status: `DISCOVERY_ONLY`  
Date: 2026-09-01  
Network: Harmony Mainnet (`1666600000`)

This record preserves decoded creation-bytecode tails after the compiled
creation-code prefix matched explorer creation bytecode. It is not a deployment
transaction, a source verification, or approval. A named reviewer must bind
each result to an immutable source/build record before copying it to the Phase
0 manifest.

| Component | Decoded constructor arguments SHA-256 | Decoded values relevant to Phase 0 |
| --- | --- | --- |
| RegistrarController | `a3d4ee97e3a11a365a4cc78fa33130198ec265942600f5eee786612ebbf9c7d8` | BaseRegistrar `0x4D64…9dDD`; oracle `0x1fB0…4229`; min/max commitment `0/120`; reverse `0x51e8…A2af`; NameWrapper `0x4Cd2…9ff5`; TLD `country`; revenue `0x306b…04bd`. |
| DC | `c80bf7f84d98890c730fb992a98838364c4a9d3b4090588aaf2d3fd37a19e9b4` | Initial RegistrarController `0xaE4A…a94a`; Wrapper `0x034A…7bEB`; BaseRegistrar `0xaC60…24dc`; resolver `0x3Dc8…b10C`; duration `7776000`. See DC reconciliation record. |
| EWS | `3d62c1377d2a422da6b113a7ea535dfabe782c60c02154639febcf0d6013c26d` | DC `0x5479…446D`; landing-page fee `1e18`; additional-page fee `1e17`; subdomain fee `1e18`. |
| BaseRegistrar | `58d5be6a711367e6f421e0607550b903e6c367392b4ead6b8eaf54ec8581fd1e` | ENS Registry `0x6e20…FBA7`; `.country` base node; metadata service `0xe644…64D6`. |
| TLDNameWrapper | `9d67a73320686f51069acbbf1d78aef5ea87b970640baff8e7ec25f929c0aa31` | ENS Registry `0x6e20…FBA7`; BaseRegistrar `0x4D64…9dDD`; metadata service `0x5Be6…16d3`; TLD `country`. |
| PublicResolver | `233996376c14951da830f3c4ab5b5b5e00b1570032df8ea414e99bd1d550e01f` | ENS Registry `0x6e20…FBA7`; NameWrapper `0x4Cd2…9ff5`; trusted controller `0xACa2…0fF1`; reverse registrar `0x51e8…A2af`. |

## Review instructions

1. Rebuild the cited source with its pinned compiler and optimizer.
2. Confirm the creation-code prefix and constructor-tail decoding against a
   stable explorer artifact or creation transaction.
3. Store the exact SHA-256 and this document's immutable Git revision, IPFS CID,
   or equivalent immutable reference in `source.deploymentArtifact`.
4. For DC, also provide owner-governance evidence for the transition from its
   initial tuple to the active tuple.

The RegistrarController tail confirms a live zero-second minimum commitment
age. It is evidence for the existing registration risk blocker, not permission
to approve the contract or enable writes.
