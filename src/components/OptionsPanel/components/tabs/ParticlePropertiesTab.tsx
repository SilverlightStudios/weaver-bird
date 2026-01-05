/**
 * ParticlePropertiesTab - Tab for particle emission settings and debugging
 *
 * Shows particle-related controls for blocks/entities that emit particles:
 * - Enable/disable toggle
 * - Quality setting
 * - Texture preview
 * - Emission point visualization
 * - Condition overrides for testing different states
 */

import { useEffect, useMemo, useState } from "react";
import { TabsContent } from "@/ui/components/tabs";
import { Separator } from "@/ui/components/Separator/Separator";
import { useStore } from "@state";
import {
  getBlockEmissions,
  getEntityEmissions,
} from "@constants/particles";
import { getBlockStateIdFromAssetId } from "@lib/assetUtils";
import { loadParticleTextures, type LoadedParticleTexture } from "@lib/particle";
import { useSelectWinner, useSelectPack } from "@state/selectors";

interface ParticlePropertiesTabProps {
  /** Current asset ID being viewed */
  assetId: string;
  /** Whether this is an entity (vs block) */
  isEntity: boolean;
  /** Callback when condition overrides change */
  onConditionOverride?: (overrides: Record<string, string>) => void;
}

/**
 * Convert asset ID to block/entity ID format
 */
