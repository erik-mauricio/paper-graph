import { COLOR_NAMES, HIGHLIGHT_COLORS } from '../../lib/highlightColors'
import type { AnnotationGroup, HighlightColor } from '../../types/annotations'

export type HighlightOptions = {
  color?: HighlightColor
  // A group id, or 'new' to put the highlight in a new group.
  group?: string
  withNote?: boolean
}

type SelectionToolbarProps = {
  // The selection's position on screen.
  box: DOMRect
  groups: AnnotationGroup[]
  onHighlight: (options: HighlightOptions) => void
}

// Floating buttons shown above selected PDF text.
function SelectionToolbar({ box, groups, onHighlight }: SelectionToolbarProps) {
  const above = box.top > 64
  const left = Math.min(Math.max(box.left + box.width / 2, 170), window.innerWidth - 170)

  return (
    <div
      role="toolbar"
      aria-label="Annotate selection"
      className="fixed z-40 flex -translate-x-1/2 items-center gap-2 rounded-box border border-base-300 bg-base-100 p-1.5 shadow-lg"
      style={{ left, top: above ? box.top - 52 : box.bottom + 8 }}
      // Keep the text selection visible while clicking buttons
      // (but let the group dropdown open).
      onPointerDown={(e) => {
        if (!(e.target instanceof HTMLSelectElement)) e.preventDefault()
      }}
    >
      <div className="join" role="group" aria-label="Highlight">
        {COLOR_NAMES.map((color) => (
          <button
            key={color}
            type="button"
            className="btn btn-sm btn-square join-item tooltip tooltip-top"
            data-tip={`Highlight ${color}`}
            onClick={() => onHighlight({ color })}
          >
            <span
              className="size-4 rounded-full border border-black/10"
              style={{ background: HIGHLIGHT_COLORS[color].swatch }}
            />
            <span className="sr-only">Highlight {color}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-sm"
        onClick={() => onHighlight({ withNote: true })}
      >
        Add note
      </button>

      <select
        className="select select-sm w-auto"
        value=""
        aria-label="Add to group"
        onChange={(e) => onHighlight({ group: e.target.value })}
      >
        <option value="" disabled>
          Group…
        </option>
        {groups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
        <option value="new">+ New group</option>
      </select>
    </div>
  )
}

export default SelectionToolbar
