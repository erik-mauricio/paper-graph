// The JSON schema Gemini must follow (matches shared/graph.ts), and a cleanup
// for links to missing nodes. Used by server/extraction/gemini.ts.
import type { PaperGraph } from './graph.ts'

// JSON schema matching the PaperGraph type, so the model returns that exact shape.
export const graphSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['claim', 'evidence'] },
          text: { type: 'string' },
          source: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              quote: { type: 'string' },
            },
            required: ['page', 'quote'],
            additionalProperties: false,
          },
        },
        required: ['id', 'type', 'text', 'source'],
        additionalProperties: false,
      },
    },
    edges: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
          relation: { type: 'string', enum: ['supports', 'contradicts'] },
        },
        required: ['id', 'from', 'to', 'relation'],
        additionalProperties: false,
      },
    },
  },
  required: ['title', 'nodes', 'edges'],
  additionalProperties: false,
}

// Drops links that point to ids that don't exist.
export function removeBrokenEdges(graph: PaperGraph): PaperGraph {
  const ids = new Set(graph.nodes.map((node) => node.id))
  return {
    ...graph,
    edges: graph.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)),
  }
}
