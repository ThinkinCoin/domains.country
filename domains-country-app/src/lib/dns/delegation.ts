import {promises as dns} from "node:dns";
import {serverConfig} from "@/lib/server-config";

export type DelegationCheck = {
    domain: string;
    delegated: boolean;
    expectedNameservers: string[];
    observedNameservers: string[];
    detail: string;
};

function normalize(ns: string): string {
    return ns.trim().toLowerCase().replace(/\.$/, "");
}

export async function checkParentDelegation(domain: string): Promise<DelegationCheck> {
    const expected = serverConfig.powerDns.nameservers.map(normalize);
    try {
        const observed = (await dns.resolveNs(domain)).map(normalize);
        const delegated = expected.length > 0 && expected.every(ns => observed.includes(ns));
        return {
            domain,
            delegated,
            expectedNameservers: expected,
            observedNameservers: observed,
            detail: delegated ? "Parent delegation points at project-operated nameservers." : "Parent delegation does not match the project-operated nameserver set."
        };
    } catch (error) {
        return {
            domain,
            delegated: false,
            expectedNameservers: expected,
            observedNameservers: [],
            detail: error instanceof Error ? error.message : "Unable to resolve NS records."
        };
    }
}

export const delegationRequirement = "PowerDNS can answer publicly only after the parent .country zone delegates the second-level domain to project-operated nameservers; child-zone NS records do not create that delegation.";
