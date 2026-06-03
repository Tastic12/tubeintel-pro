import type { SupabaseClient } from '@supabase/supabase-js';
import { embedImageFromUrl, embeddingToPgvectorText } from '@/lib/embeddings';

const BATCH_SIZE = 25;

export type EmbedBatchResult = {
  processed: number;
  remaining: number;
  errors: number;
};

async function fetchPendingQueue(
  admin: SupabaseClient,
  userId?: string
): Promise<Array<{ youtube_video_id: string; thumbnail_url: string }>> {
  if (userId) {
    const { data, error } = await admin.rpc('pending_thumbnail_embeddings', {
      user_uuid: userId,
      batch_size: BATCH_SIZE,
    });
    if (error) throw new Error(`Failed to fetch pending thumbnails: ${error.message}`);
    return (data || []) as Array<{ youtube_video_id: string; thumbnail_url: string }>;
  }

  const { data, error } = await admin.rpc('pending_thumbnail_embeddings_global', {
    batch_size: BATCH_SIZE,
  });
  if (error) throw new Error(`Failed to fetch global pending thumbnails: ${error.message}`);
  return (data || []) as Array<{ youtube_video_id: string; thumbnail_url: string }>;
}

async function fetchRemainingCount(admin: SupabaseClient, userId?: string): Promise<number> {
  if (userId) {
    const { data } = await admin.rpc('pending_thumbnail_embeddings_count', {
      user_uuid: userId,
    });
    return typeof data === 'number' ? data : 0;
  }

  const { data } = await admin.rpc('pending_thumbnail_embeddings_global_count');
  return typeof data === 'number' ? data : 0;
}

export async function runThumbnailEmbedBatch(
  admin: SupabaseClient,
  userId?: string
): Promise<EmbedBatchResult> {
  const queue = await fetchPendingQueue(admin, userId);

  if (!queue.length) {
    const remaining = await fetchRemainingCount(admin, userId);
    return { processed: 0, remaining, errors: 0 };
  }

  const inserts: Array<{
    youtube_video_id: string;
    thumbnail_url: string;
    embedding: string;
  }> = [];
  let errors = 0;

  for (const item of queue) {
    try {
      const vec = await embedImageFromUrl(item.thumbnail_url);
      if (vec.length !== 512) {
        throw new Error(`Unexpected embedding length: ${vec.length}`);
      }
      inserts.push({
        youtube_video_id: item.youtube_video_id,
        thumbnail_url: item.thumbnail_url,
        embedding: embeddingToPgvectorText(vec),
      });
    } catch {
      errors += 1;
    }
  }

  if (inserts.length) {
    const { error: insertError } = await admin
      .from('thumbnail_embeddings')
      .upsert(inserts, { onConflict: 'youtube_video_id' });
    if (insertError) {
      throw new Error(`Failed to save embeddings: ${insertError.message}`);
    }
  }

  const remaining = await fetchRemainingCount(admin, userId);
  return { processed: inserts.length, remaining, errors };
}

export async function runThumbnailEmbedCron(
  admin: SupabaseClient,
  maxBatches = 4
): Promise<{
  totalProcessed: number;
  totalErrors: number;
  remaining: number;
  batches: number;
}> {
  let totalProcessed = 0;
  let totalErrors = 0;
  let remaining = 0;
  let batches = 0;

  for (let i = 0; i < maxBatches; i++) {
    const result = await runThumbnailEmbedBatch(admin);
    batches += 1;
    totalProcessed += result.processed;
    totalErrors += result.errors;
    remaining = result.remaining;
    if (result.remaining === 0 || result.processed === 0) break;
  }

  return { totalProcessed, totalErrors, remaining, batches };
}
