import {z} from "zod";
import type {DnsRecord, DnsRecordType} from "@/lib/types";

export const supportedDnsTypes = ["A", "CNAME", "NS", "TXT", "SOA", "SRV", "DNAME"] as const satisfies readonly DnsRecordType[];

const hostSchema = z.string().min(1).max(253).regex(/^(@|[a-z0-9_*.-]+)$/i);
const ttlSchema = z.number().int().min(60).max(86400);
const ipv4Schema = z.string().regex(/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/);
const fqdnLike = z.string().min(1).max(253).regex(/^[a-z0-9.-]+\.?$/i);

const base = z.object({
    host: hostSchema,
    type: z.enum(supportedDnsTypes),
    value: z.string().min(1).max(4096),
    ttl: ttlSchema
});

export function validateDnsRecord(record: DnsRecord): {ok: true; record: DnsRecord} | {ok: false; reason: string} {
    const parsed = base.safeParse(record);
    if (!parsed.success) return {ok: false, reason: parsed.error.issues.map(issue => issue.message).join("; ")};

    switch (record.type) {
        case "A":
            return ipv4Schema.safeParse(record.value).success ? {ok: true, record} : {ok: false, reason: "A records require a valid IPv4 address."};
        case "CNAME":
        case "NS":
        case "DNAME":
            return fqdnLike.safeParse(record.value).success ? {ok: true, record} : {ok: false, reason: `${record.type} records require a domain target.`};
        case "TXT":
            return record.value.length <= 255 ? {ok: true, record} : {ok: false, reason: "TXT records are limited to 255 characters in this MVP serializer."};
        case "SOA":
            return record.value.split(/\s+/).length >= 7 ? {ok: true, record} : {ok: false, reason: "SOA requires mname rname serial refresh retry expire minimum."};
        case "SRV":
            return /^\d+\s+\d+\s+\d+\s+[a-z0-9.-]+\.?$/i.test(record.value) ? {ok: true, record} : {ok: false, reason: "SRV requires priority weight port target."};
        default:
            return {ok: false, reason: "Unsupported DNS record type."};
    }
}

export function validateDnsRecords(records: DnsRecord[]) {
    return records.map(validateDnsRecord);
}
