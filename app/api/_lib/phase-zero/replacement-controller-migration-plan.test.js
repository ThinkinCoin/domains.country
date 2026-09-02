import assert from "node:assert/strict";
import test from "node:test";
import { buildReplacementControllerMigrationPlan, REVERSE_REGISTRAR_ADDRESS } from "./replacement-controller-migration-plan.js";

const addresses = {
  proposedController: "0x1111111111111111111111111111111111111111",
  currentController: "0x2222222222222222222222222222222222222222",
  nameWrapper: "0x3333333333333333333333333333333333333333",
  dc: "0x4444444444444444444444444444444444444444",
  owners: {
    nameWrapper: "0x5555555555555555555555555555555555555555",
    reverseRegistrar: "0x6666666666666666666666666666666666666666",
    dc: "0x7777777777777777777777777777777777777777",
  },
};

test("builds unsigned migration calldata for a replacement controller", () => {
  const plan = buildReplacementControllerMigrationPlan(addresses);
  assert.equal(plan.status, "UNSIGNED_MIGRATION_PLAN");
  assert.equal(plan.reverseRegistrar, REVERSE_REGISTRAR_ADDRESS);
  assert.deepEqual(plan.requiredCalls.map((call) => call.id), [
    "nameWrapper.enableReplacementController",
    "reverseRegistrar.enableReplacementController",
    "dc.pointToReplacementController",
  ]);
  assert.equal(plan.requiredCalls[0].data.slice(0, 10), "0xe0dba60f");
  assert.equal(plan.requiredCalls[1].data.slice(0, 10), "0xe0dba60f");
  assert.equal(plan.requiredCalls[2].data.slice(0, 10), "0x29448e1d");
  assert.equal(plan.requiredCalls.every((call) => call.required === true && call.value === "0"), true);
  assert.equal(plan.deferredCalls.every((call) => call.required === false), true);
  assert.match(plan.safety.join(" "), /never signs or sends transactions/i);
});

test("rejects a no-op or invalid replacement controller plan", () => {
  assert.throws(() => buildReplacementControllerMigrationPlan({ ...addresses, proposedController: addresses.currentController }), /must differ/);
  assert.throws(() => buildReplacementControllerMigrationPlan({ ...addresses, proposedController: "not-an-address" }), /proposedController/);
});
