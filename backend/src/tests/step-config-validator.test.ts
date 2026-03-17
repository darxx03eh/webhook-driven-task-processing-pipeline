import { describe, expect, it } from "vitest";
import { AppError } from "../errors/app-error";
import {
  validateStepConfigByType,
  validateStepType,
} from "../utils/step-config-validator";

describe("step config validator", () => {
  it("accepts supported step types", () => {
    expect(() => validateStepType("filter")).not.toThrow();
    expect(() => validateStepType("transform")).not.toThrow();
    expect(() => validateStepType("enrich_http")).not.toThrow();
  });

  it("rejects unsupported step type", () => {
    expect(() => validateStepType("unknown")).toThrow(AppError);
  });

  it("accepts valid filter config", () => {
    expect(() =>
      validateStepConfigByType("filter", {
        field: "price",
        operator: ">",
        value: 20,
      })
    ).not.toThrow();
  });

  it("rejects transform config with no actions", () => {
    expect(() => validateStepConfigByType("transform", {})).toThrow(AppError);
  });

  it("rejects enrich_http config with invalid url", () => {
    expect(() =>
      validateStepConfigByType("enrich_http", {
        url: "ftp://example.com",
      })
    ).toThrow(AppError);
  });
});
