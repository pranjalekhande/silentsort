import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  globalShortcut,
  dialog,
} from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import { aiService } from './services/ai-service';

// Load environment variables
require('dotenv').config();

// Simple settings management
interface Settings {
  watchFolder: string;
  isFirstRun: boolean;
}

class SimpleStore {
  private settingsPath: string;
  private settings: Settings = {
    watchFolder: path.join(require('os').homedir(), 'Downloads'),
    isFirstRun: true,
  };

  constructor() {
    const userDataPath = app.getPath('userData');
    this.settingsPath = path.join(userDataPath, 'settings.json');
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        this.settings = JSON.parse(data);
      } else {
        // Default settings
        this.settings = {
          watchFolder: path.join(require('os').homedir(), 'Downloads'),
          isFirstRun: true,
        };
        this.saveSettings();
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = {
        watchFolder: path.join(require('os').homedir(), 'Downloads'),
        isFirstRun: true,
      };
    }
  }

  private saveSettings(): void {
    try {
      const userDataPath = app.getPath('userData');
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  get<K extends keyof Settings>(key: K): Settings[K] {
    return this.settings[key];
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.settings[key] = value;
    this.saveSettings();
  }
}

let store: SimpleStore;

class SilentSortApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private fileWatcher: chokidar.FSWatcher | null = null;
  private processingCache: Map<string, { timestamp: number; status: 'processing' | 'completed' | 'failed' }> = new Map();
  private readonly CACHE_DURATION = 10000; // Increased to 10 seconds
  private readonly PROCESSING_TIMEOUT = 30000; // 30 seconds timeout for stuck processing

  constructor() {
    this.setupApp();
  }

  private async setupApp(): Promise<void> {
    await app.whenReady();

    // Initialize simple settings store
    store = new SimpleStore();
    console.log('✅ Settings store initialized');

    // Test AI service on startup
    console.log('🧪 Testing AI service connection...');
    const testResult = await aiService.testConnection();
    console.log('🔍 AI Service Test:', testResult);

    this.createMainWindow();
    this.setupTray();
    this.setupFileWatcher();
    this.setupGlobalShortcuts();
    this.setupEventHandlers();
    this.setupCacheCleanup();
  }

  private createMainWindow(): void {
    // Use absolute path for more reliable preload loading
    const preloadPath = path.resolve(__dirname, 'preload.js');
    console.log('🔍 Preload path (absolute):', preloadPath);
    console.log('🔍 __dirname:', __dirname);
    console.log('🔍 Preload exists:', require('fs').existsSync(preloadPath));

    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        webSecurity: false, // Adding this for development
      },
      show: true, // Show window in development
      titleBarStyle: 'hiddenInset',
    });

    // Load the React app - always use localhost:3000 in development
    this.mainWindow.loadURL('http://localhost:3000');
    this.mainWindow.webContents.openDevTools();

    // Debug when page loads
    this.mainWindow.webContents.once('did-finish-load', () => {
      console.log('🎯 Page loaded, checking preload...');

      // Check if electronAPI is available
      this.mainWindow?.webContents.executeJavaScript(`
        console.log("🔍 RENDERER: electronAPI type:", typeof window.electronAPI);
        console.log("🔍 RENDERER: electronAPI methods:", window.electronAPI ? Object.keys(window.electronAPI) : 'none');
        window.electronAPI ? console.log("✅ RENDERER: electronAPI is available!") : console.log("❌ RENDERER: electronAPI is missing!");
      `);
    });

    // Additional debugging for preload script
    this.mainWindow.webContents.once(
      'preload-error',
      (event, preloadPath, error) => {
        console.error('❌ Preload script error:', { preloadPath, error });
      }
    );

    this.mainWindow.webContents.once(
      'did-fail-load',
      (event, errorCode, errorDescription) => {
        console.error('❌ Page failed to load:', {
          errorCode,
          errorDescription,
        });
      }
    );
  }

  private setupTray(): void {
    // Skip tray for now to avoid icon loading issues - will add back later
    console.log('Tray setup skipped in development mode');
  }

  private setupFileWatcher(): void {
    // Ensure store is initialized
    if (!store) {
      console.error('❌ Store not initialized, cannot setup file watcher');
      return;
    }

    // Get user-selected folder or default to Downloads
    const watchFolder = store.get('watchFolder') as string;
    const watchPaths = [watchFolder];

    console.log('Setting up file watcher for user folder:', watchPaths);

    // Close existing watcher if any
    if (this.fileWatcher) {
      this.fileWatcher.close();
    }

    this.fileWatcher = chokidar.watch(watchPaths, {
      ignoreInitial: false,
      persistent: true,
    });

    this.fileWatcher.on('ready', () => {
      console.log('✅ File watcher ready and watching:', watchPaths);
    });

    this.fileWatcher.on('add', (filePath: string) => {
      console.log('📁 New file detected:', filePath);
      this.processFile(filePath);
    });

    this.fileWatcher.on('error', (error: unknown) => {
      console.error('❌ File watcher error:', error);
    });
  }

  private async processFile(filePath: string): Promise<void> {
    try {
      // Skip hidden files and directories
      if (path.basename(filePath).startsWith('.')) {
        console.log('⏭️ Skipping hidden file:', path.basename(filePath));
        return;
      }

      // Skip system/temp files
      const fileName = path.basename(filePath);
      if (fileName.includes('.tmp') || fileName.includes('~') || fileName.startsWith('._')) {
        console.log('⏭️ Skipping system/temp file:', fileName);
        return;
      }

      // Check if file was recently processed to prevent duplicates
      const now = Date.now();
      const cacheEntry = this.processingCache.get(filePath);
      
      if (cacheEntry) {
        const timeSinceProcessed = now - cacheEntry.timestamp;
        
        // If currently processing, skip
        if (cacheEntry.status === 'processing' && timeSinceProcessed < this.PROCESSING_TIMEOUT) {
          console.log('⏳ File is currently being processed:', fileName);
          return;
        }
        
        // If recently completed, skip
        if (cacheEntry.status === 'completed' && timeSinceProcessed < this.CACHE_DURATION) {
          console.log('⏭️ Skipping recently processed file:', fileName, `(${Math.round(timeSinceProcessed/1000)}s ago)`);
          return;
        }
        
        // If failed recently but not too long ago, skip to avoid spam
        if (cacheEntry.status === 'failed' && timeSinceProcessed < (this.CACHE_DURATION / 2)) {
          console.log('⏭️ Skipping recently failed file:', fileName);
          return;
        }
      }

      // Check if file actually exists and is readable
      const fs = require('fs').promises;
      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
          console.log('⏭️ Skipping non-file:', fileName);
          return;
        }
        
        // Skip very large files (>50MB) to prevent memory issues
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (stats.size > maxSize) {
          console.log('⏭️ Skipping large file:', fileName, `(${Math.round(stats.size / 1024 / 1024)}MB)`);
          return;
        }
      } catch (statError) {
        console.log('⏭️ File no longer exists or not accessible:', fileName);
        return;
      }

      // Mark file as being processed
      this.processingCache.set(filePath, { timestamp: now, status: 'processing' });
      console.log('🤖 Processing file with AI:', fileName);

      // Process file with AI
      const aiResult = await aiService.analyzeFile(filePath);
      console.log('✅ AI analysis completed for:', fileName, '- Confidence:', aiResult.confidence);

      // Send file with AI analysis to renderer
      if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.webContents && !this.mainWindow.webContents.isDestroyed()) {
        this.mainWindow.webContents.send('new-file-detected', {
          filePath,
          aiResult,
        });
      }

      // Mark file as completed
      this.processingCache.set(filePath, { timestamp: now, status: 'completed' });
      console.log('📋 File processing cache updated:', fileName, 'status: completed');
      
    } catch (error) {
      console.error('❌ Error processing file:', path.basename(filePath), error instanceof Error ? error.message : error);

      // Send file with error to renderer
      if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.webContents && !this.mainWindow.webContents.isDestroyed()) {
        this.mainWindow.webContents.send('new-file-detected', {
          filePath,
          aiResult: {
            suggestedName: path.basename(filePath),
            confidence: 0,
            category: 'error',
            reasoning: 'AI analysis failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }

      // Mark file as failed
      this.processingCache.set(filePath, { timestamp: Date.now(), status: 'failed' });
      console.log('📋 File processing cache updated:', path.basename(filePath), 'status: failed');
    }
  }

  private setupGlobalShortcuts(): void {
    // Cmd+Shift+F for global search
    globalShortcut.register('CommandOrControl+Shift+F', () => {
      this.showMainWindow();
      // Focus search input
      if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.webContents && !this.mainWindow.webContents.isDestroyed()) {
        this.mainWindow.webContents.send('focus-search');
      }
    });
  }

  private setupEventHandlers(): void {
    // Handle IPC messages from renderer
    ipcMain.handle('process-file-content', async (event, filePath: string) => {
      console.log('🔍 Processing file with AI:', filePath);
      try {
        const result = await aiService.analyzeFile(filePath);
        console.log('✅ AI analysis result:', result);
        return result;
      } catch (error) {
        console.error('❌ AI analysis failed:', error);
        return {
          suggestedName: path.basename(filePath),
          confidence: 0,
          category: 'error',
          reasoning: 'AI analysis failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    // Test AI service endpoint
    ipcMain.handle('test-ai-service', async () => {
      console.log('🧪 Testing AI service from renderer...');
      const result = await aiService.testConnection();
      console.log('🔍 AI Service Test Result:', result);
      return result;
    });

    // Get processing cache statistics
    ipcMain.handle('get-cache-stats', async () => {
      const stats = this.getCacheStatistics();
      console.log('📊 Cache Statistics:', stats);
      return stats;
    });

    // Folder selection handlers
    ipcMain.handle('select-folder', async () => {
      const result = await dialog.showOpenDialog(this.mainWindow!, {
        properties: ['openDirectory'],
        title: 'Select folder to monitor',
        buttonLabel: 'Select Folder',
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const selectedFolder = result.filePaths[0];
        store.set('watchFolder', selectedFolder);
        store.set('isFirstRun', false);
        
        // Restart file watcher with new folder
        this.setupFileWatcher();
        
        console.log('✅ User selected folder:', selectedFolder);
        return { success: true, folderPath: selectedFolder };
      }
      
      return { success: false, folderPath: null };
    });

    ipcMain.handle('get-current-folder', async () => {
      return store.get('watchFolder');
    });

    ipcMain.handle('is-first-run', async () => {
      return store.get('isFirstRun');
    });

    ipcMain.handle(
      'rename-file',
      async (event, oldPath: string, newPath: string) => {
        console.log('📝 File rename requested:', { oldPath, newPath });

        try {
          const fs = require('fs').promises;

          // Check if source file exists
          await fs.access(oldPath);

          // Check if destination already exists
          try {
            await fs.access(newPath);
            return {
              success: false,
              message: 'Destination file already exists',
            };
          } catch {
            // File doesn't exist, which is good
          }

          // Perform the rename
          await fs.rename(oldPath, newPath);
          console.log('✅ File renamed successfully:', { oldPath, newPath });

          return { success: true, message: 'File renamed successfully' };
        } catch (error) {
          console.error('❌ File rename failed:', error);
          return {
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }
    );

    // App event handlers
    app.on('window-all-closed', () => {
      // Keep app running in tray on macOS
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    app.on('before-quit', () => {
      if (this.fileWatcher) {
        this.fileWatcher.close();
      }
      globalShortcut.unregisterAll();
    });
  }

  private showMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  private setupCacheCleanup(): void {
    // Clean up old entries from processing cache every minute
    setInterval(() => {
      const now = Date.now();
      for (const [filePath, { timestamp, status }] of this.processingCache.entries()) {
        if (status === 'failed' || (now - timestamp > this.PROCESSING_TIMEOUT)) {
          this.processingCache.delete(filePath);
        }
      }
    }, 60000); // Clean up every minute
  }

  private getCacheStatistics(): { totalFiles: number; processingFiles: number; completedFiles: number; failedFiles: number } {
    let totalFiles = 0;
    let processingFiles = 0;
    let completedFiles = 0;
    let failedFiles = 0;

    for (const [filePath, { status }] of this.processingCache.entries()) {
      totalFiles++;
      if (status === 'processing') {
        processingFiles++;
      } else if (status === 'completed') {
        completedFiles++;
      } else if (status === 'failed') {
        failedFiles++;
      }
    }

    return {
      totalFiles,
      processingFiles,
      completedFiles,
      failedFiles,
    };
  }
}

// Initialize the app
new SilentSortApp();
