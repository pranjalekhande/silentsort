import { contextBridge, ipcRenderer } from 'electron';
import type { AIResult } from './types/electron';

console.log('🔍 PRELOAD: Script starting...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File processing
  processFileContent: (filePath: string) =>
    ipcRenderer.invoke('process-file-content', filePath),
  renameFile: (oldPath: string, newPath: string) =>
    ipcRenderer.invoke('rename-file', oldPath, newPath),
  moveFileToFolder: (filePath: string, targetPath: string, createFolder: boolean) =>
    ipcRenderer.invoke('move-file-to-folder', filePath, targetPath, createFolder),

  // AI testing
  testAIService: () => ipcRenderer.invoke('test-ai-service'),

  // Cache statistics
  getCacheStats: () => ipcRenderer.invoke('get-cache-stats'),

  // File state management
  updateUserAction: (filePath: string, action: 'accepted' | 'rejected' | 'modified', newPath?: string) =>
    ipcRenderer.invoke('update-user-action', filePath, action, newPath),
  getFileHistory: (filePath: string) =>
    ipcRenderer.invoke('get-file-history', filePath),
  resetCooldown: (filePath: string) =>
    ipcRenderer.invoke('reset-cooldown', filePath),

  // Folder selection
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getCurrentFolder: () => ipcRenderer.invoke('get-current-folder'),
  isFirstRun: () => ipcRenderer.invoke('is-first-run'),

  // Environment variables
  getEnvVars: () => ipcRenderer.invoke('get-env-vars'),

  // Task 2B: Duplicate Detection & Smart Tagging
  getFileAnalysis: (filePath: string) =>
    ipcRenderer.invoke('get-file-analysis', filePath),

  // Event listeners
  onNewFileDetected: (callback: (data: any) => void) => {
    console.log('🔍 PRELOAD: Setting up new-file-detected listener');
    ipcRenderer.on('new-file-detected', (event, data) => {
      console.log('🔍 PRELOAD: Received new-file-detected event:', data);
      callback(data);
    });
  },

  onFocusSearch: (callback: () => void) => {
    ipcRenderer.on('focus-search', () => callback());
  },

  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },

  // System integration and file preview
  openPath: (path: string) => ipcRenderer.send('open-path', path),
  showItemInFolder: (path: string) => ipcRenderer.send('show-item-in-folder', path),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
});

console.log('🔍 PRELOAD: electronAPI exposed successfully');

// Verify the API is available on window load
window.addEventListener('DOMContentLoaded', () => {
  console.log(
    '🔍 PRELOAD: DOM loaded, electronAPI available:',
    typeof (window as any).electronAPI
  );
});

// Types are defined in ./types/electron.d.ts
