import { PageShell } from "./components/SiteChrome";

export function HomePage() {
  return (
    <PageShell
      footerText="PQOQ - Por que criamos o que criamos. Acervo, processo criativo e memória cultural do extremo sul da Bahia."
      editorDescription="Entre para ativar o modo administrador. É possível editar textos, formatar conteúdo, adicionar/remover artistas e anexar mídias nos episódios."
    >
      <main>
        <section className="hero">
          <h1
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: "hidden",
              clip: "rect(0 0 0 0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            PQOQ: acervo e memória cultural do extremo sul da Bahia
          </h1>
          <div>
            <div className="pill" data-layout-key="home.eyebrow" data-editable="home.eyebrow">Nova temporada - podcast + videocast</div>
            <div className="intro-text" data-layout-key="home.description" data-rich data-editable="home.description">
              <p>O PQOQ é um acervo vivo de artistas, processos criativos e memória cultural. O projeto nasce no extremo sul da Bahia, entre conversas, escutas, imagens e trajetórias. A cada quinze dias, convidamos um artista para se sentar conosco e dialogar sobre processos criativos, influências, vivências e escolhas de caminho. O projeto registra vozes de diferentes linguagens, como música, literatura e artes visuais, além de abrir espaço para o audiovisual, a tatuagem, a cerâmica, a performance e a palavra. A nova temporada amplia o podcast para o formato de videocast, com gravações presenciais. Os encontros acontecem com o apoio da UFSB, no Campus Paulo Freire. Cada episódio transforma-se em arquivo, conversa, memória e ponto de encontro com a comunidade. E, no centro de tudo, permanece a pergunta: afinal, por que criamos o que criamos?</p>
            </div>
            <div className="intro-actions" data-layout-key="home.actions">
              <a className="button primary" href="/episodios" data-link-editable="home.watch-now">Assistir agora</a>
              <a className="button" href="/episodios" data-link-editable="home.listen">Ouvir episódios</a>
              <a className="button" href="/artistas" data-link-editable="home.artists">Conhecer artistas</a>
            </div>
          </div>

          <aside className="home-latest" aria-labelledby="home-episodes-title">
            <h2 className="home-latest-title" data-layout-key="home.latest.title" id="home-episodes-title" data-editable="home.latest.title">Últimos episódios:</h2>
            <div className="home-latest-list" data-render-home-episodes />
          </aside>
        </section>
      </main>
    </PageShell>
  );
}

export function EpisodesPage() {
  return (
    <PageShell
      footerText="PQOQ - episódios, videocast, podcast e acervo de processos criativos."
      editorDescription="No modo administrador, abra um episódio para editar links do YouTube, Spotify, anexar thumbnail ou MP3 e alterar textos."
    >
      <main>
        <section className="section">
          <div className="section-head">
            <h1 className="page-title" data-layout-key="episodes.page.title" data-editable="episodes.page.title">Últimos episódios:</h1>
            <p data-rich data-editable="episodes.page.intro">Cada episódio pode receber link do Spotify, link do YouTube com prévia incorporada, thumbnail manual e arquivo MP3 para tocar diretamente pelo site.</p>
          </div>
          <div className="admin-only" style={{ marginBottom: 18 }}>
            <button className="button primary" id="episode-add" type="button">Adicionar episódio</button>
          </div>
          <div className="grid two" data-render-episode-list />
        </section>
      </main>
    </PageShell>
  );
}

export function EpisodePage() {
  return (
    <PageShell
      footerText="PQOQ - episódio completo, player, acervo e processo criativo."
      editorDescription="No modo administrador, edite o texto, adicione YouTube, Spotify, MP3, thumbnail e dados do artista."
    >
      <main id="episode-page">
        <section className="section episode-page-section" data-render-episode-page>
          <div className="empty-state">Carregando episódio...</div>
        </section>
      </main>
    </PageShell>
  );
}

