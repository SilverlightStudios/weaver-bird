/**
 * Head Orientation Section - Manual head yaw/pitch controls
 */
import { Separator } from "@/ui/components/Separator/Separator";

interface HeadOrientationSectionProps {
  hasHeadBone: boolean;
  entityHeadYaw: number;
  entityHeadPitch: number;
  onHeadYawChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHeadPitchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetHead: () => void;
}

export function HeadOrientationSection({
  hasHeadBone,
  entityHeadYaw,
  entityHeadPitch,
  onHeadYawChange,
  onHeadPitchChange,
  onResetHead,
}: HeadOrientationSectionProps) {
  if (!hasHeadBone) return null;

  return (
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
            onChange={onHeadYawChange}
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
            onChange={onHeadPitchChange}
            className="w-full"
          />
        </div>

        <button
          onClick={onResetHead}
          className="text-sm text-muted-foreground hover:text-foreground underline"
        >
          Reset head orientation
        </button>
      </div>
    </>
  );
}
