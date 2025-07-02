// Electron API type declarations for SilentSort

import { FileAnalysisResult } from '../services/ai-service';

export interface ExtractedEntities {
  budget?: string;
  team_size?: string;
  deadline?: string;
  technology: string[];
  company?: string;
  invoice_number?: string;
  amount?: string;
}

export interface AIResult {
  suggestedName: string;
  confidence: number;
  category: string;
  subcategory?: string;
  reasoning: string;
  alternatives?: string[];
  contentSummary?: string;
  technical_tags?: string[];
  extracted_entities?: ExtractedEntities;
  processing_time_ms?: number;
  error?: string;
  duplicateInfo?: {
    isDuplicate: boolean;
    duplicateFiles: string[];
    similarFiles: string[];
    action: 'merge' | 'rename' | 'keep_both' | 'replace_with_better';
    betterVersion?: {
      filePath: string;
      reason: string;
    };
  };
  smartTags?: string[];
  folderSuggestion?: {
    path: string;
    confidence: number;
    reasoning: string;
  };
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

export interface FolderSelectionResult {
  success: boolean;
  folderPath: string | null;
}

export interface ProcessedFileRegistry {
  fileHash: string;
  originalPath: string;
  currentPath: string;
  processedAt: Date;
  userAction: 'accepted' | 'rejected' | 'modified' | 'pending';
  finalName: string;
  ignoredUntil?: Date;
  processingCount: number;
  lastEventType?: 'added' | 'renamed' | 'moved' | 'changed';
  contentTags?: string[];
  extractedKeywords?: string[];
  suggestedFolder?: string;
  fileCategory?: string;
  contentSummary?: string;
}

export interface DuplicateAnalysis {
  isDuplicate: boolean;
  similarFiles: string[];
  duplicateFiles: string[];
  confidence: number;
  action: 'merge' | 'rename' | 'keep_both' | 'replace_with_better';
  reason: string;
  betterVersion?: {
    filePath: string;
    reason: string;
  };
}

export interface SmartTag {
  tag: string;
  confidence: number;
  source: 'content' | 'filename' | 'folder' | 'ai_analysis';
  context?: string;
}

export interface FolderSuggestion {
  suggestedPath: string;
  confidence: number;
  reasoning: string;
  basedOn: 'content_analysis' | 'similar_files' | 'ai_category' | 'user_patterns';
  alternatives?: string[];
}

export interface FileAnalysisWithDuplicates {
  duplicateAnalysis: DuplicateAnalysis;
  smartTags: SmartTag[];
  folderSuggestion: FolderSuggestion;
  registryEntry?: ProcessedFileRegistry;
}

export interface ElectronAPI {
  // File operations
  processFileContent: (filePath: string) => Promise<AIResult>;
  renameFile: (oldPath: string, newPath: string) => Promise<RenameResult>;
  
  // AI service
  testAIService: () => Promise<TestResult>;
  
  // Cache statistics
  getCacheStats: () => Promise<CacheStats>;
  
  // File state management
  updateUserAction: (filePath: string, action: 'accepted' | 'rejected' | 'modified', newPath?: string) => Promise<{ success: boolean; error?: string }>;
  getFileHistory: (filePath: string) => Promise<ProcessedFileRegistry | null>;
  resetCooldown: (filePath: string) => Promise<boolean>;
  
  // Folder selection
  selectFolder: () => Promise<FolderSelectionResult>;
  getCurrentFolder: () => Promise<string>;
  isFirstRun: () => Promise<boolean>;
  
  // Event listeners
  onNewFileDetected: (callback: (data: { filePath: string; aiResult: AIResult; fileHash?: string }) => void) => void;
  onFocusSearch: (callback: () => void) => void;
  
  // Cleanup
  removeAllListeners: (eventName: string) => void;
  
  // New Task 2B methods
  getFileAnalysis: (filePath: string) => Promise<FileAnalysisWithDuplicates>;
  openPath: (path: string) => void;
  showItemInFolder: (path: string) => void;
  
  // File preview functionality
  openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {}; 