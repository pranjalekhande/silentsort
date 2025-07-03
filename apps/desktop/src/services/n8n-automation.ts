// ============================================================================
// N8N AUTOMATION SERVICE - FINANCE WORKFLOW INTEGRATION
// ============================================================================

export interface FinanceAutomationPayload {
  // File Information
  fileName: string;
  filePath: string;
  fileCategory: 'invoice' | 'receipt' | 'financial' | 'other';
  
  // Extracted Financial Data
  invoiceNumber?: string;
  amount?: string;
  vendor?: string;
  company?: string;
  dueDate?: string;
  invoiceDate?: string;
  
  // Additional Context
  confidence: number;
  contentSummary?: string;
  suggestedFolder?: string;
  
  // Processing Metadata
  processedAt: string;
  extractionSource: 'ai' | 'pattern_match' | 'hybrid';
}

export interface AutomationResult {
  success: boolean;
  workflowExecutionId?: string;
  triggeredWorkflows: string[];
  error?: string;
  executionTime: number;
  fallbackMode?: boolean;
}

export interface WorkflowConfig {
  enabled: boolean;
  webhookUrl: string;
  workflowName: string;
  description: string;
}

export interface N8NAutomationConfig {
  enabled: boolean;
  baseUrl: string;
  webhookKey?: string;
  timeout: number;
  retryAttempts: number;
  fallbackMode: boolean;
  workflows: {
    emailNotification: WorkflowConfig;
    calendarReminder: WorkflowConfig;
    driveBackup: WorkflowConfig;
    accountingIntegration: WorkflowConfig;
  };
}

export interface N8NServiceOptions {
  webhookUrl?: string;
  config?: Partial<N8NAutomationConfig>;
}

/**
 * N8N Automation Service for Finance Workflow Integration
 * 
 * Triggers external n8n workflows when financial documents are processed:
 * - Email notifications for new invoices
 * - Calendar reminders for payment due dates  
 * - Google Drive backup to organized folders
 * - Accounting software integration (future)
 */
export class N8NAutomationService {
  private config: N8NAutomationConfig;
  private isAvailable: boolean = false;
  private fallbackMode: boolean = false;
  
  constructor(options?: N8NServiceOptions) {
    const webhookUrl = options?.webhookUrl || process.env.N8N_WEBHOOK_URL;
    const hasValidWebhookUrl = this.hasValidWebhookUrl(webhookUrl);
    
    this.config = {
      enabled: true,
      baseUrl: webhookUrl || 'https://n8n.yourdomain.com/webhook',
      webhookKey: process.env.N8N_WEBHOOK_KEY,
      timeout: 30000, // 30 seconds
      retryAttempts: 2,
      fallbackMode: !hasValidWebhookUrl,
      workflows: {
        emailNotification: {
          enabled: true,
          webhookUrl: hasValidWebhookUrl ? 
            `${webhookUrl}/finance-email` : 
            'https://n8n.yourdomain.com/webhook/finance-email',
          workflowName: 'Finance Email Notifications',
          description: 'Send email alerts for new invoices and financial documents'
        },
        calendarReminder: {
          enabled: true,
          webhookUrl: hasValidWebhookUrl ? 
            `${webhookUrl}/finance-calendar` : 
            'https://n8n.yourdomain.com/webhook/finance-calendar',
          workflowName: 'Invoice Payment Reminders',
          description: 'Create calendar events for invoice due dates'
        },
        driveBackup: {
          enabled: false, // 🔴 DISABLED - Backup webhook not configured
          webhookUrl: hasValidWebhookUrl ? 
            `${webhookUrl}/finance-backup` : 
            'https://n8n.yourdomain.com/webhook/finance-backup',
          workflowName: 'Google Drive Finance Backup',
          description: 'Upload financial documents to organized Google Drive folders'
        },
        accountingIntegration: {
          enabled: false, // Future feature
          webhookUrl: hasValidWebhookUrl ? 
            `${webhookUrl}/finance-accounting` : 
            'https://n8n.yourdomain.com/webhook/finance-accounting',
          workflowName: 'Accounting Software Integration',
          description: 'Send invoice data to QuickBooks/Xero (coming soon)'
        }
      },
      ...options?.config
    };
    
    this.fallbackMode = this.config.fallbackMode || false;
    this.initializeService();
  }

