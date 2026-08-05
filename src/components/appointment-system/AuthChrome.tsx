export function AuthHeader() {
  return (
    <header className="border-b border-slate-800 px-4 py-4">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <a href="https://www.cyberussell.com" className="text-sm font-semibold tracking-tight text-white">
          Cyberussell<span className="text-emerald-400">.</span>
        </a>
        <a
          href="https://www.cyberussell.com"
          className="text-xs text-slate-400 transition hover:text-emerald-400"
        >
          ← Back to cyberussell.com
        </a>
      </div>
    </header>
  )
}

export function AuthFooter() {
  return (
    <footer className="border-t border-slate-800 px-4 py-6 text-center text-xs text-slate-500">
      <p>
        &copy; {new Date().getFullYear()} Cyberussell. Appointment System is a product of{' '}
        <a href="https://www.cyberussell.com" className="text-emerald-400 hover:underline">
          cyberussell.com
        </a>
        .
      </p>
    </footer>
  )
}
