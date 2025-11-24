export type ZoneId = "top" | "bottom" | "left" | "right";

export interface TabItem {
  id: string;
  icon?: string;
  label: string;
  color?: string;
  content: React.ReactNode;
  defaultDrawerSize?: number; // Percentage (5-80)
}

export interface BlockyTabsProps {
  initialTabs: Record<ZoneId, TabItem[]>;
  showZones?: boolean;
}
