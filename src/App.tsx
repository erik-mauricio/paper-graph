import { useState } from 'react'
import { sampleGraph } from './data/sampleGraph'
import LandingPage from './pages/LandingPage'
import ResultsPage from './pages/ResultsPage'

function App() {
  const [file, setFile] = useState<File | null>(null)

  if (!file) {
    return <LandingPage onUpload={setFile} />
  }

  // Sample data for now; real extraction comes in Phase 2.
  return (
    <ResultsPage
      graph={sampleGraph}
      fileName={file.name}
      onReset={() => setFile(null)}
    />
  )
}

export default App
