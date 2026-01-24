import type { EntityHandler } from "./types";
import { foxHandler } from "./fox";
import { llamaHandler } from "./llama";
import { horseHandler } from "./horse";
import { sheepHandler } from "./sheep";
import { decoratedPotHandler } from "./decorated_pot";
import { armadilloHandler } from "./armadillo";
import { allayHandler } from "./allay";
import { camelHandler } from "./camel";
import { donkeyHandler } from "./donkey";
import { happyGhastHandler } from "./happy_ghast";
import { piglinHandler } from "./piglin";
import { villagerHandler } from "./villager";
import { zombieVillagerHandler } from "./zombie_villager";
import { breezeHandler } from "./breeze";
import { bannerHandler } from "./banner";
import { equipmentHandler } from "./equipment";
import { baseVariantHandler } from "./base_variant";

export const entityHandlers: EntityHandler[] = [
  // Specific entity handlers (order matters - more specific handlers first)
  foxHandler,
  llamaHandler,
  horseHandler,
  sheepHandler,
  decoratedPotHandler,
  armadilloHandler,
  allayHandler,
  camelHandler,
  donkeyHandler,
  happyGhastHandler,
  piglinHandler,
  villagerHandler,
  zombieVillagerHandler,
  breezeHandler,
  bannerHandler,
  equipmentHandler,
  // Generic variant handler last (catches all variant directories)
  baseVariantHandler,
];

export * from "./types";
export * from "./utils";
