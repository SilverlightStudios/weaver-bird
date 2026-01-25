import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DragDropProvider,
  KeyboardSensor,
  PointerSensor,
} from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import Button from "@/ui/components/buttons/Button";
import { Separator } from "@/ui/components/Separator/Separator";
import { LauncherSelector } from "./components/LauncherSelector";
import { EnabledPacksList } from "./components/EnabledPacksList";
import { DisabledPacksList } from "./components/DisabledPacksList";
import { PackDragOverlay } from "./components/PackDragOverlay";
import { arraysEqual } from "./utilities";
import type {
  PackListProps,
  PackItem,
  PreviewState,
  DragStartEventType,
  DragOverEventType,
  DragEndEventType,
  MoveEvent,
} from "./types";
import s from "./styles.module.scss";

// Helper function to reset drag state to actual structure
function resetDragState(
  setActiveItem: (item: null) => void,
  previewRef: React.MutableRefObject<PreviewState>,
  actualStructure: PreviewState,
  setPreviewItemsState: (state: PreviewState) => void,
): void {
  setActiveItem(null);
  previewRef.current = actualStructure;
  setPreviewItemsState(actualStructure);
}

// Helper to handle reorder in enabled or disabled list
function handleReorderIfChanged(
  oldIds: string[],
  newIds: string[],
  onReorder?: (ids: string[]) => void,
): void {
  if (!arraysEqual(oldIds, newIds)) {
    onReorder?.(newIds);
  }
}

// Helper function to handle pack move actions (reorder, enable, disable)
function handlePackMove(
  packId: string,
  wasEnabled: boolean,
  nowEnabled: boolean,
  targetIndex: number,
  enabledIds: string[],
  disabledIds: string[],
  updatedEnabled: string[],
  updatedDisabled: string[],
  callbacks: {
    onReorder?: (ids: string[]) => void;
    onReorderDisabled?: (ids: string[]) => void;
    onDisable?: (id: string, index?: number) => void;
    onEnable?: (id: string, index?: number) => void;
  },
): void {
  const { onReorder, onReorderDisabled, onDisable, onEnable } = callbacks;
  const safeTargetIndex = targetIndex === -1 ? undefined : targetIndex;

  // Move from enabled to disabled
  if (wasEnabled && !nowEnabled) {
    onDisable?.(packId, safeTargetIndex);
    return;
  }

  // Move from disabled to enabled
  if (!wasEnabled && nowEnabled) {
    onEnable?.(packId, safeTargetIndex);
    return;
  }

  // Reorder within enabled packs
  if (wasEnabled && nowEnabled) {
    handleReorderIfChanged(enabledIds, updatedEnabled, onReorder);
    return;
  }

  // Reorder within disabled packs
  if (!wasEnabled && !nowEnabled) {
    handleReorderIfChanged(disabledIds, updatedDisabled, onReorderDisabled);
  }
}

export const PackList = ({
  packs,
  disabledPacks = [],
  onReorder,
  onReorderDisabled,
  onDisable,
  onEnable,
  onBrowse,
  selectedLauncher,
  availableLaunchers = [],
  onLauncherChange,
}: PackListProps) => {
  const sensors = useMemo(
    () => [
      PointerSensor.configure({
        activationConstraints: {
          distance: { value: 8 },
        },
      }),
      KeyboardSensor,
    ],
    [],
  );

  const enabledIds = useMemo(() => packs.map((p) => p.id), [packs]);
  const disabledIds = useMemo(
    () => disabledPacks.map((p) => p.id),
    [disabledPacks],
  );
  const packLookup = useMemo(() => {
    const lookup = new Map<string, PackItem>();
    [...packs, ...disabledPacks].forEach((pack) => lookup.set(pack.id, pack));
    return lookup;
  }, [packs, disabledPacks]);

  const actualStructure = useMemo<PreviewState>(
    () => ({
      enabled: enabledIds,
      disabled: disabledIds,
    }),
    [enabledIds, disabledIds],
  );

  const previewRef = useRef<PreviewState>(actualStructure);
  const [previewItems, setPreviewItemsState] =
    useState<PreviewState>(actualStructure);
  const [activeItem, setActiveItem] = useState<PackItem | null>(null);

  useEffect(() => {
    if (!activeItem) {
      previewRef.current = actualStructure;
      setPreviewItemsState(actualStructure);
    }
  }, [actualStructure, activeItem]);

  const applyPreviewMove = useCallback((event: MoveEvent) => {
    const next = move(previewRef.current, event);
    previewRef.current = next;
    setPreviewItemsState(next);
    return next;
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEventType) => {
      const sourceId = event.operation.source?.id;
      if (!sourceId) return;
      const pack = packLookup.get(String(sourceId));
      if (pack) {
        setActiveItem(pack);
      }
    },
    [packLookup],
  );

  const handleDragOver = useCallback(
    (event: DragOverEventType) => {
      applyPreviewMove(event);
    },
    [applyPreviewMove],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEventType) => {
      const updated = applyPreviewMove(event);
      const sourceId = event.operation.source?.id;

      if (!sourceId || event.canceled) {
        resetDragState(setActiveItem, previewRef, actualStructure, setPreviewItemsState);
        return;
      }

      const packId = String(sourceId);
      const wasEnabled = enabledIds.includes(packId);
      const nowEnabled = updated.enabled.includes(packId);
      const targetIndex = nowEnabled
        ? updated.enabled.indexOf(packId)
        : updated.disabled.indexOf(packId);

      handlePackMove(
        packId,
        wasEnabled,
        nowEnabled,
        targetIndex,
        enabledIds,
        disabledIds,
        updated.enabled,
        updated.disabled,
        { onReorder, onReorderDisabled, onDisable, onEnable },
      );

      setActiveItem(null);
    },
    [
      actualStructure,
      applyPreviewMove,
      disabledIds,
      enabledIds,
      onDisable,
      onEnable,
      onReorder,
      onReorderDisabled,
    ],
  );

  const renderEnabledIds = previewItems.enabled;
  const renderDisabledIds = previewItems.disabled;

  return (
    <DragDropProvider
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={s.root}>
        {onLauncherChange && (
          <LauncherSelector
            selectedLauncher={selectedLauncher}
            availableLaunchers={availableLaunchers}
            onLauncherChange={onLauncherChange}
          />
        )}

        <div className={s.headerSection}>
          <h2 className={s.header}>Resource Packs</h2>
          {onBrowse && (
            <Button
              className={s.browseButton}
              onClick={onBrowse}
              variant="secondary"
              size="md"
            >
              Browse
            </Button>
          )}
        </div>
        <Separator className={s.separator} />

        <EnabledPacksList
          packs={packs}
          packIds={renderEnabledIds}
          packLookup={packLookup}
          onDisable={onDisable}
        />

        <DisabledPacksList
          packs={disabledPacks}
          packIds={renderDisabledIds}
          packLookup={packLookup}
          onEnable={onEnable}
        />

        <PackDragOverlay activeItem={activeItem} />
      </div>
    </DragDropProvider>
  );
};
