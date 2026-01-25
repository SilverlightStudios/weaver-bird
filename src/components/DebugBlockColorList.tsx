/**
 * Debug component for visualizing Minecraft BlockColors registry data.
 *
 * This component displays all blocks that support biome-based tinting,
 * grouped by tint type (grass, foliage, water, etc.).
 */

import { useState } from "react";
import { useBlockColors } from "@/hooks/useBlockColors";
import {
  DEFAULT_MC_VERSION,
  getSupportedVersions,
} from "@/utils/blockColors/yarnVersions";
import {
  clearBlockColorsCache,
  type ParsedTintEntry,
} from "@/utils/blockColors/fetchBlockColors";

export default function DebugBlockColorList() {
  const [selectedVersion, setSelectedVersion] =
    useState<string>(DEFAULT_MC_VERSION);
  const { loading, error, data, refetch } = useBlockColors(selectedVersion);

  const handleClearCache = () => {
    clearBlockColorsCache(selectedVersion);
    refetch();
  };

  const handleClearAllCaches = () => {
    clearBlockColorsCache();
    refetch();
  };

  // Group entries by tint type
  const groupedEntries =
    data?.entries.reduce(
      (acc, entry) => {
        const key = entry.tint;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(entry);
        return acc;
      },
      {} as Record<string, ParsedTintEntry[]>,
    ) ?? {};

  const sortedTintTypes = Object.keys(groupedEntries).sort((a, b) => {
    // Sort order: grass, foliage, water, fixed_*, special
    const order = ["grass", "foliage", "water"];
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    if (a.startsWith("fixed_") && b.startsWith("fixed_"))
      return a.localeCompare(b);
    if (a.startsWith("fixed_")) return -1;
    if (b.startsWith("fixed_")) return 1;

    return a.localeCompare(b);
  });

  const getTintTypeColor = (tintType: string): string => {
    if (tintType === "grass") return "#7FCC19";
    if (tintType === "foliage") return "#48B518";
    if (tintType === "water") return "#3F76E4";
    if (tintType.startsWith("fixed_")) return "#888888";
    return "#FF6B6B";
  };

  const getTintTypeLabel = (tintType: string): string => {
    if (tintType === "grass") return "Grass Colormap";
    if (tintType === "foliage") return "Foliage Colormap";
    if (tintType === "water") return "Water Colormap";
    if (tintType.startsWith("fixed_")) {
      const hex = tintType.replace("fixed_", "");
      return `Fixed Color (${hex})`;
    }
    return "Special Logic";
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "monospace",
        backgroundColor: "#1e1e1e",
        color: "#d4d4d4",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}>Minecraft BlockColors Debug</h1>

      {/* Version selector */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <label htmlFor="version-select">Minecraft Version:</label>
        <select
          id="version-select"
          value={selectedVersion}
          onChange={(e) => setSelectedVersion(e.target.value)}
          style={{
            padding: "8px 12px",
            backgroundColor: "#2d2d2d",
            color: "#d4d4d4",
            border: "1px solid #3e3e3e",
            borderRadius: "4px",
          }}
        >
          {getSupportedVersions().map((version) => (
            <option key={version} value={version}>
              {version}
            </option>
          ))}
        </select>

        <button
          onClick={handleClearCache}
          style={{
            padding: "8px 12px",
            backgroundColor: "#3e3e3e",
            color: "#d4d4d4",
            border: "1px solid #5e5e5e",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Clear Cache
        </button>

        <button
          onClick={handleClearAllCaches}
          style={{
            padding: "8px 12px",
            backgroundColor: "#3e3e3e",
            color: "#d4d4d4",
            border: "1px solid #5e5e5e",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Clear All Caches
        </button>

        <button
          onClick={refetch}
          style={{
            padding: "8px 12px",
            backgroundColor: "#3e3e3e",
            color: "#d4d4d4",
            border: "1px solid #5e5e5e",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#2d2d2d",
            borderRadius: "4px",
          }}
        >
          Loading block colors for {selectedVersion}...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: "20px",
            backgroundColor: "#3e1e1e",
            color: "#ff6b6b",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Data display */}
      {data && (
        <>
          <div
            style={{
              marginBottom: "20px",
              padding: "15px",
              backgroundColor: "#2d2d2d",
              borderRadius: "4px",
            }}
          >
            <div>
              <strong>Version:</strong> {data.version}
            </div>
            <div>
              <strong>Yarn Tag:</strong> {data.yarnTag}
            </div>
            <div>
              <strong>Fetched:</strong>{" "}
              {new Date(data.fetchedAt).toLocaleString()}
            </div>
            <div>
              <strong>Total Entries:</strong> {data.entries.length}
            </div>
            <div>
              <strong>Total Blocks:</strong>{" "}
              {data.entries.reduce(
                (sum, entry) => sum + entry.blocks.length,
                0,
              )}
            </div>
          </div>

          {/* Grouped entries */}
          {sortedTintTypes.map((tintType) => {
            const entries = groupedEntries[tintType];
            const totalBlocks = entries.reduce(
              (sum, entry) => sum + entry.blocks.length,
              0,
            );
            const color = getTintTypeColor(tintType);

            return (
              <div key={tintType} style={{ marginBottom: "30px" }}>
                <h2 style={{ color, marginBottom: "10px" }}>
                  {getTintTypeLabel(tintType)} ({entries.length} entries,{" "}
                  {totalBlocks} blocks)
                </h2>

                <table
                  style={{
                    width: "100%",
                    backgroundColor: "#2d2d2d",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: "#3e3e3e" }}>
                      <th
                        style={{
                          padding: "10px",
                          textAlign: "left",
                          borderBottom: "2px solid #5e5e5e",
                        }}
                      >
                        Blocks
                      </th>
                      <th
                        style={{
                          padding: "10px",
                          textAlign: "left",
                          borderBottom: "2px solid #5e5e5e",
                          width: "200px",
                        }}
                      >
                        Tint Type
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, index) => (
                      <tr
                        key={index}
                        style={{ borderBottom: "1px solid #3e3e3e" }}
                      >
                        <td style={{ padding: "10px", verticalAlign: "top" }}>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "5px",
                            }}
                          >
                            {entry.blocks.map((block) => (
                              <span
                                key={block}
                                style={{
                                  padding: "4px 8px",
                                  backgroundColor: "#3e3e3e",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                }}
                              >
                                {block}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: "10px", verticalAlign: "top" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              backgroundColor: `${color}33`,
                              color: color,
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "bold",
                            }}
                          >
                            {entry.tint}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
