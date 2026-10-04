import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl && process.env.NODE_ENV === 'production') {
  console.warn('[Supabase] Warning: SUPABASE_URL is not set in environment variables.');
}

/**
 * Supabase Admin Client (using service role key for trusted backend operations)
 * Used for Storage bucket management, pre-signed upload URLs, and direct Supabase services.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'traceroot-evidence-media';

export default supabase;