  /**
   * Check if we have a valid webhook URL configured
   */
  private hasValidWebhookUrl(webhookUrl?: string): boolean {
    return !!(webhookUrl && 
              webhookUrl.trim() !== '' && 
              !webhookUrl.includes('yourdomain.com') && 
              !webhookUrl.includes('your-n8n-domain.com'));
  }

  /**
   * Initialize the automation service and check n8n availability
   */
  private async initializeService(): Promise<void> {
    if (!this.config.enabled) {
      console.log('📋 N8N Automation Service disabled in configuration');
      return;
    }

    if (this.fallbackMode) {
      console.log('🔄 N8N Automation Service running in FALLBACK MODE');
      this.isAvailable = false;
      return;
    }

    try {
      // Test n8n connectivity with a simple health check
      const healthCheck = await this.testConnection();
      this.isAvailable = healthCheck;
      
      if (this.isAvailable) {
        console.log('✅ N8N Automation Service initialized successfully');
        console.log('🔗 Connected to:', this.config.baseUrl);
        this.logEnabledWorkflows();
      } else {
        console.log('⚠️ N8N Automation Service initialized but connection failed');
        console.log('💡 Switching to fallback mode (logging only)');
        this.fallbackMode = true;
      }
    } catch (error) {
      console.error('❌ N8N Automation Service initialization failed:', error);
      console.log('💡 Switching to fallback mode (logging only)');
      this.isAvailable = false;
      this.fallbackMode = true;
    }
  }

  /**
   * Main entry point: Process financial document and trigger automations
   */
  async processFinancialDocument(payload: FinanceAutomationPayload): Promise<AutomationResult> {
    const startTime = Date.now();
    
    if (!this.config.enabled) {
      return {
        success: false,
        triggeredWorkflows: [],
        error: 'Automation service disabled',
        executionTime: Date.now() - startTime,
        fallbackMode: false
      };
    }

    console.log('💰 Processing financial document for automation:', payload.fileName);
    console.log('📊 Extracted data:', {
      category: payload.fileCategory,
      amount: payload.amount || 'N/A',
      vendor: payload.vendor || payload.company || 'N/A',
      invoiceNumber: payload.invoiceNumber || 'N/A',
      confidence: payload.confidence
    });

    if (this.fallbackMode) {
      console.log('🔄 Running in FALLBACK MODE - logging workflow triggers only');
    }

    const triggeredWorkflows: string[] = [];
    let hasErrors = false;
    let combinedError = '';

    // Only trigger workflows for financial categories
    if (!['invoice', 'receipt', 'financial'].includes(payload.fileCategory)) {
      console.log('⏭️ Skipping automation - not a financial document');
      return {
        success: true,
        triggeredWorkflows: [],
        executionTime: Date.now() - startTime,
        fallbackMode: this.fallbackMode
      };
    }

    // Parallel workflow execution for better performance
    const workflowPromises = [];

    // 1. Email Notification Workflow
    if (this.config.workflows.emailNotification.enabled) {
      workflowPromises.push(
        this.triggerEmailNotification(payload)
          .then(() => triggeredWorkflows.push('Email Notification'))
          .catch(error => {
            if (!this.fallbackMode) {
              hasErrors = true;
              combinedError += `Email: ${error.message}; `;
            }
          })
      );
    }

    // 2. Calendar Reminder Workflow (only for invoices with due dates)
    if (this.config.workflows.calendarReminder.enabled && payload.dueDate) {
      workflowPromises.push(
        this.triggerCalendarReminder(payload)
          .then(() => triggeredWorkflows.push('Calendar Reminder'))
          .catch(error => {
            if (!this.fallbackMode) {
              hasErrors = true;
              combinedError += `Calendar: ${error.message}; `;
            }
          })
      );
    }

    // 3. Google Drive Backup Workflow - DISABLED
    // 🔴 COMMENTED OUT - Backup webhook not configured
    // if (this.config.workflows.driveBackup.enabled) {
    //   workflowPromises.push(
    //     this.triggerDriveBackup(payload)
    //       .then(() => triggeredWorkflows.push('Drive Backup'))
    //       .catch(error => {
    //         if (!this.fallbackMode) {
    //           hasErrors = true;
    //           combinedError += `Drive: ${error.message}; `;
    //         }
    //       })
    //   );
    // }

    // Wait for all workflows to complete
    await Promise.allSettled(workflowPromises);

    const executionTime = Date.now() - startTime;
    
    if (this.fallbackMode) {
      console.log(`🔄 Fallback mode automation completed in ${executionTime}ms:`, {
        wouldTrigger: triggeredWorkflows.length > 0 ? triggeredWorkflows : ['Email Notification', 'Drive Backup'],
        fallbackMode: true
      });
    } else {
      console.log(`🎯 Automation completed in ${executionTime}ms:`, {
        triggered: triggeredWorkflows,
        hasErrors,
        error: combinedError || undefined
      });
    }

    return {
      success: this.fallbackMode || (!hasErrors || triggeredWorkflows.length > 0),
      triggeredWorkflows,
      error: this.fallbackMode ? undefined : (hasErrors ? combinedError.trim() : undefined),
      executionTime,
      fallbackMode: this.fallbackMode
    };
  }

