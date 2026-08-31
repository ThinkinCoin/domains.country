const encoder = new TextEncoder();

function uint16(value) {
  return [(value >> 8) & 0xff, value & 0xff];
}

function uint32(value) {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

export function encodeDnsName(value) {
  const labels = value.replace(/\.$/, "").split(".").filter(Boolean);
  const output = [];
  for (const label of labels) {
    const bytes = [...encoder.encode(label)];
    if (bytes.length > 63) throw new Error("DNS label exceeds 63 bytes.");
    output.push(bytes.length, ...bytes);
  }
  output.push(0);
  return output;
}

export function encodeDnsRecord({ name, type, ttl, rdata }) {
  const data = Array.isArray(rdata) ? rdata : [...rdata];
  return Uint8Array.from([...encodeDnsName(name), ...uint16(type), ...uint16(1), ...uint32(ttl), ...uint16(data.length), ...data]);
}

export function dnsValidationFixtures(domain = "phase0-probe.country") {
  const target = encodeDnsName("target.example");
  const mname = encodeDnsName("ns1.example");
  const rname = encodeDnsName("hostmaster.example");
  const txt = [...encoder.encode("phase-zero")];
  return [
    { label: "A", type: 1, record: encodeDnsRecord({ name: domain, type: 1, ttl: 300, rdata: [203, 0, 113, 10] }) },
    { label: "CNAME", type: 5, record: encodeDnsRecord({ name: domain, type: 5, ttl: 300, rdata: target }) },
    { label: "NS", type: 2, record: encodeDnsRecord({ name: domain, type: 2, ttl: 300, rdata: encodeDnsName("ns1.example") }) },
    { label: "TXT", type: 16, record: encodeDnsRecord({ name: domain, type: 16, ttl: 300, rdata: [txt.length, ...txt] }) },
    { label: "SOA", type: 6, record: encodeDnsRecord({ name: domain, type: 6, ttl: 300, rdata: [...mname, ...rname, ...uint32(1), ...uint32(3600), ...uint32(600), ...uint32(86400), ...uint32(300)] }) },
    { label: "SRV", type: 33, record: encodeDnsRecord({ name: `_service._tcp.${domain}`, type: 33, ttl: 300, rdata: [...uint16(10), ...uint16(5), ...uint16(443), ...target] }) },
    { label: "DNAME", type: 39, record: encodeDnsRecord({ name: domain, type: 39, ttl: 300, rdata: target }) },
  ];
}
