const { app, BrowserWindow, ipcMain, clipboard, globalShortcut, nativeImage, Tray, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

const store = new Store();
let mainWindow;
let tray = null;
let lastClipboardContent = '';
let clipboardWatcher = null;

// Icon path - use logo.ico
const iconPath = path.join(__dirname, 'logo.ico');
const trayIconPath = path.join(__dirname, 'logo.ico');

// ============================================
// Auto-Start Management
// ============================================
function setAutoStart(enabled) {
  try {
    if (process.platform === 'win32') {
      const fs = require('fs');
      const shortcut = require('electron-shortcut-normalizer');
      
      if (enabled) {
        // Create shortcut for Windows startup
        const shell = require('shelljs');
        // Use Windows API to create shortcut
        if (typeof shell.exec !== 'undefined') {
          const appPath = app.getPath('exe');
          const shortcutPath = path.join(os.homedir(), 'AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\ClipboardPlus.lnk');
          // This would need a native module - instead we use a simpler approach
          store.set('autoStart', true);
        }
      } else {
        store.set('autoStart', false);
      }
    }
    return true;
  } catch (error) {
    console.error('Auto-start error:', error);
    return false;
  }
}

function isAutoStartEnabled() {
  return store.get('autoStart', false);
}

function setupAutoStart() {
  if (isAutoStartEnabled()) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true
    });
  }
}

