import {getAddress, isAddress} from "viem";
import {db} from "@/lib/db";
import {allowlistDisclosure} from "@/lib/security/allowlist";

export async function listAllowlistEntries() {
    return db.allowlistEntry.findMany({orderBy: {updatedAt: "desc"}});
}

export async function upsertAllowlistEntry(input: {wallet: string; domainName?: string | null; enabled: boolean; note?: string | null; actor: string}) {
    if (!isAddress(input.wallet)) throw new Error("Invalid wallet address.");
    const wallet = getAddress(input.wallet);
    const domainName = input.domainName?.trim().toLowerCase() || "*";
    const entry = await db.allowlistEntry.upsert({
        where: {wallet_domainName: {wallet, domainName}},
        update: {enabled: input.enabled, note: input.note, createdBy: input.actor},
        create: {wallet, domainName, enabled: input.enabled, note: input.note, createdBy: input.actor}
    });
    await db.auditLog.create({data: {actor: input.actor, action: "allowlist_upsert", targetType: "allowlist", targetId: entry.id, detail: {wallet, domainName, enabled: input.enabled, disclosure: allowlistDisclosure}}});
    return entry;
}
