import { Resolver, lookup } from "node:dns/promises";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildPowerDnsRollbackEvidence, sha256Bytes } from "../api/_lib/phase-zero/powerdns-rollback-capture.js";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function required(name) {
  const value = argument(name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function isoTimestamp(name, fallback = null) {
  const value = argument(name) || fallback;
  if (!value || !Number.isFinite(Date.parse(value))) throw new Error(`${name} must be an ISO-8601 timestamp.`);
  return new Date(value).toISOString();
}

async function directSoa(nameserver, zoneName) {
  const addresses = await lookup(nameserver, { all: true });
  const address = addresses[0];
  if (!address) throw new Error(`No IP address resolved for nameserver ${nameserver}.`);
  const resolver = new Resolver();
  resolver.setServers([address.address]);
  const soa = await resolver.resolveSoa(zoneName);
  return {
    nameserver: nameserver.replace(/\.$/, ""),
    endpoint: address.address,
    soaSerial: String(soa.serial),
    observedAt: new Date().toISOString(),
  };
}

const zoneName = required("--zone").replace(/\.$/, "");
const lastValidRevision = required("--last-valid-revision");
const failedCandidateRevision = required("--failed-candidate-revision");
const lastValidSoaSerial = required("--last-valid-soa-serial");
const verifiedBy = required("--verified-by");
const reference = required("--reference");
const nameservers = required("--nameservers").split(",").map((value) => value.trim().replace(/\.$/, "")).filter(Boolean);
const zonePath = resolve(required("--last-valid-zone"));
const failurePath = resolve(required("--failure-output"));
const outputPath = resolve(required("--output"));
if (nameservers.length !== 3 || new Set(nameservers.map((value) => value.toLowerCase())).size !== 3) {
  throw new Error("--nameservers must list exactly three distinct nameservers separated by commas.");
}

const [zoneBytes, failureBytes] = await Promise.all([readFile(zonePath), readFile(failurePath)]);
if (zoneBytes.length === 0) throw new Error("--last-valid-zone must not be empty.");
if (failureBytes.length === 0) throw new Error("--failure-output must not be empty.");
const authoritativeResponses = await Promise.all(nameservers.map((nameserver) => directSoa(nameserver, zoneName)));
const servedSoaSerial = authoritativeResponses[0]?.soaSerial || null;
const evidence = buildPowerDnsRollbackEvidence({
  zoneName,
  lastValidRevision,
  failedCandidateRevision,
  lastValidZoneSha256: sha256Bytes(zoneBytes),
  failedPublicationErrorSha256: sha256Bytes(failureBytes),
  lastValidSoaSerial,
  servedSoaSerial,
  attemptedAt: isoTimestamp("--attempted-at"),
  verifiedAt: isoTimestamp("--verified-at", new Date().toISOString()),
  verifiedBy,
  reference,
  authoritativeResponses,
});

await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`Collected PowerDNS rollback evidence: ${outputPath}`);
console.log(`evidenceSha256=${evidence.evidenceSha256}`);
console.log(`servedSoaSerial=${evidence.servedSoaSerial}`);
console.log("This is REVIEW_READY evidence only. It does not approve the manifest or enable writes.");
