import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  globalShortcut,
  dialog,
  shell,
} from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import { aiService } from './services/ai-service';
import { FileStateManager } from './services/file-state-manager';

// Load environment variables from the correct location
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Also try loading from the desktop directory as fallback
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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
  private fileStateManager: FileStateManager;
  private processingFiles: Set<string> = new Set(); // Track currently processing files

  constructor() {
    this.fileStateManager = new FileStateManager({
      cooldownMinutes: 5,
      maxProcessingAttempts: 3,
      contentHashSampleSize: 8192
    });
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
      this.processFile(filePath, 'added');
    });

    this.fileWatcher.on('change', (filePath: string) => {
      console.log('📝 File changed:', filePath);
      this.processFile(filePath, 'changed');
    });

    this.fileWatcher.on('error', (error: unknown) => {
      console.error('❌ File watcher error:', error);
    });
  }

  private async processFile(filePath: string, eventType: 'added' | 'renamed' | 'moved' | 'changed' = 'added'): Promise<void> {
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

      // Use FileStateManager to check if file should be processed
      const shouldProcessResult = await this.fileStateManager.shouldProcessFile(filePath, eventType);
      
      if (!shouldProcessResult.shouldProcess) {
        console.log(`⏭️ ${shouldProcessResult.reason}:`, fileName);
        return;
      }

      console.log(`🎯 Processing file (${eventType}):`, fileName, `- ${shouldProcessResult.reason}`);

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

      // Check if already processing this file
      if (this.processingFiles.has(filePath)) {
        console.log('⏳ File is already being processed:', fileName);
        return;
      }

      // Register file for processing and mark as processing
      const fileHash = await this.fileStateManager.registerFileForProcessing(filePath);
      this.processingFiles.add(filePath);
      console.log('🤖 Processing file with AI:', fileName);

      try {
        // Process file with AI
        const aiResult = await aiService.analyzeFile(filePath);
        console.log('✅ AI analysis completed for:', fileName, '- Confidence:', aiResult.confidence);

        // Update file registry with AI analysis results
        await this.fileStateManager.updateFileWithAnalysis(filePath, {
          category: aiResult.category,
          keywords: aiResult.technical_tags || [],
          contentSummary: aiResult.contentSummary,
          extractedEntities: aiResult.extracted_entities
        });

        // Get comprehensive file analysis including duplicates
        const comprehensiveAnalysis = await this.fileStateManager.getFileAnalysis(filePath);
        
        // Send enhanced file data to renderer
        if (this.mainWindow && !this.mainWindow.isDestroyed() && this.mainWindow.webContents && !this.mainWindow.webContents.isDestroyed()) {
          this.mainWindow.webContents.send('new-file-detected', {
            filePath,
            aiResult: {
              ...aiResult,
              // Add duplicate detection info to AI result
              duplicateInfo: comprehensiveAnalysis.duplicateAnalysis.isDuplicate ? {
                isDuplicate: true,
                duplicateFiles: comprehensiveAnalysis.duplicateAnalysis.duplicateFiles,
                similarFiles: comprehensiveAnalysis.duplicateAnalysis.similarFiles,
                action: comprehensiveAnalysis.duplicateAnalysis.action,
                betterVersion: comprehensiveAnalysis.duplicateAnalysis.betterVersion
              } : undefined,
              // Add smart tags to AI result
              smartTags: comprehensiveAnalysis.smartTags.map(tag => tag.tag),
              // Add folder suggestion to AI result
              folderSuggestion: comprehensiveAnalysis.folderSuggestion.confidence > 0.5 ? {
                path: comprehensiveAnalysis.folderSuggestion.suggestedPath,
                confidence: comprehensiveAnalysis.folderSuggestion.confidence,
                reasoning: comprehensiveAnalysis.folderSuggestion.reasoning
              } : undefined
            },
            fileHash, // Include hash for tracking
            comprehensiveAnalysis // Include full analysis for advanced UI features
          });
        }

        console.log('📋 Enhanced file processing completed:', fileName);
        
      } finally {
        // Always remove from processing set
        this.processingFiles.delete(filePath);
      }
      
    } catch (error) {
      console.error('❌ Error processing file:', path.basename(filePath), error instanceof Error ? error.message : error);
      
      // Remove from processing set on error
      this.processingFiles.delete(filePath);

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

    // File state management handlers
    ipcMain.handle('update-user-action', async (event, filePath: string, action: 'accepted' | 'rejected' | 'modified', newPath?: string) => {
      console.log('📝 User action update:', { filePath, action, newPath });
      try {
        await this.fileStateManager.updateUserAction(filePath, action, newPath);
        return { success: true };
      } catch (error) {
        console.error('❌ Failed to update user action:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('get-file-history', async (event, filePath: string) => {
      const history = this.fileStateManager.getFileHistory(filePath);
      return history;
    });

    ipcMain.handle('reset-cooldown', async (event, filePath: string) => {
      return await this.fileStateManager.resetCooldown(filePath);
    });

    // New Task 2B: Duplicate Detection & Smart Tagging IPC handlers
    ipcMain.handle('get-file-analysis', async (event, filePath: string) => {
      try {
        const analysis = await this.fileStateManager.getFileAnalysis(filePath);
        return analysis;
      } catch (error) {
        console.error('❌ Failed to get file analysis:', error);
        return {
          duplicateAnalysis: {
            isDuplicate: false,
            similarFiles: [],
            duplicateFiles: [],
            confidence: 0.0,
            action: 'keep_both',
            reason: 'Analysis failed'
          },
          smartTags: [],
          folderSuggestion: {
            suggestedPath: path.dirname(filePath),
            confidence: 0.0,
            reasoning: 'Analysis failed',
            basedOn: 'content_analysis',
            alternatives: []
          }
        };
      }
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

    // Environment variables handler for renderer process
    ipcMain.handle('get-env-vars', async () => {
      return {
        N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL,
        N8N_WEBHOOK_KEY: process.env.N8N_WEBHOOK_KEY,
      };
    });

    ipcMain.handle('is-first-run', async () => {
      return store.get('isFirstRun');
    });

    // File preview functionality
    ipcMain.handle('open-file', async (event, filePath: string) => {
      console.log('🔍 Opening file for preview:', path.basename(filePath));
      try {
        // Check if file exists before trying to open it
        if (!fs.existsSync(filePath)) {
          console.error('❌ File not found for preview:', filePath);
          throw new Error('File not found');
        }

        // Use shell.openPath to open file with system default application
        const result = await shell.openPath(filePath);
        
        if (result) {
          // If result is non-empty, it means there was an error
          console.error('❌ Failed to open file:', result);
          throw new Error(result);
        }
        
        console.log('✅ File opened successfully for preview:', path.basename(filePath));
        return { success: true };
      } catch (error) {
        console.error('❌ Error opening file for preview:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
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

          // Update FileStateManager to mark as accepted
          await this.fileStateManager.updateUserAction(oldPath, 'accepted', newPath);

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
    // FileStateManager handles its own cleanup automatically
    console.log('✅ FileStateManager will handle automatic cleanup');
  }

  private getCacheStatistics(): { totalFiles: number; processingFiles: number; completedFiles: number; failedFiles: number } {
    const stats = this.fileStateManager.getRegistryStats();
    
    return {
      totalFiles: stats.totalFiles,
      processingFiles: this.processingFiles.size,
      completedFiles: stats.acceptedFiles + stats.rejectedFiles + stats.modifiedFiles,
      failedFiles: 0, // FileStateManager doesn't track failures the same way
    };
  }
}

// Initialize the app
new SilentSortApp();
