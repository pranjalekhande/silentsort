import React from 'react';
import './CalendarPreviewModal.css';

interface CalendarPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCalendar: () => void;
  calendarData: {
    title: string;
    description: string;
    dueDate: string;
    reminders: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
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

const CalendarPreviewModal: React.FC<CalendarPreviewModalProps> = ({
  isOpen,
  onClose,
  onAddToCalendar,
  calendarData,
  fileData
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatReminderTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  };

  const getReminderIcon = (method: string) => {
    switch (method) {
      case 'email': return '📧';
      case 'popup': return '🔔';
      default: return '⏰';
    }
  };

  const formatDueDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const getDaysUntilDue = (dateString: string) => {
    try {
      const dueDate = new Date(dateString);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) {
        return { days: Math.abs(diffDays), status: 'overdue' };
      } else if (diffDays === 0) {
        return { days: 0, status: 'today' };
      } else {
        return { days: diffDays, status: 'upcoming' };
      }
    } catch (error) {
      return { days: 0, status: 'unknown' };
    }
  };

  const dueDateInfo = getDaysUntilDue(calendarData.dueDate);

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="calendar-preview-modal">
        <div className="modal-header">
          <h2>📅 Calendar Preview</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-content">
          <div className="calendar-details">
            <div className="event-header">
              <div className="event-title">
                <label>Event Title:</label>
                <div className="title-text">{calendarData.title}</div>
              </div>
              
              <div className="due-date-info">
                <div className="due-date">
                  <span className="due-label">Due Date:</span>
                  <span className="due-value">{formatDueDate(calendarData.dueDate)}</span>
                </div>
                <div className={`due-status ${dueDateInfo.status}`}>
                  {dueDateInfo.status === 'overdue' && (
                    <span className="status-badge overdue">
                      🚨 {dueDateInfo.days} days overdue
                    </span>
                  )}
                  {dueDateInfo.status === 'today' && (
                    <span className="status-badge today">
                      🎯 Due today
                    </span>
                  )}
                  {dueDateInfo.status === 'upcoming' && (
                    <span className="status-badge upcoming">
                      📅 Due in {dueDateInfo.days} day{dueDateInfo.days > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="event-description">
              <label>Event Description:</label>
              <div className="description-text">{calendarData.description}</div>
            </div>

            <div className="reminders-section">
              <h4>🔔 Reminders</h4>
              <div className="reminders-list">
                {calendarData.reminders.map((reminder, index) => (
                  <div key={index} className="reminder-item">
                    <span className="reminder-icon">
                      {getReminderIcon(reminder.method)}
                    </span>
                    <span className="reminder-text">
                      {formatReminderTime(reminder.minutes)} before ({reminder.method})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="file-summary">
              <h4>📄 Related File</h4>
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
                <div className="summary-item">
                  <span className="summary-label">Category:</span>
                  <span className="summary-value">{fileData.category}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="add-calendar-btn" onClick={onAddToCalendar}>
            📅 Add to Calendar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarPreviewModal; 