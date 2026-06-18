import { useEffect, type ReactNode } from "react";

declare global {
  interface Window {
    PQOQLegacyInit?: () => void;
  }
}

interface PQOQRouteProps {
  children: ReactNode;
  page: "home" | "episodios" | "artistas" | "galeria" | "sobre" | "apoio";
  title: string;
}

export function PQOQRoute({ children, page, title }: PQOQRouteProps) {
  useEffect(() => {
    document.body.dataset.page = page;
    document.title = title;

    let active = true;
    import("../legacy/pqoq-legacy.js").then(() => {
      if (active) window.PQOQLegacyInit?.();
    });

    return () => {
      active = false;
      delete document.body.dataset.page;
    };
  }, [page, title]);

  return children;
}
