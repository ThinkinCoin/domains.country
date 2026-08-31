import {createHash, randomBytes} from "node:crypto";
import {NextRequest} from "next/server";
import {getAddress, isAddress} from "viem";
import {db} from "@/lib/db";
import {json} from "@/lib/http";
import {isConfiguredOperator} from "@/lib/security/allowlist";

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null) as {address?: string} | null;
    if (!body?.address || !isAddress(body.address) || !isConfiguredOperator(body.address)) {
        return json({error: "This wallet is not configured as an admin operator."}, {status: 403});
    }
    const wallet = getAddress(body.address);
    const nonce = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const message = `domains.country admin authentication\nWallet: ${wallet}\nNonce: ${nonce}\nExpires: ${expiresAt.toISOString()}`;
    await db.adminChallenge.create({
        data: {wallet, message, nonceHash: createHash("sha256").update(nonce).digest("hex"), expiresAt}
    });
    return json({message, expiresAt: expiresAt.toISOString()});
}
