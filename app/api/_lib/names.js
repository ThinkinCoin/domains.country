const INVALID_LABEL_CHARACTERS = /[.\s\u0000-\u001F\u007F]/u;
const MAX_LABEL_BYTES = 128;

export function parseCountryDomain(input) {
  const normalized = String(input || "").trim().toLowerCase().replace(/\.$/, "");
  const label = normalized.endsWith(".country") ? normalized.slice(0, -".country".length) : normalized;

  const byteLength = new TextEncoder().encode(label).length;
  if (!label || INVALID_LABEL_CHARACTERS.test(label) || byteLength > MAX_LABEL_BYTES) {
    return {
      ok: false,
      reason: "Use a non-empty .country label without dots, spaces, control characters, or more than 128 bytes. Unicode and emoji labels are supported.",
    };
  }

  return { ok: true, label, name: `${label}.country` };
}

export function canonicalDomainName(input) {
  const parsed = parseCountryDomain(input);
  return parsed.ok ? parsed.name : String(input || "").trim().toLowerCase();
}
