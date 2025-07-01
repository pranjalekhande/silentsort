import React from 'react';
import './BatchOperations.css';

interface BatchOperationsProps {
  selectedFiles: string[];
  totalPendingFiles: number;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectHighConfidence: () => void;
  onBatchApprove: () => void;
  onBatchReject: () => void;
  onBatchApproveHighConfidence: () => void;
  highConfidenceCount: number;
}

const BatchOperations: React.FC<BatchOperationsProps> = ({
  selectedFiles,
  totalPendingFiles,
  onSelectAll,
  onSelectNone,
  onSelectHighConfidence,
  onBatchApprove,
  onBatchReject,
  onBatchApproveHighConfidence,
  highConfidenceCount,
}) => {
  const hasSelection = selectedFiles.length > 0;
  const hasHighConfidence = highConfidenceCount > 0;

  return (
    <div className="batch-operations">
      <div className="batch-header">
        <div className="batch-title">
          <h3>Batch Operations</h3>
          <span className="selection-count">
            {selectedFiles.length} of {totalPendingFiles} selected
          </span>
        </div>
        
        <div className="quick-actions">
          <button 
            className="quick-action-btn approve-all-confident"
            onClick={onBatchApproveHighConfidence}
            disabled={!hasHighConfidence}
            title={`Approve all ${highConfidenceCount} high-confidence files`}
          >
            <span className="btn-icon">⚡</span>
            <span className="btn-text">
              Approve High Confidence ({highConfidenceCount})
            </span>
          </button>
        </div>
      </div>
      
      <div className="batch-controls">
        <div className="selection-controls">
          <h4>Selection</h4>
          <div className="selection-buttons">
            <button 
              className="control-btn"
              onClick={onSelectAll}
              disabled={selectedFiles.length === totalPendingFiles}
            >
              <span className="btn-icon">☑️</span>
              Select All
            </button>
            
            <button 
              className="control-btn"
              onClick={onSelectNone}
              disabled={selectedFiles.length === 0}
            >
              <span className="btn-icon">☐</span>
              Select None
            </button>
            
            <button 
              className="control-btn"
              onClick={onSelectHighConfidence}
              disabled={!hasHighConfidence}
            >
              <span className="btn-icon">🎯</span>
              High Confidence ({highConfidenceCount})
            </button>
          </div>
        </div>
        
        <div className="batch-actions">
          <h4>Actions</h4>
          <div className="action-buttons">
            <button 
              className="batch-btn approve-btn"
              onClick={onBatchApprove}
              disabled={!hasSelection}
            >
              <span className="btn-icon">✅</span>
              <span className="btn-text">
                Approve Selected ({selectedFiles.length})
              </span>
            </button>
            
            <button 
              className="batch-btn reject-btn"
              onClick={onBatchReject}
              disabled={!hasSelection}
            >
              <span className="btn-icon">❌</span>
              <span className="btn-text">
                Reject Selected ({selectedFiles.length})
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {hasSelection && (
        <div className="batch-summary">
          <div className="summary-info">
            <span className="summary-icon">📊</span>
            <span className="summary-text">
              Ready to process {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchOperations; 