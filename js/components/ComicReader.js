// Comic Reader Component with Paywall Enforcement
import { store } from '../store.js';

export function createComicReaderModal(item, onClose, onUnlockRequest) {
  let currentPageIndex = 0;
  const pages = item.pages || [item.thumbnail];
  const isUnlocked = store.isItemUnlocked(item.id);
  const previewLimit = item.previewLimit !== undefined ? item.previewLimit : (item.isPaid ? 2 : 999);

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const content = document.createElement('div');
  content.className = 'modal-content';

  function renderBody() {
    const isLockedPage = item.isPaid && !isUnlocked && currentPageIndex >= previewLimit;

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
            <img src="${pages[currentPageIndex]}" alt="Page ${currentPageIndex + 1}" class="comic-page-img" />
          `}
        </div>

        <div class="reader-controls">
          <button class="btn-secondary" id="prev-page-btn" ${currentPageIndex === 0 ? 'disabled' : ''}>
            <i class="ph-caret-left"></i> Previous Page
          </button>
          
          <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">
            Page <span style="color: var(--primary);">${currentPageIndex + 1}</span> of ${pages.length}
            ${item.isPaid && !isUnlocked ? `<span style="font-size:0.8rem; color:var(--amber); margin-left:0.5rem;">(Preview ${previewLimit} pages)</span>` : ''}
          </div>

          <button class="btn-primary" id="next-page-btn" ${currentPageIndex === pages.length - 1 ? 'disabled' : ''}>
            Next Page <i class="ph-caret-right"></i>
          </button>
        </div>
      </div>
    `;

    // Attach Listeners
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

  // Increment view counter
  store.incrementViews(item.id);
}
