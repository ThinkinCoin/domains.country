import assert from "node:assert/strict";
import test from "node:test";
import { rawRpcClient } from "./evm-rpc.js";

test("rawRpcClient.getBlock encodes an exact block number without full transactions", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return {
      ok: true,
      async json() {
        return {
          jsonrpc: "2.0",
          id: requests.at(-1).id,
          result: { number: "0x2a", hash: `0x${"ab".repeat(32)}` },
        };
      },
    };
  };

  try {
    const block = await rawRpcClient.getBlock({ blockNumber: 42n });
    assert.equal(block.number, "0x2a");
    assert.deepEqual(requests.at(-1).params, ["0x2a", false]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
