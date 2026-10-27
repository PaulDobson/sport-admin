import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="relative border-t border-white/6 py-10 sm:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Sport Admin — inicio"
          >
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-lg shadow-primary/25"
            >
              SA
            </span>
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">
                Sport Admin
              </p>
              <p className="text-xs text-muted-foreground">
                Gestión deportiva sin fricción
              </p>
            </div>
          </Link>

          {/* Links */}
          <nav aria-label="Links del pie de página">
            <ul className="flex flex-wrap gap-x-6 gap-y-2" role="list">
              {[
                { label: "Funciones", href: "#features" },
                { label: "Beneficios", href: "#benefits" },
                { label: "Crear cuenta", href: "/sign-up" },
                { label: "Iniciar sesión", href: "/log-in" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 border-t border-white/6 pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sport Admin. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
