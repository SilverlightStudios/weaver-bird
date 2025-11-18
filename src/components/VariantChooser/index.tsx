import s from "./styles.module.scss";

/**
 * Represents a pack variant option with UI state
 * (distinct from the domain model Provider type)
 */
interface ProviderOption {
  packId: string;
  packName: string;
  isPenciled?: boolean;
  isWinner?: boolean;
}

interface Props {
  providers: ProviderOption[];
  onSelectProvider: (packId: string) => void;
  assetId?: string;
}

export default function VariantChooser({
  providers,
  onSelectProvider,
  assetId,
}: Props) {
  if (!assetId || providers.length === 0) {
    return (
      <div className={s.root}>
        <h3 className={s.header}>Variants</h3>
        <div className={s.emptyState}>
          {!assetId
            ? "Select an asset to see available variants"
            : "No variants available"}
        </div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <div className={s.providers}>
        {providers.map((provider) => (
          <div
            key={provider.packId}
            className={`${s.provider} ${provider.isWinner ? s.winner : ""} ${
              provider.isPenciled ? s.penciled : ""
            }`}
            onClick={() => onSelectProvider(provider.packId)}
            title="Click to select this texture variant"
          >
            <div className={s.providerName}>
              {provider.packName}
              {provider.isPenciled && (
                <span className={`${s.badge} ${s.pencilBadge}`}>Override</span>
              )}
              {provider.isWinner && !provider.isPenciled && (
                <span className={s.badge}>Active</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
