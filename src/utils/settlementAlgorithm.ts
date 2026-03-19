import { MemberBalance, DebtSuggestion, Currency } from '../types';

export function computeNetBalances(
  memberIds: string[],
  expenses: Array<{
    amount:   number;
    paidById: string;
    splits:   Array<{ memberId: string; amount: number }>;
  }>,
  settlements: Array<{
    fromId:  string;
    toId:    string;
    amount:  number;
  }>,
  currency: Currency,
): MemberBalance[] {

  // Initialise all members to zero
  const net: Record<string, number> = {};
  memberIds.forEach(id => (net[id] = 0));

  // Process expenses
  for (const expense of expenses) {
    // Payer is credited the full amount
    net[expense.paidById] = (net[expense.paidById] ?? 0) + expense.amount;

    // Each split member is debited their share
    for (const split of expense.splits) {
      net[split.memberId] = (net[split.memberId] ?? 0) - split.amount;
    }
  }

  // Process settlements
  // fromId paid toId → fromId balance goes UP, toId balance goes DOWN
  for (const s of settlements) {
    net[s.fromId] = (net[s.fromId] ?? 0) + s.amount;
    net[s.toId]   = (net[s.toId]   ?? 0) - s.amount;
  }

  return memberIds.map(id => ({
    memberId:  id,
    netAmount: Math.round((net[id] ?? 0) * 100) / 100,
    currency,
  }));
}

const EPSILON = 0.01;

export function simplifyDebts(
  balances: MemberBalance[],
  currency: Currency,
): DebtSuggestion[] {

  // Work with mutable copies rounded to 2dp
  const creditors = balances
    .filter(b => b.netAmount > EPSILON)
    .map(b => ({ memberId: b.memberId, amount: Math.round(b.netAmount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = balances
    .filter(b => b.netAmount < -EPSILON)
    .map(b => ({ memberId: b.memberId, amount: Math.round(b.netAmount * 100) / 100 }))
    .sort((a, b) => a.amount - b.amount); // most negative first

  const suggestions: DebtSuggestion[] = [];

  let ci = 0; // creditor pointer
  let di = 0; // debtor pointer

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor   = debtors[di];

    const settle        = Math.min(creditor.amount, -debtor.amount);
    const roundedSettle = Math.round(settle * 100) / 100;

    if (roundedSettle > EPSILON) {
      suggestions.push({
        fromId:   debtor.memberId,
        toId:     creditor.memberId,
        amount:   roundedSettle,
        currency,
      });
    }

    creditor.amount = Math.round((creditor.amount - settle) * 100) / 100;
    debtor.amount   = Math.round((debtor.amount   + settle) * 100) / 100;

    if (creditor.amount <= EPSILON) ci++;
    if (-debtor.amount  <= EPSILON) di++;
  }

  return suggestions;
}