import { encodeFunctionData, getAddress, isAddress } from "viem";

export const REVERSE_REGISTRAR_ADDRESS = "0x51e86d4cc8723FCa7014fd97C0aD0c737C86A2af";

const setControllerAbi = Object.freeze([
  {
    type: "function",
    name: "setController",
    stateMutability: "nonpayable",
    inputs: [
      { name: "controller", type: "address" },
      { name: "enabled", type: "bool" },
    ],
    outputs: [],
  },
]);

const setRegistrarControllerAbi = Object.freeze([
  {
    type: "function",
    name: "setRegistrarController",
    stateMutability: "nonpayable",
    inputs: [{ name: "_registrarController", type: "address" }],
    outputs: [],
  },
]);

function requireAddress(label, value) {
  if (!isAddress(value || "")) throw new Error(`${label} must be an EVM address.`);
  return getAddress(value);
}

function callRecord({ id, target, owner, abi, functionName, args, purpose, required }) {
  return {
    id,
    target,
    required,
    owner,
    functionName,
    args,
    data: encodeFunctionData({ abi, functionName, args }),
    value: "0",
    purpose,
  };
}

export function buildReplacementControllerMigrationPlan(input) {
  const proposedController = requireAddress("proposedController", input?.proposedController);
  const currentController = requireAddress("currentController", input?.currentController);
  const nameWrapper = requireAddress("nameWrapper", input?.nameWrapper);
  const dc = requireAddress("dc", input?.dc);
  const reverseRegistrar = requireAddress("reverseRegistrar", input?.reverseRegistrar || REVERSE_REGISTRAR_ADDRESS);
  if (proposedController === currentController) throw new Error("proposedController must differ from the current controller.");

  const nameWrapperOwner = input?.owners?.nameWrapper ? requireAddress("owners.nameWrapper", input.owners.nameWrapper) : null;
  const reverseRegistrarOwner = input?.owners?.reverseRegistrar ? requireAddress("owners.reverseRegistrar", input.owners.reverseRegistrar) : null;
  const dcOwner = input?.owners?.dc ? requireAddress("owners.dc", input.owners.dc) : null;

  const requiredCalls = [
    callRecord({
      id: "nameWrapper.enableReplacementController",
      target: nameWrapper,
      owner: nameWrapperOwner,
      abi: setControllerAbi,
      functionName: "setController",
      args: [proposedController, true],
      required: true,
      purpose: "Authorize the replacement RegistrarController in TLDNameWrapper for the wrapper-mediated registration flow.",
    }),
    callRecord({
      id: "reverseRegistrar.enableReplacementController",
      target: reverseRegistrar,
      owner: reverseRegistrarOwner,
      abi: setControllerAbi,
      functionName: "setController",
      args: [proposedController, true],
      required: true,
      purpose: "Authorize the replacement RegistrarController to set reverse records when users request them.",
    }),
    callRecord({
      id: "dc.pointToReplacementController",
      target: dc,
      owner: dcOwner,
      abi: setRegistrarControllerAbi,
      functionName: "setRegistrarController",
      args: [proposedController],
      required: true,
      purpose: "Keep DC's active tuple aligned with the app and six-contract Phase 0 relationship evidence.",
    }),
  ];

  const deferredCalls = [
    callRecord({
      id: "nameWrapper.disableOldControllerAfterCommitmentDrain",
      target: nameWrapper,
      owner: nameWrapperOwner,
      abi: setControllerAbi,
      functionName: "setController",
      args: [currentController, false],
      required: false,
      purpose: "Optional only after the owner confirms no user commitments remain valid on the old controller.",
    }),
    callRecord({
      id: "reverseRegistrar.disableOldControllerAfterCommitmentDrain",
      target: reverseRegistrar,
      owner: reverseRegistrarOwner,
      abi: setControllerAbi,
      functionName: "setController",
      args: [currentController, false],
      required: false,
      purpose: "Optional only after the owner confirms no reverse-record flows still depend on the old controller.",
    }),
  ];

  return {
    schemaVersion: 1,
    status: "UNSIGNED_MIGRATION_PLAN",
    proposedController,
    currentController,
    reverseRegistrar,
    requiredCalls,
    deferredCalls,
    postExecutionChecks: [
      "RegistrarController.baseExtension() == country",
      "RegistrarController.minCommitmentAge() > 0",
      "RegistrarController.maxCommitmentAge() > minCommitmentAge()",
      "TLDNameWrapper.controllers(proposedController) == true",
      "BaseRegistrar.controllers(TLDNameWrapper) == true",
      "DC.registrarController() == proposedController",
      "PublicResolver policy remains EMPTY_DATA_ONLY unless a new resolver/trusted controller is separately approved",
    ],
    safety: [
      "This plan contains calldata only. It never signs or sends transactions.",
      "Do not disable the old controller until pending commitments have expired or been handled.",
      "The Phase 0 gate remains BLOCKED until the deployed controller, permissions, manifest and Vercel evidence are revalidated.",
    ],
  };
}
