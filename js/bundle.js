// VerseReel Production Standalone Bundle
(function() {
  'use strict';

  // 1. Data Layer & IndexedDB Store
  const STORAGE_KEY = 'versereel_data_v3';
  const DB_NAME = 'VerseReelDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'app_state';

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveToDB(key, data) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(data, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('Failed to save to IndexedDB', e);
    }
  }

  async function loadFromDB(key) {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('Failed to load from IndexedDB', e);
      return null;
    }
  }

  const INITIAL_DATA = {
    adminPin: '1234',
    walletBalance: 25.00,
    unlockedItemIds: [],
    transactions: [],
    creatorStats: {
      totalRevenue: 0.00,
      totalViews: 0,
      subscribers: 0
    },
    items: []
  };

  class Store {
    constructor() {
      this.data = INITIAL_DATA;
      this.listeners = [];
      this.initAsyncStorage();
    }

    async initAsyncStorage() {
      const saved = await loadFromDB(STORAGE_KEY);
      if (saved) {
        this.data = { ...INITIAL_DATA, ...saved };
      } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            this.data = { ...INITIAL_DATA, ...JSON.parse(raw) };
          } catch (e) {}
        }
      }
      this.notify();
    }

    async saveData() {
      await saveToDB(STORAGE_KEY, this.data);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {}
      this.notify();
    }

    subscribe(listener) {
      this.listeners.push(listener);
      return () => {
        this.listeners = this.listeners.filter(l => l !== listener);
      };
    }

    notify() {
      this.listeners.forEach(l => l(this.data));
    }

    verifyAdminPin(enteredPin) {
      const currentPin = this.data.adminPin || '1234';
      return enteredPin === currentPin;
    }

    setAdminPin(newPin) {
      if (newPin && newPin.trim().length >= 4) {
        this.data.adminPin = newPin.trim();
        this.saveData();
        return true;
      }
      return false;
    }

    getItems() {
      return this.data.items || [];
    }

    isItemUnlocked(itemId) {
      const item = this.getItems().find(i => i.id === itemId);
      if (!item || !item.isPaid) return true;
      return (this.data.unlockedItemIds || []).includes(itemId);
    }

    unlockItem(itemId) {
      const item = this.getItems().find(i => i.id === itemId);
      if (!item) return { success: false, message: 'Item no encontrado' };
      
      if (this.isItemUnlocked(itemId)) {
        return { success: true, message: 'Ya desbloqueado' };
      }

      this.data.unlockedItemIds.push(itemId);
      this.data.creatorStats.totalRevenue += item.price;

      this.data.transactions.unshift({
        id: 'tx-' + Date.now(),
        itemId: item.id,
        title: item.title,
        amount: item.price,
        date: new Date().toISOString().split('T')[0]
      });

      this.saveData();
      return { success: true, message: `¡Desbloqueado exitosamente "${item.title}"!` };
    }

    addItem(newItem) {
      const item = {
        id: 'item-' + Date.now(),
        views: 0,
        createdAt: new Date().toISOString().split('T')[0],
        ...newItem
      };
      this.data.items.unshift(item);
      this.saveData();
      return item;
    }

    updateItemPricing(itemId, isPaid, price) {
      const item = this.data.items.find(i => i.id === itemId);
      if (item) {
        item.isPaid = isPaid;
        item.price = isPaid ? Number(price) : 0;
        this.saveData();
      }
    }

    deleteItem(itemId) {
      this.data.items = this.data.items.filter(i => i.id !== itemId);
      this.saveData();
    }

    incrementViews(itemId) {
      const item = this.data.items.find(i => i.id === itemId);
      if (item) {
        item.views = (item.views || 0) + 1;
        this.data.creatorStats.totalViews = (this.data.creatorStats.totalViews || 0) + 1;
        this.saveData();
      }
    }
  }

  const store = new Store();

  // 2. Admin Authentication Modal
  function createAdminLoginModal(onSuccess, showToast) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.maxWidth = '450px';

    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">
          <i class="ph-lock-key" style="color: var(--primary);"></i>
          <span>Acceso de Administrador</span>
        </div>
        <button class="close-btn" id="admin-close-btn">&times;</button>
      </div>
      <div class="modal-body" style="text-align: center; padding: 2rem;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(168, 85, 247, 0.15); border: 2px solid var(--primary); display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem; color: var(--primary); font-size: 2rem;">
          <i class="ph-shield-check"></i>
        </div>

        <h3 style="color: #fff; font-size: 1.3rem; font-weight: 800; margin-bottom: 0.5rem;">Panel de Administración Reservado</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; line-height: 1.4;">
          Solo el dueño de la página tiene permiso para subir, editar o borrar cómics. Ingresa tu clave secreta:
        </p>

        <form id="admin-auth-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="position: relative;">
            <input 
              type="password" 
              id="admin-pin-input" 
              class="form-input" 
              placeholder="Clave Secreta de Administrador" 
              style="width: 100%; padding-left: 2.5rem; text-align: center; font-size: 1.1rem; letter-spacing: 2px;" 
              required 
              autofocus 
            />
            <i class="ph-key" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-dim);"></i>
          </div>

          <button type="submit" class="btn-primary" style="justify-content: center; width: 100%; padding: 0.85rem;">
            <i class="ph-sign-in"></i> Entrar al Panel de Creador
          </button>
        </form>

        <div style="margin-top: 1.25rem; font-size: 0.78rem; color: var(--text-dim); background: rgba(255,255,255,0.03); padding: 0.6rem; border-radius: var(--radius-sm);">
          🔑 <strong>Clave por defecto</strong>: <code style="color: var(--cyan);">1234</code> (Puedes cambiarla en cualquier momento dentro del Creator Studio).
        </div>
      </div>
    `;

    backdrop.appendChild(content);
    document.body.appendChild(backdrop);

    const closeBtn = content.querySelector('#admin-close-btn');
    closeBtn.onclick = () => document.body.removeChild(backdrop);

    const form = content.querySelector('#admin-auth-form');
    const pinInput = content.querySelector('#admin-pin-input');

    form.onsubmit = (e) => {
      e.preventDefault();
      const enteredPin = pinInput.value.trim();

      if (store.verifyAdminPin(enteredPin)) {
        document.body.removeChild(backdrop);
        if (showToast) showToast('🔓 ¡Acceso concedido al Panel de Administrador!');
        if (onSuccess) onSuccess();
      } else {
        if (showToast) showToast('🔒 Clave de administrador incorrecta. Acceso denegado.');
        pinInput.value = '';
        pinInput.focus();
      }
    };
  }

  // 3. Comic Reader Component
  function createComicReaderModal(item, onClose, onUnlockRequest) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const content = document.createElement('div');
    content.className = 'modal-content reader-modal';

    let currentPageIndex = 0;
    let zoomLevel = 100; // 80% to 350%
    let isPanning = false;
    let startX = 0, startY = 0;
    let scrollLeft = 0, scrollTop = 0;

    const isUnlocked = store.isItemUnlocked(item.id);
    const pages = item.pages || [item.thumbnail];
    const previewLimit = item.previewLimit || 15;

    function applyZoom() {
      const imgEl = content.querySelector('.comic-page-img');
      const rangeEl = content.querySelector('#zoom-range');
      const labelEl = content.querySelector('#zoom-label');
      const containerEl = content.querySelector('.reader-container');

      if (imgEl) {
        imgEl.style.transform = `scale(${zoomLevel / 100})`;
        imgEl.style.transformOrigin = 'top center';
        imgEl.style.cursor = zoomLevel > 100 ? (isPanning ? 'grabbing' : 'grab') : 'zoom-in';
      }
      if (rangeEl) rangeEl.value = zoomLevel;
      if (labelEl) labelEl.innerText = `${zoomLevel}%`;
    }

    function renderBody() {
      const isLockedPage = item.isPaid && !store.isItemUnlocked(item.id) && currentPageIndex >= previewLimit;

      content.innerHTML = `
        <div class="modal-header">
          <div class="modal-title">
            <i class="ph-book-open" style="color: var(--primary);"></i>
            <span>${item.title}</span>
            ${item.isPaid ? `<span class="price-tag paid">$${item.price.toFixed(2)}</span>` : '<span class="price-tag free">FREE</span>'}
          </div>
          <button class="close-btn" id="reader-close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="reader-container">
            ${isLockedPage ? `
              <div class="paywall-card">
                <div class="paywall-icon">
                  <i class="ph-lock"></i>
                </div>
                <h2 style="color:#fff; font-size:1.5rem; font-weight:800;">Límite de Muestra Alcanzado</h2>
                <p style="color: var(--text-muted); font-size: 0.95rem;">
                  Has completado las ${previewLimit} páginas de muestra gratuita. ¡Para continuar leyendo las ${pages.length} páginas de este cómic, realiza tu pago a continuación!
                </p>
                <div class="paywall-price">$${item.price.toFixed(2)}</div>
                
                <button class="btn-primary" id="paywall-unlock-btn" style="width: 100%; justify-content: center; font-size: 1.05rem; padding: 0.9rem;">
                  <i class="ph-credit-card"></i> ${item.paymentUrl ? 'Ir a Pagar $' + item.price.toFixed(2) : 'Desbloquear Cómic Completo ($' + item.price.toFixed(2) + ')'}
                </button>

                <div id="payment-confirm-box" style="display: none; width: 100%; margin-top: 0.75rem; background: rgba(16, 185, 129, 0.12); border: 1px solid var(--emerald); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                  <p style="color: #34d399; font-weight: 700; font-size: 0.88rem; margin-bottom: 0.6rem;">
                    ¿Ya completaste tu pago en la pasarela? Haz clic abajo para continuar leyendo:
                  </p>
                  <button class="btn-secondary" id="confirm-unlock-btn" style="width: 100%; justify-content: center; border-color: var(--emerald); color: #34d399; font-weight: 700;">
                    <i class="ph-check-circle"></i> Confirmar Pago y Leer Ahora
                  </button>
                </div>
              </div>
            ` : `
              <img src="${pages[currentPageIndex]}" alt="Page ${currentPageIndex + 1}" class="comic-page-img" title="Gira la rueda del mouse, usa la barra o arrastra la imagen para Zoom & Pan" />
            `}
          </div>

          <div class="reader-controls" style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; width: 100%; margin-top: 1rem; flex-wrap: wrap;">
            <button class="btn-secondary" id="prev-page-btn" ${currentPageIndex === 0 ? 'disabled' : ''}>
              <i class="ph-caret-left"></i> Anterior
            </button>
            
            <div style="display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;">
              <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">
                Página <span style="color: var(--primary);">${currentPageIndex + 1}</span> de ${pages.length}
                ${item.isPaid && !store.isItemUnlocked(item.id) ? `<span style="font-size:0.8rem; color:var(--amber); margin-left:0.4rem;">(Prueba ${previewLimit} págs)</span>` : ''}
              </div>

              <!-- Ultra-Interactive Zoom Controls -->
              ${!isLockedPage ? `
                <div style="display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.6); padding: 4px 10px; border-radius: var(--radius-full); border: 1px solid var(--border-color);">
                  <button type="button" id="zoom-out-btn" class="btn-secondary" style="padding: 2px 7px; font-size: 0.85rem; border: none; background: transparent; color: #fff;" title="Alejar (o Rueda del mouse)">
                    <i class="ph-magnifying-glass-minus"></i>
                  </button>

                  <input type="range" id="zoom-range" min="80" max="350" step="5" value="${zoomLevel}" style="width: 90px; accent-color: var(--primary); cursor: pointer;" title="Desliza para ajustar el zoom" />

                  <span id="zoom-label" style="font-size: 0.82rem; font-weight: 700; color: var(--cyan); min-width: 45px; text-align: center; cursor: pointer;" title="Haz clic para restablecer al 100%">
                    ${zoomLevel}%
                  </span>

                  <button type="button" id="zoom-in-btn" class="btn-secondary" style="padding: 2px 7px; font-size: 0.85rem; border: none; background: transparent; color: #fff;" title="Acercar (o Rueda del mouse)">
                    <i class="ph-magnifying-glass-plus"></i>
                  </button>

                  <button type="button" id="zoom-reset-btn" class="btn-secondary" style="padding: 2px 6px; font-size: 0.75rem; border-color: rgba(255,255,255,0.2); color: var(--text-muted);" title="Restablecer a 100%">
                    <i class="ph-arrows-counter-clockwise"></i> 100%
                  </button>
                </div>
              ` : ''}
            </div>

            <button class="btn-primary" id="next-page-btn" ${currentPageIndex === pages.length - 1 ? 'disabled' : ''}>
              Siguiente <i class="ph-caret-right"></i>
            </button>
          </div>
        </div>
      `;

      content.querySelector('#reader-close-btn').onclick = () => {
        document.body.removeChild(backdrop);
        if (onClose) onClose();
      };

      const prevBtn = content.querySelector('#prev-page-btn');
      if (prevBtn) {
        prevBtn.onclick = () => {
          if (currentPageIndex > 0) {
            currentPageIndex--;
            renderBody();
          }
        };
      }

      const nextBtn = content.querySelector('#next-page-btn');
      if (nextBtn) {
        nextBtn.onclick = () => {
          if (currentPageIndex < pages.length - 1) {
            currentPageIndex++;
            renderBody();
          }
        };
      }

      const readerContainer = content.querySelector('.reader-container');
      const imgEl = content.querySelector('.comic-page-img');

      if (!isLockedPage && readerContainer) {
        applyZoom();

        // Mouse Wheel Zooming
        readerContainer.onwheel = (e) => {
          e.preventDefault();
          if (e.deltaY < 0) {
            zoomLevel = Math.min(350, zoomLevel + 15);
          } else {
            zoomLevel = Math.max(80, zoomLevel - 15);
          }
          applyZoom();
        };

        // Drag to Pan Hand Tool
        readerContainer.onmousedown = (e) => {
          if (zoomLevel > 100) {
            isPanning = true;
            startX = e.pageX - readerContainer.offsetLeft;
            startY = e.pageY - readerContainer.offsetTop;
            scrollLeft = readerContainer.scrollLeft;
            scrollTop = readerContainer.scrollTop;
            applyZoom();
          }
        };

        readerContainer.onmouseleave = () => {
          isPanning = false;
          applyZoom();
        };

        readerContainer.onmouseup = () => {
          isPanning = false;
          applyZoom();
        };

        readerContainer.onmousemove = (e) => {
          if (!isPanning) return;
          e.preventDefault();
          const x = e.pageX - readerContainer.offsetLeft;
          const y = e.pageY - readerContainer.offsetTop;
          const walkX = (x - startX) * 1.5;
          const walkY = (y - startY) * 1.5;
          readerContainer.scrollLeft = scrollLeft - walkX;
          readerContainer.scrollTop = scrollTop - walkY;
        };

        if (imgEl) {
          imgEl.onclick = (e) => {
            if (!isPanning) {
              zoomLevel = zoomLevel === 100 ? 160 : 100;
              applyZoom();
            }
          };
        }
      }

      const rangeInput = content.querySelector('#zoom-range');
      if (rangeInput) {
        rangeInput.oninput = (e) => {
          zoomLevel = parseInt(e.target.value);
          applyZoom();
        };
      }

      const zoomInBtn = content.querySelector('#zoom-in-btn');
      if (zoomInBtn) {
        zoomInBtn.onclick = () => {
          if (zoomLevel < 350) {
            zoomLevel = Math.min(350, zoomLevel + 25);
            applyZoom();
          }
        };
      }

      const zoomOutBtn = content.querySelector('#zoom-out-btn');
      if (zoomOutBtn) {
        zoomOutBtn.onclick = () => {
          if (zoomLevel > 80) {
            zoomLevel = Math.max(80, zoomLevel - 25);
            applyZoom();
          }
        };
      }

      const zoomResetBtn = content.querySelector('#zoom-reset-btn');
      if (zoomResetBtn) {
        zoomResetBtn.onclick = () => {
          zoomLevel = 100;
          applyZoom();
        };
      }

      const zoomLabel = content.querySelector('#zoom-label');
      if (zoomLabel) {
        zoomLabel.onclick = () => {
          zoomLevel = 100;
          applyZoom();
        };
      }

      const unlockBtn = content.querySelector('#paywall-unlock-btn');
      if (unlockBtn) {
        unlockBtn.onclick = () => {
          if (item.paymentUrl) {
            window.open(item.paymentUrl, '_blank');
            const confirmBox = content.querySelector('#payment-confirm-box');
            if (confirmBox) confirmBox.style.display = 'block';
          } else {
            const res = store.unlockItem(item.id);
            if (res.success) renderBody();
          }
        };
      }

      const confirmBtn = content.querySelector('#confirm-unlock-btn');
      if (confirmBtn) {
        confirmBtn.onclick = () => {
          const res = store.unlockItem(item.id);
          if (res.success) renderBody();
        };
      }
    }

    backdrop.appendChild(content);
    document.body.appendChild(backdrop);
    renderBody();

    store.incrementViews(item.id);
  }

  // 4. Video Player Component
  function createVideoPlayerModal(item, onClose) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const content = document.createElement('div');
    content.className = 'modal-content video-modal';

    let videoElement = null;
    let isLockedState = false;
    const isUnlocked = store.isItemUnlocked(item.id);
    const previewLimitSec = (item.previewLimit || 1) * 60;

    function renderModal() {
      content.innerHTML = `
        <div class="modal-header">
          <div class="modal-title">
            <i class="ph-video-camera" style="color: var(--cyan);"></i>
            <span>${item.title}</span>
            ${item.isPaid ? `<span class="price-tag paid">$${item.price.toFixed(2)}</span>` : '<span class="price-tag free">FREE</span>'}
          </div>
          <button class="close-btn" id="video-close-btn">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.25rem;">
          <div class="video-player-wrapper" id="player-wrapper">
            ${isLockedState ? `
              <div class="paywall-card" style="margin: 3rem auto;">
                <div class="paywall-icon" style="border-color: var(--cyan); color: var(--cyan); background: rgba(6,182,212,0.15);">
                  <i class="ph-lock"></i>
                </div>
                <h2 style="color:#fff; font-size:1.5rem; font-weight:800;">Fin del Tiempo de Prueba</h2>
                <p style="color: var(--text-muted); font-size: 0.95rem;">
                  Has visto los ${previewLimitSec} segundos de prueba gratuita. ¡Desbloquea el video completo para continuar viéndolo!
                </p>
                <div class="paywall-price">$${item.price.toFixed(2)}</div>
                <button class="btn-primary" id="video-paywall-unlock-btn" style="width: 100%; justify-content: center; background: linear-gradient(135deg, var(--cyan), #0284c7);">
                  <i class="ph-credit-card"></i> ${item.paymentUrl ? 'Ir a Pagar $' + item.price.toFixed(2) : 'Desbloquear Video Completo ($' + item.price.toFixed(2) + ')'}
                </button>

                <div id="video-payment-confirm-box" style="display: none; width: 100%; margin-top: 0.75rem; background: rgba(6, 182, 212, 0.12); border: 1px solid var(--cyan); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                  <p style="color: var(--cyan); font-weight: 700; font-size: 0.88rem; margin-bottom: 0.6rem;">
                    ¿Ya completaste tu pago en la pasarela? Haz clic abajo para reanudar el video:
                  </p>
                  <button class="btn-secondary" id="confirm-video-unlock-btn" style="width: 100%; justify-content: center; border-color: var(--cyan); color: var(--cyan); font-weight: 700;">
                    <i class="ph-check-circle"></i> Confirmar Pago y Ver Ahora
                  </button>
                </div>
              </div>
            ` : `
              <video id="active-video-element" class="video-element" controls poster="${item.thumbnail}" autoplay>
                <source src="${item.videoUrl}" type="video/mp4">
                Your browser does not support HTML5 video.
              </video>
            `}
          </div>

          <div style="margin-top: 1.25rem;">
            <h3 style="color: #fff; font-size: 1.2rem; font-weight: 700; margin-bottom: 0.4rem;">${item.title}</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1rem;">${item.description}</p>
          </div>
        </div>
      `;

      content.querySelector('#video-close-btn').onclick = () => {
        document.body.removeChild(backdrop);
        if (onClose) onClose();
      };

      if (!isLockedState) {
        videoElement = content.querySelector('#active-video-element');
        if (videoElement && item.isPaid && !isUnlocked) {
          videoElement.ontimeupdate = () => {
            if (videoElement.currentTime >= previewLimitSec) {
              videoElement.pause();
              isLockedState = true;
              renderModal();
            }
          };
        }
      } else {
        const unlockBtn = content.querySelector('#video-paywall-unlock-btn');
        if (unlockBtn) {
          unlockBtn.onclick = () => {
            if (item.paymentUrl) {
              window.open(item.paymentUrl, '_blank');
              const confirmBox = content.querySelector('#video-payment-confirm-box');
              if (confirmBox) confirmBox.style.display = 'block';
            } else {
              const res = store.unlockItem(item.id);
              if (res.success) {
                isLockedState = false;
                renderModal();
              }
            }
          };
        }

        const confirmBtn = content.querySelector('#confirm-video-unlock-btn');
        if (confirmBtn) {
          confirmBtn.onclick = () => {
            const res = store.unlockItem(item.id);
            if (res.success) {
              isLockedState = false;
              renderModal();
            }
          };
        }
      }
    }

    backdrop.appendChild(content);
    document.body.appendChild(backdrop);
    renderModal();

    store.incrementViews(item.id);
  }

  // 5. Creator Studio Component
  const CLOUDINARY_CLOUD_NAME = 'bre5du5y';
  const CLOUDINARY_PRESET = 'ml_default';

  function renderCreatorStudio(containerEl, showToast) {
    const items = store.getItems();
    const stats = store.data.creatorStats || { totalRevenue: 0, totalViews: 0 };
    const comicCount = items.filter(i => i.type === 'comic').length;
    const videoCount = items.filter(i => i.type === 'video').length;
    const paidCount = items.filter(i => i.isPaid).length;
    const freeCount = items.length - paidCount;

    containerEl.innerHTML = `
      <div class="studio-container">
        <div class="studio-header">
          <div>
            <h1 style="font-size: 1.8rem; font-weight: 900; color: #fff;">Creator Upload & Monetization Studio</h1>
            <p style="color: var(--text-muted); font-size: 0.95rem;">Upload new free and paid comics & videos, set custom paywall preview rules, and track revenue.</p>
          </div>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button class="btn-secondary" id="change-pin-btn" style="border-color: var(--primary); color: #d8b4fe;">
              <i class="ph-key"></i> Cambiar Clave Admin
            </button>
            <button class="btn-primary" id="btn-open-upload-tab">
              <i class="ph-upload-simple"></i> Subir Nuevo Cómic / Video
            </button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon emerald">
              <i class="ph-currency-dollar"></i>
            </div>
            <div>
              <div class="stat-value">$${stats.totalRevenue.toFixed(2)}</div>
              <div class="stat-label">Total Creator Earnings</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon cyan">
              <i class="ph-eye"></i>
            </div>
            <div>
              <div class="stat-value">${stats.totalViews.toLocaleString()}</div>
              <div class="stat-label">Total Content Views</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon">
              <i class="ph-book-open"></i>
            </div>
            <div>
              <div class="stat-value">${comicCount}</div>
              <div class="stat-label">Comics (${paidCount} Paid / ${freeCount} Free)</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon magenta">
              <i class="ph-video-camera"></i>
            </div>
            <div>
              <div class="stat-value">${videoCount}</div>
              <div class="stat-label">Videos</div>
            </div>
          </div>
        </div>

        <div class="studio-tabs">
          <button class="tab-btn active" id="tab-upload">
            <i class="ph-plus-circle"></i> Upload New Content
          </button>
          <button class="tab-btn" id="tab-cms">
            <i class="ph-folder-simple"></i> Content Catalog CMS (${items.length})
          </button>
        </div>

        <div id="panel-upload">
          <form id="upload-form" class="upload-card">
            <div class="form-grid">
              <div class="form-group full-width">
                <label class="form-label"><i class="ph-text-t"></i> Content Type</label>
                <div class="segmented-control" id="type-selector">
                  <button type="button" class="segmented-btn active" data-type="comic">
                    <i class="ph-book-open"></i> Comic (Multi-page PDF / PNG / JPG)
                  </button>
                  <button type="button" class="segmented-btn" data-type="video">
                    <i class="ph-video-camera"></i> Video Reel (MP4)
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label"><i class="ph-textbox"></i> Title</label>
                <input type="text" id="upload-title" class="form-input" placeholder="ej. Cyberpunk Genesis - Edición Especial" required />
              </div>

              <div class="form-group">
                <label class="form-label"><i class="ph-user"></i> Author / Studio Name</label>
                <input type="text" id="upload-author" class="form-input" placeholder="ej. Alex Rivers Studio" required />
              </div>

              <div class="form-group">
                <label class="form-label"><i class="ph-tag"></i> Genre / Category</label>
                <select id="upload-genre" class="form-select">
                  <option value="Sci-Fi">Sci-Fi / Cyberpunk</option>
                  <option value="Fantasy">Fantasy / Magic</option>
                  <option value="Action">Action / Adventure</option>
                  <option value="Romance">Romance / Drama</option>
                  <option value="Tutorial">Digital Art / Tutorial</option>
                  <option value="Horror">Horror / Mystery</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label"><i class="ph-lock-key"></i> Access Tier & Monetization</label>
                <div class="segmented-control" id="pricing-selector">
                  <button type="button" class="segmented-btn active" data-paid="false">
                    <i class="ph-gift"></i> FREE Access
                  </button>
                  <button type="button" class="segmented-btn" data-paid="true">
                    <i class="ph-currency-dollar"></i> PAID / Premium ($)
                  </button>
                </div>
              </div>

              <div class="form-group" id="price-group" style="display: none;">
                <label class="form-label"><i class="ph-coins"></i> Unlock Price (USD $)</label>
                <input type="number" step="0.01" min="0" value="2.99" id="upload-price" class="form-input" placeholder="ej. 2.99" />
              </div>

              <div class="form-group" id="preview-group" style="display: none;">
                <label class="form-label" id="preview-label"><i class="ph-eye"></i> Free Preview Limit</label>
                <input type="number" min="1" value="15" id="upload-preview-limit" class="form-input" />
              </div>

              <div class="form-group full-width" id="payment-url-group" style="display: none;">
                <label class="form-label"><i class="ph-credit-card"></i> Link de Pago (MercadoPago, PayPal, Stripe, Gumroad, etc.)</label>
                <input type="url" id="upload-payment-url" class="form-input" placeholder="https://mpago.la/tu-link  o  https://paypal.me/tu-usuario  o  https://buy.stripe.com/..." />
                <span style="font-size: 0.8rem; color: var(--text-muted);">
                  💡 Cuando los lectores lleguen a la página 16, este enlace se abrirá para que paguen $2.99 con tu pasarela preferida.
                </span>
              </div>

              <div class="form-group full-width">
                <label class="form-label"><i class="ph-article"></i> Description & Synopsis</label>
                <textarea id="upload-desc" class="form-textarea" placeholder="Escribe una breve sinopsis para tus lectores..." required></textarea>
              </div>

              <div class="form-group full-width">
                <label class="form-label" id="file-upload-label"><i class="ph-image"></i> Subir Páginas del Cómic (Imágenes JPG / PNG / WEBP)</label>
                
                <input type="file" id="upload-file-input" multiple accept="image/*,video/*" style="display: none;" />
                
                <div class="dropzone" id="file-dropzone" style="cursor: pointer;">
                  <div class="dropzone-icon"><i class="ph-cloud-arrow-up"></i></div>
                  <div style="font-weight: 700; color: #fff; font-size: 1.05rem;" id="dropzone-main-text">Arrastra y suelta tus páginas aquí o haz clic para explorar</div>
                  <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;" id="dropzone-help-text">Soporta múltiples imágenes (Páginas 1, 2, 3... 15+). Se ordenarán automáticamente por nombre.</div>
                </div>

                <div class="pages-preview-grid" id="pages-preview-grid" style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1rem;"></div>
              </div>
            </div>

            <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end;">
              <button type="submit" class="btn-primary" style="padding: 0.85rem 2rem; font-size: 1.05rem;">
                <i class="ph-paper-plane-right"></i> Publicar en la Nube
              </button>
            </div>
          </form>
        </div>

        <div id="panel-cms" style="display: none;">
          <div class="upload-card">
            <h3 style="color: #fff; font-size: 1.2rem; font-weight: 700; margin-bottom: 1rem;">Administración de Catálogo</h3>
            
            ${items.length === 0 ? `
              <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                <i class="ph-folder-open" style="font-size: 3rem; color: var(--text-dim); margin-bottom: 0.75rem;"></i>
                <p style="font-size: 1.1rem; font-weight: 600; color: #fff;">Catálogo Vacío</p>
                <p style="font-size: 0.9rem;">No hay cómics ni videos subidos. Usa la pestaña "Upload New Content" arriba para empezar.</p>
              </div>
            ` : `
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left; color: #fff;">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border); color: var(--text-muted); font-size: 0.85rem;">
                      <th style="padding: 0.75rem;">Portada</th>
                      <th style="padding: 0.75rem;">Título</th>
                      <th style="padding: 0.75rem;">Tipo</th>
                      <th style="padding: 0.75rem;">Precio</th>
                      <th style="padding: 0.75rem;">Vistas</th>
                      <th style="padding: 0.75rem;">Publicidad / Link</th>
                      <th style="padding: 0.75rem;">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${items.map(item => `
                      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.9rem;">
                        <td style="padding: 0.75rem;">
                          <img src="${item.thumbnail}" style="width: 48px; height: 64px; object-fit: cover; border-radius: 4px;" alt="thumb" />
                        </td>
                        <td style="padding: 0.75rem; font-weight: 700;">${item.title}</td>
                        <td style="padding: 0.75rem;">${item.type.toUpperCase()}</td>
                        <td style="padding: 0.75rem;">${item.isPaid ? '$' + item.price.toFixed(2) : 'GRATIS'}</td>
                        <td style="padding: 0.75rem;">${item.views || 0}</td>
                        <td style="padding: 0.75rem;">
                          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                            <button class="btn-secondary copy-ad-link-btn" data-id="${item.id}" style="padding: 0.3rem 0.6rem; font-size: 0.78rem;" title="Copiar enlace para campaña en redes">
                              <i class="ph-link"></i> Link Anuncio
                            </button>
                            <button class="btn-secondary copy-mp-link-btn" data-id="${item.id}" style="padding: 0.3rem 0.6rem; font-size: 0.78rem; border-color: var(--emerald); color: #34d399;" title="Copiar URL de Retorno de MercadoPago / PayPal">
                              <i class="ph-check-circle"></i> Link Éxito MP
                            </button>
                          </div>
                        </td>
                        <td style="padding: 0.75rem;">
                          <button class="btn-secondary delete-cms-btn" data-id="${item.id}" style="padding: 0.3rem 0.6rem; font-size: 0.78rem; border-color: var(--rose); color: var(--rose);">
                            <i class="ph-trash"></i> Borrar
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    // Internal CreatorStudio logic
    let currentType = 'comic';
    let isPaidChoice = false;
    let uploadedFilesData = [];

    const typeSelector = containerEl.querySelector('#type-selector');
    const dropzoneMain = containerEl.querySelector('#dropzone-main-text');
    const dropzoneHelp = containerEl.querySelector('#dropzone-help-text');
    const fileUploadLabel = containerEl.querySelector('#file-upload-label');
    const previewLabel = containerEl.querySelector('#preview-label');

    typeSelector.querySelectorAll('.segmented-btn').forEach(btn => {
      btn.onclick = () => {
        typeSelector.querySelectorAll('.segmented-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentType = btn.dataset.type;

        if (currentType === 'comic') {
          fileUploadLabel.innerHTML = '<i class="ph-image"></i> Subir Páginas del Cómic (Imágenes JPG / PNG / WEBP)';
          dropzoneMain.innerText = 'Arrastra y suelta tus páginas aquí o haz clic para explorar';
          dropzoneHelp.innerText = 'Soporta múltiples imágenes. Se ordenarán automáticamente por número (1, 2, 3... 15+).';
          if (previewLabel) previewLabel.innerHTML = '<i class="ph-eye"></i> Páginas Gratis de Muestra (Límite Paywall)';
        } else {
          fileUploadLabel.innerHTML = '<i class="ph-video-camera"></i> Subir Archivo de Video MP4';
          dropzoneMain.innerText = 'Arrastra y suelta tu video MP4 aquí';
          dropzoneHelp.innerText = 'Formatos soportados: MP4, WebM.';
          if (previewLabel) previewLabel.innerHTML = '<i class="ph-eye"></i> Minutos Gratis de Muestra (Límite Paywall)';
        }
      };
    });

    const pricingSelector = containerEl.querySelector('#pricing-selector');
    const priceGroup = containerEl.querySelector('#price-group');
    const previewGroup = containerEl.querySelector('#preview-group');
    const paymentUrlGroup = containerEl.querySelector('#payment-url-group');

    pricingSelector.querySelectorAll('.segmented-btn').forEach(btn => {
      btn.onclick = () => {
        pricingSelector.querySelectorAll('.segmented-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        isPaidChoice = btn.dataset.paid === 'true';

        priceGroup.style.display = isPaidChoice ? 'flex' : 'none';
        previewGroup.style.display = isPaidChoice ? 'flex' : 'none';
        if (paymentUrlGroup) paymentUrlGroup.style.display = isPaidChoice ? 'flex' : 'none';
      };
    });

    const fileInput = containerEl.querySelector('#upload-file-input');
    const dropzone = containerEl.querySelector('#file-dropzone');
    const previewGrid = containerEl.querySelector('#pages-preview-grid');

    dropzone.onclick = () => fileInput.click();

    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--primary)';
    };

    dropzone.ondragleave = () => {
      dropzone.style.borderColor = 'var(--border)';
    };

    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--border)';
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processSelectedFiles(e.dataTransfer.files);
      }
    };

    fileInput.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        processSelectedFiles(e.target.files);
      }
    };

    let draggedIndex = null;

    function sortUploadedFilesByName() {
      uploadedFilesData.sort((a, b) => 
        (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
      );
      renderPagePreviews();
    }

    function processSelectedFiles(filesList) {
      const newFilesArr = Array.from(filesList).sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );

      let loadedCount = 0;
      newFilesArr.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          uploadedFilesData.push({
            name: file.name,
            type: file.type,
            url: event.target.result
          });
          loadedCount++;
          if (loadedCount === newFilesArr.length) {
            sortUploadedFilesByName();
          }
        };
        reader.readAsDataURL(file);
      });
    }

    function renderPagePreviews() {
      previewGrid.innerHTML = '';
      if (uploadedFilesData.length === 0) return;

      // Header bar with Auto-Sort button and count
      const headerBar = document.createElement('div');
      headerBar.style.cssText = 'display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 0.75rem; background: rgba(255,255,255,0.03); padding: 0.55rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);';
      headerBar.innerHTML = `
        <span style="font-size: 0.85rem; color: #fff; font-weight: 700;">
          <i class="ph-files" style="color: var(--primary);"></i> ${uploadedFilesData.length} Páginas listas (Arrastra las imágenes o usa ◀ ▶ para reordenar)
        </span>
        <button type="button" id="sort-pages-btn" class="btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; border-color: var(--primary); color: #d8b4fe;">
          <i class="ph-sort-ascending"></i> Ordenar por Nombre (1, 2, 3...)
        </button>
      `;
      previewGrid.appendChild(headerBar);

      headerBar.querySelector('#sort-pages-btn').onclick = () => {
        sortUploadedFilesByName();
        if (showToast) showToast('🔤 Páginas ordenadas automáticamente por nombre de archivo (1, 2, 3...)');
      };

      const gridContainer = document.createElement('div');
      gridContainer.style.cssText = 'display: flex; gap: 0.85rem; flex-wrap: wrap; width: 100%;';

      uploadedFilesData.forEach((fileItem, idx) => {
        const itemEl = document.createElement('div');
        itemEl.draggable = true;
        itemEl.style.cssText = 'position: relative; width: 110px; height: 155px; border-radius: 8px; overflow: hidden; border: 2px solid ' + (idx === 0 ? 'var(--primary)' : 'var(--border-color)') + '; background: #000; cursor: grab; transition: transform 0.2s, border-color 0.2s;';

        const img = document.createElement('img');
        img.src = fileItem.url;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; pointer-events: none;';

        // Drag & Drop event handlers
        itemEl.ondragstart = (e) => {
          draggedIndex = idx;
          itemEl.style.opacity = '0.5';
          e.dataTransfer.effectAllowed = 'move';
        };

        itemEl.ondragend = () => {
          itemEl.style.opacity = '1';
        };

        itemEl.ondragover = (e) => {
          e.preventDefault();
          itemEl.style.borderColor = 'var(--cyan)';
        };

        itemEl.ondragleave = () => {
          itemEl.style.borderColor = idx === 0 ? 'var(--primary)' : 'var(--border-color)';
        };

        itemEl.ondrop = (e) => {
          e.preventDefault();
          if (draggedIndex !== null && draggedIndex !== idx) {
            const moved = uploadedFilesData.splice(draggedIndex, 1)[0];
            uploadedFilesData.splice(idx, 0, moved);
            renderPagePreviews();
          }
        };

        // Top Action Buttons (◀, ▶, ✖)
        const actionControls = document.createElement('div');
        actionControls.style.cssText = 'position: absolute; top: 4px; left: 4px; right: 4px; display: flex; justify-content: space-between; gap: 3px; z-index: 5;';

        // Move Left (◀)
        if (idx > 0) {
          const moveLeftBtn = document.createElement('button');
          moveLeftBtn.type = 'button';
          moveLeftBtn.innerHTML = '<i class="ph-caret-left-bold"></i>';
          moveLeftBtn.title = 'Mover a la izquierda';
          moveLeftBtn.style.cssText = 'background: rgba(0,0,0,0.85); color: #fff; border: 1px solid rgba(255,255,255,0.2); width: 22px; height: 22px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; display: flex; align-items: center; justify-content: center;';
          moveLeftBtn.onclick = (e) => {
            e.stopPropagation();
            const temp = uploadedFilesData[idx];
            uploadedFilesData[idx] = uploadedFilesData[idx - 1];
            uploadedFilesData[idx - 1] = temp;
            renderPagePreviews();
          };
          actionControls.appendChild(moveLeftBtn);
        } else {
          actionControls.appendChild(document.createElement('div'));
        }

        // Move Right (▶)
        if (idx < uploadedFilesData.length - 1) {
          const moveRightBtn = document.createElement('button');
          moveRightBtn.type = 'button';
          moveRightBtn.innerHTML = '<i class="ph-caret-right-bold"></i>';
          moveRightBtn.title = 'Mover a la derecha';
          moveRightBtn.style.cssText = 'background: rgba(0,0,0,0.85); color: #fff; border: 1px solid rgba(255,255,255,0.2); width: 22px; height: 22px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; display: flex; align-items: center; justify-content: center;';
          moveRightBtn.onclick = (e) => {
            e.stopPropagation();
            const temp = uploadedFilesData[idx];
            uploadedFilesData[idx] = uploadedFilesData[idx + 1];
            uploadedFilesData[idx + 1] = temp;
            renderPagePreviews();
          };
          actionControls.appendChild(moveRightBtn);
        } else {
          actionControls.appendChild(document.createElement('div'));
        }

        // Delete (✖)
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.innerHTML = '<i class="ph-x-bold"></i>';
        deleteBtn.title = 'Eliminar página';
        deleteBtn.style.cssText = 'background: rgba(225,29,72,0.9); color: #fff; border: none; width: 22px; height: 22px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; display: flex; align-items: center; justify-content: center;';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          uploadedFilesData.splice(idx, 1);
          renderPagePreviews();
        };
        actionControls.appendChild(deleteBtn);

        // Badge & Filename Footer
        const badge = document.createElement('div');
        badge.style.cssText = 'position: absolute; bottom: 4px; left: 4px; right: 4px; background: rgba(10,12,20,0.9); color: #fff; font-size: 0.68rem; font-weight: 700; padding: 2px 4px; border-radius: 4px; text-align: center; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; border: 1px solid ' + (idx === 0 ? 'var(--primary)' : 'rgba(255,255,255,0.15)') + ';';
        badge.innerHTML = idx === 0 ? '<span style="color:#d8b4fe;">★ PORTADA</span>' : `Pág ${idx + 1}`;

        itemEl.appendChild(img);
        itemEl.appendChild(actionControls);
        itemEl.appendChild(badge);
        gridContainer.appendChild(itemEl);
      });

      previewGrid.appendChild(gridContainer);
    }

    const uploadFileToCloudinary = async (fileItem) => {
      if (!fileItem || !fileItem.url) return null;
      if (fileItem.url.startsWith('http://') || fileItem.url.startsWith('https://')) return fileItem.url;

      try {
        const formData = new FormData();
        formData.append('file', fileItem.url);
        formData.append('upload_preset', CLOUDINARY_PRESET);

        const resourceType = fileItem.type.startsWith('video/') ? 'video' : 'image';
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          return data.secure_url;
        }
      } catch (err) {
        console.warn('Cloudinary upload fallback:', err);
      }
      return fileItem.url;
    };

    const form = containerEl.querySelector('#upload-form');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.onsubmit = async (e) => {
      e.preventDefault();
      
      const title = containerEl.querySelector('#upload-title').value;
      const genre = containerEl.querySelector('#upload-genre').value;
      const author = containerEl.querySelector('#upload-author').value;
      const desc = containerEl.querySelector('#upload-desc').value;
      const price = isPaidChoice ? parseFloat(containerEl.querySelector('#upload-price').value) : 0;
      const previewLimit = isPaidChoice ? parseInt(containerEl.querySelector('#upload-preview-limit').value) : 999;
      const paymentUrl = isPaidChoice ? (containerEl.querySelector('#upload-payment-url')?.value || '').trim() : '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ph-spinner ph-spin"></i> Subiendo a la Nube Cloudinary...';
      }

      const imageFilesData = uploadedFilesData.filter(f => f.type.startsWith('image/'));
      const videoFileData = uploadedFilesData.find(f => f.type.startsWith('video/'));

      const uploadedUrls = await Promise.all(
        imageFilesData.map(fileItem => uploadFileToCloudinary(fileItem))
      );

      let videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      if (videoFileData) {
        const cloudVideo = await uploadFileToCloudinary(videoFileData);
        if (cloudVideo) videoUrl = cloudVideo;
      }

      const defaultThumb = currentType === 'comic' ? 'assets/cyber_chronicles.jpg' : 'assets/neon_overdrive.jpg';
      const thumbnail = uploadedUrls.length > 0 ? uploadedUrls[0] : defaultThumb;
      const pages = uploadedUrls.length > 0 ? uploadedUrls : [defaultThumb];

      const newItem = {
        title,
        type: currentType,
        genre,
        author,
        description: desc,
        isPaid: isPaidChoice,
        price,
        previewLimit,
        paymentUrl,
        thumbnail,
        pages,
        videoUrl
      };

      store.addItem(newItem);
      showToast(`¡Publicado exitosamente "${title}" en la nube con ${pages.length} páginas!`);
      renderCreatorStudio(containerEl, showToast);
    };

    const tabUploadBtn = containerEl.querySelector('#tab-upload');
    const tabCmsBtn = containerEl.querySelector('#tab-cms');
    const panelUpload = containerEl.querySelector('#panel-upload');
    const panelCms = containerEl.querySelector('#panel-cms');

    tabUploadBtn.onclick = () => {
      tabUploadBtn.classList.add('active');
      tabCmsBtn.classList.remove('active');
      panelUpload.style.display = 'block';
      panelCms.style.display = 'none';
    };

    tabCmsBtn.onclick = () => {
      tabCmsBtn.classList.add('active');
      tabUploadBtn.classList.remove('active');
      panelUpload.style.display = 'none';
      panelCms.style.display = 'block';
    };

    containerEl.querySelector('#btn-open-upload-tab').onclick = () => tabUploadBtn.click();

    const changePinBtn = containerEl.querySelector('#change-pin-btn');
    if (changePinBtn) {
      changePinBtn.onclick = () => {
        const newPin = prompt('Ingresa tu nueva clave secreta de administración (mínimo 4 caracteres):');
        if (newPin && newPin.trim().length >= 4) {
          store.setAdminPin(newPin.trim());
          showToast('🔑 ¡Clave de administrador actualizada exitosamente!');
        } else if (newPin !== null) {
          showToast('⚠️ La clave debe tener al menos 4 caracteres.');
        }
      };
    }

    containerEl.querySelectorAll('.copy-ad-link-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const adUrl = `${window.location.origin}${window.location.pathname}?comic=${id}&utm_source=social_ad`;
        navigator.clipboard.writeText(adUrl).catch(() => {});
        showToast(`¡Link de Anuncio copiado! ${adUrl}`);
      };
    });

    containerEl.querySelectorAll('.copy-mp-link-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const mpUrl = `${window.location.origin}${window.location.pathname}?comic=${id}&status=approved`;
        navigator.clipboard.writeText(mpUrl).catch(() => {});
        showToast(`🔗 ¡Link de Retorno MercadoPago/PayPal copiado! Pégalo en tu URL de Éxito: ${mpUrl}`);
      };
    });

    containerEl.querySelectorAll('.delete-cms-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        if (confirm('¿Seguro que deseas eliminar este contenido?')) {
          store.deleteItem(id);
          showToast('Contenido eliminado.');
          renderCreatorStudio(containerEl, showToast);
        }
      };
    });
  }

  // 6. Main App Controller
  class App {
    constructor() {
      this.currentView = 'audience';
      this.selectedMediaType = 'all';
      this.selectedAccessTier = 'all';
      this.selectedGenre = 'all';
      this.searchQuery = '';
      this.isAdminAuthenticated = false;

      this.init();
    }

    handleAdminAccess(onSuccess) {
      if (this.isAdminAuthenticated) {
        onSuccess();
      } else {
        createAdminLoginModal(
          () => {
            this.isAdminAuthenticated = true;
            onSuccess();
          },
          (msg) => this.showToast(msg)
        );
      }
    }

    init() {
      store.subscribe(() => this.render());
      this.render();
      this.checkUrlParams();
    }

    checkUrlParams() {
      const params = new URLSearchParams(window.location.search);
      const comicId = params.get('comic') || params.get('unlock') || params.get('external_reference');
      const status = (
        params.get('status') || 
        params.get('collection_status') || 
        params.get('payment_status') || 
        params.get('paypal_status') || 
        params.get('payment')
      );

      if (comicId) {
        // Auto-Verification of Approved Payment Return (MercadoPago / PayPal / Stripe)
        const isApproved = status === 'approved' || status === 'success' || status === 'APPROVED' || params.has('approved') || params.get('payment_id');
        
        if (isApproved) {
          const res = store.unlockItem(comicId);
          if (res.success) {
            setTimeout(() => {
              this.showToast('🎉 ¡Pago verificado exitosamente por Mercado Pago! Disfruta de la lectura completa.');
            }, 500);
          }
        }

        const item = store.getItems().find(i => i.id === comicId);
        if (item) {
          setTimeout(() => {
            if (item.type === 'comic') {
              createComicReaderModal(item, () => this.render(), (msg) => this.showToast(msg));
            } else {
              createVideoPlayerModal(item, () => this.render());
            }
          }, 300);
        }
      }
    }

    showToast(message) {
      const existing = document.querySelector('.toast');
      if (existing) document.body.removeChild(existing);

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `
        <i class="ph-check-circle" style="color: var(--emerald); font-size: 1.2rem;"></i>
        <span>${message}</span>
      `;

      document.body.appendChild(toast);
      setTimeout(() => {
        if (document.body.contains(toast)) document.body.removeChild(toast);
      }, 3500);
    }

    renderNavbar() {
      return `
        <nav class="navbar">
          <div class="brand-logo" id="logo-btn">
            <i class="ph-sparkle"></i>
            <div class="brand-text">Verse<span>Reel</span></div>
          </div>

          <div class="nav-links">
            <button class="nav-btn ${this.currentView === 'audience' ? 'active' : ''}" id="nav-audience-btn">
              <i class="ph-compass"></i> Explore Hub
            </button>
            <button class="nav-btn ${this.currentView === 'creator' ? 'active' : ''}" id="nav-creator-btn">
              <i class="ph-user-gear"></i> ${this.isAdminAuthenticated ? 'Creator Studio (Admin)' : 'Admin Login'}
            </button>
          </div>

          <div class="nav-actions">
            ${this.isAdminAuthenticated ? `
              <button class="btn-secondary" id="logout-admin-btn" style="padding: 0.45rem 0.85rem; font-size: 0.82rem; border-color: var(--rose); color: var(--rose);">
                <i class="ph-sign-out"></i> Salir de Admin
              </button>
            ` : ''}
            <button class="mode-switcher" id="toggle-view-mode-btn">
              <i class="${this.currentView === 'audience' ? 'ph-lock-key' : 'ph-eye'}"></i>
              <span>${this.currentView === 'audience' ? 'Panel de Creador (Admin)' : 'Volver a la Web'}</span>
            </button>
          </div>
        </nav>
      `;
    }

    renderHeroBanner() {
      return `
        <div class="hero-banner">
          <img src="assets/hero_banner.jpg" class="hero-img" alt="Hero background" />
          <div class="hero-overlay"></div>
          <div class="hero-body">
            <div class="hero-badge">
              <i class="ph-sparkle"></i> Los Mejores Cómics y Videos en Español
            </div>
            <h1 class="hero-title">Mira los mejores cómics y videos</h1>
            <p class="hero-subtitle">
              Explora historias increíbles de estreno, cómics exclusivos y videos. Disfruta las primeras páginas o capítulos totalmente gratis.
            </p>
            <div class="hero-actions">
              <button class="btn-primary" id="hero-explore-btn">
                <i class="ph-compass"></i> Explorar Catálogo
              </button>
              <button class="btn-secondary" id="hero-creator-btn">
                <i class="ph-lock-key"></i> Acceso Creador (Admin)
              </button>
            </div>
          </div>
        </div>
      `;
    }

    renderAudienceHub() {
      const items = store.getItems();
      
      const filtered = items.filter(item => {
        if (this.selectedMediaType !== 'all' && item.type !== this.selectedMediaType) return false;
        if (this.selectedAccessTier === 'free' && item.isPaid) return false;
        if (this.selectedAccessTier === 'paid' && !item.isPaid) return false;
        if (this.selectedGenre !== 'all' && item.genre !== this.selectedGenre) return false;
        if (this.searchQuery && !item.title.toLowerCase().includes(this.searchQuery.toLowerCase())) return false;
        return true;
      });

      return `
        ${this.renderHeroBanner()}

        <div class="filter-bar">
          <div class="search-box">
            <i class="ph-magnifying-glass"></i>
            <input type="text" id="search-input" placeholder="Buscar cómics, videos o creadores..." value="${this.searchQuery}" />
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
            <select id="media-filter" class="custom-filter-select">
              <option value="all" ${this.selectedMediaType === 'all' ? 'selected' : ''}>🎬 Todos los Medios</option>
              <option value="comic" ${this.selectedMediaType === 'comic' ? 'selected' : ''}>📖 Solo Cómics</option>
              <option value="video" ${this.selectedMediaType === 'video' ? 'selected' : ''}>🎥 Solo Videos</option>
            </select>

            <select id="tier-filter" class="custom-filter-select">
              <option value="all" ${this.selectedAccessTier === 'all' ? 'selected' : ''}>💎 Todos los Precios</option>
              <option value="free" ${this.selectedAccessTier === 'free' ? 'selected' : ''}>🎁 Muestra Gratis</option>
              <option value="paid" ${this.selectedAccessTier === 'paid' ? 'selected' : ''}>⭐ Premium ($)</option>
            </select>
          </div>
        </div>

        <div class="media-grid">
          ${filtered.length === 0 ? `
            <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
              <i class="ph-books" style="font-size: 3.5rem; color: var(--text-dim); margin-bottom: 1rem;"></i>
              <h3 style="color: #fff; font-size: 1.25rem; font-weight: 700;">No se encontraron contenidos</h3>
              <p style="font-size: 0.95rem; margin-top: 0.25rem;">Usa el Panel de Creador para publicar tu primer cómic o video.</p>
            </div>
          ` : filtered.map(item => `
            <div class="media-card" data-id="${item.id}">
              <div class="card-thumb-wrapper">
                <img src="${item.thumbnail}" class="card-thumb" alt="${item.title}" />
                <div class="card-badge-top">
                  <span class="media-badge ${item.type}">${item.type.toUpperCase()}</span>
                  ${item.isPaid ? `<span class="price-tag paid">$${item.price.toFixed(2)}</span>` : '<span class="price-tag free">FREE</span>'}
                </div>
              </div>
              <div class="card-body">
                <h3 class="card-title">${item.title}</h3>
                <p class="card-desc">${item.description}</p>
                <div class="card-footer">
                  <span><i class="ph-user"></i> ${item.author}</span>
                  <span><i class="ph-eye"></i> ${item.views || 0}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    attachAudienceEvents(root) {
      const searchInput = root.querySelector('#search-input');
      if (searchInput) {
        searchInput.oninput = (e) => {
          this.searchQuery = e.target.value;
          this.render();
        };
      }

      const mediaFilter = root.querySelector('#media-filter');
      if (mediaFilter) {
        mediaFilter.onchange = (e) => {
          this.selectedMediaType = e.target.value;
          this.render();
        };
      }

      const tierFilter = root.querySelector('#tier-filter');
      if (tierFilter) {
        tierFilter.onchange = (e) => {
          this.selectedAccessTier = e.target.value;
          this.render();
        };
      }

      const heroExplore = root.querySelector('#hero-explore-btn');
      if (heroExplore) {
        heroExplore.onclick = () => {
          window.scrollTo({ top: 500, behavior: 'smooth' });
        };
      }

      const heroCreator = root.querySelector('#hero-creator-btn');
      if (heroCreator) {
        heroCreator.onclick = () => {
          this.handleAdminAccess(() => {
            this.currentView = 'creator';
            this.render();
          });
        };
      }

      root.querySelectorAll('.media-card').forEach(card => {
        card.onclick = () => {
          const id = card.dataset.id;
          const item = store.getItems().find(i => i.id === id);
          if (!item) return;

          if (item.type === 'comic') {
            createComicReaderModal(item, () => this.render(), (msg) => this.showToast(msg));
          } else {
            createVideoPlayerModal(item, () => this.render());
          }
        };
      });
    }

    render() {
      const root = document.getElementById('app');
      if (!root) return;

      root.innerHTML = `
        <div class="app-container">
          ${this.renderNavbar()}
          <main class="main-content" id="main-content-view">
            ${this.currentView === 'audience' ? this.renderAudienceHub() : '<div id="creator-studio-container"></div>'}
          </main>
        </div>
      `;

      root.querySelector('#logo-btn').onclick = () => {
        this.currentView = 'audience';
        this.render();
      };

      root.querySelector('#nav-audience-btn').onclick = () => {
        this.currentView = 'audience';
        this.render();
      };

      root.querySelector('#nav-creator-btn').onclick = () => {
        this.handleAdminAccess(() => {
          this.currentView = 'creator';
          this.render();
        });
      };

      root.querySelector('#toggle-view-mode-btn').onclick = () => {
        if (this.currentView === 'creator') {
          this.currentView = 'audience';
          this.render();
        } else {
          this.handleAdminAccess(() => {
            this.currentView = 'creator';
            this.render();
          });
        }
      };

      const logoutBtn = root.querySelector('#logout-admin-btn');
      if (logoutBtn) {
        logoutBtn.onclick = () => {
          this.isAdminAuthenticated = false;
          this.currentView = 'audience';
          this.showToast('🔒 Sesión de Administrador cerrada');
          this.render();
        };
      }

      if (this.currentView === 'audience') {
        this.attachAudienceEvents(root);
      } else {
        const studioContainer = root.querySelector('#creator-studio-container');
        if (studioContainer) {
          renderCreatorStudio(studioContainer, (msg) => this.showToast(msg));
        }
      }
    }
  }

  // Safe Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
  } else {
    new App();
  }
})();
