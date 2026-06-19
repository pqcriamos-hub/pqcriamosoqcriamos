(() => {
  const STORAGE_PREFIX = "pqoq-site:";
  const GALLERY_KEY = "gallery-cards";
  const PAGE_PHOTOS_KEY = "page-photos";
  const LINK_STATE_KEY = "link-state";
  const LAYOUT_STATE_KEY = "layout-state";
  const STYLE_POPOVER_POSITION_KEY = "style-popover-position";
  const GRID_UNIT_SELECTOR = ".layout-grid-overlay";
  const MODULAR_SELECTOR = [
    "main .section",
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
    "header .nav a"
  ].join(", ");

  const galleryDefaults = [
    {
      id: "gallery-recordings",
      meta: "Bastidores",
      title: "Gravacoes",
      description: "Registros do set, do Espaco Colaborar e da equipe em processo.",
      intro: "Use esta galeria para reunir making of, disposicao do set, montagem de luz, registros de ensaio, capturas da conversa e memoria de producao.",
      coverImage: "",
      items: [
        { id: "recording-set", title: "Set de gravacao", caption: "Mesa, enquadramento, luz e atmosfera do episodio.", credit: "Bastidores", link: "", image: "" },
        { id: "recording-process", title: "Processo de conversa", caption: "Trechos do encontro, anotacoes, roteiro e material de apoio.", credit: "Processo", link: "", image: "" }
      ]
    },
    {
      id: "gallery-covers",
      meta: "Identidade visual",
      title: "Capas",
      description: "Artes dos episodios, thumbnails e pecas graficas do projeto.",
      intro: "Aqui entram capas principais, thumbnails, pecas para redes, cartazes de circulacao e variacoes visuais de cada temporada.",
      coverImage: "",
      items: [
        { id: "cover-main", title: "Capa do episodio", caption: "Arte principal usada no streaming, no feed e no arquivo do projeto.", credit: "Design", link: "", image: "" },
        { id: "cover-social", title: "Peca para divulgacao", caption: "Recortes visuais para stories, cartazes, reels e posts de circulacao.", credit: "Rede", link: "", image: "" }
      ]
    },
    {
      id: "gallery-works",
      meta: "Acervo de artistas",
      title: "Obras",
      description: "Imagens, processos e fragmentos visuais ligados a cada convidado.",
      intro: "Organize obras, fragmentos, documentos, estudos, fotografias de processo e materiais enviados pelos artistas convidados.",
      coverImage: "",
      items: [
        { id: "works-piece", title: "Obra principal", caption: "Imagem de destaque do artista ou do episodio relacionado.", credit: "Acervo", link: "", image: "" },
        { id: "works-process", title: "Processo criativo", caption: "Rascunho, detalhe, textura, fragmento ou documento de processo.", credit: "Memoria", link: "", image: "" }
      ]
    }
  ];

  let initialized = false;
  let observer = null;
  let enhanceQueued = false;
  let gridMode = false;
  let activeDrag = null;
  let popoverDrag = null;

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

  function currentPage() {
    return document.body.dataset.page || "page";
  }

  function normalizeGalleryItem(item, index) {
    return {
      id: item.id || assetId(`gallery-item-${index + 1}`),
      title: item.title || `Item ${index + 1}`,
      caption: item.caption || "Legenda editavel do item da galeria.",
      credit: item.credit || "Acervo",
      link: item.link || "",
      image: item.image || ""
    };
  }

  function galleryCards() {
    const list = getState(GALLERY_KEY, galleryDefaults);
    return list.map((card, index) => ({
      id: card.id || `gallery-card-${index + 1}`,
      meta: card.meta || "Nova categoria",
      title: card.title || `Nova galeria ${index + 1}`,
      description: card.description || "Descricao editavel da galeria.",
      intro: card.intro || "Apresentacao editavel da galeria.",
      coverImage: card.coverImage || "",
      items: Array.isArray(card.items) ? card.items.map(normalizeGalleryItem) : []
    }));
  }

  function saveGalleryCards(list) {
    setState(GALLERY_KEY, list);
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
      enhancePage();
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
    const key = input.dataset.pagePhoto;
    const file = input.files?.[0];
    if (!key || !file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const state = pagePhotos();
      state[key] = String(reader.result || "");
      savePagePhotos(state);
      applyPagePhotos();
    });
    reader.readAsDataURL(file);
  }

  function galleryCardTemplate(card) {
    const coverStyle = card.coverImage ? ` style="background-image:url('${escapeHtml(card.coverImage)}')"` : "";
    return `
      <article class="card gallery-card gallery-card-plus" data-gallery-id="${card.id}">
        <button class="gallery-thumb gallery-card-open" type="button" data-open-gallery="${card.id}"${coverStyle}></button>
        <div class="meta" data-gallery-field="meta">${escapeHtml(card.meta)}</div>
        <h3 data-gallery-field="title">${escapeHtml(card.title)}</h3>
        <p data-gallery-field="description">${escapeHtml(card.description)}</p>
        <div class="artist-actions gallery-card-actions">
          <button class="button primary small" type="button" data-open-gallery="${card.id}">Abrir galeria</button>
          <button class="button small admin-only" type="button" data-remove-gallery="${card.id}">Remover</button>
        </div>
      </article>
    `;
  }

  function renderGalleryCards() {
    const container = document.querySelector("[data-render-gallery-list]");
    if (!container) return;
    container.innerHTML = galleryCards().map(galleryCardTemplate).join("");
  }

  function ensureGalleryModal() {
    if (document.getElementById("gallery-modal")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal gallery-modal" id="gallery-modal" aria-hidden="true">
        <div class="modal-panel gallery-modal-panel">
          <div class="modal-head">
            <h2 id="gallery-modal-title">Galeria</h2>
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
    return `
      <article class="gallery-asset" data-gallery-id="${cardId}" data-gallery-item-id="${item.id}">
        <label class="gallery-asset-image"${imageStyle}>
          <span>${item.image ? "" : "Imagem"}</span>
          <input class="admin-only" type="file" accept="image/*" data-gallery-item-image="${cardId}" data-gallery-item="${item.id}" aria-label="Enviar imagem do item ${escapeHtml(item.title)}">
        </label>
        <div class="gallery-asset-copy">
          <div class="meta" data-gallery-item-field="credit">${escapeHtml(item.credit)}</div>
          <h3 data-gallery-item-field="title">${escapeHtml(item.title)}</h3>
          <p data-gallery-item-field="caption">${escapeHtml(item.caption)}</p>
          ${linkButton}
          <div class="admin-only admin-row compact">
            <label>Link de referencia
              <input type="url" value="${escapeHtml(item.link)}" data-gallery-item-link="${cardId}" data-gallery-item="${item.id}" placeholder="https://...">
            </label>
            <button class="button small" type="button" data-remove-gallery-item="${cardId}" data-gallery-item="${item.id}">Remover item</button>
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
    title.textContent = card.title;
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
        </div>
      </section>
      <section class="gallery-modal-section">
        <div class="gallery-modal-section-head">
          <h3>Acervo interno</h3>
          <div class="gallery-modal-hint">Sugestao de uso: obras, capas, bastidores, processo, documentos, links e memoria visual do episodio.</div>
        </div>
        <div class="admin-only gallery-modal-tools">
          <button class="button primary small" type="button" data-add-gallery-item="${card.id}">Adicionar item</button>
        </div>
        <div class="gallery-asset-grid">
          ${card.items.map((item) => galleryItemTemplate(card.id, item)).join("") || '<div class="empty-state">Nenhum item ainda.</div>'}
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

  function addGalleryCard() {
    const list = galleryCards();
    list.push({
      id: assetId("gallery"),
      meta: "Nova categoria",
      title: `Nova galeria ${list.length + 1}`,
      description: "Descricao editavel da galeria.",
      intro: "Apresentacao editavel da galeria.",
      coverImage: "",
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
      credit: "Acervo",
      link: "",
      image: ""
    });
    saveGalleryCards(list);
    renderGalleryModal(cardId);
    queueEnhance();
  }

  function removeGalleryItem(cardId, itemId) {
    const list = galleryCards();
    const card = list.find((entry) => entry.id === cardId);
    if (!card) return;
    card.items = card.items.filter((entry) => entry.id !== itemId);
    saveGalleryCards(list);
    renderGalleryModal(cardId);
    queueEnhance();
  }

  function handleGalleryImageUpload(input) {
    const cardId = input.dataset.galleryCover || input.dataset.galleryItemImage;
    const itemId = input.dataset.galleryItem;
    const file = input.files?.[0];
    if (!cardId || !file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const list = galleryCards();
      const card = list.find((entry) => entry.id === cardId);
      if (!card) return;
      if (input.dataset.galleryCover) {
        card.coverImage = String(reader.result || "");
      } else {
        const item = card.items.find((entry) => entry.id === itemId);
        if (item) item.image = String(reader.result || "");
      }
      saveGalleryCards(list);
      renderGalleryCards();
      renderGalleryModal(cardId);
      queueEnhance();
    });
    reader.readAsDataURL(file);
  }

  function syncGalleryModalEditability() {
    document.querySelectorAll("[data-gallery-field], [data-gallery-modal-field], [data-gallery-item-field]").forEach((element) => {
      element.contentEditable = isAdmin() ? "true" : "false";
      element.spellcheck = true;
    });
  }

  function enhanceEpisodeThumbs() {
    const embeds = episodeEmbeds();
    document.querySelectorAll(".episode-card[data-episode-id]").forEach((card) => {
      const episodeId = card.dataset.episodeId;
      const thumb = card.querySelector(".episode-thumb");
      if (!thumb || !episodeId) return;
      thumb.classList.add("episode-thumb-upload");
      const image = embeds[episodeId]?.thumbnail || "";
      thumb.style.backgroundImage = image ? `url("${image}")` : "";
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
    const episodeId = input.dataset.episodeThumbInput;
    const file = input.files?.[0];
    if (!episodeId || !file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const data = episodeEmbeds();
      data[episodeId] = data[episodeId] || {};
      data[episodeId].thumbnail = String(reader.result || "");
      saveEpisodeEmbeds(data);
      queueEnhance();
    });
    reader.readAsDataURL(file);
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
        <button class="button small" type="button" data-grid-toggle>Ativar grade</button>
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
  }

  function syncLayoutDock() {
    const button = document.querySelector("[data-grid-toggle]");
    if (button) button.textContent = gridMode ? "Desativar grade e salvar" : "Ativar grade";
  }

  function modularTargets() {
    return Array.from(document.querySelectorAll(MODULAR_SELECTOR)).filter((element) => (
      !element.closest(".editor-panel") &&
      !element.closest(".style-popover") &&
      !element.closest(".layout-dock") &&
      !element.closest(".modal")
    ));
  }

  function dragKey(element) {
    if (element.dataset.dragKey) return element.dataset.dragKey;
    const own = element.dataset.editable || element.dataset.pagePhotoBox || element.dataset.linkEditable || element.dataset.galleryId || element.dataset.episodeId || element.dataset.page || element.getAttribute("href") || element.textContent.trim().slice(0, 24) || element.tagName.toLowerCase();
    const key = `${currentPage()}:${element.tagName.toLowerCase()}:${own}:${Array.from(element.parentElement?.children || []).indexOf(element)}`;
    element.dataset.dragKey = key;
    return key;
  }

  function applyLayoutState() {
    const state = layoutState();
    modularTargets().forEach((element) => {
      const position = state[dragKey(element)];
      element.style.translate = position ? `${position.x}px ${position.y}px` : "";
    });
  }

  function setGridMode(enabled) {
    gridMode = enabled;
    document.body.classList.toggle("layout-grid-mode", enabled);
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
    enhanceEpisodeThumbs();
    fixYouTubePreview();
    ensureGalleryModal();
    ensureLayoutDock();
    attachPopoverDragging();
    restorePopoverPosition();
    applyLayoutState();
    syncLayoutDock();
  }

  function bindGlobalEvents() {
    document.addEventListener("click", (event) => {
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

      const removeGallery = event.target.closest("[data-remove-gallery]");
      if (removeGallery) removeGalleryCard(removeGallery.dataset.removeGallery);

      const addGalleryItemButton = event.target.closest("[data-add-gallery-item]");
      if (addGalleryItemButton && isAdmin()) addGalleryItem(addGalleryItemButton.dataset.addGalleryItem);

      const removeGalleryItemButton = event.target.closest("[data-remove-gallery-item]");
      if (removeGalleryItemButton && isAdmin()) removeGalleryItem(removeGalleryItemButton.dataset.removeGalleryItem, removeGalleryItemButton.dataset.galleryItem);

      const gridToggle = event.target.closest("[data-grid-toggle]");
      if (gridToggle && document.body.classList.contains("admin-mode")) {
        setGridMode(!gridMode);
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

      const galleryItemLink = event.target.closest("[data-gallery-item-link]");
      if (galleryItemLink && isAdmin()) {
        updateGalleryItemField(galleryItemLink.dataset.galleryItemLink, galleryItemLink.dataset.galleryItem, "link", galleryItemLink.value.trim());
      }
    });

    document.addEventListener("change", (event) => {
      if (event.target.matches("[data-page-photo]")) handlePagePhotoUpload(event.target);
      if (event.target.matches("[data-gallery-cover], [data-gallery-item-image]")) handleGalleryImageUpload(event.target);
      if (event.target.matches("[data-episode-thumb-input]")) handleEpisodeThumbUpload(event.target);
    });

    window.addEventListener("resize", queueEnhance);

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
      if (!gridMode || !isAdmin()) return;
      const target = event.target.closest(MODULAR_SELECTOR);
      if (!target || target.closest(".modal, .style-popover, .layout-dock, .editor-panel")) return;
      event.preventDefault();
      const current = layoutState()[dragKey(target)] || { x: 0, y: 0 };
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
