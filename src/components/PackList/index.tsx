import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  DragDropProvider,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  type DragDropEvents,
} from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { CollisionPriority } from "@dnd-kit/abstract";
import { useSort } from "./useSort";
import { minecraftTextToHTML } from "@/utils/minecraftColors";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { LauncherInfo } from "@/state/types";
import ResourcePackCard, {
  type ResourcePackCardMetadata,
} from "@app/ResourcePackCard";
import Button from "@/ui/components/buttons/Button";
import {
  Combobox,
  type ComboboxOption,
} from "@/ui/components/Combobox/Combobox";
import { Separator } from "@/ui/components/Separator/Separator";
import s from "./styles.module.scss";

interface PackItem {
  id: string;
  name: string;
  size: number;
  description?: string;
  icon_data?: string;
}

interface Props {
  packs: PackItem[];
  disabledPacks?: PackItem[];
  onReorder?: (order: string[]) => void;
  onReorderDisabled?: (order: string[]) => void;
  onDisable?: (packId: string, targetIndex?: number) => void;
  onEnable?: (packId: string, targetIndex?: number) => void;
  onBrowse?: () => void;
  packsDir?: string;
  selectedLauncher?: LauncherInfo;
  availableLaunchers?: LauncherInfo[];
  onLauncherChange?: (launcher: LauncherInfo) => void;
}

interface SortablePackItemProps {
  item: PackItem;
  containerId: "enabled" | "disabled";
  index: number;
  isDraggable?: boolean;
  actionLabel: string;
  actionIcon: string;
  onActionClick?: () => void;
}

const ENABLED_CONTAINER_ID: PackContainer = "enabled";
const DISABLED_CONTAINER_ID: PackContainer = "disabled";
type PackContainer = "enabled" | "disabled";
type PreviewState = Record<PackContainer, string[]>;

type DragStartEventType = Parameters<DragDropEvents["dragstart"]>[0];
type DragOverEventType = Parameters<DragDropEvents["dragover"]>[0];
type DragEndEventType = Parameters<DragDropEvents["dragend"]>[0];
type MoveEvent = DragOverEventType | DragEndEventType;

type DroppableRenderProps = {
  setNodeRef: (element: HTMLElement | null) => void;
  isDropTarget: boolean;
};

interface DroppableAreaProps {
  id: string;
  children: (props: DroppableRenderProps) => React.ReactNode;
}

function DroppableArea({ id, children }: DroppableAreaProps) {
  const { isDropTarget, ref } = useDroppable({
    id,
    type: "column",
    accept: ["pack"],
    collisionPriority: CollisionPriority.Low,
  });
  return <>{children({ isDropTarget, setNodeRef: ref })}</>;
}

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

function SortablePackItem({
  item,
  containerId,
  index,
  isDraggable = true,
  actionIcon,
  actionLabel,
  onActionClick,
}: SortablePackItemProps) {
  const { setNodeRef, isDragging, isDropTarget } = useSort(
    item.id,
    containerId,
    index,
    !isDraggable,
  );

  const descriptionHTML = useMemo(() => {
    if (!item.description) return "";
    return minecraftTextToHTML(item.description);
  }, [item.description]);

  const metadata = useMemo<ResourcePackCardMetadata[]>(() => {
    const sizeLabel = formatPackSize(item.size);
    return sizeLabel ? [{ label: "Size", value: sizeLabel }] : [];
  }, [item.size]);

  const iconSrc = useMemo(() => {
    if (!item.icon_data) return undefined;
    return `data:image/png;base64,${item.icon_data}`;
  }, [item.icon_data]);

  const handleActionPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
    },
    [],
  );

  const handleActionClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onActionClick?.();
    },
    [onActionClick],
  );

  const wrapperClassName = s.itemWrapper;

  const actionButtonClassName = [
    s.actionButton,
    containerId === "disabled" ? s.enableButton : s.disableButton,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li
      ref={setNodeRef}
      className={wrapperClassName}
      data-dragging={isDragging || undefined}
      data-droptarget={isDropTarget || undefined}
    >
      <div className={s.cardWrapper}>
        <ResourcePackCard
          name={item.name}
          iconSrc={iconSrc}
          metadata={metadata}
          description={
            item.description ? (
              <span dangerouslySetInnerHTML={{ __html: descriptionHTML }} />
            ) : undefined
          }
          isDragging={isDragging}
        />
        {onActionClick && (
          <button
            type="button"
            className={actionButtonClassName}
            onClick={handleActionClick}
            onPointerDown={handleActionPointerDown}
            aria-label={actionLabel}
          >
            {actionIcon}
          </button>
        )}
      </div>
    </li>
  );
}

