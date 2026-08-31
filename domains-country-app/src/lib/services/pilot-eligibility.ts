import {getAddress, isAddress} from "viem";
import {appConfig} from "@/lib/config";
import {db} from "@/lib/db";
import {parseCountryDomain} from "@/lib/names";
import {allowlistDisclosure} from "@/lib/security/allowlist";

export async function getPilotEligibility(wallet: string, domainInput: string) {
    if (!isAddress(wallet)) return {eligible: false, reason: "Invalid wallet address.", disclosure: allowlistDisclosure};
    const parsed = parseCountryDomain(domainInput);
    if (!parsed.ok) return {eligible: false, reason: parsed.reason, disclosure: allowlistDisclosure};
    if (!appConfig.writesEnabled) return {eligible: false, reason: "Contract writes are disabled pending Phase 0 approval.", disclosure: allowlistDisclosure};

    const address = getAddress(wallet);
    const entries = await db.allowlistEntry.findMany({
        where: {wallet: address, enabled: true, domainName: {in: ["*", parsed.name]}}
    });
    return {
        eligible: entries.length > 0,
        reason: entries.length > 0 ? "Wallet is eligible through the official app allowlist." : "Wallet/domain pair is not allowlisted for the controlled pilot.",
        domain: parsed.name,
        wallet: address,
        disclosure: allowlistDisclosure
    };
}
