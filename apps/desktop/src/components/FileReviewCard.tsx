import React, { useState } from 'react';
import './FileReviewCard.css';

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
  };
  onApprove: (fileId: string, finalName?: string) => void;
  onReject: (fileId: string) => void;
  isSelected?: boolean;
  onSelect?: (fileId: string, selected: boolean) => void;
}

const FileReviewCard: React.FC<FileReviewCardProps> = ({
  file,
  onApprove,
  onReject,
  isSelected = false,
  onSelect,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(file.suggestedName);

  const getFileIcon = (fileName: string, category: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (category.toLowerCase().includes('invoice')) return '📄';
    if (category.toLowerCase().includes('report')) return '📊';
    if (category.toLowerCase().includes('resume')) return '👤';
    if (['pdf'].includes(ext || '')) return '📄';
    if (['doc', 'docx'].includes(ext || '')) return '📝';
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) return '📋';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return '🖼️';
    
    return '📄';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.6) return 'medium';
    return 'low';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.actions, .select-checkbox')) {
      return;
    }
    setShowDetails(!showDetails);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedName(file.suggestedName);
  };

  const handleSaveEdit = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    onApprove(file.id, editedName);
  };

  const handleCancelEdit = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    setEditedName(file.suggestedName);
  };

  const renderKeyEntities = () => {
    const entities = file.extracted_entities;
    if (!entities) return null;
    
    const keyInfo = [];
    if (entities.company) keyInfo.push(`🏢 ${entities.company}`);
    if (entities.amount) keyInfo.push(`💰 ${entities.amount}`);
    if (entities.technology?.length) keyInfo.push(`⚡ ${entities.technology.slice(0, 2).join(', ')}`);
    
    return keyInfo.length > 0 ? (
      <div className="key-entities">
        {keyInfo.map((info, i) => (
          <span key={i} className="entity-tag">{info}</span>
        ))}
      </div>
    ) : null;
  };

  return (
    <div className={`file-card ${isSelected ? 'selected' : ''} ${showDetails ? 'expanded' : ''}`}>
      <div className="card-main" onClick={handleCardClick}>
        {onSelect && (
          <div className="select-checkbox">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onSelect(file.id, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        
        <div className="file-info">
          <div className="file-header">
            <div className="file-icon">{getFileIcon(file.originalName, file.category)}</div>
            <div className="file-meta">
              <div className="category-badge">{file.category}</div>
              <div className={`confidence confidence-${getConfidenceColor(file.confidence)}`}>
                {Math.round(file.confidence * 100)}%
              </div>
            </div>
          </div>
          
          <div className="file-names">
            <div className="name-row">
              <span className="label">From:</span>
              <span className="original-name">{file.originalName}</span>
            </div>
            <div className="name-row main">
              <span className="label">To:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="name-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(e);
                    if (e.key === 'Escape') handleCancelEdit(e);
                  }}
                />
              ) : (
                <span className="suggested-name">{file.suggestedName}</span>
              )}
            </div>
          </div>
          
          {renderKeyEntities()}
        </div>
        
        <div className="actions">
          {isEditing ? (
            <>
              <button className="action-btn save" onClick={handleSaveEdit} title="Save">
                ✓
              </button>
              <button className="action-btn cancel" onClick={handleCancelEdit} title="Cancel">
                ✕
              </button>
            </>
          ) : (
            <>
              <button 
                className="action-btn approve" 
                onClick={(e) => { e.stopPropagation(); onApprove(file.id); }}
                title="Approve rename"
              >
                ✓
              </button>
              <button 
                className="action-btn edit" 
                onClick={handleEditClick}
                title="Edit name"
              >
                ✏️
              </button>
              <button 
                className="action-btn reject" 
                onClick={(e) => { e.stopPropagation(); onReject(file.id); }}
                title="Reject rename"
              >
                ✕
              </button>
            </>
          )}
          
          <button 
            className={`action-btn details ${showDetails ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
            title="Toggle details"
          >
            ⌄
          </button>
        </div>
      </div>
      
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
                  if (!value || (Array.isArray(value) && value.length === 0)) return null;
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