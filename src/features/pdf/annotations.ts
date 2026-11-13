// Types for PDF highlights, notes, and groups, and for "scroll the PDF to …" requests.
import type { HighlightColor } from '@shared/colors'

// A box on a PDF page, as fractions (0–1) of the page's width and height,
// so it stays in place at any zoom level.
export type Rect = {
  x: number
  y: number
  w: number
  h: number
}


export type Annotation = {
  id: string
  page: number
  rects: Rect[]
  text: string
  color: HighlightColor
  note: string
  groupId: string | null
  createdAt: number
}

export type AnnotationGroup = {
  id: string
  name: string
}

// What the viewer needs to make a new highlight from a text selection.
export type AnnotationDraft = Pick<Annotation, 'page' | 'rects' | 'text'>

// Asks the PDF viewer to scroll somewhere. `nonce` makes repeat requests
// for the same target count as new ones.
export type FocusRequest =
  | { kind: 'quote'; page: number; quote: string; nonce: number }
  | { kind: 'annotation'; id: string; nonce: number }
