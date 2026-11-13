// State for the add/edit node dialog (ui/NodeFormModal.tsx): opening it from
// the graph, the toolbar, or a PDF highlight, and saving the result through the
// editor. Also tells the graph which new node to select and center.
// Used by pages/ResultsPage.tsx.
import { useState } from 'react'
import type { GraphNode, Source } from '@shared/graph'
import type { AddNodeRequest, FocusNodeRequest } from '@/features/graph/canvas/requests'
import type { NodeFormValue } from '@/features/graph/ui/NodeFormModal'
import type { Annotation } from '@/features/pdf/annotations'
import { nextNonce } from '@/features/pdf/pdf'
import type { GraphEditor } from './useGraphEditor'

// The dialog, when it's open.
type NodeForm =
  | {
      mode: 'add'
      initial: NodeFormValue
      source?: Source
      position?: AddNodeRequest['position']
      link?: AddNodeRequest['link']
    }
  | { mode: 'edit'; node: GraphNode; initial: NodeFormValue }

export function useNodeForm(editor: GraphEditor) {
  const [form, setForm] = useState<NodeForm | null>(null)
  // The node the graph should select and center (set after adding one).
  const [focus, setFocus] = useState<FocusNodeRequest | null>(null)

  // Opens the add form. From the graph it can come with a spot to put the node
  // and a node to link it to; from a highlight it comes with a quote.
  function openAdd(request: AddNodeRequest & { source?: Source; text?: string } = {}) {
    const { source, text = '', type, position, sectionId = null, link } = request
    setForm({
      mode: 'add',
      source,
      position,
      link,
      initial: { type: type ?? (source ? 'evidence' : 'note'), text, sectionId, relation: link?.relation },
    })
  }

  function openEdit(node: GraphNode) {
    setForm({
      mode: 'edit',
      node,
      initial: { type: node.type, text: node.text, sectionId: editor.positions[node.id]?.sectionId ?? null },
    })
  }

  // A highlight in the PDF becomes an evidence node with a verified quote.
  function openFromHighlight(annotation: Annotation) {
    openAdd({ source: { page: annotation.page, quote: annotation.text, verified: true }, text: annotation.note })
  }

  function save(value: NodeFormValue) {
    if (!form) return
    if (form.mode === 'add') {
      const node = editor.addNode(
        { type: value.type, text: value.text, source: form.source },
        value.sectionId,
        // A spot picked on the canvas only applies if the section wasn't changed in the form.
        value.sectionId === form.initial.sectionId ? form.position : undefined,
      )
      if (form.link) {
        const relation = value.relation ?? form.link.relation
        // Links are stored supporter → supported.
        if (form.link.direction === 'in') editor.addEdge(node.id, form.link.otherId, relation)
        else editor.addEdge(form.link.otherId, node.id, relation)
      }
      setFocus({ id: node.id, nonce: nextNonce() })
      return
    }

    const { node, initial } = form
    // Only save real changes, so opening Edit and saving doesn't mark a node "edited".
    if (value.type !== initial.type || value.text !== initial.text) {
      editor.updateNode(node.id, { type: value.type, text: value.text })
    }
    if (value.sectionId !== initial.sectionId) editor.setNodeSection(node.id, value.sectionId)
  }

  // Props for <NodeFormModal>, or null when the dialog is closed.
  const modalProps = form && {
    title: form.mode === 'edit' ? 'Edit node' : form.source ? 'Add highlight to graph' : 'Add a node',
    submitLabel: form.mode === 'edit' ? 'Save' : 'Add to graph',
    initial: form.initial,
    source: form.mode === 'edit' ? form.node.source : form.source,
    sections: editor.sections,
    link:
      form.mode === 'add' && form.link
        ? {
            direction: form.link.direction,
            otherText: editor.graph.nodes.find((n) => n.id === form.link?.otherId)?.text ?? '',
          }
        : undefined,
    onSubmit: save,
    onClose: () => setForm(null),
  }

  return { openAdd, openEdit, openFromHighlight, focus, modalProps }
}
