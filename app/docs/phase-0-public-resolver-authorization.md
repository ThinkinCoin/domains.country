# PublicResolver Authorization Discovery

Status: `DISCOVERY_ONLY`  
Collected: 2026-09-01

## Candidate implementation

The public `ThinkinCoin/ens-deployer` repository pins `@ensdomains/ens-contracts` to `0.0.15`. The package's `PublicResolver.sol` has a constructor accepting an ENS Registry, Name Wrapper, trusted ETH controller, and trusted reverse registrar.

Its authorization path is:

1. The trusted controller or trusted reverse registrar may update records.
2. Otherwise, the resolver reads `ens.owner(node)`.
3. If that owner is the Name Wrapper, it reads `nameWrapper.ownerOf(uint256(node))`.
4. The resulting owner, or an operator approved through `setApprovalForAll`, may update records.

`DNSResolver.setDNSRecords` and the resolver TTL mutators inherit an `authorised(node)` modifier from `ResolverBase`. The resolver is not required to expose an `owner()` function.

## On-chain consistency observed

The deployed resolver `0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D` supports EIP-165 and the DNS record interface; `ttl`, `dnsRecord`, and `hasDNSRecords` decode as expected. Its runtime hash is `0x4cb1367da73ecc2a124354fd12106bfcccf599777f257622696cd7aeda4156f5`.

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
