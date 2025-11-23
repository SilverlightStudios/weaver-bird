/**
 * Search utilities for asset filtering and category extraction
 */

export interface AssetCategory {
  type: 'category';
  name: string;
  displayName: string;
  count: number;
  matchingAssetIds: string[];
}

export interface AssetSuggestion {
  type: 'asset';
  id: string;
  name: string;
}

export type SearchSuggestion = AssetCategory | AssetSuggestion;

/**
 * Normalize a search query for fuzzy matching
 * - Converts spaces to underscores
 * - Converts to lowercase
 *
 * Example: "acacia log" -> "acacia_log"
 */
export function normalizeQuery(query: string): string {
  return query.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Normalize an asset ID for matching
 * - Converts to lowercase
 * - Optionally keeps namespace
 *
 * Example: "minecraft:block/acacia_log" -> "minecraft:block/acacia_log"
 */
export function normalizeAssetId(assetId: string): string {
  return assetId.toLowerCase();
}

/**
 * Check if an asset matches a query using fuzzy matching
 * Supports:
 * - Space-to-underscore matching ("acacia log" matches "acacia_log")
 * - Partial matching ("oak" matches "oak_leaves", "dark_oak_planks")
 * - Case-insensitive
 */
export function assetMatchesQuery(assetId: string, labels: string[], query: string): boolean {
  const normalizedQuery = normalizeQuery(query);
  const normalizedId = normalizeAssetId(assetId);

  // Check if asset ID contains the query
  if (normalizedId.includes(normalizedQuery)) {
    return true;
  }

  // Check if any label contains the query
  return labels.some(label =>
    label.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Extract category from asset ID
 * Examples:
 * - "minecraft:block/acacia_log" -> "block"
 * - "minecraft:item/diamond_sword" -> "item"
 * - "minecraft:entity/creeper/creeper" -> "entity"
 */
export function extractCategory(assetId: string): string | null {
  const parts = assetId.split(':');
  if (parts.length < 2) return null;

  const path = parts[1]; // "block/acacia_log"
  const pathParts = path.split('/');

  return pathParts[0] || null; // "block"
}

/**
 * Extract all meaningful keywords from an asset ID for categorization
 * Examples:
 * - "minecraft:block/acacia_log" -> ["block", "acacia", "log"]
 * - "minecraft:item/diamond_sword" -> ["item", "diamond", "sword"]
 */
export function extractKeywords(assetId: string): string[] {
  const parts = assetId.split(':');
  if (parts.length < 2) return [];

  const path = parts[1]; // "block/acacia_log"
  const pathParts = path.split('/'); // ["block", "acacia_log"]

  const keywords: string[] = [];

  pathParts.forEach(part => {
    // Split by underscores to get individual words
    const words = part.split('_').filter(w => w.length > 0);
    keywords.push(...words);
  });

  return keywords;
}

/**
 * Beautify category name for display
 * Examples:
 * - "block" -> "Blocks"
 * - "mob_effect" -> "Mob Effects"
 */
export function beautifyCategoryName(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') + 's';
}

/**
 * Build dynamic categories from matching assets
 * Returns categories sorted by asset count (descending)
 */
export function buildCategories(
  matchingAssets: Array<{ id: string; labels: string[] }>,
  maxCategories: number = 5
): AssetCategory[] {
  // Build category map
  const categoryMap = new Map<string, Set<string>>();

  matchingAssets.forEach(asset => {
    // Add main category (block, item, etc.)
    const mainCategory = extractCategory(asset.id);
    if (mainCategory) {
      if (!categoryMap.has(mainCategory)) {
        categoryMap.set(mainCategory, new Set());
      }
      categoryMap.get(mainCategory)!.add(asset.id);
    }

    // Add keyword categories (acacia, oak, diamond, etc.)
    const keywords = extractKeywords(asset.id);
    keywords.forEach(keyword => {
      // Skip very common/generic keywords
      if (keyword.length < 3) return;
      if (['top', 'side', 'front', 'back', 'bottom', 'end'].includes(keyword)) return;

      if (!categoryMap.has(keyword)) {
        categoryMap.set(keyword, new Set());
      }
      categoryMap.get(keyword)!.add(asset.id);
    });
  });

  // Convert to array and sort by count
  const categories: AssetCategory[] = Array.from(categoryMap.entries())
    .map(([name, assetIds]): AssetCategory => ({
      type: 'category',
      name,
      displayName: beautifyCategoryName(name),
      count: assetIds.size,
      matchingAssetIds: Array.from(assetIds),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxCategories);

  return categories;
}

/**
 * Build search suggestions from assets and query
 * Returns categories + top matching assets
 */
export function buildSearchSuggestions(
  assets: Array<{ id: string; labels: string[] }>,
  query: string,
  maxAssets: number = 10,
  maxCategories: number = 5
): SearchSuggestion[] {
  if (query.length < 2) {
    return [];
  }

  // Filter assets that match the query
  const matchingAssets = assets.filter(asset =>
    assetMatchesQuery(asset.id, asset.labels, query)
  );

  // Build categories
  const categories = buildCategories(matchingAssets, maxCategories);

  // Build asset suggestions (top N matches)
  const assetSuggestions: AssetSuggestion[] = matchingAssets
    .slice(0, maxAssets)
    .map(asset => ({
      type: 'asset' as const,
      id: asset.id,
      name: asset.id,
    }));

  // Return categories first, then assets
  return [...categories, ...assetSuggestions];
}
