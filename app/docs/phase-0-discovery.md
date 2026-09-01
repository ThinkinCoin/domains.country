# Phase 0 Technical Discovery

## Decision

**BLOCKED** — generated 2026-09-01T14:00:50.725Z; evidence expires 2026-09-01T14:15:50.725Z.

Writes remain disabled. The blockers below must be resolved and the validation rerun before any transaction flow is enabled.

## Network and deployed addresses

- Network: Harmony Mainnet (chain ID 1666600000)
- Block queried: 93237223
- RPC: configured server-side as `HARMONY_RPC_URL`

| Component | Address | Runtime bytecode hash |
| --- | --- | --- |
| registrarController | 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb | 0x5710e0139c49ee09983f1ba2ccd90afdde88b1177501b1bb53517344be3c97b1 |
| dc | 0x547942748Cc8840FEc23daFdD01E6457379B446D | 0x1487a13fe7b543a393588b944de73b36a3f3e504d6f93292360fefabf740771b |
| ews | 0xf90dab949d3853c418bE361930028644B4EBcDE4 | 0xfcfd980bcd097a217a9aef5bd6996597df8102d3de72d5e81d4d16b221e32211 |
| baseRegistrar | 0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD | 0x1f003201f580de20b6888b85c39369ef15ad107e6f8dfe7bd13d12a51078441c |
| nameWrapper | 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5 | 0x2abe6afb12233a6fa8b27bcd0f85466b17589362a4449d6af8037b45c0283c4a |
| publicResolver | 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D | 0x4cb1367da73ecc2a124354fd12106bfcccf599777f257622696cd7aeda4156f5 |

## Contract provenance discovery

Snapshot generated 2026-09-01T12:27:16.476Z at block 93234452. Explorer: `https://explorer.harmony.one/api/v2`; Sourcify: `https://repo.sourcify.dev/contracts`.

| Component | Explorer source verified | Creation transaction | Sourcify | Explorer runtime matches RPC |
| --- | --- | --- | --- | --- |
| registrarController | no | unavailable | NOT_FOUND | yes |
| dc | no | unavailable | NOT_FOUND | yes |
| ews | no | unavailable | NOT_FOUND | yes |
| baseRegistrar | no | unavailable | NOT_FOUND | yes |
| nameWrapper | no | unavailable | NOT_FOUND | yes |
| publicResolver | no | unavailable | NOT_FOUND | yes |

An explorer/RPC bytecode match proves observation consistency only. It does not approve a baseline without reproducible source, deployment provenance, and explicit review.

## Local bytecode reproduction

`docs/phase-0-bytecode-reproduction.md` records local candidate builds. RegistrarController, DC, BaseRegistrar, TLDNameWrapper, and PublicResolver have metadata-stripped or immutable-normalized runtime matches. EWS does not match its currently known public candidate source. These results strengthen technical provenance but do not replace deployment transaction evidence or explicit approval.

## Required blockers

- **evidence.manifest.approval** (FAIL): The versioned Phase 0 evidence manifest has no explicit top-level approval.
- **bytecode.registrarController.baseline** (FAIL): The contract source artifact and deployment provenance are not verified in the versioned manifest.
- **bytecode.dc.baseline** (FAIL): The contract source artifact and deployment provenance are not verified in the versioned manifest.
- **bytecode.ews.baseline** (FAIL): The contract source artifact and deployment provenance are not verified in the versioned manifest.
- **bytecode.baseRegistrar.baseline** (FAIL): The contract source artifact and deployment provenance are not verified in the versioned manifest.
- **bytecode.nameWrapper.baseline** (FAIL): The contract source artifact and deployment provenance are not verified in the versioned manifest.
- **bytecode.publicResolver.baseline** (FAIL): The contract source artifact and deployment provenance are not verified in the versioned manifest.
- **registrarController.abiProvenance** (FAIL): RegistrarController ABI/source provenance has not approved the baseExtension() TLD accessor.
- **registrarController.commitmentWindow** (FAIL): Commitment age values are not covered by an approved safe non-zero policy decision.
- **publicResolver.runtimeImmutables** (FAIL): PublicResolver runtime immutables do not match the configured RegistrarController/NameWrapper deployment.
- **publicResolver.authorizationModel** (FAIL): PublicResolver authorization model is not verified; owner() is intentionally not required.
- **ews.role** (FAIL): EWS has no approved source-backed MVP classification. It cannot be classified automatically from bytecode alone.
- **dns.parentControl** (FAIL): Control of the .country parent delegation mechanism is not verified in the versioned manifest.
- **dns.projectDelegation** (FAIL): Versioned DNS evidence must name project nameservers, a delegated probe domain, and a verified delegation record.
- **dns.powerDnsRollback** (FAIL): PowerDNS rollback evidence must include a verified test, responsible operator, immutable reference, and SHA-256 digest.

