import {db} from "@/lib/db";

export async function invalidateAfterTransfer(domainId: string, transferTxHash: string) {
    const domain = await db.domain.findUniqueOrThrow({where: {id: domainId}, include: {publishedZone: true}});
    await db.$transaction([
        db.auditLog.create({
            data: {
                actor: "indexer",
                action: "transfer_observed_permissions_invalidated",
                targetType: "domain",
                targetId: domain.id,
                detail: {domain: domain.name, transferTxHash}
            }
        }),
        db.publishedZoneState.upsert({
            where: {domainId: domain.id},
            create: {domainId: domain.id, status: "WAITING_CONFIRMATIONS", servedRecords: [], lastError: "Transfer observed; ownership and permissions must be re-read before DNS publication."},
            update: {status: "WAITING_CONFIRMATIONS", lastError: "Transfer observed; ownership and permissions must be re-read before DNS publication."}
        })
    ]);
}

export const transferPublicationRule = "After transfer, the indexer must re-read owner, wrapper data, fuses, resolver, and TTL from Harmony before accepting or publishing DNS changes. Cached authorization from the prior owner is invalid.";
