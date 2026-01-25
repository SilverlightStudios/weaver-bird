import { useEffect, useState } from "react";
import { loadParticleTextures, type LoadedParticleTexture } from "@lib/particle";

interface ParticleTexturePreviewProps {
  particleType: string;
  packPath: string | undefined;
}

/**
 * Component to preview a particle texture
 */
export function ParticleTexturePreview({
  particleType,
  packPath,
}: ParticleTexturePreviewProps) {
  const [texture, setTexture] = useState<LoadedParticleTexture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    loadParticleTextures(particleType, packPath)
      .then((loaded) => {
        if (loaded) {
          setTexture(loaded);
        } else {
          setError("No texture found");
        }
      })
      .catch((e) => {
        setError(e.message ?? "Failed to load texture");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [particleType, packPath]);

  if (loading) {
    return <div style={{ color: "#888", fontSize: "0.85rem" }}>Loading...</div>;
  }

  if (error || !texture) {
    return (
      <div style={{ color: "#888", fontSize: "0.85rem" }}>
        {error ?? "No texture"}
      </div>
    );
  }

  // Get the texture image source from Three.js texture (first texture in array)
  const firstTexture = texture.textures[0];
  const imageSrc = firstTexture?.source?.data?.src;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.25rem",
      }}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={particleType}
          style={{
            width: "32px",
            height: "32px",
            imageRendering: "pixelated",
            border: "1px solid #444",
            borderRadius: "2px",
          }}
        />
      ) : (
        <div
          style={{
            width: "32px",
            height: "32px",
            backgroundColor: "#333",
            border: "1px solid #444",
            borderRadius: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            color: "#666",
          }}
        >
          ?
        </div>
      )}
      <span style={{ fontSize: "0.7rem", color: "#888" }}>{particleType}</span>
    </div>
  );
}
