import { useMemo, useEffect, useRef } from "react";
import { TabsContent } from "@/ui/components/tabs";
import { Separator } from "@/ui/components/Separator/Separator";
import { useStore } from "@state/store";
import type { EntityCompositeSchema, EntityFeatureControl } from "@lib/entityComposite";

export function EntityFeaturesTab({
  schema,
}: {
  schema: EntityCompositeSchema;
}) {
  const selectedAssetId = useStore((state) => state.selectedAssetId);
  const featureState = useStore(
    (state) => state.entityFeatureStateByAssetId[schema.baseAssetId],
  );
  const setToggle = useStore((state) => state.setEntityFeatureToggle);
  const setSelect = useStore((state) => state.setEntityFeatureSelect);

  // Track the previous selectedAssetId to detect when it changes
  const prevSelectedAssetIdRef = useRef(selectedAssetId);

  // Clear entity feature state when switching to a different variant of the same entity
  // This allows smart selection to work when clicking different boat variants
  useEffect(() => {
    if (selectedAssetId !== prevSelectedAssetIdRef.current) {
      // Extract entity paths from both asset IDs
      const extractEntityPath = (assetId: string | undefined) => {
        if (!assetId) return null;
        const path = assetId.includes(":") ? assetId.split(":")[1] : assetId;
        if (!path?.startsWith("entity/")) return null;
        return path.slice("entity/".length);
      };

      const currentPath = extractEntityPath(selectedAssetId);
      const prevPath = extractEntityPath(prevSelectedAssetIdRef.current);

      // Check if we're switching between variants of the same entity type
      // e.g., "boat/jungle" -> "boat/cherry"
      if (currentPath && prevPath) {
        const currentParts = currentPath.split("/");
        const prevParts = prevPath.split("/");

        // Same entity type (e.g., both are "boat/*") but different variants
        if (
          currentParts.length === 2 &&
          prevParts.length === 2 &&
          currentParts[0] === prevParts[0] &&
          currentParts[1] !== prevParts[1]
        ) {
          console.log(
            `[EntityFeaturesTab] Clearing stored state - switching from "${prevPath}" to "${currentPath}"`,
          );
          // Clear the stored variant selection so smart selection can apply
          setSelect(schema.baseAssetId, "entity.variant", "");
        }
      }

      prevSelectedAssetIdRef.current = selectedAssetId;
    }
  }, [selectedAssetId, schema.baseAssetId, setSelect]);

  const stateView = useMemo(
    () => ({
      toggles: featureState?.toggles ?? {},
      selects: featureState?.selects ?? {},
    }),
    [featureState],
  );

  const getToggleValue = (c: Extract<EntityFeatureControl, { kind: "toggle" }>) =>
    stateView.toggles[c.id] ?? c.defaultValue;
  const getSelectValue = (c: Extract<EntityFeatureControl, { kind: "select" }>) => {
    const storedValue = stateView.selects[c.id];

    // SMART SELECTION: Only use variant from selectedAssetId if there's NO stored value
    // This provides a smart initial default but respects user's manual changes
    if (c.id === "entity.variant" && !storedValue && selectedAssetId) {
      // Extract the variant from the selectedAssetId
      // e.g., "minecraft:entity/boat/jungle" -> "jungle"
      const path = selectedAssetId.includes(":")
        ? selectedAssetId.split(":")[1]
        : selectedAssetId;
      if (path && path.startsWith("entity/")) {
        const entityPath = path.slice("entity/".length);
        const parts = entityPath.split("/");
        if (parts.length === 2) {
          const [_dir, leaf] = parts;
          // Check if this leaf is a valid option for this control
          const isValidOption = c.options.some((opt) => opt.value === leaf);
          if (isValidOption && leaf !== c.defaultValue) {
            // Only use smart selection if it differs from the default
            // This ensures we're actually applying smart selection, not just the default
            console.log(
              `[EntityFeaturesTab.getSelectValue] Smart initial default from selectedAssetId: "${leaf}" (no stored value)`,
            );
            return leaf!;
          }
        }
      }
    }

    const finalValue = storedValue ?? c.defaultValue;
    console.log(
      `[EntityFeaturesTab.getSelectValue] control="${c.id}" stored="${storedValue}" default="${c.defaultValue}" final="${finalValue}"`,
    );
    return finalValue;
  };

  const toggles = schema.controls.filter(
    (c): c is Extract<EntityFeatureControl, { kind: "toggle" }> => c.kind === "toggle",
  );
  const selects = schema.controls.filter(
    (c): c is Extract<EntityFeatureControl, { kind: "select" }> => c.kind === "select",
  );

  const isEquipment = schema.entityRoot === "equipment";
  const equipmentUnderlayToggles = isEquipment
    ? toggles.filter((t) => t.id.startsWith("equipment.add_"))
    : [];
  const equipmentPieceToggles = isEquipment
    ? toggles.filter((t) => t.id.startsWith("equipment.show_"))
    : [];
  const otherToggles = isEquipment
    ? toggles.filter(
        (t) =>
          !t.id.startsWith("equipment.add_") && !t.id.startsWith("equipment.show_"),
      )
    : toggles;

  return (
    <TabsContent value="entity-features">
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">Entity Features</h3>
        <Separator className="mb-4" />

        {selects.length > 0 && (
          <div className="space-y-3 mb-4">
            {selects.map((control) => (
              <div key={control.id} className="space-y-1">
                <label className="block text-sm font-medium">
                  {control.label}
                </label>
                <select
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
                  value={getSelectValue(control)}
                  onChange={(e) =>
                    setSelect(schema.baseAssetId, control.id, e.target.value)
                  }
                >
                  {control.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {toggles.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Layers</label>

            {isEquipment ? (
              <div className="space-y-4">
                {equipmentUnderlayToggles.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Underlay</div>
                    {equipmentUnderlayToggles.map((control) => {
                      const enabled = !!getToggleValue(control);
                      return (
                        <label
                          key={control.id}
                          className="flex items-center gap-2 text-sm"
                          title={control.description}
                        >
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) =>
                              setToggle(
                                schema.baseAssetId,
                                control.id,
                                e.target.checked,
                              )
                            }
                          />
                          <span>{control.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {equipmentPieceToggles.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Armor Pieces</div>
                    {equipmentPieceToggles.map((control) => {
                      const enabled = !!getToggleValue(control);
                      return (
                        <label
                          key={control.id}
                          className="flex items-center gap-2 text-sm"
                          title={control.description}
                        >
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) =>
                              setToggle(
                                schema.baseAssetId,
                                control.id,
                                e.target.checked,
                              )
                            }
                          />
                          <span>{control.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {otherToggles.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Other</div>
                    {otherToggles.map((control) => {
                      const enabled = !!getToggleValue(control);
                      return (
                        <label
                          key={control.id}
                          className="flex items-center gap-2 text-sm"
                          title={control.description}
                        >
                          <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) =>
                              setToggle(
                                schema.baseAssetId,
                                control.id,
                                e.target.checked,
                              )
                            }
                          />
                          <span>{control.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {toggles.map((control) => {
                  const enabled = !!getToggleValue(control);
                  return (
                    <button
                      key={control.id}
                      onClick={() =>
                        setToggle(schema.baseAssetId, control.id, !enabled)
                      }
                      className={`
                        p-2 rounded-md border text-left transition-colors
                        ${
                          enabled
                            ? "bg-primary/20 border-primary"
                            : "bg-background border-border hover:bg-accent"
                        }
                      `}
                      title={control.description}
                    >
                      <span className="text-sm truncate">{control.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selects.length === 0 && toggles.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No feature layers detected for this model.
          </p>
        )}
      </div>
    </TabsContent>
  );
}
