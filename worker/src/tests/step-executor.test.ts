import { afterEach, describe, expect, it, vi } from "vitest";
import { executePipelineSteps } from "../services/step-executor.service";

describe("executePipelineSteps", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("stops pipeline when filter step fails", async () => {
        const result = await executePipelineSteps(
            { price: 10 },
            [
                {
                    id: "step-1",
                    stepOrder: 1,
                    stepType: "filter",
                    stepConfig: { field: "price", operator: ">", value: 20 }
                }
            ]
        );

        expect(result.stopped).toBe(true);
        if (result.stopped) {
            expect(result.status).toBe("filterd_out");
            expect(result.stopReason).toContain("Filter condition failed");
        }
    });

    it("applies transform step (rename/add/remove)", async () => {
        const result = await executePipelineSteps(
            { first_name: "Mahmoud", internalNote: "debug" },
            [
                {
                    id: "step-1",
                    stepOrder: 1,
                    stepType: "transform",
                    stepConfig: {
                        rename: { first_name: "firstName" },
                        add: { source: "webhook" },
                        remove: ["internalNote"]
                    }
                }
            ]
        );

        expect(result.stopped).toBe(false);
        if (!result.stopped) {
            expect(result.payload).toEqual({
                firstName: "Mahmoud",
                source: "webhook"
            });
        }
    });

    it("applies enrich_http step and merges fetched response", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({ country: "US" })
        });

        vi.stubGlobal("fetch", fetchMock);

        const result = await executePipelineSteps(
            { ip: "8.8.8.8" },
            [
                {
                    id: "step-1",
                    stepOrder: 1,
                    stepType: "enrich_http",
                    stepConfig: {
                        url: "https://ipinfo.io/{{ip}}/json",
                        method: "GET",
                        timeoutMs: 5000
                    }
                }
            ]
        );

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://ipinfo.io/8.8.8.8/json",
            expect.objectContaining({ method: "GET" })
        );

        expect(result.stopped).toBe(false);
        if (!result.stopped) {
            expect(result.payload).toEqual({ ip: "8.8.8.8", country: "US" });
        }
    });
});