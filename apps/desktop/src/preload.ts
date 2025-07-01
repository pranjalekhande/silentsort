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

  // Event listeners
  onNewFileDetected: (
    callback: (data: { filePath: string; aiResult: AIResult }) => void
  ) => {
    ipcRenderer.on('new-file-detected', (event, data) => callback(data));
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
