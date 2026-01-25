/**
 * Helper functions for JEM to Three.js conversion
 * Extracted from jemThreeJSConverter.ts to reduce file size
 */

import * as THREE from "three";
import { PIXELS_PER_UNIT } from "./jemConstants";
import { log } from "./jemUtilities";
import { applyUVs } from "./jemUVMapping";
import type { ParsedPart, ParsedBox } from "./jemLoader";

export function convertPart(
  part: ParsedPart,
  texture: THREE.Texture | null,
  textureMap: Record<string, THREE.Texture>,
  materialCache: Map<string, THREE.MeshStandardMaterial>,
  parentOrigin: [number, number, number] | null,
): THREE.Group {
  const group = new THREE.Group();
  group.name = part.name;
  if (part.invertAxis) {
    group.userData.invertAxis = part.invertAxis;
  }
  group.userData.originPx = [...part.origin];

  // Calculate local position
  let localX: number, localY: number, localZ: number;

  if (parentOrigin === null) {
    localX = part.origin[0] / PIXELS_PER_UNIT;
    localY = part.origin[1] / PIXELS_PER_UNIT;
    localZ = part.origin[2] / PIXELS_PER_UNIT;
  } else {
    localX = (part.origin[0] - parentOrigin[0]) / PIXELS_PER_UNIT;
    localY = (part.origin[1] - parentOrigin[1]) / PIXELS_PER_UNIT;
    localZ = (part.origin[2] - parentOrigin[2]) / PIXELS_PER_UNIT;
  }

  group.position.set(localX, localY, localZ);
  group.userData.restPosition = new THREE.Vector3(localX, localY, localZ);
  log.convert(part.name, part.origin, parentOrigin, [localX, localY, localZ]);

  // Rotation
  group.rotation.order = "ZYX";
  group.rotation.set(
    THREE.MathUtils.degToRad(part.rotation[0]),
    THREE.MathUtils.degToRad(part.rotation[1]),
    THREE.MathUtils.degToRad(part.rotation[2]),
  );

  // Scale
  if (part.scale !== 1.0) group.scale.setScalar(part.scale);

  const partTexture = textureMap[part.texturePath] ?? texture;

  const boxesGroup = new THREE.Group();
  group.userData.boxesGroup = boxesGroup;
  group.add(boxesGroup);

  for (let i = 0; i < part.boxes.length; i++) {
    const box = part.boxes[i];
    const mesh = createBoxMesh(
      box,
      partTexture,
      materialCache,
      part.origin,
      part.name,
      i,
    );
    if (mesh) boxesGroup.add(mesh);
  }

  // Children
  for (const child of part.children) {
    group.add(
      convertPart(child, texture, textureMap, materialCache, part.origin),
    );
  }

  return group;
}

export function createBoxMesh(
  box: ParsedBox,
  texture: THREE.Texture | null,
  materialCache: Map<string, THREE.MeshStandardMaterial>,
  groupOrigin: [number, number, number],
  partName: string,
  boxIndex: number,
): THREE.Mesh | null {
  const [x1, y1, z1] = box.from;
  const [x2, y2, z2] = box.to;

  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  const depth = Math.abs(z2 - z1);
  const EPS = 1e-6;
  const zeroX = width < EPS;
  const zeroY = height < EPS;
  const zeroZ = depth < EPS;
  const zeroCount = (zeroX ? 1 : 0) + (zeroY ? 1 : 0) + (zeroZ ? 1 : 0);
  if (zeroCount >= 2) return null;

  const planarAxis =
    box.planarAxis ??
    (zeroX ? "x" : zeroY ? "y" : zeroZ ? "z" : undefined);
  const isPlanar = !!planarAxis;
  if (!isPlanar && zeroCount > 0) return null;

  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  const centerZ = (z1 + z2) / 2;

  const meshX = (centerX - groupOrigin[0]) / PIXELS_PER_UNIT;
  const meshY = (centerY - groupOrigin[1]) / PIXELS_PER_UNIT;
  const meshZ = (centerZ - groupOrigin[2]) / PIXELS_PER_UNIT;

  const safeWidth = zeroX ? EPS : width;
  const safeHeight = zeroY ? EPS : height;
  const safeDepth = zeroZ ? EPS : depth;
  const geometry = new THREE.BoxGeometry(
    safeWidth / PIXELS_PER_UNIT,
    safeHeight / PIXELS_PER_UNIT,
    safeDepth / PIXELS_PER_UNIT,
  );

  let materials: THREE.MeshStandardMaterial[] = [];

  const isZeroFace = (uv: [number, number, number, number]) => uv.every((v) => v === 0);
  let uv = box.uv;
  if (isPlanar) {
    const copy = {
      east: [...uv.east] as typeof uv.east,
      west: [...uv.west] as typeof uv.west,
      up: [...uv.up] as typeof uv.up,
      down: [...uv.down] as typeof uv.down,
      south: [...uv.south] as typeof uv.south,
      north: [...uv.north] as typeof uv.north,
    };
    const pair = planarAxis === "x"
      ? (["east", "west"] as const)
      : planarAxis === "y"
        ? (["up", "down"] as const)
        : (["south", "north"] as const);
    const a = copy[pair[0]];
    const b = copy[pair[1]];
    if (isZeroFace(a) && !isZeroFace(b)) copy[pair[0]] = [...b] as typeof a;
    if (isZeroFace(b) && !isZeroFace(a)) copy[pair[1]] = [...a] as typeof b;
    uv = copy;
  }

  if (texture) {
    const faces = ["east", "west", "up", "down", "south", "north"] as const;
    materials = faces.map((face) => {
      const uvKey = `${partName}_${boxIndex}_${face}`;
      let mat = materialCache.get(uvKey);
      if (!mat) {
        // Use cutout rendering (alphaTest) instead of transparency to avoid
        // transparent sorting artifacts when rendering overlays on top.
        mat = new THREE.MeshStandardMaterial({
          map: texture.clone(),
          transparent: false,
          alphaTest: 0.01,
          depthWrite: true,
          depthTest: true,
        });
        mat.map!.needsUpdate = true;
        materialCache.set(uvKey, mat);
      }
      return mat;
    });
  } else {
    const mat = new THREE.MeshStandardMaterial({ color: 0xff00ff });
    materials = [mat, mat, mat, mat, mat, mat];
  }

  const texSize: [number, number] = texture
    ? [texture.image.width, texture.image.height]
    : box.textureSize;
  applyUVs(geometry, uv, texSize);

  if (isPlanar) {
    const keepFaces = planarAxis === "x"
      ? [0, 1]
      : planarAxis === "y"
        ? [2, 3]
        : [4, 5];
    const index = geometry.getIndex();
    if (index) {
      const src = Array.from(index.array as ArrayLike<number>);
      const filtered: number[] = [];
      geometry.clearGroups();
      let start = 0;
      for (const faceIndex of keepFaces) {
        const offset = faceIndex * 6;
        for (let i = 0; i < 6; i++) filtered.push(src[offset + i]!);
        geometry.addGroup(start, 6, faceIndex);
        start += 6;
      }
      geometry.setIndex(filtered);
    }
    for (const mat of materials) mat.side = THREE.DoubleSide;
  }

  const mesh = new THREE.Mesh(geometry, materials);
  mesh.name = `${partName}_box${boxIndex}`;
  mesh.position.set(meshX, meshY, meshZ);

  // Note: sizeAdd/inflate is already applied during JEM parsing to the box coordinates
  // (see jemParsing.ts parseBox function), so we don't need to apply it here as a scale.

  return mesh;
}
