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
    
    if (category.toLowerCase().includes('invoice')) {
      return '🧾';
    }
    if (category.toLowerCase().includes('report')) {
      return '📊';
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

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't toggle details if clicking on buttons or checkbox
    if ((e.target as HTMLElement).closest('.action-buttons, .select-checkbox')) {
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

  const handleApproveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApprove(file.id);
  };

  return (
    <div className={`file-review-card ${isSelected ? 'selected' : ''}`}>
      {/* Quick Review Section */}
      <div className="quick-review" onClick={handleCardClick}>
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
        
        <div className="file-preview">
          <div className="file-icon">
            {getFileIcon(file.originalName, file.category)}
          </div>
          <div className="file-type-badge">
            {file.category.toUpperCase()}
          </div>
        </div>
        
        <div className="file-info">
          <div className="file-names">
            <div className="original-name">
              <span className="label">From:</span>
              <span className="name">{file.originalName}</span>
            </div>
            <div className="suggested-name">
              <span className="label">To:</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="edit-name-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit(e);
                    } else if (e.key === 'Escape') {
                      handleCancelEdit(e);
                    }
                  }}
                />
              ) : (
                <span className="name">{file.suggestedName}</span>
              )}
            </div>
          </div>
          
          <div className="confidence-indicator">
            <div className={`confidence-bar confidence-${getConfidenceColor(file.confidence)}`}>
              <div 
                className="confidence-fill" 
                style={{ width: `${file.confidence * 100}%` }}
              ></div>
            </div>
            <span className="confidence-text">
              {Math.round(file.confidence * 100)}% confident
            </span>
          </div>
        </div>
        
        <div className="action-buttons">
          {isEditing ? (
            <>
              <button 
                className="action-btn save-btn"
                onClick={handleSaveEdit}
                title="Save and rename"
              >
                <span className="btn-icon">💾</span>
                <span className="btn-text">Save</span>
              </button>
              
              <button 
                className="action-btn cancel-btn"
                onClick={handleCancelEdit}
                title="Cancel editing"
              >
                <span className="btn-icon">↩️</span>
                <span className="btn-text">Cancel</span>
              </button>
            </>
          ) : (
            <>
              <button 
                className="action-btn approve-btn"
                onClick={handleApproveClick}
                title="Approve rename"
              >
                <span className="btn-icon">✓</span>
                <span className="btn-text">Approve</span>
              </button>
              
              <button 
                className="action-btn edit-btn"
                onClick={handleEditClick}
                title="Edit name before applying"
              >
                <span className="btn-icon">✏️</span>
                <span className="btn-text">Edit</span>
              </button>
              
              <button 
                className="action-btn reject-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject(file.id);
                }}
                title="Reject rename"
              >
                <span className="btn-icon">✗</span>
                <span className="btn-text">Reject</span>
              </button>
            </>
          )}
          
          <button 
            className="action-btn details-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            title="Toggle details"
          >
            <span className={`btn-icon ${showDetails ? 'expanded' : ''}`}>▼</span>
          </button>
        </div>
      </div>
      
      {/* Expandable Details Section */}
      {showDetails && (
        <div className="detailed-info">
          <div className="detail-section">
            <h4>AI Analysis</h4>
            <p className="reasoning">{file.reasoning}</p>
            {file.processing_time_ms && (
              <span className="processing-time">
                Analyzed in {file.processing_time_ms}ms
              </span>
            )}
          </div>
          
          {file.technical_tags && file.technical_tags.length > 0 && (
            <div className="detail-section">
              <h4>Technical Tags</h4>
              <div className="tags-container">
                {file.technical_tags.map((tag, index) => (
                  <span key={index} className="tech-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {file.extracted_entities && (
            file.extracted_entities.team_size ||
            file.extracted_entities.budget ||
            file.extracted_entities.deadline ||
            file.extracted_entities.company ||
            file.extracted_entities.invoice_number ||
            file.extracted_entities.amount ||
            (file.extracted_entities.technology && file.extracted_entities.technology.length > 0)
          ) && (
            <div className="detail-section">
              <h4>Extracted Information</h4>
              <div className="entities-grid">
                {file.extracted_entities.team_size && (
                  <div className="entity-item">
                    <span className="entity-icon">👥</span>
                    <span className="entity-value">{file.extracted_entities.team_size}</span>
                  </div>
                )}
                {file.extracted_entities.budget && (
                  <div className="entity-item">
                    <span className="entity-icon">💰</span>
                    <span className="entity-value">{file.extracted_entities.budget}</span>
                  </div>
                )}
                {file.extracted_entities.deadline && (
                  <div className="entity-item">
                    <span className="entity-icon">📅</span>
                    <span className="entity-value">{file.extracted_entities.deadline}</span>
                  </div>
                )}
                {file.extracted_entities.company && (
                  <div className="entity-item">
                    <span className="entity-icon">🏢</span>
                    <span className="entity-value">{file.extracted_entities.company}</span>
                  </div>
                )}
                {file.extracted_entities.invoice_number && (
                  <div className="entity-item">
                    <span className="entity-icon">📄</span>
                    <span className="entity-value">{file.extracted_entities.invoice_number}</span>
                  </div>
                )}
                {file.extracted_entities.amount && (
                  <div className="entity-item">
                    <span className="entity-icon">💵</span>
                    <span className="entity-value">{file.extracted_entities.amount}</span>
                  </div>
                )}
                {file.extracted_entities.technology && file.extracted_entities.technology.length > 0 && (
                  <div className="entity-item">
                    <span className="entity-icon">🔧</span>
                    <span className="entity-value">{file.extracted_entities.technology.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {file.error && (
            <div className="detail-section error-section">
              <h4>Error</h4>
              <p className="error-message">{file.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileReviewCard; 