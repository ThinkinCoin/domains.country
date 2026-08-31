const LABEL_PATTERN = /^(?=.{3,63}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function parseCountryDomain(input) {
  const normalized = String(input || "").trim().toLowerCase().replace(/\.$/, "");
  const label = normalized.endsWith(".country") ? normalized.slice(0, -".country".length) : normalized;

  if (!LABEL_PATTERN.test(label)) {
    return {
      ok: false,
      reason: "Use 3-63 lowercase letters, digits, or hyphens; the name cannot begin or end with a hyphen.",
    };
  }

  return { ok: true, label, name: `${label}.country` };
}

export function canonicalDomainName(input) {
  const parsed = parseCountryDomain(input);
  return parsed.ok ? parsed.name : String(input || "").trim().toLowerCase();
}
