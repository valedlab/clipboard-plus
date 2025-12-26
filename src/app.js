// ============================================
// Clipboard+ Main Application
// ============================================

class ClipboardApp {
  constructor() {
    this.currentFilter = 'all';
    this.history = [];
    this.settings = {};
    
    this.init();
  }
  
  async init() {
    // Check if setup is complete
    const setupComplete = await window.clipboardAPI.isSetupComplete();
    
    if (!setupComplete) {
      this.showSetup();
    } else {
      await this.loadSettings();
      this.applyTheme();
      this.hideSetup();
      this.showApp();
      await this.loadHistory();
    }
    
    this.initWindowControls();
    this.initSetupWizard();
    this.initNavigation();
    this.initSearch();
    this.initModals();
    this.initClipboardEvents();
  }
  
  // ============================================
  // Setup Wizard
  // ============================================
  showSetup() {
    document.getElementById('setup-overlay').classList.remove('hidden');
    document.getElementById('app-container').classList.remove('visible');
  }
  
  hideSetup() {
    document.getElementById('setup-overlay').classList.add('hidden');
  }
  
  showApp() {
    document.getElementById('app-container').classList.add('visible');
  }
  
  initSetupWizard() {
    let currentStep = 1;
    
    const setupSettings = {
      enabled: true,
      saveText: true,
      saveCode: true,
      saveLinks: true,
      saveEmails: true,
      saveImages: true,
      savePasswords: false,
      encryptPasswords: true,
      hidePasswords: true,
      autoDeletePasswords: false,
      maxHistoryItems: 500,
      autoClear: 'never',
      theme: 'dark'
    };
    
    const goToStep = (step) => {
      // Update indicator
      document.querySelectorAll('.setup-step-indicator').forEach((indicator, i) => {
        indicator.classList.remove('active', 'completed');
        if (i + 1 < step) indicator.classList.add('completed');
        if (i + 1 === step) indicator.classList.add('active');
      });
      
      // Update content
      document.querySelectorAll('.setup-content').forEach((content, i) => {
        content.classList.toggle('active', i + 1 === step);
      });
      
      currentStep = step;
    };
    
    // Step 1: Start
    document.getElementById('start-setup')?.addEventListener('click', () => goToStep(2));
    
    // Step 2: Capture
    document.getElementById('back-to-1')?.addEventListener('click', () => goToStep(1));
    document.getElementById('next-to-3')?.addEventListener('click', () => {
      setupSettings.saveText = document.getElementById('save-text').checked;
      setupSettings.saveCode = document.getElementById('save-code').checked;
      setupSettings.saveLinks = document.getElementById('save-links').checked;
      setupSettings.saveEmails = document.getElementById('save-emails').checked;
      setupSettings.saveImages = document.getElementById('save-images').checked;
      goToStep(3);
    });
    
    // Step 3: Privacy
    document.getElementById('back-to-2')?.addEventListener('click', () => goToStep(2));
    document.getElementById('next-to-4')?.addEventListener('click', () => {
      setupSettings.savePasswords = document.getElementById('save-passwords').checked;
      setupSettings.encryptPasswords = document.getElementById('encrypt-passwords').checked;
      setupSettings.hidePasswords = document.getElementById('hide-passwords').checked;
      setupSettings.autoDeletePasswords = document.getElementById('auto-delete-passwords').checked;
      setupSettings.maxHistoryItems = parseInt(document.getElementById('history-limit').value) || 500;
      setupSettings.autoClear = document.getElementById('auto-clear').value;
      goToStep(4);
    });
    
    // Show/hide password options
    document.getElementById('save-passwords')?.addEventListener('change', (e) => {
      document.getElementById('password-options').style.display = e.target.checked ? 'flex' : 'none';
    });
    
    // Step 4: Theme & Finish
    document.getElementById('back-to-3')?.addEventListener('click', () => goToStep(3));
    document.getElementById('finish-setup')?.addEventListener('click', async () => {
      setupSettings.theme = document.querySelector('input[name="theme"]:checked')?.value || 'dark';
      
      await window.clipboardAPI.completeSetup(setupSettings);
      this.settings = setupSettings;
      this.applyTheme();
      this.hideSetup();
      this.showApp();
      await this.loadHistory();
      
      this.showToast('Clipboard+ is ready!');
    });
    
    // Theme preview
    document.querySelectorAll('input[name="theme"]').forEach(input => {
      input.addEventListener('change', () => {
        this.previewTheme(input.value);
      });
    });
  }
  
  // ============================================
  // Settings
  // ============================================
  async loadSettings() {
    this.settings = await window.clipboardAPI.getSettings();
  }
  
