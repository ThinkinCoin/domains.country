export type DnsRecordType = "A" | "CNAME" | "NS" | "TXT" | "SOA" | "SRV" | "DNAME";

export type TransactionStatus = "observed" | "pending_confirmations" | "confirmed" | "failed" | "replaced";

export type PublicationStatus = "not_delegated" | "waiting_confirmations" | "published" | "failed" | "rolled_back";

export type DnsRecord = {
    host: string;
    type: DnsRecordType;
    value: string;
    ttl: number;
};

export type OnChainVersion = {
    version: number;
    blockNumber: bigint;
    transactionHash: `0x${string}`;
    confirmations: number;
};

export type OnChainDomainState = OnChainVersion & {
    name: string;
    owner: `0x${string}` | null;
    expiresAt: string | null;
    resolver: `0x${string}` | null;
    fuses: number | null;
    ttl: number | null;
    records: DnsRecord[];
};

export type PublishedZoneState = {
    name: string;
    status: PublicationStatus;
    publishedVersion: number | null;
    sourceOnChainVersion: number | null;
    zoneSerial: number | null;
    powerDnsResult: string | null;
    servedRecords: DnsRecord[];
    lastPublishedAt: string | null;
};

export type DomainSummary = {
    name: string;
    valid: boolean;
    normalizedLabel: string | null;
    availability: "unknown" | "available" | "registered" | "blocked";
    writeMode: "disabled_phase_0" | "allowlisted" | "not_allowlisted";
    onChain: OnChainDomainState | null;
    publishedZone: PublishedZoneState | null;
    warnings: string[];
};

export type CommitJournalEntry = {
    id: string;
    chainId: number;
    account: `0x${string}`;
    name: string;
    label: string;
    commitment: `0x${string}`;
    secret: `0x${string}`;
    durationSeconds: string;
    resolver: `0x${string}`;
    fuses: number;
    wrapperExpiry: number;
    createdAt: string;
    minRegisterAt: string | null;
    commitTxHash: `0x${string}` | null;
    registerTxHash: `0x${string}` | null;
};
