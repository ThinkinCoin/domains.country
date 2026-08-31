import {describe, expect, it} from "vitest";
import {validateDnsRecord} from "../src/lib/dns/records";

describe("DNS record validation", () => {
    it("accepts supported A records", () => {
        expect(validateDnsRecord({host: "@", type: "A", value: "192.0.2.10", ttl: 300}).ok).toBe(true);
    });

    it("rejects unsupported IPv4 values", () => {
        expect(validateDnsRecord({host: "@", type: "A", value: "999.0.2.10", ttl: 300}).ok).toBe(false);
    });

    it("rejects unsafe TTL values", () => {
        expect(validateDnsRecord({host: "www", type: "CNAME", value: "example.country.", ttl: 1}).ok).toBe(false);
    });
});
