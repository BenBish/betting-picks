import { describe, expect, it } from "bun:test";
import {
  calculateClvDirection,
  calculateClvPercent,
  calculateProfitLoss,
} from "./calculations";

describe("calculateClvPercent", () => {
  it("returns positive CLV when recommended odds > closing odds", () => {
    const result = calculateClvPercent(2.1, 1.95);
    expect(result).toBeCloseTo(7.69);
  });

  it("returns negative CLV when recommended odds < closing odds", () => {
    const result = calculateClvPercent(1.8, 2.0);
    expect(result).toBeCloseTo(-10);
  });

  it("returns 0 when odds are equal", () => {
    const result = calculateClvPercent(2.0, 2.0);
    expect(result).toBeCloseTo(0);
  });

  it("returns 0 when closing odds <= 1", () => {
    const result = calculateClvPercent(2.0, 0.5);
    expect(result).toBe(0);
  });
});

describe("calculateProfitLoss", () => {
  it("calculates correct profit for won pick", () => {
    const result = calculateProfitLoss("won", 10, 2.5);
    expect(result).toBe(15);
  });

  it("returns negative stake for lost pick", () => {
    const result = calculateProfitLoss("lost", 10, 2.5);
    expect(result).toBe(-10);
  });

  it("returns 0 for push", () => {
    const result = calculateProfitLoss("push", 10, 2.5);
    expect(result).toBe(0);
  });

  it("returns 0 for void", () => {
    const result = calculateProfitLoss("void", 10, 2.5);
    expect(result).toBe(0);
  });

  it("returns 0 for null result", () => {
    const result = calculateProfitLoss(null, 10, 2.5);
    expect(result).toBe(0);
  });

  it("returns 0 for undefined result", () => {
    const result = calculateProfitLoss(undefined, 10, 2.5);
    expect(result).toBe(0);
  });

  it("handles zero stake", () => {
    const result = calculateProfitLoss("won", 0, 2.5);
    expect(result).toBe(0);
  });
});

describe("calculateClvDirection", () => {
  it("returns positive when recommended > closing", () => {
    expect(calculateClvDirection(2.1, 1.95)).toBe("positive");
  });

  it("returns negative when recommended < closing", () => {
    expect(calculateClvDirection(1.8, 2.0)).toBe("negative");
  });

  it("returns neutral when equal", () => {
    expect(calculateClvDirection(2.0, 2.0)).toBe("neutral");
  });

  it("returns null when closing is null", () => {
    expect(calculateClvDirection(2.0, null)).toBeNull();
  });

  it("returns null when closing is undefined", () => {
    expect(
      calculateClvDirection(2.0, undefined as unknown as number | null)
    ).toBeNull();
  });
});
