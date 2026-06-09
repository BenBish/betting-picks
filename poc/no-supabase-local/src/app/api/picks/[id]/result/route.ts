import { NextRequest, NextResponse } from 'next/server';
import { settleResult } from '@/lib/picks-service';
import { ResultSettlementSchema } from '@/lib/validations';
import { verifyAgentAuth, getAgentIdentity } from '@/lib/middleware/agent-auth';

// PATCH /api/picks/[id]/result
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const isAgent = verifyAgentAuth(authHeader);
    const updatedBy = isAgent ? getAgentIdentity() : 'user';

    const id = params.id;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
        { status: 400 }
      );
    }

    const parsed = ResultSettlementSchema.safeParse(body);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      const message = parsed.error.issues[0]?.message;
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_RESULT',
            message: message || 'Invalid result value',
            field: field ? String(field) : undefined,
          },
        },
        { status: 400 }
      );
    }

    const updated = settleResult(id, parsed.data.result, updatedBy);
    if (!updated) {
      return NextResponse.json(
        { error: { code: 'PICK_NOT_FOUND', message: `Pick ${id} not found` } },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/picks/:id/result error:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to settle pick' } },
      { status: 500 }
    );
  }
}
