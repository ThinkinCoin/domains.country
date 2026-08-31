import {getDomainSummary} from "@/lib/services/domain-summary";
import {json} from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_: Request, {params}: {params: Promise<{name: string}>}) {
    const {name} = await params;
    return json(await getDomainSummary(decodeURIComponent(name)));
}
