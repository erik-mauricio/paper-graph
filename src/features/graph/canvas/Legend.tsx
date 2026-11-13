// The key in the graph's top-left corner. Arrows run claim → evidence:
// "this claim is backed by / challenged by that".
function Legend() {
  return (
    <div className="flex gap-3 rounded-field border border-base-300 bg-base-100/90 px-2.5 py-1.5 text-xs">
      <span className="flex items-center gap-1.5">
        <svg width="24" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="19" y2="4" stroke="var(--color-primary)" strokeWidth="2" />
          <path d="M18 0.5 L24 4 L18 7.5 Z" fill="var(--color-primary)" />
        </svg>
        backed by
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="24" height="8" aria-hidden="true">
          <line x1="0" y1="4" x2="19" y2="4" stroke="var(--color-error)" strokeWidth="2" strokeDasharray="4 3" />
          <path d="M18 0.5 L24 4 L18 7.5 Z" fill="var(--color-error)" />
        </svg>
        challenged by
      </span>
    </div>
  )
}

export default Legend
