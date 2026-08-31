import {NextRequest, NextResponse} from "next/server";
import {getAddress, isAddress, verifyMessage} from "viem";
import {db} from "@/lib/db";
import {json} from "@/lib/http";
import {isConfiguredOperator} from "@/lib/security/allowlist";
import {adminCookie, createAdminSession} from "@/lib/security/session";

export async function POST(request: NextRequest) {
    const body = await request.json().catch(() => null) as {address?: string; message?: string; signature?: `0x${string}`} | null;
    if (!body?.address || !body.message || !body.signature || !isAddress(body.address) || !isConfiguredOperator(body.address)) {
        return json({error: "Invalid operator authentication request."}, {status: 400});
    }
    const wallet = getAddress(body.address);
    const challenge = await db.adminChallenge.findFirst({where: {wallet, message: body.message, usedAt: null, expiresAt: {gt: new Date()}}, orderBy: {createdAt: "desc"}});
    if (!challenge) return json({error: "Authentication challenge expired or was already used."}, {status: 401});

    const verified = await verifyMessage({address: wallet, message: body.message, signature: body.signature});
    if (!verified) return json({error: "Wallet signature could not be verified."}, {status: 401});

    await db.$transaction([
        db.adminChallenge.update({where: {id: challenge.id}, data: {usedAt: new Date()}}),
        db.auditLog.create({data: {actor: wallet, action: "admin_login", targetType: "admin_session", targetId: challenge.id}})
    ]);
    const response = NextResponse.json({ok: true, address: wallet});
    response.cookies.set(adminCookie.name, createAdminSession(wallet), adminCookie.options);
    return response;
}
