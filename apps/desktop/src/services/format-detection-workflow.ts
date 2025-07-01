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

// ============================================================================
// CONTEXT-AWARE FORMAT DETECTION INTERFACES
// ============================================================================

export interface ContextualFormatRule {
  context: string;
  preferredFormat: string; // Key from CONVENTIONS
  confidence: number;
  description: string;
}

export interface FileContext {
  type: string;
  confidence: number;
  evidence: string[];
  detectedBy: string;
}

export interface ContextDetectionResult {
  context: FileContext;
  suggestedFormat: NamingConvention;
  confidence: number;
  reasoning: string;
}

// ============================================================================
// CONTEXT-AWARE FORMAT DETECTION CLASS
// ============================================================================

export class ContextualFormatDetector {
  // Configurable context detection rules - can be extended without hardcoding
  private static readonly CONTEXT_RULES: ContextualFormatRule[] = [
    // Financial/Business Documents
    {
      context: 'financial',
      preferredFormat: 'spacedTitle',
      confidence: 0.9,
      description: 'Financial documents work best with spaced title case for professional appearance'
    },
    {
      context: 'invoice',
      preferredFormat: 'spacedTitle', 
      confidence: 0.95,
      description: 'Invoices require professional spaced title formatting'
    },
    {
      context: 'receipt',
      preferredFormat: 'spacedTitle',
      confidence: 0.9,
      description: 'Receipts benefit from clear spaced title formatting'
    },
    
    // Code/Development Files
    {
      context: 'code',
      preferredFormat: 'camelCase',
      confidence: 0.9,
      description: 'Code files follow camelCase convention for consistency'
    },
    {
      context: 'script',
      preferredFormat: 'camelCase',
      confidence: 0.85,
      description: 'Script files typically use camelCase naming'
    },
    
    // Professional Documents
    {
      context: 'professional',
      preferredFormat: 'spacedTitle',
      confidence: 0.85,
      description: 'Professional documents use spaced title case for readability'
    },
    {
      context: 'report',
      preferredFormat: 'spacedTitle',
      confidence: 0.9,
      description: 'Reports require clear, professional spaced title formatting'
    },
    {
      context: 'resume',
      preferredFormat: 'spacedTitle',
      confidence: 0.95,
      description: 'Resumes need professional spaced title case presentation'
    },
    
    // Media/Creative Files
    {
      context: 'media',
      preferredFormat: 'hyphenated',
      confidence: 0.8,
      description: 'Media files work well with hyphenated lowercase format'
    },
    {
      context: 'image',
      preferredFormat: 'hyphenated',
      confidence: 0.8,
      description: 'Image files commonly use hyphenated naming'
    }
  ];

