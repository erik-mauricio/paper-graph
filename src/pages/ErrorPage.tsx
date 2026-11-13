import AppNavbar from '../components/AppNavbar'

type ErrorPageProps = {
  message: string
  onRetry: () => void
  onReset: () => void
}

function ErrorPage({ message, onRetry, onReset }: ErrorPageProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-base-200">
      <AppNavbar onBrandClick={onReset} />

      <main className="hero flex-1">
        <div className="hero-content w-full">
          <div className="card card-border w-full max-w-md bg-base-100 shadow-lg">
            <div className="card-body gap-4">
              <h1 className="card-title text-2xl">Something went wrong</h1>
              <div role="alert" className="alert alert-error alert-soft">
                {message}
              </div>
              <div className="card-actions justify-end">
                <button type="button" className="btn btn-ghost" onClick={onReset}>
                  Choose another PDF
                </button>
                <button type="button" className="btn btn-primary" onClick={onRetry}>
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ErrorPage
