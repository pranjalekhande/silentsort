import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { formatDetectionWorkflow, FormatDetectionResult } from './format-detection-workflow';

// Load environment variables
require('dotenv').config();

export interface ExtractedEntities {
  budget?: string;
  team_size?: string;
  deadline?: string;
  technology: string[];
  company?: string;
  invoice_number?: string;
  amount?: string;
}

export interface FileAnalysisResult {
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
}

export interface FileMetadata {
  originalName: string;
  filePath: string;
  fileSize: number;
  fileExtension: string;
  content?: string;
}

// LangGraph workflow state interfaces
interface FileProcessingState {
  filePath: string;
  originalName: string;
  fileExtension: string;
  fileSize: number;
  extractedContent?: string;
  contentAnalysis?: ContentAnalysis;
  nameGeneration?: NameGenerationResult;
  confidenceScore?: number;
  finalResult?: FileAnalysisResult;
  error?: string;
}

interface ContentAnalysis {
  fileType: string;
  contentSummary: string;
  keyTopics: string[];
  documentType: 'invoice' | 'resume' | 'screenshot' | 'document' | 'code' | 'data' | 'image' | 'other';
  businessContext?: string;
}

interface NameGenerationResult {
  suggestedName: string;
  alternativeNames: string[];
  reasoning: string;
  category: string;
}

// Zod schemas for structured outputs - temporarily disabled
// const ContentAnalysisSchema = z.object({
//   fileType: z.string(),
//   contentSummary: z.string(),
//   keyTopics: z.array(z.string()),
//   documentType: z.enum(['invoice', 'resume', 'screenshot', 'document', 'code', 'data', 'image', 'other']),
//   businessContext: z.string().optional(),
// });

// const NameGenerationSchema = z.object({
//   suggestedName: z.string(),
//   alternativeNames: z.array(z.string()),
//   reasoning: z.string(),
//   category: z.string(),
// });

class AIService {
  private openai: OpenAI | null = null;
  private isConfigured: boolean = false;
  private usePythonService: boolean = true; // Use Enhanced Python service
  private pythonServiceUrl: string = 'http://127.0.0.1:8002';

  constructor() {
    this.initializeOpenAI();
  }

