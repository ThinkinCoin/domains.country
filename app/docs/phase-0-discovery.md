# Phase 0 Technical Discovery

## Decision

**BLOCKED** — generated 2026-08-31T22:05:35.691Z; evidence expires 2026-08-31T22:20:35.691Z.

Writes remain disabled. The blockers below must be resolved and the validation rerun before any transaction flow is enabled.

## Network and deployed addresses

- Network: Harmony Mainnet (chain ID 1666600000)
- Block queried: 93208796
- RPC: configured server-side as `HARMONY_RPC_URL`

| Component | Address | Runtime bytecode hash |
| --- | --- | --- |
| registrarController | 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb | 0x5710e0139c49ee09983f1ba2ccd90afdde88b1177501b1bb53517344be3c97b1 |
| dc | 0x547942748Cc8840FEc23daFdD01E6457379B446D | 0x1487a13fe7b543a393588b944de73b36a3f3e504d6f93292360fefabf740771b |
| ews | 0xf90dab949d3853c418bE361930028644B4EBcDE4 | 0xfcfd980bcd097a217a9aef5bd6996597df8102d3de72d5e81d4d16b221e32211 |
| baseRegistrar | 0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD | 0x1f003201f580de20b6888b85c39369ef15ad107e6f8dfe7bd13d12a51078441c |
| nameWrapper | 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5 | 0x2abe6afb12233a6fa8b27bcd0f85466b17589362a4449d6af8037b45c0283c4a |
| publicResolver | 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D | 0x4cb1367da73ecc2a124354fd12106bfcccf599777f257622696cd7aeda4156f5 |

## Required blockers

- **bytecode.registrarController.baseline** (FAIL): No approved server-side bytecode hash baseline is configured.
- **bytecode.dc.baseline** (FAIL): No approved server-side bytecode hash baseline is configured.
- **bytecode.ews.baseline** (FAIL): No approved server-side bytecode hash baseline is configured.
- **bytecode.baseRegistrar.baseline** (FAIL): No approved server-side bytecode hash baseline is configured.
- **bytecode.nameWrapper.baseline** (FAIL): No approved server-side bytecode hash baseline is configured.
- **bytecode.publicResolver.baseline** (FAIL): No approved server-side bytecode hash baseline is configured.
- **registrarController.base** (FAIL): base returned a value that violates the expected invariant.
- **registrarController.commitmentWindow** (FAIL): Commitment age values are invalid for a safe commit/register flow.
- **publicResolver.owner** (FAIL): owner returned a value that violates the expected invariant.
- **ews.role** (FAIL): EWS has no verified ABI, source identity, or declared MVP role. It cannot be classified automatically from bytecode alone.
- **dns.projectDelegation** (FAIL): Project nameservers and a delegated probe domain must be configured for automatic delegation validation.
- **dns.powerDnsRollback** (FAIL): No backend PowerDNS rollback evidence reference is configured.

## ABI and selector probes

| Check | Status | Evidence |
| --- | --- | --- |
| abi.registrarController.selectors | PASS | selectors: {"base()":"0x5001f3b5","available(string)":"0xaeb8ce9b","rentPrice(string,uint256)":"0x83e7f6ff","minCommitmentAge()":"0x8d839ffe","maxCommitmentAge()":"0xce1e09c0","makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)":"0xd555254a","commit(bytes32)":"0xf14fcbc8","register(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)":"0x7acaaf26","renew(string,uint256)":"0xacf1a841"} |
| abi.dc.selectors | PASS | selectors: {"owner()":"0x8da5cb5b","paused()":"0x5c975abb","registrarController()":"0xf9cd32c5","nameWrapper()":"0xa8e5fbc0","baseRegistrar()":"0x74f04565","resolver()":"0x04f3bcec","reverseRecord()":"0x1e1911cc","fuses()":"0x3813bb7e","wrapperExpiry()":"0x407fc609","duration()":"0x0fb5a6b4"} |
| abi.baseRegistrar.selectors | PASS | selectors: {"owner()":"0x8da5cb5b","baseNode()":"0xddf7fcb0","GRACE_PERIOD()":"0xc1a287e2","controllers(address)":"0xda8c229e","nameExpires(uint256)":"0xd6e4fa86","ownerOf(uint256)":"0x6352211e","getApproved(uint256)":"0x081812fc","isApprovedForAll(address,address)":"0xe985e9c5"} |
| abi.nameWrapper.selectors | PASS | selectors: {"owner()":"0x8da5cb5b","TLD_NODE()":"0x96df3540","ownerOf(uint256)":"0x6352211e","getData(uint256)":"0x0178fe3f","getApproved(uint256)":"0x081812fc","isApprovedForAll(address,address)":"0xe985e9c5","canModifyName(bytes32,address)":"0x41415eab","allFusesBurned(bytes32,uint32)":"0xadf4960a"} |
| abi.publicResolver.selectors | PASS | selectors: {"owner()":"0x8da5cb5b","supportsInterface(bytes4)":"0x01ffc9a7","ttl(bytes32)":"0x16a25cbd","dnsRecord(bytes32,bytes32,uint16)":"0xa8fa5682","hasDNSRecords(bytes32,bytes32)":"0x4cbf6ba4","setDNSRecords(bytes32,bytes)":"0x0af179d7","setTTL(bytes32,uint64)":"0x14ab9038"} |
| abi.ews.candidateSelectors | PASS | selectors: {"owner()":"0x8da5cb5b","name()":"0x06fdde03","symbol()":"0x95d89b41","paused()":"0x5c975abb","resolver()":"0x04f3bcec","nameWrapper()":"0xa8e5fbc0","registrarController()":"0xf9cd32c5"} |

