# SilentSort - Hybrid Cloud Architecture
## "Works in the background. Keeps everything tidy."

### Project Overview
- **App Name:** SilentSort
- **Platform:** macOS (Electron-based)
- **Architecture:** Hybrid Local + Cloud Processing
- **Tagline:** Works in the background. Keeps everything tidy.

---

## 🏗️ ARCHITECTURE DECISIONS

### 1. **Processing Strategy: Hybrid Local + Cloud**
✅ **Local processing** for sensitive files (user choice)  
✅ **Cloud processing** for better AI capabilities  
✅ **User control** - privacy vs performance modes  

**Modes Available:**
- **Privacy Mode**: All processing stays local
- **Performance Mode**: Cloud AI processing for speed
- **Hybrid Mode**: Smart mix based on file type/sensitivity

### 2. **Backend: Supabase Cloud**
✅ **Database**: PostgreSQL for file metadata, user settings  
✅ **Storage**: File thumbnails, processed data, backups  
✅ **Edge Functions**: Cloud AI processing workflows  
✅ **Real-time**: Live sync across devices (future)  
✅ **Auth**: User authentication system  

### 3. **Automation: n8n Cloud**
✅ **n8n Cloud** - No Docker setup required  
✅ **Webhook endpoints** for cloud processing  
✅ **Better integrations** with external services  
✅ **Easier collaboration** and workflow sharing  
✅ **No local server maintenance**  

### 4. **Repository: Enterprise-Grade Monorepo**
✅ **Monorepo structure** for all components  
✅ **Shared packages** for common utilities  
✅ **CI/CD integration** with GitHub Actions  
✅ **Type safety** across entire codebase  

### 5. **Distribution: Direct Download**
✅ **Direct .dmg distribution** (no App Store for now)  
✅ **Auto-updater** built-in  
✅ **Code signing** for macOS security  

---

## 🛠️ COMPLETE TECHNICAL STACK

### **Desktop Application**
- **Framework**: Electron with React/TypeScript
- **File System**: Node.js fs APIs + chokidar watcher
- **UI**: System tray + simple settings panel
- **Global Hotkeys**: Cmd+Shift+F for search
- **Permissions**: Full Disk Access, Accessibility

### **Cloud Backend (Supabase)**
```
Supabase Project:
├── Database (PostgreSQL)
│   ├── files table (metadata, paths, tags)
│   ├── users table (preferences, settings)
│   ├── processing_logs table (AI results)
│   └── file_relationships table (connections)
├── Storage Buckets
│   ├── thumbnails/ (file previews)
│   ├── processed/ (AI analysis results)
│   └── backups/ (organization history)
├── Edge Functions
│   ├── file-analysis/ (AI content processing)
│   ├── smart-rename/ (filename generation)
│   └── relationship-mapping/ (file connections)
└── Auth (User management)
```

### **AI Processing Pipeline**
- **LangGraph**: AI workflow orchestration
- **LangSmith**: Monitoring and debugging AI chains
- **OpenAI API**: Content analysis and naming
- **Local LLM Option**: Ollama for privacy mode

### **Automation Layer (n8n Cloud)**
```
n8n Workflows:
├── File Processing Pipeline
│   ├── Trigger: New file detected
│   ├── Action: Analyze content
│   ├── Action: Generate filename
│   ├── Action: Organize to folder
│   └── Action: Update database
├── Smart Search Indexing
│   ├── Trigger: File processed
│   ├── Action: Extract searchable content
│   └── Action: Update search index
└── Cleanup & Maintenance
    ├── Trigger: Weekly schedule
    ├── Action: Archive old files
    └── Action: Optimize database
```

---

## 📁 ENTERPRISE MONOREPO STRUCTURE