## Exact conditions to change the decision

| Blocker | Required evidence or action |
| --- | --- |
| evidence.manifest.approval | Record a named, dated top-level technical approval after every required evidence entry passes. |
| bytecode.registrarController.baseline | Reproduce the deployed runtime from a verified source/artifact and deployment record, then approve its exact hash in the versioned manifest. |
| bytecode.dc.baseline | Reproduce the deployed runtime from a verified source/artifact and deployment record, then approve its exact hash in the versioned manifest. |
| bytecode.ews.baseline | Reproduce the deployed runtime from a verified source/artifact and deployment record, then approve its exact hash in the versioned manifest. |
| bytecode.baseRegistrar.baseline | Reproduce the deployed runtime from a verified source/artifact and deployment record, then approve its exact hash in the versioned manifest. |
| bytecode.nameWrapper.baseline | Reproduce the deployed runtime from a verified source/artifact and deployment record, then approve its exact hash in the versioned manifest. |
| bytecode.publicResolver.baseline | Reproduce the deployed runtime from a verified source/artifact and deployment record, then approve its exact hash in the versioned manifest. |
| registrarController.abiProvenance | Approve the deployed RegistrarController ABI artifact with `baseExtension()` as the accessor and `country` as its expected value. |
| registrarController.commitmentWindow | Deploy or configure an approved controller with a non-zero minimum commitment age and a maximum greater than the minimum; then update the configured address and evidence. |
| publicResolver.runtimeImmutables | Use a resolver whose trusted controller and Name Wrapper match the configured deployment, or complete a reviewed migration that proves an equivalent safe authorization path. |
| publicResolver.authorizationModel | Approve the deployed resolver artifact and record Registry, Name Wrapper, trusted controller, trusted reverse registrar, reviewer, timestamp, and immutable reference. |
| ews.role | Approve `IN_MVP` or `OUT_OF_SCOPE` with source-backed rationale, named reviewer, timestamp, and immutable decision reference. |
| dns.parentControl | Identify the authorized `.country` parent-zone operator and document the authenticated mechanism used to create or update child NS delegation. |
| dns.projectDelegation | Provision three project nameservers, delegate a proof domain at the parent, and record an immutable delegation test reference. |
| dns.powerDnsRollback | Run and document a PowerDNS failure test proving that the last valid published zone remains authoritative; record operator, timestamp, evidence reference, and SHA-256. |

## ABI and selector probes

