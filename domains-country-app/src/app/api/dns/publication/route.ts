import {NextRequest} from "next/server";
import {db} from "@/lib/db";
import {checkParentDelegation, delegationRequirement} from "@/lib/dns/delegation";
import {json} from "@/lib/http";
import {parseCountryDomain} from "@/lib/names";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const name = request.nextUrl.searchParams.get("name") ?? "";
    const parsed = parseCountryDomain(name);
    if (!parsed.ok) return json({error: parsed.reason}, {status: 400});
    const [delegation, domain] = await Promise.all([
        checkParentDelegation(parsed.name),
        db.domain.findUnique({where: {name: parsed.name}, include: {publishedZone: true, onChainStates: {orderBy: {version: "desc"}, take: 1}}})
    ]);
    return json({delegationRequirement, delegation, onChain: domain?.onChainStates[0] ?? null, publishedZone: domain?.publishedZone ?? null});
}
