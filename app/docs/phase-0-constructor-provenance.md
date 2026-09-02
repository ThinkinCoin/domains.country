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

## Compiled artifact and ABI digests

A September 2, 2026 re-run of `scripts/compare-phase-zero-candidate.mjs`
compiled each source candidate with Solidity `0.8.17`, optimizer `200`, then
compared the compiled creation-code prefix with the explorer creation bytecode.
Every listed component returned `metadataStrippedCreationPrefixMatch: true` and
decoded constructor arguments without error.

| Component | Runtime comparison | Compiled artifact SHA-256 | ABI SHA-256 | Constructor tail bytes |
| --- | --- | --- | --- | ---: |
| RegistrarController | `IMMUTABLE_NORMALIZED_MATCH` | `b6aeab317a0464ae4258e3c86d0418fe1b778495269c4446fb9b80f7c13a84e9` | `7cb408739bc35504893f29655abced6e02c50a51b3f8e376311f55f7af44ee2f` | 352 |
| DC | `METADATA_STRIPPED_MATCH` | `1d466487485c8ca466cebd38fd5cb8363837f26cd11937ef7e635066dbc791c2` | `f354f0b1d4c126c8dc0810835bfbbd0b226c4bfb9685118ccaf8780a3854fb0f` | 256 |
| EWS | `METADATA_STRIPPED_MATCH` | `5095c9796083cdd92d4d9c774f9bae57acd605060d15312d677e33bb7963270c` | `b65e52c56a249dc57c73d103039c01b67642379a9258aaa018096528e0ce7e16` | 128 |
| BaseRegistrar | `METADATA_STRIPPED_MATCH` | `64c72dd33626e7f12db7972302f73fdf5baccf413ade768a24597c52a73c9184` | `113660218ada0f4d2ad2eee6fec0db6c0a92372070802baf25d0ef696f4bf316` | 96 |
| TLDNameWrapper | `IMMUTABLE_NORMALIZED_MATCH` | `64b3db7fe877e444498c19052f85731910b6cc954e0017967bf004d53d9a03eb` | `8afd14d6dcab0d920e06d4eb0aecbeac238944a0b984b76cfa76f260f796670a` | 192 |
| PublicResolver | `IMMUTABLE_NORMALIZED_MATCH` | `39194063711919c1a4841e97e5b9779396139eb47ac34186da9c318e8263f0f7` | `9ca379d337b50cadb4b5ad7a67076d7125199694a472727db564bc37045cd85d` | 128 |

These artifact hashes are tied to the local comparison helper's compact artifact
shape (`contractName`, `sourceName`, ABI, metadata and EVM output). They are
not interchangeable with Hardhat's full artifact or build-info hashes. A final
approval must state exactly which artifact shape and build command were
reviewed.

The PublicResolver constructor values match the authorization discovery record:
registry `0x6e20…FBA7`, NameWrapper `0x4Cd2…9ff5`, trusted controller
`0xACa2…0fF1`, and reverse registrar `0x51e8…A2af`. Because the trusted
controller differs from the active RegistrarController, the MVP approval record
must keep the `EMPTY_DATA_ONLY` initial DNS policy and the post-transfer
on-chain owner/permission re-query policy.

The DC constructor values remain intentionally different from the active tuple.
The changed RegistrarController, NameWrapper, BaseRegistrar, resolver and
duration fields still require owner/governance reconciliation before
`contracts.dc.configurationHistory` can be approved.

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
