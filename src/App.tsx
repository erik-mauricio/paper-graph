import LandingPage from './pages/LandingPage'

function App() {
  function handleUpload(file: File) {
    console.log('Uploaded:', file.name)
  }

  return <LandingPage onUpload={handleUpload} />
}

export default App
