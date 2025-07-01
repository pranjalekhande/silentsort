import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  globalShortcut,
} from 'electron';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { aiService } from './services/ai-service';

// Load environment variables
require('dotenv').config();

class SilentSortApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private fileWatcher: chokidar.FSWatcher | null = null;
  private processingCache: Map<string, number> = new Map(); // filepath -> timestamp
  private readonly CACHE_DURATION = 5000; // 5 seconds

  constructor() {
    this.setupApp();
  }

  private async setupApp(): Promise<void> {
    await app.whenReady();

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
    // Watch only our test folder for now
    const watchPaths = [
      path.join(require('os').homedir(), 'Downloads', 'silentsort-test'),
    ];

    console.log('Setting up file watcher for TEST folder:', watchPaths);

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
        return;
      }

      // Check if file was recently processed to prevent duplicates
      const now = Date.now();
      const lastProcessed = this.processingCache.get(filePath);
      if (lastProcessed && (now - lastProcessed) < this.CACHE_DURATION) {
        console.log('⏭️ Skipping recently processed file:', path.basename(filePath));
        return;
      }

      // Mark file as being processed
      this.processingCache.set(filePath, now);

      console.log('🤖 Auto-processing file with AI:', filePath);

      // Process file with AI immediately
      const aiResult = await aiService.analyzeFile(filePath);
      console.log('✅ AI auto-analysis completed:', aiResult);

      // Send file with AI analysis to renderer
      if (this.mainWindow) {
        this.mainWindow.webContents.send('new-file-detected', {
          filePath,
          aiResult,
        });
      }
    } catch (error) {
      console.error('❌ Error processing file:', error);

      // Send file with error to renderer
      if (this.mainWindow) {
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
    }
  }

  private setupGlobalShortcuts(): void {
    // Cmd+Shift+F for global search
    globalShortcut.register('CommandOrControl+Shift+F', () => {
      this.showMainWindow();
      // Focus search input
      if (this.mainWindow) {
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
      for (const [filePath, timestamp] of this.processingCache.entries()) {
        if (now - timestamp > this.CACHE_DURATION * 2) {
          this.processingCache.delete(filePath);
        }
      }
    }, 60000); // Clean up every minute
  }
}

// Initialize the app
new SilentSortApp();
