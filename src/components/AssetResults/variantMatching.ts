/**
 * Utilities for smart variant selection based on search queries
 *
 * When a user searches for "jungle" and clicks "boat", we want to select
 * the "jungle" variant of the boat. These utilities score variants based
 * on how well they match the search terms.
 */

function calculateTermMatchScore(
  term: string,
  variantName: string,
  variantPath: string,
): number {
  if (!variantName.includes(term)) return 0;

  const isExactWord = new RegExp(`\\b${term}\\b`).test(variantName);
  const matchBonus = isExactWord ? 10 : 5;
  const lastSegment = variantPath.split("/").pop()?.toLowerCase() ?? "";
  const isInLastSegment = lastSegment.includes(term);
  const positionBonus = isInLastSegment ? 5 : 0;

  return matchBonus + positionBonus;
}

function calculateVariantScore(
  variant: string,
  queryTerms: string[],
): number {
  const variantPath = variant.includes(":")
    ? variant.split(":")[1] ?? variant
    : variant;
  const variantName = variantPath.toLowerCase();

  let score = 0;
  for (const term of queryTerms) {
    score += calculateTermMatchScore(term, variantName, variantPath);
  }

  return score;
}

/**
 * Find the best matching variant from a list based on the search query.
 * Returns the variant whose name contains the most search terms.
 */
export function findBestMatchingVariant(
  variants: string[],
  query: string,
): string {
  if (!query || variants.length === 0) {
    return variants[0] ?? "";
  }

  const queryTerms = query
    .toLowerCase()
    .split(/[\s_\-/]+/)
    .filter((term) => term.length > 0);

  if (queryTerms.length === 0) {
    return variants[0] ?? "";
  }

  let bestMatch = variants[0] ?? "";
  let bestScore = -1;

  for (const variant of variants) {
    const score = calculateVariantScore(variant, queryTerms);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = variant;
    }
  }

  return bestScore > 0 ? bestMatch : variants[0] ?? "";
}
