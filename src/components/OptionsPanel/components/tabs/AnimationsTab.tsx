/**
 * AnimationsTab Component
 *
 * Provides animation controls for entity models including:
 * - Vanilla extracted animations (bell ring, chest open, etc.)
 * - Resource pack animations (JEM/JPM from Fresh Animations, etc.)
 * - Animation preset selection (Walking, Attacking, etc.)
 * - Play/pause controls
 * - Speed adjustment
 * - Manual head orientation control
 *
 * PRIORITY ORDER:
 * 1. Resource pack animations (JEM/JPM files) - shown in Animation Presets
 * 2. Vanilla extracted animations (from Minecraft code) - shown in Vanilla Animations
 * 3. Procedural presets (idle, walking, etc.) - shown in Animation Presets
 */

import { TabsContent } from "@/ui/components/tabs";
import { Separator } from "@/ui/components/Separator/Separator";
import { useEffect, useMemo } from "react";
import { useStore } from "@state/store";
import { ANIMATION_PRESETS } from "@lib/emf/animation/entityState";
import { ANIMATION_TRIGGERS, POSE_TOGGLES } from "@lib/emf/animation";
import { getVanillaAnimations, type AnimationTrigger } from "@constants/animations";

// Helper functions for vanilla animations UI
function getTriggerIcon(trigger: AnimationTrigger): string {
  switch (trigger) {
    case 'interact': return '👆';
    case 'always': return '🔄';
    case 'redstone': return '⚡';
    case 'damage': return '💥';
    case 'walk': return '🚶';
    default: return '🎬';
  }
}

