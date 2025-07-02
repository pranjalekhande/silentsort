import React from 'react';
import './BatchOperations.css';

interface BatchOperationsProps {
  selectedFiles: string[];
  totalPendingFiles: number;
  highConfidenceCount: number;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSelectHighConfidence: () => void;
  onBatchApprove: () => void;
  onBatchReject: () => void;
  onBatchApproveHighConfidence: () => void;
}

const BatchOperations: React.FC<BatchOperationsProps> = ({
  selectedFiles,
  totalPendingFiles,
  highConfidenceCount,
  onSelectAll,
  onSelectNone,
  onSelectHighConfidence,
  onBatchApprove,
  onBatchReject,
  onBatchApproveHighConfidence,
}) => {
  const hasSelection = selectedFiles.length > 0;
  const allSelected = selectedFiles.length === totalPendingFiles;
  const partiallySelected = hasSelection && !allSelected;
  
  const handleSelectAllToggle = () => {
    if (allSelected || partiallySelected) {
      onSelectNone();
    } else {
      onSelectAll();
    }
  };
  
  return (
    <div className={`batch-operations ${hasSelection ? 'has-selection' : ''}`}>
      <div className="batch-content">
        <div className="select-all-section">
          <div className="select-all-checkbox-wrapper">
            <input
              type="checkbox"
              className={`select-all-checkbox ${partiallySelected ? 'partially-selected' : ''}`}
              checked={allSelected}
              onChange={handleSelectAllToggle}
              disabled={totalPendingFiles === 0}
            />
            <span className="select-count">
              {hasSelection ? selectedFiles.length : totalPendingFiles} Files (Select To Batch Process)
            </span>
          </div>
        </div>
        
        <div className="batch-controls">
          {!hasSelection && (
            // Default state - selection options
            <div className="selection-controls">
              {/* <button 
                className="batch-btn select-btn" 
                onClick={onSelectAll}
                disabled={totalPendingFiles === 0}
              >
                Select All
              </button> */}
              
              {highConfidenceCount > 0 && (
                <>
                  <button 
                    className="batch-btn select-btn high-confidence" 
                    onClick={onSelectHighConfidence}
                  >
                    High Confidence ({highConfidenceCount})
                  </button>
                  
                  <button 
                    className="batch-btn quick-approve" 
                    onClick={onBatchApproveHighConfidence}
                  >
                    Quick Approve {highConfidenceCount}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="action-section">
          {hasSelection ? (
            // Selection state - actions on the right
            <div className="action-controls">
              <button 
                className="batch-btn approve" 
                onClick={onBatchApprove}
              >
                ✓  {selectedFiles.length}
              </button>
              
              <button 
                className="batch-btn reject" 
                onClick={onBatchReject}
              >
                ✕  {selectedFiles.length}
              </button>
            </div>
          ) : null}
          
          {hasSelection && (
            <button 
              className="clear-selection-btn" 
              onClick={onSelectNone}
              title="Clear selection"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchOperations; 