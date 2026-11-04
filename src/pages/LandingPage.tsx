import UploadForm from '../components/UploadForm'


type LandingPageProps = {
  onUpload: (file: File) => void
}

function LandingPage({ onUpload }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-base-200">
      <section className="hero min-h-screen py-16 sm:py-24">
        <div className="hero-content flex-col gap-10">
          <h1 className="text-5xl font-bold text-primary">PaperGraph</h1>

          <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
            <p className="max-w-xl text-center text-lg text-base-content/70 lg:text-left">
              PaperGraph reads a research paper and turns its claims and
              evidence into an interactive graph. Every node links back to the
              exact passage it came from.
            </p>

            <div
              id="upload"
              className="card card-border bg-base-100 w-full max-w-sm shadow-lg"
            >
              <div className="card-body">
                <h2 className="card-title">Upload a paper</h2>
                <p className="text-sm text-base-content/70">PDF, up to 20 MB</p>
                <UploadForm onSubmit={onUpload} />
              </div>
            </div>
          </div>
        </div>
      </section>


      
    </div>
  );
}

export default LandingPage