function getTriggerDescription(trigger: AnimationTrigger): string {
  switch (trigger) {
    case 'interact': return 'Plays when player interacts';
    case 'always': return 'Loops continuously';
    case 'redstone': return 'Plays when redstone powered';
    case 'damage': return 'Plays when damaged';
    case 'walk': return 'Plays when moving';
    default: return `Trigger: ${trigger}`;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const AnimationsTab = () => {
  const selectedAssetId = useStore((state) => state.selectedAssetId);
  const animationPreset = useStore((state) => state.animationPreset);
  const animationPlaying = useStore((state) => state.animationPlaying);
  const animationSpeed = useStore((state) => state.animationSpeed);
  const entityHeadYaw = useStore((state) => state.entityHeadYaw);
  const entityHeadPitch = useStore((state) => state.entityHeadPitch);
  const availableAnimationPresets = useStore(
    (state) => state.availableAnimationPresets,
  );
  const availableAnimationTriggers = useStore(
    (state) => state.availableAnimationTriggers,
  );
  const availablePoseToggles = useStore((state) => state.availablePoseToggles);
  const activePoseToggles = useStore((state) => state.activePoseToggles);
  const availableBones = useStore((state) => state.availableBones);

  const setAnimationPreset = useStore((state) => state.setAnimationPreset);
  const setAnimationPlaying = useStore((state) => state.setAnimationPlaying);
  const setAnimationSpeed = useStore((state) => state.setAnimationSpeed);
  const setEntityHeadYaw = useStore((state) => state.setEntityHeadYaw);
  const setEntityHeadPitch = useStore((state) => state.setEntityHeadPitch);
  const triggerAnimation = useStore((state) => state.triggerAnimation);
  const setPoseToggleEnabled = useStore((state) => state.setPoseToggleEnabled);

  // Extract entity ID from selected asset for vanilla animations
  // Examples:
  // - "minecraft:entity/bell/bell_body" -> "bell"
  // - "minecraft:block/bell" -> "bell"
  // - "minecraft:entity/chest/normal" -> "chest"
  const entityId = useMemo(() => {
    if (!selectedAssetId) return null;

    const normalized = selectedAssetId.toLowerCase();

    // Extract from entity path: entity/bell/bell_body -> bell
    const entityMatch = normalized.match(/entity\/([^/]+)/);
    if (entityMatch) return entityMatch[1];

    // Extract from block path (for block entities): block/bell -> bell
    const blockMatch = normalized.match(/block\/([^/]+)/);
    if (blockMatch) return blockMatch[1];

    return null;
  }, [selectedAssetId]);

  // Load vanilla animations for current entity
  const vanillaAnimations = useMemo(() => {
    if (!entityId) return null;
    return getVanillaAnimations(entityId);
  }, [entityId]);

  // Phase 5: Resource Pack Priority
  // Only show vanilla animations if no resource pack animations exist
  const hasResourcePackAnimations = useMemo(() => {
    return availableAnimationPresets !== null && availableAnimationPresets.length > 0;
  }, [availableAnimationPresets]);

  const shouldShowVanillaAnimations = useMemo(() => {
    // Don't show vanilla animations if resource pack provides animations
    if (hasResourcePackAnimations) return false;
    // Show vanilla animations if they exist and no resource pack animations
    return vanillaAnimations && Object.keys(vanillaAnimations).length > 0;
  }, [hasResourcePackAnimations, vanillaAnimations]);

  // Check if the model has a "head" bone for head orientation controls
  const hasHeadBone = useMemo(() => {
    if (!availableBones) return true; // Show by default if bones unknown
    return availableBones.includes('head');
  }, [availableBones]);

  const handlePresetClick = (presetId: string) => {
    if (animationPreset === presetId) {
      // Toggle off if clicking the same preset
      setAnimationPreset(null);
      setAnimationPlaying(false);
    } else {
      setAnimationPreset(presetId);
      setAnimationPlaying(true);
    }
  };

  const handlePlayPause = () => {
    setAnimationPlaying(!animationPlaying);
  };

  const handleStop = () => {
    setAnimationPreset(null);
    setAnimationPlaying(false);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAnimationSpeed(parseFloat(e.target.value));
  };

  const handleHeadYawChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEntityHeadYaw(parseFloat(e.target.value));
  };

  const handleHeadPitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEntityHeadPitch(parseFloat(e.target.value));
  };

  const selectedPreset = ANIMATION_PRESETS.find((p) => p.id === animationPreset);
  const visiblePresets =
    availableAnimationPresets === null
      ? ANIMATION_PRESETS
      : ANIMATION_PRESETS.filter((p) => availableAnimationPresets.includes(p.id));

  const visibleTriggers =
    availableAnimationTriggers === null
      ? []
      : ANIMATION_TRIGGERS.filter((t) => availableAnimationTriggers.includes(t.id));

  const visiblePoseToggleDefs =
    availablePoseToggles === null
      ? []
      : POSE_TOGGLES.filter((p) => availablePoseToggles.includes(p.id));

  const hiddenPresetIds = new Set<string>();
  if (availableAnimationTriggers?.includes("trigger.hurt")) hiddenPresetIds.add("hurt");
  if (availableAnimationTriggers?.includes("trigger.death")) hiddenPresetIds.add("dying");
  if (availableAnimationTriggers?.includes("trigger.attack")) hiddenPresetIds.add("attacking");

  const filteredPresets = visiblePresets.filter((p) => !hiddenPresetIds.has(p.id));

  useEffect(() => {
    if (
      animationPreset &&
      availableAnimationPresets !== null &&
      !availableAnimationPresets.includes(animationPreset)
    ) {
      setAnimationPreset(null);
      setAnimationPlaying(false);
    }
  }, [
    animationPreset,
    availableAnimationPresets,
    setAnimationPreset,
    setAnimationPlaying,
  ]);

  return (
    <TabsContent value="animations">
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">Entity Animations</h3>
        <Separator className="mb-4" />

        {/* Vanilla Animations Grid (extracted from Minecraft code) */}
        {/* Phase 5: Only show when no resource pack animations exist */}
        {shouldShowVanillaAnimations && vanillaAnimations && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Vanilla Animations
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(vanillaAnimations).map(([animName, anim]) => {
                  const isSelected = animationPreset === `vanilla:${animName}`;
                  const triggerIcon = getTriggerIcon(anim.trigger);

                  return (
                    <button
                      key={animName}
                      onClick={() => handlePresetClick(`vanilla:${animName}`)}
                      className={`
                        p-2 rounded-md border text-left transition-colors
                        ${
                          isSelected
                            ? "bg-primary/20 border-primary"
                            : "bg-background border-border hover:bg-accent"
                        }
                      `}
                      title={`${capitalize(animName)} - ${getTriggerDescription(anim.trigger)}\n${anim.duration} ticks (${(anim.duration / 20).toFixed(1)}s)${anim.looping ? ' - Loops' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{triggerIcon}</span>
                        <span className="text-sm truncate">{capitalize(animName)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Extracted from vanilla Minecraft code (shown as fallback when no resource pack animations exist).
              </p>
            </div>
            <Separator className="mb-4" />
          </>
        )}

        {/* Animation Presets Grid (Resource Pack + Procedural) */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Animation Presets
          </label>
          <div className="grid grid-cols-3 gap-2">
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className={`
                  p-2 rounded-md border text-left transition-colors
                  ${
                    animationPreset === preset.id
                      ? "bg-primary/20 border-primary"
                      : "bg-background border-border hover:bg-accent"
                  }
                `}
                title={preset.description}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{preset.icon}</span>
                  <span className="text-sm truncate">{preset.name}</span>
                </div>
              </button>
            ))}
          </div>
          {filteredPresets.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              No resource pack or procedural animations detected.
            </p>
          )}
        </div>

        {/* Playback Controls */}
        {selectedPreset && (
          <>
            <Separator className="mb-4" />
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Playback Controls
              </label>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={handlePlayPause}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {animationPlaying ? "Pause" : "Play"}
                </button>
                <button
                  onClick={handleStop}
                  className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Stop
                </button>
                <span className="text-sm text-muted-foreground ml-2">
                  {selectedPreset.name}
                  {selectedPreset.loop ? " (looping)" : ""}
                </span>
              </div>

              {/* Speed Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Speed</span>
                  <span>{animationSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  value={animationSpeed}
                  onChange={handleSpeedChange}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.1x</span>
                  <span>1.0x</span>
                  <span>3.0x</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Trigger overlays */}
        <Separator className="mb-4" />

        {/* Persistent pose toggles */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Pose Toggles</label>
          <div className="grid grid-cols-3 gap-2">
            {visiblePoseToggleDefs.map((pose) => {
              const enabled = !!activePoseToggles[pose.id];
              return (
                <button
                  key={pose.id}
                  onClick={() => setPoseToggleEnabled(pose.id, !enabled)}
                  className={`
                    p-2 rounded-md border text-left transition-colors
                    ${
                      enabled
                        ? "bg-primary/20 border-primary"
                        : "bg-background border-border hover:bg-accent"
                    }
                  `}
                  title={pose.description}
                >
                  <span className="text-sm truncate">{pose.name}</span>
                </button>
              );
            })}
          </div>
          {visiblePoseToggleDefs.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              No pose toggles detected for this model.
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Pose toggles stay enabled until turned off and layer on top of the
            selected preset.
          </p>
        </div>

        <Separator className="mb-4" />
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Temporary Overlays
          </label>
          <div className="grid grid-cols-3 gap-2">
            {visibleTriggers.map((trigger) => (
              <button
                key={trigger.id}
                onClick={() => triggerAnimation(trigger.id)}
                className="p-2 rounded-md border text-left transition-colors bg-background border-border hover:bg-accent"
                title={trigger.description}
              >
                <span className="text-sm truncate">{trigger.name}</span>
              </button>
            ))}
          </div>
          {visibleTriggers.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              No overlay triggers detected for this model.
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Overlays play on top of the selected preset (or the rest pose).
          </p>
        </div>

        {/* Head Control - only show if model has a head bone */}
        {hasHeadBone && (
          <>
            <Separator className="mb-4" />
            <div className="space-y-4">
              <label className="block text-sm font-medium">
                Head Orientation
              </label>

              {/* Yaw Control */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Yaw (Left/Right)</span>
                  <span>{entityHeadYaw.toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={entityHeadYaw}
                  onChange={handleHeadYawChange}
                  className="w-full"
                />
              </div>

              {/* Pitch Control */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Pitch (Up/Down)</span>
                  <span>{entityHeadPitch.toFixed(0)}°</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="1"
                  value={entityHeadPitch}
                  onChange={handleHeadPitchChange}
                  className="w-full"
                />
              </div>

              <button
                onClick={() => {
                  setEntityHeadYaw(0);
                  setEntityHeadPitch(0);
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Reset head orientation
              </button>
            </div>
          </>
        )}

        {/* Info */}
        <Separator className="my-4" />
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Vanilla Animations:</strong> Extracted from Minecraft's code. Includes block entity animations (bell ring, chest open) and mob animations.
          </p>
          <p>
            <strong>Animation Presets:</strong> Resource pack animations (JEM/JPM) and procedural animations (walking, attacking, etc.).
          </p>
          <p className="text-xs">
            Resource pack animations always take priority over vanilla extracted animations.
          </p>
        </div>
      </div>
    </TabsContent>
  );
};
