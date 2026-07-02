export function calculateClvPercent(
  recommendedOdds: number,
  closingOdds: number
): number {
  if (closingOdds <= 1) {
    return 0;
  }
  return (recommendedOdds / closingOdds - 1) * 100;
}

export function calculateClvDirection(
  recommendedOdds: number,
  closingOdds: number | null
): "positive" | "negative" | "neutral" | null {
  if (closingOdds === null || closingOdds === undefined) {
    return null;
  }
  if (recommendedOdds > closingOdds) {
    return "positive";
  }
  if (recommendedOdds < closingOdds) {
    return "negative";
  }
  return "neutral";
}

export function calculateProfitLoss(
  result: string | null | undefined,
  stake: number,
  recommendedOdds: number
): number {
  if (!result) {
    return 0;
  }
  switch (result) {
    case "won":
      return stake * (recommendedOdds - 1);
    case "lost":
      return -stake;
    case "push":
    case "void":
      return 0;
    default:
      return 0;
  }
}
