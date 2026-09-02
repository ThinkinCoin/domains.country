# PublicResolver Authorization Discovery

Status: `DISCOVERY_ONLY`  
Collected: 2026-09-01

## Candidate implementation

The public `ThinkinCoin/ens-deployer` repository pins `@ensdomains/ens-contracts` to `0.0.15`. The package's `PublicResolver.sol` has a constructor accepting an ENS Registry, Name Wrapper, trusted ETH controller, and trusted reverse registrar.

The npm registry record for version 0.0.15 identifies the published tarball
with SHA-1 f305e863d360cfdf6ccfba44981635ac211c114a and integrity
sha512-fOmGylPbsHWjhD3iXz1pyi5VuyW25ahbjjUIjaKwC5MBULJYJDFb2sHlK8P4bxVep2pTGfV3XUhdFVMiEE4LLQ==.
It includes an npm signature. This is reproducible package-artifact evidence,
but does not replace a Git revision or reviewed compiled artifact for the
production manifest.

Its authorization path is:

1. The trusted controller or trusted reverse registrar may update records.
2. Otherwise, the resolver reads `ens.owner(node)`.
3. If that owner is the Name Wrapper, it reads `nameWrapper.ownerOf(uint256(node))`.
4. The resulting owner, or an operator approved through `setApprovalForAll`, may update records.

`DNSResolver.setDNSRecords` inherits the `authorised(node)` modifier from
`ResolverBase`. The resolver is not required to expose an `owner()` function.
TTL is not a PublicResolver method in this implementation: `setTTL(bytes32,uint64)`
belongs to the ENS Registry/Name Wrapper path and is validated through
`TLDNameWrapper.setTTL`.

The BaseRegistrar controller relationship is wrapper-mediated. A fresh
read-only probe showed `BaseRegistrar.controllers(RegistrarController) == false`
and `BaseRegistrar.controllers(TLDNameWrapper) == true`. The direct controller
probe is kept as informational evidence, while the Phase 0 gate requires the
Name Wrapper controller relationship to be true.

## On-chain consistency observed

The deployed resolver `0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D` supports EIP-165 and the DNS record interface; `dnsRecord` and `hasDNSRecords` decode as expected. Its runtime hash is `0x4cb1367da73ecc2a124354fd12106bfcccf599777f257622696cd7aeda4156f5`.
The runtime does not contain the `ttl(bytes32)` or `setTTL(bytes32,uint64)`
selectors, so Phase 0 must not claim resolver-level TTL support.

Runtime-bytecode inspection found the deployed Name Wrapper address embedded in the resolver, but the trusted controller embedded in the resolver is `0xaca2d31194689fd37962fe17d5a4e63213850ff1`, not the configured active RegistrarController `0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb`. This means initial DNS data supplied during registration through the active controller cannot be considered authorised by the resolver unless a reviewed compatibility path proves otherwise. Post-registration DNS changes by the effective owner may still be viable, subject to the registry/wrapper authorization model.

Read-only permission probes show that both the trusted controller and the active controller are currently enabled in the Name Wrapper. Neither is a direct BaseRegistrar controller; the Name Wrapper mediates registration. The trusted controller is therefore still operational, not merely an unused address, and the product must not silently treat the two controllers as interchangeable.

## Approval requirements

This model must still be proved against the deployed resolver with reproducible artifact/deployment provenance. The reviewer must record the actual ENS Registry, Name Wrapper, trusted controller, and reverse registrar constructor values, then approve the resulting model in the versioned manifest.

If the active controller remains different from the resolver's trusted controller,
the manifest must require `initialRegistrationDnsDataPolicy:
"EMPTY_DATA_ONLY"` and `postTransferDnsAuthorizationPolicy:
"REQUERY_ON_CHAIN_OWNER_AND_PERMISSIONS"`. The registration flow must not pass
resolver `data[]`, and every DNS write after a transfer must re-read on-chain
ownership and authorization. The old owner must never be trusted from indexed
or cached state. Until those conditions are approved and the runtime values
match the approved model, DNS writes remain blocked.

## Re-executable authorization observation

Run the read-only collector to capture the deployed runtime immutables, the
NameWrapper controller flags, DNS interface probes, and an informational
`owner()` selector probe:

```bash
npm run phase0:collect-public-resolver-authorization -- \
  --output docs/phase-0-public-resolver-authorization-observation.json
```

The collector deliberately reports `ownerFunctionRequired: false`. It uses
the app's fixed-timeout JSON-RPC client, so an unavailable public RPC fails
promptly instead of retrying indefinitely. A responder or revert for the
`owner()` selector is not an authorization decision; the authorization model
comes from the resolver's trusted controller, ENS Registry, Name Wrapper and
effective wrapped-name ownership/permissions. The generated JSON is
discovery-only and excluded from the stable evidence index because its
observation time and RPC responses change.

The collector pins its direct reads and eth_call queries to a single Harmony
block and records both its number and hash. An earlier observation, at
`2026-09-02T07:27:10.958Z`, wrote
`docs/phase-0-public-resolver-authorization-observation.json` at Harmony block
`93268317` (`0x76ff2f01388410f4b77a4ed47843fdf7e549759af06d0dce0cfc9252a07c3490`)
with evidence SHA-256 `84173e49d5a2b5e1bdc082375e689fcbb5d90f29aac6ac688a8381c818e8e1c2`.
It confirmed runtime hash
`0x4cb1367da73ecc2a124354fd12106bfcccf599777f257622696cd7aeda4156f5`,
trusted controller `0xACa2D31194689fd37962fe17D5A4E63213850fF1`, trusted
reverse registrar `0x51e86d4cc8723fca7014fd97c0ad0c737c86a2af`, registry
`0x6e20e0488a0556f3bc5940d456168902b43efba7`, and NameWrapper
`0x4cd2563118e57b19179d8dc033f2b0c5b5d69ff5`. Both the trusted controller
and active RegistrarController are enabled in the NameWrapper, but the trusted
controller still differs from the active RegistrarController. The `owner()`
selector returned empty data and remains intentionally non-authoritative.

## Mutation-simulation finding: source-consistent authorization

The refreshed collector observation at 2026-09-02T09:36:21.940Z, pinned to
Harmony block 93272170
(0xea314725ff63b7d28bd01171f50cac48e0bf028f30223801cd76d2cdec096fff),
uses sender-aware precondition simulation for setDNSRecords.

The Harmony endpoint returns 0x from eth_call even when a nonpayable resolver
mutation will revert, so raw eth_call is diagnostic only for these functions.
The collector uses eth_estimateGas as the authorization signal; it does not
send a transaction. A control against the DC onlyOwner setter
setDuration(uint256) accepted the DC owner and reverted the external
0x000000000000000000000000000000000000dEaD caller, proving the endpoint
honors the supplied sender for the precondition check.

With the same RFC 1035 A-record fixture, the resolver precondition passed for
its embedded trusted controller and reverted for both the active
RegistrarController and the external caller. This matches the deployed
immutable controller relationship and the ENS PublicResolver source model.

Consequently:

- No application path may enable PublicResolver DNS writes based on these
  simulations alone; artifact provenance and the versioned authorization
  approval are still required.
- The initial-registration policy remains EMPTY_DATA_ONLY, because the
  resolver's trusted controller differs from the active RegistrarController.
- Any future DNS write still requires a fresh on-chain owner/permission
  re-query after transfer.
- The deployed PublicResolver artifact and its effective authorization path
  must be approved in the manifest before the authorization model can be
  marked VERIFIED.
