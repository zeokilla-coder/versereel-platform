// Wallet Balance & Top-Up Modal Component
import { store } from '../store.js';

export function createWalletModal(onClose, showToast) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.maxWidth = '550px';

  function renderBody() {
    const balance = store.getWalletBalance();
    const txs = store.data.transactions || [];

    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">
          <i class="ph-wallet" style="color: var(--emerald);"></i>
          <span>User Wallet & Demo Balance</span>
        </div>
        <button class="close-btn" id="wallet-close-btn">&times;</button>
      </div>
      <div class="modal-body">
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(6, 182, 212, 0.15)); border: 1px solid var(--emerald); border-radius: var(--radius-md); padding: 1.75rem; text-align: center; margin-bottom: 1.5rem;">
          <div style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Available Balance</div>
          <div style="font-size: 2.8rem; font-weight: 900; color: #34d399; margin: 0.25rem 0;">$${balance.toFixed(2)}</div>
          <p style="font-size: 0.82rem; color: var(--text-muted);">Use credits to instantly unlock paid comics & videos on the platform.</p>
        </div>

        <h4 style="color: #fff; font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">Simulate Quick Top-Up</h4>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.75rem;">
          <button class="btn-secondary topup-btn" data-amount="10" style="justify-content: center;">+$10.00</button>
          <button class="btn-secondary topup-btn" data-amount="25" style="justify-content: center; border-color: var(--emerald); color: #34d399;">+$25.00</button>
          <button class="btn-secondary topup-btn" data-amount="50" style="justify-content: center;">+$50.00</button>
        </div>

        <h4 style="color: #fff; font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">Recent Purchase Receipts</h4>
        <div style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem;">
          ${txs.length === 0 ? '<div style="color: var(--text-dim); font-size: 0.85rem; text-align: center;">No purchases yet</div>' : ''}
          ${txs.map(tx => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); padding: 0.6rem 0.9rem; border-radius: var(--radius-sm); font-size: 0.85rem;">
              <div>
                <div style="font-weight: 700; color: #fff;">${tx.title}</div>
                <div style="font-size: 0.75rem; color: var(--text-dim);">${tx.date}</div>
              </div>
              <div style="font-weight: 800; color: var(--rose);">-$${tx.amount.toFixed(2)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    content.querySelector('#wallet-close-btn').onclick = () => {
      document.body.removeChild(backdrop);
      if (onClose) onClose();
    };

    content.querySelectorAll('.topup-btn').forEach(btn => {
      btn.onclick = () => {
        const amt = parseFloat(btn.dataset.amount);
        store.topUpWallet(amt);
        if (showToast) showToast(`Added +$${amt.toFixed(2)} to your wallet!`);
        renderBody();
      };
    });
  }

  backdrop.appendChild(content);
  document.body.appendChild(backdrop);
  renderBody();
}
