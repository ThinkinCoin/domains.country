# EWS Technical Classification

Date: 2026-09-01  
Network: Harmony Mainnet, chain ID `1666600000`  
Address: `0xf90dab949d3853c418bE361930028644B4EBcDE4`

## Technical MVP classification

`OUT_OF_SCOPE` for the registration/DNS MVP.

This is a technical scope classification, not a gate approval. The Phase 0 gate
must continue to require a named reviewer, immutable reference, and evidence
SHA-256 in `api/_lib/phase-zero/evidence-manifest.js` before `ews.role` can
pass.

## Evidence gathered

Read-only explorer/RPC discovery shows:

- Runtime bytecode exists and matches between Harmony RPC and Blockscout.
- Harmony explorer reports `sourceVerified=false`.
- Harmony explorer does not expose `creation_tx_hash` or `creator_address_hash` for the address.
- `ThinkinCoin/ens-deployer` `main` (`5e56258aee80bbe604c3424c9f997db6c74fa5d7`) contains no EWS source.
- Upstream `harmony-one/ens-deployer` branches `dev` (`b57fb008167befd9b7aceab21deefc23272190be`) and `metadata-fix` (`c4a79db5752ca12b4cf439f0d4cc3f079e4f4143`) also contain no EWS source.
- Historical `ens-deployer` commit `47dabcd05317456f8c48ea17c28596466213a355` contains `contract/contracts/services/EAS.sol`, but that contract is an alias-forwarding service. Its ABI shape does not match the deployed EWS reads (`dc()`, `revenueAccount()`, fee getters, `MAINTAINER_ROLE()`, `hasRole`).
- Matching public source candidate: `polymorpher/dot-country-embedder` commit `443365d1e53bf270f2e403b65b41b96273e7bf30`, `contract/contracts/EWS.sol`.
- User-provided source reference: `polymorpher/dot-country-embedder` commit `2524d1d5f4b4df3ac5a2f7f44b677075ea4c6e54`, `contract/contracts/EWS.sol`, SHA-256 `07dba5a4a6ae7d0cdc59aec1fd513de93cde5ea3972b0457d0cb9f9c74535ed3`. This newer implementation confirms the product role but does not match the deployed runtime.
- The source identifies EWS as **Embedded Website Service**, supporting Notion/Substack landing pages, allowed pages, subdomains, maintainer access, product fees, and revenue withdrawal.
- The source ABI exposes `dc()` and uses domain ownership/expiry through DC before allowing updates.

The matching candidate additionally gives a coherent, but still incomplete,
deployment trail:

- Repository: `polymorpher/dot-country-embedder`, commit
  `443365d1e53bf270f2e403b65b41b96273e7bf30` (2023-06-26).
- `contract/hardhat.config.ts` specifies Solidity `0.8.17`, optimizer enabled,
  `200` runs, and a Harmony Mainnet deployment configuration.
- The matching source file SHA-256 is
  `6a9cf01227647db3c604402ab7cbfa1358923bd4907b8df53f51dc184f1b3729`; its
  lockfile resolves `@openzeppelin/contracts` to `4.8.1`.
- `contract/deploy/ews.ts` deploys `EWS(DC_CONTRACT, landingPageFee,
  perAdditionalPageFee, perSubdomainFee)`, then configures a revenue account
  and optional maintainer role holders.
- The deployed read-only values are consistent with that shape: `dc()` equals
  the configured DC, fees decode as unsigned integers, and the revenue account
  is `0x306b6fef4f9890a040fbe1ff708a7b64e4cd04bd`.
- A newer repository commit adds a README that references this deployed EWS
  address on Harmony Mainnet, but the newer source no longer matches the
  deployed runtime.

This establishes reproducible source provenance, but not an
address-to-deployment record or a complete deployment baseline. A local
`solc 0.8.17` / optimizer-200 build of
commit `443365d1e53bf270f2e403b65b41b96273e7bf30` produced 13,225 runtime
bytes, matching the deployed EWS runtime after stripping Solidity metadata. The
metadata-stripped runtime body hash is
`0x25c9bf492058ab0272f0d16a7ef5e255bb3cb87c6e089dda8663dac91978af81` for
both build and deployment; the compiled artifact SHA-256 is
`5095c9796083cdd92d4d9c774f9bae57acd605060d15312d677e33bb7963270c`. The
repository still does not provide the mainnet deployment transaction or a
signed/approved artifact record.

The explorer creation bytecode is 13,768 bytes and matches the compiled EWS
creation-code prefix after metadata stripping. The remaining 128 bytes are
consistent with the four static constructor values used by `deploy/ews.ts`.
This strengthens the EWS source association but does not substitute for a
verified deployment transaction or named approval.

Observed candidate selectors include:

| Selector | Candidate signature |
| --- | --- |
| `0x5120a321` | `update(string,string,uint8,string,string[],bool)` |
| `0x44590a7e` | `remove(string,string)` |
| `0x394495eb` | `restore(string,string,uint8)` |
| `0xe4ed3f34` | `getLandingPage(bytes32,bytes32)` |
| `0x45975eaf` | `getSubdomains(bytes32)` |
| `0xea9312c3` | `getFees(string,string,uint256)` |
| `0x163ed94c` | `setLandingPageFee(uint256)` |
| `0xe8d83cec` | `perSubdomainFee()` |
| `0xf8742254` | `MAINTAINER_ROLE()` |
| `0x91d14854` | `hasRole(bytes32,address)` |

## MVP impact decision

The MVP needs registration, renewal, transfer, ownership reads, resolver/TTL reads, and supported DNS record management through RegistrarController, BaseRegistrar, TLDNameWrapper, and PublicResolver. EWS implements landing-page, subdomain, fee, maintainer, and revenue-account behavior through DC. Those capabilities belong to a later hosting/site layer and are formally recommended as `OUT_OF_SCOPE` for the MVP domain registrar.

Therefore, the `domains.country` MVP must not call EWS for registration,
renewal, transfer, resolver changes, DNS record changes, or DNS publication.
If a future hosting/site layer uses EWS, it must define a separate permission,
fee, maintainer, migration, and recovery model before activation.

## Required before manifest approval

To approve `OUT_OF_SCOPE`, attach an owner declaration confirming that EWS is
not required for registration, renewal, transfer, or DNS publication. This MVP
scope decision is separate from bytecode provenance. Record the following in
the versioned manifest:

```js
classification: {
  status: "APPROVED",
  decision: "OUT_OF_SCOPE",
  rationale: "EWS is the embedded website/landing-page service; MVP writes use RegistrarController, TLDNameWrapper and PublicResolver only.",
  reviewedBy: "<named technical approver>",
  reviewedAt: "<ISO-8601 timestamp>",
  reference: "<immutable source, release, or decision record>",
}
```

This classification does not approve EWS bytecode. Its separate bytecode
baseline remains required because EWS is one of the six configured contracts.
To approve `IN_MVP`, provide ABI/source, permission model, failure modes, and
explicit UI/API requirements instead.

Until then, `ews.role` remains a required Phase 0 blocker.

## Branch review result

The re-check after moving `ens-deployer` to `main` did not identify EWS there.
The promising upstream branches available publicly are `dev` and
`metadata-fix`; neither contains EWS. The older `EAS.sol` service is not a
match for the deployed EWS contract. The matching EWS source was found instead
in `polymorpher/dot-country-embedder` commit
`443365d1e53bf270f2e403b65b41b96273e7bf30`.
