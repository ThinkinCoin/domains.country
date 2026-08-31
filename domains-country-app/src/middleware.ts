import {NextRequest, NextResponse} from "next/server";

function rpcOrigin(): string | null {
    try {
        return new URL(process.env.NEXT_PUBLIC_HARMONY_RPC_URL ?? "https://api.harmony.one").origin;
    } catch {
        return null;
    }
}

export function middleware(request: NextRequest) {
    const nonce = crypto.randomUUID().replaceAll("-", "");
    const rpc = rpcOrigin();
    const connectSources = ["'self'", rpc].filter(Boolean).join(" ");
    const csp = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
        "style-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        `connect-src ${connectSources}`,
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "worker-src 'self' blob:",
        "manifest-src 'self'"
    ].join("; ");

    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);

    const response = NextResponse.next({request: {headers}});
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return response;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
