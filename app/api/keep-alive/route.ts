/**
 * Supabase Keep-Alive API Endpoint
 *
 * GET /api/keep-alive
 *
 * Purpose: Prevent Supabase project from being paused due to inactivity
 * Usage: Can be called manually or via cron job (e.g., Vercel Cron, GitHub Actions)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Supabase credentials not configured' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const timestamp = new Date().toISOString();

    // 1. Database activity: Simple query
    const { data: profilesCount, error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (dbError) {
      console.error('Database query error:', dbError);
    }

    // 2. Auth activity: Check session
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError) {
      console.error('Auth check error:', authError);
    }

    // 3. Storage activity: List buckets (lightweight operation)
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();

    if (storageError) {
      console.error('Storage check error:', storageError);
    }

    return NextResponse.json({
      success: true,
      timestamp,
      activities: {
        database: !dbError,
        auth: !authError,
        storage: !storageError,
      },
      message: '✅ Supabase project activity generated successfully',
    });

  } catch (error) {
    console.error('Keep-alive error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
