import { useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  type PointerSensorOptions,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
  onReorder?: (order: string[]) => void;
  onBrowse?: () => void;
  packsDir?: string;
  selectedLauncher?: LauncherInfo;
  availableLaunchers?: LauncherInfo[];
  onLauncherChange?: (launcher: LauncherInfo) => void;
}

interface SortablePackItemProps {
  item: PackItem;
}

function SortablePackItem({ item }: SortablePackItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSort(item.id);

  const style = {
    transform,
    transition: transition ?? undefined,
  } as const;

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

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={s.itemWrapper}
      {...attributes}
      {...listeners}
    >
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
  onReorder,
  onBrowse,
  packsDir,
  selectedLauncher,
  availableLaunchers = [],
  onLauncherChange,
}: Props) {
  const pointerSensorOptions: PointerSensorOptions = {
    activationConstraint: {
      distance: 8,
    },
  };

  const sensors = useSensors(
    useSensor(PointerSensor, pointerSensorOptions),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const itemIds = useMemo(() => packs.map((p) => p.id), [packs]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = itemIds.indexOf(active.id as string);
      const newIndex = itemIds.indexOf(over.id as string);

      const newOrder = arrayMove(itemIds, oldIndex, newIndex);
      onReorder?.(newOrder);
    },
    [itemIds, onReorder],
  );

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
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
        {packsDir && <div className={s.packsDir}>{packsDir}</div>}
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <ul className={s.list}>
            {packs.length === 0 ? (
              <li className={s.emptyState}>
                No resource packs found. Click "Browse" to select your resource
                packs directory.
              </li>
            ) : (
              packs.map((pack) => (
                <SortablePackItem key={pack.id} item={pack} />
              ))
            )}
          </ul>
        </SortableContext>
      </div>
    </DndContext>
  );
}
