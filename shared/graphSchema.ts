// The JSON schema Gemini must follow (matches shared/graph.ts), and a cleanup
// for links to missing nodes. Used by server/extraction/gemini.ts.
import type { PaperGraph } from './graph.ts'

// A page number plus a word-for-word quote.
const sourceSchema = {
  type: 'object',
  properties: {
    page: { type: 'integer' },
    quote: { type: 'string' },
  },
  required: ['page', 'quote'],
  additionalProperties: false,
}

// A plain-language point plus where it comes from (the Fact type).
const factSchema = {
  type: 'object',
  properties: {
    text: { type: 'string' },
    source: sourceSchema,
  },
  required: ['text', 'source'],
  additionalProperties: false,
}

const facts = { type: 'array', items: factSchema }

// The paper's overview, background and study design (the PaperContext type).
const contextSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    topic: { type: 'string' },
    background: facts,
    study: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['experiment', 'observational', 'computational', 'review', 'theoretical', 'other'],
        },
        question: factSchema,
        design: facts,
        participants: facts,
        groups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              role: { type: 'string', enum: ['control', 'treatment', 'comparison'] },
              description: { type: 'string' },
              source: sourceSchema,
            },
            required: ['name', 'role', 'description', 'source'],
            additionalProperties: false,
          },
        },
        measures: facts,
      },
      required: ['kind', 'question', 'design', 'participants', 'groups', 'measures'],
      additionalProperties: false,
    },
  },
  required: ['summary', 'topic', 'background', 'study'],
  additionalProperties: false,
}

// JSON schema matching the PaperGraph type, so the model returns that exact shape.
export const graphSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    context: contextSchema,
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['claim', 'evidence', 'method'] },
          text: { type: 'string' },
          source: sourceSchema,
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
  required: ['title', 'context', 'nodes', 'edges'],
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
