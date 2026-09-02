import assert from "node:assert/strict";
import test from "node:test";
import { keccak256Hex } from "./keccak.js";

test("keccak256 uses Ethereum-compatible Keccak padding", () => {
  assert.equal(keccak256Hex("0x"), "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
  assert.equal(keccak256Hex("0x6f776e65722829").slice(2, 10), "8da5cb5b");
});
