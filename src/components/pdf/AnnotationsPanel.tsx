import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { COLOR_NAMES, HIGHLIGHT_COLORS } from '../../lib/highlightColors'
import type { AnnotationStore } from '../../lib/useAnnotations'
import type { Annotation, AnnotationGroup } from '../../types/annotations'

type AnnotationsPanelProps = {
  store: AnnotationStore
  activeId: string | null
  // Set when the note box of the active annotation should take focus.
  focusNote: boolean
  onActivate: (id: string) => void
  onClose: () => void
  // Turns a highlight into a graph node.
  onAddToGraph?: (annotation: Annotation) => void
}

function AnnotationsPanel({
  store,
  activeId,
  focusNote,
  onActivate,
  onClose,
  onAddToGraph,
}: AnnotationsPanelProps) {
  const { annotations, groups } = store
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const sorted = [...annotations].sort(byPosition)
  const ungrouped = sorted.filter((a) => !groups.some((g) => g.id === a.groupId))
  // Ignore checks on annotations that were deleted.
  const checkedIds = sorted.filter((a) => checked.has(a.id)).map((a) => a.id)

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function groupChecked(target: string) {
    if (target === 'new') {
      store.addGroup(`Group ${groups.length + 1}`, checkedIds)
    } else {
      store.moveToGroup(checkedIds, target === 'none' ? null : target)
    }
    setChecked(new Set())
  }

  async function copyMarkdown(e: MouseEvent<HTMLButtonElement>) {
    e.currentTarget.closest('details')?.removeAttribute('open')
    try {
      await navigator.clipboard.writeText(toMarkdown(sorted, groups))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked; nothing else to do.
    }
  }

  const rowProps = {
    store,
    groups,
    activeId,
    focusNote,
    checked,
    onToggle: toggle,
    onActivate,
    onAddToGraph,
  }

  return (
    <aside className="flex h-full flex-col border-l border-base-300 bg-base-100 shadow-xl">
      <div className="flex items-center gap-1 border-b border-base-300 px-3 py-2">
        <h2 className="font-semibold">Annotations</h2>
        <span className="badge badge-ghost badge-sm">{annotations.length}</span>
        {copied && <span className="badge badge-success badge-soft badge-sm">Copied</span>}

        <details className="dropdown dropdown-end ml-auto">
          <summary className="btn btn-ghost btn-sm">More</summary>
          <ul className="dropdown-content menu z-10 w-52 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
            <li>
              <button
                type="button"
                onClick={copyMarkdown}
                disabled={annotations.length === 0}
              >
                Copy all as Markdown
              </button>
            </li>
          </ul>
        </details>
        <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={onClose}>
          <span className="sr-only">Close annotations</span>✕
        </button>
      </div>

      {checkedIds.length > 0 && (
        <div className="flex items-center gap-2 border-b border-base-300 bg-base-200 px-3 py-2 text-sm">
          <span className="font-medium">{checkedIds.length} selected</span>
          <select
            className="select select-sm ml-auto w-auto"
            value=""
            aria-label="Move selected to group"
            onChange={(e) => groupChecked(e.target.value)}
          >
            <option value="" disabled>
              Move to group…
            </option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
            <option value="new">+ New group</option>
            <option value="none">No group</option>
          </select>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChecked(new Set())}>
            Clear
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
        {annotations.length === 0 && groups.length === 0 && (
          <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
            <p className="font-medium">No annotations yet</p>
            <p className="text-sm text-base-content/60">
              Select text in the PDF to highlight it, add a note, or put it in a group.
            </p>
          </div>
        )}

        {groups.map((group) => (
          <GroupSection
            key={group.id}
            group={group}
            members={sorted.filter((a) => a.groupId === group.id)}
            store={store}
            rowProps={rowProps}
          />
        ))}

        {ungrouped.length > 0 && (
          <section className="flex flex-col gap-1">
            {groups.length > 0 && (
              <h3 className="px-1 text-xs font-semibold tracking-wide text-base-content/60 uppercase">
                Ungrouped ({ungrouped.length})
              </h3>
            )}
            <ul className="list rounded-box border border-base-300">
              {ungrouped.map((a) => (
                <AnnotationRow key={a.id} annotation={a} {...rowProps} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  )
}

type RowSharedProps = {
  store: AnnotationStore
  groups: AnnotationGroup[]
  activeId: string | null
  focusNote: boolean
  checked: Set<string>
  onToggle: (id: string) => void
  onActivate: (id: string) => void
  onAddToGraph?: (annotation: Annotation) => void
}

type GroupSectionProps = {
  group: AnnotationGroup
  members: Annotation[]
  store: AnnotationStore
  rowProps: RowSharedProps
}

function GroupSection({ group, members, store, rowProps }: GroupSectionProps) {
  return (
    <details open className="collapse collapse-arrow border border-base-300 bg-base-100">
      <summary className="collapse-title flex min-h-0 items-center gap-2 py-2.5 ps-3 text-sm font-semibold">
        <span className="truncate">{group.name || 'Untitled group'}</span>
        <span className="badge badge-ghost badge-sm">{members.length}</span>
      </summary>
      <div className="collapse-content flex flex-col gap-2 px-2">
        <div className="flex items-center gap-2 px-1">
          <input
            className="input input-sm min-w-0 flex-1"
            value={group.name}
            placeholder="Group name"
            aria-label="Group name"
            onChange={(e) => store.renameGroup(group.id, e.target.value)}
          />
          <div className="tooltip tooltip-left" data-tip="Removes the group, keeps its highlights">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => store.removeGroup(group.id)}
            >
              Remove
            </button>
          </div>
        </div>
        {members.length === 0 ? (
          <p className="px-1 text-sm text-base-content/60">
            Empty. Tick highlights and use “Move to group…”.
          </p>
        ) : (
          <ul className="list">
            {members.map((a) => (
              <AnnotationRow key={a.id} annotation={a} {...rowProps} />
            ))}
          </ul>
        )}
      </div>
    </details>
  )
}

function AnnotationRow({
  annotation: a,
  store,
  groups,
  activeId,
  focusNote,
  checked,
  onToggle,
  onActivate,
  onAddToGraph,
}: RowSharedProps & { annotation: Annotation }) {
  const active = a.id === activeId
  const itemRef = useRef<HTMLLIElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!active) return
    itemRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    if (focusNote) noteRef.current?.focus()
  }, [active, focusNote])

  return (
    <li ref={itemRef} className={`list-row items-start gap-2 p-2 ${active ? 'bg-base-200' : ''}`}>
      <input
        type="checkbox"
        className="checkbox checkbox-sm mt-0.5 rounded-sm"
        checked={checked.has(a.id)}
        onChange={() => onToggle(a.id)}
        aria-label="Select for grouping"
      />

      <div className="flex min-w-0 flex-col gap-2">
        <button
          type="button"
          className="flex flex-col gap-1 border-l-4 pl-2 text-left"
          style={{ borderColor: HIGHLIGHT_COLORS[a.color].swatch }}
          onClick={() => onActivate(a.id)}
        >
          <span className={`font-reading text-sm leading-relaxed ${active ? '' : 'line-clamp-3'}`}>“{a.text}”</span>
          <span className="badge badge-ghost badge-xs">p. {a.page}</span>
        </button>

        {!active && a.note && (
          <p className="rounded-field bg-base-200 px-2 py-1 text-sm whitespace-pre-wrap">
            {a.note}
          </p>
        )}

        {active && (
          <div className="flex flex-col gap-2">
            <textarea
              ref={noteRef}
              className="textarea textarea-sm w-full"
              placeholder="Add a note…"
              rows={3}
              value={a.note}
              onChange={(e) => store.updateAnnotation(a.id, { note: e.target.value })}
            />
            <div className="flex flex-wrap items-center gap-2">
              <div className="join" role="group" aria-label="Highlight color">
                {COLOR_NAMES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-pressed={a.color === color}
                    className={`btn btn-xs btn-square join-item ${a.color === color ? 'btn-active' : ''}`}
                    onClick={() => store.updateAnnotation(a.id, { color })}
                  >
                    <span
                      className="size-3 rounded-full"
                      style={{ background: HIGHLIGHT_COLORS[color].swatch }}
                    />
                    <span className="sr-only">{color}</span>
                  </button>
                ))}
              </div>
              <select
                className="select select-xs w-auto"
                value={a.groupId ?? ''}
                aria-label="Group"
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'new') store.addGroup(`Group ${groups.length + 1}`, [a.id])
                  else store.moveToGroup([a.id], value || null)
                }}
              >
                <option value="">No group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
                <option value="new">+ New group</option>
              </select>
              {onAddToGraph && (
                <button
                  type="button"
                  className="btn btn-soft btn-primary btn-xs ml-auto"
                  onClick={() => onAddToGraph(a)}
                >
                  Add to graph
                </button>
              )}
              <button
                type="button"
                className={`btn btn-ghost btn-xs text-error ${onAddToGraph ? '' : 'ml-auto'}`}
                onClick={() => store.removeAnnotation(a.id)}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

function byPosition(a: Annotation, b: Annotation): number {
  return a.page - b.page || (a.rects[0]?.y ?? 0) - (b.rects[0]?.y ?? 0)
}

function toMarkdown(annotations: Annotation[], groups: AnnotationGroup[]): string {
  const item = (a: Annotation) =>
    `- > ${a.text} (p. ${a.page})` + (a.note ? `\n\n  ${a.note.replace(/\n/g, '\n  ')}` : '')

  const sections = groups.map((g) => {
    const members = annotations.filter((a) => a.groupId === g.id)
    return `## ${g.name}\n\n${members.map(item).join('\n\n') || '_Empty_'}`
  })

  const ungrouped = annotations.filter((a) => !groups.some((g) => g.id === a.groupId))
  if (ungrouped.length > 0) {
    sections.push(`${groups.length ? '## Ungrouped\n\n' : ''}${ungrouped.map(item).join('\n\n')}`)
  }

  return sections.join('\n\n') + '\n'
}

export default AnnotationsPanel
