'use server';

import { revalidatePath } from 'next/cache';
import { createPick, updatePick, settleResult, updateClosingLine, getAllPicks, deletePick } from '@/lib/picks-service';
import { CreatePickSchema, ResultSettlementSchema } from '@/lib/validations';
import { calculateProfitLoss } from '@/lib/calculations';

export async function addPickAction(prevState: any, formData: FormData) {
  const data = {
    source: formData.get('source') as string || undefined,
    match_date: formData.get('match_date') as string,
    competition: formData.get('competition') as string || undefined,
    home_team: formData.get('home_team') as string,
    away_team: formData.get('away_team') as string,
    market: formData.get('market') as string,
    selection: formData.get('selection') as string,
    recommended_odds: parseFloat(formData.get('recommended_odds') as string),
    stake: parseFloat(formData.get('stake') as string) || 1,
    notes: formData.get('notes') as string || undefined,
  };

  const parsed = CreatePickSchema.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => i.message);
    return { success: false, errors };
  }

  createPick({ ...parsed.data, created_by: 'user' });
  revalidatePath('/');
  return { success: true };
}

export async function updatePickAction(id: string, data: {
  source?: string;
  match_date?: string;
  competition?: string;
  home_team?: string;
  away_team?: string;
  market?: string;
  selection?: string;
  recommended_odds?: number;
  stake?: number;
  notes?: string;
}) {
  updatePick(id, data, 'user');
  revalidatePath('/');
}

export async function settlePickAction(id: string, result: string) {
  const parsed = ResultSettlementSchema.safeParse({ result });
  if (!parsed.success) {
    return { success: false, errors: parsed.error.issues.map((i) => i.message) };
  }
  settleResult(id, result, 'user');
  revalidatePath('/');
  return { success: true };
}

export async function updateClosingOddsAction(id: string, closingOdds: number) {
  if (closingOdds <= 1) {
    return { success: false, errors: ['closing_odds must be greater than 1'] };
  }
  updateClosingLine(id, closingOdds, 'user');
  revalidatePath('/');
  return { success: true };
}

export async function deletePickAction(id: string) {
  const success = deletePick(id);
  if (!success) {
    return { success: false, errors: ['Pick not found'] };
  }
  revalidatePath('/');
  return { success: true };
}

export async function fetchPicks(filters?: {
  source?: string;
  competition?: string;
  result?: string;
  team?: string;
  date_from?: string;
  date_to?: string;
}) {
  return getAllPicks(filters || {});
}


