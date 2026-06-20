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
            <div className="pill" data-editable="home.eyebrow">Nova temporada - podcast + videocast</div>
            <div className="intro-text" data-rich data-editable="home.description">
              <p>O PQOQ é um acervo vivo de artistas, processos criativos e memória cultural. O projeto nasce no extremo sul da Bahia, entre conversas, escutas, imagens e trajetórias. A cada quinze dias, convidamos um artista para se sentar conosco e dialogar sobre processos criativos, influências, vivências e escolhas de caminho. O projeto registra vozes de diferentes linguagens, como música, literatura e artes visuais, além de abrir espaço para o audiovisual, a tatuagem, a cerâmica, a performance e a palavra. A nova temporada amplia o podcast para o formato de videocast, com gravações presenciais. Os encontros acontecem com o apoio da UFSB, no Campus Paulo Freire. Cada episódio transforma-se em arquivo, conversa, memória e ponto de encontro com a comunidade. E, no centro de tudo, permanece a pergunta: afinal, por que criamos o que criamos?</p>
            </div>
            <div className="intro-actions">
              <a className="button primary" href="/episodios" data-link-editable="home.watch-now">Assistir agora</a>
              <a className="button" href="/episodios">Ouvir episódios</a>
              <a className="button" href="/artistas">Conhecer artistas</a>
            </div>
          </div>

          <aside className="home-latest" aria-labelledby="home-episodes-title">
            <h2 className="home-latest-title" id="home-episodes-title" data-editable="home.latest.title">Últimos episódios:</h2>
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
            <h1 className="page-title" data-editable="episodes.page.title">Últimos episódios:</h1>
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
            <h1 className="page-title" data-editable="artists.page.title">Artistas</h1>
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
      footerText="PQOQ - galeria e memória visual do projeto."
      editorDescription="Entre para editar textos e reorganizar conteúdo no Lovable."
      toolbar="compact"
    >
      <main>
        <section className="section">
          <div className="section-head">
            <h1 className="page-title" data-editable="gallery.page.title">Galeria</h1>
            <p data-rich data-editable="gallery.page.intro">A galeria organiza imagens, bastidores, capas, registros de gravação e materiais enviados pelos artistas.</p>
          </div>
          <div className="admin-only" style={{ marginBottom: 18 }}>
            <button className="button primary" id="gallery-add" type="button">Adicionar galeria</button>
          </div>
          <div className="grid three" data-render-gallery-list>
            <article className="card gallery-card">
              <div className="gallery-thumb" />
              <div className="meta">Carregando</div>
              <h3>Galeria</h3>
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
            <h1 className="page-title" data-editable="about.page.title">Sobre</h1>
          </div>
          <div className="about-layout">
            <article className="card" data-editable="about.project">
              <h3>O projeto</h3>
              <p data-rich>O <strong>Por que criamos o que criamos</strong> é um projeto de extensão, escuta e produção audiovisual dedicado a registrar processos criativos de artistas do extremo sul da Bahia.</p>
              <p data-rich>Criado em 2021 no formato podcast, o PQOQ chega a uma nova etapa ampliando sua linguagem para o videocast, com gravações presenciais no Campus Paulo Freire da UFSB.</p>
              <p data-rich>A proposta reúne entrevistas, imagens, trajetórias e materiais de arquivo para fortalecer a memória cultural da região e aproximar universidade, artistas e comunidade.</p>
              <p data-rich>A cada quinze dias, artistas de diferentes linguagens são convidados a conversar sobre influências, vivências, território, escolhas estéticas e modos de criação, sempre atravessados pela pergunta: por que criamos o que criamos?</p>
              <div className="tag-list"><span>Podcast</span><span>Videocast</span><span>Acervo</span><span>Extensão</span></div>
            </article>
            <article className="card bio-card" data-editable="about.almi">
              <label className="bio-photo bio-photo-upload" data-page-photo-box="about.almi">
                <span>Foto</span>
                <input className="admin-only" type="file" accept="image/*" data-page-photo="about.almi" aria-label="Enviar foto de Almi Junior" />
              </label>
              <h3>Almi Junior</h3>
              <p data-rich>Almi Junior é poeta, professor e pesquisador. Possui mestrado em Letras e desenvolve doutorado na mesma área, investigando relações entre poesia e artes visuais na obra de Manoel de Barros.</p>
              <p data-rich>Natural de Teixeira de Freitas - BA, ajudou a organizar saraus e encontros de artistas, como o Sarau MamÁfrica e o Sarau dos Mal Amados, em parceria com o coletivo Éramos 7.</p>
              <p data-rich>Integra o Mapa da Palavra da Bahia, possui poemas publicados em revistas e coletâneas, atua como ilustrador e compõe o Fluxo Artístico.</p>
              <div className="tag-list"><span>Poesia</span><span>Pesquisa</span><span>Ilustração</span></div>
            </article>
            <article className="card bio-card" data-editable="about.joao">
              <label className="bio-photo bio-photo-upload" data-page-photo-box="about.joao">
                <span>Foto</span>
                <input className="admin-only" type="file" accept="image/*" data-page-photo="about.joao" aria-label="Enviar foto de João Lucas Monti" />
              </label>
              <h3>João Lucas Monti</h3>
              <p data-rich>João Lucas de Oliveira Monti, também conhecido como Don, é natural de Teixeira de Freitas - BA. Cursou Licenciatura em História pela UNEB X e atualmente cursa Design de Interiores pela UNIP.</p>
              <p data-rich>É artista visual nas áreas de ilustração tradicional, ilustração digital, design gráfico e tatuagem. Fundou o Coletivo Fluxo Artístico e o projeto Fluxo nas Escolas.</p>
              <p data-rich>Também atua no Coletivo das Artes Motirô, é cofundador e host do PQOQ e desenvolve obras em arte tradicional, arte digital, fotocolagem e aquarela.</p>
              <div className="tag-list"><span>Ilustração</span><span>Tatuagem</span><span>Design</span></div>
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
            <h1 className="page-title" data-editable="support.page.title">Apoio</h1>
          </div>
          <div className="grid two">
            <article className="card" data-editable="support.ufsb"><h3>UFSB / PROEX</h3><p data-rich>O projeto dialoga com a política de extensão ao aproximar universidade, artistas e comunidade por meio de escuta, registro e circulação cultural.</p></article>
            <article className="card" data-editable="support.campus"><h3>Campus Paulo Freire</h3><p data-rich>As gravações presenciais usam a infraestrutura do Campus Paulo Freire e do Espaço Colaborar, ambiente adaptável para áudio, vídeo e encontros.</p></article>
            <article className="card" data-editable="support.accessibility"><h3>Acessibilidade</h3><p data-rich>Os materiais podem contar com transcrições e formatos preparados para ampliar o acesso ao conteúdo produzido em áudio, vídeo e texto.</p></article>
            <article className="card" data-editable="support.community"><h3>Comunidade</h3><p data-rich>A proposta também prevê articulação com escolas públicas, redes culturais locais e divulgação em canais digitais e institucionais.</p></article>
          </div>
          <div className="support-bios">
            <article className="card bio-card" data-editable="support.apoiador1">
              <label className="bio-photo bio-photo-upload" data-page-photo-box="support.apoiador1">
                <span>Foto</span>
                <input className="admin-only" type="file" accept="image/*" data-page-photo="support.apoiador1" aria-label="Enviar foto do apoiador 1" />
              </label>
              <h3>Apoiador 1</h3>
              <p data-rich>Espaço editável para apresentar um apoiador, instituição, pessoa parceira ou frente de colaboração do projeto.</p>
              <p data-rich>Use este campo para explicar como esse apoio participa da realização, circulação, infraestrutura, pesquisa, memória ou divulgação do PQOQ.</p>
              <div className="tag-list"><span>Pesquisa</span><span>Podcast</span><span>Curadoria</span></div>
            </article>
            <article className="card bio-card" data-editable="support.apoiador2">
              <label className="bio-photo bio-photo-upload" data-page-photo-box="support.apoiador2">
                <span>Foto</span>
                <input className="admin-only" type="file" accept="image/*" data-page-photo="support.apoiador2" aria-label="Enviar foto do apoiador 2" />
              </label>
              <h3>Apoiador 2</h3>
              <p data-rich>Espaço editável para apresentar outro apoiador, parceiro, coletivo, laboratório, grupo, instituição ou colaborador do projeto.</p>
              <p data-rich>Este card pode receber informações de contato, histórico, descrição da parceria e links relacionados.</p>
              <div className="tag-list"><span>Design</span><span>Produção</span><span>Imagem</span></div>
            </article>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