  applyTheme() {
    const theme = this.settings.theme || 'dark';
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.body.setAttribute('data-theme', theme);
    }
  }
  
  previewTheme(theme) {
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.body.setAttribute('data-theme', theme);
    }
  }
  
  // ============================================
  // Window Controls
  // ============================================
  initWindowControls() {
    document.getElementById('btn-minimize')?.addEventListener('click', () => window.clipboardAPI.minimize());
    document.getElementById('btn-maximize')?.addEventListener('click', () => window.clipboardAPI.maximize());
    document.getElementById('btn-close')?.addEventListener('click', () => window.clipboardAPI.close());
  }
  
  // ============================================
  // Navigation
  // ============================================
  initNavigation() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', async () => {
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update filter and reload
        this.currentFilter = tab.dataset.filter;
        await this.loadHistoryByFilter();
      });
    });
  }
  
  // ============================================
  // Search
  // ============================================
  initSearch() {
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    
    searchInput?.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        const query = searchInput.value.trim();
        if (query) {
          this.history = await window.clipboardAPI.searchHistory(query);
        } else {
          await this.loadHistoryByFilter();
          return;
        }
        this.renderHistory();
      }, 300);
    });
    
    // Focus search with Cmd/Ctrl+F
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInput?.focus();
      }
    });
  }
  
  // ============================================
  // History
  // ============================================
  async loadHistory() {
    this.history = await window.clipboardAPI.getHistory();
    this.renderHistory();
    this.updateStats();
  }
  
  async loadHistoryByFilter() {
    this.history = await window.clipboardAPI.getHistoryByType(this.currentFilter);
    this.renderHistory();
  }
  
  renderHistory() {
    const list = document.getElementById('clipboard-list');
    const emptyState = document.getElementById('empty-state');
    
    // Filter history based on current filter
    let filteredHistory = [...this.history];
    
    if (this.currentFilter === 'favorites') {
      filteredHistory = filteredHistory.filter(item => item.favorite);
    } else if (this.currentFilter !== 'all') {
      filteredHistory = filteredHistory.filter(item => item.type === this.currentFilter);
    }
    
    // Clear previous items but keep empty state element
    const existingItems = list.querySelectorAll('.clipboard-item');
    existingItems.forEach(item => item.remove());
    
    // Show/hide empty state
    if (filteredHistory.length === 0) {
      emptyState.style.display = 'flex';
      return;
    }
    
    emptyState.style.display = 'none';
    
    // Create and append items
    filteredHistory.forEach(item => {
      const itemElement = this.createItemElement(item);
      list.appendChild(itemElement);
    });
    
    // Attach event listeners
    this.attachItemEvents();
  }
  
  createItemElement(item) {
    const time = this.formatTime(item.timestamp);
    const typeIcon = this.getTypeIcon(item.type);
    const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
    
    const div = document.createElement('div');
    div.className = 'clipboard-item';
    div.dataset.id = item.id;
    
    let contentHtml = '';
    
    if (item.type === 'image') {
      contentHtml = `<div class="item-content image"><img src="${item.preview || item.content}" alt="Image"></div>`;
    } else if (item.type === 'password') {
      contentHtml = `<div class="item-content password">${item.isEncrypted ? '••••••••••••' : item.preview}</div>`;
    } else if (item.type === 'code') {
      contentHtml = `<div class="item-content code"><div class="item-preview">${this.escapeHtml(item.preview || item.content)}</div></div>`;
    } else {
      contentHtml = `<div class="item-content"><div class="item-preview">${this.escapeHtml(item.preview || item.content)}</div></div>`;
    }
    
    const tagsHtml = item.tags && item.tags.length > 0 
      ? `<div class="item-tags">${item.tags.map(tag => `<span class="item-tag">${tag}</span>`).join('')}</div>`
      : '';
    
    div.innerHTML = `
      <div class="item-header">
        <div class="item-type">
          <div class="item-type-icon">${typeIcon}</div>
          <span class="item-type-label">${typeLabel}</span>
        </div>
        <span class="item-time">${time}</span>
      </div>
      ${contentHtml}
      ${tagsHtml}
      <div class="item-actions">
        <button class="item-action copy" title="Copy">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        ${item.type === 'password' ? `
        <button class="item-action reveal" title="Reveal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        ` : ''}
        <button class="item-action favorite ${item.favorite ? 'active' : ''}" title="Favorite">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${item.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
        <button class="item-action delete" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;
    
    return div;
  }
  
  attachItemEvents() {
    // Copy
    document.querySelectorAll('.item-action.copy').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.clipboard-item');
        const id = item.dataset.id;
        await window.clipboardAPI.copyItem(id);
        this.showToast('Copied to clipboard');
      });
    });
    
    // Reveal password
    document.querySelectorAll('.item-action.reveal').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.clipboard-item');
        const id = item.dataset.id;
        const content = item.querySelector('.item-content');
        
        if (content.classList.contains('revealed')) {
          content.innerHTML = '••••••••••••';
          content.classList.remove('revealed');
        } else {
          const password = await window.clipboardAPI.revealPassword(id);
          content.textContent = password;
          content.classList.add('revealed');
          
          // Auto-hide after 5 seconds
          setTimeout(() => {
            if (content.classList.contains('revealed')) {
              content.innerHTML = '••••••••••••';
              content.classList.remove('revealed');
            }
          }, 5000);
        }
      });
    });
    
    // Favorite
    document.querySelectorAll('.item-action.favorite').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.clipboard-item');
        const id = item.dataset.id;
        const isFavorite = await window.clipboardAPI.toggleFavorite(id);
        
        btn.classList.toggle('active', isFavorite);
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        `;
        
        // Update local history
        const historyItem = this.history.find(h => h.id === id);
        if (historyItem) historyItem.favorite = isFavorite;
        
        this.showToast(isFavorite ? 'Added to favorites' : 'Removed from favorites');
        
        // If we're on favorites tab, re-render to remove unfavorited item
        if (this.currentFilter === 'favorites' && !isFavorite) {
          this.renderHistory();
        }
      });
    });
    
    // Delete
    document.querySelectorAll('.item-action.delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.clipboard-item');
        const id = item.dataset.id;
        
        // Add fade out animation
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        item.style.transition = 'all 0.2s ease';
        
        setTimeout(async () => {
          await window.clipboardAPI.deleteItem(id);
          this.history = this.history.filter(h => h.id !== id);
          item.remove();
          
          // Check if list is now empty
          const remainingItems = document.querySelectorAll('.clipboard-item');
          if (remainingItems.length === 0) {
            document.getElementById('empty-state').style.display = 'flex';
          }
          
          this.updateStats();
          this.showToast('Item deleted');
        }, 200);
      });
    });
    
    // Click item to copy
    document.querySelectorAll('.clipboard-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        // Don't copy if clicking on actions
        if (e.target.closest('.item-actions')) return;
        
        const id = item.dataset.id;
        await window.clipboardAPI.copyItem(id);
        
        // Visual feedback
        item.classList.add('active');
        setTimeout(() => item.classList.remove('active'), 200);
        
        this.showToast('Copied to clipboard');
      });
    });
  }
  
  async updateStats() {
    const stats = await window.clipboardAPI.getStats();
    
    const countAll = document.getElementById('count-all');
    const statusTotal = document.getElementById('status-total');
    
    if (countAll) countAll.textContent = stats.total;
    if (statusTotal) statusTotal.textContent = `${stats.total} items`;
  }
  
  // ============================================
  // Modals
  // ============================================
  initModals() {
    // Settings modal
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.openSettingsModal();
    });
    
    document.getElementById('close-settings')?.addEventListener('click', () => {
      this.closeModal('settings-modal');
    });
    
    // Clear history button
    document.getElementById('btn-clear')?.addEventListener('click', () => {
      this.showConfirm(
        'Clear all history?',
        'This will permanently delete all clipboard items.',
        async () => {
          await window.clipboardAPI.clearHistory();
          this.history = [];
          this.renderHistory();
          this.updateStats();
          this.showToast('History cleared');
        }
      );
    });
    
    // Clear all data in settings
    document.getElementById('clear-all-data')?.addEventListener('click', () => {
      this.showConfirm(
        'Clear all data?',
        'This will permanently delete all clipboard history.',
        async () => {
          await window.clipboardAPI.clearHistory();
          this.history = [];
          this.renderHistory();
          this.updateStats();
          this.closeModal('settings-modal');
          this.showToast('All data cleared');
        }
      );
    });
    
    // Reset app
    document.getElementById('reset-app')?.addEventListener('click', () => {
      this.showConfirm(
        'Reset app?',
        'This will clear all data and restart setup.',
        async () => {
          await window.clipboardAPI.resetApp();
          location.reload();
        }
      );
    });
    
    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('visible');
        }
      });
    });
    
    // Confirm modal cancel button
    document.getElementById('confirm-cancel')?.addEventListener('click', () => {
      this.closeModal('confirm-modal');
    });
    
    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.visible').forEach(modal => {
          modal.classList.remove('visible');
        });
      }
    });
  }
  
  openSettingsModal() {
    // Populate current settings
    const settingText = document.getElementById('setting-text');
    const settingCode = document.getElementById('setting-code');
    const settingLinks = document.getElementById('setting-links');
    const settingEmails = document.getElementById('setting-emails');
    const settingImages = document.getElementById('setting-images');
    const settingPasswords = document.getElementById('setting-passwords');
    const settingLimit = document.getElementById('setting-limit');
    
    if (settingText) settingText.checked = this.settings.saveText !== false;
    if (settingCode) settingCode.checked = this.settings.saveCode !== false;
    if (settingLinks) settingLinks.checked = this.settings.saveLinks !== false;
    if (settingEmails) settingEmails.checked = this.settings.saveEmails !== false;
    if (settingImages) settingImages.checked = this.settings.saveImages !== false;
    if (settingPasswords) settingPasswords.checked = this.settings.savePasswords === true;
    if (settingLimit) settingLimit.value = this.settings.maxHistoryItems || 500;
    
    // Theme
    const themeRadios = document.querySelectorAll('input[name="settings-theme"]');
    themeRadios.forEach(radio => {
      radio.checked = radio.value === this.settings.theme;
    });
    
    // Show modal
    document.getElementById('settings-modal').classList.add('visible');
    
    // Remove old listeners and add new ones
    const settingsModal = document.getElementById('settings-modal');
    const inputs = settingsModal.querySelectorAll('input, select');
    
    inputs.forEach(input => {
      // Clone to remove old listeners
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);
      
      newInput.addEventListener('change', () => this.saveCurrentSettings());
    });
  }
  
  async saveCurrentSettings() {
    const settingText = document.getElementById('setting-text');
    const settingCode = document.getElementById('setting-code');
    const settingLinks = document.getElementById('setting-links');
    const settingEmails = document.getElementById('setting-emails');
    const settingImages = document.getElementById('setting-images');
    const settingPasswords = document.getElementById('setting-passwords');
    const settingLimit = document.getElementById('setting-limit');
    const selectedTheme = document.querySelector('input[name="settings-theme"]:checked');
    
    this.settings.saveText = settingText?.checked ?? true;
    this.settings.saveCode = settingCode?.checked ?? true;
    this.settings.saveLinks = settingLinks?.checked ?? true;
    this.settings.saveEmails = settingEmails?.checked ?? true;
    this.settings.saveImages = settingImages?.checked ?? true;
    this.settings.savePasswords = settingPasswords?.checked ?? false;
    this.settings.theme = selectedTheme?.value || 'dark';
    this.settings.maxHistoryItems = parseInt(settingLimit?.value) || 500;
    
    await window.clipboardAPI.saveSettings(this.settings);
    this.applyTheme();
  }
  
  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('visible');
    }
  }
  
  showConfirm(title, message, onConfirm) {
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmIcon = document.getElementById('confirm-icon');
    const confirmAction = document.getElementById('confirm-action');
    
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmMessage) confirmMessage.textContent = message;
    if (confirmIcon) confirmIcon.classList.add('warning');
    
    // Clone button to remove old listeners
    if (confirmAction) {
      const newConfirmBtn = confirmAction.cloneNode(true);
      confirmAction.parentNode.replaceChild(newConfirmBtn, confirmAction);
      
      newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        this.closeModal('confirm-modal');
      });
    }
    
    document.getElementById('confirm-modal')?.classList.add('visible');
  }
  
  // ============================================
  // Clipboard Events
  // ============================================
  initClipboardEvents() {
    window.clipboardAPI.onClipboardUpdate((item) => {
      // Add to beginning of history
      this.history.unshift(item);
      
      // If current filter matches or is 'all', re-render
      if (this.currentFilter === 'all' || this.currentFilter === item.type) {
        this.renderHistory();
      }
      
      this.updateStats();
    });
    
    window.clipboardAPI.onHistoryCleared(() => {
      this.history = [];
      this.renderHistory();
      this.updateStats();
    });
  }
  
  // ============================================
  // Utilities
  // ============================================
  getTypeIcon(type) {
    const icons = {
      text: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>`,
      code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>`,
      link: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>`,
      email: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>`,
      image: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>`,
      password: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>`,
      phone: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>`,
      color: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="4"/>
      </svg>`
    };
    
    return icons[type] || icons.text;
  }
  
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
  }
  
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.classList.add('visible');
    
    // Clear any existing timeout
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2500);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.clipboardApp = new ClipboardApp();
});