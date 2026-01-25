/**
 * Vanilla Animations Section - Shows extracted Minecraft animations
 */
import { Separator } from "@/ui/components/Separator/Separator";
import { getTriggerIcon, getTriggerDescription, capitalize } from "./helpers";
import type { VanillaAnimationData } from "@constants/animations";

interface VanillaAnimationsSectionProps {
  vanillaAnimations: Record<string, VanillaAnimationData>;
  animationPreset: string | null;
  onPresetClick: (presetId: string) => void;
}

export function VanillaAnimationsSection({
  vanillaAnimations,
  animationPreset,
  onPresetClick,
}: VanillaAnimationsSectionProps) {
  return (
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
                onClick={() => onPresetClick(`vanilla:${animName}`)}
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
  );
}
