type ErrorPageProps = {
  message: string
  onRetry: () => void
  onReset: () => void
}

function ErrorPage({ message, onRetry, onReset }: ErrorPageProps) {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content w-full">
        <div className="card card-border bg-base-100 w-full max-w-md shadow-lg">
          <div className="card-body gap-4">
            <h1 className="card-title text-2xl">Something went wrong</h1>
            <div role="alert" className="alert alert-error alert-soft">
              {message}
            </div>
            <div className="card-actions justify-end">
              <button className="btn" onClick={onReset}>
                Upload a different paper
              </button>
              <button className="btn btn-primary" onClick={onRetry}>
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorPage
