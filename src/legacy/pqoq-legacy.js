(() => {
  const STORAGE_PREFIX = "pqoq-site:";
  const localConfig = typeof window !== "undefined" ? window.PQOQ_CONFIG || {} : {};

  // Phase 2: upload editorial media to Supabase Storage and return a URL.
  // Falls back to base64 only if the upload bridge is unavailable.
  function uploadEditorMedia(file, prefix) {
    // Hard guard: never let a public/anonymous visitor trigger an upload or a
    // base64 fallback, even if a handler somehow reaches this point.
    if (!canUseEditorialUpload()) {
      return Promise.reject(new Error("upload-not-authorized"));
    }
    const media = window.PQOQ_MEDIA;
    if (media && typeof media.upload === "function") {
      return media.upload(file, prefix);
    }
    // base64 fallback is allowed ONLY for an authorized editor without bridge.
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () =>
        resolve({ url: String(reader.result || ""), path: "" }),
      );
      reader.addEventListener("error", reject);
      reader.readAsDataURL(file);
    });
  }
  const ADMIN_EMAIL = localConfig.adminEmail || "";
  const ADMIN_PASSWORD = localConfig.adminPassword || "";
  const STYLE_STATE_KEY = "style-state";
  const STYLE_TARGET_SELECTOR = [
    "[data-editable]",
    "[data-rich]",
    "[data-artist-field]",
    "[data-artist-modal-field]",
    "[data-portfolio-field]",
    "[data-link-item-field]",
    "[data-episode-description]",
    "[data-episode-artist-bio]",
    "[data-episode-participant-about]",
    ".page-title",
    ".home-latest-title",
    ".section-head h1",
    ".section-head p",
    ".intro-text",
    ".pill",
    ".meta",
    ".card h3",
    ".card p",
    ".home-episode h3",
    ".home-episode p",
    ".episode-thumb",
    ".button",
    ".nav a",
    ".bio-card h3",
    ".bio-card p",
    ".support-card h3",
    ".support-card p",
    ".gallery-card h3",
    ".gallery-card p",
    ".artist-card h3",
    ".artist-card p",
    ".platform-chip",
    ".episode-back-link"
  ].join(", ");
  const STYLE_SKIP_SELECTOR = [
    ".style-popover",
    ".editor-panel",
    "input",
    "textarea",
    "select",
    "[data-close-modal]",
    "[data-tab]",
    "[data-open-episode]",
    "[data-open-artist]",
    "[data-remove-artist]",
    "[data-remove-episode]",
    "[data-add-portfolio-item]",
    "[data-remove-portfolio-item]",
    "[data-add-link-item]",
    "[data-remove-link-item]",
    "[data-format-command]",
    "#artist-add",
    "#episode-add",
    "#admin-login",
    "#admin-logout",
    "#admin-reset"
  ].join(", ");
  const CONTROLLED_STYLE_PROPS = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "textDecoration",
    "textTransform",
    "textAlign",
    "lineHeight",
    "letterSpacing",
    "wordSpacing",
    "color",
    "backgroundColor"
  ];
  let activeStyleTarget = null;

  const artistsDefault = [
    {
      id: "joab3",
      name: "Joab3",
      meta: "Hip hop & composição",
      description: "Ritmos, palavras, mobilização e movimentação cultural.",
      bio: "Joab3 é compositor e artista ligado à palavra, ao hip hop e à circulação cultural. Sua conversa atravessa ritmos, escrita, território e os modos de se reconhecer pela escuta.",
      portfolio: "Espaço editável para reunir obras, músicas, imagens, processos, registros e materiais enviados pelo artista.",
      links: "Instagram: @jx4b3. Adicione aqui links de música, portfólio, vídeos, plataformas e acervos.",
      contact: "Espaço editável para e-mail, telefone profissional, assessoria ou outra forma de contato autorizada."
    },
    {
      id: "josi-santos",
      name: "Josi Santos",
      meta: "Poesia & escrita",
      description: "Poeta, voz, passado, futuro e desejo.",
      bio: "Josi Santos é poeta e artista da palavra. Sua trajetória passa pela escrita, pela voz e pela busca de um lugar poético entre memória, desejo e futuro.",
      portfolio: "Espaço editável para poemas, performances, publicações, vídeos, fotos e registros de processo.",
      links: "Instagram: @maisdesejodoquegente. Adicione redes, publicações e páginas oficiais.",
      contact: "Espaço editável para formas de contato autorizadas."
    },
    {
      id: "andre-medina",
      name: "André Medina",
      meta: "Fotografia",
      description: "Imagem, carreira, captura e liberdade.",
      bio: "André Medina é fotógrafo e artista visual. Seu episódio acompanha a descoberta da força da fotografia como linguagem, continuidade e modo de olhar o mundo.",
      portfolio: "Espaço editável para séries fotográficas, ensaios, making of, exposições e imagens de arquivo.",
      links: "Instagram: @and_medinluiz / @andre.medina_photo. Adicione site, portfólio e redes.",
      contact: "Espaço editável para contato profissional."
    },
    {
      id: "alice-kiefer",
      name: "Alice Kiefer",
      meta: "Colagem & narrativa visual",
      description: "Colagem, mundo, imagem e companhia.",
      bio: "Alice Kiefer é artista visual e trabalha com colagem como forma de remontar mundos, afetos e fragmentos. Sua conversa percorre os caminhos da imagem e do encontro com a própria linguagem.",
      portfolio: "Espaço editável para colagens, séries visuais, processos, scans, vídeos e bastidores.",
      links: "Instagram: @nomundalice. Adicione outras redes e links de portfólio.",
      contact: "Espaço editável para contato autorizado."
    },
    {
      id: "re-freitas",
      name: "Rê Freitas",
      meta: "Música & composição",
      description: "Coração, canto, criação e movimento.",
      bio: "Rê Freitas é compositora e artista da música. Sua trajetória fala de abrir o coração, cantar, compor e mover o mundo pela criação.",
      portfolio: "Espaço editável para músicas, apresentações, letras, vídeos, fotos e registros.",
      links: "Instagram: @refreitasof_. Adicione plataformas, redes e páginas oficiais.",
      contact: "Espaço editável para contato profissional."
    },
    {
      id: "eriane-emerentino",
      name: "Eriane Emerentino",
      meta: "Ilustração & representatividade",
      description: "Black, desenho, imagem e representatividade negra.",
      bio: "Eriane Emerentino é ilustradora e artista visual. Sua conversa aborda desenho, representatividade negra, infância, imaginário e a decisão de criar as próprias imagens.",
      portfolio: "Espaço editável para ilustrações, séries, personagens, estudos, vídeos e obras.",
      links: "Instagram: @em3rent_. Adicione redes, loja, portfólio e contatos.",
      contact: "Espaço editável para contato autorizado."
    },
    {
      id: "nilcelia-silva",
      name: "Nilcelia Silva",
      meta: "Poesia & literatura",
      description: "Paixão, escrita, poesia e literatura infantil.",
      bio: "Nilcelia Silva é poeta e escritora movida por paixão. Sua conversa passa pelos anseios poéticos, pela literatura infantil e pelos muitos eus literários que habitam a escrita.",
      portfolio: "Espaço editável para poemas, livros, publicações, leituras, registros e obras.",
      links: "Adicione redes sociais, publicações, páginas de venda ou acervo.",
      contact: "Espaço editável para contato autorizado."
    },
    {
      id: "almi-junior",
      name: "Almi Junior",
      meta: "Poesia & pesquisa",
      description: "Poeta, professor, pesquisador e cofundador do PQOQ.",
      bio: "Almi Junior é poeta, professor e pesquisador. Possui mestrado em Letras e desenvolve doutorado na mesma área, investigando relações entre poesia e artes visuais na obra de Manoel de Barros.",
      portfolio: "Espaço editável para poemas, ilustrações, publicações, eventos e registros de processo.",
      links: "Adicione Mapa da Palavra, redes, publicações e acervos digitais.",
      contact: "Espaço editável para contato autorizado."
    },
    {
      id: "joao-lucas-monti",
      name: "João Lucas Monti",
      meta: "Design & artes visuais",
      description: "Artista visual, designer, tatuador e cofundador do PQOQ.",
      bio: "João Lucas de Oliveira Monti, também conhecido como Don, é natural de Teixeira de Freitas - BA. Atua com ilustração tradicional, ilustração digital, design gráfico, tatuagem, fotocolagem e aquarela.",
      portfolio: "Espaço editável para ilustrações, tattoos, identidade visual, fotocolagens e projetos culturais.",
      links: "Adicione Instagram, Fluxo Artístico, Motirô, portfólio e redes.",
      contact: "Espaço editável para contato profissional."
    }
  ];

  const episodesDefault = [
    {
      id: "t02ep01",
      code: "T02EP01",
      title: "Tinta, pele e memória",
      artistId: "joao-lucas-monti",
      artist: "Maria Silva",
      date: "Nova temporada",
      duration: "Videocast",
      description: "A primeira gravação presencial da nova fase, no Espaço Colaborar da UFSB.",
      latest: true,
      sourceUrl: ""
    },
    {
      id: "t01ep07",
      code: "T01EP07",
      title: "Me conheço quando me escuto",
      artistId: "joab3",
      artist: "Joab3",
      date: "10/19/2021",
      duration: "97 min",
      description: "Em nosso sétimo episódio recebemos Joab3, compositor que tem feito uma travessia através dos ritmos e das palavras. A conversa passa por hip hop, mobilização e movimentação cultural.",
      sourceUrl: "https://pqcriamos.wixsite.com/my-site/pqcriamoscast/episode/1cd5538f/t01ep07-me-conheco-quando-me-escuto-com-joab3"
    },
    {
      id: "t01ep06",
      code: "T01EP06",
      title: "O desejo está na minha vida",
      artistId: "josi-santos",
      artist: "Josi Santos",
      date: "9/13/2021",
      duration: "78 min",
      description: "Recebemos Josi Santos, poeta que tem encontrado sua voz, mas mantém os pés no passado e os olhos no futuro. O episódio fala de poesia, escrita e desejo.",
      sourceUrl: "https://pqcriamos.wixsite.com/my-site/pqcriamoscast/episode/1b765e53/t01ep06-o-desejo-esta-na-minha-vida-josi-santos"
    },
    {
      id: "t01ep05",
      code: "T01EP05",
      title: "A fotografia me libertou",
      artistId: "andre-medina",
      artist: "André Medina",
      date: "8/14/2021",
      duration: "88 min",
      description: "Recebemos André Medina, fotógrafo que descobriu na captura de imagens a força para continuar. A conversa percorre carreira, fotografia e processo criativo.",
      sourceUrl: "https://pqcriamos.wixsite.com/my-site/pqcriamoscast/episode/32d55876/t01ep05-a-fotografia-me-libertou-com-andre-medina"
    },
    {
      id: "t01ep04",
      code: "T01EP04",
      title: "A colagem não me deixa sozinha",
      artistId: "alice-kiefer",
      artist: "Alice Kiefer",
      date: "7/30/2021",
      duration: "68 min",
      description: "Recebemos Alice Kiefer, artista que descobriu na colagem sua maneira de remontar o mundo. O episódio fala de imagem, fragmento e companhia.",
      sourceUrl: "https://pqcriamos.wixsite.com/my-site/pqcriamoscast/episode/d8522c09/t01ep04-a-colagem-nao-me-deixa-sozinha-com-alice-kiefer"
    },
    {
      id: "t01ep03",
      code: "T01EP03",
      title: "Criar para mover o mundo",
      artistId: "re-freitas",
      artist: "Rê Freitas",
      date: "7/15/2021",
      duration: "66 min",
      description: "Recebemos Rê Freitas, compositora que percebeu que precisava abrir o coração e cantar antes que fosse tarde. Uma conversa sobre criação, música e movimento.",
      sourceUrl: "https://pqcriamos.wixsite.com/my-site/pqcriamoscast/episode/23e6a979/t01ep03-criar-para-mover-o-mundo-com-re-freitas"
    },
    {
      id: "t01ep02",
      code: "T01EP02",
      title: "Resolvi desenhar meu black",
      artistId: "eriane-emerentino",
      artist: "Eriane Emerentino",
      date: "7/2/2021",
      duration: "61 min",
      description: "Recebemos Eriane Emerentino, ilustradora que cansou de não ver princesas e fadas negras na TV e resolveu desenhá-las. O episódio fala de desenho e representatividade.",
      sourceUrl: "https://pqcriamos.wixsite.com/my-site/pqcriamoscast/episode/2afbe22d/t01ep02-resolvi-desenhar-meu-black-com-eriane-emerentino"
    },
    {
      id: "t01ep01",
      code: "T01EP01",
      title: "Escrevendo sob paixão",
      artistId: "nilcelia-silva",
      artist: "Nilcelia Silva",
      date: "6/18/2021",
      duration: "47 min",
      description: "Recebemos Nilcelia Silva, poeta movida por paixão. A conversa passa pelos anseios poéticos, pela literatura infantil e pelos muitos eus literários da escrita.",
      sourceUrl: "https://pqcriamos.wixsite.com/my-site/pqcriamoscast/episode/e7b7a046/t01ep01-escrevendo-sob-paixao-com-nilcelia-silva"
    },
    {
      id: "t01ep00",
      code: "T01EP00",
      title: "Quem somos?",
      artistId: "almi-junior",
      artist: "Almi Jr e Don Monti",
      date: "6/4/2021",
      duration: "24 min",
      description: "No episódio de abertura, as duas mentes curiosas por trás do podcast apresentam o projeto, seus processos e a pergunta que move o PQOQ.",
      sourceUrl: "https://pqcriamos.wixsite.com/my-site/pqcriamoscast/episode/3b035f31/t01ep00-quem-somos"
    }
  ];

  function getState(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_PREFIX + key) || "null") || fallback;
    } catch {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return fallback;
    }
  }

  function setState(key, value) {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    try {
      if (typeof window !== "undefined" && window.PQOQ_REMOTE && typeof window.PQOQ_REMOTE.save === "function") {
        window.PQOQ_REMOTE.save(key, value);
      }
    } catch (err) {
      /* remote sync is best-effort */
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function assetId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function normalizeArtistAssets(artist) {
    artist.portfolioItems = Array.isArray(artist.portfolioItems) ? artist.portfolioItems : [];
    artist.linkItems = Array.isArray(artist.linkItems) ? artist.linkItems : [];
    artist.contactInfo = artist.contactInfo && typeof artist.contactInfo === "object" ? artist.contactInfo : {};
    artist.contactInfo.email = artist.contactInfo.email || "";
    artist.contactInfo.phone = artist.contactInfo.phone || "";
    artist.contactInfo.link = artist.contactInfo.link || "";
    artist.contactInfo.note = artist.contactInfo.note || artist.contact || "";
    return artist;
  }

  function normalizeArtists(list) {
    return list.map((artist) => normalizeArtistAssets({ ...artist }));
  }

  // Galeria de fotos do participante deste episódio (1..3). Sem fotos novas,
  // cai no campo legado participantImage.
  function participantPhotosMarkup(episode, artist) {
    const fallbackAlt = artist?.name || episode.artist || "Participante";
    const list = Array.isArray(episode.participantImages) ? episode.participantImages : [];
    if (!list.length) {
      // Campo legado: mantido como está, apenas com chave estável de layout.
      return episode.participantImage
        ? `<figure class="episode-participant-figure" data-layout-key="episode.${escapeHtml(episode.id)}.participantImage.legacy">
          <span class="episode-participant-frame"><img class="episode-participant-photo" src="${escapeHtml(episode.participantImage)}" alt="${escapeHtml(fallbackAlt)}" loading="lazy"></span>
        </figure>`
        : "";
    }
    const tiles = list
      .slice(0, 3)
      .map((img, index) => {
        const alt = img.alt || `${fallbackAlt} - foto ${index + 1}`;
        const caption = img.caption || "";
        const credit = img.credit || "";
        // O botão de ampliar vive DENTRO do frame da imagem: nenhuma área
        // invisível ao lado da foto permanece clicável.
        return `
        <figure class="episode-participant-figure" data-participant-photo="${escapeHtml(img.id || String(index))}" data-layout-key="episode.${escapeHtml(episode.id)}.participantImages.${index}">
          <span class="episode-participant-frame">
            <img class="episode-participant-photo" src="${escapeHtml(img.url)}" alt="${escapeHtml(alt)}" loading="lazy" data-caption="${escapeHtml(caption)}" data-credit="${escapeHtml(credit)}">
            <button class="participant-photo-zoom" type="button" data-open-participant-lightbox="${escapeHtml(img.id || String(index))}" aria-label="Ampliar ${escapeHtml(alt)}" title="Ampliar imagem"></button>
          </span>
          ${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ""}
        </figure>`;
      })
      .join("");
    return `<div class="episode-participant-gallery" data-count="${Math.min(list.length, 3)}">${tiles}</div>`;
  }

  function normalizeEpisodes(list) {
    const defaults = new Map(episodesDefault.map((episode) => [episode.id, episode]));
    return list.map((episode) => {
      const merged = { ...(defaults.get(episode.id) || {}), ...episode };
      // Campos individuais do participante e links próprios do episódio
      // sempre existem como arrays/strings para o render não quebrar.
      merged.participantLinks = Array.isArray(merged.participantLinks) ? merged.participantLinks : [];
      merged.participantTags = Array.isArray(merged.participantTags) ? merged.participantTags : [];
      merged.links = Array.isArray(merged.links) ? merged.links : [];
      merged.participantTitle = merged.participantTitle || "";
      merged.participantBio = merged.participantBio || "";
      merged.participantImage = merged.participantImage || "";
      // Galeria de até 3 fotos do participante DESTE episódio. Campo legado
      // participantImage segue como fallback e nunca é apagado.
      merged.participantImages = Array.isArray(merged.participantImages)
        ? merged.participantImages
            .filter((img) => img && typeof img === "object" && img.url && img.published !== false)
            .slice(0, 3)
        : [];
      return merged;
    });
  }

  function styleState() {
    return getState(STYLE_STATE_KEY, {});
  }

  function saveStyleState(data) {
    setState(STYLE_STATE_KEY, data);
  }

  function styleTargetElements(root = document) {
    const elements = [];
    if (root.matches?.(STYLE_TARGET_SELECTOR)) elements.push(root);
    elements.push(...Array.from(root.querySelectorAll?.(STYLE_TARGET_SELECTOR) || []));
    return elements.filter((element) => (
      !element.closest(".style-popover") &&
      !element.closest(".editor-panel") &&
      !element.classList.contains("admin-only") &&
      // Card containers (e.g. <article data-editable="about.almi">) would wrap
      // every inner target with a second dashed outline and swallow clicks
      // meant for a single paragraph. Style only the leaf fields.
      !(element.tagName === "ARTICLE" && element.classList.contains("card")) &&
      !element.classList.contains("tag-list") &&
      !element.closest(".tag-list")
    ));
  }

  function compactText(text) {
    return normalizeId(String(text || "").trim().slice(0, 42));
  }

  function elementIndex(element) {
    if (!element.parentElement) return 0;
    return Array.from(element.parentElement.children).indexOf(element);
  }

  function elementStyleRole(element) {
    if (element.dataset.editable) return `editable:${element.dataset.editable}`;
    if (element.dataset.rich) return `rich:${element.dataset.rich || compactText(element.textContent)}`;
    if (element.dataset.artistField) return `artist:${element.closest("[data-artist-id]")?.dataset.artistId || "card"}:${element.dataset.artistField}`;
    if (element.dataset.artistModalField) return `artist-modal:${element.dataset.artistId || "artist"}:${element.dataset.artistModalField}`;
    if (element.dataset.portfolioField) return `portfolio:${element.dataset.artistId || "artist"}:${element.dataset.itemId || "item"}:${element.dataset.portfolioField}`;
    if (element.dataset.linkItemField) return `artist-link:${element.dataset.artistId || "artist"}:${element.dataset.itemId || "item"}:${element.dataset.linkItemField}`;
    if (element.dataset.episodeDescription) return `episode:${element.dataset.episodeDescription}:description`;
    if (element.dataset.episodeParticipantAbout) return `episode:${element.dataset.episodeParticipantAbout}:participant-about`;
    if (element.dataset.episodeArtistBio) return `episode-artist:${element.dataset.episodeArtistBio}:bio`;
    const episode = element.closest("[data-episode-id]");
    const artist = element.closest("[data-artist-id]");
    const page = document.body.dataset.page || "page";
    const tag = element.tagName.toLowerCase();
    const className = Array.from(element.classList).filter((item) => item !== "style-editable" && item !== "is-style-selected").join(".");
    const label = compactText(element.textContent) || elementIndex(element);
    if (episode) return `episode:${episode.dataset.episodeId}:${tag}:${className}:${label}`;
    if (artist) return `artist:${artist.dataset.artistId}:${tag}:${className}:${label}`;
    if (element.matches(".nav a")) return `nav:${element.dataset.page || element.getAttribute("href") || label}`;
    if (element.matches(".button")) return `button:${page}:${element.getAttribute("href") || element.dataset.openEpisode || element.dataset.openArtist || label}`;
    return `page:${page}:${tag}:${className}:${label}:${elementIndex(element)}`;
  }

  function ensureStyleKey(element) {
    if (!element.dataset.styleKey) element.dataset.styleKey = elementStyleRole(element);
    return element.dataset.styleKey;
  }

  function refreshStyleTargets(enabled = document.body.classList.contains("admin-mode")) {
    styleTargetElements().forEach((element) => {
      ensureStyleKey(element);
      element.classList.toggle("style-editable", enabled);
    });
    if (!enabled) {
      document.querySelectorAll(".is-style-selected").forEach((element) => element.classList.remove("is-style-selected"));
    }
  }

  function applyControlledStyles(element, styles) {
    CONTROLLED_STYLE_PROPS.forEach((property) => {
      if (Object.prototype.hasOwnProperty.call(styles, property)) {
        element.style[property] = styles[property];
      }
    });
  }

  function applySavedStyles(root = document) {
    const data = styleState();
    styleTargetElements(root).forEach((element) => {
      const key = ensureStyleKey(element);
      if (data[key]) applyControlledStyles(element, data[key]);
    });
  }

  function captureInlineStyles(element) {
    return CONTROLLED_STYLE_PROPS.reduce((styles, property) => {
      if (element.style[property]) styles[property] = element.style[property];
      return styles;
    }, {});
  }

  function saveTargetStyles(element) {
    const key = ensureStyleKey(element);
    const data = styleState();
    const styles = captureInlineStyles(element);
    if (Object.keys(styles).length) data[key] = styles;
    else delete data[key];
    saveStyleState(data);
  }

  function removeControlledStyles(element) {
    CONTROLLED_STYLE_PROPS.forEach((property) => {
      element.style[property] = "";
    });
    stripInlineBackgrounds(element);
    saveTargetStyles(element);
  }

  // ---- Higiene de conteúdo colado / marcações do editor -------------------
  // Remove destaques de fundo herdados de colagem (Word, Docs, editores web)
  // e marcadores temporários do editor visual que nunca deveriam ser salvos.
  const EDITOR_ONLY_CLASSES = ["style-editable", "is-style-selected"];

  function cleanStyleAttribute(node) {
    const style = node.getAttribute("style");
    if (!style) return;
    const kept = style
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part && !/^background(-color)?\s*:/i.test(part));
    if (kept.length) node.setAttribute("style", `${kept.join("; ")};`);
    else node.removeAttribute("style");
  }

  function cleanClassAttribute(node) {
    if (!node.classList.length) return;
    Array.from(node.classList).forEach((name) => {
      if (EDITOR_ONLY_CLASSES.includes(name) || /^Mso/i.test(name)) node.classList.remove(name);
    });
    if (!node.classList.length) node.removeAttribute("class");
  }

  function cleanEditableNode(node) {
    cleanStyleAttribute(node);
    cleanClassAttribute(node);
    node.removeAttribute("data-style-key");
    node.removeAttribute("data-text-key");
    node.removeAttribute("contenteditable");
  }

  // Remove qualquer fundo salvo dentro do HTML rico do elemento (spans/marks).
  function stripInlineBackgrounds(element) {
    if (!element) return;
    let changed = false;
    element.querySelectorAll('[style*="background"]').forEach((node) => {
      cleanStyleAttribute(node);
      changed = true;
    });
    element.querySelectorAll("mark").forEach((node) => {
      const parent = node.parentNode;
      if (!parent) return;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
      changed = true;
    });
    if (changed && (element.dataset.editable || element.dataset.rich !== undefined)) {
      saveEditableContent(element);
    }
  }

  // Sanitiza um trecho de HTML antes de gravar/aplicar em campos editáveis.
  function sanitizeEditableHtml(html) {
    if (!html || typeof document === "undefined") return html || "";
    if (!/background|Mso|style-editable|is-style-selected|<mark|data-style-key|contenteditable/i.test(html)) {
      return html;
    }
    const holder = document.createElement("div");
    holder.innerHTML = html;
    holder.querySelectorAll("mark").forEach((node) => {
      const parent = node.parentNode;
      if (!parent) return;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
    });
    holder.querySelectorAll("*").forEach(cleanEditableNode);
    return holder.innerHTML;
  }

  function handleEditablePaste(event) {
    const target = event.target;
    if (!target || typeof target.closest !== "function") return;
    const field = target.closest("[data-rich], [data-editable], [data-artist-field], [data-artist-modal-field], [data-portfolio-field], [data-link-item-field]");
    if (!field || field.getAttribute("contenteditable") !== "true") return;
    const clipboard = event.clipboardData;
    if (!clipboard) return;
    const html = clipboard.getData("text/html");
    const text = clipboard.getData("text/plain");
    event.preventDefault();
    const clean = html ? sanitizeEditableHtml(html) : escapeHtml(text).replace(/\n/g, "<br>");
    document.execCommand("insertHTML", false, clean);
  }

  function colorToHex(value) {
    if (!value || value === "transparent") return "#fff4bf";
    if (value.startsWith("#")) return value.slice(0, 7);
    const numbers = value.match(/\d+/g);
    if (!numbers || numbers.length < 3) return "#fff4bf";
    if (numbers.length > 3 && Number(numbers[3]) === 0) return "#fff4bf";
    return `#${numbers.slice(0, 3).map((number) => Number(number).toString(16).padStart(2, "0")).join("")}`;
  }

  function normalizedFontFamily(value) {
    if (value.includes("Architects")) return "var(--display)";
    if (value.includes("Work Sans")) return "var(--body)";
    if (value.includes("Courier")) return "\"Courier New\", monospace";
    if (value.includes("Georgia")) return "Georgia, \"Times New Roman\", serif";
    if (value.includes("Arial")) return "Arial, Helvetica, sans-serif";
    return "var(--body)";
  }

  function numericStyleValue(value, fallback) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function computedLineHeight(computed) {
    const fontSize = numericStyleValue(computed.fontSize, 16);
    const lineHeight = numericStyleValue(computed.lineHeight, fontSize * 1.35);
    return Number(lineHeight / fontSize).toFixed(2);
  }

  function ensureStylePopover() {
    if (document.getElementById("style-popover")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <aside class="style-popover" id="style-popover" aria-label="Editor visual do campo">
        <div class="style-popover-head">
          <div class="style-popover-title">Editar campo</div>
          <button class="style-close" type="button" data-style-close aria-label="Fechar editor">×</button>
        </div>
        <div class="style-field">
          <label for="style-font-family">Fonte</label>
          <select id="style-font-family" data-style-control="fontFamily">
            <option value="var(--body)">Texto padrão</option>
            <option value="var(--display)">Manuscrita PQOQ</option>
            <option value="Georgia, &quot;Times New Roman&quot;, serif">Serifada</option>
            <option value="Arial, Helvetica, sans-serif">Sem serifa simples</option>
            <option value="&quot;Courier New&quot;, monospace">Monoespaçada</option>
          </select>
        </div>
        <div class="style-field">
          <label for="style-font-size">Tamanho</label>
          <input id="style-font-size" type="number" min="8" max="140" step="1" data-style-control="fontSize">
        </div>
        <div class="style-button-group" aria-label="Estilo do texto">
          <button class="style-tool" type="button" data-style-toggle="bold">B</button>
          <button class="style-tool" type="button" data-style-toggle="italic">I</button>
          <button class="style-tool" type="button" data-style-toggle="underline">U</button>
          <button class="style-tool" type="button" data-style-toggle="normal">Aa</button>
        </div>
        <div class="style-row">
          <div class="style-section-label">Alinhamento</div>
          <div class="style-button-group">
            <button class="style-tool" type="button" data-style-align="left">←</button>
            <button class="style-tool" type="button" data-style-align="center">↔</button>
            <button class="style-tool" type="button" data-style-align="right">→</button>
            <button class="style-tool" type="button" data-style-align="justify">☰</button>
          </div>
        </div>
        <div class="style-field">
          <label for="style-line-height">Entrelinhas</label>
          <input id="style-line-height" type="number" min=".8" max="3" step=".05" data-style-control="lineHeight">
        </div>
        <div class="style-field">
          <label for="style-letter-spacing">Espaço entre letras</label>
          <input id="style-letter-spacing" type="number" min="-8" max="24" step=".5" data-style-control="letterSpacing">
        </div>
        <div class="style-field">
          <label for="style-word-spacing">Espaço entre palavras</label>
          <input id="style-word-spacing" type="number" min="-8" max="32" step=".5" data-style-control="wordSpacing">
        </div>
        <div class="style-control-line">
          <div class="style-field">
            <label for="style-color">Texto</label>
            <input id="style-color" type="color" data-style-control="color">
          </div>
          <div class="style-field">
            <label for="style-bg">Fundo</label>
            <input id="style-bg" type="color" data-style-control="backgroundColor">
          </div>
        </div>
        <div class="style-actions">
          <button class="style-tool" type="button" data-style-clear-bg>Sem fundo</button>
          <button class="style-tool" type="button" data-style-reset>Limpar</button>
          <button class="style-tool" type="button" data-style-close>Fechar</button>
        </div>
      </aside>
    `);
  }

  function setStyleControlValue(controlName, value) {
    document.querySelectorAll(`[data-style-control="${controlName}"]`).forEach((control) => {
      control.value = value;
    });
  }

  function setToolActive(selector, activeValue) {
    document.querySelectorAll(selector).forEach((button) => {
      const value = button.dataset.styleToggle || button.dataset.styleAlign;
      button.classList.toggle("is-active", value === activeValue);
    });
  }

  function syncStylePopover(element) {
    const computed = getComputedStyle(element);
    setStyleControlValue("fontFamily", normalizedFontFamily(computed.fontFamily));
    setStyleControlValue("fontSize", Math.round(numericStyleValue(computed.fontSize, 16)));
    setStyleControlValue("lineHeight", computedLineHeight(computed));
    setStyleControlValue("letterSpacing", numericStyleValue(computed.letterSpacing, 0));
    setStyleControlValue("wordSpacing", numericStyleValue(computed.wordSpacing, 0));
    setStyleControlValue("color", colorToHex(computed.color));
    setStyleControlValue("backgroundColor", colorToHex(computed.backgroundColor));
    setToolActive("[data-style-toggle]", "");
    document.querySelector('[data-style-toggle="bold"]')?.classList.toggle("is-active", numericStyleValue(computed.fontWeight, 400) >= 700);
    document.querySelector('[data-style-toggle="italic"]')?.classList.toggle("is-active", computed.fontStyle === "italic");
    document.querySelector('[data-style-toggle="underline"]')?.classList.toggle("is-active", computed.textDecorationLine.includes("underline"));
    setToolActive("[data-style-align]", computed.textAlign || "left");
  }

  function positionStylePopover(element) {
    const popover = document.getElementById("style-popover");
    if (!popover) return;
    const rect = element.getBoundingClientRect();
    const gap = 12;
    const width = Math.min(308, window.innerWidth - 28);
    const height = Math.min(popover.offsetHeight || 520, window.innerHeight - 28);
    let left = rect.right + gap;
    let top = Math.max(14, rect.top);
    if (left + width > window.innerWidth - 14) left = Math.max(14, rect.left - width - gap);
    if (top + height > window.innerHeight - 14) top = Math.max(14, window.innerHeight - height - 14);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function openStylePopover(element) {
    ensureStylePopover();
    refreshStyleTargets(true);
    document.querySelectorAll(".is-style-selected").forEach((target) => target.classList.remove("is-style-selected"));
    activeStyleTarget = element;
    activeStyleTarget.classList.add("is-style-selected");
    syncStylePopover(element);
    const popover = document.getElementById("style-popover");
    popover.classList.add("is-open");
    positionStylePopover(element);
  }

  function closeStylePopover() {
    document.getElementById("style-popover")?.classList.remove("is-open");
    document.querySelectorAll(".is-style-selected").forEach((target) => target.classList.remove("is-style-selected"));
    activeStyleTarget = null;
  }

  function styleValue(controlName, value) {
    if (controlName === "fontSize") return `${numericStyleValue(value, 16)}px`;
    if (controlName === "letterSpacing" || controlName === "wordSpacing") return `${numericStyleValue(value, 0)}px`;
    if (controlName === "lineHeight") return String(numericStyleValue(value, 1.35));
    return value;
  }

  function updateActiveStyle(controlName, value) {
    if (!activeStyleTarget) return;
    activeStyleTarget.style[controlName] = styleValue(controlName, value);
    saveTargetStyles(activeStyleTarget);
    syncStylePopover(activeStyleTarget);
  }

  function toggleActiveStyle(action) {
    if (!activeStyleTarget) return;
    const computed = getComputedStyle(activeStyleTarget);
    if (action === "bold") activeStyleTarget.style.fontWeight = numericStyleValue(computed.fontWeight, 400) >= 700 ? "400" : "900";
    if (action === "italic") activeStyleTarget.style.fontStyle = computed.fontStyle === "italic" ? "normal" : "italic";
    if (action === "underline") activeStyleTarget.style.textDecoration = computed.textDecorationLine.includes("underline") ? "none" : "underline";
    if (action === "normal") {
      activeStyleTarget.style.fontWeight = "400";
      activeStyleTarget.style.fontStyle = "normal";
      activeStyleTarget.style.textDecoration = "none";
      activeStyleTarget.style.textTransform = "none";
    }
    saveTargetStyles(activeStyleTarget);
    syncStylePopover(activeStyleTarget);
  }

  function alignActiveStyle(alignment) {
    if (!activeStyleTarget) return;
    activeStyleTarget.style.textAlign = alignment;
    saveTargetStyles(activeStyleTarget);
    syncStylePopover(activeStyleTarget);
  }

  function styleSelectionFromClick(event) {
    if (!document.body.classList.contains("admin-mode")) return false;
    if (document.body.classList.contains("public-preview")) return false;
    if (event.target.closest(STYLE_SKIP_SELECTOR)) return false;
    const target = event.target.closest(STYLE_TARGET_SELECTOR);
    if (!target) {
      closeStylePopover();
      return false;
    }
    openStylePopover(target);
    if (target.matches("a, button") || target.closest("a, button")) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    return false;
  }

  function handleStylePopoverInput(event) {
    const control = event.target.closest("[data-style-control]");
    if (!control || !control.closest("#style-popover")) return;
    updateActiveStyle(control.dataset.styleControl, control.value);
  }

  function handleStylePopoverClick(event) {
    if (event.target.closest("[data-style-close]")) {
      closeStylePopover();
      return;
    }
    if (event.target.closest("[data-style-reset]")) {
      if (activeStyleTarget) {
        removeControlledStyles(activeStyleTarget);
        syncStylePopover(activeStyleTarget);
      }
      return;
    }
    if (event.target.closest("[data-style-clear-bg]")) {
      if (activeStyleTarget) {
        activeStyleTarget.style.backgroundColor = "";
        stripInlineBackgrounds(activeStyleTarget);
        saveTargetStyles(activeStyleTarget);
        syncStylePopover(activeStyleTarget);
      }
      return;
    }
    const toggleButton = event.target.closest("[data-style-toggle]");
    if (toggleButton) {
      toggleActiveStyle(toggleButton.dataset.styleToggle);
      return;
    }
    const alignButton = event.target.closest("[data-style-align]");
    if (alignButton) alignActiveStyle(alignButton.dataset.styleAlign);
  }

  function artists() {
    return normalizeArtists(getState("artists", artistsDefault));
  }

  function saveArtists(list) {
    setState("artists", list);
  }

  function episodes() {
    return normalizeEpisodes(getState("episodes", episodesDefault));
  }

  function saveEpisodes(list) {
    setState("episodes", list);
  }

  function episodeEmbeds() {
    return getState("episode-embeds", {});
  }

  function saveEpisodeEmbeds(data) {
    setState("episode-embeds", data);
  }

  function isOwnerEditing() {
    return document.body.classList.contains("admin-mode") && !document.body.classList.contains("public-preview");
  }

  // Single source of truth for whether an editorial upload may be triggered.
  // admin-mode is only set by the auth bridge AFTER an editor/admin login is
  // verified, and public-preview must be off. CSS is never the only barrier.
  function canUseEditorialUpload() {
    return isOwnerEditing();
  }
  if (typeof window !== "undefined") window.PQOQCanUploadLegacy = canUseEditorialUpload;

  // Disable/enable file inputs and avatar labels so a public visitor can never
  // open the file picker by clicking an image.
  function syncUploadControls() {
    const allow = canUseEditorialUpload();
    document.querySelectorAll('input[type="file"]').forEach((input) => {
      input.disabled = !allow;
      if (!allow) input.setAttribute("aria-hidden", "true");
      else input.removeAttribute("aria-hidden");
    });
  }

  function ensureOwnerBar() {
    if (document.getElementById("owner-bar")) return;
    document.body.insertAdjacentHTML("afterbegin", `
      <div class="owner-bar admin-only" id="owner-bar" role="region" aria-label="Modo dos donos do site">
        <strong>Visão dos donos</strong>
        <span>Escolha se quer editar ou conferir como o público verá.</span>
        <button class="owner-toggle active" type="button" data-owner-view="edit">Modo edição</button>
        <button class="owner-toggle" type="button" data-owner-view="preview">Prévia pública</button>
      </div>
    `);
  }

  function setOwnerPreview(enabled) {
    document.body.classList.toggle("public-preview", enabled);
    document.querySelectorAll("[data-owner-view]").forEach((button) => {
      button.classList.toggle("active", button.dataset.ownerView === (enabled ? "preview" : "edit"));
    });
    ensureTextKeys();
    editableTextNodes().forEach((element) => {
      element.contentEditable = !enabled && document.body.classList.contains("admin-mode") ? "true" : "false";
    });
    refreshStyleTargets(!enabled && document.body.classList.contains("admin-mode"));
    closeStylePopover();
    renderAudio(currentEpisodeId());
    renderVideo(currentEpisodeId());
  }

  function findArtist(id) {
    const key = String(id || "").trim();
    if (!key) return undefined;
    return (
      artists().find((artist) => artist.id === key) ||
      artists().find((artist) => artist.slug === key) ||
      artistsDefault.find((artist) => artist.id === key)
    );
  }

  /**
   * EP00 é institucional (apresentação dos anfitriões): nunca resolve artista
   * convidado. Mesma normalização de src/lib/episode-artist-link.ts.
   */
  function isEpisodeZeroLegacy(episode) {
    if (!episode) return false;
    const norm = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");
    const id = norm(episode.id);
    const code = norm(episode.code);
    if (id === "t01ep00" || code === "t01ep00") return true;
    return id.endsWith("ep00") || code.endsWith("ep00");
  }

  /** Artista vinculado ao episódio, sem fallback para o primeiro da lista. */
  function resolveEpisodeArtist(episode) {
    if (!episode || isEpisodeZeroLegacy(episode)) return undefined;
    return findArtist(episode.artistId);
  }

  function normalizeId(text) {
    return String(text || "novo-artista")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `item-${Date.now()}`;
  }

  function youtubeId(url) {
    const value = String(url || "").trim();
    const patterns = [
      /youtube\.com\/watch\?v=([^&]+)/,
      /youtube\.com\/embed\/([^?&/]+)/,
      /youtu\.be\/([^?&/]+)/,
      /youtube\.com\/shorts\/([^?&/]+)/
    ];
    for (const pattern of patterns) {
      const match = value.match(pattern);
      if (match) return match[1];
    }
    return "";
  }

  function spotifyEmbed(url) {
    const value = String(url || "").trim();
    if (!value) return "";
    if (value.includes("<iframe")) {
      const match = value.match(/src=["']([^"']+)["']/);
      return match ? match[1] : "";
    }
    if (value.includes("open.spotify.com/embed/")) return value;
    const episodeMatch = value.match(/open\.spotify\.com\/episode\/([^?&/]+)/);
    if (episodeMatch) return `https://open.spotify.com/embed/episode/${episodeMatch[1]}?utm_source=generator`;
    const showMatch = value.match(/open\.spotify\.com\/show\/([^?&/]+)/);
    if (showMatch) return `https://open.spotify.com/embed/show/${showMatch[1]}?utm_source=generator`;
    return value;
  }

  function setActiveNav() {
    const current = document.body.dataset.page;
    document.querySelectorAll(".nav a").forEach((link) => {
      link.classList.toggle("active", link.dataset.page === current);
    });
  }

  function thumbLabel(episode) {
    return `${episode.code.replace("EP", "<br>EP")}`;
  }

  function episodeHref(id) {
    return `/episodio?id=${encodeURIComponent(id)}`;
  }

  function currentEpisodeId() {
    return new URLSearchParams(window.location.search).get("id") || episodes()[0]?.id || "";
  }

  function episodeCoverStyle(episode) {
    const thumbnail = episodeEmbeds()[episode.id]?.thumbnail;
    return thumbnail ? ` style="background-image:url('${thumbnail}')"` : "";
  }

  /** Thumb do episodio: capa oficial (episode-embeds[id].thumbnail) ou fallback lettered. */
  function episodeThumbMarkup(episode) {
    const thumbnail = episodeEmbeds()[episode.id]?.thumbnail;
    if (thumbnail) {
      const safe = String(thumbnail).replace(/"/g, "%22").replace(/'/g, "%27");
      return `<div class="episode-thumb has-cover" data-layout-key="episode.${episode.id}.thumbnail" style="background-image:url('${safe}')" role="img" aria-label="Capa do episodio ${escapeHtml(episode.code || episode.id)}"></div>`;
    }
    return `<div class="episode-thumb lettered" data-layout-key="episode.${episode.id}.thumbnail">${thumbLabel(episode)}</div>`;
  }

  function renderHomeEpisodes() {
    const container = document.querySelector("[data-render-home-episodes]");
    if (!container) return;
    const items = episodes()
      .filter((episode) => episode.id !== "t01ep00")
      .filter((episode) => isOwnerEditing() || episode.published !== false)
      .slice(0, 2);
    container.innerHTML = items.map((episode) => `
      <article class="home-episode" data-episode-id="${episode.id}" data-episode-link="${episodeHref(episode.id)}">
        ${episodeThumbMarkup(episode)}
        <div>
          <div class="meta">${episode.code} - ${episode.artist}</div>
          <h3>${episode.title}</h3>
          <p>${episode.description}</p>
          <div class="artist-actions">
            <a class="button small" href="${episodeHref(episode.id)}">Abrir</a>
            <a class="button small" href="/episodios">Episódios</a>
          </div>
        </div>
      </article>
    `).join("");
    applySavedStyles(container);
  }

  function renderEpisodeList() {
    const container = document.querySelector("[data-render-episode-list]");
    if (!container) return;
    container.innerHTML = episodes()
      .filter((episode) => isOwnerEditing() || episode.published !== false)
      .map((episode) => `
      <article class="card episode-card" data-episode-id="${episode.id}" data-editable="episode.${episode.id}" data-episode-link="${episodeHref(episode.id)}">
        ${episodeThumbMarkup(episode)}
        <div>
          <div class="meta" data-layout-key="episode.${episode.id}.meta">${episode.code} · ${episode.date} · ${episode.duration}</div>
          <h2 data-layout-key="episode.${episode.id}.title">${episode.code} - ${episode.title}, com ${episode.artist}</h2>
          <p data-layout-key="episode.${episode.id}.description">${episode.description}</p>
          <div class="artist-actions">
            <a class="button primary small" href="${episodeHref(episode.id)}" data-layout-key="episode.${episode.id}.button">Abrir episódio</a>
            <button class="button small admin-only" type="button" data-remove-episode="${episode.id}">Remover</button>
          </div>
        </div>
      </article>
    `).join("");
    applySavedStyles(container);
  }

  function artistCard(artist) {
    const imageStyle = artist.image ? ` style="background-image:url('${artist.image}')"` : "";
    return `
      <article class="card artist-card" data-artist-id="${artist.id}" data-editable="artist.${artist.id}">
        <label class="artist-avatar" data-layout-key="artist.${artist.id}.photo"${imageStyle}>
          <span>${artist.image ? "" : "Foto"}</span>
          <input class="admin-only" type="file" accept="image/*" data-artist-image="${artist.id}" aria-label="Enviar foto de ${artist.name}">
        </label>
        <div class="meta" data-artist-field="meta" data-layout-key="artist.${artist.id}.meta">${artist.meta}</div>
        <h2 data-artist-field="name" data-layout-key="artist.${artist.id}.name">${artist.name}</h2>
        <p data-artist-field="description" data-layout-key="artist.${artist.id}.description">${artist.description}</p>
        <div class="artist-actions">
          <button class="button primary small" type="button" data-open-artist="${artist.id}" data-layout-key="artist.${artist.id}.button">Ver acervo</button>
          <button class="button small admin-only" type="button" data-remove-artist="${artist.id}">Remover</button>
        </div>
      </article>
    `;
  }

  function renderArtists() {
    const container = document.querySelector("[data-render-artists]");
    if (!container) return;
    container.innerHTML = artists()
      .filter((artist) => isOwnerEditing() || artist.published !== false)
      .map(artistCard)
      .join("");
    applySavedStyles(container);
    syncUploadControls();
  }

  function ensureArtistModal() {
    if (document.getElementById("artist-modal")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal" id="artist-modal" aria-hidden="true">
        <div class="modal-panel">
          <div class="modal-head">
            <h2 id="artist-modal-title">Artista</h2>
            <button class="close-modal" type="button" data-close-modal aria-label="Fechar modal" title="Fechar modal">×</button>
          </div>
          <div class="modal-body">
            <div class="tabs" role="tablist">
              <button class="tab active" type="button" data-tab="bio">Biografia</button>
              <button class="tab" type="button" data-tab="portfolio">Portfólio</button>
              <button class="tab" type="button" data-tab="links">Redes & Links</button>
              <button class="tab" type="button" data-tab="contact">Contato</button>
            </div>
            <div class="tab-panel active" data-panel="bio"></div>
            <div class="tab-panel" data-panel="portfolio"></div>
            <div class="tab-panel" data-panel="links"></div>
            <div class="tab-panel" data-panel="contact"></div>
          </div>
        </div>
      </div>
    `);
  }

  function ensureEpisodeModal() {
    if (document.getElementById("episode-modal")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal" id="episode-modal" aria-hidden="true">
        <div class="modal-panel">
          <div class="modal-head">
            <h2 id="episode-modal-title">Episódio</h2>
            <button class="close-modal" type="button" data-close-modal aria-label="Fechar modal" title="Fechar modal">×</button>
          </div>
          <div class="modal-body" id="episode-modal-body"></div>
        </div>
      </div>
    `);
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModals() {
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
    });
  }

  function activeArtistTab() {
    return document.querySelector("#artist-modal .tab.active")?.dataset.tab || "bio";
  }

  function restoreArtistTab(tabName) {
    const modal = document.getElementById("artist-modal");
    if (!modal) return;
    modal.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item.dataset.tab === tabName));
    modal.querySelectorAll(".tab-panel").forEach((item) => item.classList.toggle("active", item.dataset.panel === tabName));
  }

  function saveArtistMutation(artistId, mutator) {
    const list = artists();
    const artist = list.find((item) => item.id === artistId);
    if (!artist) return null;
    normalizeArtistAssets(artist);
    mutator(artist);
    saveArtists(list);
    return artist;
  }

  function renderArtistRichBlock(artist, field, label) {
    return `
      <div class="artist-edit-hint admin-only">Campo de ${label}: clique no texto para escrever e use o painel flutuante para formatar fonte, cor, tamanho, alinhamento e espaçamento.</div>
      <div class="artist-rich-block" data-rich data-artist-modal-field="${field}" data-artist-id="${artist.id}">${artist[field] || ""}</div>
    `;
  }

  function portfolioItemCard(artist, item, index) {
    const imageStyle = item.image ? ` style="background-image:url('${item.image}')"` : "";
    const title = item.title || `Obra ${index + 1}`;
    const caption = item.caption || "Legenda editável da obra.";
    const link = item.url || "";
    return `
      <article class="portfolio-tile" data-portfolio-item="${item.id}" data-artist-id="${artist.id}">
        <label class="portfolio-image"${imageStyle}>
          <span>${item.image ? "" : "Imagem"}</span>
          <input class="admin-only" type="file" accept="image/*" data-portfolio-image="${artist.id}" data-item-id="${item.id}" aria-label="Enviar imagem de ${escapeHtml(title)}">
          <button class="portfolio-zoom" type="button" data-open-portfolio-lightbox="${item.id}" data-artist-id="${artist.id}" aria-label="Ampliar ${escapeHtml(title)}"></button>
        </label>
        <div class="portfolio-copy">
          <h3 data-portfolio-field="title" data-artist-id="${artist.id}" data-item-id="${item.id}">${escapeHtml(title)}</h3>
          <p data-rich data-portfolio-field="caption" data-artist-id="${artist.id}" data-item-id="${item.id}">${caption}</p>
          ${link ? `<a class="button small" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Abrir link</a>` : ""}
          <div class="admin-only admin-row compact">
            <label>Link externo
              <input type="url" value="${escapeHtml(link)}" data-portfolio-url="${artist.id}" data-item-id="${item.id}" placeholder="https://...">
            </label>
            <button class="button small" type="button" data-remove-portfolio-item="${artist.id}" data-item-id="${item.id}">Remover obra</button>
          </div>
        </div>
      </article>
    `;
  }

  function linkItemCard(artist, item, index) {
    const imageStyle = item.image ? ` style="background-image:url('${item.image}')"` : "";
    const title = item.title || `Link ${index + 1}`;
    const description = item.description || "Descrição editável do link, rede ou referência.";
    const url = item.url || "";
    return `
      <article class="link-tile" data-link-item="${item.id}" data-artist-id="${artist.id}">
        <label class="link-image"${imageStyle}>
          <span>${item.image ? "" : "Imagem"}</span>
          <input class="admin-only" type="file" accept="image/*" data-link-image="${artist.id}" data-item-id="${item.id}" aria-label="Enviar imagem do link ${escapeHtml(title)}">
        </label>
        <div class="link-copy">
          <h3 data-link-item-field="title" data-artist-id="${artist.id}" data-item-id="${item.id}">${escapeHtml(title)}</h3>
          <p data-rich data-link-item-field="description" data-artist-id="${artist.id}" data-item-id="${item.id}">${description}</p>
          ${url ? `<a class="button small" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Acessar</a>` : ""}
          <div class="admin-only admin-row compact">
            <label>URL
              <input type="url" value="${escapeHtml(url)}" data-link-url="${artist.id}" data-item-id="${item.id}" placeholder="https://...">
            </label>
            <button class="button small" type="button" data-remove-link-item="${artist.id}" data-item-id="${item.id}">Remover link</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderArtistModalPanels(artist) {
    normalizeArtistAssets(artist);
    const modal = document.getElementById("artist-modal");
    if (!modal) return;
    modal.dataset.artistId = artist.id;

    const bioPanel = modal.querySelector('[data-panel="bio"]');
    const portfolioPanel = modal.querySelector('[data-panel="portfolio"]');
    const linksPanel = modal.querySelector('[data-panel="links"]');
    const contactPanel = modal.querySelector('[data-panel="contact"]');

    bioPanel.innerHTML = renderArtistRichBlock(artist, "bio", "biografia");
    portfolioPanel.innerHTML = `
      ${renderArtistRichBlock(artist, "portfolio", "introdução do portfólio")}
      <div class="portfolio-masonry">
        ${artist.portfolioItems.map((item, index) => portfolioItemCard(artist, item, index)).join("") || '<div class="empty-state">Portfólio em construção.</div>'}
      </div>
      <div class="admin-only admin-row">
        <button class="button primary" type="button" data-add-portfolio-item="${artist.id}">Adicionar obra ao portfólio</button>
      </div>
    `;
    linksPanel.innerHTML = `
      ${renderArtistRichBlock(artist, "links", "redes e links")}
      <div class="link-gallery">
        ${artist.linkItems.map((item, index) => linkItemCard(artist, item, index)).join("") || '<div class="empty-state">Redes e links em organização.</div>'}
      </div>
      <div class="admin-only admin-row">
        <button class="button primary" type="button" data-add-link-item="${artist.id}">Adicionar rede, link ou imagem</button>
      </div>
    `;
    contactPanel.innerHTML = `
      ${renderArtistRichBlock(artist, "contact", "observações de contato")}
      <div class="contact-board">
        <article>
          <span>Email</span>
          ${artist.contactInfo.email ? `<a href="mailto:${escapeHtml(artist.contactInfo.email)}">${escapeHtml(artist.contactInfo.email)}</a>` : "<strong>Email ainda não informado</strong>"}
        </article>
        <article>
          <span>Contato</span>
          <strong>${escapeHtml(artist.contactInfo.phone || "Contato ainda não informado")}</strong>
        </article>
        <article>
          <span>Link principal</span>
          ${artist.contactInfo.link ? `<a href="${escapeHtml(artist.contactInfo.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(artist.contactInfo.link)}</a>` : "<strong>Link ainda não informado</strong>"}
        </article>
      </div>
      <div class="admin-only admin-row contact-admin">
        <label>Email
          <input type="email" value="${escapeHtml(artist.contactInfo.email)}" data-contact-field="email" data-artist-id="${artist.id}" placeholder="nome@email.com">
        </label>
        <label>Contato / telefone / WhatsApp
          <input type="text" value="${escapeHtml(artist.contactInfo.phone)}" data-contact-field="phone" data-artist-id="${artist.id}" placeholder="(00) 00000-0000">
        </label>
        <label>Link principal
          <input type="url" value="${escapeHtml(artist.contactInfo.link)}" data-contact-field="link" data-artist-id="${artist.id}" placeholder="https://...">
        </label>
      </div>
    `;
  }

  function openArtist(id) {
    ensureArtistModal();
    const found = findArtist(id);
    if (!found) return; // sem fallback: id inválido não abre artista algum
    const artist = normalizeArtistAssets(found);
    // Artista oculto não abre para visitante anônimo (falha segura).
    if (artist.published === false && !isOwnerEditing()) return;
    document.getElementById("artist-modal-title").textContent = artist.name;
    renderArtistModalPanels(artist);
    setAdminEditing(document.body.classList.contains("admin-mode"));
    applyEditableContent();
    applySavedStyles(document.getElementById("artist-modal"));
    openModal("artist-modal");
  }

  function renderVideo(episodeId) {
    const data = episodeEmbeds()[episodeId] || {};
    const box = document.querySelector(`[data-video-box="${episodeId}"]`);
    if (!box) return;
    const videoEnabled = data.videoEnabled !== false;
    if (!videoEnabled && !isOwnerEditing()) {
      box.classList.remove("has-video", "has-thumbnail", "is-empty");
      box.style.backgroundImage = "";
      box.style.display = "none";
      return;
    }
    box.style.display = "";
    const id = youtubeId(data.youtube);
    box.classList.remove("has-video", "has-thumbnail", "is-empty");
    box.style.backgroundImage = "";
    box.style.backgroundSize = "";
    box.style.backgroundPosition = "";
    if (id) {
      box.classList.add("has-video");
      box.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}" title="Vídeo do episódio" allowfullscreen></iframe>`;
    } else if (data.thumbnail) {
      box.classList.add("has-thumbnail");
      box.innerHTML = "";
      box.style.backgroundImage = `url('${data.thumbnail}')`;
      box.style.backgroundSize = "cover";
      box.style.backgroundPosition = "center";
    } else {
      box.classList.add("is-empty");
      box.innerHTML = `<p>${isOwnerEditing() ? "Adicione um link do YouTube ou uma thumbnail no modo administrador." : "Vídeo em preparação para publicação."}</p>`;
    }
  }

  function renderAudio(episodeId) {
    const data = episodeEmbeds()[episodeId] || {};
    const box = document.querySelector(`[data-audio-box="${episodeId}"]`);
    if (!box) return;
    const spotify = spotifyEmbed(data.spotify);
    box.classList.remove("has-spotify", "has-audio-file", "is-empty");
    if (spotify) {
      box.classList.add("has-spotify");
      box.innerHTML = `<iframe src="${spotify}" title="Player Spotify" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
    } else if (data.mp3) {
      box.classList.add("has-audio-file");
      box.innerHTML = `<audio controls src="${data.mp3}"></audio>`;
    } else {
      box.classList.add("is-empty");
      box.innerHTML = `<p>${isOwnerEditing() ? "Adicione um link do Spotify ou envie um MP3 no modo administrador." : "Player em preparação para publicação."}</p>`;
    }
  }

  function renderEpisodeCover(episodeId) {
    const episode = episodes().find((item) => item.id === episodeId);
    const cover = document.querySelector(`[data-episode-cover="${episodeId}"]`);
    if (!episode || !cover) return;
    const thumbnail = episodeEmbeds()[episodeId]?.thumbnail;
    if (thumbnail) {
      cover.style.backgroundImage = `url('${thumbnail}')`;
      cover.innerHTML = "";
    } else {
      cover.style.backgroundImage = "";
      cover.innerHTML = `
        <div class="episode-cover-logo">PQ<br>OQ</div>
        <div class="episode-cover-code">${episode.code}</div>
        <div class="episode-cover-name">${escapeHtml(episode.title)}</div>
      `;
    }
  }

  function platformLinks(episode) {
    const embeds = episodeEmbeds()[episode.id] || {};
    const links = [
      { key: "rss", label: "RSS", href: episode.sourceUrl || "/episodios" },
      { key: "spotify", label: "Spotify", href: embeds.spotify || episode.sourceUrl || "/episodios" },
      { key: "youtube", label: "YouTube", href: embeds.youtube || episode.sourceUrl || "/episodios" }
    ];
    return links.map((link) => `<a class="platform-chip" data-editable="episode.${episode.id}.platform.${link.key}" href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${link.label}</a>`).join("");
  }

  /** Chips a partir de pares {label, href} salvos no /pqoqadmin. */
  function customLinkChips(pairs) {
    if (!Array.isArray(pairs)) return "";
    return pairs
      .filter((pair) => pair && pair.href)
      .map((pair) => `<a class="platform-chip" href="${escapeHtml(pair.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(pair.label || pair.href)}</a>`)
      .join("");
  }

  /** Tags simples a partir de array de strings. */
  function tagChips(tags) {
    if (!Array.isArray(tags) || !tags.length) return "";
    return `<div class="tag-row">${tags
      .filter(Boolean)
      .map((tag) => `<span class="tag-chip">${escapeHtml(String(tag))}</span>`)
      .join("")}</div>`;
  }

  function renderEpisodePage() {
    const container = document.querySelector("[data-render-episode-page]");
    if (!container) return;
    const episodeId = currentEpisodeId();
    const found = episodes().find((item) => item.id === episodeId);
    // Episódio oculto: indisponível para visitante, visível para editor.
    if (found && found.published === false && !isOwnerEditing()) {
      container.innerHTML = '<div class="empty-state">Episódio indisponível. <a href="/episodios">Ver todos os episódios</a>.</div>';
      return;
    }
    const visible = episodes().filter((item) => isOwnerEditing() || item.published !== false);
    const episode = found || visible[0];
    if (!episode) {
      container.innerHTML = '<div class="empty-state">Nenhum episódio cadastrado ainda.</div>';
      return;
    }
    const artist = resolveEpisodeArtist(episode);
    const isEp00 = isEpisodeZeroLegacy(episode);
    const embeds = episodeEmbeds()[episode.id] || {};
    document.title = `PQOQ Criamos - ${episode.code} - ${episode.title}`;
    container.innerHTML = `
      <div class="episode-page-hero">
        <div class="episode-page-cover-column">
          <a class="button small episode-back-link" href="/episodios">← Voltar aos episódios</a>
          <div class="episode-cover" data-episode-cover="${episode.id}"${episodeCoverStyle(episode)}></div>
          <div class="meta episode-cover-meta" data-editable="episode.${episode.id}.meta">${episode.code} · ${episode.date} · ${episode.duration}</div>
          <div class="admin-only admin-row">
            <label>Capa / thumbnail do episódio
              <input type="file" accept="image/*" data-episode-file="${episode.id}" data-file-field="thumbnail">
            </label>
          </div>
        </div>
        <div class="episode-page-media-column">
          <div class="episode-title-pill">
            <h1 class="page-title" data-editable="episode.${episode.id}.title">${episode.code} - ${episode.title}</h1>
          </div>
          <div class="embed-box episode-video-box" data-video-box="${episode.id}"></div>
          <div class="admin-only admin-row episode-video-admin">
            <label>Link do YouTube
              <input type="url" value="${escapeHtml(embeds.youtube || "")}" data-episode-embed="${episode.id}" data-embed-field="youtube" placeholder="https://www.youtube.com/watch?v=...">
            </label>
            <label>Link original / página anterior
              <input type="url" value="${escapeHtml(episode.sourceUrl || "")}" data-episode-source="${episode.id}" placeholder="https://...">
            </label>
          </div>
        </div>
      </div>

      <div class="episode-player-block">
        <div class="audio-box episode-audio" data-audio-box="${episode.id}"></div>
        <div class="admin-only admin-row episode-admin-grid">
          <label>Link do Spotify
            <input type="url" value="${escapeHtml(embeds.spotify || "")}" data-episode-embed="${episode.id}" data-embed-field="spotify" placeholder="https://open.spotify.com/episode/...">
          </label>
          <label>Arquivo MP3
            <input type="file" accept="audio/*" data-episode-file="${episode.id}" data-file-field="mp3">
          </label>
        </div>
      </div>

      <div class="episode-artist-panel">
        <h2 class="lettered">${escapeHtml(episode.participantTitle || `Sobre ${artist?.name || episode.artist || ""}`)}</h2>
        ${participantPhotosMarkup(episode, artist)}
        <p data-rich data-episode-participant-about="${episode.id}">${episode.participantAbout || (artist ? artist.bio : "") || "Informação editável sobre o participante deste episódio."}</p>
        ${episode.participantBio ? `<p class="episode-participant-bio">${episode.participantBio}</p>` : ""}
        ${tagChips(episode.participantTags)}
        ${customLinkChips(episode.participantLinks) ? `<div class="platform-row episode-participant-links">${customLinkChips(episode.participantLinks)}</div>` : ""}
        <div class="artist-actions">
          ${
            isEp00
              ? `<a class="button primary small" href="/sobre">Conhecer os anfitriões</a>`
              : artist
                ? `<button class="button primary small" type="button" data-open-artist="${escapeHtml(artist.id)}">Abrir acervo do artista</button>`
                : ""
          }
          <a class="button small" href="/artistas">Página Artistas</a>
        </div>
        <div class="platform-row episode-platform-row">${platformLinks(episode)}${customLinkChips(episode.links)}</div>
      </div>
    `;
    renderEpisodeCover(episode.id);
    renderAudio(episode.id);
    renderVideo(episode.id);
    setAdminEditing(document.body.classList.contains("admin-mode"));
    applyEditableContent();
    applySavedStyles(container);
  }

  function openEpisode(id) {
    ensureEpisodeModal();
    const episode = episodes().find((item) => item.id === id);
    if (!episode) return;
    const artist = resolveEpisodeArtist(episode);
    const embeds = episodeEmbeds()[id] || {};
    document.getElementById("episode-modal-title").textContent = `${episode.code} - ${episode.title}`;
    document.getElementById("episode-modal-body").innerHTML = `
      <div class="episode-detail-grid">
        <div>
          <div class="embed-box" data-video-box="${id}"></div>
          <div class="admin-only admin-row">
            <label>Link do YouTube
              <input type="url" value="${embeds.youtube || ""}" data-episode-embed="${id}" data-embed-field="youtube" placeholder="https://www.youtube.com/watch?v=...">
            </label>
            <label>Thumbnail do vídeo
              <input type="file" accept="image/*" data-episode-file="${id}" data-file-field="thumbnail">
            </label>
          </div>
        </div>
        <div>
          <div class="meta">${episode.date} · ${episode.duration}</div>
          <p data-rich data-episode-description="${id}">${episode.description}</p>
          <div class="audio-box" data-audio-box="${id}"></div>
          <div class="admin-only admin-row">
            <label>Link do Spotify
              <input type="url" value="${embeds.spotify || ""}" data-episode-embed="${id}" data-embed-field="spotify" placeholder="https://open.spotify.com/episode/...">
            </label>
            <label>Arquivo MP3
              <input type="file" accept="audio/*" data-episode-file="${id}" data-file-field="mp3">
            </label>
          </div>
          ${
            artist
              ? `<div class="card" style="margin-top:16px">
            <h3>Biografia do artista</h3>
            <p data-rich data-episode-artist-bio="${escapeHtml(artist.id)}">${artist.bio || ""}</p>
            <div class="artist-actions">
              <button class="button primary small" type="button" data-open-artist="${escapeHtml(artist.id)}">Ir para Acervo</button>
              <a class="button small" href="/artistas">Página Artistas</a>
            </div>
          </div>`
              : ""
          }
        </div>
      </div>
    `;
    renderVideo(id);
    renderAudio(id);
    setAdminEditing(document.body.classList.contains("admin-mode"));
    applyEditableContent();
    applySavedStyles(document.getElementById("episode-modal"));
    openModal("episode-modal");
  }

  function updateEpisodeEmbed(input) {
    const episodeId = input.dataset.episodeEmbed;
    const field = input.dataset.embedField;
    const data = episodeEmbeds();
    data[episodeId] = data[episodeId] || {};
    data[episodeId][field] = input.value;
    saveEpisodeEmbeds(data);
    renderVideo(episodeId);
    renderAudio(episodeId);
  }

  function updateEpisodeFile(input) {
    const episodeId = input.dataset.episodeFile;
    const field = input.dataset.fileField;
    const file = input.files?.[0];
    if (!file) return;
    const sub = field === "mp3" ? "audio" : "thumbnails";
    input.disabled = true;
    uploadEditorMedia(file, `episodes/${episodeId}/${sub}`)
      .then(({ url }) => {
        const data = episodeEmbeds();
        data[episodeId] = data[episodeId] || {};
        data[episodeId][field] = url;
        saveEpisodeEmbeds(data);
        renderVideo(episodeId);
        renderAudio(episodeId);
        renderEpisodeCover(episodeId);
      })
      .catch(() => {})
      .finally(() => {
        input.disabled = false;
      });
  }

  function updateEpisodeSource(input) {
    const episodeId = input.dataset.episodeSource;
    const list = episodes();
    const episode = list.find((item) => item.id === episodeId);
    if (!episode) return;
    episode.sourceUrl = input.value.trim();
    saveEpisodes(list);
  }

  function editableTextNodes() {
    return Array.from(document.querySelectorAll(
      "[data-rich], h1[data-editable], h2[data-editable], h3[data-editable], p[data-editable], a[data-editable], div[data-editable].pill, .home-latest-title[data-editable], [data-artist-field], [data-portfolio-field], [data-link-item-field]"
    ));
  }

  function ensureTextKeys() {
    editableTextNodes().forEach((element, index) => {
      if (!element.dataset.textKey) {
        if (element.dataset.episodeParticipantAbout) {
          element.dataset.textKey = `episode:${element.dataset.episodeParticipantAbout}:participant-about`;
          return;
        }
        if (element.dataset.episodeArtistBio) {
          element.dataset.textKey = `episode-artist:${element.dataset.episodeArtistBio}:bio`;
          return;
        }
        if (element.dataset.episodeDescription) {
          element.dataset.textKey = `episode:${element.dataset.episodeDescription}:description`;
          return;
        }
        const module = element.closest("[data-editable]")?.dataset.editable || element.closest("[data-artist-id]")?.dataset.artistId || document.body.dataset.page || "page";
        const own = element.dataset.editable || element.dataset.artistField || element.dataset.rich || element.tagName.toLowerCase();
        element.dataset.textKey = `${module}:${own}:${index}`;
      }
    });
  }

  function setAdminEditing(enabled) {
    ensureOwnerBar();
    document.body.classList.toggle("admin-mode", enabled);
    if (!enabled) document.body.classList.remove("public-preview");
    ensureStylePopover();
    ensureTextKeys();
    editableTextNodes().forEach((element) => {
      element.contentEditable = enabled && !document.body.classList.contains("public-preview") ? "true" : "false";
      element.spellcheck = true;
    });
    refreshStyleTargets(enabled && !document.body.classList.contains("public-preview"));
    applySavedStyles();
    if (!enabled || document.body.classList.contains("public-preview")) closeStylePopover();
    setOwnerPreview(enabled ? document.body.classList.contains("public-preview") : false);
    syncUploadControls();
  }

  // Stable content key for an element that carries data-editable. The legacy
  // composite key (module:own:index) depends on DOM order, so it cannot be
  // written from /pqoqadmin. Elements with data-editable also read/write this
  // stable key, which takes precedence over the legacy one.
  function stableTextKey(element) {
    return element.dataset.editable || "";
  }

  function saveEditableContent(target) {
    ensureTextKeys();
    const key = target.dataset.textKey;
    if (!key) return;
    const data = getState("editable-content", {});
    const html = sanitizeEditableHtml(target.innerHTML);
    data[key] = html;
    const stable = stableTextKey(target);
    if (stable) data[stable] = html;
    setState("editable-content", data);
  }

  function applyEditableContent() {
    ensureTextKeys();
    const data = getState("editable-content", {});
    editableTextNodes().forEach((element) => {
      const key = element.dataset.textKey;
      const stable = stableTextKey(element);
      const value = (stable && data[stable]) || (key && data[key]) || "";
      if (value) element.innerHTML = sanitizeEditableHtml(value);
    });
  }

  function updateArtistFromCard(card) {
    const id = card.dataset.artistId;
    const list = artists();
    const artist = list.find((item) => item.id === id);
    if (!artist) return;
    artist.meta = card.querySelector('[data-artist-field="meta"]')?.textContent.trim() || artist.meta;
    artist.name = card.querySelector('[data-artist-field="name"]')?.textContent.trim() || artist.name;
    artist.description = card.querySelector('[data-artist-field="description"]')?.textContent.trim() || artist.description;
    saveArtists(list);
  }

  function updateArtistModalField(target) {
    const id = target.dataset.artistId;
    const field = target.dataset.artistModalField;
    const list = artists();
    const artist = list.find((item) => item.id === id);
    if (!artist || !field) return;
    normalizeArtistAssets(artist);
    artist[field] = target.innerHTML;
    if (field === "contact") artist.contactInfo.note = target.innerHTML;
    saveArtists(list);
  }

  function updatePortfolioField(target) {
    const artistId = target.dataset.artistId;
    const itemId = target.dataset.itemId;
    const field = target.dataset.portfolioField;
    saveArtistMutation(artistId, (artist) => {
      const item = artist.portfolioItems.find((entry) => entry.id === itemId);
      if (!item || !field) return;
      item[field] = field === "caption" ? target.innerHTML : target.textContent.trim();
    });
  }

  function updatePortfolioUrl(input) {
    const artistId = input.dataset.portfolioUrl;
    const itemId = input.dataset.itemId;
    saveArtistMutation(artistId, (artist) => {
      const item = artist.portfolioItems.find((entry) => entry.id === itemId);
      if (item) item.url = input.value.trim();
    });
  }

  function updateLinkItemField(target) {
    const artistId = target.dataset.artistId;
    const itemId = target.dataset.itemId;
    const field = target.dataset.linkItemField;
    saveArtistMutation(artistId, (artist) => {
      const item = artist.linkItems.find((entry) => entry.id === itemId);
      if (!item || !field) return;
      item[field] = field === "description" ? target.innerHTML : target.textContent.trim();
    });
  }

  function updateLinkUrl(input) {
    const artistId = input.dataset.linkUrl;
    const itemId = input.dataset.itemId;
    saveArtistMutation(artistId, (artist) => {
      const item = artist.linkItems.find((entry) => entry.id === itemId);
      if (item) item.url = input.value.trim();
    });
  }

  function updateContactField(input) {
    const artistId = input.dataset.artistId;
    const field = input.dataset.contactField;
    saveArtistMutation(artistId, (artist) => {
      artist.contactInfo[field] = input.value.trim();
    });
  }

  function updateEpisodeText(target) {
    const episodeId = target.dataset.episodeDescription;
    if (!episodeId) return;
    const list = episodes();
    const episode = list.find((item) => item.id === episodeId);
    if (!episode) return;
    episode.description = target.innerHTML;
    saveEpisodes(list);
  }

  function updateEpisodeArtistBio(target) {
    const artistId = target.dataset.episodeArtistBio;
    if (!artistId) return;
    const list = artists();
    const artist = list.find((item) => item.id === artistId);
    if (!artist) return;
    artist.bio = target.innerHTML;
    saveArtists(list);
  }

  function updateEpisodeParticipantAbout(target) {
    const episodeId = target.dataset.episodeParticipantAbout;
    if (!episodeId) return;
    const list = episodes();
    const episode = list.find((item) => item.id === episodeId);
    if (!episode) return;
    episode.participantAbout = target.innerHTML;
    saveEpisodes(list);
  }

  function handleImageUpload(input) {
    if (!canUseEditorialUpload()) return;
    const id = input.dataset.artistImage;
    const file = input.files?.[0];
    if (!id || !file) return;
    input.disabled = true;
    uploadEditorMedia(file, `artists/${id}/profile`)
      .then(({ url }) => {
        const list = artists();
        const artist = list.find((item) => item.id === id);
        if (!artist) return;
        artist.image = url;
        saveArtists(list);
        renderArtists();
        setAdminEditing(document.body.classList.contains("admin-mode"));
      })
      .catch(() => {})
      .finally(() => {
        input.disabled = false;
      });
  }

  function refreshOpenArtistModal(artistId, tabName = activeArtistTab()) {
    const artist = findArtist(artistId);
    if (!artist) return;
    renderArtistModalPanels(normalizeArtistAssets(artist));
    restoreArtistTab(tabName);
    setAdminEditing(document.body.classList.contains("admin-mode"));
    applyEditableContent();
    applySavedStyles(document.getElementById("artist-modal"));
  }

  function addPortfolioItem(artistId) {
    saveArtistMutation(artistId, (artist) => {
      artist.portfolioItems.unshift({
        id: assetId("obra"),
        title: "Nova obra",
        caption: "Legenda editável da obra.",
        url: "",
        image: ""
      });
    });
    refreshOpenArtistModal(artistId, "portfolio");
  }

  function removePortfolioItem(artistId, itemId) {
    saveArtistMutation(artistId, (artist) => {
      artist.portfolioItems = artist.portfolioItems.filter((item) => item.id !== itemId);
    });
    refreshOpenArtistModal(artistId, "portfolio");
  }

  function handlePortfolioImageUpload(input) {
    if (!canUseEditorialUpload()) return;
    const artistId = input.dataset.portfolioImage;
    const itemId = input.dataset.itemId;
    const file = input.files?.[0];
    if (!artistId || !itemId || !file) return;
    input.disabled = true;
    uploadEditorMedia(file, `artists/${artistId}/portfolio`)
      .then(({ url }) => {
        saveArtistMutation(artistId, (artist) => {
          const item = artist.portfolioItems.find((entry) => entry.id === itemId);
          if (item) item.image = url;
        });
        refreshOpenArtistModal(artistId, "portfolio");
      })
      .catch(() => {})
      .finally(() => {
        input.disabled = false;
      });
  }

  function addLinkItem(artistId) {
    saveArtistMutation(artistId, (artist) => {
      artist.linkItems.unshift({
        id: assetId("link"),
        title: "Novo link",
        description: "Descrição editável do link, rede ou referência.",
        url: "",
        image: ""
      });
    });
    refreshOpenArtistModal(artistId, "links");
  }

  function removeLinkItem(artistId, itemId) {
    saveArtistMutation(artistId, (artist) => {
      artist.linkItems = artist.linkItems.filter((item) => item.id !== itemId);
    });
    refreshOpenArtistModal(artistId, "links");
  }

  function handleLinkImageUpload(input) {
    if (!canUseEditorialUpload()) return;
    const artistId = input.dataset.linkImage;
    const itemId = input.dataset.itemId;
    const file = input.files?.[0];
    if (!artistId || !itemId || !file) return;
    input.disabled = true;
    uploadEditorMedia(file, `artists/${artistId}/links`)
      .then(({ url }) => {
        saveArtistMutation(artistId, (artist) => {
          const item = artist.linkItems.find((entry) => entry.id === itemId);
          if (item) item.image = url;
        });
        refreshOpenArtistModal(artistId, "links");
      })
      .catch(() => {})
      .finally(() => {
        input.disabled = false;
      });
  }

  function addArtist() {
    const list = artists();
    const count = list.length + 1;
    list.push({
      id: `artista-${Date.now()}`,
      name: `Novo artista ${count}`,
      meta: "Linguagem artística",
      description: "Descrição breve do artista.",
      bio: "Biografia editável do artista.",
      portfolio: "Portfólio editável.",
      links: "Redes e links editáveis.",
      contact: "Contato editável.",
      portfolioItems: [],
      linkItems: [],
      contactInfo: {
        email: "",
        phone: "",
        link: "",
        note: "Contato editável."
      }
    });
    saveArtists(list);
    renderArtists();
    setAdminEditing(true);
  }

  function removeArtist(id) {
    saveArtists(artists().filter((artist) => artist.id !== id));
    renderArtists();
    setAdminEditing(document.body.classList.contains("admin-mode"));
  }

  function addEpisode() {
    const list = episodes();
    const next = list.length + 1;
    list.unshift({
      id: `episodio-${Date.now()}`,
      code: `NOVO${next}`,
      title: "Novo episódio",
      artistId: artists()[0]?.id || "joab3",
      artist: "Artista",
      date: "Data",
      duration: "Duração",
      description: "Descrição editável do episódio.",
      sourceUrl: ""
    });
    saveEpisodes(list);
    renderEpisodeList();
    setAdminEditing(true);
  }

  function removeEpisode(id) {
    saveEpisodes(episodes().filter((episode) => episode.id !== id));
    renderEpisodeList();
  }

  function initAdmin() {
    const login = document.getElementById("admin-login");
    const logout = document.getElementById("admin-logout");
    const reset = document.getElementById("admin-reset");
    const message = document.getElementById("admin-message");

    // Expose the edit-mode toggle so the real Supabase auth bridge can drive it.
    window.PQOQLegacySetEditing = setAdminEditing;

    // When the real authentication bridge is present, it owns Entrar/Sair.
    // Skip the placeholder handlers to avoid double-binding clicks.
    if (!window.PQOQ_AUTH) {
    login?.addEventListener("click", () => {
      const email = document.getElementById("admin-email")?.value.trim();
      const password = document.getElementById("admin-password")?.value;
      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        if (message) message.textContent = "A autenticação segura será conectada na etapa Lovable.";
        return;
      }
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        setAdminEditing(true);
        if (message) message.textContent = "Modo administrador ativo.";
      } else if (message) {
        message.textContent = "Login ou senha incorretos.";
      }
    });

    logout?.addEventListener("click", () => {
      setAdminEditing(false);
      if (message) message.textContent = "Modo administrador desativado.";
    });
    }

    reset?.addEventListener("click", () => {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(STORAGE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
      window.location.reload();
    });
  }

  function initFormatToolbar() {
    let active = null;
    document.addEventListener("focusin", (event) => {
      if (event.target.matches("[contenteditable='true']")) active = event.target;
    });
    document.querySelectorAll("[data-format-command]").forEach((button) => {
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        if (!active) return;
        active.focus();
        document.execCommand(button.dataset.formatCommand, false, button.dataset.formatValue || null);
        saveEditableContent(active);
      });
    });
  }

  function initEvents() {
    // Capture-phase guard: block any attempt to open a file picker (by clicking
    // an image, an avatar label, or a file input) unless an editor is editing.
    document.addEventListener(
      "click",
      (event) => {
        if (canUseEditorialUpload()) return;
        const target = event.target;
        if (!target || typeof target.closest !== "function") return;
        // Never interfere with real interactive controls (links, buttons).
        if (target.closest('button, a, [data-open-lightbox], [role="button"]')) {
          if (!target.closest('input[type="file"]')) return;
        }
        const inUploadLabel = target.closest(
          'input[type="file"], .artist-avatar, .portfolio-image, .link-image, label[data-upload]',
        );
        if (inUploadLabel) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true,
    );
    syncUploadControls();
    document.addEventListener("click", (event) => {
      handleStylePopoverClick(event);
      if (styleSelectionFromClick(event)) return;

      const episodeLinkCard = event.target.closest("[data-episode-link]");
      if (
        episodeLinkCard &&
        (!document.body.classList.contains("admin-mode") || document.body.classList.contains("public-preview")) &&
        !event.target.closest("a, button, input, textarea, select, label")
      ) {
        window.location.href = episodeLinkCard.dataset.episodeLink;
        return;
      }

      const ownerViewButton = event.target.closest("[data-owner-view]");
      if (ownerViewButton) {
        setOwnerPreview(ownerViewButton.dataset.ownerView === "preview");
        return;
      }

      const episodeButton = event.target.closest("[data-open-episode]");
      if (episodeButton) openEpisode(episodeButton.dataset.openEpisode);

      const artistButton = event.target.closest("[data-open-artist]");
      if (artistButton) openArtist(artistButton.dataset.openArtist);

      if (event.target.closest("[data-close-modal]") || event.target.classList.contains("modal")) closeModals();

      const tab = event.target.closest("[data-tab]");
      if (tab) {
        const modal = tab.closest(".modal");
        modal.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
        modal.querySelectorAll(".tab-panel").forEach((item) => item.classList.remove("active"));
        tab.classList.add("active");
        modal.querySelector(`[data-panel="${tab.dataset.tab}"]`)?.classList.add("active");
      }

      const removeArtistButton = event.target.closest("[data-remove-artist]");
      if (removeArtistButton) removeArtist(removeArtistButton.dataset.removeArtist);

      const removeEpisodeButton = event.target.closest("[data-remove-episode]");
      if (removeEpisodeButton) removeEpisode(removeEpisodeButton.dataset.removeEpisode);

      const addPortfolioButton = event.target.closest("[data-add-portfolio-item]");
      if (addPortfolioButton) addPortfolioItem(addPortfolioButton.dataset.addPortfolioItem);

      const removePortfolioButton = event.target.closest("[data-remove-portfolio-item]");
      if (removePortfolioButton) removePortfolioItem(removePortfolioButton.dataset.removePortfolioItem, removePortfolioButton.dataset.itemId);

      const addLinkButton = event.target.closest("[data-add-link-item]");
      if (addLinkButton) addLinkItem(addLinkButton.dataset.addLinkItem);

      const removeLinkButton = event.target.closest("[data-remove-link-item]");
      if (removeLinkButton) removeLinkItem(removeLinkButton.dataset.removeLinkItem, removeLinkButton.dataset.itemId);
    });

    document.addEventListener("input", (event) => {
      handleStylePopoverInput(event);
      if (event.target.matches("[data-editable], [data-rich]")) saveEditableContent(event.target);
    });

    document.addEventListener("paste", handleEditablePaste, true);

    document.addEventListener("input", (event) => {
      if (event.target.matches("[data-artist-field]")) updateArtistFromCard(event.target.closest(".artist-card"));
      if (event.target.matches("[data-artist-modal-field]")) updateArtistModalField(event.target);
      if (event.target.matches("[data-portfolio-field]")) updatePortfolioField(event.target);
      if (event.target.matches("[data-portfolio-url]")) updatePortfolioUrl(event.target);
      if (event.target.matches("[data-link-item-field]")) updateLinkItemField(event.target);
      if (event.target.matches("[data-link-url]")) updateLinkUrl(event.target);
      if (event.target.matches("[data-contact-field]")) updateContactField(event.target);
      if (event.target.matches("[data-episode-description]")) updateEpisodeText(event.target);
      if (event.target.matches("[data-episode-participant-about]")) updateEpisodeParticipantAbout(event.target);
      if (event.target.matches("[data-episode-artist-bio]")) updateEpisodeArtistBio(event.target);
      if (event.target.matches("[data-episode-embed]")) updateEpisodeEmbed(event.target);
      if (event.target.matches("[data-episode-source]")) updateEpisodeSource(event.target);
    });

    document.addEventListener("change", (event) => {
      handleStylePopoverInput(event);
      if (event.target.matches("[data-artist-image]")) handleImageUpload(event.target);
      if (event.target.matches("[data-portfolio-image]")) handlePortfolioImageUpload(event.target);
      if (event.target.matches("[data-link-image]")) handleLinkImageUpload(event.target);
      if (event.target.matches("[data-episode-file]")) updateEpisodeFile(event.target);
    });

    document.getElementById("artist-add")?.addEventListener("click", addArtist);
    document.getElementById("episode-add")?.addEventListener("click", addEpisode);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeStylePopover();
        closeModals();
      }
    });
  }

  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;
    setActiveNav();
    renderHomeEpisodes();
    renderEpisodeList();
    renderEpisodePage();
    renderArtists();
    ensureArtistModal();
    ensureEpisodeModal();
    ensureStylePopover();
    applyEditableContent();
    applySavedStyles();
    initAdmin();
    initFormatToolbar();
    initEvents();
  }

  if (typeof window !== "undefined") window.PQOQLegacyInit = init;
})();
