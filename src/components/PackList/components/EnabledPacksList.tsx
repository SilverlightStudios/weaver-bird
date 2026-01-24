import { DroppableArea } from "./DroppableArea";
import { SortablePackItem } from "./SortablePackItem";
import { ENABLED_CONTAINER_ID } from "../constants";
import type { PackItem } from "../types";
import s from "../styles.module.scss";

interface EnabledPacksListProps {
  packs: PackItem[];
  packIds: string[];
  packLookup: Map<string, PackItem>;
  onDisable?: (id: string) => void;
}

export function EnabledPacksList({
  packs,
  packIds,
  packLookup,
  onDisable,
}: EnabledPacksListProps) {
  return (
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
              packIds.map((packId, index) => {
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
  );
}
