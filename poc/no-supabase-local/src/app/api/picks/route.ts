import { NextRequest, NextResponse } from 'next/server';
import { getAllPicks, createPick } from '@/lib/picks-service';
import { CreatePickSchema } from '@/lib/validations';
import { verifyAgentAuth, getAgentIdentity } from '@/lib/middleware/agent-auth';

// GET /api/picks
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
    return NextResponse.json(picks);
  } catch (error) {
    console.error('GET /api/picks error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch picks' } },
      { status: 500 }
    );
  }
}

// POST /api/picks
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const isAgent = verifyAgentAuth(authHeader);
    const createdBy = isAgent ? getAgentIdentity() : 'user';

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
        { status: 400 }
      );
    }

    const parsed = CreatePickSchema.safeParse(body);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      const message = parsed.error.issues[0]?.message;
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: message || 'Validation failed',
            field: field ? String(field) : undefined,
          },
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const pick = createPick({
      ...data,
      created_by: createdBy,
      raw_agent_payload: isAgent ? JSON.stringify(body) : undefined,
    });

    return NextResponse.json(pick, { status: 201 });
  } catch (error) {
    console.error('POST /api/picks error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create pick' } },
      { status: 500 }
    );
  }
}
