export const registrarControllerAbi = [
    {type: "function", name: "available", stateMutability: "view", inputs: [{name: "name", type: "string"}], outputs: [{type: "bool"}]},
    {type: "function", name: "rentPrice", stateMutability: "view", inputs: [{name: "name", type: "string"}, {name: "duration", type: "uint256"}], outputs: [{type: "tuple", components: [{name: "base", type: "uint256"}, {name: "premium", type: "uint256"}]}]},
    {type: "function", name: "makeCommitment", stateMutability: "view", inputs: [{name: "name", type: "string"}, {name: "owner", type: "address"}, {name: "duration", type: "uint256"}, {name: "secret", type: "bytes32"}, {name: "resolver", type: "address"}, {name: "data", type: "bytes[]"}, {name: "reverseRecord", type: "bool"}, {name: "fuses", type: "uint32"}, {name: "wrapperExpiry", type: "uint64"}], outputs: [{type: "bytes32"}]},
    {type: "function", name: "commit", stateMutability: "nonpayable", inputs: [{name: "commitment", type: "bytes32"}], outputs: []},
    {type: "function", name: "register", stateMutability: "payable", inputs: [{name: "name", type: "string"}, {name: "owner", type: "address"}, {name: "duration", type: "uint256"}, {name: "secret", type: "bytes32"}, {name: "resolver", type: "address"}, {name: "data", type: "bytes[]"}, {name: "reverseRecord", type: "bool"}, {name: "fuses", type: "uint32"}, {name: "wrapperExpiry", type: "uint64"}], outputs: []},
    {type: "function", name: "renew", stateMutability: "payable", inputs: [{name: "name", type: "string"}, {name: "duration", type: "uint256"}], outputs: []}
] as const;

export const baseRegistrarAbi = [
    {type: "function", name: "ownerOf", stateMutability: "view", inputs: [{name: "tokenId", type: "uint256"}], outputs: [{type: "address"}]},
    {type: "function", name: "nameExpires", stateMutability: "view", inputs: [{name: "id", type: "uint256"}], outputs: [{type: "uint256"}]},
    {type: "function", name: "safeTransferFrom", stateMutability: "nonpayable", inputs: [{name: "from", type: "address"}, {name: "to", type: "address"}, {name: "tokenId", type: "uint256"}], outputs: []}
] as const;

export const nameWrapperAbi = [
    {type: "function", name: "ownerOf", stateMutability: "view", inputs: [{name: "tokenId", type: "uint256"}], outputs: [{type: "address"}]},
    {type: "function", name: "TLD_NODE", stateMutability: "view", inputs: [], outputs: [{type: "bytes32"}]},
    {type: "function", name: "getData", stateMutability: "view", inputs: [{name: "id", type: "uint256"}], outputs: [{name: "owner", type: "address"}, {name: "fuses", type: "uint32"}, {name: "expiry", type: "uint64"}]},
    {type: "function", name: "safeTransferFrom", stateMutability: "nonpayable", inputs: [{name: "from", type: "address"}, {name: "to", type: "address"}, {name: "id", type: "uint256"}, {name: "amount", type: "uint256"}, {name: "data", type: "bytes"}], outputs: []}
] as const;

export const publicResolverAbi = [
    {type: "function", name: "ttl", stateMutability: "view", inputs: [{name: "node", type: "bytes32"}], outputs: [{type: "uint64"}]},
    {type: "function", name: "setTTL", stateMutability: "nonpayable", inputs: [{name: "node", type: "bytes32"}, {name: "ttl", type: "uint64"}], outputs: []},
    {type: "function", name: "setDNSRecords", stateMutability: "nonpayable", inputs: [{name: "node", type: "bytes32"}, {name: "data", type: "bytes"}], outputs: []},
    {type: "function", name: "dnsRecord", stateMutability: "view", inputs: [{name: "node", type: "bytes32"}, {name: "name", type: "bytes32"}, {name: "resource", type: "uint16"}], outputs: [{type: "bytes"}]}
] as const;
