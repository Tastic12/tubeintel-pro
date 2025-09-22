'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaEllipsisV, FaPlay, FaGamepad, FaLaptop, FaMusic, FaFilm, FaRegStar, FaChartLine, FaCrown, FaLock, FaThumbtack, FaPencilAlt, FaCopy, FaTrash } from 'react-icons/fa';
import Link from 'next/link';
import { Video } from '@/types';
import { useSubscription } from '@/hooks/useSubscription';
import { videoCollectionsApi } from '@/services/api/videoCollections';

// Interface for video collections
interface VideoCollection {
  id: string;
  name: string;
  isPinned: boolean;
  videos: Video[];
}

export default function VideosPage() {
  const router = useRouter();
  const { plan, isSubscribed, isLoading: subscriptionLoading } = useSubscription();
  
  const [videoCollections, setVideoCollections] = useState<VideoCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradeReason, setUpgradeReason] = useState<string>('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [listName, setListName] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [error, setError] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Free tier limits
  const FREE_TIER_COLLECTIONS = 1;
  const FREE_TIER_VIDEOS_PER_COLLECTION = 10;

  // Function to refresh video collections from Supabase
  const refreshData = async () => {
    try {
      setIsLoading(true);
      
      console.log("Refreshing video collections from Supabase...");
      
      // Get collections from Supabase
      const collections = await videoCollectionsApi.getUserCollections();
      console.log("Retrieved collections for refresh:", collections);
      
      if (collections.length === 0) {
        console.log("No collections found during refresh");
        setVideoCollections([]);
        return;
      }
      
      // Fetch videos for each collection
      console.log("Fetching current videos for each collection during refresh");
      const collectionsWithVideos = await Promise.all(
        collections.map(async (collection) => {
          console.log(`Refreshing videos for collection ${collection.id} (${collection.name})...`);
          const videos = await videoCollectionsApi.getVideosInCollection(collection.id);
          console.log(`Found ${videos.length} videos in collection ${collection.id} during refresh`);
          
          // Convert from DB format to our app format
          const formattedVideos = videos.map(v => ({
            id: v.id,
            youtubeId: v.youtubeId,
            channelId: v.channelId || '',
            title: v.title,
            description: '', // Default empty description
            thumbnailUrl: v.thumbnailUrl || '',
            publishedAt: v.publishedAt ? new Date(v.publishedAt) : new Date(),
            viewCount: v.viewCount || 0,
            likeCount: v.likeCount || 0,
            commentCount: 0, // Default comment count
            vph: 0 // Default VPH (Views Per Hour)
          }));
          
          // Get isPinned status from localStorage if available (for UI state only)
          const savedCollections = localStorage.getItem('videoCollections');
          let isPinned = false;
          
          if (savedCollections) {
            const parsedCollections = JSON.parse(savedCollections) as VideoCollection[];
            const savedCollection = parsedCollections.find(c => c.id === collection.id);
            if (savedCollection) {
              isPinned = savedCollection.isPinned;
            }
          }
          
          return {
            id: collection.id,
            name: collection.name,
            isPinned: isPinned,
            videos: formattedVideos
          };
        })
      );
      
      console.log("Setting updated video collections:", collectionsWithVideos);
      setVideoCollections(collectionsWithVideos);
      
      // Update localStorage for pinned status only
      const currentSavedCollections = localStorage.getItem('videoCollections');
      if (currentSavedCollections) {
        const parsedSavedCollections = JSON.parse(currentSavedCollections) as VideoCollection[];
        
        // Merge the pinned status from existing saved collections with the new data
        const mergedCollections = collectionsWithVideos.map(newCollection => {
          const savedCollection = parsedSavedCollections.find(c => c.id === newCollection.id);
          return {
            ...newCollection,
            isPinned: savedCollection ? savedCollection.isPinned : newCollection.isPinned
          };
        });
        
        localStorage.setItem('videoCollections', JSON.stringify(mergedCollections));
      } else {
        localStorage.setItem('videoCollections', JSON.stringify(collectionsWithVideos));
      }
    } catch (error) {
      console.error('Error refreshing video collections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load video data
  useEffect(() => {
    const fetchVideoCollections = async () => {
      try {
        setIsLoading(true);
        
        // Get collections from Supabase
        console.log("Fetching video collections from Supabase...");
        const collections = await videoCollectionsApi.getUserCollections();
        console.log("Retrieved collections:", collections);
        
        if (collections.length === 0) {
          console.log("No collections found");
          setVideoCollections([]);
        } else {
          // Fetch videos for each collection
          console.log("Collections found, fetching videos for each collection");
          const collectionsWithVideos = await Promise.all(
            collections.map(async (collection) => {
              console.log(`Fetching videos for collection ${collection.id} (${collection.name})...`);
              const videos = await videoCollectionsApi.getVideosInCollection(collection.id);
              console.log(`Found ${videos.length} videos in collection ${collection.id}`);
              
              // Convert from DB format to our app format
              const formattedVideos = videos.map(v => ({
                id: v.id,
                youtubeId: v.youtubeId,
                channelId: v.channelId || '',
                title: v.title,
                description: '', // Default empty description
                thumbnailUrl: v.thumbnailUrl || '',
                publishedAt: v.publishedAt ? new Date(v.publishedAt) : new Date(),
                viewCount: v.viewCount || 0,
                likeCount: v.likeCount || 0,
                commentCount: 0, // Default comment count
                vph: 0 // Default VPH (Views Per Hour)
              }));
              
              // Get isPinned status from localStorage if available
              const savedCollections = localStorage.getItem('videoCollections');
              let isPinned = false;
              
              if (savedCollections) {
                const parsedCollections = JSON.parse(savedCollections) as VideoCollection[];
                const savedCollection = parsedCollections.find(c => c.id === collection.id);
                if (savedCollection) {
                  isPinned = savedCollection.isPinned;
                }
              }
              
              console.log(`Built collection object for ${collection.name} with ${formattedVideos.length} videos`);
              return {
                id: collection.id,
                name: collection.name,
                isPinned: isPinned,
                videos: formattedVideos
              };
            })
          );
          
          console.log("Setting video collections with data:", collectionsWithVideos);
          setVideoCollections(collectionsWithVideos);
        }
      } catch (error) {
        console.error('Error fetching video collections:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideoCollections();
  }, []);

  // Check if user can create a new collection
  const canCreateCollection = () => {
    if (isSubscribed) return true;
    return videoCollections.length < FREE_TIER_COLLECTIONS;
  };

  // Show upgrade prompt for collections
  const showCollectionUpgradePrompt = () => {
    setUpgradeReason(`Free users can create up to ${FREE_TIER_COLLECTIONS} video collection. Upgrade to Pro to create unlimited collections and organize your video research better.`);
    setShowUpgradeModal(true);
  };

  const openModal = (listId?: string) => {
    // Check if creating a new collection and user is on free tier
    if (listId === undefined && !canCreateCollection()) {
      showCollectionUpgradePrompt();
      return;
    }

    if (listId !== undefined) {
      setEditingListId(listId);
      const collection = videoCollections.find(c => c.id === listId);
      if (collection) setListName(collection.name);
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
    setError('');
  }

  const handleSave = async () => {
    if (!listName.trim()) return;
    
    try {
      setIsCreatingList(true);
      setError('');
      
      if (editingListId !== null) {
        // Edit existing collection
        console.log(`Updating collection ${editingListId} with name: ${listName}`);
        await videoCollectionsApi.updateCollection(editingListId, {
          name: listName,
          description: `Updated collection: ${listName}`,
          userId: 'current'
        });
        
        // Refresh the collections from Supabase after updating
        await refreshData();
      } else {
        // Create new collection
        try {
          console.log("Creating new collection with name:", listName);
          
          const createdCollection = await videoCollectionsApi.createCollection({
            name: listName,
            description: `Video collection: ${listName}`,
            userId: 'current'
          });
          
          console.log("Collection created successfully:", createdCollection);
          
          // Refresh data from Supabase
          await refreshData();
        } catch (createError) {
          console.error("Error creating collection:", createError);
          setError(createError instanceof Error ? createError.message : 'Failed to create collection');
          return;
        }
      }
      
      closeModal();
    } catch (error) {
      console.error("Outer error saving collection:", error);
      setError(error instanceof Error ? error.message : 'Failed to save collection');
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

  const pinCollection = async (id: string) => {
    const collection = videoCollections.find(c => c.id === id);
    if (!collection) return;
    
    const newPinnedStatus = !collection.isPinned;
    
    try {
      // Update isPinned in local state (not stored in Supabase)
      const updatedCollections = videoCollections.map(c => 
        c.id === id 
          ? { ...c, isPinned: newPinnedStatus } 
          : c
      );
      
      // Update state
      setVideoCollections(updatedCollections);
      
      // Save pinned status to localStorage
      localStorage.setItem('videoCollections', JSON.stringify(updatedCollections));
    } catch (error) {
      console.error('Error pinning collection:', error);
    }
    
    closeAllMenus();
  }

  const duplicateCollection = async (id: string) => {
    const collectionToDuplicate = videoCollections.find(c => c.id === id);
    if (!collectionToDuplicate) return;
    
    try {
      // Create duplicated collection in Supabase
      const createdCollection = await videoCollectionsApi.createCollection({
        name: `${collectionToDuplicate.name} (copy)`,
        description: `Copy of ${collectionToDuplicate.name}`,
        userId: 'current'
      });
      
      // Note: In a real app, we would also copy all videos to the new collection
      // For now, we'll just create an empty duplicate collection
      
      // Refresh data from Supabase
      await refreshData();
    } catch (error) {
      console.error('Error duplicating collection:', error);
    }
    
    closeAllMenus();
  }

  const deleteCollection = async (id: string) => {
    try {
      // Delete from Supabase
      await videoCollectionsApi.deleteCollection(id);
      
      // Refresh the collections from Supabase after deleting
      await refreshData();
    } catch (error) {
      console.error('Error deleting collection:', error);
    }
    
    closeAllMenus();
  }

  // Sort collections so pinned items appear first
  const sortedCollections = [...videoCollections].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading video collections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto">
      
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">Video Collections</h1>
        
        {/* Free tier status indicator */}
        {plan === 'free' && !subscriptionLoading && (
          <div className="flex items-center gap-2 text-sm">
            <div className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30">
              <FaCrown size={12} className="inline mr-1" />
              Free Plan: {videoCollections.length}/{FREE_TIER_COLLECTIONS} video collections
            </div>
          </div>
        )}
      </div>
      
      {videoCollections.length === 0 ? (
        // Empty state container
        <div className="flex items-center justify-center py-24">
          <div className="w-full max-w-lg h-64 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm">
            <p className="text-white/80 mb-6">You haven't created any video collections yet.</p>
            <button 
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition-colors"
            >
              <FaPlus size={18} />
              <span>Create new video collection</span>
            </button>
          </div>
        </div>
      ) : (
        // Video collections grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Create new video collection button - Always first */}
          <div 
            className={`border border-dashed rounded-xl p-5 transition-colors ${
              canCreateCollection() 
                ? 'border-gray-300 dark:border-white/20 cursor-pointer hover:bg-white/10 backdrop-blur-sm' 
                : 'border-gray-500/50 dark:border-gray-600/50 cursor-not-allowed bg-gray-500/10'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              openModal();
            }}
          >
            <div className="flex justify-between items-start">
              <div className={`flex items-center gap-2 ${canCreateCollection() ? 'text-indigo-400' : 'text-gray-500'}`}>
                {canCreateCollection() ? <FaPlus size={18} /> : <FaLock size={18} />}
                <span className="font-medium">
                  {canCreateCollection() ? 'Create new video collection' : 'Collection limit reached'}
                </span>
              </div>
            </div>
            <p className={`text-sm mt-1 ${canCreateCollection() ? 'text-gray-300' : 'text-gray-500'}`}>
              {canCreateCollection() 
                ? 'Add a new video collection' 
                : `Free plan allows ${FREE_TIER_COLLECTIONS} video collection${FREE_TIER_COLLECTIONS === 1 ? '' : 's'}`
              }
            </p>
            {!canCreateCollection() && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  showCollectionUpgradePrompt();
                }}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
          
          {/* Video collections */}
          {sortedCollections.map((collection) => (
            <div key={collection.id} className="relative">
              <Link href={`/dashboard/videos/${collection.id}?name=${encodeURIComponent(collection.name)}`}>
                <div className="bg-white/10 dark:bg-[#00264d]/30 backdrop-blur-sm hover:bg-white/15 dark:hover:bg-[#00264d]/40 border border-white/10 dark:border-blue-400/20 rounded-xl p-5 transition-colors cursor-pointer group shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium text-lg">{collection.name}</h3>
                      {plan === 'free' && (
                        <div className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                          {collection.videos.length}/{FREE_TIER_VIDEOS_PER_COLLECTION}
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={(e) => toggleMenu(collection.id, e)}
                      className="text-white/70 hover:text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <FaEllipsisV size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <FaPlay className="h-4 w-4" />
                    <span>{collection.videos.length} {collection.videos.length === 1 ? 'video' : 'videos'}</span>
                  </div>
                </div>
              </Link>

              {/* Context menu */}
              {openMenuId === collection.id && (
                <div 
                  ref={modalRef}
                  className="absolute top-12 right-3 bg-[#00264d]/90 backdrop-blur-md border border-blue-400/20 rounded-xl shadow-lg py-2 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-white/80 hover:bg-[#02386e]/50 transition-colors text-left"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      pinCollection(collection.id);
                    }}
                  >
                    <FaThumbtack size={16} className={collection.isPinned ? 'text-indigo-400' : ''} />
                    {collection.isPinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button 
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-white/80 hover:bg-[#02386e]/50 transition-colors text-left"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      openModal(collection.id);
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
                      duplicateCollection(collection.id);
                    }}
                  >
                    <FaCopy size={16} />
                    Duplicate
                  </button>
                  <button 
                    className={`flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-[#02386e]/50 transition-colors text-left ${
                      collection.id === "default" ? "text-gray-500 cursor-not-allowed" : "text-red-400 hover:text-red-300"
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (collection.id !== "default") {
                        deleteCollection(collection.id);
                      }
                    }}
                    disabled={collection.id === "default"}
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
                {upgradeReason}
              </h3>
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
              {editingListId ? 'Edit Collection' : 'Create New Collection'}
            </h3>
            
            <div className="mb-4">
              <label htmlFor="listName" className="block text-sm font-medium text-white/90 mb-2">
                Collection Name
              </label>
              <input
                type="text"
                id="listName"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="w-full px-3 py-2 border border-blue-400/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#00264d]/50 text-white"
                placeholder="My Video Collection"
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