  /**
   * Trigger email notification workflow
   */
  private async triggerEmailNotification(payload: FinanceAutomationPayload): Promise<void> {
    const webhookData = {
      trigger: 'new_financial_document',
      document: {
        name: payload.fileName,
        category: payload.fileCategory,
        amount: payload.amount,
        vendor: payload.vendor || payload.company,
        invoiceNumber: payload.invoiceNumber,
        dueDate: payload.dueDate,
        confidence: payload.confidence
      },
      email: {
        subject: `New ${payload.fileCategory}: ${payload.vendor || payload.company || 'Unknown'} ${payload.amount || ''}`,
        body: this.generateEmailBody(payload),
        priority: this.getEmailPriority(payload)
      },
      metadata: {
        processedAt: payload.processedAt,
        extractionSource: payload.extractionSource
      }
    };

    await this.sendWebhookRequest(
      this.config.workflows.emailNotification.webhookUrl,
      webhookData,
      'Email Notification'
    );
  }

  /**
   * Trigger calendar reminder workflow
   */
  private async triggerCalendarReminder(payload: FinanceAutomationPayload): Promise<void> {
    if (!payload.dueDate) {
      throw new Error('Due date required for calendar reminder');
    }

    const webhookData = {
      trigger: 'create_payment_reminder',
      event: {
        title: `Payment Due: ${payload.vendor || payload.company || 'Invoice'} ${payload.amount || ''}`,
        description: this.generateCalendarDescription(payload),
        dueDate: payload.dueDate,
        reminderMinutes: [1440, 480, 60], // 1 day, 8 hours, 1 hour before
        category: 'finance'
      },
      document: {
        name: payload.fileName,
        path: payload.filePath,
        invoiceNumber: payload.invoiceNumber
      }
    };

    await this.sendWebhookRequest(
      this.config.workflows.calendarReminder.webhookUrl,
      webhookData,
      'Calendar Reminder'
    );
  }

  /**
   * Trigger Google Drive backup workflow - DISABLED
   * 🔴 COMMENTED OUT - Backup webhook not configured
   */
  private async triggerDriveBackup(payload: FinanceAutomationPayload): Promise<void> {
    // 🔴 DISABLED - Backup webhook returns 404 error
    console.log('📋 Drive backup disabled - webhook not configured');
    return;
    
    /* COMMENTED OUT - Backup webhook not working
    const backupFolder = this.generateDriveFolderPath(payload);
    
    const webhookData = {
      trigger: 'backup_financial_document',
      file: {
        localPath: payload.filePath,
        fileName: payload.fileName,
        category: payload.fileCategory
      },
      drive: {
        targetFolder: backupFolder,
        createFolderStructure: true,
        keepOriginalName: false, // Use SilentSort's improved name
        newFileName: payload.fileName.split('/').pop() || payload.fileName
      },
      metadata: {
        invoiceNumber: payload.invoiceNumber,
        vendor: payload.vendor || payload.company,
        amount: payload.amount,
        processedDate: payload.processedAt
      }
    };

    await this.sendWebhookRequest(
      this.config.workflows.driveBackup.webhookUrl,
      webhookData,
      'Drive Backup'
    );
    */
  }

