import React, { useState } from 'react';
import './CollapsibleSection.css';

interface CollapsibleSectionProps {
  title: string;
  count: number;
  type: 'duplicate' | 'regular';
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  count,
  type,
  children,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getIcon = () => {
    if (type === 'duplicate') {
      return '●'; // Circle for duplicate files
    }
    return '📄'; // Document icon for regular files
  };

  return (
    <div className="collapsible-section">
      <button
        className={`collapsible-header ${isExpanded ? 'expanded' : ''}`}
        onClick={toggleExpanded}
      >
        <div className="section-left">
          <div className={`section-icon ${type}`}>
            {getIcon()}
          </div>
          <h3 className="section-title">
            {title}
            <span className="section-count"> ({count})</span>
          </h3>
        </div>
        <div className={`section-toggle ${isExpanded ? 'expanded' : ''}`}>
          ▸
        </div>
      </button>
      
      <div className={`collapsible-content ${isExpanded ? 'expanded' : ''}`}>
        <div className="section-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection; 