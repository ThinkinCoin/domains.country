import {NextRequest} from "next/server";
import {json} from "@/lib/http";
import {requireAdmin} from "@/lib/security/session";
import {listAllowlistEntries, upsertAllowlistEntry} from "@/lib/services/allowlist-service";

export async function GET() {
    try {
        await requireAdmin();
        return json({entries: await listAllowlistEntries()});
    } catch (error) {
        return json({error: error instanceof Error ? error.message : "Unauthorized."}, {status: 401});
    }
}

export async function POST(request: NextRequest) {
    try {
        const actor = await requireAdmin();
        const body = await request.json() as {wallet?: string; domainName?: string | null; enabled?: boolean; note?: string | null};
        if (!body.wallet || typeof body.enabled !== "boolean") return json({error: "wallet and enabled are required."}, {status: 400});
        return json({entry: await upsertAllowlistEntry({...body, wallet: body.wallet, enabled: body.enabled, actor})});
    } catch (error) {
        return json({error: error instanceof Error ? error.message : "Unable to update allowlist."}, {status: 401});
    }
}
