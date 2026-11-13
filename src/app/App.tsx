// Top-level flow: upload a PDF → read its text → ask the server for a graph →
// check quotes → show results. Picks which page is on screen.
import { useState } from 'react'
import { requestGraph } from '@/features/upload/requestGraph'
import { extractText } from '@/features/upload/extractText'
import { verifyQuotes } from '@/features/upload/verifyQuotes'
import ErrorPage from '@/pages/ErrorPage'
import LandingPage from '@/pages/LandingPage'
import LoadingPage, { type LoadingStage } from '@/pages/LoadingPage'
import ResultsPage from '@/pages/ResultsPage'
import type { PaperGraph } from '@shared/graph'
import { sampleGraph } from '@/data/sampleGraph'

// Dev shortcut: open /?sample to view the sample graph without uploading a paper.
const useSample =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('sample')

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [graph, setGraph] = useState<PaperGraph | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<LoadingStage>('reading')

  if (useSample && !file) {
    return (
      <ResultsPage
        graph={sampleGraph}
        file={null}
        fileName="sample.pdf"
        onReset={() => (window.location.search = '')}
      />
    )
  }

  async function handleUpload(newFile: File) {
    setFile(newFile)
    setGraph(null)
    setError(null)
    setStage('reading')

    try {
      const pages = await extractText(newFile)
      setStage('extracting')
      const result = await requestGraph(pages)
      setStage('checking')
      setGraph(verifyQuotes(result, pages))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  function reset() {
    setFile(null)
    setGraph(null)
    setError(null)
  }

  if (!file) {
    return <LandingPage onUpload={handleUpload} />
  }

  if (error) {
    return (
      <ErrorPage
        message={error}
        onRetry={() => handleUpload(file)}
        onReset={reset}
      />
    )
  }

  if (!graph) {
    return <LoadingPage fileName={file.name} stage={stage} />
  }

  return <ResultsPage graph={graph} file={file} fileName={file.name} onReset={reset} />
}

export default App
