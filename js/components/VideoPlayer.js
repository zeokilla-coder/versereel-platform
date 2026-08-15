// Video Player Component with Preview Time-Lock Enforcer
import { store } from '../store.js';

export function createVideoPlayerModal(item, onClose, onUnlockRequest) {
  const isUnlocked = store.isItemUnlocked(item.id);
  const previewLimitSec = item.previewLimit !== undefined ? item.previewLimit : (item.isPaid ? 15 : 99999);

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.maxWidth = '1000px';

  let videoElement = null;
  let isLockedState = false;

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
          <div style="display: flex; gap: 1rem; color: var(--text-dim); font-size: 0.85rem;">
            <span><i class="ph-user"></i> ${item.author}</span>
            <span><i class="ph-eye"></i> ${item.views || 0} views</span>
            <span><i class="ph-tag"></i> ${item.genre}</span>
          </div>
        </div>
      </div>
    `;

    // Attach Event Listeners
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

  // Increment views
  store.incrementViews(item.id);
}
