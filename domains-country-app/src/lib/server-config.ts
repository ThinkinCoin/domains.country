import "server-only";
import {getAddress} from "viem";

function nonNegativeInteger(key: string, fallback: number): number {
    const raw = process.env[key];
    if (!raw) return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) throw new Error(`${key} must be a non-negative integer.`);
    return value;
}

export const serverConfig = {
    minConfirmations: nonNegativeInteger("MIN_CONFIRMATIONS", 12),
    adminOperators: (process.env.ADMIN_OPERATOR_ADDRESSES ?? "")
        .split(",")
        .map(address => address.trim())
        .filter(Boolean)
        .map(address => getAddress(address)),
    powerDns: {
        apiUrl: process.env.POWERDNS_API_URL ?? "",
        apiKey: process.env.POWERDNS_API_KEY ?? "",
        serverId: process.env.POWERDNS_SERVER_ID ?? "localhost",
        nameservers: (process.env.POWERDNS_NAMESERVERS ?? "ns1.domains.country.,ns2.domains.country.")
            .split(",")
            .map(ns => ns.trim())
            .filter(Boolean)
    }
};