| Check | Status | Evidence |
| --- | --- | --- |
| abi.registrarController.selectors | PASS | selectors: {"base()":"0x5001f3b5","baseExtension()":"0xc6682862","available(string)":"0xaeb8ce9b","rentPrice(string,uint256)":"0x83e7f6ff","minCommitmentAge()":"0x8d839ffe","maxCommitmentAge()":"0xce1e09c0","makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)":"0xd555254a","commit(bytes32)":"0xf14fcbc8","register(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)":"0x7acaaf26","renew(string,uint256)":"0xacf1a841"} |
| abi.dc.selectors | PASS | selectors: {"owner()":"0x8da5cb5b","paused()":"0x5c975abb","registrarController()":"0xf9cd32c5","nameWrapper()":"0xa8e5fbc0","baseRegistrar()":"0x74f04565","resolver()":"0x04f3bcec","reverseRecord()":"0x1e1911cc","fuses()":"0x3813bb7e","wrapperExpiry()":"0x407fc609","duration()":"0x0fb5a6b4"} |
| abi.baseRegistrar.selectors | PASS | selectors: {"owner()":"0x8da5cb5b","baseNode()":"0xddf7fcb0","GRACE_PERIOD()":"0xc1a287e2","controllers(address)":"0xda8c229e","nameExpires(uint256)":"0xd6e4fa86","ownerOf(uint256)":"0x6352211e","getApproved(uint256)":"0x081812fc","isApprovedForAll(address,address)":"0xe985e9c5"} |
| abi.nameWrapper.selectors | PASS | selectors: {"owner()":"0x8da5cb5b","TLD_NODE()":"0x96df3540","ownerOf(uint256)":"0x6352211e","getData(uint256)":"0x0178fe3f","getApproved(uint256)":"0x081812fc","isApprovedForAll(address,address)":"0xe985e9c5","controllers(address)":"0xda8c229e","canModifyName(bytes32,address)":"0x41415eab","allFusesBurned(bytes32,uint32)":"0xadf4960a"} |
| abi.publicResolver.selectors | PASS | selectors: {"supportsInterface(bytes4)":"0x01ffc9a7","ttl(bytes32)":"0x16a25cbd","dnsRecord(bytes32,bytes32,uint16)":"0xa8fa5682","hasDNSRecords(bytes32,bytes32)":"0x4cbf6ba4","setDNSRecords(bytes32,bytes)":"0x0af179d7","setTTL(bytes32,uint64)":"0x14ab9038"} |
| abi.ews.selectors | PASS | selectors: {"dc()":"0xd8a531a6","revenueAccount()":"0xf5dc7d56","landingPageFee()":"0x201d2b8b","perAdditionalPageFee()":"0x39228a30","perSubdomainFee()":"0xe8d83cec","MAINTAINER_ROLE()":"0xf8742254","DEFAULT_ADMIN_ROLE()":"0xa217fddf","hasRole(bytes32,address)":"0x91d14854","getLandingPage(bytes32,bytes32)":"0xe4ed3f34","getSubdomains(bytes32)":"0x45975eaf","update(string,string,uint8,string,string[],bool)":"0x5120a321","remove(string,string)":"0x44590a7e","restore(string,string,uint8)":"0x394495eb"} |

## Full validation results

