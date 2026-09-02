import assert from "node:assert/strict";
import test from "node:test";
import { resolverImmutableAddresses } from "./index.js";

test("extracts PublicResolver immutable addresses in constructor order", () => {
  const addresses = [
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333",
    "0x4444444444444444444444444444444444444444",
  ];
  const runtime = `0x${addresses.map((address) => `73${address.slice(2)}`).join("")}`;
  assert.deepEqual(resolverImmutableAddresses(runtime), {
    trustedController: addresses[0],
    trustedReverseRegistrar: addresses[1],
    registryAddress: addresses[2],
    nameWrapperAddress: addresses[3],
  });
});
