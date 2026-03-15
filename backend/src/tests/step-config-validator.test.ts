import { describe, expect, it } from "vitest";
import { validateStepConfigByType, validateStepType } from "../utils/step-config-validator";
import { AppError } from "../errors/app-error";

describe("validateStepType", () => {
    it("accepts supported step types", () => {
        expect(() => validateStepType("filter")).not.toThrow();
        expect(() => validateStepType("transform")).not.toThrow();
        expect(() => validateStepType("enrich_http")).not.toThrow();
    });

    it("throws AppError for unsupported step type", () => {
        try {
            validateStepType("unknown_step");
            throw new Error("Expected validateStepType to throw");
        } catch (error) {
            expect(error).toBeInstanceOf(AppError);
            const appError = error as AppError;
            expect(appError.code).toBe("INVALID_STEP_TYPE");
            expect(appError.statusCode).toBe(400);
        }
    });
});

describe("validateStepConfigByType", () => {
    it("accepts valid filter config", () => {
        expect(() =>
            validateStepConfigByType("filter", {
                field: "price",
                operator: ">",
                value: 20
            })
        ).not.toThrow();
    });

    it("rejects invalid transform config with no operations", () => {
        expect(() => validateStepConfigByType("transform", {})).toThrow(AppError);
    });

    it("rejects invalid enrich_http url", () => {
        expect(() =>
            validateStepConfigByType("enrich_http", {
                url: "ftp://example.com",
                method: "GET"
            })
        ).toThrow(AppError);
    });
});