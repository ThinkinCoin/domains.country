import { Resolver, resolve4, resolve6 } from "node:dns/promises";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildDnsDelegationEvidence } from "../api/_lib/phase-zero/dns-delegation-capture.js";

const DNS_OVER_HTTPS_URL = "https://cloudflare-dns.com/dns-query?name=country&type=NS";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function required(name) {
  const value = argument(name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function normalizedNameservers(value) {
  return [...new Set(value.split(",").map((item) => item.trim().replace(/\.$/, "").toLowerCase()).filter(Boolean))];
}

function isoTimestamp(name, fallback = null) {
  const value = argument(name) || fallback;
  if (!value || !Number.isFinite(Date.parse(value))) throw new Error(`${name} must be an ISO-8601 timestamp.`);
  return new Date(value).toISOString();
}

async function addressesFor(hostname) {
  const [ipv4, ipv6] = await Promise.all([resolve4(hostname).catch(() => []), resolve6(hostname).catch(() => [])]);
  const addresses = [...ipv4, ...ipv6];
  if (!addresses.length) throw new Error(`No A or AAAA address was found for ${hostname}.`);
  return addresses;
}

async function resolverFor(hostname) {
  const resolver = new Resolver();
  resolver.setServers(await addressesFor(hostname));
  return resolver;
}

async function discoveredParentNameservers() {
  const response = await fetch(DNS_OVER_HTTPS_URL, {
    headers: { Accept: "application/dns-json" },
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json();
  if (!response.ok || payload.Status !== 0) throw new Error(`DNS-over-HTTPS parent lookup returned status ${payload.Status ?? response.status}.`);
  const nameservers = [...new Set((payload.Answer || []).filter((answer) => answer.type === 2).map((answer) => String(answer.data).replace(/\.$/, "").toLowerCase()))];
  if (!nameservers.length) throw new Error("DNS-over-HTTPS parent lookup returned no .country nameservers.");
  return nameservers;
}

async function parentDelegation(nameserver, probeDomain) {
  const resolver = await resolverFor(nameserver);
  const delegatedNameservers = await resolver.resolveNs(probeDomain);
  return {
    nameserver,
    delegatedNameservers: delegatedNameservers.map((value) => value.replace(/\.$/, "").toLowerCase()),
    observedAt: new Date().toISOString(),
  };
}

async function projectSoa(nameserver, probeDomain) {
  const addresses = await addressesFor(nameserver);
  const resolver = new Resolver();
  resolver.setServers(addresses);
  const soa = await resolver.resolveSoa(probeDomain);
  return {
    nameserver,
    endpoint: addresses[0],
    soa: {
      nsname: soa.nsname.replace(/\.$/, "").toLowerCase(),
      hostmaster: soa.hostmaster.replace(/\.$/, "").toLowerCase(),
      serial: String(soa.serial),
    },
    observedAt: new Date().toISOString(),
  };
}

const probeDomain = required("--probe-domain").replace(/\.$/, "").toLowerCase();
const projectNameservers = normalizedNameservers(required("--project-nameservers"));
const parentNameservers = argument("--parent-nameservers")
  ? normalizedNameservers(argument("--parent-nameservers"))
  : await discoveredParentNameservers();
const verifiedBy = required("--verified-by");
const reference = required("--reference");
const outputPath = resolve(required("--output"));
if (projectNameservers.length !== 3) throw new Error("--project-nameservers must list exactly three distinct nameservers.");
if (!parentNameservers.length) throw new Error("At least one parent nameserver is required.");

const [parentResponses, projectSoaResponses] = await Promise.all([
  Promise.all(parentNameservers.map((nameserver) => parentDelegation(nameserver, probeDomain))),
  Promise.all(projectNameservers.map((nameserver) => projectSoa(nameserver, probeDomain))),
]);
const evidence = buildDnsDelegationEvidence({
  probeDomain,
  projectNameservers,
  parentResponses,
  projectSoaResponses,
  verifiedBy,
  verifiedAt: isoTimestamp("--verified-at", new Date().toISOString()),
  reference,
});

await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Collected DNS delegation evidence: ${outputPath}`);
console.log(`probeDomain=${evidence.probeDomain}`);
console.log(`parentAuthorities=${evidence.parentResponses.length}`);
console.log(`evidenceSha256=${evidence.evidenceSha256}`);
console.log("This is REVIEW_READY evidence only. It does not prove parent-control authorization or enable writes.");
