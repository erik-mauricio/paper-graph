import Floating from './Floating'

export type LinkMenuAction = 'support-in' | 'contradict-in' | 'claim-out' | 'link-existing'

type LinkMenuProps = {
  x: number
  y: number
  nodeText: string
  onPick: (action: LinkMenuAction) => void
  onClose: () => void
}

const ITEMS: { action: LinkMenuAction; label: string; hint: string }[] = [
  { action: 'support-in', label: 'Add evidence for this', hint: 'This is backed by a new node' },
  { action: 'contradict-in', label: 'Add counter-evidence', hint: 'This is challenged by a new node' },
  { action: 'claim-out', label: 'Add the claim this backs up', hint: 'A new claim, backed by this' },
  { action: 'link-existing', label: 'Link to an existing node…', hint: 'Then click the other node' },
]

// The menu behind a node's "+" button.
function LinkMenu({ x, y, nodeText, onPick, onClose }: LinkMenuProps) {
  return (
    <Floating x={x} y={y} onClose={onClose} label="Link options">
      <ul className="menu w-72 rounded-box border border-base-300 bg-base-100 p-2 shadow-xl">
        <li className="menu-title" title={nodeText}>
          <span className="block max-w-64 truncate">{nodeText}</span>
        </li>
        {ITEMS.map((item) => (
          <li key={item.action}>
            <button
              type="button"
              className="flex flex-col items-start gap-0"
              onClick={() => {
                onPick(item.action)
                onClose()
              }}
            >
              <span>{item.label}</span>
              <span className="text-xs text-base-content/60">{item.hint}</span>
            </button>
          </li>
        ))}
      </ul>
    </Floating>
  )
}

export default LinkMenu
