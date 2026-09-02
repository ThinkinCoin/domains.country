function sameAddress(left, right) {
  return /^0x[0-9a-f]{40}$/i.test(left || "")
    && /^0x[0-9a-f]{40}$/i.test(right || "")
    && left.toLowerCase() === right.toLowerCase();
}

function check(id, passed, summary, evidence) {
  return { id, status: passed ? "PASS" : "FAIL", summary, evidence };
}

export function evaluateReplacementControllerPreflight(input) {
  const minimum = BigInt(input.minimumCommitmentAgeSeconds ?? 0);
  const maximum = BigInt(input.maximumCommitmentAgeSeconds ?? 0);
  const controller = input.controllerAddress;
  const registrarManifest = input.registrarManifest || {};
  const commitmentPolicy = input.commitmentPolicy || {};
  const resolverAuthorization = input.resolverAuthorization || {};
  const trustedControllerMatches = sameAddress(resolverAuthorization.trustedController, controller);
  const checks = [
    check("network.harmonyMainnet", input.chainId === 1666600000, "The preflight must read Harmony Mainnet chain ID 1666600000.", { chainId: input.chainId }),
    check("controller.bytecode", input.bytecodePresent === true, "The proposed controller must have deployed runtime bytecode.", { controller }),
    check("controller.baseExtension", input.baseExtension === "country", "The deployed TLD accessor must be baseExtension() == country.", { baseExtension: input.baseExtension }),
    check("controller.commitmentWindow", minimum > 0n && maximum > minimum, "The deployed commitment window must have a non-zero minimum and a maximum greater than the minimum.", { minimumCommitmentAgeSeconds: minimum.toString(), maximumCommitmentAgeSeconds: maximum.toString() }),
    check("nameWrapper.controller", input.nameWrapperControllerEnabled === true, "TLDNameWrapper must authorize the proposed controller.", { enabled: input.nameWrapperControllerEnabled }),
    check("baseRegistrar.wrapperController", input.baseRegistrarWrapperControllerEnabled === true, "BaseRegistrar must continue authorizing TLDNameWrapper for the wrapper-mediated flow.", { enabled: input.baseRegistrarWrapperControllerEnabled }),
    check("dc.controller", sameAddress(input.dcRegistrarController, controller), "DC must point to the same active RegistrarController used by the app before the six-contract relationship gate can pass.", { dcRegistrarController: input.dcRegistrarController, controller }),
    check("manifest.controllerAddress", sameAddress(registrarManifest.address, controller), "The versioned RegistrarController manifest record must use the proposed address.", { manifestAddress: registrarManifest.address, controller }),
    check("manifest.controllerBaseline", registrarManifest.source?.status === "VERIFIED" && registrarManifest.approval?.status === "APPROVED" && /^0x[0-9a-f]{64}$/i.test(registrarManifest.approvedBytecodeHash || ""), "The proposed controller needs verified source/deployment provenance and an approved runtime baseline.", { sourceStatus: registrarManifest.source?.status, approvalStatus: registrarManifest.approval?.status, approvedBytecodeHash: registrarManifest.approvedBytecodeHash }),
    check("manifest.controllerAbi", registrarManifest.abi?.status === "VERIFIED" && registrarManifest.abi?.baseAccessor === "baseExtension" && registrarManifest.abi?.expectedBaseExtension === "country", "The manifest ABI record must approve baseExtension() and country.", { abi: registrarManifest.abi || null }),
    check("manifest.commitmentPolicy", commitmentPolicy.status === "APPROVED" && sameAddress(commitmentPolicy.controllerAddress, controller) && BigInt(commitmentPolicy.minimumCommitmentAgeSeconds ?? 0) === minimum && BigInt(commitmentPolicy.maximumCommitmentAgeSeconds ?? 0) === maximum, "The approved commitment policy must bind the proposed controller and exact observed ages.", { commitmentPolicy }),
    check("manifest.resolverAuthorization", resolverAuthorization.status === "VERIFIED" && resolverAuthorization.postTransferDnsAuthorizationPolicy === "REQUERY_ON_CHAIN_OWNER_AND_PERMISSIONS" && (trustedControllerMatches || resolverAuthorization.initialRegistrationDnsDataPolicy === "EMPTY_DATA_ONLY"), "Resolver authorization must be verified; a non-trusted active controller requires empty initial DNS data and post-transfer on-chain permission re-query.", { trustedController: resolverAuthorization.trustedController, trustedControllerMatches, initialRegistrationDnsDataPolicy: resolverAuthorization.initialRegistrationDnsDataPolicy, postTransferDnsAuthorizationPolicy: resolverAuthorization.postTransferDnsAuthorizationPolicy }),
  ];
  return {
    decision: checks.every((item) => item.status === "PASS") ? "READY_FOR_PHASE_ZERO_REVIEW" : "BLOCKED",
    checks,
    blockers: checks.filter((item) => item.status === "FAIL"),
  };
}
