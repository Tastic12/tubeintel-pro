'use client';

import { useState, useRef, useEffect } from 'react';
import { competitorsApi, competitorListsApi } from '@/services/api';
import { Competitor } from '@/types';
import { FaPlus, FaTimes, FaEllipsisV, FaThumbtack, FaPencilAlt, FaCopy, FaTrash, FaYoutube, FaChartLine, FaUsers, FaGlobe, FaGamepad, FaLaptop, FaFilm, FaMusic, FaRegStar, FaCrown, FaLock } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSubscription } from '@/hooks/useSubscription';

// Interface for competitor lists
interface CompetitorList {
  id: string;
  name: string;
  isPinned: boolean;
  competitors: Competitor[];
}

export default function CompetitorsPage() {
  const router = useRouter();
  const { plan, isSubscribed, isLoading: subscriptionLoading } = useSubscription();
  const [competitorLists, setCompetitorLists] = useState<CompetitorList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [listName, setListName] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [listCategory, setListCategory] = useState('default');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'folders' | 'channels'>('folders');
  const menuRef = useRef<HTMLDivElement>(null);

  // Free tier limits
  const FREE_TIER_NICHE_FOLDER_LIMIT = 1;
  const FREE_TIER_CHANNEL_LIMIT = 5;

  // Check if user can create more niche folders
  const canCreateFolder = () => {
    if (isSubscribed || plan !== 'free') return true;
    return competitorLists.length < FREE_TIER_NICHE_FOLDER_LIMIT;
  };

  // Show upgrade modal for niche folder limit
  const showFolderUpgradePrompt = () => {
    setUpgradeReason('folders');
    setShowUpgradeModal(true);
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, []);

  // Function to refresh competitor lists from Supabase
  const refreshData = async () => {
    try {
      setIsLoading(true);
      
      console.log("Refreshing competitor lists from Supabase...");
      
      // Get lists from Supabase
      const lists = await competitorListsApi.getUserLists();
      console.log("Retrieved lists for refresh:", lists);
      
      if (lists.length === 0) {
        console.log("No lists found during refresh");
        setCompetitorLists([]);
        return;
      }
      
      // We need to fetch competitors for each list
      console.log("Fetching current competitors for each list during refresh");
      const listsWithCompetitors = await Promise.all(
        lists.map(async (list) => {
          console.log(`Refreshing competitors for list ${list.id} (${list.name})...`);
          // Get competitors for this list from Supabase - this ensures we get what's actually in the database
          const competitors = await competitorListsApi.getCompetitorsInList(list.id);
          console.log(`Found ${competitors.length} competitors in list ${list.id} during refresh`);
          
          // Convert from DB format to our app format
          const formattedCompetitors = competitors.map(c => ({
            id: c.id,
            youtubeId: c.youtubeId,
            name: c.name,
            thumbnailUrl: c.thumbnailUrl || '',
            subscriberCount: c.subscriberCount || 0,
            videoCount: c.videoCount || 0,
            viewCount: c.viewCount || 0
          }));
          
          // Get isPinned status from localStorage if available
          const savedLists = localStorage.getItem('competitorLists');
          let isPinned = false;
          
          if (savedLists) {
            const parsedLists = JSON.parse(savedLists) as CompetitorList[];
            const savedList = parsedLists.find(l => l.id === list.id);
            if (savedList) {
              isPinned = savedList.isPinned;
            }
          }
          
          return {
            id: list.id,
            name: list.name,
            isPinned: isPinned,
            competitors: formattedCompetitors // These come directly from Supabase (empty for new lists)
          };
        })
      );
      
      console.log("Setting updated competitor lists:", listsWithCompetitors);
      setCompetitorLists(listsWithCompetitors);
      
      // Also update localStorage for pinned status
      const currentSavedLists = localStorage.getItem('competitorLists');
      if (currentSavedLists) {
        const parsedSavedLists = JSON.parse(currentSavedLists) as CompetitorList[];
        
        // Merge the pinned status from existing saved lists with the new data
        const mergedLists = listsWithCompetitors.map(newList => {
          const savedList = parsedSavedLists.find(l => l.id === newList.id);
          return {
            ...newList,
            isPinned: savedList ? savedList.isPinned : newList.isPinned
          };
        });
        
        localStorage.setItem('competitorLists', JSON.stringify(mergedLists));
      } else {
        localStorage.setItem('competitorLists', JSON.stringify(listsWithCompetitors));
      }
    } catch (error) {
      console.error('Error refreshing competitor lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load competitor data
  useEffect(() => {
    const fetchCompetitors = async () => {
      try {
        setIsLoading(true);
        
        // Get lists from Supabase
        console.log("Fetching competitor lists from Supabase...");
        const lists = await competitorListsApi.getUserLists();
        console.log("Retrieved lists:", lists);
        
        if (lists.length === 0) {
          // No lists - just set an empty array
          console.log("No lists found");
          setCompetitorLists([]);
        } else {
          // We need to fetch competitors for each list
          console.log("Lists found, fetching competitors for each list");
          const listsWithCompetitors = await Promise.all(
            lists.map(async (list) => {
              console.log(`Fetching competitors for list ${list.id} (${list.name})...`);
              const competitors = await competitorListsApi.getCompetitorsInList(list.id);
              console.log(`Found ${competitors.length} competitors in list ${list.id}`);
              
              // Convert from DB format to our app format
              const formattedCompetitors = competitors.map(c => ({
                id: c.id,
                youtubeId: c.youtubeId,
                name: c.name,
                thumbnailUrl: c.thumbnailUrl || '',
                subscriberCount: c.subscriberCount || 0,
                videoCount: c.videoCount || 0,
                viewCount: c.viewCount || 0
              }));
              
              // Get isPinned status from localStorage if available
              const savedLists = localStorage.getItem('competitorLists');
              let isPinned = false;
              
              if (savedLists) {
                const parsedLists = JSON.parse(savedLists) as CompetitorList[];
                const savedList = parsedLists.find(l => l.id === list.id);
                if (savedList) {
                  isPinned = savedList.isPinned;
                }
              }
              
              console.log(`Built list object for ${list.name} with ${formattedCompetitors.length} competitors`);
              return {
                id: list.id,
                name: list.name,
                isPinned: isPinned,
                competitors: formattedCompetitors
              };
            })
          );
          
          console.log("Setting competitor lists with data:", listsWithCompetitors);
          setCompetitorLists(listsWithCompetitors);
        }
      } catch (error) {
        console.error('Error fetching competitors:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompetitors();
  }, []);

  const openModal = (listId?: string) => {
    // Check if creating a new folder and user is on free tier
    if (listId === undefined && !canCreateFolder()) {
      showFolderUpgradePrompt();
      return;
    }

    if (listId !== undefined) {
      setEditingListId(listId);
      const list = competitorLists.find(l => l.id === listId);
      if (list) setListName(list.name);
    } else {
      setEditingListId(null);
      setListName('');
    }
    setIsModalOpen(true);
  }

  const closeModal = () => {
    setIsModalOpen(false);
    setListName('');
    setEditingListId(null);
  }

  // Function to get an icon based on list ID or name
  const getListIcon = (list: CompetitorList) => {
    // First check if the list has a designated category
    const listId = list.id.toLowerCase();
    const listNameLower = list.name.toLowerCase();
    
    // Look for keywords in the name to determine icon
    if (listNameLower.includes('gaming') || listNameLower.includes('game')) {
      return <FaGamepad size={18} className="text-purple-500" />;
    } else if (listNameLower.includes('tech') || listNameLower.includes('technology')) {
      return <FaLaptop size={18} className="text-blue-500" />;
    } else if (listNameLower.includes('music') || listNameLower.includes('audio')) {
      return <FaMusic size={18} className="text-pink-500" />;
    } else if (listNameLower.includes('film') || listNameLower.includes('movie') || listNameLower.includes('video')) {
      return <FaFilm size={18} className="text-red-500" />;
    } else if (listNameLower.includes('top') || listNameLower.includes('best')) {
      return <FaRegStar size={18} className="text-yellow-500" />;
    } else if (listNameLower.includes('grow') || listNameLower.includes('trending')) {
      return <FaChartLine size={18} className="text-green-500" />;
    } else if (listId === 'default' || listNameLower.includes('all')) {
      return <FaYoutube size={18} className="text-red-500" />;
    }
    
    // Default icon
    return <FaUsers size={18} className="text-indigo-500" />;
  };

  const handleSave = async () => {
    if (!listName.trim()) return;
    
    try {
      setIsCreatingList(true); // Add loading state
      
      if (editingListId !== null) {
        // Edit existing list
        console.log(`Updating list ${editingListId} with name: ${listName}`);
        await competitorListsApi.updateList(editingListId, {
          name: listName,
          description: `Updated list: ${listName}`,
          userId: 'current'
        });
        
        // Refresh the lists from Supabase after updating
        await refreshData();
      } else {
        // Create new list - always with empty competitors array
        try {
          console.log("Creating new list with name:", listName);
          
          // Add more detailed logging for debugging
          try {
            // First check if user is authenticated
            const user = localStorage.getItem('user');
            console.log("Current user from localStorage:", user);
            
            const newListData = await competitorListsApi.createList({
              name: listName,
              description: `List for ${listName}`,
              userId: 'current'
            });
            
            console.log("List created successfully:", newListData);
            
            // Add the new list to state with empty competitors array
            const newList = {
              id: newListData.id,
              name: newListData.name,
              isPinned: false,
              competitors: [] // EMPTY - No pre-populated competitors
            };
            
            console.log("Adding new empty list to UI:", newList);
            
            // Update state immediately with the new list
            setCompetitorLists(prev => [...prev, newList]);
            
            // Save to localStorage for pinned status
            const savedLists = localStorage.getItem('competitorLists');
            const lists = savedLists ? JSON.parse(savedLists) : [];
            lists.push(newList);
            localStorage.setItem('competitorLists', JSON.stringify(lists));
            
            closeModal();
          } catch (innerError) {
            console.error("Inner error creating list:", innerError);
            // Show error message to user
            setError(innerError instanceof Error ? innerError.message : 'Unknown error creating list');
            
            // Don't close modal if there was an error
          }
        } catch (createError) {
          console.error("Error creating list:", createError);
          setError(createError instanceof Error ? createError.message : 'Unknown error');
        }
      }
    } catch (error) {
      console.error("Outer error saving list:", error);
      setError(error instanceof Error ? error.message : 'Failed to save list');
    } finally {
      setIsCreatingList(false);
    }
  };

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  }

  const closeAllMenus = () => {
    setOpenMenuId(null);
  }

  const pinList = async (id: string) => {
    const list = competitorLists.find(list => list.id === id);
    if (!list) return;
    
    const newPinnedStatus = !list.isPinned;
    
    try {
      // We only update isPinned in local state since Supabase schema doesn't have isPinned field
      const updatedLists = competitorLists.map(list => 
        list.id === id 
          ? { ...list, isPinned: newPinnedStatus } 
          : list
      );
      
      // Update state
      setCompetitorLists(updatedLists);
      
      // Save pinned status to localStorage
      localStorage.setItem('competitorLists', JSON.stringify(updatedLists));
    } catch (error) {
      console.error('Error pinning list:', error);
    }
    
    closeAllMenus();
  }

  const duplicateList = async (id: string) => {
    const listToDuplicate = competitorLists.find(list => list.id === id);
    if (!listToDuplicate) return;
    
    try {
      // Create duplicated list in Supabase
      const createdList = await competitorListsApi.createList({
        name: `${listToDuplicate.name} (copy)`,
        description: `Copy of ${listToDuplicate.name}`,
        userId: 'current'
      });
      
      const duplicatedList = {
        id: createdList.id,
        name: `${listToDuplicate.name} (copy)`,
        isPinned: false,
        competitors: []
      };
      
      // In a real app, we would also copy all competitors to the new list
      // For now, we'll just create an empty duplicate list
      
      // Update state to include the new list
      const updatedLists = [...competitorLists, duplicatedList];
      setCompetitorLists(updatedLists);
      
      // Save pinned status to localStorage
      localStorage.setItem('competitorLists', JSON.stringify(updatedLists));
      
      // Refresh data from Supabase
      await refreshData();
    } catch (error) {
      console.error('Error duplicating list:', error);
    }
    
    closeAllMenus();
  }

  const deleteList = async (id: string) => {
    // Don't delete the default list
    if (id === "default") return;
    
    try {
      // Delete from Supabase
      await competitorListsApi.deleteList(id);
      
      // Refresh the lists from Supabase after deleting
      await refreshData();
    } catch (error) {
      console.error('Error deleting list:', error);
    }
    
    closeAllMenus();
  }

  // Sort lists so pinned items appear first
  const sortedLists = [...competitorLists].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading niches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto">
      
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Niche Folders</h1>
        
        {/* Free tier status indicator */}
        {plan === 'free' && !subscriptionLoading && (
          <div className="flex items-center gap-2 text-sm">
            <div className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30">
              <FaCrown size={12} className="inline mr-1" />
              Free Plan: {competitorLists.length}/{FREE_TIER_NICHE_FOLDER_LIMIT} niche folders
            </div>
          </div>
        )}
      </div>
      
      {competitorLists.length === 0 ? (
        // Empty state container
        <div className="flex items-center justify-center py-24">
          <div className="w-full max-w-lg h-64 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
            <p className="text-white/80 mb-6">You haven't created any competitor lists yet.</p>
            <button 
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition-colors"
            >
              <FaPlus size={18} />
              <span>Create new competitor list</span>
            </button>
          </div>
        </div>
      ) : (
        // Competitor lists grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create new competitor list button - Always first */}
          <div 
            className={`border border-dashed rounded-xl p-5 transition-colors ${
              canCreateFolder() 
                ? 'border-gray-300 dark:border-white/20 cursor-pointer hover:bg-white/10 backdrop-blur-sm' 
                : 'border-gray-500/50 dark:border-gray-600/50 cursor-not-allowed bg-gray-500/10'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              openModal();
            }}
          >
            <div className="flex justify-between items-start">
              <div className={`flex items-center gap-2 ${canCreateFolder() ? 'text-indigo-400' : 'text-gray-500'}`}>
                {canCreateFolder() ? <FaPlus size={18} /> : <FaLock size={18} />}
                <span className="font-medium">
                  {canCreateFolder() ? 'Create new competitor list' : 'Folder limit reached'}
                </span>
              </div>
            </div>
            <p className={`text-sm mt-1 ${canCreateFolder() ? 'text-gray-300' : 'text-gray-500'}`}>
              {canCreateFolder() 
                ? 'Add a new collection' 
                : `Free plan allows ${FREE_TIER_NICHE_FOLDER_LIMIT} niche folder${FREE_TIER_NICHE_FOLDER_LIMIT === 1 ? '' : 's'}`
              }
            </p>
            {!canCreateFolder() && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  showFolderUpgradePrompt();
                }}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
          
          {/* Competitor lists */}
          {sortedLists.map((list) => (
            <div key={list.id} className="relative">
              <Link href={`/dashboard/competitors/${list.id}?name=${encodeURIComponent(list.name)}`}>
                <div className="bg-white/10 dark:bg-[#00264d]/30 backdrop-blur-sm hover:bg-white/15 dark:hover:bg-[#00264d]/40 border border-white/10 dark:border-blue-400/20 rounded-xl p-5 transition-colors cursor-pointer group shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {getListIcon(list)}
                      <h3 className="text-white font-medium text-lg">{list.name}</h3>
                      {plan === 'free' && (
                        <div className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                          {list.competitors.length}/{FREE_TIER_CHANNEL_LIMIT}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={(e) => toggleMenu(list.id, e)}
                      className="text-white/70 hover:text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <FaEllipsisV size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <FaUsers className="h-4 w-4" />
                    <span>{list.competitors.length} {list.competitors.length === 1 ? 'channel' : 'channels'}</span>
                  </div>
                </div>
              </Link>

              {/* Context menu */}
              {openMenuId === list.id && (
                <div 
                  ref={menuRef}
                  className="absolute top-12 right-3 bg-[#00264d]/90 backdrop-blur-md border border-blue-400/20 rounded-xl shadow-lg py-2 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-white/80 hover:bg-[#02386e]/50 transition-colors text-left"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      pinList(list.id);
                    }}
                  >
                    <FaThumbtack size={16} className={list.isPinned ? 'text-indigo-400' : ''} />
                    {list.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button 
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-white/80 hover:bg-[#02386e]/50 transition-colors text-left"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openModal(list.id);
                    }}
                  >
                    <FaPencilAlt size={16} />
                    Rename
                  </button>
                  <button 
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-white/80 hover:bg-[#02386e]/50 transition-colors text-left"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      duplicateList(list.id);
                    }}
                  >
                    <FaCopy size={16} />
                    Duplicate
                  </button>
                  <button 
                    className={`flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-[#02386e]/50 transition-colors text-left ${
                      list.id === "default" ? "text-gray-500 cursor-not-allowed" : "text-red-400 hover:text-red-300"
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (list.id !== "default") {
                        deleteList(list.id);
                      }
                    }}
                    disabled={list.id === "default"}
                  >
                    <FaTrash size={16} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => e.target === e.currentTarget && setShowUpgradeModal(false)}
        >
          <div className="bg-[#00264d]/90 backdrop-blur-md border border-blue-400/20 rounded-xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-500/20 mb-4">
                <FaCrown className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                {upgradeReason === 'folders' ? 'Folder Limit Reached' : 'Channel Limit Reached'}
              </h3>
              <p className="text-sm text-gray-300 mb-6">
                {plan === 'free' 
                  ? `You have reached your channel limit on the Free plan. Upgrade to Pro to track more channels.`
                  : 'Upgrade to Pro to unlock unlimited channel tracking and advanced analytics.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white/80 hover:bg-[#02386e]/50 rounded-full border border-white/20"
                >
                  Cancel
                </button>
                <Link 
                  href="/subscription"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600/80 hover:bg-blue-600 rounded-full text-center"
                >
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-40"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-[#00264d]/80 backdrop-blur-md border border-blue-400/20 rounded-xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-white">
              {editingListId ? 'Edit List' : 'Create New List'}
            </h3>
            
            <div className="mb-4">
              <label htmlFor="listName" className="block text-sm font-medium text-white/90 mb-2">
                List Name
              </label>
              <input
                type="text"
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="w-full px-3 py-2 border border-blue-400/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#00264d]/50 text-white"
                placeholder="My Competitors"
                autoFocus
              />
            </div>

            {/* Add error display */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 text-red-300 rounded-md text-sm border border-red-500/30">
                {error}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-white/80 hover:bg-[#02386e]/50 rounded-full"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!listName.trim() || isCreatingList}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600/80 hover:bg-blue-600 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingList ? 'Saving...' : (editingListId ? 'Update' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 