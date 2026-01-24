/**
 * Runtime helper functions for compiled Minecraft expressions
 */

import type { MinecraftExprContext } from "./minecraftExpr";

export interface RuntimeHelpers {
  randInt: (n?: number) => number;
  floormod: (a: number, b: number) => number;
  dirstepx: (value: number) => number;
  dirstepy: (value: number) => number;
  dirstepz: (value: number) => number;
  dircwstepx: (value: number) => number;
  dircwstepy: (value: number) => number;
  dircwstepz: (value: number) => number;
  age: number;
  lifetime: number;
  axisX: (param: number) => boolean;
  axisY: (param: number) => boolean;
  axisZ: (param: number) => boolean;
  dirStepX: (param: number) => number;
  dirStepY: (param: number) => number;
  dirStepZ: (param: number) => number;
  blockPosX: (param: number) => number;
  blockPosY: (param: number) => number;
  blockPosZ: (param: number) => number;
}

export function createRuntimeHelpers(
  rand: () => number,
  context?: MinecraftExprContext,
): RuntimeHelpers {
  const randInt = (n?: number) => {
    if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return 0;
    return Math.floor(rand() * n);
  };

  const floormod = (a: number, b: number) => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
    const ai = Math.trunc(a);
    const bi = Math.trunc(b);
    return ((ai % bi) + bi) % bi;
  };

  const dirIndex = (value: number) => floormod(value, 4);
  const dirSteps = [
    { x: 0, z: 1 }, // south
    { x: -1, z: 0 }, // west
    { x: 0, z: -1 }, // north
    { x: 1, z: 0 }, // east
  ];

  const dirstepx = (value: number) => dirSteps[dirIndex(value)].x;
  const dirstepy = (_value: number) => 0;
  const dirstepz = (value: number) => dirSteps[dirIndex(value)].z;
  const dircwstepx = (value: number) => dirstepx(value + 1);
  const dircwstepy = (_value: number) => 0;
  const dircwstepz = (value: number) => dirstepz(value + 1);

  const age = typeof context?.age === "number" && Number.isFinite(context.age)
    ? context.age
    : 0;
  const lifetime = typeof context?.lifetime === "number" && Number.isFinite(context.lifetime)
    ? context.lifetime
    : 1;
  const safeLifetime = lifetime <= 0 ? 1 : lifetime;

  // Direction.Axis enum: X=0, Y=1, Z=2
  // Return false to use random fallback in preview mode
  const axisX = (_param: number): boolean => false;
  const axisY = (_param: number): boolean => false;
  const axisZ = (_param: number): boolean => false;

  // Direction steps: DOWN=0, UP=1, NORTH=2, SOUTH=3, WEST=4, EAST=5
  const directionSteps = [
    { x: 0, y: -1, z: 0 },  // DOWN
    { x: 0, y: 1, z: 0 },   // UP
    { x: 0, y: 0, z: -1 },  // NORTH
    { x: 0, y: 0, z: 1 },   // SOUTH
    { x: -1, y: 0, z: 0 },  // WEST
    { x: 1, y: 0, z: 0 },   // EAST
  ];

  const getRandomHorizontalDir = () => {
    const dirs = [2, 3, 4, 5];
    return dirs[Math.floor(rand() * dirs.length)];
  };

  const dirStepX = (param: number): number => {
    const idx = param === 0 ? getRandomHorizontalDir() : Math.floor(param) % 6;
    return idx >= 0 && idx < 6 ? directionSteps[idx].x : 0;
  };
  const dirStepY = (param: number): number => {
    const idx = param === 0 ? getRandomHorizontalDir() : Math.floor(param) % 6;
    return idx >= 0 && idx < 6 ? directionSteps[idx].y : 0;
  };
  const dirStepZ = (param: number): number => {
    const idx = param === 0 ? getRandomHorizontalDir() : Math.floor(param) % 6;
    return idx >= 0 && idx < 6 ? directionSteps[idx].z : 0;
  };

  // BlockPos methods return 0 in preview (blocks centered at origin)
  const blockPosX = (_param: number): number => 0;
  const blockPosY = (_param: number): number => 0;
  const blockPosZ = (_param: number): number => 0;

  return {
    randInt,
    floormod,
    dirstepx,
    dirstepy,
    dirstepz,
    dircwstepx,
    dircwstepy,
    dircwstepz,
    age,
    lifetime: safeLifetime,
    axisX,
    axisY,
    axisZ,
    dirStepX,
    dirStepY,
    dirStepZ,
    blockPosX,
    blockPosY,
    blockPosZ,
  };
}
