import React, { useMemo } from 'react';
import { HeatmapMode } from '../types';
import { createHeatmapColorScale, formatColorScaleValue } from '../utils/colorScales';

interface HeatmapColorScaleProps {
  mode: HeatmapMode;
  values: number[];
  className?: string;
}

export const HeatmapColorScale: React.FC<HeatmapColorScaleProps> = ({
  mode,
  values,
  className = ''
}) => {
  const { colorScale, scaleValues, title } = useMemo(() => {
    const colorScale = createHeatmapColorScale(mode, values);
    const [min, max] = colorScale.domain();
    
    // Create 5 equally spaced values for the scale
    const scaleValues = [];
    for (let i = 0; i <= 4; i++) {
      scaleValues.push(min + (max - min) * (i / 4));
    }
    
    const title = mode === 'value' ? 'Transfer Value' :
                 mode === 'count' ? 'Transfer Count' :
                 'Success Rate';
    
    return { colorScale, scaleValues, title };
  }, [mode, values]);

  return (
    <div className={`bg-white border rounded-lg p-3 shadow-sm ${className}`}>
      <div className="text-xs text-gray-600 mb-2 font-medium">{title}</div>
      <div className="flex items-center gap-1">
        {/* Color gradient bar */}
        <div className="flex h-4 rounded overflow-hidden border" style={{ width: '120px' }}>
          {scaleValues.map((value, index) => (
            <div
              key={index}
              className="flex-1"
              style={{ backgroundColor: colorScale(value) }}
            />
          ))}
        </div>
      </div>
      {/* Scale labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-1" style={{ width: '120px' }}>
        <span>{formatColorScaleValue(scaleValues[0], mode)}</span>
        <span>{formatColorScaleValue(scaleValues[scaleValues.length - 1], mode)}</span>
      </div>
    </div>
  );
};