type LoadingPageProps = {
  fileName: string
}

function LoadingPage({ fileName }: LoadingPageProps) {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content w-full">
        <div className="card card-border bg-base-100 w-full max-w-md shadow-lg">
          <div className="card-body items-center gap-4 text-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <h1 className="card-title text-2xl">Reading your paper…</h1>
            <p className="text-sm text-base-content/60">{fileName}</p>
            <p className="text-base-content/70">
              Finding claims and evidence. This can take a minute for long papers.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadingPage
