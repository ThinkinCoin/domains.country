import {decodeFunctionResult, encodeFunctionData, getAddress, isAddress} from "viem";
import {appConfig} from "@/lib/config";
import {publicClient, publicResolverAbi, registrarControllerAbi} from "@/lib/contracts/client";

export type ContractCheck = {
    component: string;
    address: string;
    bytecodePresent: boolean;
    callable: boolean;
    detail: string;
};

export async function validateConfiguredContracts(): Promise<ContractCheck[]> {
    const components = Object.entries(appConfig.contractAddresses);
    return Promise.all(components.map(async ([component, address]) => {
        const code = await publicClient.getCode({address});
        return {
            component,
            address,
            bytecodePresent: Boolean(code && code !== "0x"),
            callable: false,
            detail: code && code !== "0x" ? "Bytecode found; ABI and permissions require Phase 0 confirmation." : "No bytecode found at configured address."
        };
    }));
}

export async function probeRegistrarAvailability(label: string): Promise<ContractCheck> {
    const address = appConfig.contractAddresses.registrarController;
    try {
        const data = encodeFunctionData({abi: registrarControllerAbi, functionName: "available", args: [label]});
        const result = await publicClient.call({to: address, data});
        decodeFunctionResult({abi: registrarControllerAbi, functionName: "available", data: result.data ?? "0x"});
        return {component: "registrarController.available", address, bytecodePresent: true, callable: true, detail: "availability call decoded"};
    } catch (error) {
        return {component: "registrarController.available", address, bytecodePresent: true, callable: false, detail: error instanceof Error ? error.message : "availability call failed"};
    }
}

export function validateAddressInput(address: string): `0x${string}` | null {
    return isAddress(address) ? getAddress(address) : null;
}

export const phaseZeroRequired = "Writes and DNS publication remain disabled until contract bytecode, ABI compatibility, permissions, commitment timing, resolver support, parent delegation, and PowerDNS rollback tests are approved.";
