import * as path from 'path';
import * as fs from 'fs/promises';
import { Database } from 'sqlite3';
import { promisify } from 'util';

// Core interfaces
interface FolderPattern {
  path: string;
  contentTypes: string[];
  fileCount: number;
  organizationStyle: string;
  confidence: number;
  examples: string[];
}

interface FolderSuggestion {
  path: string;
  confidence: number;
  reasoning: string;
  basedOn: 'content_analysis' | 'existing_patterns' | 'user_preferences' | 'ai_intelligence';
  alternatives: string[];
  canCreateNew: boolean;
}

interface FolderAnalysis {
  discoveredPatterns: FolderPattern[];
  organizationStyle: 'date_based' | 'company_based' | 'category_based' | 'mixed' | 'unstructured';
  confidence: number;
  recommendations: string[];
}

export class FolderIntelligenceService {
  private db: Database;
  private dbPath: string;
  private watchedFolders: Set<string> = new Set();
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(dbPath: string = './folder-intelligence.db') {
    this.dbPath = dbPath;
    this.db = new Database(dbPath);
    // Start initialization but don't wait for it in constructor
    this.initializationPromise = this.initializeDatabase();
  }

  // Step 1: Set watched folders (only app can call this, not user)
  public setWatchedFolders(folders: string[]): void {
    this.watchedFolders.clear();
    folders.forEach(folder => {
      const normalizedPath = path.resolve(folder);
      this.watchedFolders.add(normalizedPath);
      console.log(`📁 Monitoring folder: ${normalizedPath}`);
    });
  }

  // Step 2: Check if folder is being watched by the app
  private isFolderWatched(folderPath: string): boolean {
    const normalizedPath = path.resolve(folderPath);
    
    // Check if exact path is watched
    if (this.watchedFolders.has(normalizedPath)) {
      return true;
    }
    
    // Check if folder is within any watched parent folder
    for (const watchedPath of this.watchedFolders) {
      if (normalizedPath.startsWith(watchedPath + path.sep)) {
        return true;
      }
    }
    
    return false;
  }

  // Step 3: Get list of watched folders
  public getWatchedFolders(): string[] {
    return Array.from(this.watchedFolders);
  }

