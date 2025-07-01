# SilentSort Robustness Implementation Guide
## Safe File Operations + Error Recovery + Memory System

This document provides **step-by-step implementation** for making SilentSort bulletproof and fault-tolerant.

---

## 🛡️ **PHASE 1: SAFE FILE OPERATIONS**

### **1.1: Transaction-Based File Manager**

```typescript
// apps/desktop/src/services/safe-file-manager.ts

interface FileOperation {
  id: string;
  type: 'rename' | 'move' | 'copy' | 'delete';
  source: string;
  destination?: string;
  timestamp: Date;
  rollbackData: any;
}

interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  operationId: string;
}

class SafeFileManager {
  private operations: Map<string, FileOperation> = new Map();
  private checkpoints: Map<string, FileSystemCheckpoint> = new Map();

  async executeWithRollback<T>(
    operation: FileOperation
  ): Promise<OperationResult<T>> {
    const operationId = this.generateOperationId();
    
    try {
      // 1. Pre-flight checks
      await this.preFlightCheck(operation);
      
      // 2. Create checkpoint
      const checkpoint = await this.createCheckpoint(operation);
      this.checkpoints.set(operationId, checkpoint);
      
      // 3. Execute operation
      const result = await this.performOperation(operation);
      
      // 4. Log success
      await this.logOperation(operation, 'success');
      
      // 5. Clean up checkpoint after delay (for potential undo)
      setTimeout(() => this.cleanupCheckpoint(operationId), 300000); // 5 min
      
      return {
        success: true,
        data: result,
        operationId
      };
      
    } catch (error) {
      // Rollback on any failure
      await this.rollbackOperation(operationId);
      await this.logOperation(operation, 'failed', error.message);
      
      return {
        success: false,
        error: error.message,
        operationId
      };
    }
  }

  private async preFlightCheck(operation: FileOperation): Promise<void> {
    // Check file permissions
    const hasPermission = await this.checkPermissions(operation.source);
    if (!hasPermission) {
      throw new Error(`No permission to access: ${operation.source}`);
    }

    // Check file is not locked
    const isLocked = await this.checkFileLock(operation.source);
    if (isLocked) {
      throw new Error(`File is locked: ${operation.source}`);
    }

    // Check disk space (if moving/copying)
    if (operation.destination) {
      const hasSpace = await this.checkDiskSpace(operation);
      if (!hasSpace) {
        throw new Error('Insufficient disk space');
      }
    }

    // Check destination doesn't exist (if renaming)
    if (operation.type === 'rename' && operation.destination) {
      const exists = await fs.pathExists(operation.destination);
      if (exists) {
        throw new Error(`Destination already exists: ${operation.destination}`);
      }
    }
  }

  private async createCheckpoint(operation: FileOperation): Promise<FileSystemCheckpoint> {
    const stats = await fs.stat(operation.source);
    
    return {
      id: this.generateOperationId(),
      originalPath: operation.source,
      originalStats: stats,
      backupPath: null, // For critical operations, create actual backup
      timestamp: new Date()
    };
  }

  async undoLastOperation(): Promise<boolean> {
    const lastOperation = await this.getLastOperation();
    if (!lastOperation) return false;

    const checkpoint = this.checkpoints.get(lastOperation.id);
    if (!checkpoint) return false;

    return await this.rollbackOperation(lastOperation.id);
  }
}
```

### **1.2: Processing Queue System**

