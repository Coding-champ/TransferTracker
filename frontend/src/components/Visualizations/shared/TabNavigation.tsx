import React from 'react';
import { TabConfig, VisualizationType } from '../../../types';

interface TabNavigationProps {
  tabs: TabConfig[];
  activeTab: VisualizationType;
  onTabChange: (tab: VisualizationType) => void;
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => {
  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2
              ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : tab.disabled
                ? 'border-transparent text-gray-400 cursor-not-allowed'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            title={tab.description}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.disabled && (
              <span className="text-xs bg-gray-100 text-gray-600 px-1 rounded">
                Soon
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TabNavigation;