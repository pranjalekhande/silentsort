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
  return (
    <div className="batch-operations">
      <div className="batch-header">
        <div className="batch-info">
          <span className="selected-count">
            {selectedFiles.length} of {totalPendingFiles} selected
          </span>
          {highConfidenceCount > 0 && (
            <span className="high-confidence-note">
              {highConfidenceCount} high confidence
            </span>
          )}
        </div>
      </div>
      
      <div className="batch-controls">
        <div className="selection-controls">
          <button 
            className="batch-btn select-btn" 
            onClick={onSelectAll}
            disabled={selectedFiles.length === totalPendingFiles}
          >
            Select All
          </button>
          
          <button 
            className="batch-btn select-btn" 
            onClick={onSelectHighConfidence}
            disabled={highConfidenceCount === 0}
          >
            High Confidence ({highConfidenceCount})
          </button>
          
          <button 
            className="batch-btn select-btn" 
            onClick={onSelectNone}
            disabled={selectedFiles.length === 0}
          >
            Clear
          </button>
        </div>
        
        <div className="action-controls">
          {highConfidenceCount > 0 && selectedFiles.length === 0 && (
            <button 
              className="batch-btn quick-approve" 
              onClick={onBatchApproveHighConfidence}
            >
              ⚡ Quick Approve {highConfidenceCount}
            </button>
          )}
          
          {selectedFiles.length > 0 && (
            <>
              <button 
                className="batch-btn approve" 
                onClick={onBatchApprove}
              >
                ✓ Approve {selectedFiles.length}
              </button>
              
              <button 
                className="batch-btn reject" 
                onClick={onBatchReject}
              >
                ✕ Reject {selectedFiles.length}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchOperations; 