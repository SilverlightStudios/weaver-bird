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
import { getVanillaAnimations } from "@constants/animations";
import {
  getVisiblePresets,
  getVisibleTriggers,
  getVisiblePoseToggles,
  getHiddenPresetIds,
  filterPresets,
} from "./AnimationsTab/helpers";
import { VanillaAnimationsSection } from "./AnimationsTab/VanillaAnimationsSection";
import { AnimationPresetsSection } from "./AnimationsTab/AnimationPresetsSection";
import { PlaybackControlsSection } from "./AnimationsTab/PlaybackControlsSection";
import { PoseTogglesSection } from "./AnimationsTab/PoseTogglesSection";
import { TemporaryOverlaysSection } from "./AnimationsTab/TemporaryOverlaysSection";
import { HeadOrientationSection } from "./AnimationsTab/HeadOrientationSection";
import { InfoSection } from "./AnimationsTab/InfoSection";

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
  const visiblePresets = getVisiblePresets(availableAnimationPresets);
  const visibleTriggers = getVisibleTriggers(availableAnimationTriggers);
  const visiblePoseToggleDefs = getVisiblePoseToggles(availablePoseToggles);
  const hiddenPresetIds = getHiddenPresetIds(availableAnimationTriggers);
  const filteredPresets = filterPresets(visiblePresets, hiddenPresetIds);

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
          <VanillaAnimationsSection
            vanillaAnimations={vanillaAnimations}
            animationPreset={animationPreset}
            onPresetClick={handlePresetClick}
          />
        )}

        {/* Animation Presets Grid (Resource Pack + Procedural) */}
        <AnimationPresetsSection
          presets={filteredPresets}
          animationPreset={animationPreset}
          onPresetClick={handlePresetClick}
        />

        {/* Playback Controls */}
        <PlaybackControlsSection
          selectedPreset={selectedPreset}
          animationPlaying={animationPlaying}
          animationSpeed={animationSpeed}
          onPlayPause={handlePlayPause}
          onStop={handleStop}
          onSpeedChange={handleSpeedChange}
        />

        {/* Persistent pose toggles */}
        <PoseTogglesSection
          visiblePoseToggleDefs={visiblePoseToggleDefs}
          activePoseToggles={activePoseToggles}
          onSetPoseToggleEnabled={setPoseToggleEnabled}
        />

        <TemporaryOverlaysSection
          visibleTriggers={visibleTriggers}
          onTriggerAnimation={triggerAnimation}
        />

        {/* Head Control - only show if model has a head bone */}
        <HeadOrientationSection
          hasHeadBone={hasHeadBone}
          entityHeadYaw={entityHeadYaw}
          entityHeadPitch={entityHeadPitch}
          onHeadYawChange={handleHeadYawChange}
          onHeadPitchChange={handleHeadPitchChange}
          onResetHead={() => {
            setEntityHeadYaw(0);
            setEntityHeadPitch(0);
          }}
        />

        {/* Info */}
        <InfoSection />
      </div>
    </TabsContent>
  );
};
