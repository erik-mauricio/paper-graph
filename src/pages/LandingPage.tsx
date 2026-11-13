// The first page: what PaperGraph does, and the upload form.
import AppNavbar from '@/app/AppNavbar'
import UploadForm from '@/features/upload/UploadForm'

type LandingPageProps = {
  onUpload: (file: File) => void
}

function LandingPage({ onUpload }: LandingPageProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-base-200">
      <AppNavbar />

      <main className="hero flex-1">
        <div className="hero-content w-full max-w-5xl flex-col gap-10 py-12 lg:flex-row lg:gap-16">
          <div className="flex max-w-xl flex-col gap-6 text-center lg:text-left">
            <h1 className="font-reading text-4xl font-semibold text-balance sm:text-5xl">
              See how a paper’s argument fits together
            </h1>
            <p className="text-lg text-base-content/70">
              PaperGraph reads a research paper and maps its claims and evidence
              into an interactive graph. Every node links back to the exact
              passage in the PDF, where you can highlight and take notes.
            </p>

         
          </div>

          <div className="card card-border w-full max-w-sm shrink-0 bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Upload a paper</h2>
              <UploadForm onSubmit={onUpload} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LandingPage
