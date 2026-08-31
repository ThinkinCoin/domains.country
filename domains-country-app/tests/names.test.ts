import {describe, expect, it} from "vitest";
import {parseCountryDomain} from "../src/lib/names";

describe("country domain parsing", () => {
    it("normalizes bare labels", () => {
        expect(parseCountryDomain("Example")).toEqual({ok: true, label: "example", name: "example.country"});
    });

    it("normalizes fully qualified .country names", () => {
        expect(parseCountryDomain("Example.country.")).toEqual({ok: true, label: "example", name: "example.country"});
    });

    it("rejects labels that cannot be registered", () => {
        expect(parseCountryDomain("-bad.country").ok).toBe(false);
    });
});
