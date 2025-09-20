import React from 'react';

const Legend: React.FC = () => {
  const riskLevels = [
    { level: 'Very High', color: '#d73027', range: '80-100%' },
    { level: 'High', color: '#feb48b', range: '60-80%' },
    { level: 'Moderate', color: '#ffffbf', range: '40-60%' },
    { level: 'Low', color: '#66c2a5', range: '20-40%' },
    { level: 'Very Low', color: '#1a9850', range: '0-20%' }
  ];

  const markerSizes = [
    { size: 'Large', description: 'High risk area' },
    { size: 'Medium', description: 'Moderate risk area' },
    { size: 'Small', description: 'Low risk area' }
  ];

  return (
    <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-xs">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Risk Legend</h3>
      
      {/* Risk Level Colors */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Risk Levels</h4>
        <div className="space-y-2">
          {riskLevels.map((item) => (
            <div key={item.level} className="flex items-center">
              <div 
                className="w-4 h-4 rounded-full mr-3 border border-gray-300"
                style={{ backgroundColor: item.color }}
              ></div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">{item.level}</div>
                <div className="text-xs text-gray-500">{item.range}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Marker Sizes */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Marker Sizes</h4>
        <div className="space-y-2">
          {markerSizes.map((item) => (
            <div key={item.size} className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-500 mr-3 flex items-center justify-center">
                <div className="w-3 h-3 bg-white rounded-full"></div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">{item.size}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Info */}
      <div className="pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>• Risk scores combine elevation, flow accumulation, and rainfall factors</div>
          <div>• Larger markers indicate higher risk areas</div>
          <div>• Depression areas have increased risk</div>
          <div>• Risk updates with rainfall scenario changes</div>
        </div>
      </div>

      {/* Study Area Info */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <div className="font-medium text-gray-700 mb-1">Study Area</div>
          <div>Greater Fifth Ward, Houston</div>
          <div>High-resolution DEM analysis</div>
          <div>Hydrological flow modeling</div>
        </div>
      </div>
    </div>
  );
};

export default Legend;
