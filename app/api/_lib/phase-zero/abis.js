export const ownableAbi = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
];

export const registrarControllerValidationAbi = [
  { type: "function", name: "base", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "available", stateMutability: "view", inputs: [{ type: "string" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "rentPrice", stateMutability: "view", inputs: [{ type: "string" }, { type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "base", type: "uint256" }, { name: "premium", type: "uint256" }] }] },
  { type: "function", name: "minCommitmentAge", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "maxCommitmentAge", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "makeCommitment", stateMutability: "view", inputs: [{ type: "string" }, { type: "address" }, { type: "uint256" }, { type: "bytes32" }, { type: "address" }, { type: "bytes[]" }, { type: "bool" }, { type: "uint32" }, { type: "uint64" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "commit", stateMutability: "nonpayable", inputs: [{ type: "bytes32" }], outputs: [] },
  { type: "function", name: "register", stateMutability: "payable", inputs: [{ type: "string" }, { type: "address" }, { type: "uint256" }, { type: "bytes32" }, { type: "address" }, { type: "bytes[]" }, { type: "bool" }, { type: "uint32" }, { type: "uint64" }], outputs: [] },
  { type: "function", name: "renew", stateMutability: "payable", inputs: [{ type: "string" }, { type: "uint256" }], outputs: [] },
];

export const dcValidationAbi = [
  ...ownableAbi,
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "registrarController", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "nameWrapper", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "baseRegistrar", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "resolver", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "reverseRecord", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "fuses", stateMutability: "view", inputs: [], outputs: [{ type: "uint32" }] },
  { type: "function", name: "wrapperExpiry", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "duration", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
];

export const baseRegistrarValidationAbi = [
  ...ownableAbi,
  { type: "function", name: "baseNode", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "GRACE_PERIOD", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "controllers", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "nameExpires", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "getApproved", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "isApprovedForAll", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "bool" }] },
];

export const nameWrapperValidationAbi = [
  ...ownableAbi,
  { type: "function", name: "TLD_NODE", stateMutability: "view", inputs: [], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "getData", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ name: "owner", type: "address" }, { name: "fuses", type: "uint32" }, { name: "expiry", type: "uint64" }] },
  { type: "function", name: "getApproved", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "isApprovedForAll", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "canModifyName", stateMutability: "view", inputs: [{ type: "bytes32" }, { type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "allFusesBurned", stateMutability: "view", inputs: [{ type: "bytes32" }, { type: "uint32" }], outputs: [{ type: "bool" }] },
];

export const publicResolverValidationAbi = [
  ...ownableAbi,
  { type: "function", name: "supportsInterface", stateMutability: "view", inputs: [{ type: "bytes4" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "ttl", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint64" }] },
  { type: "function", name: "dnsRecord", stateMutability: "view", inputs: [{ type: "bytes32" }, { type: "bytes32" }, { type: "uint16" }], outputs: [{ type: "bytes" }] },
  { type: "function", name: "hasDNSRecords", stateMutability: "view", inputs: [{ type: "bytes32" }, { type: "bytes32" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "setDNSRecords", stateMutability: "nonpayable", inputs: [{ type: "bytes32" }, { type: "bytes" }], outputs: [] },
  { type: "function", name: "setTTL", stateMutability: "nonpayable", inputs: [{ type: "bytes32" }, { type: "uint64" }], outputs: [] },
];

export const ewsCandidateAbi = [
  ...ownableAbi,
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "resolver", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "nameWrapper", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "registrarController", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
];
