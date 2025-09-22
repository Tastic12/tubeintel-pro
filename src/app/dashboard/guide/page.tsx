'use client';

import { useState } from 'react';
import { FaCheck, FaPlay, FaBook, FaYoutube } from 'react-icons/fa';

interface TutorialVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  watched: boolean;
}

export default function BeginnersGuidePage() {
  const [tutorials, setTutorials] = useState<TutorialVideo[]>([
    {
      id: '1',
      title: 'How To Make The Algorithm LOVE You (Step-By-Step Strategy)',
      description: 'Discover the step-by-step, data driven way to get YouTube\'s Saved Algorithm to figure out exactly what topics are trending and proven to get views in your niche.',
      thumbnailUrl: '/api/placeholder/320/180?text=Algorithm+Guide',
      youtubeUrl: 'https://youtube.com/watch?v=example1',
      watched: true
    },
    {
      id: '2',
      title: 'Complete Beginner Guide - How To Use Velio To Get More Views',
      description: 'Everything you need to use Velio to blow up your channel! Learn the essential features and strategies that top creators use to grow faster.',
      thumbnailUrl: '/api/placeholder/320/180?text=Beginner+Guide',
      youtubeUrl: 'https://youtube.com/watch?v=example2',
      watched: false
    },
    {
      id: '3',
      title: 'YouTube Analytics Mastery: Understanding Your Data',
      description: 'Deep dive into YouTube analytics and learn how to interpret your data to make better content decisions and grow your subscriber base.',
      thumbnailUrl: '/api/placeholder/320/180?text=Analytics+Master',
      youtubeUrl: 'https://youtube.com/watch?v=example3',
      watched: false
    },
    {
      id: '4',
      title: 'Competitor Research: Spy On Your Competition Legally',
      description: 'Learn how to analyze your competitors\' most successful videos, discover trending topics in your niche, and stay ahead of the game.',
      thumbnailUrl: '/api/placeholder/320/180?text=Competitor+Research',
      youtubeUrl: 'https://youtube.com/watch?v=example4',
      watched: false
    },
    {
      id: '5',
      title: 'Thumbnail Optimization: Get 10x More Clicks',
      description: 'Master the art of creating eye-catching thumbnails that get clicks. Learn design principles, A/B testing strategies, and what converts.',
      thumbnailUrl: '/api/placeholder/320/180?text=Thumbnail+Tips',
      youtubeUrl: 'https://youtube.com/watch?v=example5',
      watched: false
    },
    {
      id: '6',
      title: 'Content Strategy: From Zero to 100K Subscribers',
      description: 'Build a winning content strategy that attracts subscribers and keeps them engaged. Learn planning, consistency, and content pillars.',
      thumbnailUrl: '/api/placeholder/320/180?text=Content+Strategy',
      youtubeUrl: 'https://youtube.com/watch?v=example6',
      watched: false
    }
  ]);

  const toggleWatched = (id: string) => {
    setTutorials(prev => 
      prev.map(tutorial => 
        tutorial.id === id 
          ? { ...tutorial, watched: !tutorial.watched }
          : tutorial
      )
    );
  };

  const openVideo = (url: string) => {
    window.open(url, '_blank');
  };

  const watchedCount = tutorials.filter(t => t.watched).length;
  const totalCount = tutorials.length;

  return (
    <div className="w-full max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FaBook className="text-blue-500" size={32} />
          <h1 className="text-3xl font-bold dark:text-white">Beginner's Guide</h1>
        </div>
        <p className="text-gray-400 text-lg mb-4">
          Master YouTube growth with these essential tutorials. Learn the strategies that top creators use to get more views, subscribers, and engagement.
        </p>
        
        {/* Progress Indicator */}
        <div className="bg-white/10 dark:bg-[#00264d]/30 backdrop-blur-sm border border-white/10 dark:border-blue-400/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">Your Progress</span>
            <span className="text-white/70">{watchedCount}/{totalCount} completed</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(watchedCount / totalCount) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Tutorial Cards */}
      <div className="space-y-6">
        {tutorials.map((tutorial) => (
          <div
            key={tutorial.id}
            className="bg-white/10 dark:bg-[#00264d]/30 backdrop-blur-sm border border-white/10 dark:border-blue-400/20 rounded-xl overflow-hidden hover:bg-white/15 dark:hover:bg-[#00264d]/40 transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row">
              {/* Thumbnail */}
              <div className="md:w-80 flex-shrink-0 relative group">
                <img
                  src={tutorial.thumbnailUrl}
                  alt={tutorial.title}
                  className="w-full h-48 md:h-full object-cover"
                />
                {/* Play Overlay */}
                <div 
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                  onClick={() => openVideo(tutorial.youtubeUrl)}
                >
                  <FaPlay className="text-white text-3xl" />
                </div>
                {/* YouTube Icon */}
                <div className="absolute top-3 left-3 bg-red-600 text-white p-2 rounded-full">
                  <FaYoutube size={16} />
                </div>
                {/* Watched Badge */}
                {tutorial.watched && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white p-2 rounded-full">
                    <FaCheck size={14} />
                  </div>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-white pr-4 leading-tight">
                    {tutorial.title}
                  </h3>
                </div>
                
                <p className="text-gray-300 mb-4 leading-relaxed">
                  {tutorial.description}
                </p>
                
                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => openVideo(tutorial.youtubeUrl)}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <FaPlay size={14} />
                    Watch Tutorial
                  </button>
                  
                  {/* Watched Toggle */}
                  <button
                    onClick={() => toggleWatched(tutorial.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      tutorial.watched
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    <FaCheck size={14} />
                    {tutorial.watched ? 'Watched' : 'Mark as Watched'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Completion Message */}
      {watchedCount === totalCount && (
        <div className="mt-8 bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-xl p-6 text-center">
          <h3 className="text-2xl font-bold text-white mb-2">🎉 Congratulations!</h3>
          <p className="text-gray-300">
            You've completed all beginner tutorials! You're ready to start growing your YouTube channel with data-driven strategies.
          </p>
        </div>
      )}
    </div>
  );
} 