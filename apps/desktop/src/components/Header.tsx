import React from 'react';
import './Header.css';

export type FilterMode = 'all' | 'duplicates' | 'regular';

interface HeaderProps {
  filesProcessed: number;
  pendingCount: number;
  duplicateCount: number;
  filterMode: FilterMode;
  searchQuery: string;
  currentFolder: string;
  selectedFilesCount: number;
  highConfidenceCount: number;
  onSettingsClick: () => void;
  onNotificationClick: () => void;
  onFilterModeChange: (mode: FilterMode) => void;
  onResolveAllDuplicates: () => void;
  onSearchChange: (query: string) => void;
  onBatchOperations: () => void;
  onViewModeToggle: () => void;
  onDismissActionBar?: () => void;
  showActionBar?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  filesProcessed,
  pendingCount,
  duplicateCount,
  filterMode,
  searchQuery,
  currentFolder,
  selectedFilesCount,
  highConfidenceCount,
  onSettingsClick,
  onNotificationClick,
  onFilterModeChange,
  onResolveAllDuplicates,
  onSearchChange,
  onBatchOperations,
  onViewModeToggle,
  onDismissActionBar,
  showActionBar,
}) => {
  const regularFilesCount = pendingCount - duplicateCount;

  const getFilterDisplayCount = (mode: FilterMode) => {
    switch (mode) {
      case 'duplicates': return duplicateCount;
      case 'regular': return regularFilesCount;
      case 'all': return pendingCount;
      default: return 0;
    }
  };

  const getSearchPlaceholder = () => {
    const modeText = {
      'all': `${pendingCount} pending files`,
      'duplicates': `${duplicateCount} duplicate files`,
      'regular': `${regularFilesCount} regular files`
    };
    return `Search ${modeText[filterMode]}... (⌘⇧F globally)`;
  };

  return (
    <header className="mac-header">
      {/* Title Bar - Mac Chrome Style */}
      <div className="title-bar">
        <div className="title-bar-left">
          <div className="mac-controls">
            <div className="mac-button close"></div>
            <div className="mac-button minimize"></div>
            <div className="mac-button maximize"></div>
          </div>
        </div>
        
        <div className="title-bar-center">
          <div className="app-title">
            <span className="app-name">SilentSort</span>
          </div>
        </div>
        
        <div className="title-bar-right">
          <button 
            className="title-bar-btn settings-btn"
            onClick={onSettingsClick}
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
            </svg>
          </button>
          <button 
            className="title-bar-btn notifications-btn"
            onClick={onNotificationClick}
            title="Notifications"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
            </svg>
            {pendingCount > 0 && (
              <span className="notification-badge">{pendingCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Search/Tab Bar - Chrome Inspired */}
      <div className="search-tab-bar">
        <div className="tab-buttons">
          <button
            className={`tab-btn ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => onFilterModeChange('all')}
          >
            All Files
            {pendingCount > 0 && <span className="tab-count">({pendingCount})</span>}
          </button>
          
          <button
            className={`tab-btn ${filterMode === 'duplicates' ? 'active' : ''} ${duplicateCount > 0 ? 'has-duplicates' : ''}`}
            onClick={() => onFilterModeChange('duplicates')}
            disabled={duplicateCount === 0}
          >
            Duplicates
            {duplicateCount > 0 && <span className="tab-count">({duplicateCount})</span>}
          </button>
          
          <button
            className={`tab-btn ${filterMode === 'regular' ? 'active' : ''}`}
            onClick={() => onFilterModeChange('regular')}
          >
            Regular Files
            {regularFilesCount > 0 && <span className="tab-count">({regularFilesCount})</span>}
          </button>
        </div>
        
        <div className="search-container">
          <div className="search-input-wrapper">
            <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
            <input
              id="search-input"
              type="text"
              placeholder={getSearchPlaceholder()}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                className="clear-search"
                onClick={() => onSearchChange('')}
                title="Clear search"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar - Minimal Stats & Actions */}
      {showActionBar && (
        <div className="action-bar">
          <div className="stats-summary">
            <span className="stats-text">
              {getFilterDisplayCount(filterMode)} {filterMode === 'all' ? 'pending' : filterMode} files
              {filesProcessed > 0 && (
                <>
                  <span className="stats-divider">•</span>
                  {filesProcessed} processed today
                </>
              )}
              {highConfidenceCount > 0 && (
                <>
                  <span className="stats-divider">•</span>
                  {highConfidenceCount} high confidence ready
                </>
              )}
            </span>
          </div>
          
          <div className="action-buttons">
            {selectedFilesCount > 0 && (
              <button
                className="action-btn batch"
                onClick={onBatchOperations}
                title={`Batch operations (${selectedFilesCount} selected)`}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z"/>
                  <path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z"/>
                </svg>
                <span className="action-badge">{selectedFilesCount}</span>
              </button>
            )}
            
            {/* {duplicateCount > 0 && (
              <button
                className="action-btn duplicates"
                onClick={onResolveAllDuplicates}
                title={`Resolve ${duplicateCount} duplicates`}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0H11Zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5h9.916Zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47ZM8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5Z"/>
                </svg>
                <span className="action-badge">{duplicateCount}</span>
              </button>
            )} */}
            
            {/* <button
              className="action-btn view-mode"
              onClick={onViewModeToggle}
              title="Toggle view mode"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
              </svg>
            </button> */}

            {onDismissActionBar && (
              <button
                className="action-btn dismiss"
                onClick={onDismissActionBar}
                title="Dismiss notification"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 