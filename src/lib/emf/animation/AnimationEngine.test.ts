/**
 * Tests for Animation Engine and JEM integration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as THREE from "three";
import { readFileSync } from "fs";
import { join } from "path";
import { parseJEM, jemToThreeJS, type JEMFile } from "../jemLoader";
import { AnimationEngine, createAnimationEngine } from "./AnimationEngine";
import { ANIMATION_PRESETS, getPresetById } from "./entityState";

// Load a test JEM file with animations (from Fresh Animations pack)
const allayJEMPath = join(
  __dirname,
  "../../../../__mocks__/resourcepacks/FreshAnimations_v1.9.2/assets/minecraft/optifine/cem/allay.jem"
);
const allayJEM = JSON.parse(readFileSync(allayJEMPath, "utf-8")) as JEMFile;

// Load a simple JEM without animations for comparison
const cowJEMPath = join(__dirname, "../../../../__mocks__/cem/cow.jem");
const cowJEM = JSON.parse(readFileSync(cowJEMPath, "utf-8")) as JEMFile;

describe("JEM Animation Extraction", () => {
  it("should extract animations from allay.jem", () => {
    const parsed = parseJEM(allayJEM);

    expect(parsed.animations).toBeDefined();
    expect(parsed.animations!.length).toBeGreaterThan(0);

    // Allay has multiple animation layers
    // Check that we have var.* definitions (layer 0) and bone transforms
    const allProperties = parsed.animations!.flatMap((layer) =>
      Object.keys(layer)
    );

    // Should have variable definitions
    expect(allProperties.some((p) => p.startsWith("var."))).toBe(true);

    // Should have bone transforms
    expect(allProperties.some((p) => p.includes(".rx"))).toBe(true);
    expect(allProperties.some((p) => p.includes(".ry"))).toBe(true);
    expect(allProperties.some((p) => p.includes(".tx"))).toBe(true);
  });

  it("should parse JEM with simple animations", () => {
    const parsed = parseJEM(cowJEM);

    // Cow JEM has a simple animation (this.rx: 0)
    // The parser should handle it gracefully
    if (parsed.animations) {
      expect(Array.isArray(parsed.animations)).toBe(true);
      // Simple JEMs may have minimal animations
      expect(parsed.animations.length).toBeGreaterThan(0);
    }
  });

  it("should preserve animation expression strings", () => {
    const parsed = parseJEM(allayJEM);

    // Find a specific known expression
    const firstLayer = parsed.animations![0];

    // Check that expressions are preserved as strings
    for (const [key, value] of Object.entries(firstLayer)) {
      if (key.startsWith("var.")) {
        // Variable definitions can be strings or numbers
        expect(
          typeof value === "string" || typeof value === "number"
        ).toBe(true);
      }
    }
  });
});

describe("Animation Engine", () => {
  let mockGroup: THREE.Group;

  beforeEach(() => {
    // Create a mock Three.js group structure
    mockGroup = new THREE.Group();
    mockGroup.name = "jem_entity";

    // Add some mock bones
    const head = new THREE.Group();
    head.name = "head";
    mockGroup.add(head);

    const body = new THREE.Group();
    body.name = "body";
    mockGroup.add(body);

    const leftArm = new THREE.Group();
    leftArm.name = "left_arm";
    mockGroup.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.name = "right_arm";
    mockGroup.add(rightArm);
  });

  it("should create engine without animations", () => {
    const engine = createAnimationEngine(mockGroup);

    expect(engine).toBeDefined();
    expect(engine.hasAnimations()).toBe(false);
    expect(engine.getLayerCount()).toBe(0);
  });

  it("should create engine with animations", () => {
    const parsed = parseJEM(allayJEM);
    const engine = createAnimationEngine(mockGroup, parsed.animations);

    expect(engine).toBeDefined();
    expect(engine.hasAnimations()).toBe(true);
    expect(engine.getLayerCount()).toBeGreaterThan(0);
  });

  it("should build bone map from model", () => {
    const engine = createAnimationEngine(mockGroup);
    const boneNames = engine.getBoneNames();

    expect(boneNames).toContain("head");
    expect(boneNames).toContain("body");
    expect(boneNames).toContain("left_arm");
    expect(boneNames).toContain("right_arm");
  });

  it("should set and get presets", () => {
    const engine = createAnimationEngine(mockGroup);

    expect(engine.getActivePreset()).toBeNull();

    engine.setPreset("walking");
    expect(engine.getActivePreset()?.id).toBe("walking");
    expect(engine.getIsPlaying()).toBe(true);

    engine.setPreset(null);
    expect(engine.getActivePreset()).toBeNull();
  });

  it("should control playback", () => {
    const engine = createAnimationEngine(mockGroup);

    expect(engine.getIsPlaying()).toBe(false);

    engine.setPreset("idle");
    expect(engine.getIsPlaying()).toBe(true);

    engine.pause();
    expect(engine.getIsPlaying()).toBe(false);

    engine.play();
    expect(engine.getIsPlaying()).toBe(true);

    engine.stop();
    expect(engine.getIsPlaying()).toBe(false);
    expect(engine.getActivePreset()).toBeNull();
  });

  it("should update entity state with preset", () => {
    const engine = createAnimationEngine(mockGroup);

    // Set walking preset
    engine.setPreset("walking");
    const state = engine.getEntityState();

    // Walking preset should set limb_speed
    expect(state.limb_speed).toBe(0.4);
    expect(state.is_on_ground).toBe(true);
  });

  it("should tick animation forward", () => {
    const engine = createAnimationEngine(mockGroup);
    engine.setPreset("walking");

    const stateBefore = { ...engine.getEntityState() };

    // Tick forward 0.1 seconds
    engine.tick(0.1);

    const stateAfter = engine.getEntityState();

    // Age should increase
    expect(stateAfter.age).toBeGreaterThan(stateBefore.age);

    // Limb swing should increase for walking
    expect(stateAfter.limb_swing).toBeGreaterThan(stateBefore.limb_swing);
  });

  it("should control playback speed", () => {
    const engine = createAnimationEngine(mockGroup);

    expect(engine.getSpeed()).toBe(1.0);

    engine.setSpeed(2.0);
    expect(engine.getSpeed()).toBe(2.0);

    // Speed should be clamped
    engine.setSpeed(10.0);
    expect(engine.getSpeed()).toBe(3.0);

    engine.setSpeed(0.01);
    expect(engine.getSpeed()).toBe(0.1);
  });

  it("should set head orientation", () => {
    const engine = createAnimationEngine(mockGroup);

    engine.setHeadOrientation(45, -15);

    const state = engine.getEntityState();
    expect(state.head_yaw).toBe(45);
    expect(state.head_pitch).toBe(-15);
  });

  it("should manage custom variables", () => {
    const engine = createAnimationEngine(mockGroup);

    expect(engine.getVariable("custom")).toBe(0);

    engine.setVariable("custom", 42);
    expect(engine.getVariable("custom")).toBe(42);
  });

  it("should reset to base pose", () => {
    const engine = createAnimationEngine(mockGroup);
    engine.setPreset("walking");
    engine.tick(1.0);

    engine.reset();

    const state = engine.getEntityState();
    expect(state.age).toBe(0);
    expect(state.limb_swing).toBe(0);
  });

  it("should dispose cleanly", () => {
    const engine = createAnimationEngine(mockGroup);
    engine.setPreset("walking");

    engine.dispose();

    expect(engine.getIsPlaying()).toBe(false);
    expect(engine.hasAnimations()).toBe(false);
  });
});

describe("Animation Presets", () => {
  it("should have all required presets", () => {
    const presetIds = ANIMATION_PRESETS.map((p) => p.id);

    expect(presetIds).toContain("idle");
    expect(presetIds).toContain("walking");
    expect(presetIds).toContain("sprinting");
    expect(presetIds).toContain("attacking");
    expect(presetIds).toContain("hurt");
    expect(presetIds).toContain("dying");
    expect(presetIds).toContain("swimming");
  });

  it("should get preset by ID", () => {
    const walking = getPresetById("walking");

    expect(walking).toBeDefined();
    expect(walking!.name).toBe("Walking");
    expect(walking!.loop).toBe(true);
  });

  it("should return undefined for unknown preset", () => {
    const unknown = getPresetById("unknown_preset");
    expect(unknown).toBeUndefined();
  });

  it("should have dying as non-looping", () => {
    const dying = getPresetById("dying");

    expect(dying).toBeDefined();
    expect(dying!.loop).toBe(false);
    expect(dying!.duration).toBeGreaterThan(0);
  });
});

describe("Animation with Real JEM", () => {
  it("should evaluate expressions from allay.jem", () => {
    // Parse the JEM file
    const parsed = parseJEM(allayJEM);

    // Create a mock Three.js model
    const mockGroup = new THREE.Group();
    mockGroup.name = "jem_entity";

    // Add bones that match the allay model
    const boneNames = [
      "head",
      "head2",
      "body",
      "body2",
      "right_arm",
      "left_arm",
      "right_wing2",
      "left_wing2",
      "right_eye",
      "left_eye",
      "eyes",
    ];

    for (const name of boneNames) {
      const bone = new THREE.Group();
      bone.name = name;
      mockGroup.add(bone);
    }

    // Create animation engine with real animations
    const engine = createAnimationEngine(mockGroup, parsed.animations);

    expect(engine.hasAnimations()).toBe(true);
    expect(engine.getExpressionCount()).toBeGreaterThan(0);

    // Tick to evaluate expressions
    engine.setPreset("walking");
    engine.tick(0.016); // ~60fps frame

    // Variables should have been computed
    // var.hy = clamp(head_yaw,-90,90) should be set
    const hy = engine.getVariable("hy");
    expect(typeof hy).toBe("number");
  });
});