## Full validation results

| Check | Required | Status | Result | Evidence |
| --- | --- | --- | --- | --- |
| network.selectorDiscovery | yes | PASS | Function selectors were derived locally with Ethereum-compatible Keccak-256. | selectorCount: 49 |
| network.chainId | yes | PASS | RPC returned the configured Harmony Mainnet chain ID. | chainId: 1666600000; expectedChainId: 1666600000 |
| network.block | yes | PASS | RPC returned a latest block number. | blockNumber: 93208796 |
| bytecode.registrarController.present | yes | PASS | Runtime bytecode is present. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; byteLength: 8324; observedHash: 0x5710e0139c49ee09983f1ba2ccd90afdde88b1177501b1bb53517344be3c97b1 |
| bytecode.registrarController.baseline | yes | FAIL | No approved server-side bytecode hash baseline is configured. | observedHash: 0x5710e0139c49ee09983f1ba2ccd90afdde88b1177501b1bb53517344be3c97b1; expectedHash: null |
| bytecode.dc.present | yes | PASS | Runtime bytecode is present. | address: 0x547942748Cc8840FEc23daFdD01E6457379B446D; byteLength: 6348; observedHash: 0x1487a13fe7b543a393588b944de73b36a3f3e504d6f93292360fefabf740771b |
| bytecode.dc.baseline | yes | FAIL | No approved server-side bytecode hash baseline is configured. | observedHash: 0x1487a13fe7b543a393588b944de73b36a3f3e504d6f93292360fefabf740771b; expectedHash: null |
| bytecode.ews.present | yes | PASS | Runtime bytecode is present. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; byteLength: 13225; observedHash: 0xfcfd980bcd097a217a9aef5bd6996597df8102d3de72d5e81d4d16b221e32211 |
| bytecode.ews.baseline | yes | FAIL | No approved server-side bytecode hash baseline is configured. | observedHash: 0xfcfd980bcd097a217a9aef5bd6996597df8102d3de72d5e81d4d16b221e32211; expectedHash: null |
| bytecode.baseRegistrar.present | yes | PASS | Runtime bytecode is present. | address: 0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD; byteLength: 10536; observedHash: 0x1f003201f580de20b6888b85c39369ef15ad107e6f8dfe7bd13d12a51078441c |
| bytecode.baseRegistrar.baseline | yes | FAIL | No approved server-side bytecode hash baseline is configured. | observedHash: 0x1f003201f580de20b6888b85c39369ef15ad107e6f8dfe7bd13d12a51078441c; expectedHash: null |
| bytecode.nameWrapper.present | yes | PASS | Runtime bytecode is present. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; byteLength: 21810; observedHash: 0x2abe6afb12233a6fa8b27bcd0f85466b17589362a4449d6af8037b45c0283c4a |
| bytecode.nameWrapper.baseline | yes | FAIL | No approved server-side bytecode hash baseline is configured. | observedHash: 0x2abe6afb12233a6fa8b27bcd0f85466b17589362a4449d6af8037b45c0283c4a; expectedHash: null |
| bytecode.publicResolver.present | yes | PASS | Runtime bytecode is present. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; byteLength: 11287; observedHash: 0x4cb1367da73ecc2a124354fd12106bfcccf599777f257622696cd7aeda4156f5 |
| bytecode.publicResolver.baseline | yes | FAIL | No approved server-side bytecode hash baseline is configured. | observedHash: 0x4cb1367da73ecc2a124354fd12106bfcccf599777f257622696cd7aeda4156f5; expectedHash: null |
| abi.registrarController.selectors | yes | PASS | Expected RegistrarController selectors were encoded for read-only probes. | selectors: {"base()":"0x5001f3b5","available(string)":"0xaeb8ce9b","rentPrice(string,uint256)":"0x83e7f6ff","minCommitmentAge()":"0x8d839ffe","maxCommitmentAge()":"0xce1e09c0","makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)":"0xd555254a","commit(bytes32)":"0xf14fcbc8","register(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)":"0x7acaaf26","renew(string,uint256)":"0xacf1a841"} |
| registrarController.base | yes | FAIL | base returned a value that violates the expected invariant. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; value: 0x |
| registrarController.available | yes | PASS | available returned a value matching the expected ABI. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; value: true |
| registrarController.rentPrice | yes | PASS | rentPrice returned a value matching the expected ABI. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; value: {"base":"12172896000000000000","premium":"0"} |
| registrarController.minCommitmentAge | yes | PASS | minCommitmentAge returned a value matching the expected ABI. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; value: 0 |
| registrarController.maxCommitmentAge | yes | PASS | maxCommitmentAge returned a value matching the expected ABI. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; value: 120 |
| registrarController.makeCommitment | yes | PASS | makeCommitment returned a value matching the expected ABI. | address: 0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb; value: 0xcd6dbfa9c388910f9ae4af0ca4cce31d3b1ef26a7585e97fff6acc42459d397d |
| registrarController.commitmentWindow | yes | FAIL | Commitment age values are invalid for a safe commit/register flow. | minimumSeconds: 0; maximumSeconds: 120 |
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
| abi.nameWrapper.selectors | yes | PASS | Expected TLDNameWrapper selectors were encoded for read-only probes. | selectors: {"owner()":"0x8da5cb5b","TLD_NODE()":"0x96df3540","ownerOf(uint256)":"0x6352211e","getData(uint256)":"0x0178fe3f","getApproved(uint256)":"0x081812fc","isApprovedForAll(address,address)":"0xe985e9c5","canModifyName(bytes32,address)":"0x41415eab","allFusesBurned(bytes32,uint32)":"0xadf4960a"} |
| nameWrapper.tldNode | yes | PASS | TLD_NODE returned a value matching the expected ABI. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; value: 0xad4be81514036b9f6ff6c5f69394daacc516c82bd6dc4756d7f6ef1b3f9ea717 |
| nameWrapper.owner | yes | PASS | owner returned a value matching the expected ABI. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; value: 0x5ce1da1f0bd679669eeca577fe22f24e3cc2d35f |
| nameWrapper.getData | yes | PASS | getData returned a value matching the expected ABI. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; value: ["0x0000000000000000000000000000000000000000","0","0"] |
| nameWrapper.canModifyName | yes | PASS | canModifyName returned a value matching the expected ABI. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; value: false |
| nameWrapper.allFusesBurned | yes | PASS | allFusesBurned returned a value matching the expected ABI. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; value: true |
| nameWrapper.approvals | yes | PASS | isApprovedForAll returned a value matching the expected ABI. | address: 0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5; value: false |
| abi.publicResolver.selectors | yes | PASS | Expected PublicResolver selectors were encoded for read-only probes. | selectors: {"owner()":"0x8da5cb5b","supportsInterface(bytes4)":"0x01ffc9a7","ttl(bytes32)":"0x16a25cbd","dnsRecord(bytes32,bytes32,uint16)":"0xa8fa5682","hasDNSRecords(bytes32,bytes32)":"0x4cbf6ba4","setDNSRecords(bytes32,bytes)":"0x0af179d7","setTTL(bytes32,uint64)":"0x14ab9038"} |
| publicResolver.owner | yes | FAIL | owner returned a value that violates the expected invariant. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; value: 0x |
| publicResolver.ttl | yes | PASS | ttl returned a value matching the expected ABI. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; value: 0 |
| publicResolver.dnsRecord | yes | PASS | dnsRecord returned a value matching the expected ABI. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; value: 0x |
| publicResolver.hasDNSRecords | yes | PASS | hasDNSRecords returned a value matching the expected ABI. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; value: false |
| publicResolver.dnsSerialization | yes | PASS | RFC 1035 wire-format fixtures were generated for every DNS type in the MVP. | types: [{"label":"A","type":1,"bytes":40},{"label":"CNAME","type":5,"bytes":52},{"label":"NS","type":2,"bytes":49},{"label":"TXT","type":16,"bytes":47},{"label":"SOA","type":6,"bytes":89},{"label":"SRV","type":33,"bytes":72},{"label":"DNAME","type":39,"bytes":52}] |
| publicResolver.setDNSRecords.A | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setDNSRecords.CNAME | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setDNSRecords.NS | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setDNSRecords.TXT | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setDNSRecords.SOA | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setDNSRecords.SRV | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setDNSRecords.DNAME | no | WARN | setDNSRecords accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setDNSRecords; simulated: true |
| publicResolver.setTTL.simulation | no | WARN | setTTL accepted an unauthorised eth_call; no state was persisted. | address: 0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D; functionName: setTTL; simulated: true |
| abi.ews.candidateSelectors | yes | PASS | Known EWS candidate selectors were encoded for identification probes. | selectors: {"owner()":"0x8da5cb5b","name()":"0x06fdde03","symbol()":"0x95d89b41","paused()":"0x5c975abb","resolver()":"0x04f3bcec","nameWrapper()":"0xa8e5fbc0","registrarController()":"0xf9cd32c5"} |
| ews.candidate.owner | no | PASS | owner returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value: 0x |
| ews.candidate.name | no | PASS | name returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value:  |
| ews.candidate.symbol | no | PASS | symbol returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value:  |
| ews.candidate.paused | no | PASS | paused returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value: false |
| ews.candidate.resolver | no | PASS | resolver returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value: 0x |
| ews.candidate.nameWrapper | no | PASS | nameWrapper returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value: 0x |
| ews.candidate.registrarController | no | PASS | registrarController returned a value matching the expected ABI. | address: 0xf90dab949d3853c418bE361930028644B4EBcDE4; value: 0x |
| ews.role | yes | FAIL | EWS has no verified ABI, source identity, or declared MVP role. It cannot be classified automatically from bytecode alone. | configuredRole: null; successfulCandidateProbes: ["ews.candidate.owner","ews.candidate.name","ews.candidate.symbol","ews.candidate.paused","ews.candidate.resolver","ews.candidate.nameWrapper","ews.candidate.registrarController"] |
| dns.parentAuthority | yes | PASS | The public .country parent nameservers were resolved. | parentNameservers: ["ns01.trs-dns.com","ns01.trs-dns.net","ns10.trs-dns.info","ns10.trs-dns.org"] |
| dns.projectDelegation | yes | FAIL | Project nameservers and a delegated probe domain must be configured for automatic delegation validation. | projectNameservers: []; delegationProbeDomain: null |
| dns.powerDnsRollback | yes | FAIL | No backend PowerDNS rollback evidence reference is configured. | evidence: null |
| security.commitSecret | yes | PASS | Commitment journal is browser-local and is not referenced by Vercel Functions. | storage: localStorage; serverTransmission: false |
| security.csp | yes | PASS | Vercel configuration defines a restrictive CSP and permits only Harmony and Reown connectivity required by the app. | source: vercel.json |
| security.analytics | yes | PASS | Reown AppKit analytics are disabled and no analytics provider is configured in the application source. | analytics: false |
| security.privateEnvironment | yes | PASS | The frontend receives only VITE_-prefixed build variables; server-only Phase 0 evidence is read through backend environment variables. | frontendPrefix: VITE_; serverOnlyPrefix: PHASE_ZERO_ |

## Legacy configuration divergence

`contracts/.env.example` contains legacy RegistrarController, NameWrapper, BaseRegistrar and Resolver addresses. This validation uses only the six deployed addresses configured in `app/api/_lib/config.js`; the legacy file is not an authority for the active application.

## DNS public-operation boundary

The validator resolves public `.country` parent nameservers, but it cannot establish project delegation without server-side `PHASE_ZERO_PROJECT_NAMESERVERS` and `PHASE_ZERO_DELEGATION_PROBE_DOMAIN`. A DNS record stored on-chain or inside a PowerDNS zone does not alter parent delegation. `PHASE_ZERO_POWERDNS_ROLLBACK_EVIDENCE` must identify the approved procedure that preserves the last valid zone when publication fails.

## Security boundary

The commitment secret is browser-local only. This validator uses RPC reads and `eth_call` simulations; it sends no transaction and has no wallet/private-key access. Reown analytics remain disabled, CSP is defined in `vercel.json`, and Phase 0 evidence variables are server-only.

## How to rerun

```bash
cd app
npm run phase0:validate
```

The report is only evidence for the current configured endpoints. A changed RPC, bytecode hash, missing DNS evidence, unavailable RPC, failed ABI probe, or expired gate evidence must result in **BLOCKED**.
