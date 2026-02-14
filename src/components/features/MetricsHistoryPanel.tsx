'use client';

import { useState } from 'react';
import { FaHistory, FaChartLine } from 'react-icons/fa';
import HistoricalMetricsChart from './HistoricalMetricsChart';

interface MetricsHistoryPanelProps {
  channelId: string;
}

export default function MetricsHistoryPanel({ channelId }: MetricsHistoryPanelProps) {
  const [selectedTimeSpan, setSelectedTimeSpan] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'view_count' | 'subscriber_count' | 'like_count'>('view_count');
  
  const formatMetricName = (metric: string) => {
    switch (metric) {
      case 'view_count': return 'Views';
      case 'subscriber_count': return 'Subscribers';
      case 'like_count': return 'Likes';
      default: return metric;
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FaHistory className="text-blue-500" />
          Metrics History
        </h2>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Metric
          </label>
          <div className="flex rounded-md shadow-sm">
            {(['view_count', 'subscriber_count', 'like_count'] as const).map((metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`flex-1 px-3 py-2 text-sm
                  ${selectedMetric === metric 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}
                  ${metric === 'view_count' ? 'rounded-l-md' : ''}
                  ${metric === 'like_count' ? 'rounded-r-md' : ''}
                `}
              >
                {formatMetricName(metric)}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Time Period
          </label>
          <div className="flex rounded-md shadow-sm">
            {(['7d', '30d', '90d'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedTimeSpan(period)}
                className={`flex-1 px-3 py-2 text-sm
                  ${selectedTimeSpan === period 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}
                  ${period === '7d' ? 'rounded-l-md' : ''}
                  ${period === '90d' ? 'rounded-r-md' : ''}
                `}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
        <HistoricalMetricsChart
          channelId={channelId}
          metric={selectedMetric}
          timeSpan={selectedTimeSpan}
          title={`${formatMetricName(selectedMetric)} History - Last ${selectedTimeSpan}`}
          height={300}
        />
      </div>
      
      <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-300">
        <div className="flex gap-2 items-start">
          <FaChartLine className="mt-1 flex-shrink-0" />
          <p>
            ClikStats automatically collects daily metrics to build accurate trend data. Historical charts will populate as data is collected. For accurate 30-day trends, the system needs at least 30 days of data.
          </p>
        </div>
      </div>
    </div>
  );
}
