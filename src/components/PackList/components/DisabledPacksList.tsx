import { DroppableArea } from "./DroppableArea";
import { SortablePackItem } from "./SortablePackItem";
import { DISABLED_CONTAINER_ID } from "../constants";
import type { PackItem } from "../types";
import s from "../styles.module.scss";

interface DisabledPacksListProps {
  packs: PackItem[];
  packIds: string[];
  packLookup: Map<string, PackItem>;
  onEnable?: (id: string) => void;
}

export function DisabledPacksList({
  packs,
  packIds,
  packLookup,
  onEnable,
}: DisabledPacksListProps) {
  return (
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
            {packs.length === 0 ? (
              <li className={s.disabledEmpty}>
                Disabled packs will appear here.
              </li>
            ) : (
              packIds.map((packId, index) => {
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
  );
}
