import type { ReactNode } from "react";

type ToolbarMode = "full" | "compact";

interface PageShellProps {
  children: ReactNode;
  footerText: string;
  editorDescription: string;
  toolbar?: ToolbarMode;
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Ir para a home">
        <img src="/assets/brand/pqoq-logo-bonecos-nome-limpa.png" alt="PQOQ Criamos" />
      </a>
      <nav className="nav" aria-label="Navegação principal">
        <a href="/episodios" data-page="episodios">Episódios</a>
        <a href="/artistas" data-page="artistas">Artistas</a>
        <a href="/galeria" data-page="galeria">Galeria</a>
        <a href="/sobre" data-page="sobre">Sobre</a>
        <a href="/apoio" data-page="apoio">Apoio</a>
      </nav>
    </header>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l8 4v6c0 5-3.4 7.7-8 8-4.6-.3-8-3-8-8V7l8-4z" />
      <path d="M9.5 12.5l1.8 1.8 3.7-4.1" />
    </svg>
  );
}

function FormatToolbar({ mode }: { mode: ToolbarMode }) {
  return (
    <div className="format-toolbar">
      <button className="button small" type="button" data-format-command="bold">Negrito</button>
      <button className="button small" type="button" data-format-command="italic">Itálico</button>
      {mode === "full" && (
        <>
          <button className="button small" type="button" data-format-command="justifyLeft">Esquerda</button>
          <button className="button small" type="button" data-format-command="justifyCenter">Centro</button>
        </>
      )}
      <button className="button small" type="button" data-format-command="justifyFull">Justificar</button>
    </div>
  );
}

export function SiteFooter({ footerText, editorDescription, toolbar = "full" }: Omit<PageShellProps, "children">) {
  return (
    <footer className="site-footer">
      <p data-editable="footer.text">{footerText}</p>
      <details className="editor-access">
        <summary aria-label="Acesso editorial"><ShieldIcon /></summary>
        <div className="editor-panel">
          <h3>Acesso editorial</h3>
          <p>{editorDescription}</p>
          <label>Login <input className="admin-field" id="admin-email" type="email" autoComplete="username" /></label>
          <label>Senha <input className="admin-field" id="admin-password" type="password" autoComplete="current-password" /></label>
          <p className="admin-message" id="admin-message" aria-live="polite" />
          <div className="admin-toolbar">
            <button className="button primary small" id="admin-login" type="button">Entrar</button>
            <button className="button small" id="admin-logout" type="button">Sair</button>
            <button className="button small" id="admin-reset" type="button">Resetar</button>
          </div>
          <FormatToolbar mode={toolbar} />
        </div>
      </details>
    </footer>
  );
}

export function PageShell({ children, footerText, editorDescription, toolbar }: PageShellProps) {
  return (
    <div className="page">
      <SiteHeader />
      {children}
      <SiteFooter footerText={footerText} editorDescription={editorDescription} toolbar={toolbar} />
    </div>
  );
}
