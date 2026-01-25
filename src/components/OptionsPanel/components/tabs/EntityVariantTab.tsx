import { TabsContent } from "@/ui/components/tabs";
import { Separator } from "@/ui/components/Separator/Separator";
import { useStore } from "@state/store";
import { getEntityVariants } from "@lib/emf";

interface EntityVariantTabProps {
  assetId: string;
}

export const EntityVariantTab = ({ assetId }: EntityVariantTabProps) => {
  const selectedVariant = useStore((state) => state.entityVariant);
  const setEntityVariant = useStore((state) => state.setEntityVariant);

  const availableVariants = getEntityVariants(assetId);

  const handleVariantChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const {value} = event.target;
    setEntityVariant(value === "wall" ? undefined : value);
  };

  if (availableVariants.length === 0) {
    return null;
  }

  return (
    <TabsContent value="entity-variant">
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">Entity Variant</h3>
        <Separator className="mb-4" />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Model Variant
            </label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-background"
              value={selectedVariant ?? "wall"}
              onChange={handleVariantChange}
            >
              {availableVariants.map((variant) => (
                <option key={variant} value={variant}>
                  {variant.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              Select the entity model variant to display. Different variants show
              the entity in different attachment states or configurations.
            </p>
          </div>
        </div>
      </div>
    </TabsContent>
  );
};
