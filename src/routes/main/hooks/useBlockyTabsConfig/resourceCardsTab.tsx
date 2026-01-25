import type { TabItem } from "@/ui/components/blocky-tabs/types";
import { SearchBar } from "@components/SearchBar";
import AssetResults from "@components/AssetResults";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/ui/components/Pagination";
import { renderPageNumbers } from "../../../utils/renderPageNumbers";
import dirtImg from "@/assets/textures/dirt.png";
import type { AssetRecord } from "@state";

interface ResourceCardsTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  assetListItems: AssetRecord[];
  selectedAssetId: string | null;
  setSelectedAsset: (assetId: string) => void;
  setPaginationInfo: (info: { totalPages: number; hasPrevPage: boolean; hasNextPage: boolean }) => void;
  paginationInfo: {
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
  };
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

export function createResourceCardsTab(props: ResourceCardsTabProps): TabItem {
  return {
    id: "resource-cards",
    label: "Resource Cards",
    icon: dirtImg,
    color: "#50C878",
    defaultDrawerSize: 35,
    content: (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <div
          style={{
            padding: "var(--spacing-md)",
            paddingBottom: 0,
            position: "relative",
            zIndex: 10,
            backgroundColor: "var(--color-bg-primary, white)",
          }}
        >
          <SearchBar
            value={props.searchQuery}
            onChange={props.setSearchQuery}
            placeholder="Search blocks, mobs, textures..."
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <AssetResults
            assets={props.assetListItems}
            selectedId={props.selectedAssetId}
            onSelect={props.setSelectedAsset}
            onPaginationChange={props.setPaginationInfo}
          />
        </div>
        {props.paginationInfo.totalPages > 1 && (
          <div
            style={{
              padding: "var(--spacing-md)",
              paddingTop: 0,
              position: "relative",
              zIndex: 10,
              backgroundColor: "var(--color-bg-primary, white)",
            }}
          >
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => props.setCurrentPage(props.currentPage - 1)}
                    disabled={!props.paginationInfo.hasPrevPage}
                  />
                </PaginationItem>
                {renderPageNumbers(
                  props.currentPage,
                  props.paginationInfo.totalPages,
                  props.setCurrentPage,
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => props.setCurrentPage(props.currentPage + 1)}
                    disabled={!props.paginationInfo.hasNextPage}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    ),
  };
}
