CREATE TYPE transaction_status AS ENUM ('OBSERVED', 'PENDING_CONFIRMATIONS', 'CONFIRMED', 'FAILED', 'REPLACED');
CREATE TYPE publication_status AS ENUM ('NOT_DELEGATED', 'WAITING_CONFIRMATIONS', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'ROLLED_BACK');

CREATE TABLE domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE onchain_domain_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    block_number BIGINT NOT NULL,
    block_hash TEXT,
    log_index INTEGER NOT NULL,
    transaction_hash TEXT NOT NULL,
    confirmations INTEGER NOT NULL DEFAULT 0,
    status transaction_status NOT NULL,
    owner TEXT,
    expires_at TIMESTAMPTZ,
    resolver TEXT,
    fuses BIGINT,
    ttl BIGINT,
    records JSONB NOT NULL DEFAULT '[]'::jsonb,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    UNIQUE(domain_id, version),
    UNIQUE(transaction_hash, log_index)
);

CREATE TABLE published_zone_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL UNIQUE REFERENCES domains(id) ON DELETE CASCADE,
    status publication_status NOT NULL DEFAULT 'NOT_DELEGATED',
    published_version INTEGER,
    source_onchain_state_id UUID REFERENCES onchain_domain_states(id) ON DELETE SET NULL,
    zone_serial BIGINT,
    served_records JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_published_at TIMESTAMPTZ,
    last_error TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dns_publication_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    onchain_state_id UUID NOT NULL REFERENCES onchain_domain_states(id) ON DELETE CASCADE,
    published_zone_state_id UUID NOT NULL REFERENCES published_zone_states(id) ON DELETE CASCADE,
    requested_version INTEGER NOT NULL,
    prior_version INTEGER,
    status publication_status NOT NULL,
    response JSONB,
    error TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE allowlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet TEXT NOT NULL,
    domain_name TEXT NOT NULL DEFAULT '*',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    note TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(wallet, domain_name)
);

CREATE TABLE admin_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet TEXT NOT NULL,
    message TEXT NOT NULL,
    nonce_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    detail JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE indexer_checkpoints (
    id TEXT PRIMARY KEY,
    block_number BIGINT NOT NULL,
    block_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX onchain_domain_states_domain_confirmation_block_idx ON onchain_domain_states(domain_id, confirmations, block_number);
CREATE INDEX dns_publication_attempts_domain_version_idx ON dns_publication_attempts(domain_id, requested_version);
CREATE INDEX allowlist_entries_wallet_enabled_idx ON allowlist_entries(wallet, enabled);
CREATE INDEX admin_challenges_wallet_expiry_idx ON admin_challenges(wallet, expires_at);
CREATE INDEX audit_log_actor_created_idx ON audit_log(actor, created_at);