// ============================================
// Window Creation
// ============================================
function createWindow() {
  const settings = store.get('settings', {});
  const setupComplete = store.get('setupComplete', false);
  
  mainWindow = new BrowserWindow({
    width: 480,
    height: 680,
    minWidth: 400,
    minHeight: 500,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    resizable: true,
    skipTaskbar: true
  });

  mainWindow.loadFile('src/index.html');

  // Show window only on first launch (setup) or if explicitly shown
  mainWindow.once('ready-to-show', () => {
    // Only show if setup is not complete
    if (!setupComplete) {
      mainWindow.show();
    }
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  // Start clipboard watching
  startClipboardWatcher();
}

// ============================================
// Tray Icon
// ============================================
function createTray() {
  // Use logo.ico for tray icon
  const trayIcon = nativeImage.createFromPath(trayIconPath);
  tray = new Tray(trayIcon);
  
  const autoStartEnabled = isAutoStartEnabled();
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Clipboard+', click: () => {
      mainWindow.show();
      mainWindow.focus();
    }},
    { type: 'separator' },
    { 
      label: 'Auto-start on boot',
      type: 'checkbox',
      checked: autoStartEnabled,
      click: (menuItem) => {
        setAutoStart(menuItem.checked);
        setupAutoStart();
      }
    },
    { label: 'Clear History', click: () => clearHistory() },
    { type: 'separator' },
    { label: 'Quit Clipboard+', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  
  tray.setToolTip('Clipboard+ - Running in background');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ============================================
// Clipboard Watching
// ============================================
function startClipboardWatcher() {
  const settings = store.get('settings', {});
  if (!settings.enabled) return;
  
  // Clear any existing watcher
  if (clipboardWatcher) {
    clearInterval(clipboardWatcher);
  }
  
  // Poll clipboard every 500ms
  clipboardWatcher = setInterval(() => {
    try {
      // Check for image first
      const image = clipboard.readImage();
      if (!image.isEmpty()) {
        const imageDataUrl = image.toDataURL();
        if (imageDataUrl !== lastClipboardContent) {
          lastClipboardContent = imageDataUrl;
          if (settings.saveImages !== false) {
            saveClipboardItem({
              type: 'image',
              content: imageDataUrl,
              preview: image.resize({ width: 100 }).toDataURL()
            });
          }
        }
        return;
      }
      
      // Check for text
      const text = clipboard.readText();
      if (text && text !== lastClipboardContent) {
        lastClipboardContent = text;
        processTextClipboard(text, settings);
      }
    } catch (error) {
      console.error('Clipboard watch error:', error);
    }
  }, 500);
}

function stopClipboardWatcher() {
  if (clipboardWatcher) {
    clearInterval(clipboardWatcher);
    clipboardWatcher = null;
  }
}

function processTextClipboard(text, settings) {
  const classification = classifyContent(text);
  
  // Check if this type should be saved based on settings
  if (classification.type === 'code' && settings.saveCode === false) return;
  if (classification.type === 'email' && settings.saveEmails === false) return;
  if (classification.type === 'link' && settings.saveLinks === false) return;
  if (classification.type === 'password' && settings.savePasswords === false) return;
  
  // Handle password privacy
  let content = text;
  let isEncrypted = false;
  
  if (classification.type === 'password' && settings.encryptPasswords !== false) {
    content = encryptContent(text);
    isEncrypted = true;
  }
  
  // Special handling: If code contains links, save both separately
  if (classification.type === 'code' && classification.metadata.urls && classification.metadata.urls.length > 0) {
    // Save the code
    saveClipboardItem({
      type: classification.type,
      content: content,
      preview: getPreview(text, classification.type),
      tags: classification.tags,
      isEncrypted: isEncrypted,
      metadata: classification.metadata
    });
    
    // Extract and save links separately
    classification.metadata.urls.forEach(url => {
      saveClipboardItem({
        type: 'link',
        content: url,
        preview: getPreview(url, 'link'),
        tags: ['link', 'extracted-from-code'],
        isEncrypted: false,
        metadata: {
          extractedFrom: 'code',
          domain: extractDomain(url)
        }
      });
    });
  } else {
    saveClipboardItem({
      type: classification.type,
      content: content,
      preview: getPreview(text, classification.type),
      tags: classification.tags,
      isEncrypted: isEncrypted,
      metadata: classification.metadata
    });
  }
}

function classifyContent(text) {
  const result = {
    type: 'text',
    tags: [],
    metadata: {}
  };
  
  // Trim for analysis
  const trimmed = text.trim();
  
  // Email detection
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const emailsInText = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  
  if (emailRegex.test(trimmed)) {
    result.type = 'email';
    result.tags.push('email');
    result.metadata.domain = trimmed.split('@')[1];
    return result;
  }
  
  if (emailsInText && emailsInText.length > 0) {
    result.tags.push('contains-email');
    result.metadata.emails = emailsInText;
  }
  
  // URL/Link detection
  const urlRegex = /^(https?:\/\/|www\.)[^\s]+$/i;
  const urlsInText = text.match(/(https?:\/\/|www\.)[^\s]+/gi);
  
  if (urlRegex.test(trimmed)) {
    result.type = 'link';
    result.tags.push('link');
    try {
      const url = new URL(trimmed.startsWith('www.') ? 'https://' + trimmed : trimmed);
      result.metadata.domain = url.hostname;
      result.metadata.protocol = url.protocol;
    } catch (e) {}
    return result;
  }
  
  if (urlsInText && urlsInText.length > 0) {
    result.tags.push('contains-link');
    result.metadata.urls = urlsInText;
  }
  
  // Password detection (heuristics)
  const passwordIndicators = [
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, // Strong password pattern
    /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{12,}$/, // Long random string
  ];
  
  const looksLikePassword = 
    trimmed.length >= 8 && 
    trimmed.length <= 128 &&
    !trimmed.includes(' ') &&
    !trimmed.includes('\n') &&
    (
      passwordIndicators.some(r => r.test(trimmed)) ||
      (hasUpperCase(trimmed) && hasLowerCase(trimmed) && hasNumber(trimmed) && hasSpecialChar(trimmed))
    );
  
  if (looksLikePassword) {
    result.type = 'password';
    result.tags.push('password', 'sensitive');
    result.metadata.strength = calculatePasswordStrength(trimmed);
    return result;
  }
  
  // Code detection
  const codeIndicators = [
    /^(const|let|var|function|class|import|export|if|else|for|while|return|def|public|private|async|await)\s/m,
    /[{}\[\]();].*[{}\[\]();]/,
    /^\s*(\/\/|#|\/\*|\*|<!--|-->)/m,
    /=>/,
    /\$\{.*\}/,
    /^<[a-zA-Z][^>]*>/m,
    /\.(js|ts|py|java|cpp|c|html|css|json|xml|yaml|yml|md|sh|bash|sql)$/i,
    /^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\s/i,
    /^\s*@(import|media|keyframes|mixin|include)/m,
    /console\.(log|error|warn)/,
    /document\.|window\.|querySelector/,
    /\b(null|undefined|true|false|None|True|False)\b/,
  ];
  
  const hasCodeIndicators = codeIndicators.some(r => r.test(text));
  const hasMultipleLines = text.split('\n').length > 2;
  const hasIndentation = /^\s{2,}/m.test(text);
  
  if (hasCodeIndicators && (hasMultipleLines || hasIndentation || text.length > 50)) {
    result.type = 'code';
    result.tags.push('code');
    
    // Detect language
    const language = detectCodeLanguage(text);
    if (language) {
      result.tags.push(language);
      result.metadata.language = language;
    }
    
    // Extract URLs from code
    const urlsInCode = text.match(/(https?:\/\/|www\.)[^\s\n\)"`\]]+/gi);
    if (urlsInCode && urlsInCode.length > 0) {
      result.metadata.urls = urlsInCode;
      result.tags.push('contains-link');
    }
    
    return result;
  }
  
  // Phone number detection
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  if (phoneRegex.test(trimmed.replace(/\s/g, ''))) {
    result.type = 'phone';
    result.tags.push('phone', 'contact');
    return result;
  }
  
  // Color detection
  const colorRegex = /^(#[0-9A-Fa-f]{3,8}|rgb\(|rgba\(|hsl\(|hsla\()/;
  if (colorRegex.test(trimmed)) {
    result.type = 'color';
    result.tags.push('color', 'design');
    result.metadata.color = trimmed;
    return result;
  }
  
  // Default to text
  result.type = 'text';
  result.tags.push('text');
  
  // Add word count for text
  result.metadata.wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  result.metadata.charCount = text.length;
  
  return result;
}

function detectCodeLanguage(code) {
  const patterns = {
    'javascript': [/\b(const|let|var|function|=>|console\.log|document\.|window\.)\b/, /\.js$/i],
    'typescript': [/\b(interface|type|enum|namespace|declare)\b/, /\.ts$/i],
    'python': [/\b(def|import|from|class|self|elif|print\(|__init__)\b/, /\.py$/i],
    'html': [/^<!DOCTYPE|<html|<head|<body|<div|<span|<p>/i],
    'css': [/\{[\s\S]*?:[\s\S]*?;[\s\S]*?\}|@media|@import|@keyframes/],
    'json': [/^\s*[\{\[][\s\S]*[\}\]]\s*$/],
    'sql': [/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|CREATE|DROP|ALTER)\b/i],
    'java': [/\b(public|private|protected|class|static|void|String|int|boolean)\b/],
    'cpp': [/\b(#include|iostream|std::|int main|cout|cin)\b/],
    'bash': [/^#!/, /\b(echo|export|source|chmod|mkdir|cd|ls|grep|awk|sed)\b/],
    'yaml': [/^\s*[\w-]+:\s*[^\n]*$/m],
    'markdown': [/^#{1,6}\s|^\*\s|\[.*\]\(.*\)|^>\s/m]
  };
  
  for (const [lang, regexes] of Object.entries(patterns)) {
    if (regexes.some(r => r.test(code))) {
      return lang;
    }
  }
  
  return null;
}

function hasUpperCase(str) { return /[A-Z]/.test(str); }
function hasLowerCase(str) { return /[a-z]/.test(str); }
function hasNumber(str) { return /[0-9]/.test(str); }
function hasSpecialChar(str) { return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(str); }

function calculatePasswordStrength(password) {
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (password.length >= 16) strength++;
  if (hasUpperCase(password)) strength++;
  if (hasLowerCase(password)) strength++;
  if (hasNumber(password)) strength++;
  if (hasSpecialChar(password)) strength++;
  
  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  if (strength <= 6) return 'strong';
  return 'very-strong';
}

function encryptContent(text) {
  // Simple base64 encoding (in production, use proper encryption)
  return Buffer.from(text).toString('base64');
}

function decryptContent(encrypted) {
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url.startsWith('www.') ? 'https://' + url : url);
    return urlObj.hostname;
  } catch (e) {
    return url;
  }
}

function getPreview(text, type) {
  if (type === 'password') {
    return '••••••••••••';
  }
  
  const maxLength = 100;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function saveClipboardItem(item) {
  const history = store.get('clipboardHistory', []);
  const settings = store.get('settings', {});
  
  const newItem = {
    id: uuidv4(),
    ...item,
    timestamp: Date.now(),
    favorite: false
  };
  
  // Add to beginning of array
  history.unshift(newItem);
  
  // Limit history size
  const maxItems = settings.maxHistoryItems || 500;
  if (history.length > maxItems) {
    history.splice(maxItems);
  }
  
  store.set('clipboardHistory', history);
  
  // Notify renderer
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('clipboard-update', newItem);
  }
}

function clearHistory() {
  store.set('clipboardHistory', []);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('history-cleared');
  }
}

// ============================================
// App Lifecycle
// ============================================
app.whenReady().then(() => {
  // Setup auto-start on boot
  setupAutoStart();
  
  createWindow();
  createTray();
  
  // Global shortcut to show/hide
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit the app on window close - let it run in background
  // Only quit on explicit app quit
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopClipboardWatcher();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// ============================================
// IPC Handlers
// ============================================

// Window controls
ipcMain.handle('window-minimize', () => mainWindow.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.handle('window-close', () => mainWindow.hide());

// Settings
ipcMain.handle('get-settings', () => store.get('settings', {}));
ipcMain.handle('save-settings', (_, settings) => {
  store.set('settings', settings);
  // Restart clipboard watcher with new settings
  stopClipboardWatcher();
  startClipboardWatcher();
  return true;
});

ipcMain.handle('is-setup-complete', () => store.get('setupComplete', false));
ipcMain.handle('complete-setup', (_, settings) => {
  store.set('settings', settings);
  store.set('setupComplete', true);
  startClipboardWatcher();
  return true;
});

ipcMain.handle('reset-app', () => {
  store.clear();
  return true;
});

// Auto-start
ipcMain.handle('get-auto-start', () => isAutoStartEnabled());
ipcMain.handle('set-auto-start', (_, enabled) => {
  setAutoStart(enabled);
  setupAutoStart();
  
  // Update tray menu
  if (tray) {
    const contextMenu = tray.getContextMenu();
    // Recreate tray with updated menu
    createTray();
  }
  
  return true;
});

// Clipboard history
ipcMain.handle('get-history', () => store.get('clipboardHistory', []));

ipcMain.handle('get-history-by-type', (_, type) => {
  const history = store.get('clipboardHistory', []);
  if (type === 'all') return history;
  if (type === 'favorites') return history.filter(item => item.favorite);
  return history.filter(item => item.type === type);
});

ipcMain.handle('search-history', (_, query) => {
  const history = store.get('clipboardHistory', []);
  const lowerQuery = query.toLowerCase();
  return history.filter(item => {
    if (item.type === 'password' && item.isEncrypted) return false;
    return item.content.toLowerCase().includes(lowerQuery) ||
           item.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));
  });
});

ipcMain.handle('copy-item', (_, id) => {
  const history = store.get('clipboardHistory', []);
  const item = history.find(i => i.id === id);
  
  if (!item) return false;
  
  if (item.type === 'image') {
    const image = nativeImage.createFromDataURL(item.content);
    clipboard.writeImage(image);
  } else {
    let content = item.content;
    if (item.isEncrypted) {
      content = decryptContent(content);
    }
    clipboard.writeText(content);
  }
  
  // Update last used timestamp
  item.lastUsed = Date.now();
  store.set('clipboardHistory', history);
  
  return true;
});

ipcMain.handle('delete-item', (_, id) => {
  const history = store.get('clipboardHistory', []);
  const index = history.findIndex(i => i.id === id);
  if (index !== -1) {
    history.splice(index, 1);
    store.set('clipboardHistory', history);
  }
  return true;
});

ipcMain.handle('toggle-favorite', (_, id) => {
  const history = store.get('clipboardHistory', []);
  const item = history.find(i => i.id === id);
  if (item) {
    item.favorite = !item.favorite;
    store.set('clipboardHistory', history);
    return item.favorite;
  }
  return false;
});

ipcMain.handle('clear-history', () => {
  clearHistory();
  return true;
});

ipcMain.handle('get-stats', () => {
  const history = store.get('clipboardHistory', []);
  return {
    total: history.length,
    text: history.filter(i => i.type === 'text').length,
    code: history.filter(i => i.type === 'code').length,
    links: history.filter(i => i.type === 'link').length,
    emails: history.filter(i => i.type === 'email').length,
    images: history.filter(i => i.type === 'image').length,
    passwords: history.filter(i => i.type === 'password').length,
    favorites: history.filter(i => i.favorite).length
  };
});

ipcMain.handle('reveal-password', (_, id) => {
  const history = store.get('clipboardHistory', []);
  const item = history.find(i => i.id === id);
  if (item && item.isEncrypted) {
    return decryptContent(item.content);
  }
  return item?.content || '';
});

ipcMain.handle('export-history', () => {
  const history = store.get('clipboardHistory', []);
  // Filter out sensitive items
  const safeHistory = history.filter(i => i.type !== 'password').map(item => ({
    type: item.type,
    content: item.type === 'image' ? '[Image]' : item.content,
    tags: item.tags,
    timestamp: item.timestamp
  }));
  return JSON.stringify(safeHistory, null, 2);
});