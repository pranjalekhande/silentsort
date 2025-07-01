# Smart Format Detection - 5 Core Tasks

**Foundation:** Smart Format Detection LangGraph Workflow ✅ Complete  
**Progress:** 🎯 Task 1 ✅ COMPLETE | Task 2 ⭐ NEXT | Tasks 3-5 📋 Queued

## 🎯 **TASK 1: Context-Aware Format Detection** ✅ COMPLETE
**Estimated Time:** 30 minutes ✅ **Completed Successfully**  
**Impact:** HIGH - Immediate visible improvements ✅ **ACHIEVED**  
**File:** `apps/desktop/src/services/format-detection-workflow.ts`

### Implementation Checklist:
- [x] **1.1** Locate `applyUserFormat` node in workflow ✅
- [x] **1.2** Add context detection logic before format selection: ✅
  ```javascript
  // Context-aware format selection - IMPLEMENTED
  const contextDetection = ContextualFormatDetector.detectContextualFormat(
    state.suggestedName, state.fileExtension, undefined, state.targetFolder);
  ```
- [x] **1.3** Implement `detectContextualFormat` method with rules: ✅
  - [x] Invoice/financial documents → `spacedTitle` format ✅ `Invoice Apple Services 2024.txt`
  - [x] Code files (.js, .ts, .py) → `camelCase` format ✅ `userAuthenticationService.js`
  - [x] Professional documents (resume, report) → `spacedTitle` format ✅ `John Smith Resume.pdf`
  - [x] Media files → `hyphenated` format ✅ `family-vacation-photos.jpg`
- [x] **1.4** Update reasoning message to include context detection ✅
- [x] **1.5** Test with invoice file: `invoice_microsoft_azure_Q4_2024.txt` ✅
  - [x] **Actual result:** `Invoice Microsoft Azure Q4 2024.txt` (spacedTitle) ✅
- [x] **1.6** Test with code file: `user_auth_service.js` ✅
  - [x] **Actual result:** `userAuthService.js` (camelCase) ✅

### 🏆 **BONUS FEATURES IMPLEMENTED:**
- [x] **Configurable Context Rules** - Non-hardcoded, extensible architecture
- [x] **Flexible Pattern Matching** - Works with underscores, hyphens, spaces
- [x] **Priority-Based Detection** - Content patterns → Extension → Fallback  
- [x] **Confidence Scoring** - Reliable context detection with evidence
- [x] **Multiple File Types** - Resume, Report, Image detection working perfectly
- [x] **Real-Time Demo** - Live testing with actual files in Downloads/silentsort-test

---

## 🎯 **TASK 2: Smart Name Quality Recognition** ⭐ NEXT PRIORITY
**Estimated Time:** 45 minutes  
**Impact:** HIGH - Major UX improvement, less intrusive behavior  
**Dependencies:** Task 1 complete

### Implementation Checklist:
- [ ] **2.1** Create `calculateNameQuality` function with scoring:
  - [ ] Descriptiveness score (0-1): Not generic like "IMG_001"
  - [ ] Format consistency score (0-1): Proper separators, no mixed formats
  - [ ] Context appropriateness score (0-1): Right format for file type
  - [ ] Overall quality = average of three scores
- [ ] **2.2** Add quality check in `applyUserFormat` node:
  ```javascript
  const originalQuality = this.calculateNameQuality(state.originalFileName);
  const suggestedQuality = this.calculateNameQuality(state.suggestedName);
  ```
- [ ] **2.3** Implement smart recommendation logic:
  - [ ] If `originalQuality > 0.8` → Set action to "suggest_alternatives"
  - [ ] If `suggestedQuality - originalQuality < 0.1` → Keep current as primary
  - [ ] Otherwise → Suggest improvement as primary
- [ ] **2.4** Update result interface to include recommendation type:
  ```typescript
  interface FormatDetectionResult {
    recommendationType: 'improvement' | 'alternatives' | 'keep_current';
    qualityScore: number;
    // ... existing fields
  }
  ```
- [ ] **2.5** Test quality recognition:
  - [ ] Good name: `adobe-creative-invoice-2024.txt` → Should suggest alternatives only
  - [ ] Poor name: `IMG_001.pdf` → Should suggest improvement
  - [ ] Borderline: `invoice_final.pdf` → Should suggest improvement

---

## 🎯 **TASK 3: Alternative Format Selection UI** 
**Estimated Time:** 60 minutes  
**Impact:** MEDIUM - User control and satisfaction  
**Dependencies:** Task 2 complete  
**Files:** `apps/desktop/src/components/FileReviewCard.tsx`, `FileReviewCard.css`

### Implementation Checklist:
- [ ] **3.1** Enhance FileReviewCard component interface:
  ```typescript
  interface FileReviewCardProps {
    recommendationType: 'improvement' | 'alternatives' | 'keep_current';
    alternativeFormats: string[];
    qualityScore: number;
    // ... existing props
  }
  ```
