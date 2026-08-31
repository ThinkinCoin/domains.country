CREATE TYPE "TransactionStatus" AS ENUM ('OBSERVED', 'PENDING_CONFIRMATIONS', 'CONFIRMED', 'FAILED', 'REPLACED');
CREATE TYPE "PublicationStatus" AS ENUM ('NOT_DELEGATED', 'WAITING_CONFIRMATIONS', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'ROLLED_BACK');

CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnChainDomainState" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "confirmations" INTEGER NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "owner" TEXT,
    "expiresAt" TIMESTAMP(3),
    "resolver" TEXT,
    "fuses" INTEGER,
    "ttl" INTEGER,
    "records" JSONB NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    CONSTRAINT "OnChainDomainState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublishedZoneState" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'NOT_DELEGATED',
    "publishedVersion" INTEGER,
    "sourceOnChainStateId" TEXT,
    "zoneSerial" BIGINT,
    "servedRecords" JSONB NOT NULL,
    "lastPublishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublishedZoneState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DnsPublicationAttempt" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "onChainStateId" TEXT NOT NULL,
    "publishedZoneStateId" TEXT NOT NULL,
    "requestedVersion" INTEGER NOT NULL,
    "priorVersion" INTEGER,
    "status" "PublicationStatus" NOT NULL,
    "response" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "DnsPublicationAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AllowlistEntry" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "domainName" TEXT NOT NULL DEFAULT '*',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AllowlistEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminChallenge" (
    "id" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "nonceHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IndexerCheckpoint" (
    "id" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "blockHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IndexerCheckpoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Domain_name_key" ON "Domain"("name");
CREATE UNIQUE INDEX "OnChainDomainState_domainId_version_key" ON "OnChainDomainState"("domainId", "version");
CREATE UNIQUE INDEX "OnChainDomainState_transactionHash_logIndex_key" ON "OnChainDomainState"("transactionHash", "logIndex");
CREATE INDEX "OnChainDomainState_domainId_confirmations_blockNumber_idx" ON "OnChainDomainState"("domainId", "confirmations", "blockNumber");
CREATE UNIQUE INDEX "PublishedZoneState_domainId_key" ON "PublishedZoneState"("domainId");
CREATE INDEX "DnsPublicationAttempt_domainId_requestedVersion_idx" ON "DnsPublicationAttempt"("domainId", "requestedVersion");
CREATE UNIQUE INDEX "AllowlistEntry_wallet_domainName_key" ON "AllowlistEntry"("wallet", "domainName");
CREATE INDEX "AllowlistEntry_wallet_enabled_idx" ON "AllowlistEntry"("wallet", "enabled");
CREATE INDEX "AdminChallenge_wallet_expiresAt_idx" ON "AdminChallenge"("wallet", "expiresAt");
CREATE INDEX "AuditLog_actor_createdAt_idx" ON "AuditLog"("actor", "createdAt");

ALTER TABLE "OnChainDomainState" ADD CONSTRAINT "OnChainDomainState_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublishedZoneState" ADD CONSTRAINT "PublishedZoneState_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublishedZoneState" ADD CONSTRAINT "PublishedZoneState_sourceOnChainStateId_fkey" FOREIGN KEY ("sourceOnChainStateId") REFERENCES "OnChainDomainState"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DnsPublicationAttempt" ADD CONSTRAINT "DnsPublicationAttempt_onChainStateId_fkey" FOREIGN KEY ("onChainStateId") REFERENCES "OnChainDomainState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DnsPublicationAttempt" ADD CONSTRAINT "DnsPublicationAttempt_publishedZoneStateId_fkey" FOREIGN KEY ("publishedZoneStateId") REFERENCES "PublishedZoneState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
