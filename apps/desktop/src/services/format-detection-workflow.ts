import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NamingConvention {
  type: 'hyphenated' | 'spaced' | 'underscored' | 'camelCase' | 'PascalCase' | 'custom';
  caseStyle: 'lowercase' | 'uppercase' | 'titleCase' | 'sentenceCase' | 'preserve';
  separator: '-' | ' ' | '_' | '' | string;
  example: string;
}

export interface DetectedPattern {
  convention: NamingConvention;
  confidence: number;
  sampleFiles: string[];
  frequency: number;
}

export interface FormatDetectionState {
  // Input
  suggestedName: string;
  targetFolder: string;
  originalFileName: string;
  fileExtension: string;
  
  // Pattern Detection Results
  folderPatterns: DetectedPattern[];
  dominantPattern?: DetectedPattern;
  
  // User Preferences
  userPreferences?: NamingConvention;
  globalPreference?: NamingConvention;
  
  // Processing Results
  formattedName: string;
  alternativeFormats: string[];
  
  // Validation
  hasConflicts: boolean;
  conflictingFiles: string[];
  finalName: string;
  
  // Metadata
  processingStage: string;
  confidence: number;
  reasoningSteps: string[];
  error?: string;
}

// ============================================================================
// NAMING CONVENTION UTILITIES
// ============================================================================

export class NamingConventionDetector {
  
  // Pre-defined common conventions
  static readonly CONVENTIONS: Record<string, NamingConvention> = {
    hyphenated: {
      type: 'hyphenated',
      caseStyle: 'lowercase',
      separator: '-',
      example: 'my-document-file.pdf'
    },
    spacedTitle: {
      type: 'spaced',
      caseStyle: 'titleCase',
      separator: ' ',
      example: 'My Document File.pdf'
    },
    spacedSentence: {
      type: 'spaced',
      caseStyle: 'sentenceCase',
      separator: ' ',
      example: 'My document file.pdf'
    },
    spacedLower: {
      type: 'spaced',
      caseStyle: 'lowercase',
      separator: ' ',
      example: 'my document file.pdf'
    },
    underscored: {
      type: 'underscored',
      caseStyle: 'lowercase',
      separator: '_',
      example: 'my_document_file.pdf'
    },
    camelCase: {
      type: 'camelCase',
      caseStyle: 'preserve',
      separator: '',
      example: 'myDocumentFile.pdf'
    },
    PascalCase: {
      type: 'PascalCase',
      caseStyle: 'preserve',
      separator: '',
      example: 'MyDocumentFile.pdf'
    }
  };

  /**
   * Analyze a filename and detect its naming convention
   */
  static detectConvention(filename: string): { convention: NamingConvention; confidence: number } {
    const nameWithoutExt = path.parse(filename).name;
    
    // Check for different patterns
    const checks = [
      { pattern: /^[a-z]+(-[a-z]+)+$/, convention: 'hyphenated', confidence: 0.95 },
      { pattern: /^[A-Z][a-z]*(\s[A-Z][a-z]*)+$/, convention: 'spacedTitle', confidence: 0.9 },
      { pattern: /^[A-Z][a-z]*(\s[a-z]+)+$/, convention: 'spacedSentence', confidence: 0.85 },
      { pattern: /^[a-z]+(\s[a-z]+)+$/, convention: 'spacedLower', confidence: 0.8 },
      { pattern: /^[a-z]+(_[a-z]+)+$/, convention: 'underscored', confidence: 0.9 },
      { pattern: /^[a-z]+([A-Z][a-z]*)+$/, convention: 'camelCase', confidence: 0.85 },
      { pattern: /^[A-Z][a-z]*([A-Z][a-z]*)+$/, convention: 'PascalCase', confidence: 0.8 }
    ];

    for (const check of checks) {
      if (check.pattern.test(nameWithoutExt)) {
        return {
          convention: this.CONVENTIONS[check.convention],
          confidence: check.confidence
        };
      }
    }

    // Default fallback
    return {
      convention: this.CONVENTIONS.hyphenated,
      confidence: 0.3
    };
  }

  /**
   * Apply a naming convention to a suggested name
   */
  static applyConvention(suggestedName: string, convention: NamingConvention): string {
    const nameWithoutExt = path.parse(suggestedName).name;
    const extension = path.parse(suggestedName).ext;
    
    // Split into words (handle various separators)
    const words = nameWithoutExt
      .split(/[-_\s]+/)
      .filter(word => word.length > 0)
      .map(word => word.toLowerCase());

    let formattedName: string;

    switch (convention.type) {
      case 'hyphenated':
        formattedName = words.join('-');
        break;
      
      case 'spaced':
        switch (convention.caseStyle) {
          case 'titleCase':
            formattedName = words.map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            break;
          case 'sentenceCase':
            formattedName = words[0].charAt(0).toUpperCase() + words[0].slice(1) + 
              (words.length > 1 ? ' ' + words.slice(1).join(' ') : '');
            break;
          case 'lowercase':
            formattedName = words.join(' ');
            break;
          default:
            formattedName = words.join(' ');
        }
        break;
      
      case 'underscored':
        formattedName = words.join('_');
        break;
      
      case 'camelCase':
        formattedName = words[0] + words.slice(1).map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join('');
        break;
      
      case 'PascalCase':
        formattedName = words.map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join('');
        break;
      
      default:
        formattedName = words.join(convention.separator);
    }

    return formattedName + extension;
  }

  /**
   * Analyze all files in a folder to detect dominant patterns
   */
  static async analyzeFolderPatterns(folderPath: string): Promise<DetectedPattern[]> {
    try {
      const files = await fs.promises.readdir(folderPath);
      const patterns = new Map<string, DetectedPattern>();

      for (const file of files) {
        // Skip hidden files and directories
        if (file.startsWith('.')) continue;
        
        const stat = await fs.promises.stat(path.join(folderPath, file));
        if (stat.isDirectory()) continue;

        const detection = this.detectConvention(file);
        const key = `${detection.convention.type}-${detection.convention.caseStyle}`;
        
        if (patterns.has(key)) {
          const existing = patterns.get(key)!;
          existing.frequency++;
          existing.confidence = Math.max(existing.confidence, detection.confidence);
          existing.sampleFiles.push(file);
        } else {
          patterns.set(key, {
            convention: detection.convention,
            confidence: detection.confidence,
            frequency: 1,
            sampleFiles: [file]
          });
        }
      }

      // Convert to array and sort by frequency and confidence
      return Array.from(patterns.values())
        .sort((a, b) => (b.frequency * b.confidence) - (a.frequency * a.confidence));
        
    } catch (error) {
      console.error('Error analyzing folder patterns:', error);
      return [];
    }
  }
}

// ============================================================================
// LANGGRAPH WORKFLOW IMPLEMENTATION
// ============================================================================

export class FormatDetectionWorkflow {
  private workflow: any;

  constructor() {
    this.workflow = this.buildWorkflow();
  }

  private buildWorkflow(): any {
    // For now, we'll create a simplified workflow structure
    // that bypasses the strict TypeScript LangGraph implementation
    // This ensures functionality while avoiding API compatibility issues
    
    console.log('🏗️ Building simplified workflow structure');
    
    return {
      invoke: async (state: FormatDetectionState) => {
        // Execute the workflow steps sequentially
        let currentState = { ...state };
        
        // Step 1: Detect folder patterns
        const step1Result = await this.detectFolderPatterns(currentState);
        currentState = { ...currentState, ...step1Result };
        
        // Step 2: Apply user format
        const step2Result = await this.applyUserFormat(currentState);
        currentState = { ...currentState, ...step2Result };
        
        // Step 3: Validate and finalize
        const step3Result = await this.validateAndFinalize(currentState);
        currentState = { ...currentState, ...step3Result };
        
        return currentState;
      },
      compile: () => ({
        invoke: async (state: FormatDetectionState) => {
          // Execute the workflow steps sequentially
          let currentState = { ...state };
          
          // Step 1: Detect folder patterns
          const step1Result = await this.detectFolderPatterns(currentState);
          currentState = { ...currentState, ...step1Result };
          
          // Step 2: Apply user format
          const step2Result = await this.applyUserFormat(currentState);
          currentState = { ...currentState, ...step2Result };
          
          // Step 3: Validate and finalize
          const step3Result = await this.validateAndFinalize(currentState);
          currentState = { ...currentState, ...step3Result };
          
          return currentState;
        }
      })
    };
  }

  // ============================================================================
  // WORKFLOW NODES
  // ============================================================================

  /**
   * Node 1: Detect folder naming patterns
   */
  private async detectFolderPatterns(state: FormatDetectionState): Promise<Partial<FormatDetectionState>> {
    console.log('🔍 Detecting folder patterns for:', state.targetFolder);
    
    try {
      const patterns = await NamingConventionDetector.analyzeFolderPatterns(state.targetFolder);
      const dominantPattern = patterns.length > 0 ? patterns[0] : undefined;
      
      return {
        folderPatterns: patterns,
        dominantPattern,
        processingStage: 'patterns_detected',
        reasoningSteps: [
          ...state.reasoningSteps || [],
          `Analyzed folder: ${state.targetFolder}`,
          `Found ${patterns.length} naming patterns`,
          dominantPattern ? `Dominant pattern: ${dominantPattern.convention.type} (${dominantPattern.frequency} files)` : 'No clear pattern detected'
        ]
      };
    } catch (error) {
      console.error('Error in detectFolderPatterns:', error);
      return {
        error: `Pattern detection failed: ${error}`,
        processingStage: 'pattern_detection_failed'
      };
    }
  }

  /**
   * Node 2: Apply user format preferences
   */
  private async applyUserFormat(state: FormatDetectionState): Promise<Partial<FormatDetectionState>> {
    console.log('🎨 Applying format to:', state.suggestedName);
    
    try {
      // Determine which convention to use (priority order)
      let chosenConvention: NamingConvention;
      let reasonForChoice: string;

      if (state.userPreferences) {
        chosenConvention = state.userPreferences;
        reasonForChoice = 'Using explicit user preference';
      } else if (state.dominantPattern && state.dominantPattern.confidence > 0.7) {
        chosenConvention = state.dominantPattern.convention;
        reasonForChoice = `Following folder pattern (${state.dominantPattern.frequency} files, ${state.dominantPattern.confidence.toFixed(2)} confidence)`;
      } else if (state.globalPreference) {
        chosenConvention = state.globalPreference;
        reasonForChoice = 'Using global user preference';
      } else {
        chosenConvention = NamingConventionDetector.CONVENTIONS.hyphenated;
        reasonForChoice = 'Using default hyphenated format';
      }

      // Apply chosen convention
      const formattedName = NamingConventionDetector.applyConvention(state.suggestedName, chosenConvention);

      // Generate alternatives using other common conventions
      const alternatives = Object.values(NamingConventionDetector.CONVENTIONS)
        .filter(conv => conv.type !== chosenConvention.type)
        .slice(0, 3) // Top 3 alternatives
        .map(conv => NamingConventionDetector.applyConvention(state.suggestedName, conv));

      return {
        formattedName,
        alternativeFormats: alternatives,
        processingStage: 'format_applied',
        reasoningSteps: [
          ...state.reasoningSteps || [],
          reasonForChoice,
          `Applied ${chosenConvention.type} format: "${formattedName}"`
        ]
      };
    } catch (error) {
      console.error('Error in applyUserFormat:', error);
      return {
        error: `Format application failed: ${error}`,
        processingStage: 'format_application_failed'
      };
    }
  }

