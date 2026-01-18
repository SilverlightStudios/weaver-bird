import type { JEMFile } from "@lib/emf/jemLoader";

export interface DocTexturePreviewProps {
  textureUrl: string;
  jemData?: JEMFile;
  showUV?: boolean;
}
