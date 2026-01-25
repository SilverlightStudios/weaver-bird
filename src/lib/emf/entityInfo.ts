/**
 * Helper functions for extracting entity information from asset IDs
 */

function getShulkerBoxBlockColor(path: string): string | null {
  const normalizedPath = path.replace(/\.png$/i, "");
  if (normalizedPath === "block/shulker_box") return "";
  const match = normalizedPath.match(/^block\/(.+)_shulker_box$/);
  return match ? match[1] ?? "" : null;
}

export function getEntityTextureAssetId(assetId: string): string {
  const normalized = (assetId.includes(":") ? assetId : `minecraft:${assetId}`)
    .replace(/\.png$/i, "");
  const [namespace, rawPath] = normalized.split(":");
  const path = rawPath ?? "";

  if (path.startsWith("entity/") || path.startsWith("chest/")) {
    return normalized;
  }

  const shulkerColor = getShulkerBoxBlockColor(path);
  if (shulkerColor !== null) {
    const suffix = shulkerColor ? `_${shulkerColor}` : "";
    return `${namespace}:entity/shulker/shulker${suffix}`;
  }

  return normalized;
}

export function isEntityTexture(assetId: string): boolean {
  if (assetId.includes("entity/")) {
    const match = assetId.match(/entity\/(.+)/);

    if (!match || !match[1] || match[1].trim() === "") {
      return false;
    }

    return true;
  }

  if (assetId.includes("chest/")) {
    const match = assetId.match(/chest\/(.+)/);
    if (!match || !match[1] || match[1].trim() === "") {
      return false;
    }
    return true;
  }

  if (assetId.includes("shulker_box/")) {
    const match = assetId.match(/shulker_box\/(.+)/);
    if (!match || !match[1] || match[1].trim() === "") {
      return false;
    }
    return true;
  }

  const path = assetId.replace(/^minecraft:/, "");
  return getShulkerBoxBlockColor(path) !== null;
}

interface EntityInfo {
  variant: string;
  parent: string | null;
}

function handleChestEntity(path: string): EntityInfo | null {
  if (!path.includes("chest/")) return null;
  if (path.includes("trapped")) return { variant: "trapped_chest", parent: null };
  if (path.includes("ender")) return { variant: "ender_chest", parent: null };
  return { variant: "chest", parent: null };
}

function handleShulkerBoxEntity(path: string): EntityInfo | null {
  if (path.includes("shulker_box/")) {
    return { variant: "shulker_box", parent: null };
  }
  if (getShulkerBoxBlockColor(path) !== null) {
    return { variant: "shulker_box", parent: null };
  }
  return null;
}

function handleEquipmentEntity(segments: string[]): EntityInfo {
  const kind = segments[1] ?? "";
  const lower = kind.toLowerCase();

  if (lower.includes("humanoid_leggings") || lower.includes("leggings")) {
    return { variant: "armor_layer_2", parent: null };
  }
  if (lower.includes("humanoid")) {
    return { variant: "armor_layer_1", parent: null };
  }

  if (lower.includes("_saddle") || lower.endsWith("saddle")) {
    return { variant: lower, parent: null };
  }
  if (lower.includes("_harness") || lower.endsWith("harness")) {
    return { variant: lower, parent: null };
  }

  if (lower.includes("horse")) return { variant: "horse_armor", parent: null };
  if (lower.includes("wolf")) return { variant: "wolf_armor", parent: null };

  return { variant: lower, parent: null };
}

function handleSignsEntity(segments: string[]): EntityInfo {
  const woodType = segments[segments.length - 1];
  const signType = segments.length === 3 ? `_${segments[1]}_sign` : "_sign";
  return {
    variant: `${woodType}${signType}`,
    parent: "signs",
  };
}

function handleChestSegments(segments: string[]): EntityInfo {
  const leaf = segments[segments.length - 1] ?? "";
  const normalizedLeaf = leaf.replace(/_(left|right)$/, "");

  if (normalizedLeaf.includes("trapped")) {
    return { variant: "trapped_chest", parent: null };
  }
  if (normalizedLeaf.includes("ender")) {
    return { variant: "ender_chest", parent: null };
  }
  return { variant: "chest", parent: null };
}

function processSegments(segments: string[]): EntityInfo | null {
  if (segments.length === 1) {
    if (segments[0] === "banner_base") {
      return { variant: "banner", parent: null };
    }
    return { variant: segments[0], parent: null };
  }

  if (segments[0] === "banner") return { variant: "banner", parent: null };
  if (segments[0] === "chest") return handleChestSegments(segments);
  if (segments[0] === "decorated_pot") return { variant: "decorated_pot", parent: null };
  if (segments[0] === "equipment") return handleEquipmentEntity(segments);
  if (segments[0] === "signs") return handleSignsEntity(segments);

  const variant = segments[segments.length - 1];
  let parent = segments[0];

  if (variant.includes("mooshroom")) {
    parent = "mooshroom";
  }

  if (parent === "boat" && variant === "bamboo") {
    return { variant: "raft", parent: null };
  }
  if (parent === "chest_boat" && variant === "bamboo") {
    return { variant: "chest_raft", parent: null };
  }

  return { variant, parent };
}

export function getEntityInfoFromAssetId(assetId: string): EntityInfo | null {
  const path = assetId.replace(/^minecraft:/, "");

  const match = path.match(/entity\/(.+)/);
  if (!match) {
    return handleChestEntity(path) ?? handleShulkerBoxEntity(path);
  }

  const fullPath = match[1];
  const segments = fullPath.split("/");
  return processSegments(segments);
}

export function getEntityTypeFromAssetId(assetId: string): string | null {
  const info = getEntityInfoFromAssetId(assetId);
  return info?.variant ?? null;
}

export function getEntityVariants(assetId: string): string[] {
  const info = getEntityInfoFromAssetId(assetId);
  if (!info) return [];

  if (info.variant.includes("_hanging_sign")) {
    return ["wall", "ceiling", "ceiling_middle"];
  }

  return [];
}
