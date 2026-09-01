import { HARMONY_RPC_URL } from "./config.js";
import { keccak256Hex } from "./keccak.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ZERO_32 = "0".repeat(64);
let rpcId = 1;
const selectorCache = new Map();

function strip0x(value) {
  return String(value || "").replace(/^0x/i, "");
}

function hexFromBytes(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function textToHex(value) {
  return `0x${hexFromBytes(encoder.encode(value))}`;
}

function encodeUint(value) {
  return BigInt(value).toString(16).padStart(64, "0");
}

function encodeAddress(value) {
  return strip0x(value).padStart(64, "0");
}

function encodeBool(value) {
  return encodeUint(value ? 1n : 0n);
}

function encodeDynamicBytes(hex) {
  const clean = strip0x(hex);
  return `${encodeUint(clean.length / 2)}${clean.padEnd(Math.ceil(clean.length / 64) * 64, "0")}`;
}

function encodeString(value) {
  return encodeDynamicBytes(strip0x(textToHex(value)));
}

function encodeBytes32(value) {
  return strip0x(value).padEnd(64, "0");
}

function encodeMakeCommitmentArgs([name, owner, duration, secret, resolver, data, reverseRecord, fuses, wrapperExpiry]) {
  if (Array.isArray(data) && data.length) throw new Error("Only empty resolver data is supported by the Phase 0 validator.");
  const headSize = 9n * 32n;
  const encodedName = encodeString(name);
  const bytesArrayOffset = headSize + BigInt(encodedName.length / 2);
  return [
    encodeUint(headSize), encodeAddress(owner), encodeUint(duration), encodeBytes32(secret), encodeAddress(resolver),
    encodeUint(bytesArrayOffset), encodeBool(reverseRecord), encodeUint(fuses), encodeUint(wrapperExpiry), encodedName, encodeUint(0),
  ].join("");
}

async function rpc(method, params = []) {
  const response = await fetch(HARMONY_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: rpcId++, method, params }),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `RPC ${method} failed`);
  return payload.result;
}

export async function web3Sha3Hex(hex) {
  return keccak256Hex(hex);
}

export async function primeSelectors(signatures) {
  const missing = [...new Set(signatures)].filter((signature) => !selectorCache.has(signature));
  for (const signature of missing) selectorCache.set(signature, keccak256Hex(textToHex(signature)).slice(2, 10));
  return Object.fromEntries(signatures.map((signature) => [signature, selectorCache.get(signature)]));
}

export async function selectorFor(signature) {
  await primeSelectors([signature]);
  return selectorCache.get(signature);
}

export function decodeBool(hex) { return BigInt(`0x${strip0x(hex).slice(0, 64) || ZERO_32}`) !== 0n; }
export function decodeUint(hex) { return BigInt(`0x${strip0x(hex).slice(0, 64) || ZERO_32}`); }
export function decodeAddress(hex) { return `0x${strip0x(hex).slice(24, 64)}`; }
export function decodeBytes32(hex) { return `0x${strip0x(hex).slice(0, 64).padEnd(64, "0")}`; }
export function decodeBytes(hex) {
  const clean = strip0x(hex);
  const offset = Number(BigInt(`0x${clean.slice(0, 64) || ZERO_32}`)) * 2;
  const length = Number(BigInt(`0x${clean.slice(offset, offset + 64) || ZERO_32}`)) * 2;
  return `0x${clean.slice(offset + 64, offset + 64 + length)}`;
}
export function decodeString(hex) {
  const bytes = strip0x(decodeBytes(hex));
  return decoder.decode(Uint8Array.from(bytes.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) || []));
}
export function decodeRentPrice(hex) {
  const clean = strip0x(hex);
  return { base: BigInt(`0x${clean.slice(0, 64) || ZERO_32}`), premium: BigInt(`0x${clean.slice(64, 128) || ZERO_32}`) };
}

function signatureFor(abiItem) {
  return `${abiItem.name}(${abiItem.inputs.map((input) => input.type).join(",")})`;
}

