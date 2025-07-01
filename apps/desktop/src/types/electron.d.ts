// Electron API type declarations for SilentSort

export interface AIResult {
  suggestedName: string;
  confidence: number;
  category: string;
  subcategory?: string;
  reasoning: string;
  technical_tags?: string[];
  extracted_entities?: {
    budget?: string;
    team_size?: string;
    deadline?: string;
    technology: string[];
    company?: string;
    invoice_number?: string;
    amount?: string;
  };
  processing_time_ms?: number;
  error?: string;
}

export interface TestResult {
  success: boolean;
  message: string;
}

export interface RenameResult {
  success: boolean;
  error?: string;
}

export interface CacheStats {
  totalFiles: number;
  processingFiles: number;
  completedFiles: number;
  failedFiles: number;
}

export interface ElectronAPI {
  // File operations
  processFileContent: (filePath: string) => Promise<AIResult>;
  renameFile: (oldPath: string, newPath: string) => Promise<RenameResult>;
  
  // AI service
  testAIService: () => Promise<TestResult>;
  
  // Cache statistics
  getCacheStats: () => Promise<CacheStats>;
  
  // Event listeners
  onNewFileDetected: (callback: (data: { filePath: string; aiResult: AIResult }) => void) => void;
  onFocusSearch: (callback: () => void) => void;
  
  // Cleanup
  removeAllListeners: (eventName: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {}; 