```
silentsort/
├── apps/
│   ├── desktop/                    # Electron macOS app
│   │   ├── src/
│   │   │   ├── main/              # Main process
│   │   │   ├── renderer/          # UI components
│   │   │   ├── services/          # File operations
│   │   │   └── utils/             # Helper functions
│   │   ├── assets/                # Icons, images
│   │   ├── build/                 # Build configs
│   │   └── package.json
│   ├── backend/                    # Supabase Edge Functions
│   │   ├── functions/
│   │   │   ├── file-analysis/
│   │   │   ├── smart-rename/
│   │   │   └── search-index/
│   │   └── supabase/
│   │       ├── migrations/
│   │       └── config.toml
│   └── workflows/                  # n8n Workflow Definitions
│       ├── file-processing.json
│       ├── search-indexing.json
│       └── maintenance.json
├── packages/
│   ├── shared/                     # Shared utilities
│   │   ├── types/                 # TypeScript definitions
│   │   ├── constants/             # App constants
│   │   └── utils/                 # Common functions
│   ├── database/                   # Supabase schemas
│   │   ├── types.ts               # Database types
│   │   ├── queries.ts             # Common queries
│   │   └── migrations/            # SQL migrations
│   ├── ai-pipeline/               # LangGraph workflows
│   │   ├── chains/                # AI processing chains
│   │   ├── agents/                # AI agents
│   │   └── tools/                 # Custom tools
│   └── file-processor/            # File analysis logic
│       ├── analyzers/             # Content analyzers
│       ├── renamers/              # Filename generators
│       └── organizers/            # Folder logic
├── tools/
│   ├── scripts/                   # Build/deployment scripts
│   │   ├── build-electron.js
│   │   ├── deploy-supabase.js
│   │   └── setup-n8n.js
│   └── configs/                   # Configuration files
│       ├── eslint.config.js
│       ├── typescript.config.js
│       └── electron-builder.config.js
├── docs/                          # Documentation
│   ├── architecture.md
│   ├── setup.md
│   └── api.md
├── .github/                       # CI/CD workflows
│   └── workflows/
│       ├── build.yml
│       ├── test.yml
│       └── release.yml
├── package.json                   # Root package config
├── turbo.json                     # Monorepo configuration
└── README.md
```

---

## 🔄 DATA FLOW ARCHITECTURE

### **File Processing Flow**
```
1. File Added to Downloads
   ↓
2. Electron App Detects (chokidar)
   ↓
3. Send to n8n Webhook
   ↓
4. n8n Triggers LangGraph Workflow
   ↓
5. AI Analysis (Content → Metadata)
   ↓
6. Generate Smart Filename
   ↓
7. Determine Folder Location
   ↓
8. Move File + Update Supabase
   ↓
9. Index for Smart Search
   ↓
10. Notify Desktop App (Complete)
```

### **Smart Search Flow**
```
1. User Presses Cmd+Shift+F
   ↓
2. Search Query Sent to Supabase
   ↓
3. Full-text Search + AI Similarity
   ↓
4. Return Ranked Results
   ↓
5. Display in Desktop App
   ↓
6. User Clicks → Open/Reveal File
```

---

## 🚀 DEPLOYMENT STRATEGY

### **Development Environment**
1. **Supabase Local Development**
   - Local PostgreSQL instance
   - Local Edge Functions testing

2. **n8n Cloud Integration**
   - Development workspace
   - Webhook testing endpoints

3. **Electron Development**
   - Hot reload for fast iteration
   - macOS permission testing

### **Production Deployment**
1. **Supabase Production**
   - Hosted PostgreSQL database
   - Edge Functions deployed
   - CDN for file storage

2. **n8n Cloud Production**
   - Production workflows
   - Monitoring and logging

3. **Desktop App Distribution**
   - Code-signed .dmg files
   - Auto-updater mechanism
   - Analytics integration

---

## 🔐 SECURITY & PRIVACY

### **Data Protection**
- **Local Processing Option** for sensitive files
- **Encrypted Storage** in Supabase
- **No File Content Stored** in cloud (only metadata)
- **User Control** over privacy settings

### **API Security**
- **Row Level Security** in Supabase
- **API Key Management** in environment variables
- **Rate Limiting** on all endpoints
- **Input Validation** and sanitization

---

## 📊 MONITORING & ANALYTICS

### **Application Monitoring**
- **LangSmith**: AI workflow performance
- **Supabase Analytics**: Database performance
- **n8n Monitoring**: Workflow execution stats
- **Electron Analytics**: App usage patterns

### **User Experience Tracking**
- **File Processing Success Rate**
- **Search Query Performance**
- **User Satisfaction Metrics**
- **Error Reporting and Logging**

---

## 🎯 DEVELOPMENT ROADMAP

### **Phase 1: Core MVP (Week 1)**
- Basic Electron app with file watcher
- Supabase database setup
- Simple AI content analysis
- Basic auto-rename functionality

### **Phase 2: Smart Features (Week 2)**
- n8n workflow integration
- Smart folder organization
- Global search implementation
- System tray integration

### **Phase 3: Intelligence (Week 3)**
- LangGraph complex workflows
- File relationship mapping
- Advanced AI processing
- Performance optimization

### **Phase 4: Polish (Week 4)**
- UI/UX refinement
- Error handling and edge cases
- Documentation and deployment
- User testing and feedback

---

*This hybrid architecture provides the perfect balance of privacy, performance, and scalability for SilentSort - enabling both local processing for sensitive files and cloud power for advanced AI capabilities.* 