  /**
   * Send HTTP request to n8n webhook
   */
  private async sendWebhookRequest(webhookUrl: string, data: any, workflowName: string): Promise<void> {
    if (this.fallbackMode) {
      // Enhanced fallback mode logging
      console.log(`📋 [FALLBACK] ${workflowName} would be triggered`);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.webhookKey && { 'Authorization': `Bearer ${this.config.webhookKey}` })
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error response');
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      console.log(`✅ ${workflowName} webhook triggered successfully`);
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`⏰ ${workflowName} webhook timed out after ${this.config.timeout}ms`);
        throw new Error(`${workflowName} timed out after ${this.config.timeout}ms`);
      }
      
      console.error(`❌ ${workflowName} webhook failed:`, error);
      throw error;
    }
  }

  /**
   * Test n8n connection
   */
  private async testConnection(): Promise<boolean> {
    try {
      // Try to reach the base webhook URL with a simple ping
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const testUrl = `${this.config.baseUrl}/health`;
      const response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        return true;
      } else {
        // Even if health check fails, we'll still try to send webhooks
        return true;
      }
    } catch (error) {
      console.log('❌ n8n webhook connectivity test failed:', error);
      console.log('📋 Running in FALLBACK mode - webhooks will be logged only');
      
      // Connection failed - service will run in fallback mode
      return false;
    }
  }

  /**
   * Generate email body for notification
   */
  private generateEmailBody(payload: FinanceAutomationPayload): string {
    return `
A new ${payload.fileCategory} has been processed by SilentSort:

📄 File: ${payload.fileName}
${payload.vendor || payload.company ? `🏢 Vendor: ${payload.vendor || payload.company}` : ''}
${payload.amount ? `💰 Amount: ${payload.amount}` : ''}
${payload.invoiceNumber ? `📋 Invoice #: ${payload.invoiceNumber}` : ''}
${payload.dueDate ? `📅 Due Date: ${payload.dueDate}` : ''}

📁 Suggested Location: ${payload.suggestedFolder || 'Not specified'}
🎯 AI Confidence: ${Math.round(payload.confidence * 100)}%

${payload.contentSummary ? `📝 Summary: ${payload.contentSummary}` : ''}

Processed automatically by SilentSort at ${payload.processedAt}
    `.trim();
  }

  /**
   * Generate calendar event description
   */
  private generateCalendarDescription(payload: FinanceAutomationPayload): string {
    return `Payment reminder for ${payload.fileCategory}

${payload.vendor || payload.company ? `Vendor: ${payload.vendor || payload.company}` : ''}
${payload.amount ? `Amount: ${payload.amount}` : ''}
${payload.invoiceNumber ? `Invoice: ${payload.invoiceNumber}` : ''}

File: ${payload.fileName}
Processed by SilentSort`;
  }

  /**
   * Generate Google Drive folder path
   */
  private generateDriveFolderPath(payload: FinanceAutomationPayload): string {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    
    const basePath = 'SilentSort/Finance';
    
    switch (payload.fileCategory) {
      case 'invoice':
        return `${basePath}/Invoices/${currentYear}/${currentMonth}`;
      case 'receipt':
        return `${basePath}/Receipts/${currentYear}/${currentMonth}`;
      default:
        return `${basePath}/Other/${currentYear}/${currentMonth}`;
    }
  }

  /**
   * Determine email priority based on document properties
   */
  private getEmailPriority(payload: FinanceAutomationPayload): 'high' | 'normal' | 'low' {
    // High priority for large amounts or urgent due dates
    if (payload.amount && parseFloat(payload.amount.replace(/[^0-9.]/g, '')) > 1000) {
      return 'high';
    }
    
    if (payload.dueDate) {
      const dueDate = new Date(payload.dueDate);
      const now = new Date();
      const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilDue < 7) { // Due within a week
        return 'high';
      }
    }
    
    return 'normal';
  }

  /**
   * Log enabled workflows on startup
   */
  private logEnabledWorkflows(): void {
    const enabledWorkflows = Object.entries(this.config.workflows)
      .filter(([_, config]) => config.enabled)
      .map(([name, config]) => `${name} (${config.workflowName})`);
    
    if (enabledWorkflows.length > 0) {
      console.log('🔧 Enabled automations:', enabledWorkflows.join(', '));
    } else {
      console.log('⚠️ No automation workflows enabled');
    }
  }

  /**
   * Get service status for frontend
   */
  getStatus(): { available: boolean; enabled: boolean; workflows: Record<string, boolean> } {
    return {
      available: this.isAvailable,
      enabled: this.config.enabled,
      workflows: Object.fromEntries(
        Object.entries(this.config.workflows).map(([key, config]) => [key, config.enabled])
      )
    };
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<N8NAutomationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeService();
  }
}

// Export singleton instance
export const n8nAutomationService = new N8NAutomationService(); 