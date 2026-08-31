"use client";

import {isAddress} from "viem";
import type {CommitJournalEntry} from "@/lib/types";

export type {CommitJournalEntry} from "@/lib/types";

const STORAGE_KEY = "domains.country.commit-journal.v1";

function browserStorage(): Storage | null {
    return typeof window === "undefined" ? null : window.localStorage;
}

function validEntry(value: unknown): value is CommitJournalEntry {
    if (!value || typeof value !== "object") return false;
    const entry = value as Partial<CommitJournalEntry>;
    return typeof entry.id === "string"
        && typeof entry.name === "string"
        && typeof entry.secret === "string"
        && /^0x[0-9a-fA-F]{64}$/.test(entry.secret)
        && typeof entry.account === "string"
        && isAddress(entry.account);
}

export function readCommitJournal(): CommitJournalEntry[] {
    const storage = browserStorage();
    if (!storage) return [];
    try {
        const decoded: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "[]");
        return Array.isArray(decoded) ? decoded.filter(validEntry) : [];
    } catch {
        return [];
    }
}

export function writeCommitJournal(entries: CommitJournalEntry[]): void {
    const storage = browserStorage();
    if (!storage) throw new Error("Local browser storage is unavailable.");
    storage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function saveCommitment(entry: CommitJournalEntry): void {
    const current = readCommitJournal().filter(item => item.id !== entry.id);
    writeCommitJournal([...current, entry]);
}

export function removeCommitment(id: string): void {
    writeCommitJournal(readCommitJournal().filter(entry => entry.id !== id));
}

export function commitmentsForAccount(account: string): CommitJournalEntry[] {
    return readCommitJournal().filter(entry => entry.account.toLowerCase() === account.toLowerCase());
}

export function generateCommitSecret(): `0x${string}` {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return `0x${Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

export const commitJournalSecurityNotice = "The commitment secret stays only in this browser's local storage. Clearing browser data, using another device, or losing this secret prevents this commitment from being registered.";
