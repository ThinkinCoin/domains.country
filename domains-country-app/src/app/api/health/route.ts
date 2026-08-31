import {json} from "@/lib/http";
import {phaseZeroRequired, validateConfiguredContracts} from "@/lib/contracts/validation";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const contracts = await validateConfiguredContracts();
        return json({ok: contracts.every(contract => contract.bytecodePresent), phaseZeroRequired, contracts});
    } catch (error) {
        return json({ok: false, error: error instanceof Error ? error.message : "Health check failed."}, {status: 503});
    }
}
