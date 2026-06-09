import { z } from 'zod';

export const VALID_RESULTS = ['won', 'lost', 'push', 'void'] as const;
export const ResultSchema = z.enum(VALID_RESULTS);

export const CreatePickSchema = z.object({
  source: z.string().trim().optional(),
  match_date: z.string().refine(
    (val) => !isNaN(new Date(val).getTime()),
    { message: 'Invalid datetime' }
  ),
  competition: z.string().trim().optional(),
  home_team: z.string().trim().min(1, 'home_team is required'),
  away_team: z.string().trim().min(1, 'away_team is required'),
  market: z.string().trim().min(1, 'market is required'),
  selection: z.string().trim().min(1, 'selection is required'),
  recommended_odds: z.number().min(1, 'recommended_odds must be greater than 1'),
  closing_odds: z.number().min(1, 'closing_odds must be greater than 1').optional(),
  stake: z.number().min(0, 'stake must be greater than or equal to 0').default(1),
  notes: z.string().optional(),
  result: ResultSchema.optional(),
}).refine(
  (data) => data.home_team.toLowerCase() !== data.away_team.toLowerCase(),
  {
    message: 'home_team and away_team cannot be the same',
    path: ['away_team'],
  }
);

export const UpdatePickSchema = z.object({
  source: z.string().trim().optional(),
  match_date: z.string().datetime({ offset: true }).optional(),
  competition: z.string().trim().optional(),
  home_team: z.string().trim().min(1).optional(),
  away_team: z.string().trim().min(1).optional(),
  market: z.string().trim().min(1).optional(),
  selection: z.string().trim().min(1).optional(),
  recommended_odds: z.number().min(1).optional(),
  closing_odds: z.number().min(1, 'closing_odds must be greater than 1').optional(),
  stake: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const ClosingLineSchema = z.object({
  closing_odds: z.number().min(1, 'closing_odds must be greater than 1'),
});

export const ResultSettlementSchema = z.object({
  result: ResultSchema,
});
