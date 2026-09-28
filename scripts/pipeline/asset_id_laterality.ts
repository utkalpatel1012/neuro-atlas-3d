/**
 * Single source of truth for an asset's declared laterality.
 *
 * Asset ids follow the project-wide convention mesh.<base>.<laterality>.v1,
 * where <laterality> is one of left | right | bilateral | midline. Both the
 * standalone validator (scripts/validate_asset.ts) and the pipeline's geometric
 * QA (scripts/pipeline/validate_mesh.ts) used to re-derive this separately:
 * the CLI used a binary "not-left is right" guess and the pipeline used
 * "not-left, not-right is midline". Those two derivations disagreed with each
 * other and with the asset id, so a bilateral mesh could be reported as midline
 * in one report and bilateral in another.
 *
 * Returning null for an unrecognised id is deliberate: inventing a laterality
 * would be a guess about anatomy, so callers must fail or ask instead.
 */

export type DeclaredLaterality = 'left' | 'right' | 'bilateral' | 'midline';

export const LATERALITY_SEGMENTS: readonly DeclaredLaterality[] = [
  'left',
  'right',
  'bilateral',
  'midline'
];

/** Returns the declared laterality, or null when the id carries no such segment. */
export function lateralityFromAssetId(assetId: string): DeclaredLaterality | null {
  // mesh.<base>.<laterality>.v1 -> index 2. Base names are never a laterality
  // token, and the trailing version segment never is either.
  const segment = assetId.split('.')[2] ?? '';
  return LATERALITY_SEGMENTS.includes(segment as DeclaredLaterality)
    ? (segment as DeclaredLaterality)
    : null;
}
