// Highlight colors. Fixed (not theme colors) because they sit on the white PDF
// page in both themes. Graph sections reuse them.
import type { HighlightColor } from '@shared/colors'

// Highlights sit on the white PDF page in both themes, so these are
// fixed colors rather than theme tokens.
export const HIGHLIGHT_COLORS: Record<HighlightColor, { fill: string; swatch: string }> = {
  yellow: { fill: 'rgb(250 204 21 / 0.4)', swatch: 'rgb(250 204 21)' },
  green: { fill: 'rgb(74 222 128 / 0.4)', swatch: 'rgb(74 222 128)' },
  blue: { fill: 'rgb(96 165 250 / 0.4)', swatch: 'rgb(96 165 250)' },
  pink: { fill: 'rgb(244 114 182 / 0.4)', swatch: 'rgb(244 114 182)' },
  purple: { fill: 'rgb(167 139 250 / 0.4)', swatch: 'rgb(167 139 250)' },
}

export const COLOR_NAMES = Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]
