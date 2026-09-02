import assert from "node:assert/strict";
import test from "node:test";
import { rawRpcClient, readContractRaw } from "./evm-rpc.js";

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

test("rawRpcClient.call includes an explicit simulation sender when requested", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, init) => {
    requests.push(JSON.parse(init.body));
    return {
      ok: true,
      async json() {
        return { jsonrpc: "2.0", id: requests.at(-1).id, result: "0x" };
      },
    };
  };

  try {
    await rawRpcClient.call({
      to: "0x000000000000000000000000000000000000dEaD",
      from: "0x000000000000000000000000000000000000bEEF",
      signature: "setDNSRecords(bytes32,bytes)",
      args: [`0x${"00".repeat(32)}`, "0x"],
      blockNumber: 42n,
    });
    const [call, blockTag] = requests.at(-1).params;
    assert.equal(call.to, "0x000000000000000000000000000000000000dEaD");
    assert.equal(call.from, "0x000000000000000000000000000000000000bEEF");
    assert.equal(call.value, "0x0");
    assert.match(call.data, /^0x[0-9a-f]{200}$/i);
    assert.equal(blockTag, "0x2a");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("readContractRaw decodes ownerOf as an address", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    async json() {
      return {
        jsonrpc: "2.0",
        id: 1,
        result: `0x${"0".repeat(24)}000000000000000000000000000000000000dEaD`,
      };
    },
  });

  try {
    const owner = await readContractRaw({
      address: "0x000000000000000000000000000000000000dEaD",
      abi: [{ type: "function", name: "ownerOf", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] }],
      functionName: "ownerOf",
      args: [1n],
    });
    assert.equal(owner.toLowerCase(), "0x000000000000000000000000000000000000dead");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
