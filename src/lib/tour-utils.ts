import { supabase } from './supabase';

/**
 * Check if the current user has completed the tour
 */
export async function getTourCompletionStatus(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return false;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('tour_completed')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching tour completion status:', error);
      // Fallback to localStorage for backward compatibility
      return localStorage.getItem('clikstats-tour-completed') === 'true';
    }

    return Boolean(profile?.tour_completed);
  } catch (error) {
    console.error('Exception checking tour completion status:', error);
    // Fallback to localStorage for backward compatibility
    return localStorage.getItem('clikstats-tour-completed') === 'true';
  }
}

/**
 * Mark the tour as completed for the current user
 */
export async function markTourAsCompleted(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ tour_completed: true })
      .eq('id', user.id);

    if (error) {
      console.error('Error marking tour as completed:', error);
      // Fallback to localStorage
      localStorage.setItem('clikstats-tour-completed', 'true');
      return false;
    }

    console.log('Tour marked as completed in database');
    // Also set localStorage for immediate UI updates
    localStorage.setItem('clikstats-tour-completed', 'true');
    return true;
  } catch (error) {
    console.error('Exception marking tour as completed:', error);
    // Fallback to localStorage
    localStorage.setItem('clikstats-tour-completed', 'true');
    return false;
  }
}

/**
 * Reset tour completion status (useful for testing or admin purposes)
 */
export async function resetTourCompletion(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ tour_completed: false })
      .eq('id', user.id);

    if (error) {
      console.error('Error resetting tour completion:', error);
      return false;
    }

    console.log('Tour completion status reset');
    // Also clear localStorage
    localStorage.removeItem('clikstats-tour-completed');
    return true;
  } catch (error) {
    console.error('Exception resetting tour completion:', error);
    return false;
  }
} 