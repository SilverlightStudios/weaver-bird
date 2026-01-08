import { TabsContent } from "@/ui/components/tabs";
import type { BlockStateSchema } from "@lib/tauri/blockModels";

interface AdvancedTabProps {
    assetId?: string;
    combinedAssetIds?: string[];
    seed: number;
    blockProps: Record<string, string>;
    schema: BlockStateSchema | null;
}

export const AdvancedTab = ({
    assetId,
    combinedAssetIds,
    seed,
    blockProps,
    schema,
}: AdvancedTabProps) => {
    const assetIdsToShow =
        combinedAssetIds && combinedAssetIds.length > 0
            ? combinedAssetIds
            : assetId
              ? [assetId]
              : [];

    return (
        <TabsContent value="advanced">
            <div>
                <h3>Advanced Options</h3>
                <p>Additional configuration options for advanced users.</p>
                <div style={{ fontSize: "0.85rem" }}>
                    {assetIdsToShow.length <= 1 ? (
                        <p>
                            <strong>Asset ID:</strong>{" "}
                            {assetIdsToShow[0] ?? "None"}
                        </p>
                    ) : (
                        <div>
                            <p>
                                <strong>Asset IDs:</strong>
                            </p>
                            <ul style={{ margin: "0.25rem 0 0.75rem 1rem" }}>
                                {assetIdsToShow.map((id) => (
                                    <li key={id}>{id}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <p>
                        <strong>Current Seed:</strong> {seed}
                    </p>
                    <p>
                        <strong>Block Props:</strong> {Object.keys(blockProps).length}{" "}
                        configured
                    </p>
                    <p>
                        <strong>Has Schema:</strong> {schema ? "Yes" : "No"}
                    </p>
                </div>
            </div>
        </TabsContent>
    );
};
