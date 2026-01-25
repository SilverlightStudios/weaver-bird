import type { TabItem } from "@/ui/components/blocky-tabs/types";
import { PackList } from "@components/PackList";
import cobbleImg from "@/assets/textures/cobblestone.png";
import type { LauncherInfo } from "@lib/tauri";

interface ResourcePacksTabProps {
  packListItems: Array<{
    id: string;
    name: string;
    size: string;
    description?: string;
    icon_data?: string;
  }>;
  disabledPackListItems: Array<{
    id: string;
    name: string;
    size: string;
    description?: string;
    icon_data?: string;
  }>;
  handleReorderPacks: (newOrder: string[]) => void;
  handleReorderDisabledPacks: (newOrder: string[]) => void;
  handleDisablePack: (packId: string, targetIndex?: number) => void;
  handleEnablePack: (packId: string, targetIndex?: number) => void;
  handleBrowsePacksFolder: () => Promise<void>;
  packsDir: string;
  selectedLauncher: LauncherInfo | null;
  availableLaunchers: LauncherInfo[];
  handleLauncherChange: (launcher: LauncherInfo) => Promise<void>;
}

export function createResourcePacksTab(props: ResourcePacksTabProps): TabItem {
  return {
    id: "resource-packs",
    label: "Resource Packs",
    icon: cobbleImg,
    color: "#4A90E2",
    defaultDrawerSize: 25,
    content: (
      <PackList
        packs={props.packListItems}
        disabledPacks={props.disabledPackListItems}
        onReorder={props.handleReorderPacks}
        onReorderDisabled={props.handleReorderDisabledPacks}
        onDisable={props.handleDisablePack}
        onEnable={props.handleEnablePack}
        onBrowse={props.handleBrowsePacksFolder}
        packsDir={props.packsDir}
        selectedLauncher={props.selectedLauncher}
        availableLaunchers={props.availableLaunchers}
        onLauncherChange={props.handleLauncherChange}
      />
    ),
  };
}
