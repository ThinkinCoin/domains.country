import { phaseZeroEvidenceManifest } from "./phase-zero/evidence-manifest.js";
import { phaseZeroOperationalEvidence } from "./phase-zero/operational-evidence.js";
import { phaseZeroContractBaselineEvidence } from "./phase-zero/contract-baseline-evidence-record.js";

export const HARMONY_CHAIN_ID = 1666600000;
export const HARMONY_RPC_URL = process.env.HARMONY_RPC_URL || process.env.VITE_HARMONY_RPC_URL || "https://api.harmony.one";
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

const DEFAULT_CONTRACTS = {
  REGISTRAR_CONTROLLER_ADDRESS: "0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb",
  DC_ADDRESS: "0x547942748Cc8840FEc23daFdD01E6457379B446D",
  EWS_ADDRESS: "0xf90dab949d3853c418bE361930028644B4EBcDE4",
  BASE_REGISTRAR_ADDRESS: "0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD",
  TLD_NAME_WRAPPER_ADDRESS: "0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5",
  PUBLIC_RESOLVER_ADDRESS: "0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D",
};

function addressFromEnv(key) {
  const viteKey = `VITE_${key}`;
  const value = process.env[key] || process.env[viteKey] || DEFAULT_CONTRACTS[key];
  if (!value || !ADDRESS_PATTERN.test(value)) {
    throw new Error(`Invalid or missing contract address: ${key}`);
  }
  return value;
}

export const contractAddresses = {
  registrarController: addressFromEnv("REGISTRAR_CONTROLLER_ADDRESS"),
  dc: addressFromEnv("DC_ADDRESS"),
  ews: addressFromEnv("EWS_ADDRESS"),
  baseRegistrar: addressFromEnv("BASE_REGISTRAR_ADDRESS"),
  nameWrapper: addressFromEnv("TLD_NAME_WRAPPER_ADDRESS"),
  publicResolver: addressFromEnv("PUBLIC_RESOLVER_ADDRESS"),
};

export const phaseZeroRequired = true;

export const phaseZeroConfig = {
  evidenceMaxAgeSeconds: Math.max(60, Number.parseInt(process.env.PHASE_ZERO_EVIDENCE_MAX_AGE_SECONDS || "900", 10) || 900),
  evidenceManifest: phaseZeroEvidenceManifest,
  operationalEvidence: phaseZeroOperationalEvidence,
  contractBaselineEvidence: phaseZeroContractBaselineEvidence,
};

export function contractManifest() {
  return {
    chainId: HARMONY_CHAIN_ID,
    rpcUrl: HARMONY_RPC_URL,
    phaseZeroRequired,
    writesEnabled: false,
    addresses: contractAddresses,
  };
}
