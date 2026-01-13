import type { AssetRecord } from "@state/types";

export interface AssetItem {
  id: string;
  name: string;
}

export interface PaginationInfo {
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Props {
  assets: AssetRecord[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onPaginationChange?: (info: PaginationInfo) => void; // Callback to report pagination state
}

export interface AssetCardProps {
  asset: AssetItem;
  isSelected: boolean;
  onSelect: () => void;
  variantCount?: number; // Number of variants if this is a grouped asset
  staggerIndex?: number; // Index for staggering 3D model loading
}
