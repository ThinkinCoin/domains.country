import {getAddress} from "viem";
import {appConfig} from "@/lib/config";
import {serverConfig} from "@/lib/server-config";

export function isConfiguredOperator(address: string): boolean {
    try {
        const normalized = getAddress(address).toLowerCase();
        return serverConfig.adminOperators.some(operator => operator.toLowerCase() === normalized);
    } catch {
        return false;
    }
}

export function isPilotWriteEnabled(): boolean {
    return appConfig.writesEnabled;
}

export const allowlistDisclosure = "The allowlist controls access through domains.country during the controlled pilot. It does not prevent direct calls to Harmony contracts.";
