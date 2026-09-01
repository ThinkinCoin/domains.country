import { contractAddresses, contractManifest, HARMONY_CHAIN_ID, HARMONY_RPC_URL } from "./_lib/config.js";
import { json } from "./_lib/http.js";

async function rpc(method, params) {
  const response = await fetch(HARMONY_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `RPC ${method} failed`);
  }
  return payload.result;
}

export async function GET() {
  try {
    const [chainIdHex, contracts] = await Promise.all([
      rpc("eth_chainId", []),
      Promise.all(Object.entries(contractAddresses).map(async ([component, address]) => {
        const bytecode = await rpc("eth_getCode", [address, "latest"]);
        return { component, address, bytecodePresent: Boolean(bytecode && bytecode !== "0x") };
      })),
    ]);
    const chainId = Number.parseInt(chainIdHex, 16);

    return json({
      ok: chainId === HARMONY_CHAIN_ID && contracts.every((contract) => contract.bytecodePresent),
      chainId,
      expectedChainId: HARMONY_CHAIN_ID,
      contracts,
      manifest: contractManifest(),
      sourceRevision: process.env.VERCEL_GIT_COMMIT_SHA || process.env.SOURCE_REVISION || null,
    });
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Health check failed.",
      manifest: contractManifest(),
      sourceRevision: process.env.VERCEL_GIT_COMMIT_SHA || process.env.SOURCE_REVISION || null,
    }, 503);
  }
}
