export type NodeType = 'claim' | 'evidence'

export type Relation = 'supports' | 'contradicts'


export type Source = {
  page: number
  quote: string
}

export type GraphNode = {
  id: string
  type: NodeType
  text: string
  source: Source
}


export type GraphEdge = {
  id: string
  from: string
  to: string
  relation: Relation
}

export type PaperGraph = {
  title: string
  nodes: GraphNode[]
  edges: GraphEdge[]
}
