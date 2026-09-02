import assert from "node:assert/strict";
import test from "node:test";
import { evaluateReplacementControllerPreflight } from "./replacement-controller-preflight.js";

const controller = "0x1111111111111111111111111111111111111111";

function completeInput() {
  return {
    chainId: 1666600000,
    controllerAddress: controller,
    bytecodePresent: true,
    baseExtension: "country",
    minimumCommitmentAgeSeconds: "60",
    maximumCommitmentAgeSeconds: "3600",
    nameWrapperControllerEnabled: true,
    baseRegistrarWrapperControllerEnabled: true,
    dcRegistrarController: controller,
    registrarManifest: {
      address: controller,
      approvedBytecodeHash: `0x${"aa".repeat(32)}`,
      source: { status: "VERIFIED" },
      approval: { status: "APPROVED" },
      abi: { status: "VERIFIED", baseAccessor: "baseExtension", expectedBaseExtension: "country" },
    },
    commitmentPolicy: { status: "APPROVED", controllerAddress: controller, minimumCommitmentAgeSeconds: 60, maximumCommitmentAgeSeconds: 3600 },
    resolverAuthorization: { status: "VERIFIED", trustedController: "0x2222222222222222222222222222222222222222", initialRegistrationDnsDataPolicy: "EMPTY_DATA_ONLY", postTransferDnsAuthorizationPolicy: "REQUERY_ON_CHAIN_OWNER_AND_PERMISSIONS" },
  };
}

test("replacement controller preflight passes only with safe runtime, relationships, and approved records", () => {
  const result = evaluateReplacementControllerPreflight(completeInput());
  assert.equal(result.decision, "READY_FOR_PHASE_ZERO_REVIEW", JSON.stringify(result.blockers));
});

test("replacement controller preflight blocks the current zero-minimum window", () => {
  const result = evaluateReplacementControllerPreflight({ ...completeInput(), minimumCommitmentAgeSeconds: "0", maximumCommitmentAgeSeconds: "120" });
  assert.equal(result.decision, "BLOCKED");
  assert.equal(result.blockers.some((item) => item.id === "controller.commitmentWindow"), true);
  assert.equal(result.blockers.some((item) => item.id === "manifest.commitmentPolicy"), true);
});

test("replacement controller preflight blocks stale contract relationships and unsafe resolver policy", () => {
  const result = evaluateReplacementControllerPreflight({
    ...completeInput(),
    nameWrapperControllerEnabled: false,
    dcRegistrarController: "0x3333333333333333333333333333333333333333",
    resolverAuthorization: { status: "VERIFIED", trustedController: "0x2222222222222222222222222222222222222222", initialRegistrationDnsDataPolicy: "TRUSTED_CONTROLLER_DATA", postTransferDnsAuthorizationPolicy: "REQUERY_ON_CHAIN_OWNER_AND_PERMISSIONS" },
  });
  assert.equal(result.decision, "BLOCKED");
  assert.equal(result.blockers.some((item) => item.id === "nameWrapper.controller"), true);
  assert.equal(result.blockers.some((item) => item.id === "dc.controller"), true);
  assert.equal(result.blockers.some((item) => item.id === "manifest.resolverAuthorization"), true);
});
