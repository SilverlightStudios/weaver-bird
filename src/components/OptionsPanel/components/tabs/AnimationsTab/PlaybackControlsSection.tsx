/**
 * Playback Controls Section - Animation play/pause/stop and speed controls
 */
import { Separator } from "@/ui/components/Separator/Separator";
import type { AnimationPreset } from "@lib/emf/animation/entityState";

interface PlaybackControlsSectionProps {
  selectedPreset: AnimationPreset | undefined;
  animationPlaying: boolean;
  animationSpeed: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSpeedChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PlaybackControlsSection({
  selectedPreset,
  animationPlaying,
  animationSpeed,
  onPlayPause,
  onStop,
  onSpeedChange,
}: PlaybackControlsSectionProps) {
  if (!selectedPreset) return null;

  return (
    <>
      <Separator className="mb-4" />
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Playback Controls
        </label>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onPlayPause}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {animationPlaying ? "Pause" : "Play"}
          </button>
          <button
            onClick={onStop}
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
            onChange={onSpeedChange}
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
  );
}
