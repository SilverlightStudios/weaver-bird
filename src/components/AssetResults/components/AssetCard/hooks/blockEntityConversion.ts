/**
 * Utilities for converting block asset IDs to entity asset IDs
 * Some blocks (chests, signs, beds, etc.) are rendered as entities in Minecraft
 */

export function convertChestBlockToEntity(blockName: string, namespace: string): string {
  let prefix = blockName === "chest" ? "normal" : blockName.replace(/_chest$/, "");
  prefix = prefix.replace(/^waxed_/, "");
  const copperMatch = prefix.match(/^(exposed|weathered|oxidized)_copper$/);
  if (copperMatch) {
    prefix = `copper_${copperMatch[1]}`;
  }
  return `${namespace}:entity/chest/${prefix}`;
}

export function convertShulkerBoxToEntity(blockName: string, namespace: string): string {
  const color = blockName === "shulker_box" ? "" : blockName.replace(/_shulker_box$/, "");
  const shulkerSuffix = color ? `shulker_${color}` : "shulker";
  return `${namespace}:entity/shulker/${shulkerSuffix}`;
}

export function convertBedBlockToEntity(blockName: string, namespace: string): string {
  const color = blockName.replace(/_bed$/, "");
  return `${namespace}:entity/bed/${color}`;
}

export function convertSignBlockToEntity(blockName: string, namespace: string): string {
  if (blockName.endsWith("_wall_hanging_sign")) {
    const wood = blockName.replace(/_wall_hanging_sign$/, "");
    return `${namespace}:entity/signs/hanging/${wood}`;
  }
  if (blockName.endsWith("_hanging_sign")) {
    const wood = blockName.replace(/_hanging_sign$/, "");
    return `${namespace}:entity/signs/hanging/${wood}`;
  }
  if (blockName.endsWith("_wall_sign")) {
    const wood = blockName.replace(/_wall_sign$/, "");
    return `${namespace}:entity/signs/${wood}`;
  }
  const wood = blockName.replace(/_sign$/, "");
  return `${namespace}:entity/signs/${wood}`;
}

export function convertBannerBlockToEntity(namespace: string): string {
  return `${namespace}:entity/banner_base`;
}

export function convertDecoratedPotToEntity(namespace: string): string {
  return `${namespace}:entity/decorated_pot/decorated_pot_base`;
}

export function isEntityBlock(assetId: string): boolean {
  const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
  const normalizedPath = path.replace(/^block\/break\//, "block/");
  if (!normalizedPath.startsWith("block/")) return false;

  const blockName = normalizedPath.slice("block/".length);

  return (
    blockName === "chest" ||
    blockName.endsWith("_chest") ||
    blockName.endsWith("_shulker_box") ||
    blockName === "shulker_box" ||
    blockName.endsWith("_bed") ||
    blockName.endsWith("_sign") ||
    blockName.endsWith("_hanging_sign") ||
    blockName.endsWith("_banner") ||
    blockName === "decorated_pot"
  );
}

export function convertBlockToEntityAssetId(assetId: string): string {
  if (!isEntityBlock(assetId)) return assetId;

  const namespace = assetId.includes(":") ? assetId.split(":")[0]! : "minecraft";
  const path = assetId.includes(":") ? assetId.split(":")[1]! : assetId;
  const normalizedPath = path.replace(/^block\/break\//, "block/");
  const blockName = normalizedPath.slice("block/".length);

  if (blockName === "chest" || blockName.endsWith("_chest")) {
    return convertChestBlockToEntity(blockName, namespace);
  }
  if (blockName === "shulker_box" || blockName.endsWith("_shulker_box")) {
    return convertShulkerBoxToEntity(blockName, namespace);
  }
  if (blockName.endsWith("_bed")) {
    return convertBedBlockToEntity(blockName, namespace);
  }
  if (blockName.endsWith("_sign") || blockName.endsWith("_hanging_sign")) {
    return convertSignBlockToEntity(blockName, namespace);
  }
  if (blockName.endsWith("_wall_banner") || blockName.endsWith("_banner")) {
    return convertBannerBlockToEntity(namespace);
  }
  if (blockName === "decorated_pot") {
    return convertDecoratedPotToEntity(namespace);
  }

  return assetId;
}
