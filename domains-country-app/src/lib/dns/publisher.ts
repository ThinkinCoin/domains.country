import {canonicalZoneName} from "@/lib/names";
import {serverConfig} from "@/lib/server-config";
import type {DnsRecord} from "@/lib/types";

export type ZoneSnapshot = {
    zone: string;
    records: DnsRecord[];
    serial: bigint;
};

export type PublishResult = {ok: true; response: unknown} | {ok: false; error: string; rollbackAttempted: boolean; rollbackSucceeded: boolean};

function endpoint(path: string): string {
    if (!serverConfig.powerDns.apiUrl || !serverConfig.powerDns.apiKey) throw new Error("PowerDNS is not configured.");
    return `${serverConfig.powerDns.apiUrl.replace(/\/$/, "")}/servers/${serverConfig.powerDns.serverId}${path}`;
}

async function request(path: string, init: RequestInit): Promise<Response> {
    return fetch(endpoint(path), {
        ...init,
        headers: {
            "X-API-Key": serverConfig.powerDns.apiKey,
            "Content-Type": "application/json",
            ...init.headers
        },
        cache: "no-store"
    });
}

function rrsetKey(name: string, type: string): string {
    return `${name}|${type}`;
}

function resourceRecords(snapshot: ZoneSnapshot, prior: ZoneSnapshot | null) {
    const nextRrsets = new Map<string, {name: string; type: string; ttl: number; changetype: "REPLACE"; records: {content: string; disabled: boolean}[]}>();
    for (const record of snapshot.records) {
        const name = canonicalZoneName(record.host === "@" ? snapshot.zone : `${record.host}.${snapshot.zone}`);
        const key = rrsetKey(name, record.type);
        const existing = nextRrsets.get(key) ?? {name, type: record.type, ttl: record.ttl, changetype: "REPLACE" as const, records: []};
        existing.records.push({content: record.value, disabled: false});
        nextRrsets.set(key, existing);
    }
    const removed = new Map<string, {name: string; type: string}>();
    for (const record of prior?.records ?? []) {
        const name = canonicalZoneName(record.host === "@" ? prior!.zone : `${record.host}.${prior!.zone}`);
        const key = rrsetKey(name, record.type);
        if (!nextRrsets.has(key)) removed.set(key, {name, type: record.type});
    }
    return [
        ...nextRrsets.values(),
        ...[...removed.values()].map(record => ({...record, changetype: "DELETE", records: []}))
    ];
}

export class PowerDnsPublisher {
    /**
     * Publish is copy-on-write at the application layer. The prior snapshot is retained before the
     * PATCH. A failed PATCH is followed by a compensating PATCH of that snapshot; only a verified
     * response may advance the published-zone version in PostgreSQL.
     */
    async publish(next: ZoneSnapshot, previous: ZoneSnapshot | null): Promise<PublishResult> {
        const zone = canonicalZoneName(next.zone);
        try {
            const response = await request(`/zones/${encodeURIComponent(zone)}`, {
                method: "PATCH",
                body: JSON.stringify({rrsets: resourceRecords(next, previous)})
            });
            if (!response.ok) throw new Error(`PowerDNS PATCH failed (${response.status}): ${await response.text()}`);

            const verified = await request(`/zones/${encodeURIComponent(zone)}`, {method: "GET"});
            if (!verified.ok) throw new Error(`PowerDNS verification failed (${verified.status}).`);
            return {ok: true, response: await verified.json()};
        } catch (cause) {
            const error = cause instanceof Error ? cause.message : "Unknown PowerDNS publishing error.";
            if (!previous) return {ok: false, error, rollbackAttempted: false, rollbackSucceeded: false};
            try {
                const rollback = await request(`/zones/${encodeURIComponent(zone)}`, {
                    method: "PATCH",
                    body: JSON.stringify({rrsets: resourceRecords(previous, next)})
                });
                return {ok: false, error, rollbackAttempted: true, rollbackSucceeded: rollback.ok};
            } catch {
                return {ok: false, error, rollbackAttempted: true, rollbackSucceeded: false};
            }
        }
    }
}
