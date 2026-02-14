'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type MetricType = 'view_count' | 'like_count' | 'comment_count' | 'vph' | 'subscriber_count';
type TimeSpan = '7d' | '30d' | '90d';

interface HistoricalMetricsChartProps {
  channelId?: string;
  videoId?: string;
  metric: MetricType;
  timeSpan: TimeSpan;
  title: string;
  height?: number;
}

export default function HistoricalMetricsChart({
  channelId,
  videoId,
  metric,
  timeSpan,
  title,
  height = 300
}: HistoricalMetricsChartProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chartData, setChartData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistoricalData() {
      try {
        setIsLoading(true);
        setError(null);
        
        const user = await getCurrentUser();
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        const endDate = new Date();
        const startDate = new Date();
        
        switch (timeSpan) {
          case '7d':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(startDate.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(startDate.getDate() - 90);
            break;
        }
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let metricsData: any[] = [];
        let queryError: Error | null = null;
        
        if (videoId) {
          const response = await supabase
            .from('video_metrics_history')
            .select('recorded_at, ' + metric)
            .eq('user_id', user.id)
            .eq('video_id', videoId)
            .gte('recorded_at', startDate.toISOString())
            .lte('recorded_at', endDate.toISOString())
            .order('recorded_at', { ascending: true });
            
          metricsData = response.data || [];
          queryError = response.error;
        } else if (channelId) {
          const channelMetricMap: Record<MetricType, string> = {
            view_count: 'total_views',
            like_count: 'total_likes',
            subscriber_count: 'subscriber_count',
            vph: 'total_views',
            comment_count: 'total_views'
          };
          
          const channelMetric = channelMetricMap[metric];
          
          const response = await supabase
            .from('channel_metrics_history')
            .select('recorded_at, ' + channelMetric)
            .eq('user_id', user.id)
            .eq('channel_id', channelId)
            .gte('recorded_at', startDate.toISOString())
            .lte('recorded_at', endDate.toISOString())
            .order('recorded_at', { ascending: true });
            
          metricsData = response.data || [];
          queryError = response.error;
        } else {
          throw new Error('Either channelId or videoId must be provided');
        }
        
        if (queryError) {
          throw queryError;
        }
        
        if (!metricsData || metricsData.length === 0) {
          setChartData({
            labels: [],
            datasets: [{
              label: formatMetricLabel(metric),
              data: [],
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              tension: 0.4
            }]
          });
          setIsLoading(false);
          return;
        }
        
        const labels = metricsData.map((item: Record<string, unknown>) => 
          new Date(item.recorded_at as string).toLocaleDateString()
        );
        
        const metricValues = metricsData.map((item: Record<string, unknown>) => {
          if (videoId) {
            return (item[metric] as number) || 0;
          } else if (channelId) {
            switch (metric) {
              case 'view_count': 
                return (item.total_views as number) || 0;
              case 'subscriber_count':
                return (item.subscriber_count as number) || 0;
              case 'like_count':
                return (item.total_likes as number) || 0;
              default:
                return 0;
            }
          }
          return 0;
        });
        
        setChartData({
          labels,
          datasets: [{
            label: formatMetricLabel(metric),
            data: metricValues,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.4
          }]
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load historical data';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchHistoricalData();
  }, [channelId, videoId, metric, timeSpan]);
  
  const formatMetricLabel = (metricName: MetricType): string => {
    switch (metricName) {
      case 'view_count':
        return 'Views';
      case 'like_count':
        return 'Likes';
      case 'comment_count':
        return 'Comments';
      case 'vph':
        return 'Views Per Hour';
      case 'subscriber_count':
        return 'Subscribers';
      default:
        return 'Value';
    }
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p>Loading historical data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }
  
  if (!chartData || chartData.labels.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p>No historical data available yet. As you use ClikStats, we&apos;ll collect data daily to build this chart.</p>
      </div>
    );
  }
  
  return (
    <div style={{ height }}>
      <Line options={options} data={chartData} />
    </div>
  );
}