export async function callData(signature, args = []) {
  let encoded = "";
  if (signature.endsWith("(string)")) encoded = `${encodeUint(32)}${encodeString(args[0])}`;
  else if (signature.endsWith("(string,uint256)")) encoded = `${encodeUint(64)}${encodeUint(args[1])}${encodeString(args[0])}`;
  else if (signature.endsWith("(bytes32)")) encoded = encodeBytes32(args[0]);
  else if (signature.endsWith("(uint256)")) encoded = encodeUint(args[0]);
  else if (signature.endsWith("(address)")) encoded = encodeAddress(args[0]);
  else if (signature.endsWith("(address,address)")) encoded = `${encodeAddress(args[0])}${encodeAddress(args[1])}`;
  else if (signature.endsWith("(address,address,uint256)")) encoded = `${encodeAddress(args[0])}${encodeAddress(args[1])}${encodeUint(args[2])}`;
  else if (signature.endsWith("(bytes4)")) encoded = strip0x(args[0]).padEnd(64, "0");
  else if (signature.endsWith("(bytes32,address)")) encoded = `${encodeBytes32(args[0])}${encodeAddress(args[1])}`;
  else if (signature.endsWith("(bytes32,uint32)")) encoded = `${encodeBytes32(args[0])}${encodeUint(args[1])}`;
  else if (signature.endsWith("(bytes32,bytes32,uint16)")) encoded = `${encodeBytes32(args[0])}${encodeBytes32(args[1])}${encodeUint(args[2])}`;
  else if (signature.endsWith("(bytes32,bytes)")) encoded = `${encodeBytes32(args[0])}${encodeUint(64)}${encodeDynamicBytes(args[1])}`;
  else if (signature.endsWith("(bytes32,uint64)")) encoded = `${encodeBytes32(args[0])}${encodeUint(args[1])}`;
  else if (signature === "makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)") encoded = encodeMakeCommitmentArgs(args);
  else if (signature === "register(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)") encoded = encodeMakeCommitmentArgs(args);
  return `0x${await selectorFor(signature)}${encoded}`;
}

export async function rawCall(to, signature, args = [], value = 0n) {
  return rpc("eth_call", [{ to, data: await callData(signature, args), value: `0x${BigInt(value).toString(16)}` }, "latest"]);
}

function decodeReturn(signature, hex) {
  if (signature === "rentPrice(string,uint256)") return decodeRentPrice(hex);
  if (signature === "getData(uint256)") {
    const clean = strip0x(hex);
    return [`0x${clean.slice(24, 64)}`, BigInt(`0x${clean.slice(64, 128) || ZERO_32}`), BigInt(`0x${clean.slice(128, 192) || ZERO_32}`)];
  }
  if (["owner()", "base()", "registrarController()", "nameWrapper()", "baseRegistrar()", "resolver()", "getApproved(uint256)", "dc()", "revenueAccount()"].includes(signature)) return decodeAddress(hex);
  if (["available(string)", "paused()", "reverseRecord()", "controllers(address)", "isApprovedForAll(address,address)", "canModifyName(bytes32,address)", "allFusesBurned(bytes32,uint32)", "supportsInterface(bytes4)", "hasDNSRecords(bytes32,bytes32)", "hasRole(bytes32,address)"].includes(signature)) return decodeBool(hex);
  if (["baseNode()", "TLD_NODE()", "MAINTAINER_ROLE()", "DEFAULT_ADMIN_ROLE()", "makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)"].includes(signature)) return decodeBytes32(hex);
  if (["name()", "symbol()", "baseExtension()"].includes(signature)) return decodeString(hex);
  if (signature === "dnsRecord(bytes32,bytes32,uint16)") return decodeBytes(hex);
  return decodeUint(hex);
}

export async function readContractRaw({ address, abi, functionName, args = [] }) {
  const abiItem = abi.find((item) => item.type === "function" && item.name === functionName);
  if (!abiItem) throw new Error(`ABI does not declare ${functionName}.`);
  const signature = signatureFor(abiItem);
  return decodeReturn(signature, await rawCall(address, signature, args));
}

export const rawRpcClient = {
  async getChainId() { return Number.parseInt(await rpc("eth_chainId", []), 16); },
  async getBlockNumber() { return BigInt(await rpc("eth_blockNumber", [])); },
  async getBytecode({ address }) { return rpc("eth_getCode", [address, "latest"]); },
  async call({ to, signature, args = [], value = 0n }) { return rawCall(to, signature, args, value); },
  async readContract(input) { return readContractRaw(input); },
};
