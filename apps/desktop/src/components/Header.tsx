import React from 'react';
import './Header.css';

interface HeaderProps {
  filesProcessed: number;
  pendingCount: number;
  onSettingsClick: () => void;
  onNotificationClick: () => void;
}

const Header: React.FC<HeaderProps> = ({
  filesProcessed,
  pendingCount,
  onSettingsClick,
  onNotificationClick,
}) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo-section">
          <div className="logo-icon">⚡</div>
          <div className="logo-text">
            <h1>SilentSort</h1>
            <span className="tagline">AI File Organization</span>
          </div>
        </div>
      </div>
      
      <div className="header-center">
        <div className="stats-compact">
          <div className="stat-item">
            <span className="stat-number">{filesProcessed}</span>
            <span className="stat-label">processed</span>
          </div>
          <div className="stat-divider">•</div>
          <div className={`stat-item ${pendingCount > 0 ? 'urgent' : ''}`}>
            <span className="stat-number">{pendingCount}</span>
            <span className="stat-label">pending</span>
          </div>
        </div>
      </div>
      
      <div className="header-right">
        <div className="action-group">
          <button 
            className="header-btn"
            onClick={onNotificationClick}
            title="Show batch operations"
          >
            <span className="btn-icon">⚡</span>
            <span className="btn-label">Batch</span>
            {pendingCount > 0 && (
              <span className="notification-dot">{pendingCount}</span>
            )}
          </button>
          
          <button 
            className="header-btn secondary"
            onClick={onSettingsClick}
            title="Settings"
          >
            <span className="btn-icon">⚙️</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 