```typescript
// apps/desktop/src/services/processing-queue.ts

interface QueueItem {
  id: string;
  filePath: string;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  addedAt: Date;
  processingStarted?: Date;
}

class ProcessingQueue {
  private queue: QueueItem[] = [];
  private processing: Map<string, QueueItem> = new Map();
  private readonly maxConcurrent = 3;
  private readonly maxRetries = 3;
  private isRunning = false;

  async addFile(filePath: string, priority: 'high' | 'normal' | 'low' = 'normal'): Promise<void> {
    // Check if already in queue or processing
    if (this.isFileQueued(filePath) || this.isFileProcessing(filePath)) {
      console.log(`File already queued: ${path.basename(filePath)}`);
      return;
    }

    // Check if recently processed (use cache)
    const recentlyProcessed = await this.checkProcessingCache(filePath);
    if (recentlyProcessed) {
      console.log(`⏭️ Skipping recently processed file: ${path.basename(filePath)}`);
      return;
    }

    const item: QueueItem = {
      id: this.generateId(),
      filePath,
      priority,
      retryCount: 0,
      addedAt: new Date()
    };

    this.queue.push(item);
    this.sortQueueByPriority();
    
    console.log(`📥 Added to queue: ${path.basename(filePath)} (${this.queue.length} in queue)`);
    
    if (!this.isRunning) {
      this.startProcessing();
    }
  }

  private async startProcessing(): Promise<void> {
    this.isRunning = true;
    
    while (this.queue.length > 0 || this.processing.size > 0) {
      // Start new items if under concurrent limit
      while (this.processing.size < this.maxConcurrent && this.queue.length > 0) {
        const item = this.queue.shift()!;
        this.processing.set(item.id, item);
        this.processItem(item); // Don't await - let it run concurrently
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.isRunning = false;
    console.log('✅ Processing queue empty');
  }

  private async processItem(item: QueueItem): Promise<void> {
    try {
      item.processingStarted = new Date();
      console.log(`🔄 Processing: ${path.basename(item.filePath)}`);
      
      // Process the file
      const result = await aiService.analyzeFile(item.filePath);
      
      if (result.suggestedName !== path.basename(item.filePath)) {
        // Apply the rename suggestion
        await this.applyRenameSuggestion(item.filePath, result);
      }
      
      // Log successful processing
      await this.logProcessingSuccess(item, result);
      
    } catch (error) {
      console.error(`❌ Error processing ${item.filePath}:`, error.message);
      
      // Retry logic
      if (item.retryCount < this.maxRetries) {
        item.retryCount++;
        console.log(`🔄 Retrying (${item.retryCount}/${this.maxRetries}): ${path.basename(item.filePath)}`);
        
        // Add back to queue with delay
        setTimeout(() => {
          this.queue.unshift(item); // Add to front for priority
        }, Math.pow(2, item.retryCount) * 1000); // Exponential backoff
      } else {
        console.error(`💀 Max retries exceeded for: ${path.basename(item.filePath)}`);
        await this.logProcessingFailure(item, error.message);
      }
    } finally {
      // Remove from processing
      this.processing.delete(item.id);
    }
  }
}
```

---

## 🧠 **PHASE 2: PROCESSING MEMORY SYSTEM**

### **2.1: SQLite Memory Database Schema**

```sql
-- apps/desktop/src/database/schema.sql

CREATE TABLE IF NOT EXISTS processing_memory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_hash TEXT UNIQUE NOT NULL,
  file_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  suggested_name TEXT,
  confidence REAL,
  reasoning TEXT,
  alternatives TEXT, -- JSON array
  content_summary TEXT,
  project_context TEXT,
  user_action TEXT CHECK(user_action IN ('pending', 'accepted', 'rejected', 'modified')),
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS operation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_id TEXT UNIQUE NOT NULL,
  operation_type TEXT NOT NULL,
  source_path TEXT NOT NULL,
  destination_path TEXT,
  status TEXT CHECK(status IN ('success', 'failed', 'rolled_back')),
  error_message TEXT,
  rollback_data TEXT, -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_hash ON processing_memory(file_hash);
CREATE INDEX idx_processed_at ON processing_memory(processed_at);
```

### **2.2: Memory Service Implementation**

