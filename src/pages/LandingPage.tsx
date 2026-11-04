import UploadForm from '../components/UploadForm'

const STEPS = [
  {
    title: 'Upload a paper',
    description: 'Upload a PDF of a technical research paper.',
  },
  {
    title: 'Extract the argument',
    description:
      'AI finds the main claims, the evidence behind them, and how they connect.',
  },
  {
    title: 'Explore and edit',
    description:
      'Click any node to see its source passage. ',
  },
]

type LandingPageProps = {
  onUpload: (file: File) => void
}

function LandingPage({ onUpload }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-base-100">
      <section className="hero bg-base-200 py-16 sm:py-24">
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

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
        <h2 className="text-center text-3xl font-bold">How it works</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.title} className="card bg-base-200">
              <div className="card-body">
                <span className="text-sm font-semibold text-primary">
                  Step {index + 1}
                </span>
                <h3 className="card-title">{step.title}</h3>
                <p className="text-base-content/70">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      
    </div>
  );
}

export default LandingPage
