import {PublicationStatus} from "@prisma/client";
import {db} from "@/lib/db";
import {PowerDnsPublisher, type ZoneSnapshot} from "@/lib/dns/publisher";
import {serverConfig} from "@/lib/server-config";

export async function publishConfirmedState(domainId: string, stateId: string, next: ZoneSnapshot, previous: ZoneSnapshot | null) {
    const [state, zone] = await Promise.all([
        db.onChainDomainState.findUniqueOrThrow({where: {id: stateId}}),
        db.publishedZoneState.findUnique({where: {domainId}})
    ]);
    if (state.confirmations < serverConfig.minConfirmations) {
        throw new Error("On-chain state lacks the required confirmation depth.");
    }

    const current = zone ?? await db.publishedZoneState.create({
        data: {domainId, status: PublicationStatus.WAITING_CONFIRMATIONS, servedRecords: []}
    });
    const attempt = await db.dnsPublicationAttempt.create({
        data: {
            domainId,
            onChainStateId: stateId,
            publishedZoneStateId: current.id,
            requestedVersion: state.version,
            priorVersion: current.publishedVersion,
            status: PublicationStatus.PUBLISHING
        }
    });
    await db.publishedZoneState.update({where: {id: current.id}, data: {status: PublicationStatus.PUBLISHING, lastError: null}});

    const result = await new PowerDnsPublisher().publish(next, previous);
    if (!result.ok) {
        await db.$transaction([
            db.dnsPublicationAttempt.update({where: {id: attempt.id}, data: {status: result.rollbackSucceeded ? PublicationStatus.ROLLED_BACK : PublicationStatus.FAILED, error: result.error, response: result, completedAt: new Date()}}),
            db.publishedZoneState.update({where: {id: current.id}, data: {status: result.rollbackSucceeded ? PublicationStatus.ROLLED_BACK : PublicationStatus.FAILED, lastError: result.error}})
        ]);
        return result;
    }

    await db.$transaction([
        db.dnsPublicationAttempt.update({where: {id: attempt.id}, data: {status: PublicationStatus.PUBLISHED, response: result.response as object, completedAt: new Date()}}),
        db.publishedZoneState.update({where: {id: current.id}, data: {status: PublicationStatus.PUBLISHED, publishedVersion: state.version, sourceOnChainStateId: state.id, zoneSerial: next.serial, servedRecords: next.records, lastPublishedAt: new Date(), lastError: null}})
    ]);
    return result;
}
