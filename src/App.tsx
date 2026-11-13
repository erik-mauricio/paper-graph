import { useState } from 'react'
import { requestGraph } from './lib/api'
import { extractText } from './lib/extractText'
import { verifyQuotes } from './lib/verifyQuotes'
import ErrorPage from './pages/ErrorPage'
import LandingPage from './pages/LandingPage'
import LoadingPage from './pages/LoadingPage'
import ResultsPage from './pages/ResultsPage'
import ThemeToggle from './components/ThemeToggle'
import type { PaperGraph } from './types/graph'
import { sampleGraph } from './data/sampleGraph'

// Dev shortcut: open /?sample to view the sample graph without uploading a paper.
const useSample =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('sample')

function App() {
  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <main>
        <CurrentPage />
      </main>
    </>
  )
}

function CurrentPage() {
  const [file, setFile] = useState<File | null>(null)
  const [graph, setGraph] = useState<PaperGraph | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (useSample && !file) {
    return (
      <ResultsPage
        graph={sampleGraph}
        fileName="sample.pdf"
        onReset={() => (window.location.search = '')}
      />
    )
  }

  async function handleUpload(newFile: File) {
    setFile(newFile)
    setGraph(null)
    setError(null)

    try {
      const pages = await extractText(newFile)
      const result = await requestGraph(pages)
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
    return <LoadingPage fileName={file.name} />
  }

  return <ResultsPage graph={graph} fileName={file.name} onReset={reset} />
}

export default App
