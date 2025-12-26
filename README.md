# 📋 Clipboard+

> A powerful, intelligent clipboard manager that runs silently in the background and automatically saves, classifies, and organizes everything you copy.

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Version](https://img.shields.io/badge/Version-1.0.0-green.svg)
![Platform](https://img.shields.io/badge/Platform-Windows-0078d4.svg)

## ✨ Features

### 🎯 Smart Clipboard Management
- **Automatic History** - Every copy is instantly saved
- **Content Classification** - Automatically detects: Text, Code, Links, Images, Emails, Passwords, Phone Numbers, Colors
- **Smart Link Extraction** - Automatically extracts URLs from code snippets
- **Search & Filter** - Quickly find what you copied with powerful search

### 🔐 Security & Privacy
- **Password Detection** - Automatically identifies and encrypts passwords
- **Encrypted Storage** - Sensitive data is encrypted locally
- **Local-Only** - All data stays on your computer (no cloud sync)
- **Auto-Delete** - Optional automatic cleanup of old items

### 🚀 Background Operation
- **Always Running** - Monitors clipboard even when window is closed
- **System Tray** - Minimal footprint in your taskbar
- **Auto-Start** - Launches automatically on PC boot
- **Global Hotkey** - `Ctrl+Shift+V` to show/hide anytime
- **Zero Performance Impact** - Lightweight background process

### 🎨 User-Friendly Interface
- **Dark & Light Themes** - Choose your preferred look
- **Modern UI** - Clean, intuitive design
- **Tag System** - Organize and filter by type
- **Favorites** - Mark important items for quick access
- **Scroll-Friendly** - Smooth scrolling for unlimited items

## 📥 Installation

### Option 1: Download Installer (Recommended)
1. Download the latest `installer.exe` from [Releases](https://github.com/valedlab/clipboard-plus/releases)
2. Run the installer
3. Check "Auto-start on boot" (optional)
4. Done! App starts automatically on reboot

### Option 2: Build from Source
```bash
# Clone the repository
git clone https://github.com/valedlab/clipboard-plus.git
cd clipboard-plus

# Install dependencies
npm install

# Build Windows installer
npm run build-win
```

The installer will be created in `dist/` folder.

## 🚀 Quick Start

### First Launch
1. **Setup Wizard** appears on first run
2. **Choose preferences** - What to capture (text, code, images, etc.)
3. **Privacy settings** - Password encryption, history limits
4. **Select theme** - Dark or Light mode
5. **Done!** - App minimizes to tray and starts monitoring

### Daily Usage
- **Show/Hide** - Click tray icon or press `Ctrl+Shift+V`
- **Copy something** - Automatically saved to history
- **Search** - Use `Ctrl+F` to find items
- **Access menu** - Right-click tray icon for options

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+V` | Toggle window visibility |
| `Ctrl+F` | Search history |
| `Delete` | Remove selected item |
| `Ctrl+C` | Copy to clipboard |

## 🎯 What Gets Saved

✅ **Text** - Plain text, documents, notes
✅ **Code** - JavaScript, Python, HTML, CSS, SQL, and more
✅ **Links** - URLs, websites, extracted from code
✅ **Images** - Screenshots, pictures
✅ **Emails** - Automatically detected
✅ **Phone Numbers** - Contact info
✅ **Colors** - HEX, RGB, RGBA codes
✅ **Passwords** - Encrypted automatically

## 🔧 Development

### Prerequisites
- Node.js v16+
- npm
- Windows 10/11

### Setup
```bash
npm install
npm start              # Run in development mode
npm run dev           # With debug tools
npm run build-win     # Create installer
```

### Project Structure
```
clipboard-plus/
├── main.js                 # Electron main process
├── preload.js             # IPC bridge
├── src/
│   ├── index.html         # UI
│   ├── app.js             # Frontend logic
│   └── styles.css         # Styling
├── assets/
│   └── icons/
├── package.json           # Dependencies
└── README.md
```

## 📦 System Requirements

- **OS**: Windows 10/11 (64-bit)
- **RAM**: 256MB minimum (512MB recommended)
- **Disk**: 150MB for installation
- **.NET**: Not required

## 🔍 Configuration

### Via Settings Panel
1. Click tray icon to show window
2. Click ⚙️ (Settings) in bottom-right
3. Configure:
   - What to capture (text, code, links, etc.)
   - Password encryption
   - History limits (default: 500 items)
   - Theme preference
   - Auto-clear intervals

### Via Tray Menu
- Right-click tray icon
- Toggle "Auto-start on boot"
- Clear history
- Access settings

## 📊 Data Storage

All data stored locally in:
```
%APPDATA%\clipboard-plus\
```

Includes:
- Clipboard history
- User settings
- Preferences
- Configuration

**No cloud sync, no external services, no tracking.**

## 🛡️ Security

- ✅ All data stored locally
- ✅ No internet connection required
- ✅ Passwords auto-detected and encrypted
- ✅ User-level permissions only
- ✅ Open source for transparency
- ✅ No telemetry or tracking

## 📝 Usage Examples

### Example 1: Copy Code with Links
```javascript
// API: https://api.example.com
const URL = 'https://docs.example.com';
```

**Result**: 
- Code item saved
- 2 link items automatically extracted
- All stored and tagged

### Example 2: Password Detection
When you copy something like: `Abc123!@#xyz`

**Result**:
- Auto-detected as password
- Encrypted automatically
- Hidden by default (masked as dots)

### Example 3: Search
- Press `Ctrl+F`
- Type: `api`
- All items containing "api" appear instantly

## 🐛 Troubleshooting

### App not starting on boot?
- Right-click tray icon
- Check "Auto-start on boot"
- Or toggle in Settings

### Window not showing?
- Click tray icon
- Or press `Ctrl+Shift+V`
- Check system tray (bottom-right)

### History not saving?
- Check Settings > Capture
- Ensure relevant types are enabled
- Restart the app

### Performance slow?
- Clear old history: Right-click tray > Clear History
- Reduce history limit in Settings
- Restart Windows

## 📚 Documentation

- [Quick Start Guide](QUICKSTART.md) - Get started in 5 minutes
- [Installation Guide](INSTALLATION_GUIDE.md) - Detailed setup
- [Background & Auto-Start](BACKGROUND_AUTOSTART_GUIDE.md) - How it works
- [Architecture](ARCHITECTURE_DIAGRAMS.md) - System design
- [Changelog](CHANGELOG.md) - All changes made

## 🤝 Contributing

Found a bug or have a feature request?
1. Open an issue on GitHub
2. Describe what you found
3. Include steps to reproduce
4. Suggest a fix (optional)

## 📄 License

MIT License - Feel free to use, modify, and distribute.

See [LICENSE](LICENSE) file for details.

## 🙋 Support

**Need help?**
- Check the [troubleshooting section](#-troubleshooting)
- Read [QUICKSTART.md](QUICKSTART.md)
- Open an [issue on GitHub](https://github.com/valedlabs/clipboard-plus/issues)

## 🎉 Made With

- **Electron** - Cross-platform desktop apps
- **electron-store** - Persistent storage
- **UUID** - Unique item IDs
- **electron-builder** - Windows installers

## 📈 Roadmap

Future features planned:
- [ ] Cloud backup option
- [ ] Advanced encryption (AES-256)
- [ ] Team sharing
- [ ] Browser extension
- [ ] Mac/Linux support
- [ ] Custom categories
- [ ] Plugin system
- [ ] Scheduled exports

## 💝 Show Your Support

If you find Clipboard+ useful:
- ⭐ Star this repository
- 🐛 Report bugs
- 💡 Suggest features
- 📢 Share with others

---

**Made with ❤️ by the valed labs**

**Last Updated**: December 26, 2025
