# EWS Technical Classification

Date: 2026-09-01  
Network: Harmony Mainnet, chain ID `1666600000`  
Address: `0xf90dab949d3853c418bE361930028644B4EBcDE4`

## Decision status

`PENDING_APPROVAL` — recommended MVP classification is `OUT_OF_SCOPE`, but the gate must not accept this recommendation until source/deploy provenance and explicit approval are recorded in `api/_lib/phase-zero/evidence-manifest.js`.

## Evidence gathered

Read-only explorer/RPC discovery shows:

- Runtime bytecode exists and matches between Harmony RPC and Blockscout.
- Harmony explorer reports `sourceVerified=false`.
- Harmony explorer does not expose `creation_tx_hash` or `creator_address_hash` for the address.
- Public source candidate: `harmony-one/dot-country-embedder`, `contract/contracts/EWS.sol`, SHA-256 `07dba5a4a6ae7d0cdc59aec1fd513de93cde5ea3972b0457d0cb9f9c74535ed3`.
- The source identifies EWS as **Embedded Website Service**, supporting Notion/Substack landing pages, allowed pages, subdomains, maintainer access, product fees, and revenue withdrawal.
- The source ABI exposes `dc()` and uses domain ownership/expiry through DC before allowing updates.

The candidate repository additionally gives a coherent, but still unverified,
deployment trail:

- Repository: `harmony-one/dot-country-embedder`, commit
  `0253d832326fea508c34a7a72013f49d5ae55d61` (2024-03-01).
- `readme.md` configures `EMBEDDER_CONTRACT` to this exact deployed address on
  Harmony Mainnet (`CHAIN_ID=1666600000`).
- `contract/hardhat.config.ts` specifies Solidity `0.8.20`, optimizer enabled,
  `200` runs, and a Harmony Mainnet deployment configuration.
- `contract/deploy/ews.ts` deploys `EWS(DC_CONTRACT, landingPageFee,
  perAdditionalPageFee, perSubdomainFee)`, then configures a revenue account
  and optional maintainer role holders.
- The deployed read-only values are consistent with that shape: `dc()` equals
  the configured DC, fees decode as unsigned integers, and the revenue account
  is `0x306b6fef4f9890a040fbe1ff708a7b64e4cd04bd`.

This establishes a source candidate and an address reference, not a
reproducible bytecode baseline. A local `solc 0.8.20` / optimizer-200 build of
this source produced 12,288 runtime bytes, while the deployed EWS runtime is
13,225 bytes. The candidate therefore does **not** match the active EWS
deployment. The repository also does not provide the mainnet deployment
transaction, constructor inputs, or a verified artifact that can be matched to
the deployed runtime.

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

## MVP impact

The MVP needs registration, renewal, transfer, ownership reads, resolver/TTL reads, and supported DNS record management through RegistrarController, BaseRegistrar, TLDNameWrapper, and PublicResolver. EWS implements landing-page, subdomain, fee, maintainer, and revenue-account behavior through DC. Those capabilities belong to a later hosting/site layer and are formally recommended as `OUT_OF_SCOPE` for the MVP domain registrar.

## Required before manifest approval

To approve `OUT_OF_SCOPE`, attach an owner declaration confirming that EWS is
not required for registration, renewal, transfer, or DNS publication. This MVP
scope decision is separate from bytecode provenance and must not assert that
the current public EWS source is exact. Record the following in the versioned
manifest:

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
