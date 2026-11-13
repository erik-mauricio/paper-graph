// The bar at the top of every page: brand, optional page content, theme toggle.
import type { ReactNode } from 'react'
import ThemeToggle from './ThemeToggle'

type AppNavbarProps = {
  // When set, the brand is a button (e.g. "back to upload").
  onBrandClick?: () => void
  center?: ReactNode
  end?: ReactNode
}

// The bar at the top of every page: brand, optional page content, theme toggle.
function AppNavbar({ onBrandClick, center, end }: AppNavbarProps) {
  const brand = 'text-lg font-bold text-primary'

  return (
    <header className="navbar min-h-14 shrink-0 gap-2 border-b border-base-300 bg-base-100 px-2 sm:px-4">
      <div className="navbar-start w-auto shrink-0">
        {onBrandClick ? (
          <button
            type="button"
            className={`btn btn-ghost btn-sm px-2 ${brand}`}
            onClick={onBrandClick}
          >
            PaperGraph
          </button>
        ) : (
          <span className={`px-2 ${brand}`}>PaperGraph</span>
        )}
      </div>

      <div className="navbar-center min-w-0 flex-1 shrink">{center}</div>

      <div className="navbar-end w-auto shrink-0 gap-2">
        {end}
        <ThemeToggle />
      </div>
    </header>
  )
}

export default AppNavbar
