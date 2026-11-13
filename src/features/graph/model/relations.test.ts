import { describe, expect, it } from 'vitest'
import { relationButton, relationLabel, relationToClaim } from './relations'

describe('relation wording', () => {
  it('reads from the claim side', () => {
    expect(relationLabel('supports', 'claim')).toBe('backed by')
    expect(relationLabel('contradicts', 'claim')).toBe('challenged by')
  })

  it('reads from the evidence side', () => {
    expect(relationLabel('supports', 'evidence')).toBe('backs up')
    expect(relationLabel('contradicts', 'evidence')).toBe('challenges')
  })

  it('has List view and button forms', () => {
    expect(relationToClaim('supports')).toBe('backs it up')
    expect(relationToClaim('contradicts')).toBe('challenges it')
    expect(relationButton('contradicts')).toBe('Challenged by')
  })
})
