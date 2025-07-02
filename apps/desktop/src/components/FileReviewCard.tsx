import React, { useState } from 'react';
import './FileReviewCard.css';

interface DuplicateInfo {
  isDuplicate: boolean;
  duplicateFiles: string[];
  similarFiles: string[];
  action: 'merge' | 'rename' | 'keep_both' | 'replace_with_better';
  betterVersion?: {
    filePath: string;
    reason: string;
  };
}

interface ExtractedEntities {
  budget?: string;
  team_size?: string;
  deadline?: string;
  technology: string[];
  company?: string;
  invoice_number?: string;
  amount?: string;
}

interface FileReviewCardProps {
  file: {
    id: string;
    originalName: string;
    suggestedName: string;
    confidence: number;
    category: string;
    subcategory?: string;
    reasoning: string;
    technical_tags?: string[];
    extracted_entities?: ExtractedEntities;
    processing_time_ms?: number;
    error?: string;
    duplicateInfo?: DuplicateInfo;
    smartTags?: string[];
    folderSuggestion?: {
      path: string;
      confidence: number;
      reasoning: string;
    };
  };
  onApprove: (fileId: string, finalName?: string) => void;
  onReject: (fileId: string) => void;
  isSelected?: boolean;
  onSelect?: (fileId: string, selected: boolean) => void;
  onKeepBoth?: (fileId: string, callback: (success: boolean, message: string) => void) => void;
  onReplaceWithBetter?: (fileId: string, betterPath: string, callback: (success: boolean, message: string) => void) => void;
  onDeleteDuplicates?: (fileId: string, duplicatePaths: string[], callback: (success: boolean, message: string) => void) => void;
  onPreviewFile?: (filePath: string) => void;
}

