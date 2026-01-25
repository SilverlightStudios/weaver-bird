/**
 * Custom hook to compile Minecraft expressions for particle emission
 */
import { useMemo } from "react";
import { compileMinecraftExpr, type CompiledMinecraftExpr } from "@lib/particle/minecraftExpr";

function useCompiledTriplet(
  expr?: [string, string, string],
  blockProps?: Record<string, string>,
  loopIndexVar?: string,
) {
  return useMemo(() => {
    if (!expr) return null;
    const fns = expr.map((e) =>
      compileMinecraftExpr(e, blockProps, loopIndexVar),
    ) as Array<CompiledMinecraftExpr | null>;
    if (fns.some((f) => !f)) return null;
    return fns as [CompiledMinecraftExpr, CompiledMinecraftExpr, CompiledMinecraftExpr];
  }, [expr, blockProps, loopIndexVar]);
}

export function useCompiledExpressions(
  positionExpr?: [string, string, string],
  velocityExpr?: [string, string, string],
  probabilityExpr?: string,
  countExpr?: string,
  loopCountExpr?: string,
  blockProps?: Record<string, string>,
  loopIndexVar?: string,
) {
  const positionFns = useCompiledTriplet(positionExpr, blockProps, loopIndexVar);
  const velocityFns = useCompiledTriplet(velocityExpr, blockProps, loopIndexVar);

  const probabilityFn = useMemo(() => {
    if (!probabilityExpr) return null;
    return compileMinecraftExpr(probabilityExpr, blockProps, loopIndexVar);
  }, [probabilityExpr, blockProps, loopIndexVar]);

  const countFn = useMemo(() => {
    if (!countExpr) return null;
    return compileMinecraftExpr(countExpr, blockProps, loopIndexVar);
  }, [countExpr, blockProps, loopIndexVar]);

  const loopCountFn = useMemo(() => {
    if (!loopCountExpr) return null;
    return compileMinecraftExpr(loopCountExpr, blockProps, loopIndexVar);
  }, [loopCountExpr, blockProps, loopIndexVar]);

  const invalidExpressions = useMemo(() => {
    const probabilityInvalid = Boolean(probabilityExpr) && !probabilityFn;
    const countInvalid = Boolean(countExpr) && !countFn;
    const loopCountInvalid = Boolean(loopCountExpr) && !loopCountFn;

    return [
      positionExpr && !positionFns,
      velocityExpr && !velocityFns,
      probabilityInvalid,
      countInvalid,
      loopCountInvalid,
    ].some(Boolean);
  }, [
    positionExpr,
    positionFns,
    velocityExpr,
    velocityFns,
    probabilityExpr,
    probabilityFn,
    countExpr,
    countFn,
    loopCountExpr,
    loopCountFn,
  ]);

  return {
    positionFns,
    velocityFns,
    probabilityFn,
    countFn,
    loopCountFn,
    probabilityInvalid: Boolean(probabilityExpr) && !probabilityFn,
    countInvalid: Boolean(countExpr) && !countFn,
    loopCountInvalid: Boolean(loopCountExpr) && !loopCountFn,
    invalidExpressions,
  };
}
