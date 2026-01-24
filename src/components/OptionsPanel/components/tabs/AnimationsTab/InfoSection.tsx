/**
 * Info Section - Informational text about animations
 */
import { Separator } from "@/ui/components/Separator/Separator";

export function InfoSection() {
  return (
    <>
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
    </>
  );
}
