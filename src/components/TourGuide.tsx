'use client';

import { useState, useEffect, useRef } from 'react';
import { FaTimes, FaArrowRight, FaArrowLeft, FaPlay } from 'react-icons/fa';
import { getTourCompletionStatus, markTourAsCompleted } from '@/lib/tour-utils';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: string; // Optional action text
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to ClikStats! 🎉',
    content: 'Let\'s show you how to get the most out of ClikStats and all the powerful features we have to offer.',
    target: 'body',
    position: 'bottom'
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    content: 'This is your main dashboard where you\'ll see your connected channel and its stats. This is what you\'ll see every time you visit.',
    target: '[data-tour-target="dashboard"]',
    position: 'right'
  },
  {
    id: 'sidebar',
    title: 'Channels',
    content: 'Here you can add and track YouTube channels to monitor their performance, growth, and content strategies.',
    target: '[href="/dashboard/competitors"]',
    position: 'right'
  },
  {
    id: 'videos',
    title: 'Video Collections',
    content: 'Save and analyze specific videos that interest you. Perfect for studying successful content.',
    target: '[href="/dashboard/videos"]',
    position: 'right'
  },
  {
    id: 'guide',
    title: 'Beginner\'s Guide',
    content: 'New to ClikStats? Check out our comprehensive guide to get started.',
    target: '[href="/dashboard/guide"]',
    position: 'right'
  },
  {
    id: 'user-menu',
    title: 'User Menu',
    content: 'Access Discord community, FAQ page, billing, help resources, settings, and logout from your user menu.',
    target: '[data-tour-target="user-menu"]',
    position: 'left'
  }
];

interface TourGuideProps {
  onComplete?: () => void;
}

export default function TourGuide({ onComplete }: TourGuideProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Check if user has seen the tour before
  useEffect(() => {
    const checkTourStatus = async () => {
      try {
        const hasSeenTour = await getTourCompletionStatus();
        const isFromOnboarding = window.location.href.includes('from=onboarding') || 
                                sessionStorage.getItem('just-completed-onboarding');
        
        console.log('TourGuide: Checking tour status', {
          hasSeenTour,
          isFromOnboarding,
          shouldStartTour: !hasSeenTour || isFromOnboarding
        });
        
        // Clear the onboarding flag if it exists
        if (isFromOnboarding) {
          sessionStorage.removeItem('just-completed-onboarding');
          console.log('TourGuide: Cleared onboarding flag, starting tour');
        }
        
        if (!hasSeenTour || isFromOnboarding) {
          console.log('TourGuide: Starting tour with delay');
          // Small delay to ensure page is fully loaded
          setTimeout(() => {
            setIsActive(true);
          }, 1500); // Slightly longer delay for better reliability
        }
      } catch (error) {
        console.error('TourGuide: Error checking tour status:', error);
        // Fallback to localStorage check
        const hasSeenTourLocal = localStorage.getItem('clikstats-tour-completed');
        if (!hasSeenTourLocal) {
          setTimeout(() => {
            setIsActive(true);
          }, 1500);
        }
      }
    };

    checkTourStatus();

    // Listen for storage changes (in case user completes tour in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clikstats-tour-completed' && e.newValue === 'true') {
        setIsActive(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update target element and position when step changes
  useEffect(() => {
    if (!isActive) return;

    const step = tourSteps[currentStep];
    if (!step) return;

    const element = document.querySelector(step.target) as HTMLElement;
    if (element) {
      setTargetElement(element);
      updateTooltipPosition(element, step.position);
      
      // Scroll element into view
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
    }
  }, [currentStep, isActive]);

  const updateTooltipPosition = (element: HTMLElement, position: string) => {
    const rect = element.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 200;
    
    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - 20;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
      case 'bottom':
        top = rect.bottom + 20;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.left - tooltipWidth - 20;
        break;
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.right + 20;
        break;
    }

    // Keep tooltip within viewport
    const padding = 20;
    top = Math.max(padding, Math.min(window.innerHeight - tooltipHeight - padding, top));
    left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));

    setTooltipPosition({ top, left });
  };

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTour = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    console.log('TourGuide: Tour completed by user');
    
    try {
      // Mark tour as completed in Supabase
      await markTourAsCompleted();
      console.log('TourGuide: Tour completion saved to database');
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('tour-completed'));
    } catch (error) {
      console.error('TourGuide: Error saving tour completion:', error);
      // Fallback to localStorage is handled in markTourAsCompleted
      // Still dispatch the event even if database save failed
      window.dispatchEvent(new CustomEvent('tour-completed'));
    }
    
    setIsActive(false);
    onComplete?.();
  };

  // Allow manual tour restart (for testing or user preference)
  const restartTour = () => {
    localStorage.removeItem('clikstats-tour-completed');
    setCurrentStep(0);
    setIsActive(true);
  };

  if (!isActive) {
    return null;
  }

  const step = tourSteps[currentStep];
  if (!step) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black/20 z-50"
        style={{ pointerEvents: 'none' }}
      >
        {/* Highlight spotlight for target element */}
        {targetElement && (
          <div
            className="absolute border-4 border-blue-400 rounded-lg shadow-lg"
            style={{
              top: targetElement.getBoundingClientRect().top - 4,
              left: targetElement.getBoundingClientRect().left - 4,
              width: targetElement.getBoundingClientRect().width + 8,
              height: targetElement.getBoundingClientRect().height + 8,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
              pointerEvents: 'none'
            }}
          />
        )}

        {/* Tooltip */}
        <div
          className="absolute bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            pointerEvents: 'auto'
          }}
        >
          {/* Close button */}
          <button
            onClick={skipTour}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <FaTimes size={16} />
          </button>

          {/* Content */}
          <div className="pr-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">
              {step.content}
            </p>

            {step.action && (
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg text-sm mb-4">
                💡 {step.action}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep 
                      ? 'bg-blue-500' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-1 px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white text-sm transition-colors"
                >
                  <FaArrowLeft size={12} />
                  Back
                </button>
              )}
              
              <button
                onClick={nextStep}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                {currentStep < tourSteps.length - 1 && <FaArrowRight size={12} />}
              </button>
            </div>
          </div>

          {/* Step counter */}
          <div className="text-center mt-3 text-xs text-gray-500 dark:text-gray-400">
            {currentStep + 1} of {tourSteps.length}
          </div>
        </div>
      </div>
    </>
  );
} 