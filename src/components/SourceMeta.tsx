// A node's page number, an "Unverified" badge if its quote wasn't found, and
// "Show in PDF". Shared by the graph panel, List view, and Overview.
import type { Source } from '@shared/graph'

// Anything with a quote from the paper: a node, or a fact in the overview.
type SourceMetaProps<T extends { source?: Source }> = {
  node: T
  onShowInPdf?: (node: T) => void
}

// Where a node's quote comes from: page, whether it was verified, and a
// button to jump to it in the PDF.
function SourceMeta<T extends { source?: Source }>({ node, onShowInPdf }: SourceMetaProps<T>) {
  // The user's own notes have no source in the paper.
  if (!node.source) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="badge badge-ghost badge-sm">Page {node.source.page}</span>
      {node.source.verified === false && (
        <span
          className="tooltip tooltip-bottom"
          data-tip="This quote wasn't found word-for-word in the PDF text."
        >
          <span className="badge badge-warning badge-sm">Unverified</span>
        </span>
      )}
      {onShowInPdf && (
        <button
          type="button"
          className="btn btn-ghost btn-xs ml-auto"
          onClick={() => onShowInPdf(node)}
        >
          Show in PDF
        </button>
      )}
    </div>
  )
}

export default SourceMeta
