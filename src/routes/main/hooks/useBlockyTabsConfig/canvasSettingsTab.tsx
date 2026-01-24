import type { TabItem } from "@/ui/components/blocky-tabs/types";
import { CanvasSettings } from "@components/CanvasSettings";
import swordImg from "@/assets/textures/sword.png";

export function createCanvasSettingsTab(): TabItem {
  return {
    id: "canvas-settings",
    label: "Canvas Settings",
    icon: swordImg,
    color: "#9C27B0",
    defaultDrawerSize: 25,
    content: <CanvasSettings />,
  };
}
