import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 aurora-field" />
      <div className="relative z-10 text-center">
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Error 404
        </p>
        <h1 className="mb-4 font-display text-7xl font-bold tracking-tight">Lost</h1>
        <p className="mb-8 text-lg text-muted-foreground">
          This page doesn't exist. Let's get you back on track.
        </p>
        <a
          href="/"
          className="inline-flex items-center rounded-[var(--radius)] bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.99]"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
};

export default NotFound;
