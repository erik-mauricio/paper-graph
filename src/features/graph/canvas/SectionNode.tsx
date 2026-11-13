// A labeled, colored box the user draws to group nodes (rename, recolor, resize,
// delete). Registered as the 'section' node type in GraphView.tsx.
import { NodeResizer, type NodeProps } from '@xyflow/react'
import { useContext, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { COLOR_NAMES, HIGHLIGHT_COLORS } from '@/features/pdf/highlightColors'
import type { SectionFlowNode } from '@/features/graph/model/layout'
import { NODE_HEIGHT, NODE_WIDTH } from '@/features/graph/model/layout'
import { GraphActionsContext } from './graphActions'

// A labeled, colored box the user draws to group nodes. Drag it to move
// everything inside; drag nodes in or out to change what's in it.
function SectionNode({ id, data, selected }: NodeProps<SectionFlowNode>) {
  const { section } = data
  const actions = useContext(GraphActionsContext)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(section.name)
  const color = HIGHLIGHT_COLORS[section.color]
  // Highlight colors are tuned for the white PDF page; blending them with the
  // card color keeps sections soft in both the light and dark theme.
  const tint = (percent: number) => `color-mix(in oklab, ${color.swatch} ${percent}%, var(--color-base-100))`

  function startRename() {
    setDraft(section.name)
    setEditing(true)
  }

  function finishRename() {
    const name = draft.trim()
    if (name && name !== section.name) actions?.onRenameSection(id, name)
    setEditing(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') finishRename()
    if (e.key === 'Escape') setEditing(false)
  }

  // Close the <details> dropdown after picking an item.
  function closeMenu(e: MouseEvent<HTMLElement>) {
    e.currentTarget.closest('details')?.removeAttribute('open')
  }

  return (
    <div
      className="h-full w-full rounded-box border-2"
      style={{ borderColor: tint(70), background: tint(12) }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={NODE_WIDTH + 32}
        minHeight={NODE_HEIGHT + 60}
        color={color.swatch}
        onResizeEnd={(_, box) => actions?.onResizeSectionEnd(id, box)}
      />

      <div className="flex items-center gap-1 px-2 pt-1.5">
        {editing ? (
          // nodrag: typing and selecting text shouldn't move the section.
          <input
            className="nodrag input input-xs w-48"
            aria-label="Section name"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={finishRename}
            onKeyDown={onKeyDown}
          />
        ) : (
          <h3
            className="truncate rounded-field px-1.5 py-0.5 text-sm font-semibold"
            style={{ background: tint(35) }}
            onDoubleClick={startRename}
            title="Double-click to rename"
          >
            {section.name}
          </h3>
        )}

        <details className="nodrag dropdown dropdown-end ml-auto">
          <summary className="btn btn-ghost btn-xs btn-square" aria-label="Section options">
            ⋯
          </summary>
          <ul className="dropdown-content menu z-10 w-48 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
            <li className="menu-title">Color</li>
            <li>
              <div className="join gap-0 p-1" role="group" aria-label="Section color">
                {COLOR_NAMES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={section.color === name}
                    className={`btn btn-xs btn-square join-item ${section.color === name ? 'btn-active' : ''}`}
                    onClick={(e) => {
                      actions?.onColorSection(id, name)
                      closeMenu(e)
                    }}
                  >
                    <span className="size-3 rounded-full" style={{ background: HIGHLIGHT_COLORS[name].swatch }} />
                    <span className="sr-only">{name}</span>
                  </button>
                ))}
              </div>
            </li>
            <li>
              <button
                type="button"
                onClick={(e) => {
                  closeMenu(e)
                  startRename()
                }}
              >
                Rename
              </button>
            </li>
            <li>
              <button
                type="button"
                className="text-error"
                onClick={(e) => {
                  closeMenu(e)
                  actions?.onDeleteSection(id)
                }}
              >
                Delete section
              </button>
            </li>
          </ul>
        </details>
      </div>
    </div>
  )
}

export default SectionNode
