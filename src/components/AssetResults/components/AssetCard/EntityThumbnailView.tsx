import { View } from "@react-three/drei";
import { EntityThumbnail } from "../EntityThumbnail";
import type { ParsedEntityModel } from "@lib/emf";
import s from "./styles.module.scss";

interface EntityThumbnailViewProps {
  jemModel: ParsedEntityModel | null;
  textureUrl: string | null;
  extraTextureUrls?: Record<string, string | null> | null;
}

export function EntityThumbnailView({
  jemModel,
  textureUrl,
  extraTextureUrls,
}: EntityThumbnailViewProps) {
  if (!jemModel) return null;

  return (
    <View className={s.entityViewTrack} style={{ position: "absolute", inset: 0 }}>
      <EntityThumbnail
        jemModel={jemModel}
        textureUrl={textureUrl}
        extraTextureUrls={extraTextureUrls}
      />
    </View>
  );
}
