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

  // AI testing
  testAIService: () => ipcRenderer.invoke('test-ai-service'),

  // Cache statistics
  getCacheStats: () => ipcRenderer.invoke('get-cache-stats'),

  // Folder selection
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getCurrentFolder: () => ipcRenderer.invoke('get-current-folder'),
  isFirstRun: () => ipcRenderer.invoke('is-first-run'),

  // Event listeners
  onNewFileDetected: (
    callback: (data: { filePath: string; aiResult: AIResult }) => void
  ) => {
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
