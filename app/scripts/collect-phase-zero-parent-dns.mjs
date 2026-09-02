import { createHash } from "node:crypto";
import { Resolver, resolve4, resolve6 } from "node:dns/promises";
import { writeFile } from "node:fs/promises";

const TLD = "country";
const IANA_RECORD_URL = "https://www.iana.org/domains/root/db/country.html";
const DNS_OVER_HTTPS_URL = "https://cloudflare-dns.com/dns-query?name=country&type=NS";
const outputPath = new URL("../docs/phase-0-parent-dns-snapshot.json", import.meta.url);

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value) {
  return sha256(JSON.stringify(canonical(value)));
}

function normalizeNameservers(values) {
  return [...new Set((values || []).map((value) => String(value).replace(/\.$/, "").toLowerCase()))].sort();
}

function plainText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ianaField(text, label) {
  const labels = ["Sponsoring Organisation", "Administrative Contact", "Technical Contact", "Name Servers", "URLs", "IANA Reports"];
  const nextLabel = labels.filter((item) => item !== label).join("|");
  const match = text.match(new RegExp(label + "\\s+([^]+?)(?=\\s+(?:" + nextLabel + ")\\b|$)", "i"));
  return match ? match[1].trim() : null;
}

async function nameserverAddresses(hostname) {
  const [ipv4, ipv6] = await Promise.all([
    resolve4(hostname).catch(() => []),
    resolve6(hostname).catch(() => []),
  ]);
  const addresses = [...ipv4, ...ipv6];
  if (!addresses.length) throw new Error("No A or AAAA address was found for " + hostname + ".");
  return addresses;
}

async function directSoa(nameserver) {
  const resolver = new Resolver();
  resolver.setServers(await nameserverAddresses(nameserver));
  const soa = await resolver.resolveSoa(TLD);
  return {
    nameserver,
    nsname: soa.nsname,
    hostmaster: soa.hostmaster,
    serial: String(soa.serial),
    refresh: soa.refresh,
    retry: soa.retry,
    expire: soa.expire,
    minttl: soa.minttl,
  };
}

const [ianaResponse, dnsResponse] = await Promise.all([
  fetch(IANA_RECORD_URL, { headers: { Accept: "text/html" }, signal: AbortSignal.timeout(15_000) }),
  fetch(DNS_OVER_HTTPS_URL, { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(15_000) }),
]);
if (!ianaResponse.ok) throw new Error("IANA delegation record returned HTTP " + ianaResponse.status + ".");
if (!dnsResponse.ok) throw new Error("DNS-over-HTTPS lookup returned HTTP " + dnsResponse.status + ".");

const [ianaHtml, dnsPayload] = await Promise.all([ianaResponse.text(), dnsResponse.json()]);
if (dnsPayload.Status !== 0) throw new Error("DNS-over-HTTPS status " + dnsPayload.Status + ".");
const ianaText = plainText(ianaHtml);
const parentNameservers = normalizeNameservers((dnsPayload.Answer || []).filter((answer) => answer.type === 2).map((answer) => answer.data));
if (!parentNameservers.length) throw new Error("DNS-over-HTTPS response contained no NS records for .country.");

const authorities = await Promise.all(parentNameservers.map(directSoa));
const serials = [...new Set(authorities.map((authority) => authority.serial))];
const snapshot = {
  schemaVersion: 1,
  status: "DISCOVERY_ONLY",
  generatedAt: new Date().toISOString(),
  tld: "." + TLD,
  iana: {
    url: IANA_RECORD_URL,
    responseSha256: sha256(ianaHtml),
    sponsoringOrganisation: ianaField(ianaText, "Sponsoring Organisation"),
    technicalContact: ianaField(ianaText, "Technical Contact"),
  },
  recursiveDiscovery: {
    url: DNS_OVER_HTTPS_URL,
    responseSha256: sha256(JSON.stringify(dnsPayload)),
    parentNameservers,
  },
  authoritativeSoa: authorities,
  consistentSoaSerial: serials.length === 1 ? serials[0] : null,
  approvalBoundary: "This snapshot confirms public registry metadata and current parent DNS responses only. It does not prove project credentials, an authenticated child-delegation mechanism, project-controlled nameservers, a delegated probe domain, or PowerDNS rollback.",
};
const output = { ...snapshot, snapshotSha256: sha256Json(snapshot) };
await writeFile(outputPath, JSON.stringify(output, null, 2) + "\n");
console.log("Phase 0 parent DNS snapshot written: " + outputPath.pathname);
console.log("snapshotSha256=" + output.snapshotSha256);
console.log("sponsoringOrganisation=" + (output.iana.sponsoringOrganisation || "unparsed"));
console.log("technicalContact=" + (output.iana.technicalContact || "unparsed"));
console.log("parentNameservers=" + output.recursiveDiscovery.parentNameservers.join(","));
console.log("consistentSoaSerial=" + (output.consistentSoaSerial || "MISMATCH"));
