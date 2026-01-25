/**
 * Animation Presets Section - Shows resource pack and procedural animations
 */
import type { AnimationPreset } from "@lib/emf/animation/entityState";

interface AnimationPresetsSectionProps {
  presets: AnimationPreset[];
  animationPreset: string | null;
  onPresetClick: (presetId: string) => void;
}

export function AnimationPresetsSection({
  presets,
  animationPreset,
  onPresetClick,
}: AnimationPresetsSectionProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">
        Animation Presets
      </label>
      <div className="grid grid-cols-3 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onPresetClick(preset.id)}
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
      {presets.length === 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          No resource pack or procedural animations detected.
        </p>
      )}
    </div>
  );
}
