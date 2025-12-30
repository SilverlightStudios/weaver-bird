import { useMemo } from "react";
import { TabsContent } from "@/ui/components/tabs";
import { Separator } from "@/ui/components/Separator/Separator";
import { useStore } from "@state/store";
import type { EntityCompositeSchema, EntityFeatureControl } from "@lib/entityComposite";

export function EntityFeaturesTab({
  schema,
}: {
  schema: EntityCompositeSchema;
}) {
  const featureState = useStore(
    (state) => state.entityFeatureStateByAssetId[schema.baseAssetId],
  );
  const setToggle = useStore((state) => state.setEntityFeatureToggle);
  const setSelect = useStore((state) => state.setEntityFeatureSelect);

  const stateView = useMemo(
    () => ({
      toggles: featureState?.toggles ?? {},
      selects: featureState?.selects ?? {},
    }),
    [featureState],
  );

  const getToggleValue = (c: Extract<EntityFeatureControl, { kind: "toggle" }>) =>
    stateView.toggles[c.id] ?? c.defaultValue;
  const getSelectValue = (c: Extract<EntityFeatureControl, { kind: "select" }>) =>
    stateView.selects[c.id] ?? c.defaultValue;

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
