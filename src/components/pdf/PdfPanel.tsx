import { useState } from 'react'
import { nextNonce } from '../../lib/pdf'
import { annotationKey, useAnnotations } from '../../lib/useAnnotations'
import type { AnnotationDraft, FocusRequest } from '../../types/annotations'
import AnnotationsPanel from './AnnotationsPanel'
import PdfViewer from './PdfViewer'
import type { HighlightOptions } from './SelectionToolbar'

type PdfPanelProps = {
  file: File
  // Jump requests from the graph or list (e.g. "Show in PDF").
  quoteFocus: FocusRequest | null
}

// The PDF viewer plus its annotations sidebar.
function PdfPanel({ file, quoteFocus }: PdfPanelProps) {
  const store = useAnnotations(annotationKey(file))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [focusNote, setFocusNote] = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(false)
  const [annotationFocus, setAnnotationFocus] = useState<FocusRequest | null>(null)

  // Whichever jump was asked for most recently wins.
  const focus =
    (annotationFocus?.nonce ?? 0) > (quoteFocus?.nonce ?? 0) ? annotationFocus : quoteFocus

  function handleHighlight(draft: AnnotationDraft, options: HighlightOptions) {
    let groupId: string | null = null
    if (options.group === 'new') {
      groupId = store.addGroup(`Group ${store.groups.length + 1}`).id
    } else if (options.group) {
      groupId = options.group
    }

    const annotation = store.addAnnotation(draft, {
      color: options.color ?? 'yellow',
      groupId,
    })

    // Notes and groups are edited in the sidebar, so open it for those.
    if (options.withNote || options.group) {
      setActiveId(annotation.id)
      setFocusNote(Boolean(options.withNote))
      setShowAnnotations(true)
    }
  }

  // Clicked a highlight in the PDF.
  function openAnnotation(id: string) {
    setActiveId(id)
    setFocusNote(false)
    setShowAnnotations(true)
  }

  // Clicked an annotation in the sidebar.
  function jumpToAnnotation(id: string) {
    setActiveId(id)
    setFocusNote(false)
    setAnnotationFocus({ kind: 'annotation', id, nonce: nextNonce() })
  }

  return (
    <div className="relative flex h-full min-h-0">
      <div className="min-w-0 flex-1">
        <PdfViewer
          file={file}
          annotations={store.annotations}
          groups={store.groups}
          activeAnnotationId={activeId}
          focus={focus}
          onHighlight={handleHighlight}
          onAnnotationClick={openAnnotation}
          toolbarEnd={
            <div className="indicator">
              {store.annotations.length > 0 && (
                <span className="indicator-item badge badge-neutral badge-xs">
                  {store.annotations.length}
                </span>
              )}
              <button
                type="button"
                className={`btn btn-sm ${showAnnotations ? 'btn-active' : ''}`}
                aria-pressed={showAnnotations}
                onClick={() => setShowAnnotations((v) => !v)}
              >
                Annotations
              </button>
            </div>
          }
        />
      </div>

      {showAnnotations && (
        <div className="absolute inset-y-0 right-0 z-30 w-full max-w-sm">
          <AnnotationsPanel
            store={store}
            activeId={activeId}
            focusNote={focusNote}
            onActivate={jumpToAnnotation}
            onClose={() => setShowAnnotations(false)}
          />
        </div>
      )}
    </div>
  )
}

export default PdfPanel