function formatPackSize(size?: number) {
  if (!size || size <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export default function PackList({
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
}: Props) {
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
      if (!sourceId) {
        setActiveItem(null);
        previewRef.current = actualStructure;
        setPreviewItemsState(actualStructure);
        return;
      }

      const packId = String(sourceId);

      if (event.canceled) {
        setActiveItem(null);
        previewRef.current = actualStructure;
        setPreviewItemsState(actualStructure);
        return;
      }

      const wasEnabled = enabledIds.includes(packId);
      const nowEnabled = updated.enabled.includes(packId);
      const targetIndex = nowEnabled
        ? updated.enabled.indexOf(packId)
        : updated.disabled.indexOf(packId);

      if (wasEnabled && nowEnabled) {
        if (!arraysEqual(enabledIds, updated.enabled)) {
          onReorder?.(updated.enabled);
        }
      } else if (!wasEnabled && !nowEnabled) {
        if (!arraysEqual(disabledIds, updated.disabled)) {
          onReorderDisabled?.(updated.disabled);
        }
      } else if (wasEnabled && !nowEnabled) {
        onDisable?.(packId, targetIndex === -1 ? undefined : targetIndex);
      } else if (!wasEnabled && nowEnabled) {
        onEnable?.(packId, targetIndex === -1 ? undefined : targetIndex);
      }

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
  const handleLauncherSelect = useCallback(
    (value: string) => {
      const launcher = availableLaunchers.find(
        (l) => l.minecraft_dir === value,
      );
      if (launcher && onLauncherChange) {
        onLauncherChange(launcher);
      }
    },
    [availableLaunchers, onLauncherChange],
  );

  const launcherOptions = useMemo<ComboboxOption[]>(
    () =>
      availableLaunchers.map((launcher) => ({
        value: launcher.minecraft_dir,
        label: launcher.name,
        disabled: !launcher.found,
      })),
    [availableLaunchers],
  );

  return (
    <DragDropProvider
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className={s.root}>
        {availableLaunchers.length > 0 && (
          <>
            <div className={s.launcherSection}>
              <label htmlFor="launcher-select" className={s.launcherLabel}>
                Minecraft Location
              </label>
              <Combobox
                options={launcherOptions}
                value={selectedLauncher?.minecraft_dir || ""}
                onValueChange={handleLauncherSelect}
                placeholder="Select launcher..."
                searchPlaceholder="Search launchers..."
                emptyMessage="No launchers found"
                renderTrigger={({ selectedLabel, placeholder, isOpen }) => (
                  <div className={s.launcherDropdownWrapper}>
                    {selectedLauncher?.icon_path && (
                      <img
                        src={convertFileSrc(selectedLauncher.icon_path)}
                        alt={`${selectedLauncher.name} icon`}
                        className={s.launcherDropdownIcon}
                      />
                    )}
                    <button
                      className={s.launcherDropdown}
                      type="button"
                      aria-expanded={isOpen}
                    >
                      <span className={s.launcherDropdownText}>
                        {selectedLabel || placeholder}
                      </span>
                      <span className={s.launcherDropdownArrow}>
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </button>
                  </div>
                )}
              />
            </div>
            <Separator className={s.separator} />
          </>
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
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <h3 className={s.sectionTitle}>Enabled Packs</h3>
            <p className={s.sectionHint}>Higher packs override lower ones.</p>
          </div>
          <DroppableArea id={ENABLED_CONTAINER_ID}>
            {({ setNodeRef, isDropTarget }) => (
              <ul
                ref={setNodeRef}
                className={s.list}
                data-dropping={isDropTarget || undefined}
              >
                {packs.length === 0 ? (
                  <li className={s.emptyState}>
                    No resource packs found. Click "Browse" to select your
                    resource packs directory.
                  </li>
                ) : (
                  renderEnabledIds.map((packId, index) => {
                    const pack = packLookup.get(packId);
                    if (!pack) return null;
                    const isVanilla = pack.id === "minecraft:vanilla";
                    return (
                      <SortablePackItem
                        key={pack.id}
                        item={pack}
                        containerId="enabled"
                        index={index}
                        isDraggable={!isVanilla}
                        actionLabel={`Disable ${pack.name}`}
                        actionIcon="X"
                        onActionClick={
                          !isVanilla && onDisable
                            ? () => onDisable(pack.id)
                            : undefined
                        }
                      />
                    );
                  })
                )}
              </ul>
            )}
          </DroppableArea>
        </div>

        <div className={s.section}>
          <div className={s.sectionHeader}>
            <h3 className={s.sectionTitle}>Disabled Packs</h3>
            <p className={s.sectionHint}>
              Drag packs here or press X to keep them out of calculations.
            </p>
          </div>
          <DroppableArea id={DISABLED_CONTAINER_ID}>
            {({ setNodeRef, isDropTarget }) => (
              <ul
                ref={setNodeRef}
                className={`${s.list} ${s.disabledList}`}
                data-dropping={isDropTarget || undefined}
              >
                {disabledPacks.length === 0 ? (
                  <li className={s.disabledEmpty}>
                    Disabled packs will appear here.
                  </li>
                ) : (
                  renderDisabledIds.map((packId, index) => {
                    const pack = packLookup.get(packId);
                    if (!pack) return null;
                    return (
                      <SortablePackItem
                        key={pack.id}
                        item={pack}
                        containerId="disabled"
                        index={index}
                        isDraggable={true}
                        actionLabel={`Enable ${pack.name}`}
                        actionIcon="+"
                        onActionClick={
                          onEnable ? () => onEnable(pack.id) : undefined
                        }
                      />
                    );
                  })
                )}
              </ul>
            )}
          </DroppableArea>
        </div>

        <DragOverlay>
          {activeItem ? (
            <div className={s.cardWrapper}>
              <ResourcePackCard
                name={activeItem.name}
                iconSrc={
                  activeItem.icon_data
                    ? `data:image/png;base64,${activeItem.icon_data}`
                    : undefined
                }
                metadata={
                  activeItem.size
                    ? [
                        {
                          label: "Size",
                          value: formatPackSize(activeItem.size),
                        },
                      ]
                    : []
                }
                description={
                  activeItem.description ? (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: minecraftTextToHTML(activeItem.description),
                      }}
                    />
                  ) : undefined
                }
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DragDropProvider>
  );
}
