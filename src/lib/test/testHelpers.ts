import type { TestResult } from "./test-core";

export function createErrorResult(
  assetId: string,
  start: number,
  error: string,
  errorCode: string,
  errorDetails?: unknown,
): TestResult {
  return {
    assetId,
    success: false,
    duration: Date.now() - start,
    error,
    errorCode,
    errorDetails,
  };
}

export function createSuccessResult(
  assetId: string,
  start: number,
  packId: string,
  blockStateId: string,
  modelCount: number,
  elementCount: number,
): TestResult {
  return {
    assetId,
    success: true,
    duration: Date.now() - start,
    packId,
    blockStateId,
    modelCount,
    elementCount,
  };
}

export function handleError(err: unknown): { message: string; code: string } {
  const errorObj = err as { code?: string; message?: string; details?: unknown };
  return {
    message: errorObj.message ?? String(err),
    code: errorObj.code ?? "UNKNOWN_ERROR",
  };
}
