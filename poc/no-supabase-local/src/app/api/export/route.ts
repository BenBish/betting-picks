import { NextRequest, NextResponse } from 'next/server';
import { getAllPicks } from '@/lib/picks-service';
import { generateCsv } from '@/lib/csv';

// GET /api/export
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      source: searchParams.get('source') || undefined,
      competition: searchParams.get('competition') || undefined,
      result: searchParams.get('result') || undefined,
      team: searchParams.get('team') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
    };

    const picks = getAllPicks(filters);
    const csv = generateCsv(picks);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="picks-export.csv"',
      },
    });
  } catch (error) {
    console.error('GET /api/export error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to export picks' } },
      { status: 500 }
    );
  }
}
