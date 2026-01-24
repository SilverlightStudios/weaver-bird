export interface BlockModelProps {
  assetId: string;
  biomeColor?: { r: number; g: number; b: number } | null;
  onTintDetected?: (info: {
    hasTint: boolean;
    tintType?: "grass" | "foliage";
  }) => void;
  showPot?: boolean;
  isPotted?: boolean;
  blockProps?: Record<string, string>;
  seed?: number;
  forcedPackId?: string;
  positionOffset?: [number, number, number];
}
