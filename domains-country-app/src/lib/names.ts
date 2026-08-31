const LABEL_PATTERN = /^(?=.{3,63}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export type ParsedDomainName = {ok: true; label: string; name: string} | {ok: false; reason: string};

export function parseCountryDomain(input: string): ParsedDomainName {
    const normalized = input.trim().toLowerCase().replace(/\.$/, "");
    const label = normalized.endsWith(".country") ? normalized.slice(0, -".country".length) : normalized;

    if (!LABEL_PATTERN.test(label)) {
        return {ok: false, reason: "Use 3–63 lowercase letters, digits, or hyphens; a label cannot begin or end with a hyphen."};
    }
    return {ok: true, label, name: `${label}.country`};
}

export function canonicalZoneName(name: string): string {
    return name.endsWith(".") ? name : `${name}.`;
}