- [ ] **3.2** Create format selection UI components:
  - [ ] Primary suggestion display (larger, highlighted)
  - [ ] Alternative format buttons (smaller, clickable)
  - [ ] Quality indicator (✅ good name, 💡 improvement available)
- [ ] **3.3** Add format switching functionality:
  - [ ] Click alternative → Preview new name
  - [ ] "Use This Format" button → Apply selection
  - [ ] Revert to original option
- [ ] **3.4** Update action buttons based on recommendation type:
  - [ ] **Improvement**: `✓ Apply Improvement` | `🔄 Try Alternatives` | `✗ Keep Original`
  - [ ] **Alternatives**: `✓ Keep Current` | `🔄 Use Alternative` | `✗ Skip`
  - [ ] **Keep Current**: `✓ Keep As-Is` | `🔄 See Alternatives` | `✗ Skip`
- [ ] **3.5** Add CSS styling:
  - [ ] Smooth transitions between format previews
  - [ ] Clear visual hierarchy (primary vs alternatives)
  - [ ] Mobile-responsive design
- [ ] **3.6** Test UI interactions:
  - [ ] Format switching works smoothly
  - [ ] Action buttons reflect current selection
  - [ ] Keyboard navigation supported

---

## 🎯 **TASK 4: User Preference Learning** 
**Estimated Time:** 90 minutes  
**Impact:** HIGH - Long-term intelligence building  
**Dependencies:** Task 3 complete  
**Files:** New preference storage system

### Implementation Checklist:
- [ ] **4.1** Create user preferences storage:
  - [ ] Use `electron-store` for persistent preferences
  - [ ] Schema: `{ userId, contextPreferences, globalDefault, learningEnabled }`
  - [ ] Context-specific preferences: `{ financial: 'spacedTitle', code: 'camelCase', media: 'hyphenated' }`
- [ ] **4.2** Implement preference tracking:
  ```typescript
  interface UserFormatChoice {
    originalFormat: NamingConvention;
    chosenFormat: NamingConvention;
    context: string; // 'financial', 'code', 'professional'
    timestamp: Date;
    confidence: number;
  }
  ```
- [ ] **4.3** Add learning logic to format detection workflow:
  - [ ] Track user selections in `applyUserFormat` node
  - [ ] Update context preferences when user picks alternatives
  - [ ] Weight recent choices more heavily than old ones
- [ ] **4.4** Create preference inference engine:
  - [ ] Detect patterns: "User always picks spaced format for invoices"
  - [ ] Build confidence scores for each context-format combination
  - [ ] Apply learned preferences in future recommendations
- [ ] **4.5** Add preference management UI:
  - [ ] Settings panel: "Format Preferences"
  - [ ] Context-specific overrides
  - [ ] "Reset Learning" option
  - [ ] Export/import preferences
- [ ] **4.6** Test learning behavior:
  - [ ] Process 5 invoice files, always pick spaced format
  - [ ] 6th invoice should automatically suggest spaced format as primary
  - [ ] Different context (code files) should not be affected

---

## 🎯 **TASK 5: Folder-Type Intelligence** 
**Estimated Time:** 75 minutes  
**Impact:** MEDIUM - Advanced contextual awareness  
**Dependencies:** Task 4 complete  
**Files:** Enhanced context detection system

### Implementation Checklist:
- [ ] **5.1** Create folder intelligence analyzer:
  ```typescript
  interface FolderContext {
    folderType: 'financial' | 'code' | 'media' | 'professional' | 'personal' | 'unknown';
    confidence: number;
    preferredFormat: NamingConvention;
    evidence: string[]; // Why this context was detected
  }
  ```
- [ ] **5.2** Implement folder type detection:
  - [ ] Path analysis: `/Documents/Invoices/` → financial
  - [ ] Content analysis: Existing files reveal folder purpose
  - [ ] Name pattern analysis: `src/`, `components/` → code
  - [ ] User annotation: Manual folder type assignment
- [ ] **5.3** Add folder context to workflow state:
  - [ ] Enhance `detect_folder_patterns` node
  - [ ] Include folder context in format decision logic
  - [ ] Override generic context with folder-specific intelligence
- [ ] **5.4** Create folder-specific format rules:
  ```javascript
  const folderFormatRules = {
    financial: { primary: 'spacedTitle', confidence: 0.9 },
    code: { primary: 'camelCase', confidence: 0.95 },
    media: { primary: 'hyphenated', confidence: 0.8 },
    professional: { primary: 'spacedTitle', confidence: 0.85 }
  };
  ```
- [ ] **5.5** Add folder context UI indicators:
  - [ ] Show detected folder type: "📁 Code Project Folder"
  - [ ] Display why format was chosen: "Using camelCase (detected: code folder)"
  - [ ] Allow folder type override
- [ ] **5.6** Test folder intelligence:
  - [ ] Create `/test/invoices/` folder with existing spaced files
  - [ ] Add new file → Should detect financial context
  - [ ] Create `/test/src/` folder with camelCase files
  - [ ] Add new file → Should detect code context

 