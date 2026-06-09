'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaChevronDown, FaChevronUp, FaCrown, FaRocket, FaDollarSign, FaYoutube, FaCog, FaComments } from 'react-icons/fa';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'pricing' | 'features' | 'technical' | 'upgrade' | 'support';
  isPro?: boolean;
}

const faqData: FAQItem[] = [
  // Upgrade-focused questions
  {
    id: 'why-upgrade',
    question: 'Why should I upgrade from Free to Pro?',
    answer: `Pro unlocks the tools serious creators use for research and trend-spotting:

• **Discover** — Browse trending videos by category and region
• **Thumbnails** — Search thumbnails by niche, style, or image across tracked channels
• **Unlimited Channels** — Create unlimited folders and track unlimited competitor channels (Free: 1 folder, up to 5 channels)
• **Unlimited Videos** — Create unlimited folders and save unlimited videos for research (Free: 1 folder, up to 5 videos)
• **Priority Support** — Faster help through our Discord community

The Free tier is great for getting started. Pro removes the limits and opens Discover and Thumbnails.`,
    category: 'upgrade',
    isPro: true
  },
  {
    id: 'free-vs-pro-limits',
    question: 'What are the Free vs Pro limits?',
    answer: `**Free tier includes:**
• Dashboard — analytics and performance for your connected channel
• Channels — 1 folder with up to 5 competitor channels
• Videos — 1 folder with up to 5 saved videos
• Beginner's Guide
• Community support via Discord

**Pro adds:**
• **Discover** — trending video browser (category & region filters)
• **Thumbnails** — thumbnail search and analysis
• **Unlimited** folders, channels, and saved videos
• Priority support via Discord`,
    category: 'upgrade',
    isPro: true
  },

  // General
  {
    id: 'what-is-clikstats',
    question: 'What is ClikStats?',
    answer: 'ClikStats is a YouTube analytics and research platform for content creators. Connect your channel to see performance on the Dashboard, track competitors in Channels, save videos for research in Videos, and — with Pro — explore trending content in Discover and search thumbnails in Thumbnails.',
    category: 'general'
  },
  {
    id: 'how-does-it-work',
    question: 'How does ClikStats work?',
    answer: `After sign-up, connect your YouTube channel during onboarding. ClikStats then pulls public data through YouTube's official API.

From the sidebar you can:
• **Dashboard** — your channel stats, recent uploads, and outlier scores
• **Channels** — organize competitor channels into folders and track their videos
• **Videos** — save individual videos into collections for research
• **Discover** *(Pro)* — browse trending videos by category and region
• **Thumbnails** *(Pro)* — search and compare thumbnails across your tracked content`,
    category: 'general'
  },
  {
    id: 'data-safety',
    question: 'Is my YouTube data safe and secure?',
    answer: 'Yes. ClikStats only accesses publicly available YouTube data through official APIs. We store the channel and video IDs you choose to track — not your YouTube login password. Auth and billing data are handled with industry-standard security practices.',
    category: 'general'
  },

  // Features
  {
    id: 'dashboard',
    question: 'What does the Dashboard show?',
    answer: 'The Dashboard is your home base for your connected channel. See subscriber and view trends, browse recent uploads, sort by views-per-hour (VPH), and spot outlier videos that are performing above your channel average. You can switch between list and grid views and filter out Shorts if you focus on long-form content.',
    category: 'features'
  },
  {
    id: 'competitor-tracking',
    question: 'How does Channels (competitor tracking) work?',
    answer: 'Channels lets you create folders (e.g. by niche) and add YouTube channels to each folder. ClikStats syncs their recent uploads so you can compare performance, spot trends, and study what competitors are publishing. Free users get 1 folder with up to 5 channels; Pro users get unlimited folders and channels.',
    category: 'features'
  },
  {
    id: 'video-collections',
    question: 'What are Video Collections?',
    answer: 'Videos lets you save individual YouTube videos into folders for content research — study titles, thumbnails, and performance of videos you want to learn from. Free users get 1 folder with up to 5 videos; Pro users get unlimited folders and videos.',
    category: 'features'
  },
  {
    id: 'discover',
    question: 'What is Discover?',
    answer: 'Discover is a Pro feature for browsing trending YouTube videos. Filter by category and region, sync the latest trending data, and optionally hide Shorts to focus on long-form content. It is a great way to spot what is taking off in your niche right now.',
    category: 'features',
    isPro: true
  },
  {
    id: 'thumbnails',
    question: 'What is the Thumbnails tool?',
    answer: `Thumbnails is a Pro feature for thumbnail research. You can:

• **Expand search** — find thumbnails on YouTube by niche and style keywords
• **Index search** — search across videos from your tracked Channels and Discover trending
• **Image search** — upload a reference image to find similar thumbnails
• **Similar thumbnails** — find lookalike thumbnails to a specific video

Use it to study what visual styles are working before you create your next thumbnail.`,
    category: 'features',
    isPro: true
  },

  // Pricing
  {
    id: 'pricing-plans',
    question: 'What are your pricing plans?',
    answer: `**Free** — $0/month
• Dashboard, Channels & Videos
• 1 folder with up to 5 channels
• 1 folder with up to 5 videos
• Community support via Discord

**Pro** — $29.99/month
• Everything in Free
• Discover (trending videos)
• Thumbnails (search & analysis)
• Unlimited folders, channels & videos
• Priority support via Discord`,
    category: 'pricing'
  },
  {
    id: 'free-trial',
    question: 'Is there a free trial for Pro?',
    answer: 'There is no separate Pro trial — the Free tier lets you use Dashboard, Channels, and Videos at no cost so you can see if ClikStats fits your workflow. Upgrade to Pro anytime from the subscription page when you want Discover, Thumbnails, and unlimited tracking.',
    category: 'pricing'
  },
  {
    id: 'cancel-anytime',
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes. Cancel Pro from your account billing settings. You keep Pro access (Discover, Thumbnails, unlimited limits) until the end of your current billing period, then your account returns to the Free tier limits automatically.',
    category: 'pricing'
  },

  // Technical
  {
    id: 'channel-connection',
    question: 'How do I connect my YouTube channel?',
    answer: 'During onboarding, search for your channel by name or paste your channel ID. ClikStats uses YouTube\'s official API to link your account — no YouTube password required. You can also update your connected channel later in Settings.',
    category: 'technical'
  },
  {
    id: 'data-updates',
    question: 'How often is my data updated?',
    answer: 'Dashboard and competitor data refresh when you load pages or trigger a sync. View counts, upload lists, and performance metrics are fetched from YouTube\'s API on demand. Discover trending data can be manually synced from the Discover page to pull the latest results for your chosen region and categories.',
    category: 'technical'
  },
  {
    id: 'multiple-channels',
    question: 'Can I track multiple YouTube channels I own?',
    answer: 'Each ClikStats account connects one primary channel for the Dashboard. You can add other channels you own — or any competitor — to your Channels folders to compare performance. Pro removes the folder and channel limits so you can track as many as you need.',
    category: 'technical'
  },
  {
    id: 'browser-support',
    question: 'Which browsers are supported?',
    answer: 'ClikStats works in modern browsers including Chrome, Firefox, Safari, and Edge. We recommend the latest version of Chrome or Firefox for the best experience. The app is responsive on tablets and phones, though desktop is ideal for research workflows.',
    category: 'technical'
  },

  // Support
  {
    id: 'how-support',
    question: 'How do I get support?',
    answer: 'Join our Discord server for help. Free users can ask questions in the community channels. Pro subscribers get priority support with faster responses for billing, technical issues, and feature questions.',
    category: 'support'
  },
  {
    id: 'priority-support',
    question: 'What is Priority Support?',
    answer: 'Priority Support is included with Pro. You get faster response times in Discord and direct help from our team for technical issues, billing questions, and feature requests. Free users still have access to the community — Pro just puts you at the front of the queue.',
    category: 'support',
    isPro: true
  }
];

