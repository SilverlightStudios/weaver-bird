import type { AssetId } from "@state";
import type { EntityHandler, EntityHandlerResult, EntityFeatureControl } from "./types";
import { getSelect, stripNamespace, stableUnique } from "./utils";

function makeVillagerSelect(
  all: Set<AssetId>,
  ns: string,
  prefix: string,
  label: string,
  id: string,
  defaultValue: string,
  labelForValue?: (value: string) => string,
): Extract<EntityFeatureControl, { kind: "select" }> | null {
  const options: Array<{ value: string; label: string }> = [{ value: "none", label: "None" }];
  const values: string[] = [];
  for (const assetId of all) {
    if (!assetId.startsWith(`${ns}:${prefix}`)) continue;
    const path = stripNamespace(assetId);
    const leaf = path.split("/").pop();
    if (!leaf) continue;
    values.push(leaf);
  }
  for (const v of stableUnique(values)) {
    options.push({
      value: v,
      label:
        labelForValue?.(v) ?? v.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
    });
  }
  if (options.length <= 1) return null;
  const hasDefault = options.some((o) => o.value === defaultValue);
  return {
    kind: "select",
    id,
    label,
    defaultValue: hasDefault ? defaultValue : options[1]?.value ?? "none",
    options,
  };
}

function villagerLevelLabel(value: string): string {
  const map: Record<string, string> = {
    novice: "Stone",
    apprentice: "Iron",
    journeyman: "Gold",
    expert: "Emerald",
    master: "Diamond",
    stone: "Stone",
    iron: "Iron",
    gold: "Gold",
    emerald: "Emerald",
    diamond: "Diamond",
  };
  return map[value] ?? value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export const zombieVillagerHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, all, ns } = context;

  if (folderRoot !== "zombie_villager") return null;

  const controls = [];
  let zombieVillagerTypeDefault = "none";
  let zombieVillagerProfessionDefault = "none";
  let zombieVillagerLevelDefault = "none";

  const typeSelect = makeVillagerSelect(
    all,
    ns,
    "entity/zombie_villager/type/",
    "Villager Type",
    "zombie_villager.type",
    "plains",
  );
  if (typeSelect) {
    zombieVillagerTypeDefault = typeSelect.defaultValue;
    controls.push(typeSelect);
  }

  const profSelect = makeVillagerSelect(
    all,
    ns,
    "entity/zombie_villager/profession/",
    "Profession",
    "zombie_villager.profession",
    "none",
  );
  if (profSelect) {
    zombieVillagerProfessionDefault = profSelect.defaultValue;
    controls.push(profSelect);
  }

  const levelSelect = makeVillagerSelect(
    all,
    ns,
    "entity/zombie_villager/profession_level/",
    "Level",
    "zombie_villager.level",
    "none",
    villagerLevelLabel,
  );
  if (levelSelect) {
    zombieVillagerLevelDefault = levelSelect.defaultValue;
    controls.push(levelSelect);
  }

  if (controls.length === 0) return null;

  const getLayerContributions = (
    state: Parameters<NonNullable<EntityHandlerResult["getLayerContributions"]>>[0],
  ) => {
    const layers = [];

    const type = getSelect(state, "zombie_villager.type", zombieVillagerTypeDefault);
    if (type !== "none") {
      const tex = `${ns}:entity/zombie_villager/type/${type}` as AssetId;
      if (all.has(tex)) {
        layers.push({
          id: "zombie_villager_type",
          label: "Villager Type",
          kind: "cloneTexture" as const,
          textureAssetId: tex,
          blend: "normal" as const,
          zIndex: 80,
          opacity: 1,
          materialMode: { kind: "default" as const },
        });
      }
    }

    const prof = getSelect(state, "zombie_villager.profession", zombieVillagerProfessionDefault);
    if (prof !== "none") {
      const tex = `${ns}:entity/zombie_villager/profession/${prof}` as AssetId;
      if (all.has(tex)) {
        layers.push({
          id: "zombie_villager_profession",
          label: "Profession",
          kind: "cloneTexture" as const,
          textureAssetId: tex,
          blend: "normal" as const,
          zIndex: 90,
          opacity: 1,
          materialMode: { kind: "default" as const },
        });
      }
    }

    const level = getSelect(state, "zombie_villager.level", zombieVillagerLevelDefault);
    if (level !== "none") {
      const tex = `${ns}:entity/zombie_villager/profession_level/${level}` as AssetId;
      if (all.has(tex)) {
        layers.push({
          id: "zombie_villager_level",
          label: "Level",
          kind: "cloneTexture" as const,
          textureAssetId: tex,
          blend: "normal" as const,
          zIndex: 95,
          opacity: 1,
          materialMode: { kind: "default" as const },
        });
      }
    }

    return layers;
  };

  return {
    controls,
    getLayerContributions,
  };
};
