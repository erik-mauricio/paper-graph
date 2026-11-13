import { useState, type FormEvent } from 'react'
import type { NodeType, Relation, Section, Source } from '../../types/graph'
import { relationButton } from '../../lib/relations'
import Quote from '../Quote'
import { useDialog } from './useDialog'

export type NodeFormValue = {
  type: NodeType
  text: string
  sectionId: string | null
  // How the new node relates to the node it's linked to (when there is one).
  relation?: Relation
}

type NodeFormModalProps = {
  title: string
  submitLabel: string
  initial: NodeFormValue
  // Shown read-only when the node comes from the paper (an AI node or a highlight).
  source?: Source
  sections: Section[]
  // Set when the new node will be linked to an existing one.
  link?: { otherText: string; direction: 'in' | 'out' }
  onSubmit: (value: NodeFormValue) => void
  onClose: () => void
}

const TYPES: { value: NodeType; label: string; hint: string }[] = [
  { value: 'claim', label: 'Claim', hint: 'A conclusion the paper (or you) argues for.' },
  { value: 'evidence', label: 'Evidence', hint: 'A result, data, method, or citation that backs something up.' },
  { value: 'note', label: 'Note', hint: 'Your own thought, question, or summary.' },
]

// Add or edit a node. Mount it to open; it calls onClose when dismissed.
function NodeFormModal({
  title,
  submitLabel,
  initial,
  source,
  sections,
  link,
  onSubmit,
  onClose,
}: NodeFormModalProps) {
  const ref = useDialog()
  const [value, setValue] = useState(initial)
  const hint = TYPES.find((t) => t.value === value.type)?.hint

  function submit(e: FormEvent) {
    e.preventDefault()
    const text = value.text.trim()
    if (!text) return
    onSubmit({ ...value, text })
    onClose()
  }

  return (
    <dialog ref={ref} className="modal modal-bottom sm:modal-middle" onClose={onClose}>
      <form className="modal-box flex flex-col gap-3" onSubmit={submit}>
        <h3 className="text-lg font-semibold">{title}</h3>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Type</legend>
          <div className="join" role="radiogroup" aria-label="Node type">
            {TYPES.map((t) => (
              <input
                key={t.value}
                type="radio"
                name="node-type"
                className="btn btn-sm join-item"
                aria-label={t.label}
                checked={value.type === t.value}
                onChange={() => setValue((v) => ({ ...v, type: t.value }))}
              />
            ))}
          </div>
          <p className="label">{hint}</p>
        </fieldset>

        <fieldset className="fieldset">
          <legend className="fieldset-legend">Text</legend>
          <textarea
            className="textarea w-full"
            rows={3}
            required
            autoFocus
            placeholder="In your own words…"
            value={value.text}
            onChange={(e) => setValue((v) => ({ ...v, text: e.target.value }))}
          />
        </fieldset>

        {link && value.relation && (
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Link</legend>
            <div className="flex flex-col gap-2 rounded-field border border-base-300 p-2 text-sm">
              {/* Reads "claim — backed by — evidence". 'in': the new node backs up the other one. */}
              <p>{link.direction === 'in' ? <q className="line-clamp-2">{link.otherText}</q> : 'This new node…'}</p>
              <div className="join" role="radiogroup" aria-label="Relation">
                {(['supports', 'contradicts'] as const).map((r) => (
                  <input
                    key={r}
                    type="radio"
                    name="node-relation"
                    className={`btn btn-sm join-item ${r === 'contradicts' && value.relation === r ? 'btn-error' : ''}`}
                    aria-label={relationButton(r)}
                    checked={value.relation === r}
                    onChange={() => setValue((v) => ({ ...v, relation: r }))}
                  />
                ))}
              </div>
              <p>{link.direction === 'in' ? '…this new node.' : <q className="line-clamp-2">{link.otherText}</q>}</p>
            </div>
          </fieldset>
        )}

        {source && (
          <fieldset className="fieldset">
            <legend className="fieldset-legend">From the paper · page {source.page}</legend>
            <Quote text={source.quote} />
          </fieldset>
        )}

        {sections.length > 0 && (
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Section</legend>
            <select
              className="select w-full"
              value={value.sectionId ?? ''}
              onChange={(e) => setValue((v) => ({ ...v, sectionId: e.target.value || null }))}
            >
              <option value="">None</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </fieldset>
        )}

        <div className="modal-action mt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!value.text.trim()}>
            {submitLabel}
          </button>
        </div>
      </form>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  )
}

export default NodeFormModal
