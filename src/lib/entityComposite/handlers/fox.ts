import type { AssetId } from "@state";
import type { EntityHandler, EntityHandlerResult } from "./types";
import { getToggle, getSelect } from "./utils";

export const foxHandler: EntityHandler = (context): EntityHandlerResult | null => {
  const { folderRoot, all, ns } = context;

  if (folderRoot !== "fox") return null;

  const hasSnow = all.has(`${ns}:entity/fox/snow_fox` as AssetId);
  const hasFoxSleep = all.has(`${ns}:entity/fox/fox_sleep` as AssetId);
  const hasSnowSleep = all.has(`${ns}:entity/fox/snow_fox_sleep` as AssetId);

  const controls = [];

  if (hasSnow) {
    controls.push({
      kind: "select" as const,
      id: "fox.type",
      label: "Type",
      defaultValue: "fox",
      options: [
        { value: "fox", label: "Red" },
        { value: "snow_fox", label: "Snow" },
      ],
    });
  }

  if (hasFoxSleep || hasSnowSleep) {
    controls.push({
      kind: "toggle" as const,
      id: "fox.sleeping",
      label: "Sleeping",
      defaultValue: false,
    });
  }

  let getBaseTextureAssetId;
  if (hasSnow || hasFoxSleep || hasSnowSleep) {
    getBaseTextureAssetId = (state: Parameters<NonNullable<EntityHandlerResult["getBaseTextureAssetId"]>>[0]) => {
      const type = getSelect(state, "fox.type", "fox");
      const sleeping = getToggle(state, "fox.sleeping", false);
      const baseLeaf = hasSnow && type === "snow_fox" ? "snow_fox" : "fox";
      const sleepLeaf = `${baseLeaf}_sleep`;
      const candidate = `${ns}:entity/fox/${sleeping ? sleepLeaf : baseLeaf}` as AssetId;
      return all.has(candidate) ? candidate : (`${ns}:entity/fox/${baseLeaf}` as AssetId);
    };
  }

  return {
    controls,
    getBaseTextureAssetId,
  };
};
