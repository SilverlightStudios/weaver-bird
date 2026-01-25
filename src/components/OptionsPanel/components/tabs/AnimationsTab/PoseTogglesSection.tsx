/**
 * Pose Toggles Section - Persistent pose toggles that layer on top of animations
 */
import { Separator } from "@/ui/components/Separator/Separator";
import type { POSE_TOGGLES } from "@lib/emf/animation";

interface PoseTogglesSectionProps {
  visiblePoseToggleDefs: typeof POSE_TOGGLES;
  activePoseToggles: Record<string, boolean>;
  onSetPoseToggleEnabled: (id: string, enabled: boolean) => void;
}

export function PoseTogglesSection({
  visiblePoseToggleDefs,
  activePoseToggles,
  onSetPoseToggleEnabled,
}: PoseTogglesSectionProps) {
  return (
    <>
      <Separator className="mb-4" />
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Pose Toggles</label>
        <div className="grid grid-cols-3 gap-2">
          {visiblePoseToggleDefs.map((pose) => {
            const enabled = !!activePoseToggles[pose.id];
            return (
              <button
                key={pose.id}
                onClick={() => onSetPoseToggleEnabled(pose.id, !enabled)}
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
    </>
  );
}
