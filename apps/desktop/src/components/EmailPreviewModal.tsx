import React from 'react';
import './EmailPreviewModal.css';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: () => void;
  emailData: {
    subject: string;
    body: string;
    priority: 'high' | 'normal' | 'low';
  };
  fileData: {
    fileName: string;
    vendor?: string;
    amount?: string;
    invoiceNumber?: string;
    dueDate?: string;
    category: string;
  };
}

const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  onSend,
  emailData,
  fileData
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'normal': return '🟡';
      case 'low': return '🟢';
      default: return '🟡';
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="email-preview-modal">
        <div className="modal-header">
          <h2>📧 Email Preview</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-content">
          <div className="email-details">
            <div className="email-meta">
              <div className="meta-item">
                <span className="meta-label">Priority:</span>
                <span className="meta-value">
                  {getPriorityIcon(emailData.priority)} {emailData.priority.toUpperCase()}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Category:</span>
                <span className="meta-value">{fileData.category}</span>
              </div>
            </div>

            <div className="email-subject">
              <label>Subject:</label>
              <div className="subject-text">{emailData.subject}</div>
            </div>

            <div className="email-body">
              <label>Email Body:</label>
              <div className="body-text">{emailData.body}</div>
            </div>

            <div className="file-summary">
              <h4>📄 File Summary</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-label">File:</span>
                  <span className="summary-value">{fileData.fileName}</span>
                </div>
                {fileData.vendor && (
                  <div className="summary-item">
                    <span className="summary-label">Vendor:</span>
                    <span className="summary-value">{fileData.vendor}</span>
                  </div>
                )}
                {fileData.amount && (
                  <div className="summary-item">
                    <span className="summary-label">Amount:</span>
                    <span className="summary-value">{fileData.amount}</span>
                  </div>
                )}
                {fileData.invoiceNumber && (
                  <div className="summary-item">
                    <span className="summary-label">Invoice #:</span>
                    <span className="summary-value">{fileData.invoiceNumber}</span>
                  </div>
                )}
                {fileData.dueDate && (
                  <div className="summary-item">
                    <span className="summary-label">Due Date:</span>
                    <span className="summary-value">{fileData.dueDate}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="send-btn" onClick={onSend}>
            📧 Send Email
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailPreviewModal; 