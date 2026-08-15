// Main VerseReel Application Controller
import { store } from './store.js';
import { createComicReaderModal } from './components/ComicReader.js';
import { createVideoPlayerModal } from './components/VideoPlayer.js';
import { renderCreatorStudio } from './components/CreatorStudio.js';
import { createAdminLoginModal } from './components/AdminLoginModal.js';

class App {
  constructor() {
    this.currentView = 'audience'; // 'audience' | 'creator'
    this.selectedMediaType = 'all'; // 'all' | 'comic' | 'video'
    this.selectedAccessTier = 'all'; // 'all' | 'free' | 'paid'
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
    store.subscribe(() => {
      this.render();
    });

    this.render();
    this.checkUrlParams();
  }

  checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const comicId = params.get('comic') || params.get('unlock') || params.get('external_reference') || (params.has('ad') ? 'item-comic-15pages' : null);
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
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
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
          <button class="nav-btn active" id="nav-audience-btn">
            <i class="ph-compass"></i> Catálogo de Cómics & Videos
          </button>
        </div>

        <div class="nav-actions">
          <!-- Public audience focus -->
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
          <p class="hero-desc">
            Explora historias increíbles de estreno, cómics exclusivos y videos. Disfruta las primeras páginas o capítulos totalmente gratis.
          </p>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button class="btn-primary" id="hero-read-featured">
              <i class="ph-compass"></i> Explorar Catálogo
            </button>
            <button class="btn-secondary" id="hero-watch-featured">
              <i class="ph-lock-key"></i> Acceso Creador (Admin)
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderFilterBar() {
    return `
      <div class="filter-bar">
        <div class="filter-group">
          <!-- Type filters -->
          <button class="filter-chip ${this.selectedMediaType === 'all' ? 'active' : ''}" data-type="all">All Media</button>
          <button class="filter-chip ${this.selectedMediaType === 'comic' ? 'active' : ''}" data-type="comic"><i class="ph-book-open"></i> Comics</button>
          <button class="filter-chip ${this.selectedMediaType === 'video' ? 'active' : ''}" data-type="video"><i class="ph-video-camera"></i> Videos</button>

          <span style="color: var(--border-color);">|</span>

          <!-- Tier filters -->
          <button class="filter-chip ${this.selectedAccessTier === 'all' ? 'active' : ''}" data-tier="all">All Tiers</button>
          <button class="filter-chip ${this.selectedAccessTier === 'free' ? 'active' : ''}" data-tier="free"><i class="ph-gift"></i> Free Only</button>
          <button class="filter-chip ${this.selectedAccessTier === 'paid' ? 'active' : ''}" data-tier="paid"><i class="ph-lock"></i> Paid / Premium</button>
        </div>

        <div class="search-box">
          <i class="ph-magnifying-glass"></i>
          <input type="text" id="search-input" placeholder="Search comics, videos, authors..." value="${this.searchQuery}" />
        </div>
      </div>
    `;
  }

  renderAudienceHub() {
    const allItems = store.getItems();
    
    // Apply Filtering
    const filteredItems = allItems.filter(item => {
      // Type Filter
      if (this.selectedMediaType !== 'all' && item.type !== this.selectedMediaType) return false;
      // Access Tier Filter
      if (this.selectedAccessTier === 'free' && item.isPaid) return false;
      if (this.selectedAccessTier === 'paid' && !item.isPaid) return false;
      // Search Filter
      if (this.searchQuery.trim() !== '') {
        const q = this.searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchAuthor = item.author.toLowerCase().includes(q);
        const matchGenre = item.genre.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchAuthor && !matchGenre) return false;
      }
      return true;
    });

    return `
      ${this.renderHeroBanner()}
      ${this.renderFilterBar()}

      <div class="content-grid">
        ${filteredItems.length === 0 ? `
          <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <i class="ph-film-slash" style="font-size: 3rem; color: var(--primary); margin-bottom: 1rem;"></i>
            <h3>No Media Matches Your Filter</h3>
            <p style="font-size: 0.9rem; margin-top: 0.5rem;">Try adjusting your search query or media filters, or upload new content in Creator Studio.</p>
          </div>
        ` : filteredItems.map(item => {
          const isUnlocked = store.isItemUnlocked(item.id);
          return `
            <div class="media-card type-${item.type}" data-id="${item.id}">
              <div class="media-thumb-container">
                <img src="${item.thumbnail}" class="media-thumb" alt="${item.title}" />
                
                <div class="badge-container">
                  <div class="type-tag">
                    <i class="ph-${item.type === 'comic' ? 'book-open' : 'video-camera'}"></i>
                    ${item.type}
                  </div>
                  <div class="price-tag ${item.isPaid ? 'paid' : 'free'}">
                    ${item.isPaid ? `$${item.price.toFixed(2)}` : 'FREE'}
                  </div>
                </div>

                <div class="lock-overlay">
                  <div class="play-icon-overlay">
                    <i class="ph-${item.type === 'comic' ? (isUnlocked ? 'book-open' : 'lock') : (isUnlocked ? 'play' : 'lock')}"></i>
                  </div>
                </div>
              </div>

              <div class="media-card-body">
                <h3 class="media-title">${item.title}</h3>
                <p class="media-desc">${item.description}</p>
                <div class="media-meta">
                  <div class="author-info">
                    <i class="ph-user"></i> ${item.author}
                  </div>
                  <div>
                    ${item.isPaid && !isUnlocked ? '<span style="color:var(--amber); font-weight:700;">Preview</span>' : '<span style="color:var(--emerald); font-weight:700;">Full Access</span>'}
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  attachAudienceEvents(rootEl) {
    // Media Card click handlers
    rootEl.querySelectorAll('.media-card').forEach(card => {
      card.onclick = () => {
        const id = card.dataset.id;
        const item = store.getItems().find(i => i.id === id);
        if (!item) return;

        if (item.type === 'comic') {
          createComicReaderModal(
            item, 
            () => this.render(),
            (msg) => this.showToast(msg)
          );
        } else {
          createVideoPlayerModal(
            item,
            () => this.render(),
            (msg) => this.showToast(msg)
          );
        }
      };
    });

    // Hero buttons
    const heroRead = rootEl.querySelector('#hero-read-featured');
    if (heroRead) {
      heroRead.onclick = () => {
        const comicItem = store.getItems().find(i => i.type === 'comic');
        if (comicItem) {
          createComicReaderModal(comicItem, () => this.render(), (msg) => this.showToast(msg));
        } else {
          this.currentView = 'creator';
          this.render();
        }
      };
    }

    const heroWatch = rootEl.querySelector('#hero-watch-featured');
    if (heroWatch) {
      heroWatch.onclick = () => {
        const videoItem = store.getItems().find(i => i.type === 'video');
        if (videoItem) {
          createVideoPlayerModal(videoItem, () => this.render(), (msg) => this.showToast(msg));
        } else {
          this.currentView = 'creator';
          this.render();
        }
      };
    }

    // Filter Chips
    rootEl.querySelectorAll('.filter-chip[data-type]').forEach(chip => {
      chip.onclick = () => {
        this.selectedMediaType = chip.dataset.type;
        this.render();
      };
    });

    rootEl.querySelectorAll('.filter-chip[data-tier]').forEach(chip => {
      chip.onclick = () => {
        this.selectedAccessTier = chip.dataset.tier;
        this.render();
      };
    });

    // Search Input
    const searchInput = rootEl.querySelector('#search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchQuery = e.target.value;
        this.render();
      };
    }
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

    // Global Navbar Events
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

    // Sub-view renders
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

// Safe Instant Initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}
