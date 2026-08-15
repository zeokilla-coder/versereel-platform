// VerseReel Store & Data Persistence Layer with IndexedDB (Unlimited Image Storage)
const STORAGE_KEY = 'versereel_data_v3';
const DB_NAME = 'VerseReelDB';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';

// Native IndexedDB Helper
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

// Clean Initial Data (No demo items)
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
    } catch (e) {
      // IndexedDB handles full storage if LocalStorage 5MB quota is exceeded
    }
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

  getWalletBalance() {
    return this.data.walletBalance || 0;
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

  topUpWallet(amount) {
    this.data.walletBalance += amount;
    this.saveData();
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

export const store = new Store();