const categories = [
  { id: 'upgrade', name: 'Upgrading to Pro', icon: FaCrown, color: 'text-yellow-500' },
  { id: 'general', name: 'General', icon: FaYoutube, color: 'text-red-500' },
  { id: 'features', name: 'Features', icon: FaRocket, color: 'text-blue-500' },
  { id: 'pricing', name: 'Pricing', icon: FaDollarSign, color: 'text-green-500' },
  { id: 'technical', name: 'Technical', icon: FaCog, color: 'text-purple-500' },
  { id: 'support', name: 'Support', icon: FaComments, color: 'text-purple-500' }
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<string[]>(['why-upgrade']); // Open the most important question by default
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleItem = (id: string) => {
    setOpenItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const filteredFAQs = selectedCategory === 'all' 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
        <Link href="/" className="flex items-center">
          <div className="text-[#4361ee] text-3xl font-bold flex items-center">
            <span className="mr-2">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 0C8.95 0 0 8.95 0 20C0 31.05 8.95 40 20 40C31.05 40 40 31.05 40 20C40 8.95 31.05 0 20 0ZM16 29V11L30 20L16 29Z" fill="#4361ee"/>
              </svg>
            </span>
            ClikStats
          </div>
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/login" className="text-[#CCC] hover:text-white transition-colors">
            Login
          </Link>
          <Link href="/signup" className="bg-[#4361ee] text-white px-4 py-2 rounded-full hover:bg-[#3a56d4] transition-colors">
            Sign Up
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Everything you need to know about ClikStats, our features, and how to grow your YouTube channel faster.
          </p>
        </div>

        {/* Upgrade CTA Banner */}
        <div className="bg-gradient-to-r from-[#4361ee] to-[#7209b7] rounded-xl p-6 mb-8 text-center">
          <div className="flex items-center justify-center mb-3">
            <FaCrown className="text-yellow-400 mr-2" size={24} />
            <h2 className="text-2xl font-bold">Ready to Supercharge Your Channel?</h2>
          </div>
          <p className="text-lg mb-4 opacity-90">
            Unlock Discover, Thumbnails, and unlimited channel &amp; video tracking
          </p>
          <Link 
            href="/subscription" 
            className="inline-block bg-white text-[#4361ee] px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition-colors"
          >
            Upgrade to Pro - $29.99/month
          </Link>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#4361ee] text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Questions
          </button>
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-[#4361ee] text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Icon className={category.color} size={16} />
                {category.name}
              </button>
            );
          })}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.map(item => (
            <div 
              key={item.id} 
              className={`bg-[#1a1a1a] rounded-xl border transition-all duration-200 ${
                item.isPro 
                  ? 'border-yellow-500/30 bg-gradient-to-r from-[#1a1a1a] to-[#2a1a00]' 
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full p-6 text-left flex justify-between items-center hover:bg-white/5 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  {item.isPro && <FaCrown className="text-yellow-500 flex-shrink-0" size={18} />}
                  <h3 className="text-lg font-semibold text-white pr-4">
                    {item.question}
                  </h3>
                </div>
                {openItems.includes(item.id) ? (
                  <FaChevronUp className="text-gray-400 flex-shrink-0" />
                ) : (
                  <FaChevronDown className="text-gray-400 flex-shrink-0" />
                )}
              </button>
              
              {openItems.includes(item.id) && (
                <div className="px-6 pb-6">
                  <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {item.answer}
                  </div>
                  {item.isPro && (
                    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FaCrown className="text-yellow-500" size={16} />
                        <span className="font-semibold text-yellow-400">Pro Feature</span>
                      </div>
                      <p className="text-sm text-gray-300">
                        This feature is available with ClikStats Pro. 
                        <Link href="/subscription" className="text-yellow-400 hover:text-yellow-300 ml-1 underline">
                          Upgrade now to unlock this and many more advanced features.
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center bg-[#1a1a1a] rounded-xl p-8">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-gray-400 mb-6">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/signup" 
              className="bg-[#4361ee] text-white px-8 py-3 rounded-full font-medium hover:bg-[#3a56d4] transition-colors"
            >
              Get Started Free
            </Link>
            <a 
              href="https://discord.gg/asghh6CJra" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gray-800 text-white px-8 py-3 rounded-full font-medium hover:bg-gray-700 transition-colors"
            >
              Join Our Discord
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#0a0a0a] py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500">
          <p>&copy; {new Date().getFullYear()} ClikStats. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}