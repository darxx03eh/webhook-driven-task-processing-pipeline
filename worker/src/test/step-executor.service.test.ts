import { afterEach, describe, expect, it, vi } from "vitest";
import { executePipelineSteps } from "../services/step-executor.service";

describe("executePipelineSteps", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("stops the pipeline when filter condition fails", async () => {
    const result = await executePipelineSteps(
      { price: 10, product: "pizza" },
      [
        {
          id: "s1",
          stepOrder: 1,
          stepType: "filter",
          stepConfig: {
            field: "price",
            operator: ">",
            value: 20,
          },
        },
      ]
    );

    expect(result.stopped).toBe(true);
    if (result.stopped) {
      expect(result.status).toBe("filterd_out");
      expect(result.stopReason).toContain("price > 20");
    }
  });

  it("applies transform rename/add/remove operations", async () => {
    const result = await executePipelineSteps(
      { product: "pizza", price: 75, internalNote: "remove-me" },
      [
        {
          id: "s1",
          stepOrder: 1,
          stepType: "transform",
          stepConfig: {
            rename: { product: "itemName" },
            add: { source: "webhook" },
            remove: ["internalNote"],
          },
        },
      ]
    );

    expect(result.stopped).toBe(false);
    if (!result.stopped) {
      expect(result.payload).toEqual({
        itemName: "pizza",
        price: 75,
        source: "webhook",
      });
    }
  });

  it("merges enrich_http response into payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ country: "US", org: "Google" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await executePipelineSteps(
      { ip: "8.8.8.8" },
      [
        {
          id: "s1",
          stepOrder: 1,
          stepType: "enrich_http",
          stepConfig: {
            url: "https://ipinfo.io/{{ip}}/json",
            method: "GET",
            timeoutMs: 5000,
          },
        },
      ]
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ipinfo.io/8.8.8.8/json",
      expect.objectContaining({ method: "GET" })
    );
    expect(result.stopped).toBe(false);
    if (!result.stopped) {
      expect(result.payload).toEqual({
        ip: "8.8.8.8",
        country: "US",
        org: "Google",
      });
    }
  });
});
