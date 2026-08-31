import {formatEther} from "viem";
import {appConfig} from "@/lib/config";
import {getAvailability, getBaseRegistrarExpiration, getRentPrice, getResolverTtl} from "@/lib/contracts/client";
import {parseCountryDomain} from "@/lib/names";
import type {DomainSummary} from "@/lib/types";

export async function getDomainSummary(input: string): Promise<DomainSummary> {
    const parsed = parseCountryDomain(input);
    if (!parsed.ok) {
        return {
            name: input,
            valid: false,
            normalizedLabel: null,
            availability: "unknown",
            writeMode: "disabled_phase_0",
            onChain: null,
            publishedZone: null,
            warnings: [parsed.reason]
        };
    }

    try {
        const [available, price, expiry, ttl] = await Promise.all([
            getAvailability(parsed.label),
            getRentPrice(parsed.label),
            getBaseRegistrarExpiration(parsed.label),
            getResolverTtl(parsed.name)
        ]);
        const warnings = [
            "Contract reads are provisional until Phase 0 ABI validation is approved.",
            "Public DNS remains inactive until parent-zone delegation is verified."
        ];
        return {
            name: parsed.name,
            valid: true,
            normalizedLabel: parsed.label,
            availability: available ? "available" : "registered",
            writeMode: appConfig.writesEnabled ? "allowlisted" : "disabled_phase_0",
            onChain: {
                name: parsed.name,
                owner: null,
                expiresAt: expiry ? new Date(Number(expiry) * 1000).toISOString() : null,
                resolver: appConfig.contractAddresses.publicResolver,
                fuses: null,
                ttl,
                records: [],
                version: 0,
                blockNumber: 0n,
                transactionHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
                confirmations: 0
            },
            publishedZone: null,
            warnings: [...warnings, `Current ${appConfig.defaultDurationSeconds.toString()}s price: ${formatEther(price.total)} ONE.`]
        };
    } catch (error) {
        return {
            name: parsed.name,
            valid: true,
            normalizedLabel: parsed.label,
            availability: "unknown",
            writeMode: "disabled_phase_0",
            onChain: null,
            publishedZone: null,
            warnings: [error instanceof Error ? `RPC query failed: ${error.message}` : "RPC query failed."]
        };
    }
}
