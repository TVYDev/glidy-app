import { createMockBackend } from '@/lib/backend/mock-backend';
import { createSupabaseBackend } from '@/lib/backend/supabase-backend';
import { isSupabaseConfigured } from '@/lib/backend/supabase-client';
import type { Backend } from '@/lib/types';

/** Real Supabase backend when configured, otherwise the on-device demo backend. */
export const backend: Backend = isSupabaseConfigured ? createSupabaseBackend() : createMockBackend();
