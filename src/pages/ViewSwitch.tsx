// Buttons for switching between Graph, List, and PDF on the results page:
// tabs in the navbar on large screens, a dock at the bottom on small ones.

type SwitchButtonProps = {
  label: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}

export function ViewTab({ label, active, onClick }: SwitchButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`tab ${active ? 'tab-active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export function DockButton({ label, active, disabled, onClick }: SwitchButtonProps) {
  return (
    <button
      type="button"
      className={active ? 'dock-active' : ''}
      aria-current={active ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="dock-label text-sm">{label}</span>
    </button>
  )
}