function assetIdToEmissionId(assetId: string, isEntity: boolean): string {
  if (isEntity) {
    // "minecraft:entity/zombie" -> "minecraft:zombie"
    return assetId.replace(/^minecraft:entity\//, "minecraft:");
  } else {
    // "minecraft:block/campfire" -> "minecraft:campfire"
    const blockStateId = getBlockStateIdFromAssetId(assetId);
    return blockStateId.replace(/:block\//, ":");
  }
}

/**
 * Component to preview a particle texture
 */
function ParticleTexturePreview({
  particleType,
  packPath,
}: {
  particleType: string;
  packPath: string | undefined;
}) {
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
        setError(e.message || "Failed to load texture");
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
        {error || "No texture"}
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

export const ParticlePropertiesTab = ({
  assetId,
  isEntity,
  onConditionOverride,
}: ParticlePropertiesTabProps) => {
  const showBlockParticles = useStore((state) => state.showBlockParticles);
  const setShowBlockParticles = useStore((state) => state.setShowBlockParticles);
  const showEmissionPoints = useStore((state) => state.showEmissionPoints);
  const setShowEmissionPoints = useStore((state) => state.setShowEmissionPoints);
  const particleDataReady = useStore((state) => state.particleDataReady);

  // Get the winning pack for texture loading
  const winnerPackId = useSelectWinner(assetId);
  const winnerPack = useSelectPack(winnerPackId ?? "");

  // Local state for condition overrides
  const [conditionOverrides, setConditionOverrides] = useState<
    Record<string, string>
  >({});

  // Get emissions for this asset
  const emissions = useMemo(() => {
    if (!particleDataReady) return null;

    const emissionId = assetIdToEmissionId(assetId, isEntity);
    const data = isEntity
      ? getEntityEmissions(emissionId)
      : getBlockEmissions(emissionId);

    return data;
  }, [assetId, isEntity, particleDataReady]);

  // Extract unique conditions from emissions
  const uniqueConditions = useMemo(() => {
    if (!emissions) return [];

    const conditions = new Set<string>();
    for (const emission of emissions.emissions) {
      if (emission.condition) {
        conditions.add(emission.condition);
      }
    }
    return Array.from(conditions);
  }, [emissions]);

  // Extract unique particle types for texture preview
  const uniqueParticleTypes = useMemo(() => {
    if (!emissions) return [];

    const types = new Set<string>();
    for (const emission of emissions.emissions) {
      // Skip field references that weren't resolved
      if (!emission.particleId.startsWith("FIELD:")) {
        types.add(emission.particleId);
      }
    }
    return Array.from(types);
  }, [emissions]);

  // Handle condition override change
  const handleConditionChange = (condition: string, value: boolean) => {
    const newOverrides = { ...conditionOverrides };

    // Parse condition (supports "key=value" or uppercase "KEY" format)
    if (condition.includes("=")) {
      const [key, expected] = condition.split("=");
      if (key) {
        if (value) {
          newOverrides[key] = expected ?? "true";
        } else {
          delete newOverrides[key];
        }
      }
    } else {
      // Uppercase property name like "LIT"
      const key = condition.toLowerCase();
      if (value) {
        newOverrides[key] = "true";
      } else {
        delete newOverrides[key];
      }
    }

    setConditionOverrides(newOverrides);
    onConditionOverride?.(newOverrides);
  };

  // Check if a condition is currently overridden
  const isConditionOverridden = (condition: string): boolean => {
    if (condition.includes("=")) {
      const [key, expected] = condition.split("=");
      return key ? conditionOverrides[key] === expected : false;
    } else {
      const key = condition.toLowerCase();
      return conditionOverrides[key] === "true";
    }
  };

  if (!emissions || emissions.emissions.length === 0) {
    return (
      <TabsContent value="particle-properties">
        <div>
          <h3>Particle Properties</h3>
          <Separator style={{ margin: "0.75rem 0" }} />
          <p style={{ color: "#888", fontSize: "0.85rem" }}>
            This {isEntity ? "entity" : "block"} does not emit particles.
          </p>
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="particle-properties">
      <div>
        <h3>Particle Properties</h3>
        <Separator style={{ margin: "0.75rem 0" }} />

        {/* Enable/Disable Toggle */}
        <label
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <input
            type="checkbox"
            checked={showBlockParticles}
            onChange={(e) => setShowBlockParticles(e.target.checked)}
          />
          <span style={{ textTransform: "uppercase", fontWeight: "600" }}>
            Enable Particles
          </span>
        </label>

        <Separator style={{ margin: "0.75rem 0" }} />

        {/* Emission Info */}
        <div style={{ marginBottom: "1rem" }}>
          <h4
            style={{
              fontSize: "0.85rem",
              textTransform: "uppercase",
              fontWeight: "600",
              marginBottom: "0.5rem",
            }}
          >
            Emissions ({emissions.emissions.length})
          </h4>
          <p style={{ color: "#888", fontSize: "0.8rem", marginBottom: "0.5rem" }}>
            Class: {emissions.className || "Unknown"}
          </p>
        </div>

        {/* Particle Texture Preview */}
        {uniqueParticleTypes.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <h4
              style={{
                fontSize: "0.85rem",
                textTransform: "uppercase",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              Particle Textures
            </h4>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              {uniqueParticleTypes.map((type) => (
                <ParticleTexturePreview
                  key={type}
                  particleType={type}
                  packPath={winnerPack?.path}
                />
              ))}
            </div>
          </div>
        )}

        {/* Emission Point Visualization Toggle */}
        <label
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <input
            type="checkbox"
            checked={showEmissionPoints}
            onChange={(e) => setShowEmissionPoints(e.target.checked)}
          />
          <span style={{ fontSize: "0.85rem" }}>Show Emission Points</span>
        </label>

        {/* Condition Overrides */}
        {uniqueConditions.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <Separator style={{ margin: "0.75rem 0" }} />
            <h4
              style={{
                fontSize: "0.85rem",
                textTransform: "uppercase",
                fontWeight: "600",
                marginBottom: "0.5rem",
              }}
            >
              Condition Overrides
            </h4>
            <p
              style={{
                color: "#888",
                fontSize: "0.8rem",
                marginBottom: "0.5rem",
              }}
            >
              Force conditions to test different particle behaviors:
            </p>
            {uniqueConditions.map((condition) => (
              <label
                key={condition}
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={isConditionOverridden(condition)}
                  onChange={(e) =>
                    handleConditionChange(condition, e.target.checked)
                  }
                />
                <span style={{ fontSize: "0.85rem", fontFamily: "monospace" }}>
                  {condition}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </TabsContent>
  );
};
