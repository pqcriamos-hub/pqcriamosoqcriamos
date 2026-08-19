(() => {
  const STORAGE_PREFIX = "pqoq-site:";
  const GALLERY_KEY = "gallery-cards";
  const PAGE_PHOTOS_KEY = "page-photos";
  const LINK_STATE_KEY = "link-state";
  const LAYOUT_STATE_KEY = "layout-state";
  const STYLE_POPOVER_POSITION_KEY = "style-popover-position";
  const GRID_UNIT_SELECTOR = ".layout-grid-overlay";

  // Phase 2: upload editorial media to Supabase Storage and return a URL.
  // Falls back to base64 only if the upload bridge is unavailable.
  function uploadEditorMedia(file, prefix) {
    // Hard guard: never allow public/anonymous visitors to upload or to write a
    // base64 fallback, even if a handler is somehow reached.
    if (!canUseEditorialUpload()) {
      return Promise.reject(new Error("upload-not-authorized"));
    }
    const media = window.PQOQ_MEDIA;
    if (media && typeof media.upload === "function") {
      return media.upload(file, prefix);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () =>
        resolve({ url: String(reader.result || ""), path: "" }),
      );
      reader.addEventListener("error", reject);
      reader.readAsDataURL(file);
    });
  }
  const MODULAR_SELECTOR = [
    "main .card",
    "main .button",
    "main .page-title",
    "main .pill",
    "main .intro-text",
    "main .home-episode",
    "main .episode-cover",
    "main .embed-box",
    "main .audio-box",
    "main .artist-avatar",
    "main .bio-photo",
    "main .episode-thumb",
    "main .section > h2",
    "main .section > h3",
    "main .section > p",
    "main .section > .meta",
    "main .portfolio-tile",
    "main [data-layout-key]",
    "main .card > h2",
    "main .card > h3",
    "main .card > p",
    "main .card > .meta",
    "main .card > .tag-list",
    "main .card > [data-rich]",
    "main .card > [data-editable]",
    "main .section-head h1",
    "main .section-head p",
    "main .gallery-thumb",
    "main .gallery-asset",
    "main .gallery-asset-image",
    "main .support-card-thumb",
    "main .episode-participant-photo",
    "main .lettered",
    "header .nav a"
  ].join(", ");

  // Containers que NUNCA devem ser arrastados diretamente (grupos grandes).
  const MODULAR_BLOCKED_SELECTOR = [
    "main",
    "main .section",
    ".page",
    ".grid",
    ".about-layout",
    ".support-grid",
    ".episode-grid",
    ".artist-grid",
    ".section-head",
    ".modal",
    ".modal-panel",
    ".style-popover",
    ".layout-dock",
    ".owner-bar",
    ".editor-panel"
  ].join(", ");

  // Controles que não podem iniciar arraste acidental.
  const MODULAR_IGNORE_SELECTOR =
    "input, textarea, select, .tag-edit-btn, .gallery-admin-controls, .admin-row, .admin-only, .close-modal, .gallery-more-toggle";

  let selectedModular = null;

  function isModularCandidate(element) {
    if (!element || element.nodeType !== 1) return false;
    if (!element.matches(MODULAR_SELECTOR)) return false;
    if (element.matches(MODULAR_BLOCKED_SELECTOR)) return false;
    if (element.closest(".modal, .style-popover, .layout-dock, .editor-panel, .owner-bar")) return false;
    return true;
  }

  // Regra principal: o alvo é o MENOR elemento modular válido sob o cursor.
  function resolveModularTarget(node) {
    let current = node && node.nodeType === 3 ? node.parentElement : node;
    while (current && current !== document.body) {
      if (isModularCandidate(current)) return current;
      current = current.parentElement;
    }
    return null;
  }

  function modularLabel(element) {
    if (!element) return "";
    const key = element.dataset.layoutKey;
    if (key) return key;
    if (element.matches(".bio-photo, .artist-avatar, .episode-thumb, .gallery-thumb, .support-card-thumb, .gallery-asset-image, img")) return "imagem";
    if (element.matches("h1, h2, h3, .page-title")) return `título “${(element.textContent || "").trim().slice(0, 28)}”`;
    if (element.matches(".button, a")) return "botão";
    if (element.matches(".tag-list")) return "tags";
    if (element.matches(".card")) return "card";
    return "texto";
  }

  function clearModularSelection() {
    if (selectedModular) selectedModular.classList.remove("is-modular-selected");
    selectedModular = null;
    syncLayoutDock();
  }

  function selectModular(element) {
    if (selectedModular === element) return;
    if (selectedModular) selectedModular.classList.remove("is-modular-selected");
    selectedModular = element;
    if (element) element.classList.add("is-modular-selected");
    syncLayoutDock();
  }

  const galleryDefaults = [
    {
      id: "gallery-recordings",
      slug: "gravacoes",
      meta: "Bastidores",
      title: "Gravacoes",
      description: "Registros do set, do Espaco Colaborar e da equipe em processo.",
      intro: "Use esta galeria para reunir making of, disposicao do set, montagem de luz, registros de ensaio, capturas da conversa e memoria de producao.",
      coverImage: "",
      published: true,
      sortOrder: 0,
      items: [
        { id: "recording-set", title: "Set de gravacao", caption: "Mesa, enquadramento, luz e atmosfera do episodio.", description: "", credit: "Bastidores", link: "", image: "", episode: "", date: "", location: "", tags: [], published: true, sortOrder: 0 },
        { id: "recording-process", title: "Processo de conversa", caption: "Trechos do encontro, anotacoes, roteiro e material de apoio.", description: "", credit: "Processo", link: "", image: "", episode: "", date: "", location: "", tags: [], published: true, sortOrder: 1 }
      ]
    },
    {
      id: "gallery-covers",
      slug: "capas",
      meta: "Identidade visual",
      title: "Capas",
      description: "Artes dos episodios, thumbnails e pecas graficas do projeto.",
      intro: "Aqui entram capas principais, thumbnails, pecas para redes, cartazes de circulacao e variacoes visuais de cada temporada.",
      coverImage: "",
      published: true,
      sortOrder: 1,
      items: [
        { id: "cover-main", title: "Capa do episodio", caption: "Arte principal usada no streaming, no feed e no arquivo do projeto.", description: "", credit: "Design", link: "", image: "", episode: "", date: "", location: "", tags: [], published: true, sortOrder: 0 },
        { id: "cover-social", title: "Peca para divulgacao", caption: "Recortes visuais para stories, cartazes, reels e posts de circulacao.", description: "", credit: "Rede", link: "", image: "", episode: "", date: "", location: "", tags: [], published: true, sortOrder: 1 }
      ]
    },
    {
      id: "gallery-works",
      slug: "obras",
      meta: "Acervo de artistas",
      title: "Obras",
      description: "Imagens, processos e fragmentos visuais ligados a cada convidado.",
      intro: "Organize obras, fragmentos, documentos, estudos, fotografias de processo e materiais enviados pelos artistas convidados.",
      coverImage: "",
      published: true,
      sortOrder: 2,
      items: [
        { id: "works-piece", title: "Obra principal", caption: "Imagem de destaque do artista ou do episodio relacionado.", description: "", credit: "Acervo", link: "", image: "", episode: "", date: "", location: "", tags: [], published: true, sortOrder: 0 },
        { id: "works-process", title: "Processo criativo", caption: "Rascunho, detalhe, textura, fragmento ou documento de processo.", description: "", credit: "Memoria", link: "", image: "", episode: "", date: "", location: "", tags: [], published: true, sortOrder: 1 }
      ]
    }
  ];

  let initialized = false;
  let observer = null;
  let enhanceQueued = false;
  let gridMode = false;
  let activeDrag = null;
  let popoverDrag = null;
  let activeGalleryId = null;
  let lightboxState = null;

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
    // Mirror to Supabase for shared/persistent content. The remote layer
    // (site-content-sync.ts) only persists whitelisted keys for authenticated
    // editors; everything else is a silent no-op. localStorage stays as cache.
    try {
      if (typeof window !== "undefined" && window.PQOQ_REMOTE && typeof window.PQOQ_REMOTE.save === "function") {
        window.PQOQ_REMOTE.save(key, value);
      }
    } catch {
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

  function isAdmin() {
    return document.body.classList.contains("admin-mode") && !document.body.classList.contains("public-preview");
  }

  // Single source of truth for upload permission (mirrors isAdmin). admin-mode
  // is only set after a verified editor/admin login; public-preview must be off.
  function canUseEditorialUpload() {
    return isAdmin();
  }

  function syncUploadControls() {
    const allow = canUseEditorialUpload();
    document.querySelectorAll('input[type="file"]').forEach((input) => {
      input.disabled = !allow;
      if (!allow) input.setAttribute("aria-hidden", "true");
      else input.removeAttribute("aria-hidden");
    });
  }

  function currentPage() {
    return document.body.dataset.page || "page";
  }

  function normalizeGalleryItem(item, index) {
    const tags = Array.isArray(item.tags)
      ? item.tags.map((t) => String(t).trim()).filter(Boolean)
      : item.tags
        ? String(item.tags).split(",").map((t) => t.trim()).filter(Boolean)
        : [];
    return {
      id: item.id || assetId(`gallery-item-${index + 1}`),
      title: item.title || `Item ${index + 1}`,
      caption: item.caption || "Legenda editavel do item da galeria.",
      description: item.description || "",
      credit: item.credit || "Acervo",
      link: item.link || "",
      image: item.image || "",
      episode: item.episode || "",
      date: item.date || "",
      location: item.location || "",
      tags,
      published: item.published !== false,
      sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : index
    };
  }

  function slugify(value) {
    return (
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "galeria"
    );
  }

  function galleryCards() {
    const list = getState(GALLERY_KEY, galleryDefaults);
    return list
      .map((card, index) => {
        const items = (Array.isArray(card.items) ? card.items.map(normalizeGalleryItem) : [])
          .sort((a, b) => a.sortOrder - b.sortOrder);
        return {
          id: card.id || `gallery-card-${index + 1}`,
          slug: card.slug || slugify(card.title || card.id || `galeria-${index + 1}`),
          meta: card.meta || "Nova categoria",
          title: card.title || `Nova galeria ${index + 1}`,
          description: card.description || "Descricao editavel da galeria.",
          intro: card.intro || "Apresentacao editavel da galeria.",
          coverImage: card.coverImage || "",
          published: card.published !== false,
          sortOrder: typeof card.sortOrder === "number" ? card.sortOrder : index,
          items
        };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function saveGalleryCards(list) {
    setState(GALLERY_KEY, list);
  }

  // Public visitors only see published galleries/items; editors see everything.
  function visibleCards() {
    const cards = galleryCards();
    return isAdmin() ? cards : cards.filter((card) => card.published);
  }

  function visibleItems(card) {
    return isAdmin() ? card.items : card.items.filter((item) => item.published);
  }

  function pagePhotos() {
    return getState(PAGE_PHOTOS_KEY, {});
  }

  function savePagePhotos(data) {
    setState(PAGE_PHOTOS_KEY, data);
  }

  function linkState() {
    return getState(LINK_STATE_KEY, {});
  }

  function saveLinkState(data) {
    setState(LINK_STATE_KEY, data);
  }

  function layoutState() {
    return getState(LAYOUT_STATE_KEY, {});
  }

  function saveLayoutState(data) {
    setState(LAYOUT_STATE_KEY, data);
  }

  function episodeEmbeds() {
    return getState("episode-embeds", {});
  }

  function saveEpisodeEmbeds(data) {
    setState("episode-embeds", data);
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

  function gridUnitPx() {
    let probe = document.querySelector(GRID_UNIT_SELECTOR);
    if (!probe) {
      probe = document.createElement("div");
      probe.className = "layout-grid-overlay";
      probe.style.visibility = "hidden";
      document.body.appendChild(probe);
    }
    const meter = document.createElement("div");
    meter.style.width = "1cm";
    meter.style.height = "1cm";
    meter.style.position = "absolute";
    probe.appendChild(meter);
    const px = meter.getBoundingClientRect().width || 37.795;
    meter.remove();
    return px;
  }

  function pxToCm(px) {
    return (px / 37.795).toFixed(1);
  }

  function queueEnhance() {
    if (enhanceQueued) return;
    enhanceQueued = true;
    requestAnimationFrame(() => {
      enhanceQueued = false;
      // Pause the observer while we mutate the DOM, otherwise enhancePage's own
      // innerHTML/style writes retrigger the observer -> infinite re-render loop
      // (which detaches buttons mid-click so "Abrir galeria" never fires).
      if (observer) observer.disconnect();
      try {
        enhancePage();
        syncUploadControls();
      } finally {
        if (observer) {
          observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
        }
      }
    });
  }

  function applySavedLinks() {
    const state = linkState();
    document.querySelectorAll("[data-link-editable]").forEach((anchor) => {
      const key = anchor.dataset.linkEditable;
      if (!key) return;
      const saved = state[key];
      if (saved?.href) anchor.setAttribute("href", saved.href);
    });
  }

  function ensureStylePopoverLinkField() {
    const popover = document.getElementById("style-popover");
    if (!popover || popover.querySelector("[data-style-link-editor]")) return;
    popover.insertAdjacentHTML("beforeend", `
      <div class="style-field style-link-field" data-style-link-editor hidden>
        <label for="style-link-href">Link do botao</label>
        <input id="style-link-href" type="url" data-style-link-href placeholder="https://...">
      </div>
    `);
    popover.querySelector("[data-style-link-href]")?.addEventListener("input", (event) => {
      const target = document.querySelector(".is-style-selected[data-link-editable]");
      if (!target) return;
      const key = target.dataset.linkEditable;
      if (!key) return;
      const value = event.target.value.trim();
      target.setAttribute("href", value || target.getAttribute("href") || "#");
      const state = linkState();
      state[key] = { ...(state[key] || {}), href: value };
      saveLinkState(state);
    });
  }

  function syncStylePopoverLinkField() {
    const field = document.querySelector("[data-style-link-editor]");
    const input = document.querySelector("[data-style-link-href]");
    if (!field || !input) return;
    const target = document.querySelector(".is-style-selected[data-link-editable]");
    if (!target || !isAdmin()) {
      field.hidden = true;
      return;
    }
    field.hidden = false;
    const key = target.dataset.linkEditable;
    const saved = key ? linkState()[key] : null;
    if (document.activeElement !== input) input.value = saved?.href || target.getAttribute("href") || "";
  }

  function applyPagePhotos() {
    const state = pagePhotos();
    document.querySelectorAll("[data-page-photo-box]").forEach((box) => {
      const key = box.dataset.pagePhotoBox;
      const image = state[key];
      box.style.backgroundImage = image ? `url("${image}")` : "";
      const label = box.querySelector("span");
      if (label) label.textContent = image ? "" : "Foto";
    });
  }

  function handlePagePhotoUpload(input) {
    if (!canUseEditorialUpload()) return;
    const key = input.dataset.pagePhoto;
    const file = input.files?.[0];
    if (!key || !file) return;
    input.disabled = true;
    uploadEditorMedia(file, `pages/${key}`)
      .then(({ url }) => {
        const state = pagePhotos();
        state[key] = url;
        savePagePhotos(state);
        applyPagePhotos();
      })
      .catch(() => {})
      .finally(() => {
        input.disabled = false;
      });
  }

  function galleryCardTemplate(card) {
    const coverStyle = card.coverImage ? ` style="background-image:url('${escapeHtml(card.coverImage)}')"` : "";
    const unpub = card.published ? "" : " is-unpublished";
    return `
      <article class="card gallery-card gallery-card-plus${unpub}" data-gallery-id="${card.id}">
        <button class="gallery-thumb gallery-card-open" type="button" data-open-gallery="${card.id}" data-layout-key="gallery.${card.id}.cover"${coverStyle}></button>
        <span class="gallery-status admin-only">${card.published ? "Publicada" : "Rascunho"}</span>
        <div class="meta" data-gallery-field="meta" data-layout-key="gallery.${card.id}.meta">${escapeHtml(card.meta)}</div>
        <h3 data-gallery-field="title" data-layout-key="gallery.${card.id}.title">${escapeHtml(card.title)}</h3>
        <p data-gallery-field="description" data-layout-key="gallery.${card.id}.description">${escapeHtml(card.description)}</p>
        <div class="artist-actions gallery-card-actions">
          <button class="button primary small" type="button" data-open-gallery="${card.id}" data-layout-key="gallery.${card.id}.button">Abrir galeria</button>
        </div>
        <div class="admin-only admin-row compact gallery-card-admin">
          <div class="gallery-admin-controls">
            <button class="button small" type="button" data-gallery-move="up" data-gallery-id="${card.id}" aria-label="Subir galeria">&uarr;</button>
            <button class="button small" type="button" data-gallery-move="down" data-gallery-id="${card.id}" aria-label="Descer galeria">&darr;</button>
            <button class="button small" type="button" data-toggle-gallery-publish="${card.id}">${card.published ? "Despublicar" : "Publicar"}</button>
            <button class="button small" type="button" data-remove-gallery="${card.id}">Remover</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderGalleryCards() {
    const container = document.querySelector("[data-render-gallery-list]");
    if (!container) return;
    const cards = visibleCards();
    container.innerHTML = cards.length
      ? cards.map(galleryCardTemplate).join("")
      : '<div class="empty-state">Nenhuma galeria publicada ainda.</div>';
  }

  function ensureGalleryModal() {
    if (document.getElementById("gallery-modal")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal gallery-modal" id="gallery-modal" aria-hidden="true">
        <div class="modal-panel gallery-modal-panel">
          <div class="modal-head">
            <h2 id="gallery-modal-title">ACERVO</h2>
            <button class="close-modal" type="button" data-close-modal>&times;</button>
          </div>
          <div class="modal-body" id="gallery-modal-body"></div>
        </div>
      </div>
    `);
  }

  function galleryItemTemplate(cardId, item) {
    const imageStyle = item.image ? ` style="background-image:url('${escapeHtml(item.image)}')"` : "";
    const linkButton = item.link ? `<a class="button small" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Abrir referencia</a>` : "";
    const hasMore = !!(item.description && item.description.trim());
    const metaLine = [item.date, item.location].filter(Boolean).map(escapeHtml).join(" &middot; ");
    const tagsHtml = item.tags && item.tags.length
      ? `<div class="gallery-item-tags">${item.tags.map((t) => `<span class="gallery-tag">${escapeHtml(t)}</span>`).join("")}</div>`
      : "";
    const unpub = item.published ? "" : " is-unpublished";
    const moreBlock = hasMore
      ? `<div class="gallery-asset-more" data-gallery-more hidden>${escapeHtml(item.description)}</div>
         <button class="gallery-more-toggle" type="button" data-more-toggle aria-expanded="false">Ler mais</button>`
      : "";
    return `
      <article class="gallery-asset${unpub}" data-gallery-id="${cardId}" data-gallery-item-id="${item.id}">
        <label class="gallery-asset-image"${imageStyle}>
          <span>${item.image ? "" : "Imagem"}</span>
          <input class="admin-only" type="file" accept="image/*" data-gallery-item-image="${cardId}" data-gallery-item="${item.id}" aria-label="Enviar imagem do item ${escapeHtml(item.title)}">
          <button class="gallery-asset-zoom" type="button" data-open-lightbox="${item.id}" data-gallery-id="${cardId}" aria-label="Ampliar ${escapeHtml(item.title)}"></button>
          <span class="gallery-status admin-only">${item.published ? "Publicado" : "Rascunho"}</span>
        </label>
        <div class="gallery-asset-copy">
          <div class="meta" data-gallery-item-field="credit">${escapeHtml(item.credit)}</div>
          <h3 data-gallery-item-field="title">${escapeHtml(item.title)}</h3>
          <p data-gallery-item-field="caption">${escapeHtml(item.caption)}</p>
          ${moreBlock}
          ${metaLine ? `<div class="gallery-item-metaline">${metaLine}</div>` : ""}
          ${tagsHtml}
          <div class="gallery-asset-foot">
            ${linkButton}
            <button class="button small gallery-share" type="button" data-share-item="${item.id}" data-gallery-id="${cardId}">Compartilhar</button>
          </div>
          <div class="admin-only admin-row compact gallery-item-admin">
            <label>Descricao expandida
              <textarea rows="3" data-gallery-item-input="description" data-gallery-id="${cardId}" data-gallery-item="${item.id}" placeholder="Descricao completa da imagem">${escapeHtml(item.description)}</textarea>
            </label>
            <label>Episodio relacionado
              <input type="text" value="${escapeHtml(item.episode)}" data-gallery-item-input="episode" data-gallery-id="${cardId}" data-gallery-item="${item.id}" placeholder="EP01">
            </label>
            <label>Data
              <input type="text" value="${escapeHtml(item.date)}" data-gallery-item-input="date" data-gallery-id="${cardId}" data-gallery-item="${item.id}" placeholder="2026">
            </label>
            <label>Local
              <input type="text" value="${escapeHtml(item.location)}" data-gallery-item-input="location" data-gallery-id="${cardId}" data-gallery-item="${item.id}" placeholder="Espaco Colaborar">
            </label>
            <label>Tags (separadas por virgula)
              <input type="text" value="${escapeHtml(item.tags.join(", "))}" data-gallery-item-input="tags" data-gallery-id="${cardId}" data-gallery-item="${item.id}" placeholder="bastidor, luz">
            </label>
            <label>Link de referencia
              <input type="url" value="${escapeHtml(item.link)}" data-gallery-item-input="link" data-gallery-id="${cardId}" data-gallery-item="${item.id}" placeholder="https://...">
            </label>
            <div class="gallery-admin-controls">
              <button class="button small" type="button" data-gallery-item-move="up" data-gallery-id="${cardId}" data-gallery-item="${item.id}" aria-label="Subir item">&uarr;</button>
              <button class="button small" type="button" data-gallery-item-move="down" data-gallery-id="${cardId}" data-gallery-item="${item.id}" aria-label="Descer item">&darr;</button>
              <button class="button small" type="button" data-toggle-item-publish="${item.id}" data-gallery-id="${cardId}">${item.published ? "Despublicar" : "Publicar"}</button>
              <button class="button small" type="button" data-remove-gallery-item="${cardId}" data-gallery-item="${item.id}">Remover item</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderGalleryModal(cardId) {
    ensureGalleryModal();
    const card = galleryCards().find((entry) => entry.id === cardId);
    const body = document.getElementById("gallery-modal-body");
    const title = document.getElementById("gallery-modal-title");
    if (!card || !body || !title) return;
    activeGalleryId = cardId;
    title.textContent = card.title;
    const items = visibleItems(card);
    body.innerHTML = `
      <section class="gallery-modal-hero">
        <label class="gallery-modal-cover gallery-cover-upload"${card.coverImage ? ` style="background-image:url('${escapeHtml(card.coverImage)}')"` : ""}>
          <span>${card.coverImage ? "" : "Capa da galeria"}</span>
          <input class="admin-only" type="file" accept="image/*" data-gallery-cover="${card.id}" aria-label="Enviar capa da galeria ${escapeHtml(card.title)}">
        </label>
        <div class="gallery-modal-copy">
          <div class="meta" data-gallery-modal-field="meta" data-gallery-id="${card.id}">${escapeHtml(card.meta)}</div>
          <h3 data-gallery-modal-field="title" data-gallery-id="${card.id}">${escapeHtml(card.title)}</h3>
          <p data-gallery-modal-field="description" data-gallery-id="${card.id}">${escapeHtml(card.description)}</p>
          <div class="gallery-modal-intro" data-gallery-modal-field="intro" data-gallery-id="${card.id}">${escapeHtml(card.intro)}</div>
          <div class="gallery-modal-actions">
            <button class="button small gallery-share" type="button" data-share-gallery="${card.id}">Compartilhar</button>
          </div>
        </div>
      </section>
      <section class="gallery-modal-section">
        <div class="gallery-modal-section-head">
          <h3>Acervo interno</h3>
          <div class="gallery-modal-hint">Clique em uma imagem para ampliar. Use "Ler mais" para abrir a descricao completa.</div>
        </div>
        <div class="admin-only gallery-modal-tools">
          <button class="button primary small" type="button" data-add-gallery-item="${card.id}">Adicionar item</button>
        </div>
        <div class="gallery-asset-grid gallery-mosaic">
          ${items.map((item) => galleryItemTemplate(card.id, item)).join("") || '<div class="empty-state">Nenhum item ainda.</div>'}
        </div>
      </section>
    `;
    syncGalleryModalEditability();
  }

  function openGallery(cardId) {
    renderGalleryModal(cardId);
    const modal = document.getElementById("gallery-modal");
    modal?.classList.add("is-open");
    modal?.setAttribute("aria-hidden", "false");
  }

  function closeGalleryModal() {
    const modal = document.getElementById("gallery-modal");
    modal?.classList.remove("is-open");
    modal?.setAttribute("aria-hidden", "true");
  }

  function updateGalleryCardField(cardId, field, value) {
    const list = galleryCards();
    const card = list.find((entry) => entry.id === cardId);
    if (!card) return;
    card[field] = value;
    saveGalleryCards(list);
    if (field !== "intro") {
      document.querySelectorAll(`.gallery-card[data-gallery-id="${cardId}"] [data-gallery-field="${field}"]`).forEach((element) => {
        if (element.textContent !== value) element.textContent = value;
      });
    }
    if (field === "title") {
      const modalTitle = document.getElementById("gallery-modal-title");
      if (modalTitle) modalTitle.textContent = value;
    }
  }

  function updateGalleryItemField(cardId, itemId, field, value) {
    const list = galleryCards();
    const card = list.find((entry) => entry.id === cardId);
    const item = card?.items.find((entry) => entry.id === itemId);
    if (!item) return;
    item[field] = value;
    saveGalleryCards(list);
  }

  function updateGalleryItemInput(cardId, itemId, field, value) {
    const list = galleryCards();
    const card = list.find((entry) => entry.id === cardId);
    const item = card?.items.find((entry) => entry.id === itemId);
    if (!item) return;
    if (field === "tags") {
      item.tags = value.split(",").map((t) => t.trim()).filter(Boolean);
    } else {
      item[field] = value;
    }
    saveGalleryCards(list);
  }

  function moveGalleryCard(cardId, dir) {
    const list = galleryCards();
    const idx = list.findIndex((c) => c.id === cardId);
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || target < 0 || target >= list.length) return;
    const tmp = list[idx];
    list[idx] = list[target];
    list[target] = tmp;
    list.forEach((c, i) => { c.sortOrder = i; });
    saveGalleryCards(list);
    renderGalleryCards();
    queueEnhance();
  }

  function toggleGalleryPublish(cardId) {
    const list = galleryCards();
    const card = list.find((c) => c.id === cardId);
    if (!card) return;
    card.published = !card.published;
    saveGalleryCards(list);
    renderGalleryCards();
    queueEnhance();
  }

  function moveGalleryItem(cardId, itemId, dir) {
    const list = galleryCards();
    const card = list.find((c) => c.id === cardId);
    if (!card) return;
    const idx = card.items.findIndex((i) => i.id === itemId);
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || target < 0 || target >= card.items.length) return;
    const tmp = card.items[idx];
    card.items[idx] = card.items[target];
    card.items[target] = tmp;
    card.items.forEach((i, n) => { i.sortOrder = n; });
    saveGalleryCards(list);
    renderGalleryModal(cardId);
    queueEnhance();
  }

  function toggleItemPublish(cardId, itemId) {
    const list = galleryCards();
    const card = list.find((c) => c.id === cardId);
    const item = card?.items.find((i) => i.id === itemId);
    if (!item) return;
    item.published = !item.published;
    saveGalleryCards(list);
    renderGalleryModal(cardId);
    queueEnhance();
  }

  function addGalleryCard() {
    const list = galleryCards();
    const title = `Nova galeria ${list.length + 1}`;
    list.push({
      id: assetId("gallery"),
      slug: slugify(title) + "-" + Math.random().toString(16).slice(2, 6),
      meta: "Nova categoria",
      title,
      description: "Descricao editavel da galeria.",
      intro: "Apresentacao editavel da galeria.",
      coverImage: "",
      published: false,
      sortOrder: list.length,
      items: []
    });
    saveGalleryCards(list);
    renderGalleryCards();
    queueEnhance();
  }

  function removeGalleryCard(cardId) {
    if (!isAdmin()) return;
    if (!window.confirm("Remover esta galeria?")) return;
    saveGalleryCards(galleryCards().filter((entry) => entry.id !== cardId));
    renderGalleryCards();
    closeGalleryModal();
    queueEnhance();
  }

  function addGalleryItem(cardId) {
    const list = galleryCards();
    const card = list.find((entry) => entry.id === cardId);
    if (!card) return;
    card.items.unshift({
      id: assetId("gallery-item"),
      title: "Novo item",
      caption: "Legenda editavel do item da galeria.",
      description: "",
      credit: "Acervo",
      link: "",
      image: "",
      episode: "",
      date: "",
      location: "",
      tags: [],
      published: false,
      sortOrder: -1
    });
    card.items.forEach((i, n) => { i.sortOrder = n; });
    saveGalleryCards(list);
    renderGalleryModal(cardId);
    queueEnhance();
  }

  function removeGalleryItem(cardId, itemId) {
    const list = galleryCards();
    const card = list.find((entry) => entry.id === cardId);
    if (!card) return;
    if (!window.confirm("Remover este item?")) return;
    card.items = card.items.filter((entry) => entry.id !== itemId);
    saveGalleryCards(list);
    renderGalleryModal(cardId);
    queueEnhance();
  }

  function handleGalleryImageUpload(input) {
    if (!canUseEditorialUpload()) return;
    const cardId = input.dataset.galleryCover || input.dataset.galleryItemImage;
    const itemId = input.dataset.galleryItem;
    const file = input.files?.[0];
    if (!cardId || !file) return;
    const prefix = input.dataset.galleryCover
      ? `gallery/${cardId}/covers`
      : `gallery/${cardId}/items`;
    input.disabled = true;
    uploadEditorMedia(file, prefix)
      .then(({ url }) => {
        const list = galleryCards();
        const card = list.find((entry) => entry.id === cardId);
        if (!card) return;
        if (input.dataset.galleryCover) {
          card.coverImage = url;
        } else {
          const item = card.items.find((entry) => entry.id === itemId);
          if (item) item.image = url;
        }
        saveGalleryCards(list);
        renderGalleryCards();
        renderGalleryModal(cardId);
        queueEnhance();
      })
      .catch(() => {})
      .finally(() => {
        input.disabled = false;
      });
  }

  function syncGalleryModalEditability() {
    document.querySelectorAll("[data-gallery-field], [data-gallery-modal-field], [data-gallery-item-field]").forEach((element) => {
      element.contentEditable = isAdmin() ? "true" : "false";
      element.spellcheck = true;
    });
  }

  // ---- Lightbox -----------------------------------------------------------
  function ensureLightbox() {
    if (document.getElementById("gallery-lightbox")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal gallery-lightbox" id="gallery-lightbox" aria-hidden="true">
        <div class="lightbox-panel">
          <button class="close-modal lightbox-close" type="button" data-close-lightbox aria-label="Fechar">&times;</button>
          <button class="button small lightbox-zoom" type="button" data-lightbox-zoom>Ampliar</button>
          <button class="lightbox-nav lightbox-prev" type="button" data-lightbox-prev aria-label="Anterior">&#8249;</button>
          <figure class="lightbox-figure">
            <div class="lightbox-image" data-lightbox-image></div>
            <figcaption class="lightbox-copy">
              <div class="meta" data-lightbox-credit></div>
              <h3 data-lightbox-title></h3>
              <p class="lightbox-caption" data-lightbox-caption></p>
              <p class="lightbox-desc" data-lightbox-desc></p>
              <div class="lightbox-meta" data-lightbox-meta></div>
              <div class="gallery-item-tags" data-lightbox-tags></div>
              <button class="button small gallery-share" type="button" data-lightbox-share>Compartilhar</button>
            </figcaption>
          </figure>
          <button class="lightbox-nav lightbox-next" type="button" data-lightbox-next aria-label="Proximo">&#8250;</button>
        </div>
      </div>
    `);
  }

  function renderLightbox() {
    if (!lightboxState) return;
    const lb = document.getElementById("gallery-lightbox");
    if (!lb) return;
    const item = lightboxState.items[lightboxState.index];
    if (!item) return;
    const img = lb.querySelector("[data-lightbox-image]");
    img.style.backgroundImage = item.image ? `url('${String(item.image).replace(/'/g, "%27")}')` : "";
    img.classList.toggle("is-empty", !item.image);
    lb.querySelector("[data-lightbox-credit]").textContent = item.credit || "";
    lb.querySelector("[data-lightbox-title]").textContent = item.title || "";
    lb.querySelector("[data-lightbox-caption]").textContent = item.caption || "";
    const desc = lb.querySelector("[data-lightbox-desc]");
    desc.textContent = item.description || "";
    desc.style.display = item.description ? "" : "none";
    const metaParts = [];
    if (item.date) metaParts.push(item.date);
    if (item.location) metaParts.push(item.location);
    if (item.episode) metaParts.push("Episodio " + item.episode);
    lb.querySelector("[data-lightbox-meta]").textContent = metaParts.join(" \u00b7 ");
    lb.querySelector("[data-lightbox-tags]").innerHTML = (item.tags || [])
      .map((t) => `<span class="gallery-tag">${escapeHtml(t)}</span>`)
      .join("");
    const single = lightboxState.items.length <= 1;
    lb.querySelector("[data-lightbox-prev]").style.display = single ? "none" : "";
    lb.querySelector("[data-lightbox-next]").style.display = single ? "none" : "";
    const shareBtn = lb.querySelector("[data-lightbox-share]");
    if (shareBtn) shareBtn.style.display = lightboxState.cardId ? "" : "none";
    const zoomBtn = lb.querySelector("[data-lightbox-zoom]");
    if (zoomBtn) zoomBtn.textContent = lb.classList.contains("is-zoomed") ? "Reduzir" : "Ampliar";
  }

  function openLightbox(cardId, itemId) {
    ensureLightbox();
    const card = galleryCards().find((c) => c.id === cardId);
    if (!card) return;
    const items = visibleItems(card);
    const index = items.findIndex((i) => i.id === itemId);
    if (index < 0) return;
    showLightbox({ cardId, items, index });
  }

  function showLightbox(state) {
    ensureLightbox();
    lightboxState = state;
    const lb = document.getElementById("gallery-lightbox");
    lb?.classList.remove("is-zoomed");
    renderLightbox();
    lb?.classList.add("is-open");
    lb?.setAttribute("aria-hidden", "false");
  }

  // Portfolio lightbox: items are read from the rendered tiles so it works for
  // any artist without duplicating the artists data source.
  function openPortfolioLightbox(trigger) {
    const scope = trigger.closest(".portfolio-masonry") || document;
    const tiles = Array.from(scope.querySelectorAll(".portfolio-tile"));
    const items = tiles.map((tile) => {
      const box = tile.querySelector(".portfolio-image");
      const bg = box ? box.style.backgroundImage : "";
      const match = /url\(["']?(.*?)["']?\)/.exec(bg || "");
      return {
        id: tile.dataset.portfolioItem || "",
        image: match ? match[1] : "",
        title: (tile.querySelector("[data-portfolio-field='title']")?.textContent || "").trim(),
        caption: (tile.querySelector("[data-portfolio-field='caption']")?.textContent || "").trim(),
        description: "",
        credit: "Portfolio",
        tags: []
      };
    }).filter((item) => item.image);
    if (!items.length) return;
    const activeId = trigger.dataset.openPortfolioLightbox
      || trigger.closest(".portfolio-tile")?.dataset.portfolioItem;
    const index = Math.max(0, items.findIndex((item) => item.id === activeId));
    showLightbox({ cardId: "", items, index });
  }

  function moveLightbox(delta) {
    if (!lightboxState || lightboxState.items.length <= 1) return;
    const n = lightboxState.items.length;
    lightboxState.index = (lightboxState.index + delta + n) % n;
    renderLightbox();
  }

  function closeLightbox() {
    const lb = document.getElementById("gallery-lightbox");
    lb?.classList.remove("is-open");
    lb?.classList.remove("is-zoomed");
    lb?.setAttribute("aria-hidden", "true");
    lightboxState = null;
  }

  // ---- Sharing ------------------------------------------------------------
  function galleryToast(message) {
    let el = document.getElementById("gallery-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "gallery-toast";
      el.className = "gallery-toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("is-visible"), 2200);
  }

  async function shareContent(title, text, slugRef) {
    let url = window.location.href;
    try {
      if (slugRef) {
        const u = new URL(window.location.href);
        u.hash = slugRef;
        url = u.toString();
      }
    } catch {
      /* keep plain url */
    }
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch {
      return; // user cancelled the native sheet
    }
    try {
      await navigator.clipboard.writeText(url);
      galleryToast("Link copiado");
    } catch {
      galleryToast("Nao foi possivel compartilhar");
    }
  }

  function shareGallery(cardId) {
    const card = galleryCards().find((c) => c.id === cardId);
    if (!card) return;
    shareContent(`${card.title} - PQOQ`, card.description || card.meta || "", `galeria-${card.slug}`);
  }

  function shareItem(cardId, itemId) {
    const card = galleryCards().find((c) => c.id === cardId);
    const item = card?.items.find((i) => i.id === itemId);
    if (!item) return;
    shareContent(`${item.title} - PQOQ`, item.caption || "", `galeria-${card.slug}-${item.id}`);
  }

  // =========================================================================
  // SUPPORT (Apoio) — dynamic sections: "fronts" and "partners".
  // Mirrors the gallery model: persistent cards, modals, modular tags,
  // Storage-backed images, role-gated editing. Stored under "support-content".
  // =========================================================================
  const SUPPORT_KEY = "support-content";
  const CARD_TAGS_KEY = "card-tags";

  const supportDefaults = {
    fronts: [
      { id: "front-ufsb", title: "UFSB / PROEX", subtitle: "Extensao universitaria", meta: "Instituicao", description: "O projeto dialoga com a politica de extensao ao aproximar universidade, artistas e comunidade.", fullText: "O projeto dialoga com a politica de extensao ao aproximar universidade, artistas e comunidade por meio de escuta, registro e circulacao cultural.", image: "", relation: "", contact: "", location: "", links: [], docs: [], gallery: [], tags: ["Extensao", "Pesquisa"], published: true, sortOrder: 0 },
      { id: "front-campus", title: "Campus Paulo Freire", subtitle: "Infraestrutura", meta: "Espaco", description: "As gravacoes presenciais usam a infraestrutura do Campus Paulo Freire e do Espaco Colaborar.", fullText: "As gravacoes presenciais usam a infraestrutura do Campus Paulo Freire e do Espaco Colaborar, ambiente adaptavel para audio, video e encontros.", image: "", relation: "", contact: "", location: "", links: [], docs: [], gallery: [], tags: ["Producao", "Imagem"], published: true, sortOrder: 1 },
      { id: "front-accessibility", title: "Acessibilidade", subtitle: "Acesso ampliado", meta: "Compromisso", description: "Os materiais podem contar com transcricoes e formatos preparados para ampliar o acesso.", fullText: "Os materiais podem contar com transcricoes e formatos preparados para ampliar o acesso ao conteudo produzido em audio, video e texto.", image: "", relation: "", contact: "", location: "", links: [], docs: [], gallery: [], tags: ["Curadoria"], published: true, sortOrder: 2 },
      { id: "front-community", title: "Comunidade", subtitle: "Articulacao local", meta: "Rede", description: "A proposta tambem preve articulacao com escolas publicas, redes culturais locais e divulgacao.", fullText: "A proposta tambem preve articulacao com escolas publicas, redes culturais locais e divulgacao em canais digitais e institucionais.", image: "", relation: "", contact: "", location: "", links: [], docs: [], gallery: [], tags: ["Producao"], published: true, sortOrder: 3 }
    ],
    partners: [
      { id: "partner-1", title: "Apoiador 1", subtitle: "Parceiro do projeto", meta: "Apoiador", description: "Espaco editavel para apresentar um apoiador, instituicao, pessoa parceira ou frente de colaboracao.", fullText: "Use este campo para explicar como esse apoio participa da realizacao, circulacao, infraestrutura, pesquisa, memoria ou divulgacao do PQOQ.", image: "", relation: "", contact: "", location: "", links: [], docs: [], gallery: [], tags: ["Pesquisa", "Podcast", "Curadoria"], published: true, sortOrder: 0 },
      { id: "partner-2", title: "Apoiador 2", subtitle: "Parceiro do projeto", meta: "Apoiador", description: "Espaco editavel para apresentar outro apoiador, parceiro, coletivo, laboratorio ou colaborador.", fullText: "Este card pode receber informacoes de contato, historico, descricao da parceria e links relacionados.", image: "", relation: "", contact: "", location: "", links: [], docs: [], gallery: [], tags: ["Design", "Producao", "Imagem"], published: true, sortOrder: 1 }
    ]
  };

  let activeSupport = null; // { section, cardId }

  function normalizeLinkPairs(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map((entry) => ({
        label: String(entry && entry.label ? entry.label : "").trim(),
        href: String(entry && entry.href ? entry.href : "").trim()
      }))
      .filter((entry) => entry.href || entry.label);
  }

  function normalizeSupportCard(card, index) {
    const tags = Array.isArray(card.tags)
      ? card.tags.map((t) => String(t).trim()).filter(Boolean)
      : [];
    const gallery = Array.isArray(card.gallery)
      ? card.gallery.map((g) => String(g).trim()).filter(Boolean)
      : [];
    return {
      id: card.id || assetId(`support-${index + 1}`),
      slug: card.slug || slugify(card.title || card.id || `apoio-${index + 1}`),
      title: card.title || `Card ${index + 1}`,
      subtitle: card.subtitle || "",
      meta: card.meta || "Apoio",
      description: card.description || "Descricao editavel do card de apoio.",
      fullText: card.fullText || "",
      image: card.image || "",
      relation: card.relation || "",
      contact: card.contact || "",
      location: card.location || "",
      links: normalizeLinkPairs(card.links),
      docs: normalizeLinkPairs(card.docs),
      gallery,
      tags,
      published: card.published !== false,
      sortOrder: typeof card.sortOrder === "number" ? card.sortOrder : index
    };
  }

  function supportContent() {
    const raw = getState(SUPPORT_KEY, supportDefaults) || {};
    const out = {};
    ["fronts", "partners"].forEach((section) => {
      const list = Array.isArray(raw[section]) ? raw[section] : [];
      out[section] = list
        .map(normalizeSupportCard)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    });
    return out;
  }

  function saveSupport(data) {
    setState(SUPPORT_KEY, data);
  }

  function supportCards(section) {
    return supportContent()[section] || [];
  }

  function visibleSupportCards(section) {
    const cards = supportCards(section);
    return isAdmin() ? cards : cards.filter((c) => c.published);
  }

  function findSupportCard(section, cardId) {
    return supportCards(section).find((c) => c.id === cardId);
  }

  function supportCardTemplate(section, card) {
    const imageStyle = card.image ? ` style="background-image:url('${escapeHtml(card.image)}')"` : "";
    const unpub = card.published ? "" : " is-unpublished";
    const tagsHtml = card.tags.length
      ? `<div class="tag-list">${card.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>`
      : "";
    return `
      <article class="card support-card${unpub}" data-support-section="${section}" data-support-id="${card.id}">
        <button class="support-card-thumb${card.image ? "" : " is-empty"}" type="button" data-open-support="${card.id}" data-support-section="${section}" data-layout-key="support.${section}.${card.id}.image"${imageStyle} aria-label="Abrir ${escapeHtml(card.title)}"></button>
        <span class="gallery-status admin-only">${card.published ? "Publicado" : "Rascunho"}</span>
        <div class="meta" data-layout-key="support.${section}.${card.id}.meta">${escapeHtml(card.meta)}</div>
        <h3 data-layout-key="support.${section}.${card.id}.title">${escapeHtml(card.title)}</h3>
        ${card.subtitle ? `<div class="support-card-subtitle">${escapeHtml(card.subtitle)}</div>` : ""}
        <p data-layout-key="support.${section}.${card.id}.description">${escapeHtml(card.description)}</p>
        ${tagsHtml}
        <div class="artist-actions">
          <button class="button primary small" type="button" data-open-support="${card.id}" data-support-section="${section}" data-layout-key="support.${section}.${card.id}.button">Abrir</button>
        </div>
        <div class="admin-only admin-row compact">
          <div class="gallery-admin-controls">
            <button class="button small" type="button" data-support-move="up" data-support-section="${section}" data-support-id="${card.id}" aria-label="Subir">&uarr;</button>
            <button class="button small" type="button" data-support-move="down" data-support-section="${section}" data-support-id="${card.id}" aria-label="Descer">&darr;</button>
            <button class="button small" type="button" data-support-publish="${card.id}" data-support-section="${section}">${card.published ? "Despublicar" : "Publicar"}</button>
            <button class="button small" type="button" data-support-remove="${card.id}" data-support-section="${section}">Remover</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderSupportSection(section) {
    const container = document.querySelector(`[data-render-support="${section}"]`);
    if (!container) return;
    const cards = visibleSupportCards(section);
    const html = cards.length
      ? cards.map((card) => supportCardTemplate(section, card)).join("")
      : '<div class="empty-state">Nenhum card publicado ainda.</div>';
    if (container.dataset.renderedHtml === html) return;
    container.dataset.renderedHtml = html;
    container.innerHTML = html;
  }

  function renderSupportSections() {
    renderSupportSection("fronts");
    renderSupportSection("partners");
  }

  function ensureSupportModal() {
    if (document.getElementById("support-modal")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal support-modal" id="support-modal" aria-hidden="true">
        <div class="modal-panel support-modal-panel">
          <div class="modal-head">
            <h2 id="support-modal-title">Apoio</h2>
            <button class="close-modal" type="button" data-close-support>&times;</button>
          </div>
          <div class="modal-body" id="support-modal-body"></div>
        </div>
      </div>
    `);
  }

  function tagEditorTemplate(section, card) {
    const tags = card.tags
      .map((tag, i) => `
        <span class="tag-edit" data-tag-index="${i}">
          <span class="tag-edit-text" contenteditable="true" data-support-tag-text data-support-section="${section}" data-support-id="${card.id}" data-tag-index="${i}">${escapeHtml(tag)}</span>
          <button class="tag-edit-btn" type="button" data-support-tag-move="up" data-support-section="${section}" data-support-id="${card.id}" data-tag-index="${i}" aria-label="Subir tag">&uarr;</button>
          <button class="tag-edit-btn" type="button" data-support-tag-move="down" data-support-section="${section}" data-support-id="${card.id}" data-tag-index="${i}" aria-label="Descer tag">&darr;</button>
          <button class="tag-edit-btn" type="button" data-support-tag-remove data-support-section="${section}" data-support-id="${card.id}" data-tag-index="${i}" aria-label="Remover tag">&times;</button>
        </span>`)
      .join("");
    return `
      <div class="tag-editor">
        <div class="tag-edit-list">${tags || '<span class="tag-empty">Sem tags</span>'}</div>
        <button class="button small" type="button" data-support-tag-add data-support-section="${section}" data-support-id="${card.id}">Adicionar tag</button>
      </div>
    `;
  }

  function linksToText(list) {
    return list.map((l) => `${l.label || ""} | ${l.href || ""}`).join("\n");
  }

  function textToLinks(text) {
    return String(text || "")
      .split("\n")
      .map((line) => {
        const [label, ...rest] = line.split("|");
        const href = rest.join("|").trim();
        return { label: (label || "").trim(), href };
      })
      .filter((l) => l.label || l.href);
  }

  function renderSupportModal(section, cardId) {
    ensureSupportModal();
    const card = findSupportCard(section, cardId);
    const body = document.getElementById("support-modal-body");
    const title = document.getElementById("support-modal-title");
    if (!card || !body || !title) return;
    activeSupport = { section, cardId };
    title.textContent = card.title;
    const admin = isAdmin();

    const optional = (label, value, html) => {
      if (!admin && !(value && String(value).trim())) return "";
      return html;
    };

    const galleryThumbs = card.gallery
      .map((url, i) => `
        <div class="support-gallery-thumb" style="background-image:url('${escapeHtml(url)}')">
          <button class="support-gallery-remove admin-only" type="button" data-support-gallery-remove data-support-section="${section}" data-support-id="${card.id}" data-gallery-index="${i}" aria-label="Remover imagem">&times;</button>
        </div>`)
      .join("");
    const galleryBlock = optional("galeria", card.gallery.length, `
      <section class="support-modal-block">
        <h4>ACERVO</h4>
        <div class="support-gallery-grid">${galleryThumbs || (admin ? "" : "")}</div>
        <label class="admin-only support-gallery-add">
          <span>Adicionar imagem a galeria</span>
          <input type="file" accept="image/*" data-support-gallery-add data-support-section="${section}" data-support-id="${card.id}">
        </label>
      </section>`);

    const linksPublic = card.links.length
      ? `<ul class="support-link-list">${card.links.map((l) => `<li><a href="${escapeHtml(l.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label || l.href)}</a></li>`).join("")}</ul>`
      : "";
    const docsPublic = card.docs.length
      ? `<ul class="support-link-list">${card.docs.map((l) => `<li><a href="${escapeHtml(l.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label || l.href)}</a></li>`).join("")}</ul>`
      : "";

    body.innerHTML = `
      <section class="support-modal-hero">
        <label class="support-modal-image${card.image ? "" : " is-empty"}"${card.image ? ` style="background-image:url('${escapeHtml(card.image)}')"` : ""}>
          <span>${card.image ? "" : "Imagem / logo"}</span>
          <input class="admin-only" type="file" accept="image/*" data-support-image data-support-section="${section}" data-support-id="${card.id}" aria-label="Enviar imagem do card">
        </label>
        <div class="support-modal-copy">
          <div class="meta" data-support-field="meta" data-support-section="${section}" data-support-id="${card.id}">${escapeHtml(card.meta)}</div>
          <h3 data-support-field="title" data-support-section="${section}" data-support-id="${card.id}">${escapeHtml(card.title)}</h3>
          <div class="support-card-subtitle" data-support-field="subtitle" data-support-section="${section}" data-support-id="${card.id}">${escapeHtml(card.subtitle)}</div>
          <div class="support-modal-actions">
            <button class="button small gallery-share" type="button" data-share-support data-support-section="${section}" data-support-id="${card.id}">Compartilhar</button>
          </div>
        </div>
      </section>

      <section class="support-modal-block">
        <h4 ${admin ? "" : "hidden"}>Texto completo</h4>
        <div class="support-modal-text" data-support-field="fullText" data-support-section="${section}" data-support-id="${card.id}">${escapeHtml(card.fullText || card.description)}</div>
      </section>

      ${galleryBlock}

      ${optional("relacao", card.relation, `
      <section class="support-modal-block">
        <h4>Relacao com o PQOQ</h4>
        <div class="support-modal-text" data-support-field="relation" data-support-section="${section}" data-support-id="${card.id}">${escapeHtml(card.relation)}</div>
      </section>`)}

      ${optional("contato", card.contact, `
      <section class="support-modal-block">
        <h4>Contato</h4>
        <div class="support-modal-text" data-support-field="contact" data-support-section="${section}" data-support-id="${card.id}">${escapeHtml(card.contact)}</div>
      </section>`)}

      ${optional("local", card.location, `
      <section class="support-modal-block">
        <h4>Mapa / localizacao</h4>
        <div class="support-modal-text" data-support-field="location" data-support-section="${section}" data-support-id="${card.id}">${escapeHtml(card.location)}</div>
      </section>`)}

      ${optional("links", card.links.length, `
      <section class="support-modal-block">
        <h4>Links oficiais</h4>
        ${linksPublic}
        <label class="admin-only">Links (um por linha: Rotulo | https://...)
          <textarea rows="3" data-support-links data-support-section="${section}" data-support-id="${card.id}">${escapeHtml(linksToText(card.links))}</textarea>
        </label>
      </section>`)}

      ${optional("docs", card.docs.length, `
      <section class="support-modal-block">
        <h4>Documentos / anexos</h4>
        ${docsPublic}
        <label class="admin-only">Documentos (um por linha: Rotulo | https://...)
          <textarea rows="3" data-support-docs data-support-section="${section}" data-support-id="${card.id}">${escapeHtml(linksToText(card.docs))}</textarea>
        </label>
      </section>`)}

      <section class="support-modal-block">
        <h4>Tags</h4>
        ${admin ? tagEditorTemplate(section, card) : `<div class="tag-list">${card.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>`}
      </section>

      <div class="admin-only admin-row compact">
        <button class="button small" type="button" data-support-publish="${card.id}" data-support-section="${section}">${card.published ? "Despublicar" : "Publicar"}</button>
      </div>
    `;
    syncSupportEditability();
  }

  function syncSupportEditability() {
    const editable = isAdmin();
    document.querySelectorAll("#support-modal [data-support-field]").forEach((el) => {
      el.contentEditable = editable ? "true" : "false";
      el.spellcheck = true;
    });
  }

  function openSupport(section, cardId) {
    renderSupportModal(section, cardId);
    const modal = document.getElementById("support-modal");
    modal?.classList.add("is-open");
    modal?.setAttribute("aria-hidden", "false");
  }

  function closeSupport() {
    const modal = document.getElementById("support-modal");
    modal?.classList.remove("is-open");
    modal?.setAttribute("aria-hidden", "true");
    activeSupport = null;
  }

  function mutateSupport(section, cardId, fn) {
    const data = supportContent();
    const card = (data[section] || []).find((c) => c.id === cardId);
    if (!card) return;
    fn(card, data);
    saveSupport(data);
  }

  function updateSupportField(section, cardId, field, value) {
    mutateSupport(section, cardId, (card) => { card[field] = value; });
    if (field === "title") {
      const t = document.getElementById("support-modal-title");
      if (t) t.textContent = value;
    }
  }

  function addSupportCard(section) {
    const data = supportContent();
    const list = data[section] || [];
    const isFront = section === "fronts";
    const title = isFront ? `Nova frente ${list.length + 1}` : `Novo apoiador ${list.length + 1}`;
    list.push(normalizeSupportCard({
      id: assetId(section === "fronts" ? "front" : "partner"),
      title,
      meta: isFront ? "Frente" : "Apoiador",
      description: "Descricao editavel do card.",
      fullText: "Texto completo editavel.",
      published: false,
      sortOrder: list.length
    }, list.length));
    data[section] = list;
    saveSupport(data);
    renderSupportSection(section);
    queueEnhance();
  }

  function removeSupportCard(section, cardId) {
    if (!isAdmin()) return;
    if (!window.confirm("Remover este card?")) return;
    const data = supportContent();
    data[section] = (data[section] || []).filter((c) => c.id !== cardId);
    saveSupport(data);
    renderSupportSection(section);
    closeSupport();
    queueEnhance();
  }

  function moveSupportCard(section, cardId, dir) {
    const data = supportContent();
    const list = data[section] || [];
    const idx = list.findIndex((c) => c.id === cardId);
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || target < 0 || target >= list.length) return;
    const tmp = list[idx];
    list[idx] = list[target];
    list[target] = tmp;
    list.forEach((c, i) => { c.sortOrder = i; });
    saveSupport(data);
    renderSupportSection(section);
    queueEnhance();
  }

  function toggleSupportPublish(section, cardId) {
    mutateSupport(section, cardId, (card) => { card.published = !card.published; });
    renderSupportSection(section);
    if (activeSupport && activeSupport.cardId === cardId) renderSupportModal(section, cardId);
    queueEnhance();
  }

  function addSupportTag(section, cardId) {
    mutateSupport(section, cardId, (card) => { card.tags.push("Nova tag"); });
    renderSupportModal(section, cardId);
  }

  function removeSupportTag(section, cardId, index) {
    mutateSupport(section, cardId, (card) => { card.tags.splice(index, 1); });
    renderSupportSection(section);
    renderSupportModal(section, cardId);
  }

  function moveSupportTag(section, cardId, index, dir) {
    mutateSupport(section, cardId, (card) => {
      const t = index + (dir === "up" ? -1 : 1);
      if (t < 0 || t >= card.tags.length) return;
      const tmp = card.tags[index];
      card.tags[index] = card.tags[t];
      card.tags[t] = tmp;
    });
    renderSupportSection(section);
    renderSupportModal(section, cardId);
  }

  function updateSupportTagText(section, cardId, index, value) {
    mutateSupport(section, cardId, (card) => {
      if (card.tags[index] !== undefined) card.tags[index] = value;
    });
  }

  function handleSupportImageUpload(input) {
    if (!canUseEditorialUpload()) return;
    const section = input.dataset.supportSection;
    const cardId = input.dataset.supportId;
    const file = input.files?.[0];
    if (!section || !cardId || !file) return;
    const isGallery = input.hasAttribute("data-support-gallery-add");
    input.disabled = true;
    uploadEditorMedia(file, `support/${section}/${cardId}`)
      .then(({ url }) => {
        mutateSupport(section, cardId, (card) => {
          if (isGallery) card.gallery.push(url);
          else card.image = url;
        });
        renderSupportSection(section);
        renderSupportModal(section, cardId);
        queueEnhance();
      })
      .catch(() => {})
      .finally(() => { input.disabled = false; });
  }

  function removeSupportGalleryImage(section, cardId, index) {
    mutateSupport(section, cardId, (card) => { card.gallery.splice(index, 1); });
    renderSupportModal(section, cardId);
  }

  function shareSupport(section, cardId) {
    const card = findSupportCard(section, cardId);
    if (!card) return;
    shareContent(`${card.title} - PQOQ`, card.subtitle || card.description || "", `apoio-${card.slug}`);
  }

  // ---- Static tag editor (e.g. Sobre cards) -------------------------------
  function staticTagStore() {
    return getState(CARD_TAGS_KEY, {});
  }

  function saveStaticTags(store) {
    setState(CARD_TAGS_KEY, store);
  }

  function staticTagKey(list) {
    if (list.dataset.tagKey) return list.dataset.tagKey;
    const card = list.closest("[data-editable]");
    const base = card ? card.dataset.editable : currentPage();
    list.dataset.tagKey = `${base}:tags`;
    return list.dataset.tagKey;
  }

  function staticTagLists() {
    return Array.from(document.querySelectorAll(".about-layout .tag-list"));
  }

  // Tag values must never carry the editor's own control glyphs (up/down/remove)
  // nor an entire wrapper's textContent. sanitizeStaticTag() is the single
  // gate used on every read so corrupted values cannot be persisted again.
  const TAG_CONTROL_CHARS = /[\u2191\u2193\u00d7\u2715\u2716\u274c]/g;

  function sanitizeStaticTag(value) {
    return String(value || "")
      .replace(TAG_CONTROL_CHARS, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
  }

  function sanitizeStaticTagList(list) {
    const seen = new Set();
    const out = [];
    (Array.isArray(list) ? list : []).forEach((entry) => {
      const tag = sanitizeStaticTag(entry);
      if (!tag) return;
      const dedupeKey = tag.toLocaleLowerCase();
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      out.push(tag);
    });
    return out;
  }

  function renderStaticTags() {
    const store = staticTagStore();
    staticTagLists().forEach((list) => {
      const key = staticTagKey(list);
      let tags = Array.isArray(store[key])
        ? sanitizeStaticTagList(store[key])
        : sanitizeStaticTagList(
            Array.from(
              list.querySelectorAll(
                "[data-static-tag-text], span:not(.tag-edit):not(.tag-edit-btn):not(.tag-empty)",
              ),
            ).map((s) => s.textContent),
          );
      if (isAdmin()) {
        list.classList.add("tag-list-editing");
        const html = tags
          .map((tag, i) => `
            <span class="tag-edit" data-tag-index="${i}">
              <span class="tag-edit-text" contenteditable="true" data-static-tag-text data-tag-key="${escapeHtml(key)}" data-tag-index="${i}">${escapeHtml(tag)}</span>
              <button class="tag-edit-btn" type="button" data-static-tag-move="up" data-tag-key="${escapeHtml(key)}" data-tag-index="${i}" aria-label="Subir">&uarr;</button>
              <button class="tag-edit-btn" type="button" data-static-tag-move="down" data-tag-key="${escapeHtml(key)}" data-tag-index="${i}" aria-label="Descer">&darr;</button>
              <button class="tag-edit-btn" type="button" data-static-tag-remove data-tag-key="${escapeHtml(key)}" data-tag-index="${i}" aria-label="Remover">&times;</button>
            </span>`).join("")
          + `<button class="button small tag-add-btn" type="button" data-static-tag-add data-tag-key="${escapeHtml(key)}">+ tag</button>`;
        if (list.dataset.renderedHtml !== html) { list.dataset.renderedHtml = html; list.innerHTML = html; }
      } else {
        list.classList.remove("tag-list-editing");
        const html = tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("");
        if (list.dataset.renderedHtml !== html) { list.dataset.renderedHtml = html; list.innerHTML = html; }
      }
    });
  }

  function readStaticTags(key) {
    const store = staticTagStore();
    if (Array.isArray(store[key])) return sanitizeStaticTagList(store[key]);
    const list = staticTagLists().find((l) => l.dataset.tagKey === key);
    if (!list) return [];
    // Only the dedicated text nodes: the ".tag-edit" wrapper also matches
    // "span" and its textContent includes the control buttons' glyphs.
    const nodes = list.querySelectorAll("[data-static-tag-text]").length
      ? list.querySelectorAll("[data-static-tag-text]")
      : list.querySelectorAll("span:not(.tag-edit):not(.tag-edit-btn):not(.tag-empty)");
    return sanitizeStaticTagList(Array.from(nodes).map((s) => s.textContent));
  }

  function writeStaticTags(key, tags) {
    const store = staticTagStore();
    store[key] = sanitizeStaticTagList(tags);
    saveStaticTags(store);
  }

  // Typing in a tag used to trigger a full DOM re-read plus a remote upsert on
  // every keystroke, which froze long pages such as /sobre. Writes are now
  // debounced and applied to a single index.
  const staticTagWriteTimers = new Map();

  function queueStaticTagWrite(key, index, value) {
    const pending = staticTagWriteTimers.get(key);
    if (pending) window.clearTimeout(pending);
    staticTagWriteTimers.set(
      key,
      window.setTimeout(() => {
        staticTagWriteTimers.delete(key);
        const store = staticTagStore();
        const tags = Array.isArray(store[key]) ? store[key].slice() : readStaticTags(key);
        tags[index] = value;
        writeStaticTags(key, tags);
      }, 500),
    );
  }

  function enhanceEpisodeThumbs() {
    const embeds = episodeEmbeds();
    document.querySelectorAll(".episode-card[data-episode-id], .home-episode[data-episode-id]").forEach((card) => {
      const episodeId = card.dataset.episodeId;
      const thumb = card.querySelector(".episode-thumb");
      if (!thumb || !episodeId) return;
      thumb.classList.add("episode-thumb-upload");
      const image = embeds[episodeId]?.thumbnail || "";
      thumb.style.backgroundImage = image ? `url("${image}")` : "";
      thumb.classList.toggle("has-cover", Boolean(image));
      if (image) thumb.classList.remove("lettered");
      if (!thumb.querySelector("[data-episode-thumb-input]")) {
        thumb.insertAdjacentHTML("beforeend", `<input class="admin-only" type="file" accept="image/*" data-episode-thumb-input="${episodeId}" aria-label="Trocar thumbnail do episodio ${episodeId}">`);
      }
      let dim = card.querySelector(`[data-episode-thumb-dim="${episodeId}"]`);
      if (!dim) {
        dim = document.createElement("div");
        dim.className = "admin-only episode-thumb-dim";
        dim.dataset.episodeThumbDim = episodeId;
        thumb.insertAdjacentElement("afterend", dim);
      }
      const rect = thumb.getBoundingClientRect();
      dim.textContent = `${Math.round(rect.width)} x ${Math.round(rect.height)} px · ${pxToCm(rect.width)} x ${pxToCm(rect.height)} cm`;
      if (!image) {
        const text = thumb.textContent.trim();
        if (!text) thumb.innerHTML = thumb.innerHTML.replace(/<input[\s\S]*$/i, "") + `<span class="episode-thumb-fallback">${episodeId.replace("EP", "\nEP")}</span>`;
      }
    });
  }

  function handleEpisodeThumbUpload(input) {
    if (!canUseEditorialUpload()) return;
    const episodeId = input.dataset.episodeThumbInput;
    const file = input.files?.[0];
    if (!episodeId || !file) return;
    input.disabled = true;
    uploadEditorMedia(file, `episodes/${episodeId}/thumbnails`)
      .then(({ url }) => {
        const data = episodeEmbeds();
        data[episodeId] = data[episodeId] || {};
        data[episodeId].thumbnail = url;
        saveEpisodeEmbeds(data);
        queueEnhance();
      })
      .catch(() => {})
      .finally(() => {
        input.disabled = false;
      });
  }

  function fixYouTubePreview() {
    const box = document.querySelector("[data-video-box]");
    const iframe = box?.querySelector("iframe");
    if (!box || !iframe) return;
    const id = youtubeId(iframe.getAttribute("src") || "");
    if (!id) return;
    if (window.location.protocol === "file:") {
      box.classList.add("video-preview-fallback");
      box.innerHTML = `
        <div class="youtube-preview-fallback" style="background-image:url('https://i.ytimg.com/vi/${id}/hqdefault.jpg')">
          <div class="youtube-preview-copy">
            <strong>Preview local do YouTube</strong>
            <p>O erro 153 acontece no arquivo local porque o player embed precisa de identificacao/origin HTTP.</p>
            <a class="button primary small" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener noreferrer">Abrir no YouTube</a>
          </div>
        </div>
      `;
      return;
    }
    try {
      const src = new URL(iframe.src);
      if (!src.searchParams.get("origin")) src.searchParams.set("origin", window.location.origin);
      src.searchParams.set("playsinline", "1");
      src.searchParams.set("rel", "0");
      iframe.src = src.toString();
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
    } catch {
      // no-op
    }
  }

  function ensureLayoutDock() {
    if (document.getElementById("layout-dock")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="layout-dock admin-only" id="layout-dock">
        <span class="layout-dock-label">Modo modular</span>
        <span class="layout-dock-target" id="layout-dock-target"></span>
        <button class="button small" type="button" data-grid-toggle>Ativar grade</button>
        <button class="button small" type="button" data-grid-reset-item hidden>Resetar item</button>
      </div>
      <div class="layout-grid-overlay" aria-hidden="true"></div>
    `);
    const toggle = document.querySelector("[data-grid-toggle]");
    if (toggle && !toggle.dataset.gridBound) {
      toggle.dataset.gridBound = "true";
      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!document.body.classList.contains("admin-mode")) return;
        setGridMode(!gridMode);
      });
    }
    const resetItem = document.querySelector("[data-grid-reset-item]");
    if (resetItem && !resetItem.dataset.gridBound) {
      resetItem.dataset.gridBound = "true";
      resetItem.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!isAdmin() || !selectedModular) return;
        const state = layoutState();
        delete state[dragKey(selectedModular)];
        delete state[legacyDragKey(selectedModular)];
        saveLayoutState(state);
        selectedModular.style.translate = "";
      });
    }
  }

  function syncLayoutDock() {
    const button = document.querySelector("[data-grid-toggle]");
    if (button) button.textContent = gridMode ? "Desativar grade e salvar" : "Ativar grade";
    const label = document.getElementById("layout-dock-target");
    if (label) label.textContent = gridMode && selectedModular ? `Movendo: ${modularLabel(selectedModular)}` : "";
    const reset = document.querySelector("[data-grid-reset-item]");
    if (reset) reset.hidden = !(gridMode && selectedModular);
  }

  function modularTargets() {
    return Array.from(document.querySelectorAll(MODULAR_SELECTOR)).filter(isModularCandidate);
  }

  function dragKey(element) {
    if (element.dataset.dragKey) return element.dataset.dragKey;
    // Stable identity: prefer explicit data ids, then a DOM path.
    // Never derive from text content (editing the text moved the block).
    const d = element.dataset;
    if (d.layoutKey) {
      element.dataset.dragKey = `layout:${d.layoutKey}`;
      return element.dataset.dragKey;
    }
    const own = d.editable || d.pagePhotoBox || d.linkEditable || d.galleryId
      || d.photoKey || d.artistId || d.supportId || d.portfolioItem || d.episodeId || d.page
      || element.id
      || element.getAttribute("href") || domPath(element);
    const key = `${currentPage()}:${element.tagName.toLowerCase()}:${own}`;
    element.dataset.dragKey = key;
    return key;
  }

  // Legacy key (text-based) kept for reading positions saved before the fix.
  function legacyDragKey(element) {
    const d = element.dataset;
    const own = d.editable || d.pagePhotoBox || d.linkEditable || d.galleryId || d.episodeId || d.page || element.getAttribute("href") || (element.textContent || "").trim().slice(0, 24) || element.tagName.toLowerCase();
    return `${currentPage()}:${element.tagName.toLowerCase()}:${own}:${Array.from(element.parentElement?.children || []).indexOf(element)}`;
  }

  function domPath(element) {
    const parts = [];
    let node = element;
    while (node && node !== document.body && parts.length < 8) {
      const parent = node.parentElement;
      if (!parent) break;
      parts.unshift(`${node.tagName.toLowerCase()}#${Array.from(parent.children).indexOf(node)}`);
      node = parent;
    }
    return parts.join(">");
  }

  function readDragPosition(element) {
    const state = layoutState();
    return state[dragKey(element)] || state[legacyDragKey(element)] || null;
  }

  function applyLayoutState() {
    // BLOCO 30 (P1): offsets salvos vêm do desktop. Em telas estreitas eles
    // colidem com o fluxo natural, então não são aplicados — os dados salvos
    // em localStorage/Supabase permanecem intactos.
    const narrow =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 779px)").matches;
    modularTargets().forEach((element) => {
      if (narrow) {
        element.style.translate = "";
        return;
      }
      const position = readDragPosition(element);
      element.style.translate = position ? `${position.x}px ${position.y}px` : "";
    });
  }

  if (typeof window !== "undefined") {
    let layoutResizeTimer = null;
    window.addEventListener("resize", () => {
      window.clearTimeout(layoutResizeTimer);
      layoutResizeTimer = window.setTimeout(() => {
        try {
          applyLayoutState();
        } catch (error) {
          /* noop */
        }
      }, 180);
    });
  }

  function setGridMode(enabled) {
    gridMode = enabled;
    document.body.classList.toggle("layout-grid-mode", enabled);
    if (!enabled) clearModularSelection();
    syncLayoutDock();
    document.querySelectorAll("[contenteditable='true']").forEach((element) => {
      if (enabled) {
        element.dataset.modularEditableRestore = "true";
        element.contentEditable = "false";
      } else if (element.dataset.modularEditableRestore) {
        element.contentEditable = "true";
        delete element.dataset.modularEditableRestore;
      }
    });
  }

  function attachPopoverDragging() {
    const popover = document.getElementById("style-popover");
    const handle = popover?.querySelector(".style-popover-head");
    if (!popover || !handle || handle.dataset.dragReady) return;
    handle.dataset.dragReady = "true";
    handle.addEventListener("pointerdown", (event) => {
      if (!isAdmin()) return;
      popoverDrag = {
        x: event.clientX,
        y: event.clientY,
        left: Number.parseFloat(popover.style.left || "32"),
        top: Number.parseFloat(popover.style.top || "120")
      };
      handle.setPointerCapture?.(event.pointerId);
      popover.classList.add("is-dragging");
    });
  }

  function restorePopoverPosition() {
    const popover = document.getElementById("style-popover");
    const stored = getState(STYLE_POPOVER_POSITION_KEY, null);
    if (!popover || !stored) return;
    popover.style.left = `${stored.left}px`;
    popover.style.top = `${stored.top}px`;
  }

  function enhancePage() {
    ensureStylePopoverLinkField();
    syncStylePopoverLinkField();
    applySavedLinks();
    applyPagePhotos();
    renderGalleryCards();
    syncGalleryModalEditability();
    renderSupportSections();
    renderStaticTags();
    enhanceEpisodeThumbs();
    fixYouTubePreview();
    ensureGalleryModal();
    ensureSupportModal();
    ensureLightbox();
    ensureLayoutDock();
    attachPopoverDragging();
    restorePopoverPosition();
    applyLayoutState();
    syncLayoutDock();
  }

  function bindGlobalEvents() {
    // Capture-phase guard: block opening a file picker (image, upload label, or
    // file input) for anyone who is not an editor in edit mode.
    document.addEventListener(
      "click",
      (event) => {
        if (canUseEditorialUpload()) return;
        const target = event.target;
        if (!target || typeof target.closest !== "function") return;
        // Never interfere with real interactive controls (lightbox, links).
        if (target.closest('button, a, [data-open-lightbox], [role="button"]')) {
          if (!target.closest('input[type="file"]')) return;
        }
        const inUploadLabel = target.closest(
          'input[type="file"], .gallery-cover-upload, .gallery-asset-image, .episode-thumb-upload, .bio-photo-upload, label[data-upload]',
        );
        if (inUploadLabel) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true,
    );
    document.addEventListener("click", (event) => {
      // Lightbox controls (highest priority, sits above the modal)
      const openLb = event.target.closest("[data-open-lightbox]");
      if (openLb) {
        event.preventDefault();
        openLightbox(openLb.dataset.galleryId, openLb.dataset.openLightbox);
        return;
      }
      const openPortfolio = event.target.closest("[data-open-portfolio-lightbox]");
      if (openPortfolio) {
        event.preventDefault();
        event.stopPropagation();
        openPortfolioLightbox(openPortfolio);
        return;
      }
      if (event.target.closest("[data-lightbox-zoom]")) {
        const lb = document.getElementById("gallery-lightbox");
        lb?.classList.toggle("is-zoomed");
        renderLightbox();
        return;
      }
      const closeLb = event.target.closest("[data-close-lightbox]");
      if (closeLb || event.target.id === "gallery-lightbox") {
        closeLightbox();
        return;
      }
      if (event.target.closest("[data-lightbox-prev]")) { moveLightbox(-1); return; }
      if (event.target.closest("[data-lightbox-next]")) { moveLightbox(1); return; }
      const lbShare = event.target.closest("[data-lightbox-share]");
      if (lbShare && lightboxState) {
        const item = lightboxState.items[lightboxState.index];
        if (item) shareItem(lightboxState.cardId, item.id);
        return;
      }

      // "Ler mais" expand/collapse
      const moreToggle = event.target.closest("[data-more-toggle]");
      if (moreToggle) {
        event.preventDefault();
        const block = moreToggle.parentElement.querySelector("[data-gallery-more]");
        if (block) {
          const willShow = block.hasAttribute("hidden");
          block.toggleAttribute("hidden", !willShow);
          moreToggle.setAttribute("aria-expanded", String(willShow));
          moreToggle.textContent = willShow ? "Ler menos" : "Ler mais";
        }
        return;
      }

      // Sharing
      const shareG = event.target.closest("[data-share-gallery]");
      if (shareG) { event.preventDefault(); shareGallery(shareG.dataset.shareGallery); return; }
      const shareI = event.target.closest("[data-share-item]");
      if (shareI) { event.preventDefault(); shareItem(shareI.dataset.galleryId, shareI.dataset.shareItem); return; }

      const galleryButton = event.target.closest("[data-open-gallery]");
      if (galleryButton) {
        event.preventDefault();
        openGallery(galleryButton.dataset.openGallery);
        return;
      }

      const closeModal = event.target.closest("#gallery-modal [data-close-modal]");
      if (closeModal || event.target.id === "gallery-modal") {
        closeGalleryModal();
      }

      const addGallery = event.target.closest("#gallery-add");
      if (addGallery && isAdmin()) addGalleryCard();

      const moveGallery = event.target.closest("[data-gallery-move]");
      if (moveGallery && isAdmin()) { moveGalleryCard(moveGallery.dataset.galleryId, moveGallery.dataset.galleryMove); return; }

      const togglePub = event.target.closest("[data-toggle-gallery-publish]");
      if (togglePub && isAdmin()) { toggleGalleryPublish(togglePub.dataset.toggleGalleryPublish); return; }

      const removeGallery = event.target.closest("[data-remove-gallery]");
      if (removeGallery) removeGalleryCard(removeGallery.dataset.removeGallery);

      const addGalleryItemButton = event.target.closest("[data-add-gallery-item]");
      if (addGalleryItemButton && isAdmin()) addGalleryItem(addGalleryItemButton.dataset.addGalleryItem);

      const moveItem = event.target.closest("[data-gallery-item-move]");
      if (moveItem && isAdmin()) { moveGalleryItem(moveItem.dataset.galleryId, moveItem.dataset.galleryItem, moveItem.dataset.galleryItemMove); return; }

      const toggleItemPub = event.target.closest("[data-toggle-item-publish]");
      if (toggleItemPub && isAdmin()) { toggleItemPublish(toggleItemPub.dataset.galleryId, toggleItemPub.dataset.toggleItemPublish); return; }

      const removeGalleryItemButton = event.target.closest("[data-remove-gallery-item]");
      if (removeGalleryItemButton && isAdmin()) removeGalleryItem(removeGalleryItemButton.dataset.removeGalleryItem, removeGalleryItemButton.dataset.galleryItem);

      const gridToggle = event.target.closest("[data-grid-toggle]");
      if (gridToggle && document.body.classList.contains("admin-mode")) {
        setGridMode(!gridMode);
      }

      // ---- Support (Apoio) ----
      const openSup = event.target.closest("[data-open-support]");
      if (openSup) {
        event.preventDefault();
        openSupport(openSup.dataset.supportSection, openSup.dataset.openSupport);
        return;
      }
      const closeSup = event.target.closest("[data-close-support]");
      if (closeSup || event.target.id === "support-modal") { closeSupport(); return; }
      if (event.target.closest("#support-add-front") && isAdmin()) { addSupportCard("fronts"); return; }
      if (event.target.closest("#support-add-partner") && isAdmin()) { addSupportCard("partners"); return; }
      const supMove = event.target.closest("[data-support-move]");
      if (supMove && isAdmin()) { moveSupportCard(supMove.dataset.supportSection, supMove.dataset.supportId, supMove.dataset.supportMove); return; }
      const supPub = event.target.closest("[data-support-publish]");
      if (supPub && isAdmin()) { toggleSupportPublish(supPub.dataset.supportSection, supPub.dataset.supportPublish); return; }
      const supRem = event.target.closest("[data-support-remove]");
      if (supRem && isAdmin()) { removeSupportCard(supRem.dataset.supportSection, supRem.dataset.supportRemove); return; }
      const supShare = event.target.closest("[data-share-support]");
      if (supShare) { event.preventDefault(); shareSupport(supShare.dataset.supportSection, supShare.dataset.supportId); return; }
      const supTagAdd = event.target.closest("[data-support-tag-add]");
      if (supTagAdd && isAdmin()) { addSupportTag(supTagAdd.dataset.supportSection, supTagAdd.dataset.supportId); return; }
      const supTagRem = event.target.closest("[data-support-tag-remove]");
      if (supTagRem && isAdmin()) { removeSupportTag(supTagRem.dataset.supportSection, supTagRem.dataset.supportId, Number(supTagRem.dataset.tagIndex)); return; }
      const supTagMove = event.target.closest("[data-support-tag-move]");
      if (supTagMove && isAdmin()) { moveSupportTag(supTagMove.dataset.supportSection, supTagMove.dataset.supportId, Number(supTagMove.dataset.tagIndex), supTagMove.dataset.supportTagMove); return; }
      const supGalRem = event.target.closest("[data-support-gallery-remove]");
      if (supGalRem && isAdmin()) { removeSupportGalleryImage(supGalRem.dataset.supportSection, supGalRem.dataset.supportId, Number(supGalRem.dataset.galleryIndex)); return; }

      // ---- Static tag editor ----
      const stTagAdd = event.target.closest("[data-static-tag-add]");
      if (stTagAdd && isAdmin()) {
        const key = stTagAdd.dataset.tagKey;
        const tags = readStaticTags(key);
        tags.push("Nova tag");
        writeStaticTags(key, tags);
        renderStaticTags();
        return;
      }
      const stTagRem = event.target.closest("[data-static-tag-remove]");
      if (stTagRem && isAdmin()) {
        const key = stTagRem.dataset.tagKey;
        const tags = readStaticTags(key);
        tags.splice(Number(stTagRem.dataset.tagIndex), 1);
        writeStaticTags(key, tags);
        renderStaticTags();
        return;
      }
      const stTagMove = event.target.closest("[data-static-tag-move]");
      if (stTagMove && isAdmin()) {
        const key = stTagMove.dataset.tagKey;
        const tags = readStaticTags(key);
        const i = Number(stTagMove.dataset.tagIndex);
        const t = i + (stTagMove.dataset.staticTagMove === "up" ? -1 : 1);
        if (t >= 0 && t < tags.length) {
          const tmp = tags[i]; tags[i] = tags[t]; tags[t] = tmp;
          writeStaticTags(key, tags);
          renderStaticTags();
        }
        return;
      }

      setTimeout(syncStylePopoverLinkField, 0);
    });

    document.addEventListener("input", (event) => {
      const galleryField = event.target.closest("[data-gallery-field]");
      if (galleryField && isAdmin()) {
        updateGalleryCardField(galleryField.closest("[data-gallery-id]")?.dataset.galleryId, galleryField.dataset.galleryField, galleryField.textContent.trim());
      }

      const galleryModalField = event.target.closest("[data-gallery-modal-field]");
      if (galleryModalField && isAdmin()) {
        const field = galleryModalField.dataset.galleryModalField;
        const value = field === "intro" ? galleryModalField.textContent.trim() : galleryModalField.textContent.trim();
        updateGalleryCardField(galleryModalField.dataset.galleryId, field, value);
      }

      const galleryItemField = event.target.closest("[data-gallery-item-field]");
      if (galleryItemField && isAdmin()) {
        const cardId = galleryItemField.closest("[data-gallery-id]")?.dataset.galleryId;
        const itemId = galleryItemField.closest("[data-gallery-item-id]")?.dataset.galleryItemId;
        updateGalleryItemField(cardId, itemId, galleryItemField.dataset.galleryItemField, galleryItemField.textContent.trim());
      }

      const galleryItemInput = event.target.closest("[data-gallery-item-input]");
      if (galleryItemInput && isAdmin()) {
        updateGalleryItemInput(
          galleryItemInput.dataset.galleryId,
          galleryItemInput.dataset.galleryItem,
          galleryItemInput.dataset.galleryItemInput,
          galleryItemInput.value
        );
      }

      // Support contenteditable fields
      const supField = event.target.closest("[data-support-field]");
      if (supField && isAdmin()) {
        updateSupportField(supField.dataset.supportSection, supField.dataset.supportId, supField.dataset.supportField, supField.textContent.trim());
      }
      // Support tag text
      const supTagText = event.target.closest("[data-support-tag-text]");
      if (supTagText && isAdmin()) {
        updateSupportTagText(supTagText.dataset.supportSection, supTagText.dataset.supportId, Number(supTagText.dataset.tagIndex), supTagText.textContent.trim());
      }
      // Support links/docs textareas
      const supLinks = event.target.closest("[data-support-links]");
      if (supLinks && isAdmin()) {
        updateSupportField(supLinks.dataset.supportSection, supLinks.dataset.supportId, "links", textToLinks(supLinks.value));
      }
      const supDocs = event.target.closest("[data-support-docs]");
      if (supDocs && isAdmin()) {
        updateSupportField(supDocs.dataset.supportSection, supDocs.dataset.supportId, "docs", textToLinks(supDocs.value));
      }
      // Static tag text
      const stTagText = event.target.closest("[data-static-tag-text]");
      if (stTagText && isAdmin()) {
        queueStaticTagWrite(
          stTagText.dataset.tagKey,
          Number(stTagText.dataset.tagIndex),
          sanitizeStaticTag(stTagText.textContent),
        );
      }
    });

    document.addEventListener("change", (event) => {
      if (event.target.matches("[data-page-photo]")) handlePagePhotoUpload(event.target);
      if (event.target.matches("[data-gallery-cover], [data-gallery-item-image]")) handleGalleryImageUpload(event.target);
      if (event.target.matches("[data-episode-thumb-input]")) handleEpisodeThumbUpload(event.target);
      if (event.target.matches("[data-support-image], [data-support-gallery-add]")) handleSupportImageUpload(event.target);
    });

    window.addEventListener("resize", queueEnhance);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && selectedModular) {
        clearModularSelection();
      }
      const lb = document.getElementById("gallery-lightbox");
      if (lb && lb.classList.contains("is-open")) {
        if (event.key === "Escape") { closeLightbox(); return; }
        if (event.key === "ArrowLeft") { moveLightbox(-1); return; }
        if (event.key === "ArrowRight") { moveLightbox(1); return; }
        return;
      }
      const modal = document.getElementById("gallery-modal");
      if (event.key === "Escape" && modal && modal.classList.contains("is-open")) {
        closeGalleryModal();
      }
      const supModal = document.getElementById("support-modal");
      if (event.key === "Escape" && supModal && supModal.classList.contains("is-open")) {
        closeSupport();
      }
    });

    document.addEventListener("pointermove", (event) => {
      if (popoverDrag) {
        const popover = document.getElementById("style-popover");
        if (!popover) return;
        const nextLeft = Math.max(12, popoverDrag.left + (event.clientX - popoverDrag.x));
        const nextTop = Math.max(12, popoverDrag.top + (event.clientY - popoverDrag.y));
        popover.style.left = `${nextLeft}px`;
        popover.style.top = `${nextTop}px`;
        setState(STYLE_POPOVER_POSITION_KEY, { left: nextLeft, top: nextTop });
        return;
      }

      if (!activeDrag) return;
      const dx = activeDrag.originX + (event.clientX - activeDrag.startX);
      const dy = activeDrag.originY + (event.clientY - activeDrag.startY);
      activeDrag.element.style.translate = `${dx}px ${dy}px`;
      activeDrag.lastX = dx;
      activeDrag.lastY = dy;
    });

    document.addEventListener("pointerup", () => {
      const popover = document.getElementById("style-popover");
      if (popover) popover.classList.remove("is-dragging");
      popoverDrag = null;

      if (!activeDrag) return;
      const unit = gridUnitPx();
      const nextX = Math.round((activeDrag.lastX || 0) / unit) * unit;
      const nextY = Math.round((activeDrag.lastY || 0) / unit) * unit;
      activeDrag.element.style.translate = `${nextX}px ${nextY}px`;
      const state = layoutState();
      state[dragKey(activeDrag.element)] = { x: nextX, y: nextY };
      saveLayoutState(state);
      activeDrag = null;
    });

    document.addEventListener("pointerdown", (event) => {
      if (!gridMode || !isAdmin()) {
        if (selectedModular) clearModularSelection();
        return;
      }
      if (event.target && typeof event.target.closest === "function"
        && event.target.closest(MODULAR_IGNORE_SELECTOR)) return;
      const target = resolveModularTarget(event.target);
      if (!target) {
        clearModularSelection();
        return;
      }
      event.preventDefault();
      selectModular(target);
      const current = readDragPosition(target) || { x: 0, y: 0 };
      activeDrag = {
        element: target,
        startX: event.clientX,
        startY: event.clientY,
        originX: current.x,
        originY: current.y,
        lastX: current.x,
        lastY: current.y
      };
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    bindGlobalEvents();
    queueEnhance();
    observer = new MutationObserver(queueEnhance);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  }

  if (typeof window !== "undefined") {
    window.PQOQEditorPlusInit = init;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else setTimeout(init, 0);
  }
})();
