export function json(data: unknown, init?: ResponseInit): Response {
    return new Response(JSON.stringify(data, (_, value) => typeof value === "bigint" ? value.toString() : value), {
        ...init,
        headers: {"Content-Type": "application/json; charset=utf-8", ...init?.headers}
    });
}
