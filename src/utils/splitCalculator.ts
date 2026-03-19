import { SplitShare, SplitType } from '../types';

const EPSILON = 0.01;

// calculateSplits generates the splits array based on the split type and overrides provided.

export function calculateSplits(
  splitType:   SplitType,
  totalAmount: number,
  memberIds:   string[],
  overrides?: {
    exactAmounts?: Record<string, number>;
    percentages?:  Record<string, number>;
    shareUnits?:   Record<string, number>;
  },
): SplitShare[] {
  const n = memberIds.length;
  if (n === 0) throw new Error('At least one member required');

  switch (splitType) {

    case 'equal': {
      const base      = parseFloat((totalAmount / n).toFixed(2));
      const remainder = parseFloat((totalAmount - base * n).toFixed(2));
      return memberIds.map((id, i) => ({
        memberId: id,
        amount:   i === 0 ? parseFloat((base + remainder).toFixed(2)) : base,
      }));
    }

    case 'exact': {
      const amounts = overrides?.exactAmounts ?? {};
      const sum     = memberIds.reduce((s, id) => s + (amounts[id] ?? 0), 0);
      if (Math.abs(sum - totalAmount) > EPSILON) {
        throw new Error(
          `Amounts must sum to ${totalAmount.toFixed(2)} (currently ${sum.toFixed(2)})`,
        );
      }
      return memberIds.map(id => ({
        memberId: id,
        amount:   parseFloat((amounts[id] ?? 0).toFixed(2)),
      }));
    }

    case 'percentage': {
      const pcts   = overrides?.percentages ?? {};
      const pctSum = memberIds.reduce((s, id) => s + (pcts[id] ?? 0), 0);
      if (Math.abs(pctSum - 100) > EPSILON) {
        throw new Error(
          `Percentages must sum to 100 (currently ${pctSum.toFixed(2)})`,
        );
      }
      return memberIds.map(id => ({
        memberId:   id,
        amount:     parseFloat(((pcts[id] ?? 0) / 100 * totalAmount).toFixed(2)),
        percentage: pcts[id] ?? 0,
      }));
    }

    case 'shares': {
      const units      = overrides?.shareUnits ?? {};
      const totalUnits = memberIds.reduce((s, id) => s + (units[id] ?? 1), 0);
      if (totalUnits === 0) throw new Error('Share units must be greater than 0');
      return memberIds.map(id => ({
        memberId: id,
        amount:   parseFloat(((units[id] ?? 1) / totalUnits * totalAmount).toFixed(2)),
        shares:   units[id] ?? 1,
      }));
    }

    default:
      throw new Error(`Unknown split type: ${splitType}`);
  }
}

// validateSplits checks if the splits are consistent with the total amount and split type rules.

export function validateSplits(
  splits:      SplitShare[],
  totalAmount: number,
  splitType:   SplitType,
): string | null {
  const sum = splits.reduce((s, sp) => s + sp.amount, 0);

  if (Math.abs(sum - totalAmount) > EPSILON) {
    return `Split total (${sum.toFixed(2)}) doesn't match amount (${totalAmount.toFixed(2)})`;
  }

  if (splitType === 'percentage') {
    const pctSum = splits.reduce((s, sp) => s + (sp.percentage ?? 0), 0);
    if (Math.abs(pctSum - 100) > EPSILON) {
      return `Percentages must sum to 100 (currently ${pctSum.toFixed(2)})`;
    }
  }

  return null;
}