  /**
   * Node 3: Validate and finalize the name
   */
  private async validateAndFinalize(state: FormatDetectionState): Promise<Partial<FormatDetectionState>> {
    console.log('✅ Validating final name:', state.formattedName);
    
    try {
      const targetPath = path.join(state.targetFolder, state.formattedName);
      const conflictingFiles: string[] = [];
      let finalName = state.formattedName;

      // Check for file conflicts
      try {
        await fs.promises.access(targetPath);
        conflictingFiles.push(state.formattedName);
        
        // Generate unique name if conflict exists
        const parsedName = path.parse(state.formattedName);
        let counter = 1;
        
        while (conflictingFiles.length > 0) {
          const newName = `${parsedName.name}-${counter}${parsedName.ext}`;
          const newPath = path.join(state.targetFolder, newName);
          
          try {
            await fs.promises.access(newPath);
            counter++;
          } catch {
            finalName = newName;
            break;
          }
        }
      } catch {
        // No conflict, use original formatted name
      }

      // Calculate final confidence score
      const baseConfidence = state.dominantPattern?.confidence || 0.5;
      const formatConfidence = state.userPreferences ? 0.9 : (state.dominantPattern ? 0.8 : 0.6);
      const conflictPenalty = conflictingFiles.length > 0 ? 0.1 : 0;
      const finalConfidence = Math.max(0.1, Math.min(1.0, (baseConfidence + formatConfidence) / 2 - conflictPenalty));

      return {
        finalName,
        hasConflicts: conflictingFiles.length > 0,
        conflictingFiles,
        confidence: finalConfidence,
        processingStage: 'completed',
        reasoningSteps: [
          ...state.reasoningSteps || [],
          conflictingFiles.length > 0 ? `Resolved naming conflict: "${finalName}"` : 'No naming conflicts detected',
          `Final confidence: ${finalConfidence.toFixed(2)}`
        ]
      };
    } catch (error) {
      console.error('Error in validateAndFinalize:', error);
      return {
        error: `Validation failed: ${error}`,
        processingStage: 'validation_failed',
        finalName: state.formattedName, // Fallback to formatted name
        confidence: 0.3
      };
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Execute the complete format detection workflow
   */
  async processFile(input: {
    suggestedName: string;
    targetFolder: string;
    originalFileName: string;
  }): Promise<FormatDetectionResult> {
    const startTime = Date.now();
    
    const initialState: FormatDetectionState = {
      suggestedName: input.suggestedName,
      targetFolder: input.targetFolder,
      originalFileName: input.originalFileName,
      fileExtension: path.extname(input.suggestedName),
      folderPatterns: [],
      formattedName: '',
      alternativeFormats: [],
      hasConflicts: false,
      conflictingFiles: [],
      finalName: '',
      processingStage: 'initialized',
      confidence: 0,
      reasoningSteps: []
    };

    try {
      const compiled = this.workflow.compile();
      const result = await compiled.invoke(initialState);
      
      return {
        success: true,
        finalName: result.finalName,
        formattedName: result.formattedName,
        alternativeFormats: result.alternativeFormats || [],
        confidence: result.confidence,
        hasConflicts: result.hasConflicts,
        conflictingFiles: result.conflictingFiles || [],
        dominantPattern: result.dominantPattern,
        processingTimeMs: Date.now() - startTime,
        reasoningSteps: result.reasoningSteps || [],
        error: result.error
      };
    } catch (error) {
      console.error('Workflow execution failed:', error);
      return {
        success: false,
        finalName: input.suggestedName,
        formattedName: input.suggestedName,
        alternativeFormats: [],
        confidence: 0.1,
        hasConflicts: false,
        conflictingFiles: [],
        processingTimeMs: Date.now() - startTime,
        reasoningSteps: [`Workflow failed: ${error}`],
        error: `Workflow execution failed: ${error}`
      };
    }
  }
}

// ============================================================================
// RESULT INTERFACE
// ============================================================================

export interface FormatDetectionResult {
  success: boolean;
  finalName: string;
  formattedName: string;
  alternativeFormats: string[];
  confidence: number;
  hasConflicts: boolean;
  conflictingFiles: string[];
  dominantPattern?: DetectedPattern;
  processingTimeMs: number;
  reasoningSteps: string[];
  error?: string;
}

// Export singleton instance
export const formatDetectionWorkflow = new FormatDetectionWorkflow(); 