  // Step 4: Wait for database initialization
  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
      this.initializationPromise = null;
    }
  }

  // Step 5: Initialize SQLite database
  private async initializeDatabase(): Promise<void> {
    if (this.isInitialized) return;
    
    const runAsync = promisify(this.db.run.bind(this.db));
    
    try {
      await runAsync(`
        CREATE TABLE IF NOT EXISTS folder_patterns (
          id INTEGER PRIMARY KEY,
          folder_path TEXT NOT NULL,
          content_type TEXT NOT NULL,
          confidence REAL NOT NULL,
          file_count INTEGER NOT NULL,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await runAsync(`
        CREATE TABLE IF NOT EXISTS user_folder_preferences (
          id INTEGER PRIMARY KEY,
          content_type TEXT NOT NULL,
          preferred_folder TEXT NOT NULL,
          confidence REAL NOT NULL,
          choice_count INTEGER DEFAULT 1,
          last_used DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.isInitialized = true;
      console.log('✅ Folder Intelligence Database initialized');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  // Step 2: Analyze folder structure (with permission check)
  async analyzeFolderStructure(basePath: string): Promise<FolderAnalysis> {
    // Wait for database to be initialized
    await this.ensureInitialized();
    
    // Security check: Ensure access is allowed
    if (!this.isFolderWatched(basePath)) {
      throw new Error(`❌ Access denied to folder: ${basePath}. Please add to watched folders first.`);
    }

    try {
      const patterns = await this.scanFolderStructure(basePath);
      const organizationStyle = this.detectOrganizationStyle(patterns);
      
      return {
        discoveredPatterns: patterns,
        organizationStyle,
        confidence: this.calculateOverallConfidence(patterns),
        recommendations: this.generateRecommendations(patterns)
      };
    } catch (error) {
      console.error('❌ Folder analysis failed:', error);
      throw error;
    }
  }

  // Step 3: Scan folder structure (with permission checks)
  private async scanFolderStructure(basePath: string): Promise<FolderPattern[]> {
    const patterns: FolderPattern[] = [];
    
    try {
      const entries = await fs.readdir(basePath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const folderPath = path.join(basePath, entry.name);
          
          // Only analyze folders we have permission to access
          if (this.isFolderWatched(folderPath)) {
            const pattern = await this.analyzeSingleFolder(folderPath);
            if (pattern) {
              patterns.push(pattern);
            }
          } else {
            console.log(`⚠️  Skipping folder (not monitored): ${folderPath}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Folder scanning failed:', error);
    }
    
    return patterns;
  }

  // Step 4: Analyze single folder
  private async analyzeSingleFolder(folderPath: string): Promise<FolderPattern | null> {
    try {
      const files = await fs.readdir(folderPath);
      const fileCount = files.length;
      
      if (fileCount === 0) return null;
      
      const contentTypes = this.detectContentTypes(files);
      const organizationStyle = this.detectFolderOrganizationStyle(folderPath);
      
      return {
        path: folderPath,
        contentTypes,
        fileCount,
        organizationStyle,
        confidence: 0.7,
        examples: files.slice(0, 3)
      };
    } catch (error) {
      console.error(`❌ Failed to analyze folder ${folderPath}:`, error);
      return null;
    }
  }

  // Step 5: Detect content types
  private detectContentTypes(files: string[]): string[] {
    const typeMap: { [key: string]: string } = {
      '.pdf': 'document',
      '.doc': 'document',
      '.docx': 'document',
      '.txt': 'document',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.png': 'image',
      '.js': 'code',
      '.ts': 'code',
      '.tsx': 'code',
      '.jsx': 'code'
    };
    
    const types = new Set<string>();
    
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (typeMap[ext]) {
        types.add(typeMap[ext]);
      }
    });
    
    return Array.from(types);
  }

  // Step 6: Detect organization style
  private detectFolderOrganizationStyle(folderPath: string): string {
    const folderName = path.basename(folderPath);
    
    if (/\d{4}/.test(folderName)) return 'date_based';
    if (/invoice|bill|receipt|finance/i.test(folderName)) return 'category_based';
    if (/project|code|src/i.test(folderName)) return 'category_based';
    
    return 'unstructured';
  }

  // Step 7: Detect overall organization style
  private detectOrganizationStyle(patterns: FolderPattern[]): 'date_based' | 'company_based' | 'category_based' | 'mixed' | 'unstructured' {
    if (patterns.length === 0) return 'unstructured';
    
    const styles = patterns.map(p => p.organizationStyle);
    const unique = [...new Set(styles)];
    
    if (unique.length === 1) return unique[0] as any;
    return 'mixed';
  }

  // Step 8: Calculate confidence
  private calculateOverallConfidence(patterns: FolderPattern[]): number {
    if (patterns.length === 0) return 0;
    
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  // Step 9: Generate recommendations
  private generateRecommendations(patterns: FolderPattern[]): string[] {
    const recommendations: string[] = [];
    
    const categoryFolders = patterns.filter(p => p.organizationStyle === 'category_based');
    const dateFolders = patterns.filter(p => p.organizationStyle === 'date_based');
    
    if (categoryFolders.length > 0) {
      recommendations.push('Category-based organization detected');
    }
    
    if (dateFolders.length > 0) {
      recommendations.push('Date-based organization detected');
    }
    
    return recommendations;
  }

  // Step 10: Suggest folder (basic)
  async suggestFolderForFile(filePath: string, contentAnalysis: any): Promise<FolderSuggestion[]> {
    const suggestions: FolderSuggestion[] = [];
    const currentDir = path.dirname(filePath);
    
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    
    if (ext === '.pdf' && fileName.toLowerCase().includes('invoice')) {
      suggestions.push({
        path: path.join(currentDir, 'Finance/Invoices'),
        confidence: 0.8,
        reasoning: 'PDF invoice detected',
        basedOn: 'content_analysis',
        alternatives: [
          path.join(currentDir, 'Finance/Bills'), 
          path.join(currentDir, 'Business/Invoices')
        ],
        canCreateNew: true
      });
    }
    
    return suggestions;
  }

  // Step 11: Learn from user choices
  async learnFromUserChoice(suggestion: FolderSuggestion, userChoice: string): Promise<void> {
    console.log(`📚 Learning: User chose ${userChoice} instead of ${suggestion.path}`);
  }

  // Step 12: Cleanup
  async close(): Promise<void> {
    // Wait for any ongoing initialization to complete
    await this.ensureInitialized();
    
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Database close error:', err);
        } else {
          console.log('✅ Database connection closed');
        }
        resolve();
      });
    });
  }

  // Add AI-enhanced suggestion method
  async suggestFolderWithAI(filePath: string): Promise<FolderSuggestion[]> {
    // Wait for database to be initialized
    await this.ensureInitialized();
    
    // Security check - check if the file's parent directory is being watched
    const fileDir = path.dirname(filePath);
    if (!this.isFolderWatched(fileDir)) {
              throw new Error(`❌ Access denied to analyze file: ${filePath}. File directory '${fileDir}' not in watched folders: ${Array.from(this.watchedFolders).join(', ')}`);
    }

    console.log(`🤖 AI-analyzing file for folder suggestion: ${filePath}`);
    
    try {
      // Get basic file info
      const fileName = path.basename(filePath);
      const fileExt = path.extname(filePath);
      const stats = await fs.stat(filePath);
      
      // Read content preview if it's a text file
      let contentPreview = '';
      if (['.txt', '.md', '.json', '.js', '.ts', '.py'].includes(fileExt)) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          contentPreview = content.substring(0, 1000); // First 1000 chars
        } catch (error) {
          console.log(`⚠️  Could not read content: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Call Enhanced Python AI service for content and folder analysis
      const aiAnalysis = await this.callPythonAIService({
        file_path: filePath,
        original_name: fileName,
        file_size: stats.size,
        file_extension: fileExt,
        content_preview: contentPreview
      });
      
      // Get existing folder patterns for context
      const folderPatterns = await this.getExistingFolderPatterns();
      
      // Generate AI-enhanced suggestions
      const suggestions = this.generateAIFolderSuggestions(
        filePath,
        aiAnalysis,
        folderPatterns
      );
      
      return suggestions;
      
    } catch (error) {
      console.error('❌ AI folder analysis failed:', error);
      
      // Fallback to basic suggestion
      return this.suggestFolderForFile(filePath, {});
    }
  }

  // Call Enhanced Python AI service for content and folder analysis
  private async callPythonAIService(request: any): Promise<any> {
    const enhancedServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8002';
    
    try {
      // Add base directory to the request for folder analysis
      const enhancedRequest = {
        ...request,
        base_directory: path.dirname(request.file_path),
        include_folder_suggestions: true
      };
      
      const response = await fetch(`${enhancedServiceUrl}/analyze-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enhancedRequest),
      });
      
      if (!response.ok) {
        throw new Error(`Enhanced AI service responded with status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`✅ Enhanced AI analysis complete: ${result.category} (${result.confidence} confidence)`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to call Enhanced AI service:', error);
      throw error;
    }
  }

  // Get existing folder patterns for context
  private async getExistingFolderPatterns(): Promise<FolderPattern[]> {
    const allPatterns: FolderPattern[] = [];
    
    // Scan all watched folders for patterns
    for (const watchedFolder of this.watchedFolders) {
      try {
        const analysis = await this.analyzeFolderStructure(watchedFolder);
        allPatterns.push(...analysis.discoveredPatterns);
      } catch (error) {
        console.log(`⚠️  Could not analyze folder: ${watchedFolder}`);
      }
    }
    
    return allPatterns;
  }

  // Generate AI-enhanced folder suggestions
  private generateAIFolderSuggestions(
    filePath: string,
    aiAnalysis: any,
    existingPatterns: FolderPattern[]
  ): FolderSuggestion[] {
    const suggestions: FolderSuggestion[] = [];
    const currentDir = path.dirname(filePath);
    
    // AI Category-based suggestion
    if (aiAnalysis.category && aiAnalysis.confidence > 0.7) {
      const categoryFolder = this.mapCategoryToFolder(aiAnalysis.category, currentDir);
      suggestions.push({
        path: categoryFolder,
        confidence: aiAnalysis.confidence,
        reasoning: `AI detected content type: ${aiAnalysis.category}. ${aiAnalysis.reasoning}`,
        basedOn: 'ai_intelligence',
        alternatives: [],
        canCreateNew: true
      });
    }
    
    // Pattern-based suggestion enhanced with AI
    const matchingPatterns = this.findMatchingPatterns(aiAnalysis.category, existingPatterns);
    if (matchingPatterns.length > 0) {
      const bestPattern = matchingPatterns[0];
      suggestions.push({
        path: bestPattern.path,
        confidence: Math.min(0.9, bestPattern.confidence + 0.1),
        reasoning: `Found ${matchingPatterns.length} similar files in this folder pattern`,
        basedOn: 'ai_intelligence',
        alternatives: matchingPatterns.slice(1, 3).map(p => p.path),
        canCreateNew: false
      });
    }
    
    // Smart folder creation based on AI analysis
    if (aiAnalysis.extracted_entities) {
      const smartFolder = this.createSmartFolderPath(aiAnalysis, currentDir);
      if (smartFolder) {
        suggestions.push({
          path: smartFolder,
          confidence: 0.8,
          reasoning: `Smart folder based on extracted entities: ${Object.keys(aiAnalysis.extracted_entities).join(', ')}`,
          basedOn: 'ai_intelligence',
          alternatives: [],
          canCreateNew: true
        });
      }
    }
    
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  // Map AI category to sensible folder structure
  private mapCategoryToFolder(category: string, baseDir: string): string {
    const categoryMap: { [key: string]: string } = {
      'invoice': 'Finance/Invoices',
      'receipt': 'Finance/Receipts',
      'contract': 'Legal/Contracts',
      'resume': 'Career/Resume',
      'meeting-notes': 'Work/Meetings',
      'report': 'Work/Reports',
      'code': 'Projects/Code',
      'image': 'Media/Images',
      'document': 'Files'
    };
    
    const folderPath = categoryMap[category] || `${category}`;
    // Use baseDir as root instead of going to parent directory
    return path.join(baseDir, folderPath);
  }

  // Find existing patterns that match AI category
  private findMatchingPatterns(category: string, patterns: FolderPattern[]): FolderPattern[] {
    return patterns.filter(pattern => {
      const folderName = path.basename(pattern.path).toLowerCase();
      return folderName.includes(category.toLowerCase()) || 
             pattern.contentTypes.some(type => type === category);
    });
  }

  // Create smart folder path based on AI entities
  private createSmartFolderPath(aiAnalysis: any, baseDir: string): string | null {
    const entities = aiAnalysis.extracted_entities;
    
    if (entities?.company) {
      const company = entities.company;
      if (aiAnalysis.category === 'invoice') {
        return path.join(baseDir, `Finance/Invoices/${company}`);
      }
    }
    
    if (entities?.deadline) {
      const deadline = entities.deadline;
      const year = deadline.includes('2024') ? '2024' : '2025';
      return path.join(baseDir, `Archive/${year}`);
    }
    
    return null;
  }

  /**
   * Move file to suggested folder - handles both existing and new folders
   */
  async moveFileToSuggestedFolder(
    filePath: string, 
    targetFolderPath: string, 
    createFolderIfNeeded: boolean = false
  ): Promise<{ success: boolean; newPath?: string; error?: string }> {
    try {
      // Security check - check if the file's parent directory is being watched
      const fileDir = path.dirname(filePath);
      if (!this.isFolderWatched(fileDir)) {
        throw new Error(`❌ Access denied to move file: ${filePath}. File directory '${fileDir}' not in watched folders: ${Array.from(this.watchedFolders).join(', ')}`);
      }



      const fileName = path.basename(filePath);
      const targetPath = path.join(targetFolderPath, fileName);

      // Check if target folder exists
      const folderExists = await fs.access(targetFolderPath).then(() => true).catch(() => false);
      
      if (!folderExists) {
        if (createFolderIfNeeded) {
          await fs.mkdir(targetFolderPath, { recursive: true });
        } else {
          return {
            success: false,
            error: `Target folder does not exist: ${targetFolderPath}`
          };
        }
      }

      // Check if target file already exists
      const targetExists = await fs.access(targetPath).then(() => true).catch(() => false);
      
      if (targetExists) {
        // Generate unique name if target exists
        const finalTargetPath = await this.generateUniqueFileName(targetPath);
        
        await fs.rename(filePath, finalTargetPath);
        
        return {
          success: true,
          newPath: finalTargetPath
        };
      } else {
        // Move to target path directly
        await fs.rename(filePath, targetPath);
        
        return {
          success: true,
          newPath: targetPath
        };
      }

    } catch (error) {
      console.error('❌ Folder move operation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during folder operation'
      };
    }
  }

  /**
   * Generate unique filename if target already exists
   */
  private async generateUniqueFileName(targetPath: string): Promise<string> {
    const dir = path.dirname(targetPath);
    const ext = path.extname(targetPath);
    const baseName = path.basename(targetPath, ext);
    
    let counter = 1;
    let uniquePath = targetPath;
    
    while (await fs.access(uniquePath).then(() => true).catch(() => false)) {
      uniquePath = path.join(dir, `${baseName} (${counter})${ext}`);
      counter++;
    }
    
    return uniquePath;
  }

  /**
   * Validate folder operation before execution
   */
  async validateFolderOperation(
    filePath: string, 
    targetFolderPath: string
  ): Promise<{ valid: boolean; error?: string; suggestions?: string[] }> {
    try {
      // Security check - check if the file's parent directory is being watched
      const fileDir = path.dirname(filePath);
      if (!this.isFolderWatched(fileDir)) {
        return {
          valid: false,
          error: 'File directory not in watched folders - operation not allowed'
        };
      }

      // Check if source file exists
      const sourceExists = await fs.access(filePath).then(() => true).catch(() => false);
      if (!sourceExists) {
        return {
          valid: false,
          error: 'Source file no longer exists'
        };
      }

      // Check target folder path validity
      if (!path.isAbsolute(targetFolderPath)) {
        return {
          valid: false,
          error: 'Target folder path must be absolute'
        };
      }

      // Check if target is within watched folders or safe location
      const isTargetSafe = this.watchedFolders.size === 0 || Array.from(this.watchedFolders).some(watchedFolder => 
        targetFolderPath.startsWith(watchedFolder)
      );

      if (!isTargetSafe) {
        return {
          valid: false,
          error: 'Target folder must be within watched directories',
          suggestions: Array.from(this.watchedFolders).map(folder => 
            path.join(folder, path.basename(targetFolderPath))
          )
        };
      }

      return { valid: true };

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }
} 