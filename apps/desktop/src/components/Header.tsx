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
          <div className="logo-icon">📁</div>
          <div className="logo-text">
            <h1>SilentSort</h1>
            <span className="tagline">AI File Organization</span>
          </div>
        </div>
      </div>
      
      <div className="header-center">
        <div className="quick-stats">
          <div className="stat-item">
            <span className="stat-value">{filesProcessed}</span>
            <span className="stat-label">Processed Today</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item urgent">
            <span className="stat-value">{pendingCount}</span>
            <span className="stat-label">Need Review</span>
          </div>
        </div>
      </div>
      
      <div className="header-right">
        <button 
          className="icon-button notification-btn"
          onClick={onNotificationClick}
          title="Notifications"
        >
          <span className="icon">🔔</span>
          {pendingCount > 0 && (
            <span className="notification-badge">{pendingCount}</span>
          )}
        </button>
        
        <button 
          className="icon-button settings-btn"
          onClick={onSettingsClick}
          title="Settings"
        >
          <span className="icon">⚙️</span>
        </button>
      </div>
    </header>
  );
};

export default Header; 