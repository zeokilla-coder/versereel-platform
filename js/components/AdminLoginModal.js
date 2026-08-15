// Admin Authentication Login Modal Component
import { store } from '../store.js';

export function createAdminLoginModal(onSuccess, showToast) {
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
  closeBtn.onclick = () => {
    document.body.removeChild(backdrop);
  };

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
