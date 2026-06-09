import { NextRequest, NextResponse } from 'next/server';
import { updateClosingLine } from '@/lib/picks-service';
import { ClosingLineSchema } from '@/lib/validations';
import { verifyAgentAuth, getAgentIdentity } from '@/lib/middleware/agent-auth';

// PATCH /api/picks/[id]/closing-line
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

    const parsed = ClosingLineSchema.safeParse(body);
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

    const updated = updateClosingLine(id, parsed.data.closing_odds, updatedBy);
    if (!updated) {
      return NextResponse.json(
        { error: { code: 'PICK_NOT_FOUND', message: `Pick ${id} not found` } },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/picks/:id/closing-line error:', error);
    return NextResponse.json(
      {
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update closing line' },
      },
      { status: 500 }
    );
  }
}
