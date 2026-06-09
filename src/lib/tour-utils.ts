import { supabase } from './supabase';
import { ensureClientSession } from './auth-session';

const TOUR_COMPLETED_KEY = 'clikstats-tour-completed';

function readLocalTourCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
}

function writeLocalTourCompleted(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
}

function clearLocalTourCompleted(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOUR_COMPLETED_KEY);
}

/**
 * Check if the current user has completed the tour.
 * Checks localStorage first (fast), then Supabase profile.
 */
export async function getTourCompletionStatus(): Promise<boolean> {
  if (readLocalTourCompleted()) {
    return true;
  }

  try {
    const session = await ensureClientSession();
    const user = session?.user;

    if (!user) {
      return false;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('tour_completed')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching tour completion status:', error);
      return false;
    }

    const completed = Boolean(profile?.tour_completed);
    if (completed) {
      writeLocalTourCompleted();
    }

    return completed;
  } catch (error) {
    console.error('Exception checking tour completion status:', error);
    return readLocalTourCompleted();
  }
}

/**
 * Mark the tour as completed for the current user.
 */
export async function markTourAsCompleted(): Promise<boolean> {
  writeLocalTourCompleted();

  try {
    const session = await ensureClientSession();
    const user = session?.user;

    if (!user) {
      return true;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ tour_completed: true })
      .eq('id', user.id);

    if (error) {
      console.error('Error marking tour as completed:', error);
      return true;
    }

    return true;
  } catch (error) {
    console.error('Exception marking tour as completed:', error);
    return true;
  }
}

/**
 * Reset tour completion status (useful for testing or admin purposes)
 */
export async function resetTourCompletion(): Promise<boolean> {
  clearLocalTourCompleted();

  try {
    const session = await ensureClientSession();
    const user = session?.user;

    if (!user) {
      return true;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ tour_completed: false })
      .eq('id', user.id);

    if (error) {
      console.error('Error resetting tour completion:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception resetting tour completion:', error);
    return false;
  }
}