export function ArtistsPage() {
  return (
    <PageShell
      footerText="PQOQ - acervo vivo de artistas e processos criativos."
      editorDescription="No modo administrador, adicione, remova, edite artistas e envie foto pelo círculo de cada card."
    >
      <main>
        <section className="section">
          <div className="section-head">
            <h1 className="page-title" data-layout-key="artists.page.title" data-editable="artists.page.title">Artistas</h1>
            <p data-rich data-editable="artists.page.intro">Um catálogo editável de artistas locais e regionais de diferentes linguagens, trajetórias e formas de criar. Clique em um artista para abrir o acervo em abas.</p>
          </div>
          <div className="admin-only" style={{ marginBottom: 18 }}>
            <button className="button primary" id="artist-add" type="button">Adicionar artista</button>
          </div>
          <div className="grid four" data-render-artists />
        </section>
      </main>
    </PageShell>
  );
}

export function GalleryPage() {
  return (
    <PageShell
      footerText="PQOQ - acervo e memória visual do projeto."
      editorDescription="Entre para editar textos e reorganizar conteúdo no Lovable."
      toolbar="compact"
    >
      <main>
        <section className="section">
          <div className="section-head">
            <h1 className="page-title" data-layout-key="gallery.page.title" data-editable="gallery.page.title">ACERVO</h1>
            <p data-rich data-layout-key="gallery.page.intro" data-editable="gallery.page.intro">A galeria organiza imagens, bastidores, capas, registros de gravação e materiais enviados pelos artistas.</p>
          </div>
          <div className="admin-only" style={{ marginBottom: 18 }}>
            <button className="button primary" id="gallery-add" type="button">Adicionar galeria</button>
          </div>
          <div className="grid three" data-render-gallery-list>
            <article className="card gallery-card">
              <div className="gallery-thumb" />
              <div className="meta">Carregando</div>
              <h2>ACERVO</h2>
              <p>Preparando cards da galeria...</p>
            </article>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

export function AboutPage() {
  return (
    <PageShell
      footerText="PQOQ - sobre o projeto e sua equipe."
      editorDescription="Entre para editar e formatar textos da página."
      toolbar="compact"
    >
      <main>
        <section className="section">
          <div className="section-head">
            <h1 className="page-title" data-layout-key="about.page.title" data-editable="about.page.title">Sobre</h1>
          </div>
          <div className="about-layout">
            <article className="card" data-editable="about.project">
              <h2 data-layout-key="about.project.title" data-editable="about.project.title">O projeto</h2>
              <p data-rich data-layout-key="about.project.p1" data-editable="about.project.p1">O <strong>Por que criamos o que criamos</strong> é um projeto de extensão, escuta e produção audiovisual dedicado a registrar processos criativos de artistas do extremo sul da Bahia.</p>
              <p data-rich data-layout-key="about.project.p2" data-editable="about.project.p2">Criado em 2021 no formato podcast, o PQOQ chega a uma nova etapa ampliando sua linguagem para o videocast, com gravações presenciais no Campus Paulo Freire da UFSB.</p>
              <p data-rich data-layout-key="about.project.p3" data-editable="about.project.p3">A proposta reúne entrevistas, imagens, trajetórias e materiais de arquivo para fortalecer a memória cultural da região e aproximar universidade, artistas e comunidade.</p>
              <p data-rich data-layout-key="about.project.p4" data-editable="about.project.p4">A cada quinze dias, artistas de diferentes linguagens são convidados a conversar sobre influências, vivências, território, escolhas estéticas e modos de criação, sempre atravessados pela pergunta: por que criamos o que criamos?</p>
              <div className="tag-list" data-layout-key="about.project.tags"><span>Podcast</span><span>Videocast</span><span>Acervo</span><span>Extensão</span></div>
            </article>
            <article className="card bio-card" data-editable="about.almi">
              <label className="bio-photo bio-photo-upload" data-layout-key="about.almi.photo" data-page-photo-box="about.almi">
                <span>Foto</span>
                <input className="admin-only" type="file" accept="image/*" data-page-photo="about.almi" aria-label="Enviar foto de Almi Junior" />
              </label>
              <h2 data-layout-key="about.almi.title" data-editable="about.almi.title">Almi Junior</h2>
              <p data-rich data-layout-key="about.almi.p1" data-editable="about.almi.p1">Almi Junior é poeta, professor e pesquisador. Possui mestrado em Letras e desenvolve doutorado na mesma área, investigando relações entre poesia e artes visuais na obra de Manoel de Barros.</p>
              <p data-rich data-layout-key="about.almi.p2" data-editable="about.almi.p2">Natural de Teixeira de Freitas - BA, ajudou a organizar saraus e encontros de artistas, como o Sarau MamÁfrica e o Sarau dos Mal Amados, em parceria com o coletivo Éramos 7.</p>
              <p data-rich data-layout-key="about.almi.p3" data-editable="about.almi.p3">Integra o Mapa da Palavra da Bahia, possui poemas publicados em revistas e coletâneas, atua como ilustrador e compõe o Fluxo Artístico.</p>
              <div className="tag-list" data-layout-key="about.almi.tags"><span>Poesia</span><span>Pesquisa</span><span>Ilustração</span></div>
            </article>
            <article className="card bio-card" data-editable="about.joao">
              <label className="bio-photo bio-photo-upload" data-layout-key="about.joao.photo" data-page-photo-box="about.joao">
                <span>Foto</span>
                <input className="admin-only" type="file" accept="image/*" data-page-photo="about.joao" aria-label="Enviar foto de João Lucas Monti" />
              </label>
              <h2 data-layout-key="about.joao.title" data-editable="about.joao.title">João Lucas Monti</h2>
              <p data-rich data-layout-key="about.joao.p1" data-editable="about.joao.p1">João Lucas de Oliveira Monti, também conhecido como Don, é natural de Teixeira de Freitas - BA. Cursou Licenciatura em História pela UNEB X e atualmente cursa Design de Interiores pela UNIP.</p>
              <p data-rich data-layout-key="about.joao.p2" data-editable="about.joao.p2">É artista visual nas áreas de ilustração tradicional, ilustração digital, design gráfico e tatuagem. Fundou o Coletivo Fluxo Artístico e o projeto Fluxo nas Escolas.</p>
              <p data-rich data-layout-key="about.joao.p3" data-editable="about.joao.p3">Também atua no Coletivo das Artes Motirô, é cofundador e host do PQOQ e desenvolve obras em arte tradicional, arte digital, fotocolagem e aquarela.</p>
              <div className="tag-list" data-layout-key="about.joao.tags"><span>Ilustração</span><span>Tatuagem</span><span>Design</span></div>
            </article>
          </div>
        </section>
      </main>
    </PageShell>
  );
}

export function SupportPage() {
  return (
    <PageShell
      footerText="PQOQ - rede de apoio e colaboração."
      editorDescription="Entre para editar e formatar os campos de apoio."
      toolbar="compact"
    >
      <main>
        <section className="section">
          <div className="section-head">
            <h1 className="page-title" data-layout-key="support.page.title" data-editable="support.page.title">Apoio</h1>
            <p data-rich data-layout-key="support.page.intro" data-editable="support.page.intro">Conheça as frentes que sustentam o PQOQ e a rede de apoiadores e parceiros que tornam o projeto possível. Clique em um card para abrir os detalhes.</p>
          </div>

          <div className="support-section" data-support-section="fronts">
            <div className="support-section-head">
              <h2 className="support-section-title" data-layout-key="support.fronts.title" data-editable="support.fronts.title">Frentes de apoio</h2>
              <div className="admin-only">
                <button className="button primary small" id="support-add-front" type="button">Adicionar frente</button>
              </div>
            </div>
            <div className="grid two" data-render-support="fronts">
              <article className="card">
                <h3>Carregando</h3>
                <p>Preparando frentes de apoio...</p>
              </article>
            </div>
          </div>

          <div className="support-section" data-support-section="partners">
            <div className="support-section-head">
              <h2 className="support-section-title" data-layout-key="support.partners.title" data-editable="support.partners.title">Apoiadores e parceiros</h2>
              <div className="admin-only">
                <button className="button primary small" id="support-add-partner" type="button">Adicionar apoiador</button>
              </div>
            </div>
            <div className="grid two" data-render-support="partners">
              <article className="card">
                <h3>Carregando</h3>
                <p>Preparando apoiadores e parceiros...</p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
