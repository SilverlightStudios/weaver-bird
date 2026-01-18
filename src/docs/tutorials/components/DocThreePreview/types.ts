import type { JEMFile } from "@lib/emf/jemLoader";

export interface Layer {
  jemData: JEMFile;
  textureUrl?: string;
  color?: string;
}

export interface DocThreePreviewProps {
  jemData: JEMFile;
  textureUrl?: string;
  showPivots?: boolean;
  solidColor?: boolean;
  showLabels?: boolean;
  color?: string;
  extraLayers?: Layer[];
}
