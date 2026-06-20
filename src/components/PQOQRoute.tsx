import { useEffect, type ReactNode } from "react";

declare global {
  interface Window {
    PQOQLegacyInit?: () => void;
    PQOQEditorPlusInit?: () => void;
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

    let active = true;
    Promise.all([
      import("../legacy/pqoq-legacy.js"),
      import("../legacy/pqoq-editor-plus.js"),
    ]).then(() => {
      if (active) {
        window.PQOQLegacyInit?.();
        window.PQOQEditorPlusInit?.();
      }
    });

    return () => {
      active = false;
      delete document.body.dataset.page;
    };
  }, [page, title]);

  return children;
}
