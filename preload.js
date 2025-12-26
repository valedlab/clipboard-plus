const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipboardAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  isSetupComplete: () => ipcRenderer.invoke('is-setup-complete'),
  completeSetup: (settings) => ipcRenderer.invoke('complete-setup', settings),
  resetApp: () => ipcRenderer.invoke('reset-app'),
  
  // Auto-start
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
  
  // History
  getHistory: () => ipcRenderer.invoke('get-history'),
  getHistoryByType: (type) => ipcRenderer.invoke('get-history-by-type', type),
  searchHistory: (query) => ipcRenderer.invoke('search-history', query),
  copyItem: (id) => ipcRenderer.invoke('copy-item', id),
  deleteItem: (id) => ipcRenderer.invoke('delete-item', id),
  toggleFavorite: (id) => ipcRenderer.invoke('toggle-favorite', id),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  getStats: () => ipcRenderer.invoke('get-stats'),
  revealPassword: (id) => ipcRenderer.invoke('reveal-password', id),
  exportHistory: () => ipcRenderer.invoke('export-history'),
  
  // Events
  onClipboardUpdate: (callback) => {
    ipcRenderer.on('clipboard-update', (_, data) => callback(data));
  },
  onHistoryCleared: (callback) => {
    ipcRenderer.on('history-cleared', () => callback());
  }
});