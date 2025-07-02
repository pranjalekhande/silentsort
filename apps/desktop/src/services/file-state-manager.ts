import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface ProcessedFileRegistry {
  fileHash: string;           // Content hash for true identity
  originalPath: string;       // Where we first found it
  currentPath: string;        // Current location (may change due to renames)
  processedAt: Date;         // When we processed it
  userAction: 'accepted' | 'rejected' | 'modified' | 'pending';  // What user did
  finalName: string;         // What it became
  ignoredUntil?: Date;       // Cooldown period
  processingCount: number;   // How many times we've tried to process
  lastEventType?: 'added' | 'renamed' | 'moved' | 'changed';
  // New fields for Task 2B
  contentTags?: string[];    // AI-generated tags
  extractedKeywords?: string[]; // Keywords from content analysis
  suggestedFolder?: string;  // AI-suggested folder path
  fileCategory?: string;     // AI-determined category
  contentSummary?: string;   // Brief summary of file content
}

export interface FileStateOptions {
  cooldownMinutes: number;
  maxProcessingAttempts: number;
  contentHashSampleSize: number;
}

// New interfaces for Task 2B
export interface DuplicateAnalysis {
  isDuplicate: boolean;
  similarFiles: string[];
  duplicateFiles: string[];  // Exact content matches
  confidence: number;
  action: 'merge' | 'rename' | 'keep_both' | 'replace_with_better';
  reason: string;
  betterVersion?: {
    filePath: string;
    reason: string; // why this version is better
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

export class FileStateManager {
  private registry: Map<string, ProcessedFileRegistry> = new Map();
  private pathToHashMap: Map<string, string> = new Map(); // Quick path lookup
  private readonly options: FileStateOptions;
  private readonly REGISTRY_CLEANUP_INTERVAL = 60000; // 1 minute

  constructor(options: Partial<FileStateOptions> = {}) {
    this.options = {
      cooldownMinutes: 5,
      maxProcessingAttempts: 3,
      contentHashSampleSize: 8192, // 8KB sample for performance
      ...options
    };

    // Start cleanup interval
    setInterval(() => this.cleanupRegistry(), this.REGISTRY_CLEANUP_INTERVAL);
  }

  /**
   * Calculate content hash for file identity
   */
  private async calculateContentHash(filePath: string): Promise<string> {
    try {
      const stats = await fs.promises.stat(filePath);
      
      // For small files, hash entire content
      if (stats.size <= this.options.contentHashSampleSize) {
        const content = await fs.promises.readFile(filePath);
        return crypto.createHash('sha256').update(content).digest('hex');
      }
      
      // For large files, hash first N bytes + file size + modification time
      const buffer = Buffer.alloc(this.options.contentHashSampleSize);
      const fd = await fs.promises.open(filePath, 'r');
      const { bytesRead } = await fd.read(buffer, 0, this.options.contentHashSampleSize, 0);
      await fd.close();
      
      const hashData = Buffer.concat([
        buffer.slice(0, bytesRead),
        Buffer.from(stats.size.toString()),
        Buffer.from(stats.mtime.getTime().toString())
      ]);
      
      return crypto.createHash('sha256').update(hashData).digest('hex');
    } catch (error) {
      console.error('Error calculating content hash:', error);
      // Fallback to path + timestamp hash
      return crypto.createHash('sha256')
        .update(filePath + Date.now().toString())
        .digest('hex');
    }
  }

  /**
   * Check if file should be processed based on state tracking
   */
  async shouldProcessFile(filePath: string, eventType: 'added' | 'renamed' | 'moved' | 'changed' = 'added'): Promise<{
    shouldProcess: boolean;
    reason: string;
    existingEntry?: ProcessedFileRegistry;
  }> {
    try {
      const contentHash = await this.calculateContentHash(filePath);
      const existingEntry = this.registry.get(contentHash);
      
      if (!existingEntry) {
        return {
          shouldProcess: true,
          reason: 'New file - not in registry'
        };
      }

      // Update path tracking
      this.pathToHashMap.set(filePath, contentHash);
      existingEntry.currentPath = filePath;
      existingEntry.lastEventType = eventType;

      const now = new Date();
      
      // Check cooldown period
      if (existingEntry.ignoredUntil && now < existingEntry.ignoredUntil) {
        const remainingMinutes = Math.ceil((existingEntry.ignoredUntil.getTime() - now.getTime()) / 60000);
        return {
          shouldProcess: false,
          reason: `In cooldown period (${remainingMinutes}m remaining)`,
          existingEntry
        };
      }

      // Check if user recently interacted with this file
      if (existingEntry.userAction !== 'pending') {
        const timeSinceUserAction = now.getTime() - existingEntry.processedAt.getTime();
        const cooldownMs = this.options.cooldownMinutes * 60 * 1000;
        
        if (timeSinceUserAction < cooldownMs) {
          return {
            shouldProcess: false,
            reason: `User recently ${existingEntry.userAction} this file`,
            existingEntry
          };
        }
      }

      // Handle different event types
      if (eventType === 'renamed' && existingEntry.userAction === 'accepted') {
        return {
          shouldProcess: false,
          reason: 'File rename likely result of user accepting our suggestion',
          existingEntry
        };
      }

      // Check processing attempt limits
      if (existingEntry.processingCount >= this.options.maxProcessingAttempts) {
        return {
          shouldProcess: false,
          reason: `Max processing attempts reached (${existingEntry.processingCount})`,
          existingEntry
        };
      }

      // Check if significant time has passed (allow reprocessing after a long time)
      const daysSinceProcessed = (now.getTime() - existingEntry.processedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceProcessed > 7) { // Reprocess after a week
        return {
          shouldProcess: true,
          reason: 'File not processed in over a week - allowing reprocessing'
        };
      }

      return {
        shouldProcess: false,
        reason: 'File recently processed and in registry',
        existingEntry
      };

    } catch (error) {
      console.error('Error checking file processing state:', error);
      return {
        shouldProcess: true,
        reason: 'Error checking state - allowing processing'
      };
    }
  }

  /**
   * Register file for processing
   */
  async registerFileForProcessing(filePath: string): Promise<string> {
    const contentHash = await this.calculateContentHash(filePath);
    const now = new Date();
    
    const entry: ProcessedFileRegistry = {
      fileHash: contentHash,
      originalPath: filePath,
      currentPath: filePath,
      processedAt: now,
      userAction: 'pending',
      finalName: path.basename(filePath),
      processingCount: 1,
      lastEventType: 'added'
    };

    // If entry exists, increment processing count
    const existing = this.registry.get(contentHash);
    if (existing) {
      entry.processingCount = existing.processingCount + 1;
      entry.originalPath = existing.originalPath; // Keep original path
    }

    this.registry.set(contentHash, entry);
    this.pathToHashMap.set(filePath, contentHash);
    
    console.log(`📋 Registered file for processing: ${path.basename(filePath)} (hash: ${contentHash.slice(0, 8)})`);
    return contentHash;
  }

  /**
   * Update user action for a processed file
   */
  async updateUserAction(filePath: string, action: 'accepted' | 'rejected' | 'modified', newPath?: string): Promise<void> {
    const contentHash = this.pathToHashMap.get(filePath) || await this.calculateContentHash(filePath);
    const entry = this.registry.get(contentHash);
    
    if (!entry) {
      console.warn(`No registry entry found for file: ${path.basename(filePath)}`);
      return;
    }

    entry.userAction = action;
    entry.processedAt = new Date();
    
    if (newPath && newPath !== filePath) {
      entry.currentPath = newPath;
      entry.finalName = path.basename(newPath);
      // Update path mapping
      this.pathToHashMap.delete(filePath);
      this.pathToHashMap.set(newPath, contentHash);
    }

    // Set cooldown period based on action
    const cooldownMs = this.options.cooldownMinutes * 60 * 1000;
    entry.ignoredUntil = new Date(Date.now() + cooldownMs);

    console.log(`📝 Updated user action: ${path.basename(filePath)} -> ${action} (cooldown: ${this.options.cooldownMinutes}m)`);
  }

  /**
   * Get registry statistics
   */
  getRegistryStats(): {
    totalFiles: number;
    pendingFiles: number;
    acceptedFiles: number;
    rejectedFiles: number;
    modifiedFiles: number;
    inCooldown: number;
  } {
    const now = new Date();
    let pending = 0, accepted = 0, rejected = 0, modified = 0, inCooldown = 0;

    for (const entry of this.registry.values()) {
      switch (entry.userAction) {
        case 'pending': pending++; break;
        case 'accepted': accepted++; break;
        case 'rejected': rejected++; break;
        case 'modified': modified++; break;
      }

      if (entry.ignoredUntil && now < entry.ignoredUntil) {
        inCooldown++;
      }
    }

    return {
      totalFiles: this.registry.size,
      pendingFiles: pending,
      acceptedFiles: accepted,
      rejectedFiles: rejected,
      modifiedFiles: modified,
      inCooldown
    };
  }

  /**
   * Clean up old registry entries
   */
  private cleanupRegistry(): void {
    const now = new Date();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    let cleaned = 0;

    for (const [hash, entry] of this.registry.entries()) {
      const age = now.getTime() - entry.processedAt.getTime();
      
      if (age > maxAge) {
        this.registry.delete(hash);
        // Clean up path mapping
        for (const [path, pathHash] of this.pathToHashMap.entries()) {
          if (pathHash === hash) {
            this.pathToHashMap.delete(path);
            break;
          }
        }
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old registry entries`);
    }
  }

  /**
   * Get file processing history
   */
  getFileHistory(filePath: string): ProcessedFileRegistry | null {
    const contentHash = this.pathToHashMap.get(filePath);
    return contentHash ? this.registry.get(contentHash) || null : null;
  }

  /**
   * Reset cooldown for a file (for testing/debugging)
   */
  async resetCooldown(filePath: string): Promise<boolean> {
    const contentHash = this.pathToHashMap.get(filePath) || await this.calculateContentHash(filePath);
    const entry = this.registry.get(contentHash);
    
    if (entry) {
      delete entry.ignoredUntil;
      console.log(`🔄 Reset cooldown for: ${path.basename(filePath)}`);
      return true;
    }
    
    return false;
  }

  // =========================================================================
  // TASK 2B: DUPLICATE DETECTION & SMART TAGGING METHODS
  // =========================================================================

  /**
   * Analyze file for duplicates and similar content
   */
  async analyzeDuplicates(filePath: string): Promise<DuplicateAnalysis> {
    try {
      const contentHash = await this.calculateContentHash(filePath);
      const currentEntry = this.registry.get(contentHash);
      
      // Find exact duplicates (same content hash)
      const duplicateFiles: string[] = [];
      const similarFiles: string[] = [];
      
      // Check all registry entries for matches
      for (const [hash, entry] of this.registry.entries()) {
        if (hash === contentHash && entry.currentPath !== filePath) {
          duplicateFiles.push(entry.currentPath);
        }
      }
      
      // If we have exact duplicates, analyze which version is better
      if (duplicateFiles.length > 0) {
        const betterVersion = await this.findBetterVersion(filePath, duplicateFiles);
        
        return {
          isDuplicate: true,
          similarFiles: [],
          duplicateFiles,
          confidence: 1.0, // Exact hash match = 100% confidence
          action: betterVersion ? 'replace_with_better' : 'keep_both',
          reason: duplicateFiles.length === 1 
            ? `Exact duplicate found: ${path.basename(duplicateFiles[0])}`
            : `${duplicateFiles.length} exact duplicates found`,
          betterVersion
        };
      }
      
      // Find similar files (similar content but not exact)
      similarFiles.push(...await this.findSimilarFiles(filePath, contentHash));
      
      if (similarFiles.length > 0) {
        return {
          isDuplicate: false,
          similarFiles,
          duplicateFiles: [],
          confidence: 0.7, // Similar but not exact
          action: 'keep_both',
          reason: `Found ${similarFiles.length} similar files`
        };
      }
      
      // No duplicates or similar files found
      return {
        isDuplicate: false,
        similarFiles: [],
        duplicateFiles: [],
        confidence: 0.0,
        action: 'keep_both',
        reason: 'No duplicates found'
      };
      
    } catch (error) {
      console.error('Error analyzing duplicates:', error);
      return {
        isDuplicate: false,
        similarFiles: [],
        duplicateFiles: [],
        confidence: 0.0,
        action: 'keep_both',
        reason: 'Error during duplicate analysis'
      };
    }
  }

  /**
   * Find the better version among duplicate files
   */
  private async findBetterVersion(currentFile: string, duplicateFiles: string[]): Promise<{ filePath: string; reason: string } | undefined> {
    try {
      const allFiles = [currentFile, ...duplicateFiles];
      let bestFile = currentFile;
      let bestScore = 0;
      let bestReason = '';
      
      for (const file of allFiles) {
        let score = 0;
        const reasons: string[] = [];
        
        try {
          const stats = await fs.promises.stat(file);
          const fileName = path.basename(file);
          const folderPath = path.dirname(file);
          
          // Score based on filename quality
          if (!fileName.match(/^(copy|copy \d+|untitled|\d+)$/i)) {
            score += 20;
            reasons.push('descriptive filename');
          }
          
          if (!fileName.includes('copy') && !fileName.includes('Copy')) {
            score += 15;
            reasons.push('not a copy');
          }
          
          // Score based on folder organization
          if (!folderPath.includes('Downloads') && !folderPath.includes('Desktop')) {
            score += 10;
            reasons.push('organized location');
          }
          
          // Score based on modification time (newer is better)
          const age = Date.now() - stats.mtime.getTime();
          const daysSinceModified = age / (1000 * 60 * 60 * 24);
          if (daysSinceModified < 7) {
            score += 5;
            reasons.push('recently modified');
          }
          
          // Score based on file size (slightly larger is often better for documents)
          score += Math.min(5, stats.size / 1024); // Up to 5 points for size
          
          if (score > bestScore) {
            bestScore = score;
            bestFile = file;
            bestReason = reasons.join(', ');
          }
          
        } catch (statError) {
          // File doesn't exist or can't be accessed, skip it
          continue;
        }
      }
      
      // Only return better version if it's significantly better and not the current file
      if (bestFile !== currentFile && bestScore > 20) {
        return {
          filePath: bestFile,
          reason: bestReason
        };
      }
      
      return undefined;
      
    } catch (error) {
      console.error('Error finding better version:', error);
      return undefined;
    }
  }

  /**
   * Find files with similar content (but not exact duplicates)
   */
  private async findSimilarFiles(filePath: string, currentHash: string): Promise<string[]> {
    try {
      const similarFiles: string[] = [];
      const currentExtension = path.extname(filePath).toLowerCase();
      const currentFileName = path.basename(filePath, currentExtension);
      
      // Look for files with similar names but different content
      for (const [hash, entry] of this.registry.entries()) {
        if (hash !== currentHash) {
          const entryExtension = path.extname(entry.currentPath).toLowerCase();
          const entryFileName = path.basename(entry.currentPath, entryExtension);
          
          // Check if same file type
          if (entryExtension === currentExtension) {
            // Check filename similarity (simple Levenshtein-like comparison)
            const similarity = this.calculateStringSimilarity(currentFileName, entryFileName);
            if (similarity > 0.6) { // 60% similarity threshold
              similarFiles.push(entry.currentPath);
            }
          }
        }
      }
      
      return similarFiles;
      
    } catch (error) {
      console.error('Error finding similar files:', error);
      return [];
    }
  }

  /**
   * Calculate string similarity (simplified Levenshtein distance)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    const matrix: number[][] = [];
    
    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
    
    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return 1 - (distance / maxLen);
  }

  /**
   * Generate smart tags based on file content and metadata
   */
  async generateSmartTags(filePath: string, contentAnalysis?: { category?: string; keywords?: string[]; content?: string }): Promise<SmartTag[]> {
    try {
      const tags: SmartTag[] = [];
      const fileName = path.basename(filePath);
      const folderPath = path.dirname(filePath);
      const extension = path.extname(filePath).toLowerCase();
      
      // 1. File type tags
      tags.push({
        tag: `filetype:${extension.substring(1)}`,
        confidence: 1.0,
        source: 'filename',
        context: 'File extension'
      });
      
      // 2. Category-based tags
      if (contentAnalysis?.category) {
        tags.push({
          tag: `category:${contentAnalysis.category}`,
          confidence: 0.9,
          source: 'ai_analysis',
          context: 'AI content analysis'
        });
      }
      
      // 3. Keyword tags from content
      if (contentAnalysis?.keywords) {
        for (const keyword of contentAnalysis.keywords) {
          if (keyword.length > 2) { // Skip very short keywords
            tags.push({
              tag: keyword.toLowerCase().replace(/\s+/g, '-'),
              confidence: 0.8,
              source: 'content',
              context: 'Extracted from file content'
            });
          }
        }
      }
      
      // 4. Folder-based tags
      const folderName = path.basename(folderPath);
      if (folderName && folderName !== '.' && folderName !== '/') {
        tags.push({
          tag: `folder:${folderName.toLowerCase()}`,
          confidence: 0.7,
          source: 'folder',
          context: 'Parent folder name'
        });
      }
      
      // 5. Date-based tags
      try {
        const stats = await fs.promises.stat(filePath);
        const modDate = new Date(stats.mtime);
        const year = modDate.getFullYear();
        const month = modDate.toLocaleString('default', { month: 'long' }).toLowerCase();
        
        tags.push(
          {
            tag: `year:${year}`,
            confidence: 1.0,
            source: 'filename',
            context: 'File modification date'
          },
          {
            tag: `month:${month}`,
            confidence: 1.0,
            source: 'filename',
            context: 'File modification date'
          }
        );
      } catch (statError) {
        // Skip date tags if file stats unavailable
      }
      
      // 6. Pattern-based tags from filename
      const patterns = {
        'has-version': /v\d+|\d+\.\d+|version/i,
        'is-draft': /draft|temp|tmp|wip|work-in-progress/i,
        'is-final': /final|completed|done|finished/i,
        'has-date': /\d{4}[-_]\d{2}[-_]\d{2}|\d{2}[-_]\d{2}[-_]\d{4}/,
        'is-copy': /copy|duplicate|backup/i
      };
      
      for (const [patternName, regex] of Object.entries(patterns)) {
        if (regex.test(fileName)) {
          tags.push({
            tag: patternName,
            confidence: 0.8,
            source: 'filename',
            context: 'Filename pattern analysis'
          });
        }
      }
      
      // Remove duplicates and sort by confidence
      const uniqueTags = Array.from(
        new Map(tags.map(tag => [tag.tag, tag])).values()
      ).sort((a, b) => b.confidence - a.confidence);
      
      return uniqueTags;
      
    } catch (error) {
      console.error('Error generating smart tags:', error);
      return [];
    }
  }

  /**
   * Suggest smart folder structure based on file analysis
   */
  async suggestFolderStructure(filePath: string, contentAnalysis?: { category?: string; extractedEntities?: any }): Promise<FolderSuggestion> {
    try {
      const currentFolder = path.dirname(filePath);
      const fileName = path.basename(filePath);
      const extension = path.extname(filePath).toLowerCase();
      
      // Analyze existing folder patterns for similar files
      const similarFiles = await this.findFilesByCategory(contentAnalysis?.category);
      const commonFolders = this.extractCommonFolderPatterns(similarFiles);
      
      // Generate suggestion based on content category
      let suggestedPath = currentFolder;
      let reasoning = 'Keep in current location';
      let confidence = 0.3;
      let basedOn: 'content_analysis' | 'similar_files' | 'ai_category' | 'user_patterns' = 'content_analysis';
      const alternatives: string[] = [];
      
      if (contentAnalysis?.category) {
        const category = contentAnalysis.category.toLowerCase();
        
        // Common organization patterns
        const organizationPatterns: { [key: string]: string[] } = {
          'invoice': ['Documents/Invoices', 'Finance/Invoices', 'Business/Invoices'],
          'receipt': ['Documents/Receipts', 'Finance/Receipts', 'Business/Receipts'],
          'resume': ['Documents/Resume', 'Career/Resume', 'Personal/Resume'],
          'report': ['Documents/Reports', 'Work/Reports', 'Business/Reports'],
          'code': ['Projects/Code', 'Development', 'Code'],
          'meeting-notes': ['Documents/Meetings', 'Work/Meetings', 'Notes/Meetings'],
          'contract': ['Documents/Contracts', 'Legal/Contracts', 'Business/Contracts'],
          'image': ['Pictures', 'Images', 'Media/Images'],
          'photo': ['Pictures/Photos', 'Media/Photos', 'Personal/Photos']
        };
        
        if (organizationPatterns[category]) {
          const suggestions = organizationPatterns[category];
          suggestedPath = path.join(path.dirname(currentFolder), suggestions[0]);
          alternatives.push(...suggestions.slice(1).map(p => path.join(path.dirname(currentFolder), p)));
          reasoning = `Organized by content type: ${category}`;
          confidence = 0.8;
          basedOn = 'ai_category';
        }
      }
      
      // If we found similar files with common folder patterns, use that
      if (commonFolders.length > 0 && confidence < 0.9) {
        const mostCommon = commonFolders[0];
        if (mostCommon.count >= 2) { // At least 2 similar files in the same folder
          suggestedPath = mostCommon.folder;
          reasoning = `${mostCommon.count} similar files found in this location`;
          confidence = Math.min(0.9, 0.6 + (mostCommon.count * 0.1));
          basedOn = 'similar_files';
        }
      }
      
      // Add date-based organization for certain categories
      if (contentAnalysis?.category && ['invoice', 'receipt', 'report'].includes(contentAnalysis.category.toLowerCase())) {
        const currentYear = new Date().getFullYear();
        const dateBasedPath = path.join(suggestedPath, currentYear.toString());
        alternatives.unshift(dateBasedPath);
      }
      
      return {
        suggestedPath,
        confidence,
        reasoning,
        basedOn,
        alternatives
      };
      
    } catch (error) {
      console.error('Error suggesting folder structure:', error);
      return {
        suggestedPath: path.dirname(filePath),
        confidence: 0.0,
        reasoning: 'Error during folder analysis',
        basedOn: 'content_analysis',
        alternatives: []
      };
    }
  }

  /**
   * Find files by category in the registry
   */
  private async findFilesByCategory(category?: string): Promise<ProcessedFileRegistry[]> {
    if (!category) return [];
    
    const matchingFiles: ProcessedFileRegistry[] = [];
    
    for (const entry of this.registry.values()) {
      if (entry.fileCategory?.toLowerCase() === category.toLowerCase()) {
        matchingFiles.push(entry);
      }
    }
    
    return matchingFiles;
  }

  /**
   * Extract common folder patterns from similar files
   */
  private extractCommonFolderPatterns(files: ProcessedFileRegistry[]): { folder: string; count: number }[] {
    const folderCounts = new Map<string, number>();
    
    for (const file of files) {
      const folder = path.dirname(file.currentPath);
      folderCounts.set(folder, (folderCounts.get(folder) || 0) + 1);
    }
    
    return Array.from(folderCounts.entries())
      .map(([folder, count]) => ({ folder, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Update file registry with AI analysis results (for Task 2B integration)
   */
  async updateFileWithAnalysis(
    filePath: string, 
    analysis: {
      category?: string;
      keywords?: string[];
      contentSummary?: string;
      extractedEntities?: any;
    }
  ): Promise<void> {
    try {
      const contentHash = this.pathToHashMap.get(filePath) || await this.calculateContentHash(filePath);
      const entry = this.registry.get(contentHash);
      
      if (!entry) {
        console.warn(`No registry entry found for file: ${path.basename(filePath)}`);
        return;
      }
      
      // Generate smart tags
      const smartTags = await this.generateSmartTags(filePath, analysis);
      
      // Generate folder suggestion
      const folderSuggestion = await this.suggestFolderStructure(filePath, analysis);
      
      // Update registry entry
      entry.fileCategory = analysis.category;
      entry.extractedKeywords = analysis.keywords;
      entry.contentSummary = analysis.contentSummary;
      entry.contentTags = smartTags.map(tag => tag.tag);
      entry.suggestedFolder = folderSuggestion.suggestedPath;
      
      console.log(`🏷️ Updated file analysis: ${path.basename(filePath)} - Category: ${analysis.category}, Tags: ${entry.contentTags?.length || 0}, Folder: ${folderSuggestion.confidence > 0.5 ? 'suggested' : 'current'}`);
      
    } catch (error) {
      console.error('Error updating file with analysis:', error);
    }
  }

  /**
   * Get comprehensive file analysis including duplicates and suggestions
   */
  async getFileAnalysis(filePath: string): Promise<{
    duplicateAnalysis: DuplicateAnalysis;
    smartTags: SmartTag[];
    folderSuggestion: FolderSuggestion;
    registryEntry?: ProcessedFileRegistry;
  }> {
    try {
      const duplicateAnalysis = await this.analyzeDuplicates(filePath);
      const registryEntry = this.getFileHistory(filePath);
      
      // Use existing analysis if available, otherwise generate basic analysis
      const contentAnalysis = registryEntry ? {
        category: registryEntry.fileCategory,
        keywords: registryEntry.extractedKeywords,
        content: registryEntry.contentSummary
      } : undefined;
      
      const smartTags = await this.generateSmartTags(filePath, contentAnalysis);
      const folderSuggestion = await this.suggestFolderStructure(filePath, contentAnalysis);
      
      return {
        duplicateAnalysis,
        smartTags,
        folderSuggestion,
        registryEntry: registryEntry || undefined
      };
      
    } catch (error) {
      console.error('Error getting file analysis:', error);
      return {
        duplicateAnalysis: {
          isDuplicate: false,
          similarFiles: [],
          duplicateFiles: [],
          confidence: 0.0,
          action: 'keep_both',
          reason: 'Error during analysis'
        },
        smartTags: [],
        folderSuggestion: {
          suggestedPath: path.dirname(filePath),
          confidence: 0.0,
          reasoning: 'Error during analysis',
          basedOn: 'content_analysis',
          alternatives: []
        }
      };
    }
  }
} 