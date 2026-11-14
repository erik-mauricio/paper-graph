// Loads related work for the paper once, the first time it's asked for
// (when the Overview tab opens), and keeps it while the results page is open.
import { useCallback, useRef, useState } from 'react'
import type { RelatedRequest, RelatedWork } from '@shared/related'
import { requestRelated } from './requestRelated'

export type RelatedState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; related: RelatedWork }
  | { status: 'error'; message: string }

export function useRelatedWork() {
  const [state, setState] = useState<RelatedState>({ status: 'idle' })
  const started = useRef(false)

  // Loads (or reloads, after an error).
  const load = useCallback(async (request: RelatedRequest) => {
    started.current = true
    setState({ status: 'loading' })
    try {
      setState({ status: 'done', related: await requestRelated(request) })
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : "Couldn't load related papers." })
    }
  }, [])

  // Starts loading unless it already has.
  const start = useCallback(
    (request: RelatedRequest) => {
      if (!started.current) void load(request)
    },
    [load],
  )

  return { state, start, retry: load }
}