  private initializeOpenAI(): void {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      console.error('OpenAI API key not configured');
      this.isConfigured = false;
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
      this.isConfigured = true;
      console.log('OpenAI service initialized successfully');
    } catch (error) {
      console.error(' Failed to initialize OpenAI:', error);
      this.isConfigured = false;
    }
  }

  // private initializeLangGraph(): void {
  //   const apiKey = process.env.OPENAI_API_KEY;

  //   if (!apiKey || apiKey === 'your_openai_api_key_here') {
  //     console.log('LangGraph workflow disabled - OpenAI API key not configured');
  //     this.useLangGraph = false;
  //     return;
  //   }

  //   try {
  //     // Initialize LangChain LLM
  //     this.langchainLLM = new ChatOpenAI({
  //       modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  //       temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
  //       maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000'),
  //       openAIApiKey: apiKey,
  //     });

  //     // Build the workflow
  //     this.workflow = this.buildWorkflow();
  //     console.log('✅ LangGraph workflow initialized successfully');
  //   } catch (error) {
  //     console.error('❌ Failed to initialize LangGraph workflow:', error);
  //     this.useLangGraph = false;
  //   }
  // }

  // private buildWorkflow(): any {
  //   // Simplified workflow setup for now - will enhance incrementally  
  //   console.log('🏗️ LangGraph workflow structure initialized');
  //   return new StateGraph({});
  // }

  async analyzeFile(filePath: string): Promise<FileAnalysisResult> {
    try {
      console.log(`🚀 Analyzing file with AI: ${path.basename(filePath)}`);
      
      let aiResult: FileAnalysisResult;
      
      // Try Python LangGraph service first
      if (this.usePythonService) {
        const result = await this.analyzeFileWithPythonService(filePath);
        if (result) {
          console.log('✅ Python LangGraph analysis completed:', {
            original: path.basename(filePath),
            suggested: result.suggestedName,
            confidence: result.confidence,
            category: result.category,
          });
          aiResult = result;
        } else {
          // Fallback to direct OpenAI if Python service unavailable
          if (this.isConfigured) {
            console.log('⚠️ Falling back to direct OpenAI analysis...');
            const metadata = await this.extractFileMetadata(filePath);
            aiResult = await this.performContentAnalysis(metadata);
          } else {
            // If nothing works, return basic result
            aiResult = {
              suggestedName: path.basename(filePath),
              confidence: 0,
              category: 'unknown',
              reasoning: 'AI service not available',
              error: 'No AI service configured',
            };
          }
        }
      } else {
        // Direct OpenAI path
        if (this.isConfigured) {
          const metadata = await this.extractFileMetadata(filePath);
          aiResult = await this.performContentAnalysis(metadata);
        } else {
          aiResult = {
            suggestedName: path.basename(filePath),
            confidence: 0,
            category: 'unknown',
            reasoning: 'AI service not available',
            error: 'No AI service configured',
          };
        }
      }
      
      // 🎯 Apply Smart Format Detection & Application
      console.log('🎨 Applying format detection workflow...');
      const formatResult = await this.applyFormatDetection(filePath, aiResult);
      
      return formatResult;
      
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      return {
        suggestedName: path.basename(filePath),
        confidence: 0,
        category: 'error',
        reasoning: 'Analysis failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async analyzeFileWithPythonService(filePath: string): Promise<FileAnalysisResult | null> {
    try {
      // Check if Python service is available with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const healthCheck = await fetch(`${this.pythonServiceUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!healthCheck.ok) {
        console.warn('⚠️ Python service not available, using fallback');
        return null;
      }
      
      // Extract file metadata
      const metadata = await this.extractFileMetadata(filePath);
      
      // Call Python service
      const response = await fetch(`${this.pythonServiceUrl}/analyze-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath,
          original_name: metadata.originalName,
          file_size: metadata.fileSize,
          file_extension: metadata.fileExtension,
          content_preview: metadata.content || null,
        }),
      });
      
      if (!response.ok) {
        console.warn('⚠️ Python service error:', response.statusText);
        return null;
      }
      
      const result = await response.json();
      
      // Convert Enhanced Python service response to our format
      return {
        suggestedName: result.suggested_name,
        confidence: result.confidence,
        category: result.category,
        subcategory: result.subcategory,
        reasoning: result.reasoning,
        alternatives: result.alternatives || [],
        contentSummary: result.content_summary,
        technical_tags: result.technical_tags || [],
        extracted_entities: result.extracted_entities || { technology: [] },
        processing_time_ms: result.processing_time_ms,
      };
      
    } catch (error) {
      console.warn('⚠️ Python service connection failed:', error);
      return null;
    }
  }

  private async extractFileMetadata(filePath: string): Promise<FileMetadata> {
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();

    let content = '';

    // Extract content based on file type
    if (this.isTextFile(fileExtension)) {
      try {
        // Read first 2000 characters to avoid huge files
        const buffer = fs.readFileSync(filePath);
        content = buffer.toString('utf8').substring(0, 2000);
      } catch (error) {
        console.warn('⚠️  Could not read file content:', error);
        content = '';
      }
    }

    return {
      originalName: fileName,
      filePath,
      fileSize: stats.size,
      fileExtension,
      content,
    };
  }

  private isTextFile(extension: string): boolean {
    const textExtensions = [
      '.txt',
      '.md',
      '.json',
      '.csv',
      '.log',
      '.py',
      '.js',
      '.ts',
      '.html',
      '.css',
    ];
    return textExtensions.includes(extension);
  }

  private async performContentAnalysis(
    metadata: FileMetadata
  ): Promise<FileAnalysisResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const prompt = this.buildAnalysisPrompt(metadata);

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return this.parseAIResponse(response, metadata.originalName);
    } catch (error) {
      console.error('❌ OpenAI API call failed:', error);
      throw error;
    }
  }

  private buildAnalysisPrompt(metadata: FileMetadata): string {
    const { originalName, fileExtension, fileSize, content } = metadata;

    return `You are a smart file organizer. Analyze this file and suggest a better, descriptive filename.

File Information:
- Current name: ${originalName}
- File type: ${fileExtension}
- File size: ${fileSize} bytes
- Content preview: ${content ? content.substring(0, 500) : 'No content available'}

Requirements:
1. Suggest a clear, descriptive filename (keep the original extension)
2. Use only alphanumeric characters, hyphens, and underscores
3. Keep filename under 100 characters
4. Categorize the file (document, image, code, data, etc.)
5. Provide confidence score (0.0-1.0)
6. Explain your reasoning

Respond in this exact JSON format:
{
  "suggestedName": "descriptive-filename${fileExtension}",
  "confidence": 0.85,
  "category": "document",
  "reasoning": "Brief explanation of why this name was chosen"
}

Only respond with valid JSON, no additional text.`;
  }

  private parseAIResponse(
    response: string,
    fallbackName: string
  ): FileAnalysisResult {
    try {
      const parsed = JSON.parse(response.trim());

      return {
        suggestedName: parsed.suggestedName || fallbackName,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        category: parsed.category || 'unknown',
        reasoning: parsed.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      return {
        suggestedName: fallbackName,
        confidence: 0,
        category: 'error',
        reasoning: 'Failed to parse AI response',
        error: 'Invalid JSON response from AI',
      };
    }
  }

  // 🎯 Smart Format Detection Integration
  private async applyFormatDetection(filePath: string, aiResult: FileAnalysisResult): Promise<FileAnalysisResult> {
    try {
      const targetFolder = path.dirname(filePath);
      const originalFileName = path.basename(filePath);
      
      // Run the LangGraph format detection workflow
      const formatResult = await formatDetectionWorkflow.processFile({
        suggestedName: aiResult.suggestedName,
        targetFolder,
        originalFileName
      });
      
      if (formatResult.success) {
        console.log('✅ Format detection completed:', {
          original: aiResult.suggestedName,
          formatted: formatResult.finalName,
          pattern: formatResult.dominantPattern?.convention.type,
          confidence: formatResult.confidence
        });
        
        // Enhance the AI result with format detection insights
        return {
          ...aiResult,
          suggestedName: formatResult.finalName,
          alternatives: [
            ...(aiResult.alternatives || []),
            ...formatResult.alternativeFormats
          ].slice(0, 5), // Keep top 5 alternatives
          confidence: Math.min(aiResult.confidence, formatResult.confidence), // Use lower confidence
          reasoning: `${aiResult.reasoning} | Format: Applied ${formatResult.dominantPattern?.convention.type || 'default'} naming convention based on folder analysis.`,
          processing_time_ms: (aiResult.processing_time_ms || 0) + formatResult.processingTimeMs
        };
      } else {
        console.warn('⚠️ Format detection failed, using original result:', formatResult.error);
        return aiResult;
      }
      
    } catch (error) {
      console.error('❌ Format detection workflow failed:', error);
      // Return original AI result if format detection fails
      return aiResult;
    }
  }

  // Test method to verify AI service is working
  async testConnection(): Promise<{ success: boolean; message: string }> {
    // Try Python service first
    if (this.usePythonService) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${this.pythonServiceUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const health = await response.json();
          return {
            success: true,
            message: `Python LangGraph service is working! OpenAI configured: ${health.openai_configured}`,
          };
        }
      } catch (error) {
        console.warn('Python service test failed:', error);
      }
    }
    
    // Fallback to OpenAI test
    if (!this.isConfigured || !this.openai) {
      return {
        success: false,
        message: 'Neither Python service nor OpenAI API key configured',
      };
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content:
              'Respond with exactly: "SilentSort AI service is working!"',
          },
        ],
        max_tokens: 50,
        temperature: 0,
      });

      const response = completion.choices[0]?.message?.content;

      return {
        success: true,
        message: `Direct OpenAI: ${response || 'Connection successful but no response'}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