const FileReviewCard: React.FC<FileReviewCardProps> = ({
  file,
  onApprove,
  onReject,
  isSelected = false,
  onSelect,
  onKeepBoth,
  onReplaceWithBetter,
  onDeleteDuplicates,
  onPreviewFile,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(file.suggestedName);
  const [showDetails, setShowDetails] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const getFileIcon = (fileName: string, category: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (category.toLowerCase().includes('invoice')) {
      return '📄';
    }
    if (category.toLowerCase().includes('report')) {
      return '📊';
    }
    if (category.toLowerCase().includes('resume')) {
      return '👤';
    }
    if (['pdf'].includes(ext || '')) {
      return '📄';
    }
    if (['doc', 'docx'].includes(ext || '')) {
      return '📝';
    }
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return '📋';
    }
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return '🖼️';
    }
    return '📄';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) {
      return 'high';
    }
    if (confidence >= 0.6) {
      return 'medium';
    }
    return 'low';
  };

  const showSuccess = (message: string) => {
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `✅ ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  };

  const handleKeepBoth = () => {
    if (onKeepBoth) {
      setActionInProgress('keep');
      onKeepBoth(file.id, (success: boolean, message: string) => {
        setActionInProgress(null);
        if (success) {
          showSuccess(message);
        }
      });
    }
  };

  const handleReplaceWithBetter = () => {
    if (onReplaceWithBetter && file.duplicateInfo?.betterVersion?.filePath) {
      setActionInProgress('better');
      onReplaceWithBetter(file.id, file.duplicateInfo.betterVersion.filePath, (success: boolean, message: string) => {
        setActionInProgress(null);
        if (success) {
          showSuccess(message);
        }
      });
    }
  };

  const handleDeleteDuplicates = () => {
    if (onDeleteDuplicates && file.duplicateInfo?.duplicateFiles) {
      setActionInProgress('delete');
      onDeleteDuplicates(file.id, file.duplicateInfo.duplicateFiles, (success: boolean, message: string) => {
        setActionInProgress(null);
        if (success) {
          showSuccess(message);
        }
      });
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedName(file.suggestedName);
  };

  const handleSave = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    onApprove(file.id, editedName);
  };

  const handleCancel = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    setEditedName(file.suggestedName);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.actions, .file-checkbox, .preview-actions, .duplicate-actions')) {
      return;
    }
    setShowDetails(!showDetails);
  };

  // Get key entities for display
  const keyEntities = [];
  if (file.extracted_entities?.company) {
    keyEntities.push(`🏢 ${file.extracted_entities.company}`);
  }
  if (file.extracted_entities?.amount) {
    keyEntities.push(`💰 ${file.extracted_entities.amount}`);
  }
  if (file.extracted_entities?.technology?.length) {
    keyEntities.push(`⚡ ${file.extracted_entities.technology.slice(0, 2).join(', ')}`);
  }

  // Check for duplicates
  const hasDuplicates = file.duplicateInfo?.isDuplicate && file.duplicateInfo.duplicateFiles.length > 0;

  return (
    <div 
      className={`file-card ${hasDuplicates ? 'duplicate-card' : 'regular-card'} ${showDetails ? 'expanded' : ''} ${isSelected ? 'selected' : ''}`} 
      data-file-id={file.id}
      onClick={handleCardClick}
    >
      {/* Duplicate Warning Banner */}
      {hasDuplicates && (
        <div className="duplicate-warning">
          <span className="duplicate-badge">🔍 DUPLICATE DETECTED</span>
          <span className="duplicate-count">
            {file.duplicateInfo?.duplicateFiles.length} similar files found
          </span>
        </div>
      )}

      <div className="card-main">
        {onSelect && (
          <input
            type="checkbox"
            className="file-checkbox"
            checked={isSelected}
            onChange={(e) => onSelect(file.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        <div className="file-content">
          <div className="file-names">
            <span className="file-icon">{getFileIcon(file.originalName, file.category)}</span>
            <div className="name-row first-row">
              <span className="label">From:</span>
              <span className="original-name">{file.originalName}</span>
              <div className="file-meta">
                <span className="category">{file.category}</span>
                <span className={`confidence confidence-${getConfidenceColor(file.confidence)}`}>
                  {Math.round(file.confidence * 100)}%
                </span>
              </div>
            </div>
            <div className="name-row second-row">
              <span className="label to-label">To:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="name-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSave(e);
                    }
                    if (e.key === 'Escape') {
                      handleCancel(e);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="suggested-name">{file.suggestedName}</span>
              )}
            </div>
          </div>
          
          {/* Only show tags and entities in expanded view */}
          {showDetails && (
            <>
              {keyEntities.length > 0 && (
                <div className="key-entities">
                  {keyEntities.map((entity, i) => (
                    <span key={i} className="entity-tag">{entity}</span>
                  ))}
                </div>
              )}

              {/* Smart tags in expanded view only */}
              {file.smartTags && file.smartTags.length > 0 && (
                <div className="compact-smart-tags">
                  {file.smartTags.map((tag, i) => (
                    <span key={i} className="compact-tag">{tag}</span>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Duplicate Information */}
          {hasDuplicates && (
            <div className="duplicate-info">
              <div className="duplicate-files">
                <strong>Similar Files:</strong>
                {file.duplicateInfo?.duplicateFiles.slice(0, 2).map((duplicateFile, i) => (
                  <div key={i} className="duplicate-file">
                    <span className="duplicate-name">{duplicateFile.split('/').pop()}</span>
                    <button 
                      className="preview-btn-small"
                      onClick={() => onPreviewFile?.(duplicateFile)}
                    >
                      👁️
                    </button>
                  </div>
                ))}
                {file.duplicateInfo?.duplicateFiles && file.duplicateInfo.duplicateFiles.length > 2 && (
                  <div className="more-duplicates">
                    +{file.duplicateInfo.duplicateFiles.length - 2} more files
                  </div>
                )}
              </div>
              
              {file.duplicateInfo?.betterVersion && (
                <div className="better-version">
                  <strong>⭐ Better Version:</strong>
                  <span className="better-file">{file.duplicateInfo.betterVersion.filePath.split('/').pop()}</span>
                  <span className="better-reason">({file.duplicateInfo.betterVersion.reason})</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="actions">
          {isEditing ? (
            <>
              <button className="action-btn save" onClick={handleSave}>✓</button>
              <button className="action-btn cancel" onClick={handleCancel}>✕</button>
            </>
          ) : (
            <>
              <button 
                className="action-btn approve" 
                onClick={(e) => { e.stopPropagation(); onApprove(file.id); }}
              >
                ✓
              </button>
              <button 
                className="action-btn edit" 
                onClick={handleEdit}
              >
                ✏️
              </button>
              <button 
                className="action-btn reject" 
                onClick={(e) => { e.stopPropagation(); onReject(file.id); }}
              >
                ✕
              </button>
            </>
          )}
          
          <button 
            className={`action-btn details ${showDetails ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
          >
            ⌄
          </button>
        </div>
      </div>

      {/* Duplicate Actions */}
      {hasDuplicates && (
        <div className="duplicate-actions">
          <button 
            className={`action-btn keep ${actionInProgress === 'keep' ? 'loading' : ''}`}
            onClick={handleKeepBoth}
            disabled={!!actionInProgress}
          >
            {actionInProgress === 'keep' ? '⏳' : '📁'} Keep Both
          </button>
          
          {file.duplicateInfo?.betterVersion && (
            <button 
              className={`action-btn better ${actionInProgress === 'better' ? 'loading' : ''}`}
              onClick={handleReplaceWithBetter}
              disabled={!!actionInProgress}
            >
              {actionInProgress === 'better' ? '⏳' : '⭐'} Use Better
            </button>
          )}
          
          <button 
            className={`action-btn delete ${actionInProgress === 'delete' ? 'loading' : ''}`}
            onClick={handleDeleteDuplicates}
            disabled={!!actionInProgress}
          >
            {actionInProgress === 'delete' ? '⏳' : '🗑️'} Delete Duplicates
          </button>

          <button 
            className="action-btn preview"
            onClick={() => onPreviewFile?.(file.originalName)}
          >
            👁️ Preview Current
          </button>
        </div>
      )}

      {/* Detailed analysis section */}
      {showDetails && (
        <div className="card-details">
          <div className="detail-row">
            <strong>Analysis:</strong>
            <span>{file.reasoning}</span>
          </div>
          
          {file.technical_tags && file.technical_tags.length > 0 && (
            <div className="detail-row">
              <strong>Tags:</strong>
              <div className="tags">
                {file.technical_tags.map((tag, i) => (
                  <span key={i} className="tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
          
          {file.extracted_entities && (
            <div className="detail-row">
              <strong>Extracted:</strong>
              <div className="extracted-info">
                {Object.entries(file.extracted_entities).map(([key, value]) => {
                  if (!value || (Array.isArray(value) && value.length === 0)) {
                    return null;
                  }
                  const displayValue = Array.isArray(value) ? value.join(', ') : value;
                  return (
                    <span key={key} className="extracted-item">
                      {key.replace('_', ' ')}: {displayValue}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {file.smartTags && file.smartTags.length > 0 && (
            <div className="detail-row">
              <strong>Smart Tags:</strong>
              <div className="smart-tags-list">
                {file.smartTags.map((tag, i) => (
                  <span key={i} className="smart-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}
          
          {file.processing_time_ms && (
            <div className="detail-row">
              <strong>Processing:</strong>
              <span>{file.processing_time_ms}ms</span>
            </div>
          )}
          
          {file.error && (
            <div className="detail-row error">
              <strong>Error:</strong>
              <span>{file.error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileReviewCard; 