  // Configurable content pattern matchers - can be extended
  // Note: Using flexible patterns that work with filename conventions (underscores, hyphens, spaces)
  private static readonly CONTENT_PATTERNS = {
    financial: [
      /(^|[^a-zA-Z])(invoice|bill|receipt|payment|cost|price|total|amount|tax|fee)([^a-zA-Z]|$)/i,
      /\$[\d,]+\.?\d*/,
      /(^|[^a-zA-Z])(due|paid|balance|subtotal|grand.total)([^a-zA-Z]|$)/i
    ],
    invoice: [
      /(^|[^a-zA-Z])invoice([^a-zA-Z]|$)/i,
      /(invoice[\s_-]*#|inv[\s_-]*#|bill[\s_-]*#)/i,
      /(bill[\s_-]*to|invoice[\s_-]*to|customer)/i
    ],
    receipt: [
      /(^|[^a-zA-Z])(receipt|paid|transaction)([^a-zA-Z]|$)/i,
      /(receipt[\s_-]*#|trans[\s_-]*#)/i
    ],
    code: [
      /(^|[^a-zA-Z])(function|class|import|export|const|let|var)([^a-zA-Z]|$)/i,
      /(^|[^a-zA-Z])(component|service|util|helper|config)([^a-zA-Z]|$)/i,
      /[{}();]/
    ],
    script: [
      /(^|[^a-zA-Z])(script|automation|batch|run)([^a-zA-Z]|$)/i,
      /\.(js|ts|py|sh|bat|ps1)$/i
    ],
    professional: [
      /(^|[^a-zA-Z])(report|analysis|summary|proposal|contract|agreement)([^a-zA-Z]|$)/i,
      /(^|[^a-zA-Z])(executive|manager|director|department)([^a-zA-Z]|$)/i
    ],
    report: [
      /(^|[^a-zA-Z])(report|analysis|summary|findings|conclusion)([^a-zA-Z]|$)/i,
      /(^|[^a-zA-Z])(quarterly|annual|monthly|weekly)([^a-zA-Z]|$)/i
    ],
    resume: [
      /(^|[^a-zA-Z])(resume|cv|curriculum|experience|education|skills)([^a-zA-Z]|$)/i,
      /(work[\s_-]*experience|employment|qualifications)/i
    ],
    media: [
      /(^|[^a-zA-Z])(photo|image|picture|video|audio|media)([^a-zA-Z]|$)/i,
      /\.(jpg|jpeg|png|gif|mp4|mp3|wav|mov)$/i
    ],
    image: [
      /(^|[^a-zA-Z])(photo|image|picture|screenshot|diagram|photos)([^a-zA-Z]|$)/i,
      /\.(jpg|jpeg|png|gif|bmp|tiff|webp)$/i
    ]
  };

  // File extension context mapping - configurable
  private static readonly EXTENSION_CONTEXT_MAP: Record<string, string> = {
    // Code files
    '.js': 'code',
    '.ts': 'code', 
    '.jsx': 'code',
    '.tsx': 'code',
    '.py': 'code',
    '.java': 'code',
    '.cpp': 'code',
    '.c': 'code',
    '.cs': 'code',
    '.php': 'code',
    '.rb': 'code',
    '.go': 'code',
    '.rs': 'code',
    '.swift': 'code',
    '.kt': 'code',
    
    // Media files
    '.jpg': 'image',
    '.jpeg': 'image',
    '.png': 'image',
    '.gif': 'image',
    '.bmp': 'image',
    '.tiff': 'image',
    '.webp': 'image',
    '.mp4': 'media',
    '.mov': 'media',
    '.avi': 'media',
    '.mp3': 'media',
    '.wav': 'media',
    '.flac': 'media',
    
    // Documents (defaulting to professional)
    '.pdf': 'professional',
    '.doc': 'professional',
    '.docx': 'professional',
    '.txt': 'professional',
    '.rtf': 'professional'
  };

  /**
   * Detect the contextual format for a file based on multiple factors
   */
  static detectContextualFormat(
    suggestedName: string, 
    fileExtension: string, 
    aiCategory?: string,
    folderPath?: string
  ): ContextDetectionResult {
    const contexts: { context: string; confidence: number; evidence: string[]; detectedBy: string }[] = [];
    
    // 1. Content-based context detection (from filename and AI category) - HIGHER PRIORITY
    const contentToAnalyze = `${suggestedName} ${aiCategory || ''}`.toLowerCase();
    
    for (const [contextType, patterns] of Object.entries(this.CONTENT_PATTERNS)) {
      const matches = patterns.filter(pattern => pattern.test(contentToAnalyze));
      if (matches.length > 0) {
        // Give content-based detection higher confidence for specific matches
        const baseConfidence = 0.7 + (matches.length * 0.15);
        const confidence = Math.min(0.95, baseConfidence);
        contexts.push({
          context: contextType,
          confidence,
          evidence: [`Content matches: ${matches.length} patterns for "${contextType}"`],
          detectedBy: 'content'
        });
      }
    }

    // 2. Extension-based context detection - LOWER PRIORITY for generic contexts
    const extensionContext = this.EXTENSION_CONTEXT_MAP[fileExtension.toLowerCase()];
    if (extensionContext) {
      // Only add extension context if no high-confidence content context was found
      const hasHighConfidenceContentContext = contexts.some(c => c.confidence > 0.8);
      const extensionConfidence = hasHighConfidenceContentContext ? 0.6 : 0.75;
      
      contexts.push({
        context: extensionContext,
        confidence: extensionConfidence,
        evidence: [`File extension: ${fileExtension}`],
        detectedBy: 'extension'
      });
    }

    // 3. Folder-based context detection (if folder path provided)
    if (folderPath) {
      const folderName = path.basename(folderPath).toLowerCase();
      const folderContext = this.detectFolderContext(folderName);
      if (folderContext) {
        contexts.push({
          context: folderContext.context,
          confidence: folderContext.confidence,
          evidence: [`Folder name: ${folderName}`],
          detectedBy: 'folder'
        });
      }
    }

    // 4. Select the best context
    const bestContext = this.selectBestContext(contexts);
    
    // 5. Find the appropriate format rule
    const formatRule = this.CONTEXT_RULES.find(rule => rule.context === bestContext.type);
    
    if (formatRule) {
      const combinedConfidence = Math.min(0.95, (bestContext.confidence + formatRule.confidence) / 2);
      
      return {
        context: bestContext,
        suggestedFormat: NamingConventionDetector.CONVENTIONS[formatRule.preferredFormat],
        confidence: combinedConfidence,
        reasoning: `${formatRule.description} (detected: ${bestContext.detectedBy})`
      };
    }

    // Fallback to default
    return {
      context: {
        type: 'general',
        confidence: 0.3,
        evidence: ['No specific context detected'],
        detectedBy: 'fallback'
      },
      suggestedFormat: NamingConventionDetector.CONVENTIONS.hyphenated,
      confidence: 0.3,
      reasoning: 'Using default hyphenated format (no specific context detected)'
    };
  }

  /**
   * Detect context from folder name patterns
   */
  private static detectFolderContext(folderName: string): { context: string; confidence: number } | null {
    const folderPatterns = {
      financial: ['invoice', 'bill', 'receipt', 'payment', 'finance', 'accounting', 'tax'],
      code: ['src', 'source', 'lib', 'component', 'service', 'util', 'script', 'app', 'project'],
      professional: ['document', 'report', 'proposal', 'contract', 'business', 'work'],
      media: ['photo', 'image', 'video', 'audio', 'media', 'picture', 'gallery'],
      resume: ['resume', 'cv', 'career', 'job', 'application']
    };

    for (const [context, patterns] of Object.entries(folderPatterns)) {
      const matches = patterns.filter(pattern => folderName.includes(pattern));
      if (matches.length > 0) {
        return {
          context,
          confidence: Math.min(0.9, 0.7 + (matches.length * 0.1))
        };
      }
    }

    return null;
  }

  /**
   * Select the best context from multiple detected contexts
   */
  private static selectBestContext(contexts: { context: string; confidence: number; evidence: string[]; detectedBy: string }[]): FileContext {
    if (contexts.length === 0) {
      return {
        type: 'general',
        confidence: 0.3,
        evidence: ['No context detected'],
        detectedBy: 'fallback'
      };
    }

    // Sort by confidence and take the highest
    contexts.sort((a, b) => b.confidence - a.confidence);
    const best = contexts[0];

    // Combine evidence from all contexts with same type
    const sameTypeContexts = contexts.filter(c => c.context === best.context);
    const combinedEvidence = sameTypeContexts.flatMap(c => c.evidence);

    return {
      type: best.context,
      confidence: best.confidence,
      evidence: combinedEvidence,
      detectedBy: best.detectedBy
    };
  }

  /**
   * Add or update a context rule (for extensibility)
   */
  static addContextRule(rule: ContextualFormatRule): void {
    const existingIndex = this.CONTEXT_RULES.findIndex(r => r.context === rule.context);
    if (existingIndex >= 0) {
      this.CONTEXT_RULES[existingIndex] = rule;
    } else {
      this.CONTEXT_RULES.push(rule);
    }
  }

  /**
   * Get all available context rules (for configuration UI)
   */
  static getContextRules(): ContextualFormatRule[] {
    return [...this.CONTEXT_RULES];
  }
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
  
  // Context-Aware Detection Results
  contextDetection?: ContextDetectionResult;
  
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
      // STEP 1: Context-aware format detection
      const contextDetection = ContextualFormatDetector.detectContextualFormat(
        state.suggestedName,
        state.fileExtension,
        undefined, // AI category could be passed here in the future
        state.targetFolder
      );

      // STEP 2: Determine which convention to use (updated priority order)
      let chosenConvention: NamingConvention;
      let reasonForChoice: string;

      if (state.userPreferences) {
        chosenConvention = state.userPreferences;
        reasonForChoice = 'Using explicit user preference';
      } else if (contextDetection.confidence > 0.7) {
        chosenConvention = contextDetection.suggestedFormat;
        reasonForChoice = `Context-aware detection: ${contextDetection.reasoning}`;
      } else if (state.dominantPattern && state.dominantPattern.confidence > 0.7) {
        chosenConvention = state.dominantPattern.convention;
        reasonForChoice = `Following folder pattern (${state.dominantPattern.frequency} files, ${state.dominantPattern.confidence.toFixed(2)} confidence)`;
      } else if (state.globalPreference) {
        chosenConvention = state.globalPreference;
        reasonForChoice = 'Using global user preference';
      } else if (contextDetection.confidence > 0.3) {
        chosenConvention = contextDetection.suggestedFormat;
        reasonForChoice = `Low-confidence context detection: ${contextDetection.reasoning}`;
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
        contextDetection,
        formattedName,
        alternativeFormats: alternatives,
        processingStage: 'format_applied',
        reasoningSteps: [
          ...state.reasoningSteps || [],
          `Context detected: ${contextDetection.context.type} (${contextDetection.confidence.toFixed(2)} confidence)`,
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
        contextDetection: result.contextDetection,
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
  contextDetection?: ContextDetectionResult;
  processingTimeMs: number;
  reasoningSteps: string[];
  error?: string;
}

// Export singleton instance
export const formatDetectionWorkflow = new FormatDetectionWorkflow(); 