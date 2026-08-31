import {createHmac, timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";
import {getAddress} from "viem";
import {isConfiguredOperator} from "@/lib/security/allowlist";

const COOKIE_NAME = "domains-country-admin";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret(): string {
    const value = process.env.ADMIN_SESSION_SECRET;
    if (!value || value.length < 32) throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
    return value;
}

function sign(value: string): string {
    return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createAdminSession(address: string): string {
    const payload = Buffer.from(JSON.stringify({address: getAddress(address), exp: Date.now() + MAX_AGE_SECONDS * 1000})).toString("base64url");
    return `${payload}.${sign(payload)}`;
}

export function parseAdminSession(value: string | undefined): string | null {
    if (!value) return null;
    const [payload, signature] = value.split(".");
    if (!payload || !signature) return null;
    const expected = sign(payload);
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    try {
        const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {address: string; exp: number};
        return decoded.exp > Date.now() && isConfiguredOperator(decoded.address) ? getAddress(decoded.address) : null;
    } catch {
        return null;
    }
}

export async function requireAdmin(): Promise<string> {
    const jar = await cookies();
    const address = parseAdminSession(jar.get(COOKIE_NAME)?.value);
    if (!address) throw new Error("Unauthorized admin session.");
    return address;
}

export const adminCookie = {
    name: COOKIE_NAME,
    options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        path: "/",
        maxAge: MAX_AGE_SECONDS
    }
};
