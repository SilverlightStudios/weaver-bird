/**
 * Temporary Overlays Section - Trigger animations that play on top of the current preset
 */
import { Separator } from "@/ui/components/Separator/Separator";
import type { ANIMATION_TRIGGERS } from "@lib/emf/animation";

interface TemporaryOverlaysSectionProps {
  visibleTriggers: typeof ANIMATION_TRIGGERS;
  onTriggerAnimation: (triggerId: string) => void;
}

export function TemporaryOverlaysSection({
  visibleTriggers,
  onTriggerAnimation,
}: TemporaryOverlaysSectionProps) {
  return (
    <>
      <Separator className="mb-4" />
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Temporary Overlays
        </label>
        <div className="grid grid-cols-3 gap-2">
          {visibleTriggers.map((trigger) => (
            <button
              key={trigger.id}
              onClick={() => onTriggerAnimation(trigger.id)}
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
    </>
  );
}
