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

    // Run all health checks in parallel
    const [dbResult, authResult, storageResult] = await Promise.all([
      supabase.from('profiles').select('count').limit(1),
      supabase.auth.getSession(),
      supabase.storage.listBuckets(),
    ]);

    const { error: dbError } = dbResult;
    if (dbError) console.error('Database query error:', dbError);

    const { error: authError } = authResult;
    if (authError) console.error('Auth check error:', authError);

    const { error: storageError } = storageResult;
    if (storageError) console.error('Storage check error:', storageError);

    return NextResponse.json({
      success: true,
      timestamp,
    });

  } catch (error) {
    console.error('Keep-alive error:', error);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
