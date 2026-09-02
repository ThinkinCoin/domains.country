import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedOrigin } from "../src/cors.js";

const origins = ["https://domains.country", "https://dev.domains.country", "https://preview.example.vercel.app"];

test("allows no browser origin and exact configured origins", () => {
  assert.equal(isAllowedOrigin(undefined, origins), true);
  assert.equal(isAllowedOrigin("https://domains.country", origins), true);
  assert.equal(isAllowedOrigin("https://preview.example.vercel.app", origins), true);
});

test("rejects unlisted origins without wildcard matching", () => {
  assert.equal(isAllowedOrigin("https://untrusted.example.vercel.app", origins), false);
  assert.equal(isAllowedOrigin("https://evil-domains.country", origins), false);
});