| Check | Required | Status | Result | Evidence |
| --- | --- | --- | --- | --- |
| network.selectorDiscovery | yes | PASS | Function selectors were derived locally with Ethereum-compatible Keccak-256. | selectorCount: 56 |
| network.chainId | yes | PASS | RPC returned the configured Harmony Mainnet chain ID. | chainId: 1666600000; expectedChainId: 1666600000 |
| network.block | yes | PASS | RPC returned a latest block number. | blockNumber: 93237223 |
| evidence.manifest.schema | yes | PASS | The Phase 0 evidence manifest has a supported schema and versioned revision. | revision: 2026-09-01.1; status: PENDING_APPROVAL |
| evidence.manifest.approval | yes | FAIL | The versioned Phase 0 evidence manifest has no explicit top-level approval. | revision: 2026-09-01.1; status: PENDING_APPROVAL; approval: {"status":"PENDING","approvedBy":null,"approvedAt":null,"reference":null} |
| bytecode.registrarController.present | yes | PASS | Runtime bytecode is present. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; byteLength: 8324; observedHash: 0x5710e0139c49ee09983f1ba2ccd90afdde88b1177501b1bb53517344be3c97b1 |
| bytecode.registrarController.baseline | yes | FAIL | The contract source artifact and deployment provenance are not verified in the versioned manifest. | manifestRevision: 2026-09-01.1; address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; observedHash: 0x5710e0139c49ee09983f1ba2ccd90afdde88b1177501b1bb53517344be3c97b1; expectedHash: null; source: {"status":"PENDING","artifact":null,"artifactSha256":null,"deploymentTransaction":null,"verifiedBy":null,"verifiedAt":null,"reference":null} |
| bytecode.dc.present | yes | PASS | Runtime bytecode is present. | address: 0x547942748Cc8840FEc23daFdD01E6457379B446D; byteLength: 6348; observedHash: 0x1487a13fe7b543a393588b944de73b36a3f3e504d6f93292360fefabf740771b |
| bytecode.dc.baseline | yes | FAIL | The contract source artifact and deployment provenance are not verified in the versioned manifest. | manifestRevision: 2026-09-01.1; address: 0x547942748Cc8840FEc23daFdD01E6457379B446D; observedHash: 0x1487a13fe7b543a393588b944de73b36a3f3e504d6f93292360fefabf740771b; expectedHash: null; source: {"status":"PENDING","artifact":null,"artifactSha256":null,"deploymentTransaction":null,"verifiedBy":null,"verifiedAt":null,"reference":null} |
| bytecode.ews.present | yes | PASS | Runtime bytecode is present. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; byteLength: 13225; observedHash: 0xfcfd980bcd097a217a9aef5bd6996597df8102d3de72d5e81d4d16b221e32211 |
| bytecode.ews.baseline | yes | FAIL | The contract source artifact and deployment provenance are not verified in the versioned manifest. | manifestRevision: 2026-09-01.1; address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; observedHash: 0xfcfd980bcd097a217a9aef5bd6996597df8102d3de72d5e81d4d16b221e32211; expectedHash: null; source: {"status":"PENDING","artifact":null,"artifactSha256":null,"deploymentTransaction":null,"verifiedBy":null,"verifiedAt":null,"reference":null} |
| bytecode.baseRegistrar.present | yes | PASS | Runtime bytecode is present. | address: 0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD; byteLength: 10536; observedHash: 0x1f003201f580de20b6888b85c39369ef15ad107e6f8dfe7bd13d12a51078441c |
| bytecode.baseRegistrar.baseline | yes | FAIL | The contract source artifact and deployment provenance are not verified in the versioned manifest. | manifestRevision: 2026-09-01.1; address: 0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD; observedHash: 0x1f003201f580de20b6888b85c39369ef15ad107e6f8dfe7bd13d12a51078441c; expectedHash: null; source: {"status":"PENDING","artifact":null,"artifactSha256":null,"deploymentTransaction":null,"verifiedBy":null,"verifiedAt":null,"reference":null} |
| bytecode.nameWrapper.present | yes | PASS | Runtime bytecode is present. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; byteLength: 21810; observedHash: 0x2abe6afb12233a6fa8b27bcd0f85466b17589362a4449d6af8037b45c0283c4a |
| bytecode.nameWrapper.baseline | yes | FAIL | The contract source artifact and deployment provenance are not verified in the versioned manifest. | manifestRevision: 2026-09-01.1; address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; observedHash: 0x2abe6afb12233a6fa8b27bcd0f85466b17589362a4449d6af8037b45c0283c4a; expectedHash: null; source: {"status":"PENDING","artifact":null,"artifactSha256":null,"deploymentTransaction":null,"verifiedBy":null,"verifiedAt":null,"reference":null} |
| bytecode.publicResolver.present | yes | PASS | Runtime bytecode is present. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; byteLength: 11287; observedHash: 0x4cb1367da73ecc2a124354fd12106bfcccf599777f257622696cd7aeda4156f5 |
| bytecode.publicResolver.baseline | yes | FAIL | The contract source artifact and deployment provenance are not verified in the versioned manifest. | manifestRevision: 2026-09-01.1; address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; observedHash: 0x4cb1367da73ecc2a124354fd12106bfcccf599777f257622696cd7aeda4156f5; expectedHash: null; source: {"status":"PENDING","artifact":null,"artifactSha256":null,"deploymentTransaction":null,"verifiedBy":null,"verifiedAt":null,"reference":null} |
| abi.registrarController.selectors | yes | PASS | Expected RegistrarController selectors were encoded for read-only probes. | selectors: {"base()":"0x5001f3b5","baseExtension()":"0xc6682862","available(string)":"0xaeb8ce9b","rentPrice(string,uint256)":"0x83e7f6ff","minCommitmentAge()":"0x8d839ffe","maxCommitmentAge()":"0xce1e09c0","makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)":"0xd555254a","commit(bytes32)":"0xf14fcbc8","register(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)":"0x7acaaf26","renew(string,uint256)":"0xacf1a841"} |
| registrarController.base.legacyProbe | no | FAIL | base returned a value that violates the expected invariant. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; value: 0x |
| registrarController.baseExtension | yes | PASS | baseExtension returned a value matching the expected ABI. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; value: country |
| registrarController.available | yes | PASS | available returned a value matching the expected ABI. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; value: true |
| registrarController.rentPrice | yes | PASS | rentPrice returned a value matching the expected ABI. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; value: {"base":"12172896000000000000","premium":"0"} |
| registrarController.minCommitmentAge | yes | PASS | minCommitmentAge returned a value matching the expected ABI. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; value: 0 |
| registrarController.maxCommitmentAge | yes | PASS | maxCommitmentAge returned a value matching the expected ABI. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; value: 120 |
| registrarController.makeCommitment | yes | PASS | makeCommitment returned a value matching the expected ABI. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; value: 0xcd6dbfa9c388910f9ae4af0ca4cce31d3b1ef26a7585e97fff6acc42459d397d |
| registrarController.abiProvenance | yes | FAIL | RegistrarController ABI/source provenance has not approved the baseExtension() TLD accessor. | status: PENDING; baseAccessor: null; expectedBaseExtension: null; artifact: null; verifiedBy: null; verifiedAt: null; reference: docs/phase-0-source-candidates.md |
| registrarController.commitmentWindow | yes | FAIL | Commitment age values are not covered by an approved safe non-zero policy decision. | minimumSeconds: 0; maximumSeconds: 120; policy: {"status":"PENDING","minimumCommitmentAgeSeconds":null,"maximumCommitmentAgeSeconds":null,"approvedBy":null,"approvedAt":null,"decisionReference":"docs/phase-0-commitment-decision.md"} |
| registrarController.commit.simulation | no | WARN | commit accepted an unauthorised eth_call; no state was persisted. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; functionName: commit; simulated: true |
| registrarController.register.simulation | no | WARN | register selector was encoded and evaluated by eth_call; an unauthorised/precondition revert is expected without a controlled owner. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; functionName: register; simulated: true; error: execution reverted |
| registrarController.renew.simulation | no | WARN | renew accepted an unauthorised eth_call; no state was persisted. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; functionName: renew; simulated: true |
| abi.dc.selectors | yes | PASS | Expected DC selectors were encoded for read-only probes. | selectors: {"owner()":"0x8da5cb5b","paused()":"0x5c975abb","registrarController()":"0xf9cd32c5","nameWrapper()":"0xa8e5fbc0","baseRegistrar()":"0x74f04565","resolver()":"0x04f3bcec","reverseRecord()":"0x1e1911cc","fuses()":"0x3813bb7e","wrapperExpiry()":"0x407fc609","duration()":"0x0fb5a6b4"} |
| dc.owner | yes | PASS | owner returned a value matching the expected ABI. | address: 0x547942748Cc8840FEc23daFdD01E6457379B446D; value: 0x5ce1da1f0bd679669eeca577fe22f24e3cc2d35f |
| dc.paused | yes | PASS | paused returned a value matching the expected ABI. | address: 0x547942748Cc8840FEc23daFdD01E6457379B446D; value: false |
| dc.registrarController | yes | PASS | registrarController returned a value matching the expected ABI. | address: 0x547942748Cc8840FEc23daFdD01E6457379B446D; value: 0x76c6fe3aee636f88d01de64931514e8cd64d94fb |
| dc.nameWrapper | yes | PASS | nameWrapper returned a value matching the expected ABI. | address: 0x547942748Cc8840FEc23daFdD01E6457379B446D; value: 0x4cd2563118e57b19179d8dc033f2b0c5b5d69ff5 |
| dc.baseRegistrar | yes | PASS | baseRegistrar returned a value matching the expected ABI. | address: 0x547942748Cc8840FEc23daFdD01E6457379B446D; value: 0x4d64b78eaf6129fac30ab51e6d2d679993ea9ddd |
| dc.resolver | yes | PASS | resolver returned a value matching the expected ABI. | address: 0x547942748Cc8840FEc23daFdD01E6457379B446D; value: 0x46e37034ffc87a969d1a581748acf6a94bc7415d |
| dc.reverseRecord | yes | PASS | reverseRecord returned a value matching the expected ABI. | address: 0x547942748Cc8840FEc23daFdD01E6457379B446D; value: true |
| dc.fuses | yes | PASS | fuses returned a value matching the expected ABI. | address: 0x547942748Cc8840FEc23daFdD01E6457379B446D; value: 0 |
| dc.wrapperExpiry | yes | PASS | wrapperExpiry returned a value matching the expected ABI. | address: 0x547942748Cc8840FEc23daFdD01E6457379B446D; value: 18446744073709551615 |
| dc.duration | yes | PASS | duration returned a value matching the expected ABI. | address: 0x547942748Cc8840FEc23daFdD01E6457379B446D; value: 2592000 |
| relationships.dc.registrarController | yes | PASS | DC relationship matches the configured deployment address. | actual: 0x76c6fe3aee636f88d01de64931514e8cd64d94fb; expected: 0x76c6fe3aee636f88d01de64931514e8cd64d94fb |
| relationships.dc.nameWrapper | yes | PASS | DC relationship matches the configured deployment address. | actual: 0x4cd2563118e57b19179d8dc033f2b0c5b5d69ff5; expected: 0x4cd2563118e57b19179d8dc033f2b0c5b5d69ff5 |
| relationships.dc.baseRegistrar | yes | PASS | DC relationship matches the configured deployment address. | actual: 0x4d64b78eaf6129fac30ab51e6d2d679993ea9ddd; expected: 0x4d64b78eaf6129fac30ab51e6d2d679993ea9ddd |
| relationships.dc.resolver | yes | PASS | DC relationship matches the configured deployment address. | actual: 0x46e37034ffc87a969d1a581748acf6a94bc7415d; expected: 0x46e37034ffc87a969d1a581748acf6a94bc7415d |
| abi.baseRegistrar.selectors | yes | PASS | Expected BaseRegistrar selectors were encoded for read-only probes. | selectors: {"owner()":"0x8da5cb5b","baseNode()":"0xddf7fcb0","GRACE_PERIOD()":"0xc1a287e2","controllers(address)":"0xda8c229e","nameExpires(uint256)":"0xd6e4fa86","ownerOf(uint256)":"0x6352211e","getApproved(uint256)":"0x081812fc","isApprovedForAll(address,address)":"0xe985e9c5"} |
| baseRegistrar.owner | yes | PASS | owner returned a value matching the expected ABI. | address: 0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD; value: 0x5ce1da1f0bd679669eeca577fe22f24e3cc2d35f |
| baseRegistrar.baseNode | yes | PASS | baseNode returned a value matching the expected ABI. | address: 0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD; value: 0xad4be81514036b9f6ff6c5f69394daacc516c82bd6dc4756d7f6ef1b3f9ea717 |
| baseRegistrar.gracePeriod | yes | PASS | GRACE_PERIOD returned a value matching the expected ABI. | address: 0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD; value: 604800 |
| baseRegistrar.controller.registrarController | yes | PASS | controllers returned a value matching the expected ABI. | address: 0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD; value: false |
| baseRegistrar.nameExpires | yes | PASS | nameExpires returned a value matching the expected ABI. | address: 0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD; value: 0 |
| baseRegistrar.approvals | yes | PASS | isApprovedForAll returned a value matching the expected ABI. | address: 0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD; value: false |
| abi.nameWrapper.selectors | yes | PASS | Expected TLDNameWrapper selectors were encoded for read-only probes. | selectors: {"owner()":"0x8da5cb5b","TLD_NODE()":"0x96df3540","ownerOf(uint256)":"0x6352211e","getData(uint256)":"0x0178fe3f","getApproved(uint256)":"0x081812fc","isApprovedForAll(address,address)":"0xe985e9c5","controllers(address)":"0xda8c229e","canModifyName(bytes32,address)":"0x41415eab","allFusesBurned(bytes32,uint32)":"0xadf4960a"} |
| nameWrapper.tldNode | yes | PASS | TLD_NODE returned a value matching the expected ABI. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; value: 0xad4be81514036b9f6ff6c5f69394daacc516c82bd6dc4756d7f6ef1b3f9ea717 |
| nameWrapper.owner | yes | PASS | owner returned a value matching the expected ABI. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; value: 0x5ce1da1f0bd679669eeca577fe22f24e3cc2d35f |
| nameWrapper.getData | yes | PASS | getData returned a value matching the expected ABI. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; value: ["0x0000000000000000000000000000000000000000","0","0"] |
| nameWrapper.controller.activeRegistrarController | yes | PASS | controllers returned a value matching the expected ABI. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; value: true |
| nameWrapper.canModifyName | yes | PASS | canModifyName returned a value matching the expected ABI. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; value: false |
| nameWrapper.allFusesBurned | yes | PASS | allFusesBurned returned a value matching the expected ABI. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; value: true |
| nameWrapper.approvals | yes | PASS | isApprovedForAll returned a value matching the expected ABI. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; value: false |
| abi.publicResolver.selectors | yes | PASS | Expected PublicResolver selectors were encoded for read-only probes. | selectors: {"supportsInterface(bytes4)":"0x01ffc9a7","ttl(bytes32)":"0x16a25cbd","dnsRecord(bytes32,bytes32,uint16)":"0xa8fa5682","hasDNSRecords(bytes32,bytes32)":"0x4cbf6ba4","setDNSRecords(bytes32,bytes)":"0x0af179d7","setTTL(bytes32,uint64)":"0x14ab9038"} |
| publicResolver.runtimeImmutables | yes | FAIL | PublicResolver runtime immutables do not match the configured RegistrarController/NameWrapper deployment. | trustedController: 0xaca2d31194689fd37962fe17d5a4e63213850ff1; trustedReverseRegistrar: 0x51e86d4cc8723fca7014fd97c0ad0c737c86a2af; registryAddress: 0x6e20e0488a0556f3bc5940d456168902b43efba7; nameWrapperAddress: 0x4cd2563118e57b19179d8dc033f2b0c5b5d69ff5; expectedTrustedController: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; expectedNameWrapper: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5 |
| publicResolver.eip165 | yes | PASS | supportsInterface returned a value matching the expected ABI. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; value: true |
| publicResolver.dnsInterface | yes | PASS | supportsInterface returned a value matching the expected ABI. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; value: true |
| publicResolver.ttl | yes | PASS | ttl returned a value matching the expected ABI. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; value: 0 |
| publicResolver.dnsRecord | yes | PASS | dnsRecord returned a value matching the expected ABI. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; value: 0x |
| publicResolver.hasDNSRecords | yes | PASS | hasDNSRecords returned a value matching the expected ABI. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; value: false |
| publicResolver.dnsSerialization | yes | PASS | RFC 1035 wire-format fixtures were generated for every DNS type in the MVP. | types: [{"label":"A","type":1,"bytes":40},{"label":"CNAME","type":5,"bytes":52},{"label":"NS","type":2,"bytes":49},{"label":"TXT","type":16,"bytes":47},{"label":"SOA","type":6,"bytes":89},{"label":"SRV","type":33,"bytes":72},{"label":"DNAME","type":39,"bytes":52}] |
| publicResolver.authorizationModel | yes | FAIL | PublicResolver authorization model is not verified; owner() is intentionally not required. | status: PENDING; model: null; registryAddress: null; nameWrapperAddress: null; trustedController: null; trustedReverseRegistrar: null; sourceArtifact: null; verifiedBy: null; verifiedAt: null; reference: docs/phase-0-public-resolver-authorization.md |
| publicResolver.setDNSRecords.A | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setDNSRecords.CNAME | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setDNSRecords.NS | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setDNSRecords.TXT | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setDNSRecords.SOA | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setDNSRecords.SRV | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setDNSRecords.DNAME | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setTTL.simulation | no | WARN | setTTL accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setTTL; simulated: true |
| abi.ews.selectors | yes | PASS | EWS selectors match the public embedded-website service candidate ABI. | selectors: {"dc()":"0xd8a531a6","revenueAccount()":"0xf5dc7d56","landingPageFee()":"0x201d2b8b","perAdditionalPageFee()":"0x39228a30","perSubdomainFee()":"0xe8d83cec","MAINTAINER_ROLE()":"0xf8742254","DEFAULT_ADMIN_ROLE()":"0xa217fddf","hasRole(bytes32,address)":"0x91d14854","getLandingPage(bytes32,bytes32)":"0xe4ed3f34","getSubdomains(bytes32)":"0x45975eaf","update(string,string,uint8,string,string[],bool)":"0x5120a321","remove(string,string)":"0x44590a7e","restore(string,string,uint8)":"0x394495eb"} |
| ews.dc | yes | PASS | dc returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value: 0x547942748cc8840fec23dafdd01e6457379b446d |
| ews.revenueAccount | yes | PASS | revenueAccount returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value: 0x306b6fef4f9890a040fbe1ff708a7b64e4cd04bd |
| ews.landingPageFee | yes | PASS | landingPageFee returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value: 1000000000000000000 |
| ews.perAdditionalPageFee | yes | PASS | perAdditionalPageFee returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value: 100000000000000000 |
| ews.perSubdomainFee | yes | PASS | perSubdomainFee returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value: 1000000000000000000 |
| ews.maintainerRole | yes | PASS | MAINTAINER_ROLE returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value: 0x339759585899103d2ace64958e37e18ccb0504652c81d4a1b8aa80fe2126ab95 |
| ews.defaultAdminRole | yes | PASS | DEFAULT_ADMIN_ROLE returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value: 0x0000000000000000000000000000000000000000000000000000000000000000 |
| ews.role | yes | FAIL | EWS has no approved source-backed MVP classification. It cannot be classified automatically from bytecode alone. | classification: {"status":"PENDING","decision":null,"rationale":null,"reference":"docs/phase-0-ews-classification.md"}; successfulCandidateProbes: ["ews.dc","ews.revenueAccount","ews.landingPageFee","ews.perAdditionalPageFee","ews.perSubdomainFee","ews.maintainerRole","ews.defaultAdminRole"] |
| dns.parentAuthority | yes | PASS | The public .country parent nameservers were resolved. | parentNameservers: ["ns01.trs-dns.com","ns01.trs-dns.net","ns10.trs-dns.info","ns10.trs-dns.org"] |
| dns.parentControl | yes | FAIL | Control of the .country parent delegation mechanism is not verified in the versioned manifest. | status: PENDING; controller: null; delegationMechanism: null; verifiedBy: null; verifiedAt: null; reference: docs/phase-0-dns-operation.md |
| dns.projectDelegation | yes | FAIL | Versioned DNS evidence must name project nameservers, a delegated probe domain, and a verified delegation record. | projectNameservers: []; delegationProbeDomain: null; delegationEvidence: {"status":"PENDING","verifiedBy":null,"verifiedAt":null,"reference":"docs/phase-0-dns-operation.md"} |
| dns.powerDnsRollback | yes | FAIL | PowerDNS rollback evidence must include a verified test, responsible operator, immutable reference, and SHA-256 digest. | status: PENDING; verifiedAt: null; verifiedBy: null; evidenceReference: docs/phase-0-dns-operation.md; evidenceSha256: null |
| security.commitSecret | yes | PASS | Commitment journal is browser-local and is not referenced by Vercel Functions. | storage: localStorage; serverTransmission: false |
| security.csp | yes | PASS | Vercel configuration defines a restrictive CSP and permits only Harmony and Reown connectivity required by the app. | source: vercel.json |
| security.analytics | yes | PASS | Reown AppKit analytics are disabled and no analytics provider is configured in the application source. | analytics: false |
| security.privateEnvironment | yes | PASS | The frontend receives only VITE_-prefixed build variables; server-only Phase 0 evidence is read through backend environment variables. | frontendPrefix: VITE_; serverOnlyPrefix: PHASE_ZERO_ |

## Legacy configuration divergence

`contracts/.env.example` contains legacy RegistrarController, NameWrapper, BaseRegistrar and Resolver addresses. This validation uses only the six deployed addresses configured in `app/api/_lib/config.js`; the legacy file is not an authority for the active application.

## DNS public-operation boundary

The validator resolves public `.country` parent nameservers, but project nameservers, parent-control evidence, the delegated probe domain, and rollback evidence must be approved in `api/_lib/phase-zero/evidence-manifest.js`. A DNS record stored on-chain or inside a PowerDNS zone does not alter parent delegation. PowerDNS rollback evidence must prove that a failed publication leaves the last valid zone served.

## Security boundary

The commitment secret is browser-local only. This validator uses RPC reads and `eth_call` simulations; it sends no transaction and has no wallet/private-key access. Reown analytics remain disabled, CSP is defined in `vercel.json`, and approval evidence is versioned server-side rather than exposed through `VITE_` variables.

## How to rerun

```bash
cd app
npm run phase0:validate
```

The report is only evidence for the current configured endpoints. A changed RPC, bytecode hash, missing DNS evidence, unavailable RPC, failed ABI probe, or expired gate evidence must result in **BLOCKED**.
