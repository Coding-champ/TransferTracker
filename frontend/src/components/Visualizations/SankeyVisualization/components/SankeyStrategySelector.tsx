import React, { useState } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { SankeyStrategy, SankeyStrategyConfig, NetworkData } from '../../../../types';
import { SANKEY_STRATEGIES } from '../strategies';
import { useStrategyPreview } from '../hooks/useSankeyDataStrategy';

interface SankeyStrategySelectorProps {
  currentConfig: SankeyStrategyConfig;
  onConfigChange: (config: SankeyStrategyConfig) => void;
  networkData: NetworkData | null;
  className?: string;
}

interface StrategyPreviewProps {
  strategy: SankeyStrategy;
  networkData: NetworkData | null;
  valueType?: 'sum' | 'count';
}

const StrategyPreview: React.FC<StrategyPreviewProps> = ({ strategy, networkData, valueType = 'sum' }) => {
  const preview = useStrategyPreview(networkData, strategy, valueType);

  if (!preview.hasData) {
    return (
      <div className="text-xs text-gray-500 mt-1">
        No data available for this strategy
      </div>
    );
  }

  return (
    <div className="text-xs text-gray-600 mt-1 space-y-1">
      <div className="flex justify-between">
        <span>Nodes:</span>
        <span className="font-medium">{preview.nodeCount}</span>
      </div>
      <div className="flex justify-between">
        <span>Flows:</span>
        <span className="font-medium">{preview.linkCount}</span>
      </div>
      <div className="flex justify-between">
        <span>{valueType === 'count' ? 'Total Count:' : 'Total Value:'}</span>
        <span className="font-medium">
          {valueType === 'count' ? 
            preview.totalValue.toString() : 
            `€${(preview.totalValue / 1000000).toFixed(1)}M`
          }
        </span>
      </div>
      {preview.hasCycles && (
        <div className="text-orange-600 text-xs">
          ⚠ Contains cycles
        </div>
      )}
    </div>
  );
};

const SankeyStrategySelector: React.FC<SankeyStrategySelectorProps> = ({
  currentConfig,
  onConfigChange,
  networkData,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const currentStrategy = SANKEY_STRATEGIES.find(s => s.id === currentConfig.selectedStrategy) || SANKEY_STRATEGIES[0];

  const handleStrategySelect = (strategy: SankeyStrategy) => {
    onConfigChange({
      ...currentConfig,
      selectedStrategy: strategy.id
    });
    setIsOpen(false);
  };

  const handleCustomSettingChange = (key: keyof NonNullable<SankeyStrategyConfig['customSettings']>, value: any) => {
    onConfigChange({
      ...currentConfig,
      customSettings: {
        ...currentConfig.customSettings,
        [key]: value
      }
    });
  };

  // Group strategies by aggregation level
  const strategiesByLevel = SANKEY_STRATEGIES.reduce((acc, strategy) => {
    if (!acc[strategy.aggregationLevel]) {
      acc[strategy.aggregationLevel] = [];
    }
    acc[strategy.aggregationLevel].push(strategy);
    return acc;
  }, {} as Record<string, SankeyStrategy[]>);

  return (
    <div className={`relative ${className}`}>
      {/* Main Strategy Selector */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Sankey Strategy</h3>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-gray-400 hover:text-gray-600"
              title="Show strategy previews"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
          
          {/* Current Strategy Display */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full mt-2 p-3 text-left bg-gray-50 border rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{currentStrategy.name}</div>
                <div className="text-sm text-gray-600 mt-1">{currentStrategy.description}</div>
              </div>
              <ChevronDown 
                className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              />
            </div>
          </button>
        </div>

        {/* Strategy Dropdown */}
        {isOpen && (
          <div className="p-4 border-b max-h-96 overflow-y-auto">
            <div className="space-y-4">
              {Object.entries(strategiesByLevel).map(([level, strategies]) => (
                <div key={level}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                    {level} Level
                  </h4>
                  <div className="space-y-2">
                    {strategies.map((strategy) => (
                      <button
                        key={strategy.id}
                        onClick={() => handleStrategySelect(strategy)}
                        className={`w-full p-3 text-left border rounded-md transition-colors ${
                          strategy.id === currentConfig.selectedStrategy
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{strategy.name}</div>
                            <div className="text-sm text-gray-600 mt-1">{strategy.description}</div>
                            <div className="flex gap-2 mt-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                strategy.flowType === 'bidirectional' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {strategy.flowType === 'bidirectional' ? 'Bidirectional' : 'Net Flows'}
                              </span>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                                {strategy.aggregationLevel}
                              </span>
                            </div>
                          </div>
                          {showPreview && (
                            <div className="ml-4 w-32 flex-shrink-0">
                              <StrategyPreview strategy={strategy} networkData={networkData} valueType={currentConfig.customSettings?.valueType} />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Settings */}
        <div className="p-4 space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Settings</h4>
          
          {/* Value Type Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Display Type
            </label>
            <select
              value={currentConfig.customSettings?.valueType || 'sum'}
              onChange={(e) => handleCustomSettingChange('valueType', e.target.value as 'sum' | 'count')}
              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sum">Transfer Sum</option>
              <option value="count">Transfer Count</option>
            </select>
          </div>
          
          {/* Minimum Flow Value */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {currentConfig.customSettings?.valueType === 'count' ? 'Minimum Transfer Count' : 'Minimum Flow Value (€M)'}
            </label>
            <input
              type="number"
              min="0"
              step={currentConfig.customSettings?.valueType === 'count' ? "1" : "0.1"}
              value={currentConfig.customSettings?.minimumFlowValue ? 
                (currentConfig.customSettings?.valueType === 'count' ? 
                  currentConfig.customSettings.minimumFlowValue : 
                  (currentConfig.customSettings.minimumFlowValue / 1000000).toFixed(1)
                ) : ''
              }
              onChange={(e) => {
                const value = e.target.value ? 
                  (currentConfig.customSettings?.valueType === 'count' ? 
                    parseInt(e.target.value) : 
                    parseFloat(e.target.value) * 1000000
                  ) : undefined;
                handleCustomSettingChange('minimumFlowValue', value);
              }}
              placeholder={currentConfig.customSettings?.valueType === 'count' ? 'No minimum' : 'No minimum'}
              className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Show Self Loops */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showSelfLoops"
              checked={currentConfig.customSettings?.showSelfLoops ?? false}
              onChange={(e) => handleCustomSettingChange('showSelfLoops', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="showSelfLoops" className="ml-2 text-sm text-gray-700">
              Show self-referencing flows
            </label>
          </div>

          {/* Enable Filtering */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableFiltering"
              checked={currentConfig.customSettings?.enableFiltering ?? true}
              onChange={(e) => handleCustomSettingChange('enableFiltering', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enableFiltering" className="ml-2 text-sm text-gray-700">
              Enable dynamic filtering
            </label>
          </div>
        </div>

        {/* Strategy Info */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="text-xs text-gray-600">
            <div className="flex justify-between mb-1">
              <span>Flow Type:</span>
              <span className="font-medium capitalize">{currentStrategy.flowType}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Aggregation:</span>
              <span className="font-medium capitalize">{currentStrategy.aggregationLevel}</span>
            </div>
            {networkData && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <StrategyPreview strategy={currentStrategy} networkData={networkData} valueType={currentConfig.customSettings?.valueType} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SankeyStrategySelector;