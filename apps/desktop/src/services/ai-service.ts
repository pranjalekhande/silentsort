import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config();

export interface FileAnalysisResult {
  suggestedName: string;
  confidence: number;
  category: string;
  reasoning: string;
  error?: string;
}

export interface FileMetadata {
  originalName: string;
  filePath: string;
  fileSize: number;
  fileExtension: string;
  content?: string;
}

class AIService {
  private openai: OpenAI | null = null;
  private isConfigured: boolean = false;

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

  async analyzeFile(filePath: string): Promise<FileAnalysisResult> {
    if (!this.isConfigured) {
      return {
        suggestedName: path.basename(filePath),
        confidence: 0,
        category: 'unknown',
        reasoning: 'AI service not configured',
        error: 'OpenAI API key not configured'
      };
    }

    try {
      const metadata = await this.extractFileMetadata(filePath);
      const analysis = await this.performContentAnalysis(metadata);
      
      console.log('AI Analysis completed:', {
        original: metadata.originalName,
        suggested: analysis.suggestedName,
        confidence: analysis.confidence
      });

      return analysis;
    } catch (error) {
      console.error('AI analysis failed:', error);
      return {
        suggestedName: path.basename(filePath),
        confidence: 0,
        category: 'error',
        reasoning: 'Analysis failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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
      content
    };
  }

  private isTextFile(extension: string): boolean {
    const textExtensions = ['.txt', '.md', '.json', '.csv', '.log', '.py', '.js', '.ts', '.html', '.css'];
    return textExtensions.includes(extension);
  }

  private async performContentAnalysis(metadata: FileMetadata): Promise<FileAnalysisResult> {
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

  private parseAIResponse(response: string, fallbackName: string): FileAnalysisResult {
    try {
      const parsed = JSON.parse(response.trim());
      
      return {
        suggestedName: parsed.suggestedName || fallbackName,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0)),
        category: parsed.category || 'unknown',
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      return {
        suggestedName: fallbackName,
        confidence: 0,
        category: 'error',
        reasoning: 'Failed to parse AI response',
        error: 'Invalid JSON response from AI'
      };
    }
  }

  // Test method to verify AI service is working
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured || !this.openai) {
      return {
        success: false,
        message: 'OpenAI API key not configured'
      };
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Respond with exactly: "SilentSort AI service is working!"' }],
        max_tokens: 50,
        temperature: 0,
      });

      const response = completion.choices[0]?.message?.content;
      
      return {
        success: true,
        message: response || 'Connection successful but no response'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const aiService = new AIService(); 