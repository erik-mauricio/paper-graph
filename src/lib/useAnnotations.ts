import { useEffect, useState } from 'react'
import type { Annotation, AnnotationDraft, AnnotationGroup } from '../types/annotations'

type Stored = {
  annotations: Annotation[]
  groups: AnnotationGroup[]
}

const EMPTY: Stored = { annotations: [], groups: [] }

// Identifies a PDF well enough to keep its annotations separate from other papers.
export function annotationKey(file: File): string {
  return `annotations:${file.name}:${file.size}:${file.lastModified}`
}

function load(key: string): Stored {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<Stored>
    return {
      annotations: Array.isArray(parsed.annotations) ? parsed.annotations : [],
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
    }
  } catch {
    return EMPTY
  }
}

// Highlights, notes, and groups for one PDF, saved in this browser.
export function useAnnotations(key: string) {
  const [state, setState] = useState<Stored>(() => load(key))

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // Storage blocked or full: annotations still work for this visit.
    }
  }, [key, state])

  function addAnnotation(
    draft: AnnotationDraft,
    extra: Partial<Pick<Annotation, 'color' | 'note' | 'groupId'>> = {},
  ): Annotation {
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      color: 'yellow',
      note: '',
      groupId: null,
      createdAt: Date.now(),
      ...draft,
      ...extra,
    }
    setState((s) => ({ ...s, annotations: [...s.annotations, annotation] }))
    return annotation
  }

  function updateAnnotation(id: string, patch: Partial<Annotation>) {
    setState((s) => ({
      ...s,
      annotations: s.annotations.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }))
  }

  function removeAnnotation(id: string) {
    setState((s) => ({ ...s, annotations: s.annotations.filter((a) => a.id !== id) }))
  }

  // Creates a group and optionally moves annotations into it.
  function addGroup(name: string, memberIds: string[] = []): AnnotationGroup {
    const group: AnnotationGroup = { id: crypto.randomUUID(), name }
    const members = new Set(memberIds)
    setState((s) => ({
      groups: [...s.groups, group],
      annotations: s.annotations.map((a) =>
        members.has(a.id) ? { ...a, groupId: group.id } : a,
      ),
    }))
    return group
  }

  function renameGroup(id: string, name: string) {
    setState((s) => ({
      ...s,
      groups: s.groups.map((g) => (g.id === id ? { ...g, name } : g)),
    }))
  }

  // Deletes the group but keeps its annotations (they become ungrouped).
  function removeGroup(id: string) {
    setState((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
      annotations: s.annotations.map((a) =>
        a.groupId === id ? { ...a, groupId: null } : a,
      ),
    }))
  }

  function moveToGroup(ids: string[], groupId: string | null) {
    const members = new Set(ids)
    setState((s) => ({
      ...s,
      annotations: s.annotations.map((a) => (members.has(a.id) ? { ...a, groupId } : a)),
    }))
  }

  return {
    annotations: state.annotations,
    groups: state.groups,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    addGroup,
    renameGroup,
    removeGroup,
    moveToGroup,
  }
}

export type AnnotationStore = ReturnType<typeof useAnnotations>
