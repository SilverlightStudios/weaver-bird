import * as THREE from "three";
import { DEBUG_JEM } from "./jemConstants";

export const fmt = (v: number[], d = 2): string =>
  `[${v.map((n) => n.toFixed(d)).join(", ")}]`;

export const log = {
  section: (msg: string) => {
    if (DEBUG_JEM)
      console.log(`\n${"=".repeat(60)}\n${msg}\n${"=".repeat(60)}`);
  },
  parse: (
    name: string,
    depth: number,
    translate: number[],
    origin: number[],
    isRoot: boolean,
  ) => {
    if (!DEBUG_JEM) return;
    const indent = "  ".repeat(depth);
    const type = isRoot ? "ROOT" : "SUB";
    console.log(
      `${indent}[PARSE:${type}] "${name}" translate=${fmt(translate)} → origin=${fmt(origin)}`,
    );
  },
  box: (
    _name: string,
    depth: number,
    rawFrom: number[],
    rawTo: number[],
    adjFrom: number[],
    adjTo: number[],
  ) => {
    if (!DEBUG_JEM) return;
    const indent = "  ".repeat(depth + 1);
    console.log(
      `${indent}[BOX] raw=[${fmt(rawFrom)}→${fmt(rawTo)}] adj=[${fmt(adjFrom)}→${fmt(adjTo)}]`,
    );
  },
  convert: (
    name: string,
    origin: number[],
    parentOrigin: number[] | null,
    localPos: number[],
  ) => {
    if (!DEBUG_JEM) return;
    const pStr = parentOrigin ? ` parent=${fmt(parentOrigin)}` : "";
    console.log(
      `[THREE] "${name}" origin=${fmt(origin)}${pStr} → local=${fmt(localPos, 4)}`,
    );
  },
  mesh: (name: string, boxIdx: number, center: number[], meshPos: number[]) => {
    if (!DEBUG_JEM) return;
    console.log(
      `  [MESH] "${name}"[${boxIdx}] center=${fmt(center)} → pos=${fmt(meshPos, 4)}`,
    );
  },
  hierarchy: (root: THREE.Group) => {
    if (!DEBUG_JEM) return;
    console.log(`\n[FINAL HIERARCHY]`);
    const logNode = (obj: THREE.Object3D, depth: number) => {
      const indent = "  ".repeat(depth);
      const p = obj.position;
      const w = new THREE.Vector3();
      obj.getWorldPosition(w);
      const type = obj instanceof THREE.Mesh ? "MESH" : "GROUP";
      console.log(
        `${indent}${type} "${obj.name}" local=[${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)}] world=[${w.x.toFixed(3)}, ${w.y.toFixed(3)}, ${w.z.toFixed(3)}]`,
      );
      obj.children.forEach((c) => logNode(c, depth + 1));
    };
    logNode(root, 0);
  },
};
