import AppNavbar from '../components/AppNavbar'

export type LoadingStage = 'reading' | 'extracting' | 'checking'

const STAGES: { id: LoadingStage; label: string }[] = [
  { id: 'reading', label: 'Reading the PDF' },
  { id: 'extracting', label: 'Finding claims & evidence' },
  { id: 'checking', label: 'Checking quotes against the paper' },
]

type LoadingPageProps = {
  fileName: string
  stage: LoadingStage
}

function LoadingPage({ fileName, stage }: LoadingPageProps) {
  const current = STAGES.findIndex((s) => s.id === stage)

  return (
    <div className="flex min-h-dvh flex-col bg-base-200">
      <AppNavbar />

      <main className="hero flex-1">
        <div className="hero-content w-full">
          <div className="card card-border w-full max-w-md bg-base-100 shadow-lg">
            <div className="card-body gap-4">
              <div>
                <h1 className="card-title text-2xl">Analyzing your paper</h1>
                <p className="truncate text-sm text-base-content/60">{fileName}</p>
              </div>

              <ul className="steps steps-vertical" aria-live="polite">
                {STAGES.map((s, i) => (
                  <li
                    key={s.id}
                    className={`step ${i <= current ? 'step-primary' : ''}`}
                    data-content={i < current ? '✓' : undefined}
                    aria-current={i === current ? 'step' : undefined}
                  >
                    <span className="flex items-center gap-2">
                      <span className={i > current ? 'text-base-content/60' : ''}>
                        {s.label}
                      </span>
                      {i === current && (
                        <span className="loading loading-dots loading-sm text-primary" />
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-sm text-base-content/60">
                This can take a minute for long papers.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LoadingPage
