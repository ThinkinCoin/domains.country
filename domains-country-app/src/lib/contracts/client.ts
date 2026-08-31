import {createPublicClient, http, keccak256, namehash, stringToBytes} from "viem";
import {harmonyOne} from "viem/chains";
import {appConfig} from "@/lib/config";
import {baseRegistrarAbi, nameWrapperAbi, publicResolverAbi, registrarControllerAbi} from "@/lib/contracts/abis";

export const publicClient = createPublicClient({
    chain: harmonyOne,
    transport: http(appConfig.rpcUrl)
});

export function labelToTokenId(label: string): bigint {
    // Mirrors the legacy DC contract: uint256(keccak256(bytes(name))).
    return BigInt(keccak256(stringToBytes(label)));
}

export function domainNode(name: string): `0x${string}` {
    return namehash(name.endsWith(".country") ? name : `${name}.country`);
}

export async function getAvailability(label: string): Promise<boolean> {
    return publicClient.readContract({
        address: appConfig.contractAddresses.registrarController,
        abi: registrarControllerAbi,
        functionName: "available",
        args: [label]
    });
}

export async function getRentPrice(label: string, duration = appConfig.defaultDurationSeconds) {
    const price = await publicClient.readContract({
        address: appConfig.contractAddresses.registrarController,
        abi: registrarControllerAbi,
        functionName: "rentPrice",
        args: [label, duration]
    });
    return {base: price.base, premium: price.premium, total: price.base + price.premium};
}

export async function getBaseRegistrarExpiration(label: string): Promise<bigint | null> {
    try {
        return await publicClient.readContract({
            address: appConfig.contractAddresses.baseRegistrar,
            abi: baseRegistrarAbi,
            functionName: "nameExpires",
            args: [labelToTokenId(label)]
        });
    } catch {
        return null;
    }
}

export async function getResolverTtl(name: string): Promise<number | null> {
    try {
        const ttl = await publicClient.readContract({
            address: appConfig.contractAddresses.publicResolver,
            abi: publicResolverAbi,
            functionName: "ttl",
            args: [domainNode(name)]
        });
        return Number(ttl);
    } catch {
        return null;
    }
}

export {baseRegistrarAbi, nameWrapperAbi, publicResolverAbi, registrarControllerAbi};
