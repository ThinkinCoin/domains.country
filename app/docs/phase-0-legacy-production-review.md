# Legacy Production UI Review

Status: `DISCOVERY_ONLY`  
Collected: 2026-09-02  
Source: `.bkp/client`, read-only legacy UI snapshot for the current production registration interface at `https://1.country`.

## Scope reviewed

The legacy snapshot contains a React 17/Webpack client with blockchain access concentrated in `.bkp/client/src/api/index.js`. The client imports only `.bkp/client/abi/DC.json` for contract interaction and instantiates one Web3 contract at `config.contract`.

The production defaults in `.bkp/client/config.js` point to:

| Setting | Value |
| --- | --- |
| Contract | `0x476e14D956dca898C33262aecC81407242f8431A` |
| Resolver | `0xB3feaa6EA01780d03aE3D341BF5444b698810495` |
| RPC | `https://api.harmony.one` |
| TLD | `.country` |
| Relayer | `https://1ns-registrar-relayer.hiddenstate.xyz` |

These are legacy production defaults and are not authority for the active `app/` contract configuration.

## Contract calls observed

The UI's contract-facing API exposes these DC calls:

| Operation | Legacy method path |
| --- | --- |
| Availability | `available(name)` |
| Price | `getPrice(name)` |
| Parameters | `baseRentalPrice()`, `duration()`, `lastRented()` |
| Commitment | `makeCommitment(name, address, secretHash)`, then `commit(commitment)` |
| Registration | `register(name, url, secretHash)` |
| URL/site update | `updateURL(name, url)` |
| Record lookup | `nameRecords(keccak256(name))` |

The legacy UI computes a `secretHash` in the browser and sends the resulting commitment/register transactions from the connected wallet. It also includes a relayer client for `check-domain` and `purchase`, but the frontend contract writes are still wallet-originated.

## EWS evidence impact

The reviewed legacy UI snapshot contains no EWS ABI, no EWS address, and no contract call path targeting EWS. This supports the technical finding that EWS is not required for the core registration flow historically exposed to users.

This does not prove that EWS is unused by every production service or backend, and it does not approve the active MVP classification. It is supporting evidence only. The Phase 0 manifest still requires a named owner/operator declaration before `ews.role` can pass.

## Active-app impact

The active `app/` must not copy the legacy DC-centered write model as-is. The MVP plan intentionally prioritizes `RegistrarController`, `TLDNameWrapper`, `PublicResolver`, and `BaseRegistrar`, while treating DC as complementary because DC has a globally configured duration and does not support user-selected registration duration.

The useful legacy evidence is therefore limited to scope classification and user-flow comparison:

- legacy production did not require EWS for domain registration UI;
- legacy commit/register kept the preimage material in the browser until wallet signing;
- legacy defaults differ from the active six-contract configuration and cannot be used as active Phase 0 authority.

