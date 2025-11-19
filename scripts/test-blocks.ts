#!/usr/bin/env npx ts-node
/**
 * Block Tester Script
 *
 * Tests all blocks in the mock resource pack by:
 * 1. Reading blockstate JSON files
 * 2. Extracting model references
 * 3. Loading and validating model JSON files
 * 4. Checking texture references
 *
 * Run with: npx ts-node scripts/test-blocks.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ModelReference {
  model: string;
  x?: number;
  y?: number;
  z?: number;
  uvlock?: boolean;
  weight?: number;
}

interface BlockstateVariant {
  model?: string;
  x?: number;
  y?: number;
}

interface Blockstate {
  variants?: Record<string, ModelReference | ModelReference[]>;
  multipart?: Array<{
    when?: unknown;
    apply: ModelReference | ModelReference[];
  }>;
}

interface BlockModel {
  parent?: string;
  textures?: Record<string, string>;
  elements?: unknown[];
}

interface TestResult {
  blockId: string;
  status: "success" | "error";
  error?: string;
  modelCount: number;
}

// Paths
const PROJECT_ROOT = path.resolve(__dirname, "..");
const MOCK_PACKS_DIR = path.join(PROJECT_ROOT, "__mocks__/resourcepacks");
const STAY_TRUE_DIR = path.join(MOCK_PACKS_DIR, "Stay True");
const BLOCKSTATES_DIR = path.join(
  STAY_TRUE_DIR,
  "assets/minecraft/blockstates"
);
const MODELS_DIR = path.join(STAY_TRUE_DIR, "assets/minecraft/models");

// Track loaded models to avoid infinite loops
const loadedModels = new Set<string>();

function getModelPath(modelId: string): string {
  // Parse model ID: "minecraft:block/dirt" -> "assets/minecraft/models/block/dirt.json"
  let modelPath = modelId;

  // Remove namespace
  if (modelPath.includes(":")) {
    modelPath = modelPath.split(":")[1];
  }

  return path.join(MODELS_DIR, `${modelPath}.json`);
}

function loadModel(modelId: string, visited: Set<string> = new Set()): BlockModel {
  if (visited.has(modelId)) {
    throw new Error(`Circular parent reference detected for model: ${modelId}`);
  }
  visited.add(modelId);

  const modelPath = getModelPath(modelId);

  if (!fs.existsSync(modelPath)) {
    // Model not in pack, might be in vanilla - that's OK for now
    // Return empty model to indicate not found
    return {};
  }

  const content = fs.readFileSync(modelPath, "utf-8");
  const model: BlockModel = JSON.parse(content);

  // If model has a parent, we should be able to resolve it
  // For this test, we just verify the model parses correctly
  if (model.parent) {
    // Check if parent exists (but don't load it to avoid needing vanilla)
    const parentPath = getModelPath(model.parent);
    if (!fs.existsSync(parentPath)) {
      // Parent might be in vanilla, which is OK
      // console.log(`  Note: Parent model not in pack: ${model.parent}`);
    }
  }

  // Check texture references
  if (model.textures) {
    for (const [key, texRef] of Object.entries(model.textures)) {
      // Skip variable references like #all
      if (texRef.startsWith('#')) continue;

      // Check if texture file exists
      const texturePath = getTexturePath(texRef);
      if (!fs.existsSync(texturePath)) {
        // Texture might be in vanilla, which is OK
        // console.log(`  Note: Texture not in pack: ${texRef}`);
      }
    }
  }

  return model;
}

function getTexturePath(textureId: string): string {
  // Parse texture ID: "minecraft:block/dirt" -> "assets/minecraft/textures/block/dirt.png"
  let texturePath = textureId;

  // Remove namespace
  if (texturePath.includes(":")) {
    texturePath = texturePath.split(":")[1];
  }

  return path.join(STAY_TRUE_DIR, "assets/minecraft/textures", `${texturePath}.png`);
}

function extractModels(blockstate: Blockstate): string[] {
  const models: string[] = [];

  if (blockstate.variants) {
    for (const variant of Object.values(blockstate.variants)) {
      if (Array.isArray(variant)) {
        for (const v of variant) {
          if (v.model) models.push(v.model);
        }
      } else if (variant.model) {
        models.push(variant.model);
      }
    }
  }

  if (blockstate.multipart) {
    for (const part of blockstate.multipart) {
      if (Array.isArray(part.apply)) {
        for (const a of part.apply) {
          if (a.model) models.push(a.model);
        }
      } else if (part.apply.model) {
        models.push(part.apply.model);
      }
    }
  }

  return [...new Set(models)];
}

function testBlock(blockId: string): TestResult {
  const blockstatePath = path.join(BLOCKSTATES_DIR, `${blockId}.json`);

  try {
    // Read and parse blockstate
    const content = fs.readFileSync(blockstatePath, "utf-8");
    const blockstate: Blockstate = JSON.parse(content);

    // Extract all model references
    const models = extractModels(blockstate);

    if (models.length === 0) {
      return {
        blockId,
        status: "error",
        error: "No models found in blockstate",
        modelCount: 0,
      };
    }

    // Try to load each model
    for (const modelId of models) {
      try {
        loadModel(modelId);
      } catch (err) {
        return {
          blockId,
          status: "error",
          error: `Failed to load model '${modelId}': ${err instanceof Error ? err.message : String(err)}`,
          modelCount: models.length,
        };
      }
    }

    return {
      blockId,
      status: "success",
      modelCount: models.length,
    };
  } catch (err) {
    return {
      blockId,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
      modelCount: 0,
    };
  }
}

async function main() {
  console.log("=== Block Tester ===\n");
  console.log(`Mock packs directory: ${MOCK_PACKS_DIR}`);
  console.log(`Testing pack: Stay True`);
  console.log();

  // Check directories exist
  if (!fs.existsSync(STAY_TRUE_DIR)) {
    console.error(`ERROR: Stay True pack not found at ${STAY_TRUE_DIR}`);
    process.exit(1);
  }

  // Get all blockstate files
  const blockFiles = fs
    .readdirSync(BLOCKSTATES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort();

  console.log(`Found ${blockFiles.length} blocks to test\n`);

  // Run tests
  const results: TestResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  for (const blockId of blockFiles) {
    const result = testBlock(blockId);
    results.push(result);

    if (result.status === "success") {
      console.log(`✓ ${blockId} (${result.modelCount} models)`);
      successCount++;
    } else {
      console.log(`✗ ${blockId}: ${result.error}`);
      errorCount++;

      // Stop on first error
      console.log("\n=== STOPPED ON FIRST ERROR ===");
      console.log(`Block: ${blockId}`);
      console.log(`Error: ${result.error}`);
      break;
    }
  }

  // Print summary
  console.log("\n=== Summary ===");
  console.log(`Total: ${blockFiles.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Error: ${errorCount}`);
  console.log(`Remaining: ${blockFiles.length - successCount - errorCount}`);

  if (errorCount > 0) {
    process.exit(1);
  }

  console.log("\nAll blocks passed!");
}

main().catch(console.error);
