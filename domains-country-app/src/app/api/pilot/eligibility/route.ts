import {NextRequest} from "next/server";
import {json} from "@/lib/http";
import {getPilotEligibility} from "@/lib/services/pilot-eligibility";

export async function GET(request: NextRequest) {
    const wallet = request.nextUrl.searchParams.get("wallet") ?? "";
    const name = request.nextUrl.searchParams.get("name") ?? "";
    return json(await getPilotEligibility(wallet, name));
}
