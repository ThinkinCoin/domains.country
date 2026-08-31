"use client";

import {useEffect, useState} from "react";
import {commitJournalSecurityNotice, readCommitJournal, type CommitJournalEntry} from "@/lib/commit-journal";
import {submitCommit, submitRegister} from "@/lib/contracts/registration-client";

type Result = {
    name: string;
    valid: boolean;
    normalizedLabel: string | null;
    availability: string;
    writeMode: string;
    warnings: string[];
    onChain: {expiresAt: string | null; ttl: number | null} | null;
};

export function DomainConsole() {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState<Result | null>(null);
    const [journal, setJournal] = useState<CommitJournalEntry[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => setJournal(readCommitJournal()), []);

    async function search() {
        setBusy(true);
        setError(null);
        try {
            const response = await fetch(`/api/domains/${encodeURIComponent(query)}`, {cache: "no-store"});
            const payload = await response.json() as Result;
            setResult(payload);
        } catch {
            setError("Não foi possível consultar o domínio agora.");
        } finally {
            setBusy(false);
        }
    }

    async function commit() {
        if (!result?.normalizedLabel) return;
        setBusy(true);
        setError(null);
        try {
            await submitCommit({label: result.normalizedLabel, durationSeconds: 31536000n});
            setJournal(readCommitJournal());
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Commitment failed.");
        } finally {
            setBusy(false);
        }
    }

    async function register(entry: CommitJournalEntry) {
        setBusy(true);
        setError(null);
        try {
            await submitRegister(entry);
            setJournal(readCommitJournal());
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Registration failed.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="panel" aria-labelledby="domain-search-title">
            <h2 id="domain-search-title">Consultar domínio</h2>
            <div className="searchRow">
                <input aria-label="Nome do domínio" value={query} onChange={event => setQuery(event.target.value)} placeholder="exemplo.country" />
                <button type="button" onClick={search} disabled={busy || !query.trim()}>{busy ? "Consultando…" : "Pesquisar"}</button>
            </div>
            {error && <p className="warning" role="alert">{error}</p>}
            {result && <div className="result">
                <div className="resultGrid">
                    <div><span className="label">Domínio</span><span className="value">{result.name}</span></div>
                    <div><span className="label">Disponibilidade</span><span className="value">{result.availability}</span></div>
                    <div><span className="label">Expiração</span><span className="value">{result.onChain?.expiresAt ?? "Ainda não disponível"}</span></div>
                    <div><span className="label">TTL</span><span className="value">{result.onChain?.ttl ?? "Ainda não disponível"}</span></div>
                </div>
                {result.availability === "available" && <p><button type="button" onClick={commit} disabled={busy || result.writeMode === "disabled_phase_0"}>Criar compromisso</button></p>}
                {result.writeMode === "disabled_phase_0" && <p className="warning">Escritas permanecem desativadas até a conclusão aprovada da Fase 0.</p>}
                {result.warnings.map(warning => <p key={warning}>{warning}</p>)}
            </div>}
            <div className="journal">
                <h3>Compromissos neste navegador</h3>
                <p>{commitJournalSecurityNotice}</p>
                {journal.length === 0 ? <p>Nenhum compromisso pendente neste navegador.</p> : <ul>{journal.map(entry => (
                    <li key={entry.id}>
                        <strong>{entry.name}</strong> · commit <code>{entry.commitTxHash ?? "pendente"}</code>
                        <br />
                        <button type="button" onClick={() => register(entry)} disabled={busy}>Registrar após o período mínimo</button>
                    </li>
                ))}</ul>}
            </div>
        </section>
    );
}