```typescript
// apps/desktop/src/services/memory-service.ts

import sqlite3 from 'sqlite3';
import { Database, open } from 'sqlite';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';

interface ProcessingMemoryEntry {
  id?: number;
  fileHash: string;
  filePath: string;
  originalName: string;
  suggestedName?: string;
  confidence?: number;
  reasoning?: string;
  alternatives?: string[];
  contentSummary?: string;
  projectContext?: string;
  userAction: 'pending' | 'accepted' | 'rejected' | 'modified';
  processedAt: Date;
  updatedAt: Date;
}

class MemoryService {
  private db: Database | null = null;
  private readonly dbPath = path.join(app.getPath('userData'), 'silentsort-memory.db');

  async initialize(): Promise<void> {
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    // Initialize schema
    await this.db.exec(await fs.readFile('src/database/schema.sql', 'utf8'));
    
    console.log('✅ Memory database initialized');
  }

  async calculateFileHash(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  async shouldProcessFile(filePath: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const fileHash = await this.calculateFileHash(filePath);
    const existing = await this.db.get(
      'SELECT * FROM processing_memory WHERE file_hash = ? ORDER BY processed_at DESC LIMIT 1',
      [fileHash]
    );

    if (!existing) return true;

    // Don't reprocess if recently handled (within 24 hours)
    const lastProcessed = new Date(existing.processed_at);
    const hoursSinceProcessed = (Date.now() - lastProcessed.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceProcessed < 24) {
      console.log(`⏭️ Skipping recently processed file: ${path.basename(filePath)} (${hoursSinceProcessed.toFixed(1)}h ago)`);
      return false;
    }

    return true;
  }

  async recordProcessing(
    filePath: string,
    aiResult: any,
    userAction: 'pending' | 'accepted' | 'rejected' | 'modified' = 'pending'
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fileHash = await this.calculateFileHash(filePath);
    
    await this.db.run(`
      INSERT OR REPLACE INTO processing_memory (
        file_hash, file_path, original_name, suggested_name, confidence,
        reasoning, alternatives, content_summary, user_action, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      fileHash,
      filePath,
      path.basename(filePath),
      aiResult.suggestedName,
      aiResult.confidence,
      aiResult.reasoning,
      JSON.stringify(aiResult.alternatives || []),
      aiResult.contentSummary,
      userAction
    ]);
  }

  async getProcessingHistory(limit: number = 50): Promise<ProcessingMemoryEntry[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = await this.db.all(`
      SELECT * FROM processing_memory 
      ORDER BY processed_at DESC 
      LIMIT ?
    `, [limit]);

    return rows.map(row => ({
      ...row,
      alternatives: JSON.parse(row.alternatives || '[]'),
      processedAt: new Date(row.processed_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async updateUserAction(fileHash: string, action: 'accepted' | 'rejected' | 'modified'): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(`
      UPDATE processing_memory 
      SET user_action = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE file_hash = ?
    `, [action, fileHash]);
  }
}
```

---

## 📊 **PHASE 3: HEALTH MONITORING**

### **3.1: System Health Monitor**

```typescript
// apps/desktop/src/services/health-monitor.ts

interface SystemHealth {
  aiServiceUptime: number;
  processingQueueSize: number;
  memoryUsage: number;
  diskSpace: number;
  errorRate: number;
  lastBackup: Date | null;
  processingSuccessRate: number;
  averageProcessingTime: number;
}

class HealthMonitor {
  private metrics: Map<string, number[]> = new Map();
  private readonly maxMetricHistory = 100;

  async checkSystemHealth(): Promise<SystemHealth> {
    const health: SystemHealth = {
      aiServiceUptime: await this.checkAIServiceUptime(),
      processingQueueSize: processingQueue.getQueueSize(),
      memoryUsage: await this.getMemoryUsage(),
      diskSpace: await this.getDiskSpace(),
      errorRate: this.calculateErrorRate(),
      lastBackup: await this.getLastBackupTime(),
      processingSuccessRate: this.calculateSuccessRate(),
      averageProcessingTime: this.calculateAverageProcessingTime()
    };

    // Record metrics
    await this.recordMetrics(health);
    
    // Check for alerts
    await this.checkAlerts(health);

    return health;
  }

  private async checkAIServiceUptime(): Promise<number> {
    try {
      const startTime = Date.now();
      const result = await aiService.testConnection();
      const responseTime = Date.now() - startTime;
      
      this.recordMetric('ai_response_time', responseTime);
      
      return result.success ? 1.0 : 0.0;
    } catch (error) {
      return 0.0;
    }
  }

  private async getMemoryUsage(): Promise<number> {
    const usage = process.memoryUsage();
    const usageMB = usage.heapUsed / 1024 / 1024;
    this.recordMetric('memory_usage', usageMB);
    return usageMB;
  }

  private calculateErrorRate(): number {
    const errors = this.getMetricHistory('errors') || [];
    const total = this.getMetricHistory('total_operations') || [];
    
    if (total.length === 0) return 0;
    
    const recentErrors = errors.slice(-10).reduce((sum, val) => sum + val, 0);
    const recentTotal = total.slice(-10).reduce((sum, val) => sum + val, 0);
    
    return recentTotal > 0 ? recentErrors / recentTotal : 0;
  }

  private async checkAlerts(health: SystemHealth): Promise<void> {
    const alerts: string[] = [];

    if (health.aiServiceUptime < 0.9) {
      alerts.push('AI Service experiencing downtime');
    }

    if (health.memoryUsage > 500) {
      alerts.push('High memory usage detected');
    }

    if (health.diskSpace < 1000) { // Less than 1GB
      alerts.push('Low disk space warning');
    }

    if (health.errorRate > 0.1) {
      alerts.push('High error rate detected');
    }

    if (alerts.length > 0) {
      console.warn('🚨 System Alerts:', alerts);
      // Could show notifications to user
    }
  }

  async startMonitoring(): Promise<void> {
    console.log('🔍 Starting health monitoring...');
    
    // Check health every 30 seconds
    setInterval(async () => {
      try {
        await this.checkSystemHealth();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, 30000);

    // Cleanup old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }
}
```

---

## 🎯 **INTEGRATION WITH MAIN APP**

### **4.1: Enhanced Main Process**

```typescript
// apps/desktop/src/main.ts - Enhanced version

class SilentSortApp {
  private mainWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private fileWatcher: chokidar.FSWatcher | null = null;
  private safeFileManager: SafeFileManager;
  private processingQueue: ProcessingQueue;
  private memoryService: MemoryService;
  private healthMonitor: HealthMonitor;

  constructor() {
    this.safeFileManager = new SafeFileManager();
    this.processingQueue = new ProcessingQueue();
    this.memoryService = new MemoryService();
    this.healthMonitor = new HealthMonitor();
    this.setupApp();
  }

  private async setupApp(): Promise<void> {
    await app.whenReady();

    // Initialize all services
    await this.memoryService.initialize();
    await this.healthMonitor.startMonitoring();

    // Test AI service on startup
    console.log('🧪 Testing AI service connection...');
    const testResult = await aiService.testConnection();
    console.log('🔍 AI Service Test:', testResult);

    this.createMainWindow();
    this.setupTray();
    this.setupFileWatcher();
    this.setupEventHandlers();
  }

  private async processFile(filePath: string): Promise<void> {
    try {
      // Skip hidden files and directories
      if (path.basename(filePath).startsWith('.')) {
        return;
      }

      // Check if should process (using memory service)
      const shouldProcess = await this.memoryService.shouldProcessFile(filePath);
      if (!shouldProcess) {
        return;
      }

      // Add to processing queue instead of direct processing
      await this.processingQueue.addFile(filePath);
      
    } catch (error) {
      console.error('Error in processFile:', error);
    }
  }

  // Add IPC handlers for UI integration
  private setupEventHandlers(): void {
    // Get processing history
    ipcMain.handle('get-processing-history', async () => {
      return await this.memoryService.getProcessingHistory();
    });

    // Get system health
    ipcMain.handle('get-system-health', async () => {
      return await this.healthMonitor.checkSystemHealth();
    });

    // Update user action on suggestions
    ipcMain.handle('update-user-action', async (event, fileHash: string, action: string) => {
      await this.memoryService.updateUserAction(fileHash, action as any);
    });

    // Manual undo operation
    ipcMain.handle('undo-last-operation', async () => {
      return await this.safeFileManager.undoLastOperation();
    });
  }
}
```

This robustness implementation provides:

- **🛡️ Zero data loss** - Transaction-based operations with rollback
- **🚫 No duplicate processing** - Hash-based memory system  
- **⚡ Smart queuing** - Prevents system overload
- **📊 Health monitoring** - Early problem detection
- **🔄 Undo functionality** - Reverse any operation
- **📈 Performance metrics** - Track system health over time

**Ready to implement this robust foundation?** It will make SilentSort bulletproof before we add the advanced context intelligence features! 