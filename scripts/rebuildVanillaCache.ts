import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";

function getCacheRoot(): string {
  const platform = os.platform();

  if (platform === "darwin") {
    return path.join(os.homedir(), "Library", "Caches");
  }

  if (platform === "win32") {
    return (
      process.env.LOCALAPPDATA ??
      path.join(os.homedir(), "AppData", "Local")
    );
  }

  return process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), ".cache");
}

async function main(): Promise<void> {
  const cacheRoot = getCacheRoot();
  const target = path.join(cacheRoot, "weaverbird", "vanilla_textures");

  await rm(target, { recursive: true, force: true });
  console.log(`[rebuild-vanilla-cache] Removed ${target}`);
}

void main();
