import type { Relation } from '../types/graph'

// How a link reads from each end. Links are stored as "supporter → supported"
// (evidence → claim), but the graph is read claim-first:
//   claim — backed by / challenged by → evidence
//   evidence — backs up / challenges → claim
const LABELS: Record<'claim' | 'evidence', Record<Relation, string>> = {
  claim: { supports: 'backed by', contradicts: 'challenged by' },
  evidence: { supports: 'backs up', contradicts: 'challenges' },
}

// `side` is the end you're reading from: the supported node ('claim') or the
// node doing the supporting ('evidence'), whatever their actual types.
export function relationLabel(relation: Relation, side: 'claim' | 'evidence'): string {
  return LABELS[side][relation]
}

// Under a claim in the List view: "backs it up" / "challenges it".
export function relationToClaim(relation: Relation): string {
  return relation === 'supports' ? 'backs it up' : 'challenges it'
}

// Capitalized, for buttons.
export function relationButton(relation: Relation): string {
  const label = relationLabel(relation, 'claim')
  return label[0].toUpperCase() + label.slice(1)
}
