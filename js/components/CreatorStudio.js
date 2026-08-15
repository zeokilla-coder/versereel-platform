// Creator Studio Component for Uploading and Managing Free/Paid Comics & Videos
import { store } from '../store.js';

export function renderCreatorStudio(containerEl, showToast) {
  const data = store.data;
  const items = store.getItems();
  const stats = data.creatorStats || { totalRevenue: 0, totalViews: 0, subscribers: 0 };

  const paidCount = items.filter(i => i.isPaid).length;
  const freeCount = items.filter(i => !i.isPaid).length;
  const comicCount = items.filter(i => i.type === 'comic').length;
  const videoCount = items.filter(i => i.type === 'video').length;

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
            <i class="ph-upload-simple"></i> Upload New Media
          </button>
        </div>
      </div>

      <!-- Analytics Stats Cards -->
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
          <div class="stat-icon cyan">
            <i class="ph-video-camera"></i>
          </div>
          <div>
            <div class="stat-value">${videoCount}</div>
            <div class="stat-label">Uploaded Videos</div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="studio-tabs">
        <button class="studio-tab-btn active" id="tab-upload">Upload Studio</button>
        <button class="studio-tab-btn" id="tab-cms">Content CMS Manager (${items.length})</button>
      </div>

      <!-- Upload Form Panel -->
      <div class="form-panel" id="panel-upload">
        <h2 style="font-size: 1.3rem; font-weight: 800; color: #fff; margin-bottom: 1.25rem; display:flex; align-items:center; gap:0.5rem;">
          <i class="ph-sparkle" style="color: var(--primary);"></i> Publish New Media
        </h2>

        <form id="upload-form" class="form-grid">
          <!-- Type Selection -->
          <div class="form-group full-width">
            <label class="form-label"><i class="ph-film-strip"></i> Select Media Type</label>
            <div class="segmented-control" id="type-selector">
              <button type="button" class="segmented-btn active" data-type="comic">
                <i class="ph-book-open"></i> Comic / Graphic Novel
              </button>
              <button type="button" class="segmented-btn" data-type="video">
                <i class="ph-video-camera"></i> Video / Animation
              </button>
            </div>
          </div>

          <!-- Title -->
          <div class="form-group">
            <label class="form-label"><i class="ph-text-t"></i> Content Title</label>
            <input type="text" id="upload-title" class="form-input" placeholder="e.g. Cyberpunk Origins: Issue 1" required />
          </div>

          <!-- Genre -->
          <div class="form-group">
            <label class="form-label"><i class="ph-tag"></i> Genre / Category</label>
            <select id="upload-genre" class="form-select">
              <option value="Sci-Fi">Sci-Fi</option>
              <option value="Fantasy">Fantasy</option>
              <option value="Action">Action</option>
              <option value="Animation">Animation</option>
              <option value="Tutorial">Tutorial</option>
              <option value="Comedy">Comedy</option>
            </select>
          </div>

          <!-- Author -->
          <div class="form-group">
            <label class="form-label"><i class="ph-user"></i> Creator / Author Name</label>
            <input type="text" id="upload-author" class="form-input" placeholder="Your Creator Name" value="Elena Vance" required />
          </div>

          <!-- Pricing Tier (Free vs Paid) -->
          <div class="form-group">
            <label class="form-label"><i class="ph-lock"></i> Access Tier & Monetization</label>
            <div class="segmented-control" id="pricing-selector">
              <button type="button" class="segmented-btn active" data-paid="false">
                <i class="ph-gift"></i> FREE Access
              </button>
              <button type="button" class="segmented-btn" data-paid="true">
                <i class="ph-currency-dollar"></i> PAID / Premium ($)
              </button>
            </div>
          </div>

          <!-- Price Input (Visible when Paid) -->
          <div class="form-group" id="price-group" style="display: none;">
            <label class="form-label"><i class="ph-coins"></i> Unlock Price (USD $)</label>
            <input type="number" step="0.01" min="0" value="2.99" id="upload-price" class="form-input" placeholder="ej. 2.99" />
          </div>

          <!-- Preview Rules Input -->
          <div class="form-group" id="preview-group" style="display: none;">
            <label class="form-label" id="preview-label"><i class="ph-eye"></i> Free Preview Limit</label>
            <input type="number" min="1" value="15" id="upload-preview-limit" class="form-input" />
          </div>

          <!-- Custom Payment Link Input -->
          <div class="form-group full-width" id="payment-url-group" style="display: none;">
            <label class="form-label"><i class="ph-credit-card"></i> Link de Pago (MercadoPago, PayPal, Stripe, Gumroad, etc.)</label>
            <input type="url" id="upload-payment-url" class="form-input" placeholder="https://mpago.la/tu-link  o  https://paypal.me/tu-usuario  o  https://buy.stripe.com/..." />
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              💡 Cuando los lectores lleguen a la página 16, este enlace se abrirá para que paguen $2.99 con tu pasarela de pago preferida.
            </span>
          </div>

          <!-- Description -->
          <div class="form-group full-width">
            <label class="form-label"><i class="ph-article"></i> Description & Synopsis</label>
            <textarea id="upload-desc" class="form-textarea" placeholder="Write a compelling summary for your readers/viewers..." required></textarea>
          </div>

          <!-- Upload Dropzone -->
          <div class="form-group full-width">
            <label class="form-label"><i class="ph-upload"></i> Cargar Archivos de Imagen / Portada / Video</label>
            <input type="file" id="file-input" accept="image/*,video/*" multiple style="display: none;" />
            <div class="dropzone" id="file-dropzone">
              <i class="ph-cloud-arrow-up" style="font-size: 2.5rem; color: var(--primary);"></i>
              <div style="font-weight: 700; color: #fff; font-size: 1.05rem;" id="dropzone-status">Arrastra tus archivos de imagen aquí o haz clic para examinar</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);" id="dropzone-help">
                Soporta imágenes JPG, PNG, WEBP (para Cómics) o MP4, WEBM (para Videos)
              </div>
              <button type="button" class="btn-secondary" id="browse-btn" style="margin-top: 0.5rem;">
                <i class="ph-folder-open"></i> Seleccionar Archivos desde la PC
              </button>
            </div>
            <div id="file-previews-container" style="display: none; margin-top: 1rem; padding: 1rem; background: rgba(0,0,0,0.4); border-radius: var(--radius-md); border: 1px solid var(--border-color);"></div>
          </div>

          <!-- Submit Button -->
          <div class="form-group full-width" style="margin-top: 1rem;">
            <button type="submit" class="btn-primary" style="width: 100%; justify-content: center; padding: 0.9rem;">
              <i class="ph-paper-plane-tilt"></i> Publish Media to Platform
            </button>
          </div>
        </form>
      </div>

      <!-- CMS Panel -->
      <div class="form-panel" id="panel-cms" style="display: none;">
        <h2 style="font-size: 1.3rem; font-weight: 800; color: #fff; margin-bottom: 1.25rem;">Content CMS & Pricing Manager</h2>
        
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; color: #fff;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                <th style="padding: 0.75rem;">Thumbnail</th>
                <th style="padding: 0.75rem;">Title</th>
                <th style="padding: 0.75rem;">Type</th>
                <th style="padding: 0.75rem;">Status</th>
                <th style="padding: 0.75rem;">Price</th>
                <th style="padding: 0.75rem;">Views</th>
                <th style="padding: 0.75rem;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                  <td style="padding: 0.75rem;">
                    <img src="${item.thumbnail}" style="width: 48px; height: 48px; object-fit: cover; border-radius: var(--radius-sm);" />
                  </td>
                  <td style="padding: 0.75rem; font-weight: 700;">${item.title}</td>
                  <td style="padding: 0.75rem;">
                    <span class="type-tag">${item.type}</span>
                  </td>
                  <td style="padding: 0.75rem;">
                    ${item.isPaid ? '<span class="price-tag paid">PAID</span>' : '<span class="price-tag free">FREE</span>'}
                  </td>
                  <td style="padding: 0.75rem; font-weight: 800;">$${(item.price || 0).toFixed(2)}</td>
                  <td style="padding: 0.75rem; color: var(--cyan); font-weight: 700;">${item.views || 0}</td>
                  <td style="padding: 0.75rem;">
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                      <button class="btn-secondary copy-ad-link-btn" data-id="${item.id}" style="padding:0.35rem 0.65rem; font-size:0.8rem; border-color:var(--cyan); color:var(--cyan);">
                        <i class="ph-share-network"></i> Link Publicidad
                      </button>
                      <button class="btn-secondary toggle-pricing-btn" data-id="${item.id}" style="padding:0.35rem 0.75rem; font-size:0.8rem;">
                        Toggle ${item.isPaid ? 'Free' : 'Paid'}
                      </button>
                      <button class="btn-secondary delete-cms-btn" data-id="${item.id}" style="padding:0.35rem 0.6rem; font-size:0.8rem; color:var(--rose);">
                        <i class="ph-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Attach Form Interactivity
  let currentType = 'comic';
  let isPaidChoice = false;

  const typeSelector = containerEl.querySelector('#type-selector');
  const previewGroup = containerEl.querySelector('#preview-group');
  const previewLabel = containerEl.querySelector('#preview-label');
  const dropzoneHelp = containerEl.querySelector('#dropzone-help');

  typeSelector.querySelectorAll('.segmented-btn').forEach(btn => {
    btn.onclick = () => {
      typeSelector.querySelectorAll('.segmented-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type;
      
      if (currentType === 'comic') {
        previewLabel.innerHTML = '<i class="ph-eye"></i> Free Sample Pages Limit';
        dropzoneHelp.innerText = 'Upload comic cover & page images (JPG, PNG)';
      } else {
        previewLabel.innerHTML = '<i class="ph-clock"></i> Free Video Preview (Seconds)';
        dropzoneHelp.innerText = 'Upload video file (MP4, WebM) & thumbnail cover';
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

  // File Upload State & Previews
  let uploadedFilesData = [];
  const dropzone = containerEl.querySelector('#file-dropzone');
  const fileInput = containerEl.querySelector('#file-input');
  const browseBtn = containerEl.querySelector('#browse-btn');
  const previewsContainer = containerEl.querySelector('#file-previews-container');
  const dropzoneStatus = containerEl.querySelector('#dropzone-status');

  const triggerFilePicker = () => fileInput.click();
  dropzone.onclick = triggerFilePicker;
  if (browseBtn) browseBtn.onclick = (e) => { e.stopPropagation(); triggerFilePicker(); };

  // Drag & Drop Handlers
  dropzone.ondragover = (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'var(--primary)';
    dropzone.style.background = 'rgba(168, 85, 247, 0.15)';
  };

  dropzone.ondragleave = (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'rgba(168, 85, 247, 0.4)';
    dropzone.style.background = 'rgba(168, 85, 247, 0.04)';
  };

  const renderPreviews = () => {
    if (!uploadedFilesData || uploadedFilesData.length === 0) {
      previewsContainer.style.display = 'none';
      return;
    }

    previewsContainer.style.display = 'block';
    let previewHtml = `
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; margin-bottom: 0.75rem; gap: 0.5rem;">
        <div style="font-weight: 700; color: #34d399; display:flex; align-items:center; gap:0.4rem;">
          <i class="ph-check-circle" style="font-size: 1.2rem;"></i>
          <span>¡${uploadedFilesData.length} página(s) cargada(s)!</span>
        </div>
        <button type="button" class="btn-secondary" id="auto-sort-btn" style="font-size: 0.8rem; padding: 0.3rem 0.7rem; border-color: var(--cyan); color: var(--cyan);">
          <i class="ph-sort-ascending"></i> Auto-Ordenar por Nombre (Pág 1, 2, 3...)
        </button>
      </div>

      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; max-height: 220px; overflow-y: auto; padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: 8px;">
    `;

    uploadedFilesData.forEach((item, idx) => {
      if (item.type.startsWith('image/')) {
        const isCover = idx === 0;
        previewHtml += `
          <div style="position:relative; background: #161a29; padding: 4px; border-radius: 8px; border: 2px solid ${isCover ? 'var(--emerald)' : 'var(--border-color)'}; display:flex; flex-direction:column; align-items:center; width: 75px;">
            <img src="${item.url}" style="width: 100%; height: 85px; object-fit: cover; border-radius: 4px;" title="${item.name}" />
            <span style="font-size: 0.68rem; font-weight: 800; color: ${isCover ? '#34d399' : '#d8b4fe'}; margin-top: 3px;">
              ${isCover ? 'PORTADA' : 'Pág ' + idx}
            </span>
            <div style="display:flex; gap: 2px; margin-top: 3px; width: 100%; justify-content: center;">
              <button type="button" class="btn-move-left" data-idx="${idx}" style="background:rgba(255,255,255,0.1); border:none; color:#fff; font-size:0.7rem; padding:2px 4px; border-radius:3px; cursor:pointer;" ${idx === 0 ? 'disabled' : ''}>◀</button>
              <button type="button" class="btn-remove-page" data-idx="${idx}" style="background:rgba(244,63,94,0.2); border:none; color:var(--rose); font-size:0.7rem; padding:2px 4px; border-radius:3px; cursor:pointer;">✖</button>
              <button type="button" class="btn-move-right" data-idx="${idx}" style="background:rgba(255,255,255,0.1); border:none; color:#fff; font-size:0.7rem; padding:2px 4px; border-radius:3px; cursor:pointer;" ${idx === uploadedFilesData.length - 1 ? 'disabled' : ''}>▶</button>
            </div>
          </div>
        `;
      } else {
        previewHtml += `<div style="padding: 0.5rem 0.8rem; background: rgba(255,255,255,0.08); border-radius: 6px; font-size: 0.8rem; color: #fff; display:flex; align-items:center; gap:0.4rem;"><i class="ph-film-strip"></i> ${item.name}</div>`;
      }
    });

    previewHtml += `</div>`;
    previewsContainer.innerHTML = previewHtml;

    // Attach Reordering Action Listeners
    const sortBtn = previewsContainer.querySelector('#auto-sort-btn');
    if (sortBtn) {
      sortBtn.onclick = () => {
        uploadedFilesData.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        renderPreviews();
      };
    }

    previewsContainer.querySelectorAll('.btn-move-left').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        if (idx > 0) {
          const temp = uploadedFilesData[idx];
          uploadedFilesData[idx] = uploadedFilesData[idx - 1];
          uploadedFilesData[idx - 1] = temp;
          renderPreviews();
        }
      };
    });

    previewsContainer.querySelectorAll('.btn-move-right').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        if (idx < uploadedFilesData.length - 1) {
          const temp = uploadedFilesData[idx];
          uploadedFilesData[idx] = uploadedFilesData[idx + 1];
          uploadedFilesData[idx + 1] = temp;
          renderPreviews();
        }
      };
    });

    previewsContainer.querySelectorAll('.btn-remove-page').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx);
        uploadedFilesData.splice(idx, 1);
        renderPreviews();
      };
    });
  };

  const processFiles = async (files) => {
    if (!files || files.length === 0) return;

    // Natural Numerical Sort on Raw Files
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    if (dropzoneStatus) dropzoneStatus.innerText = `Cargando ${files.length} archivo(s)...`;

    const readPromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ name: file.name, type: file.type, url: e.target.result });
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    });

    const results = await Promise.all(readPromises);
    const newFiles = results.filter(r => r !== null);
    uploadedFilesData = [...uploadedFilesData, ...newFiles];

    if (dropzoneStatus) {
      dropzoneStatus.innerText = `¡${uploadedFilesData.length} archivo(s) procesado(s) correctamente!`;
    }

    renderPreviews();
  };

  dropzone.ondrop = (e) => {
    e.preventDefault();
    dropzone.style.borderColor = 'rgba(168, 85, 247, 0.4)';
    dropzone.style.background = 'rgba(168, 85, 247, 0.04)';
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  fileInput.onchange = () => {
    const files = Array.from(fileInput.files);
    processFiles(files);
  };

  // Cloudinary Cloud Integration Config
  const CLOUDINARY_CLOUD_NAME = 'bre5du5y';
  const CLOUDINARY_PRESET = 'ml_default';

  const uploadFileToCloudinary = async (fileItem) => {
    if (!fileItem || !fileItem.url) return null;
    if (fileItem.url.startsWith('http://') || fileItem.url.startsWith('https://')) {
      return fileItem.url; // Already hosted URL
    }

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
      console.warn('Cloudinary upload error, using local fallback URL:', err);
    }
    return fileItem.url;
  };

  // Handle Form Submit
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

    // Upload files to Cloudinary CDN
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
    const pages = uploadedUrls.length > 0 ? uploadedUrls : [defaultThumb, 'assets/mystic_realms.jpg', 'assets/hero_banner.jpg'];

    const newItem = {
      title,
      type: currentType,
      genre,
      author,
      description: desc,
      isPaid: isPaidChoice,
      price,
      previewLimit,
      paymentUrl: paymentUrl,
      thumbnail: thumbnail,
      pages: pages,
      videoUrl: videoUrl
    };

    store.addItem(newItem);
    showToast(`¡Publicado exitosamente "${title}" en la nube Cloudinary con ${pages.length} páginas!`);
    renderCreatorStudio(containerEl, showToast);
  };

  // CMS Tab Switcher
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

  // CMS Row actions
  containerEl.querySelectorAll('.copy-ad-link-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const adUrl = `${window.location.origin}${window.location.pathname}?comic=${id}&utm_source=social_ad`;
      navigator.clipboard.writeText(adUrl).catch(() => {});
      showToast(`¡Enlace copiado! ${adUrl}`);
    };
  });

  containerEl.querySelectorAll('.toggle-pricing-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const target = store.getItems().find(i => i.id === id);
      if (target) {
        store.updateItemPricing(id, !target.isPaid, !target.isPaid ? 2.99 : 0);
        showToast(`Updated "${target.title}" to ${!target.isPaid ? 'Paid ($2.99)' : 'Free'}`);
        renderCreatorStudio(containerEl, showToast);
      }
    };
  });

  containerEl.querySelectorAll('.delete-cms-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      store.deleteItem(id);
      showToast('Item deleted from platform');
      renderCreatorStudio(containerEl, showToast);
    };
  });
}
