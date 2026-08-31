"use client";

import {createWalletClient, custom, getAddress, type Address} from "viem";
import {harmonyOne} from "viem/chains";
import {appConfig} from "@/lib/config";
import {generateCommitSecret, removeCommitment, saveCommitment, type CommitJournalEntry} from "@/lib/commit-journal";
import {publicClient, registrarControllerAbi} from "@/lib/contracts/client";

declare global {
    interface Window {
        ethereum?: {request(args: {method: string; params?: unknown[]}): Promise<unknown>};
    }
}

function wallet() {
    if (!window.ethereum) throw new Error("No EVM wallet was found in this browser.");
    return createWalletClient({chain: harmonyOne, transport: custom(window.ethereum)});
}

async function connectedAccount(): Promise<Address> {
    const accounts = await window.ethereum?.request({method: "eth_requestAccounts"}) as string[] | undefined;
    if (!accounts?.[0]) throw new Error("No wallet account was selected.");
    return getAddress(accounts[0]);
}

function requireValidatedWrites() {
    if (!appConfig.writesEnabled) {
        throw new Error("Contract writes are disabled until Phase 0 evidence is approved.");
    }
}

async function requirePilotEligibility(account: Address, name: string) {
    const response = await fetch(`/api/pilot/eligibility?wallet=${encodeURIComponent(account)}&name=${encodeURIComponent(name)}`, {cache: "no-store"});
    const result = await response.json() as {eligible?: boolean; reason?: string};
    if (!response.ok || !result.eligible) throw new Error(result.reason ?? "This wallet is not eligible for official-app writes during the controlled pilot.");
}

export async function submitCommit(input: {label: string; durationSeconds: bigint}): Promise<CommitJournalEntry> {
    requireValidatedWrites();
    const client = wallet();
    const account = await connectedAccount();
    await requirePilotEligibility(account, `${input.label}.country`);
    const secret = generateCommitSecret();
    const commitment = await publicClient.readContract({
        address: appConfig.contractAddresses.registrarController,
        abi: registrarControllerAbi,
        functionName: "makeCommitment",
        args: [
            input.label,
            account,
            input.durationSeconds,
            secret,
            appConfig.contractAddresses.publicResolver,
            [],
            false,
            appConfig.ownerControlledFuses,
            BigInt(appConfig.wrapperExpiry)
        ]
    });
    const commitTxHash = await client.writeContract({
        address: appConfig.contractAddresses.registrarController,
        abi: registrarControllerAbi,
        functionName: "commit",
        args: [commitment],
        account
    });
    const entry: CommitJournalEntry = {
        id: crypto.randomUUID(),
        chainId: appConfig.chainId,
        account,
        name: `${input.label}.country`,
        label: input.label,
        commitment,
        secret,
        durationSeconds: input.durationSeconds.toString(),
        resolver: appConfig.contractAddresses.publicResolver,
        fuses: appConfig.ownerControlledFuses,
        wrapperExpiry: appConfig.wrapperExpiry,
        createdAt: new Date().toISOString(),
        minRegisterAt: null,
        commitTxHash,
        registerTxHash: null
    };
    saveCommitment(entry);
    return entry;
}

export async function submitRegister(entry: CommitJournalEntry): Promise<`0x${string}`> {
    requireValidatedWrites();
    const client = wallet();
    const account = await connectedAccount();
    if (account.toLowerCase() !== entry.account.toLowerCase()) throw new Error("Connect the same wallet that created this commitment.");
    await requirePilotEligibility(account, entry.name);
    const duration = BigInt(entry.durationSeconds);
    const price = await publicClient.readContract({
        address: appConfig.contractAddresses.registrarController,
        abi: registrarControllerAbi,
        functionName: "rentPrice",
        args: [entry.label, duration]
    });
    const hash = await client.writeContract({
        address: appConfig.contractAddresses.registrarController,
        abi: registrarControllerAbi,
        functionName: "register",
        args: [entry.label, account, duration, entry.secret, entry.resolver, [], false, entry.fuses, BigInt(entry.wrapperExpiry)],
        value: price.base + price.premium,
        account
    });
    const receipt = await publicClient.waitForTransactionReceipt({hash});
    if (receipt.status === "success") removeCommitment(entry.id);
    return hash;
}
