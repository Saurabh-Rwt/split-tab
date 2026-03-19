import { simplifyDebts, computeNetBalances } from '../utils/settlementAlgorithm';

//  simplifyDebts tests
describe('simplifyDebts', () => {

  test('basic 2-person debt', () => {
    const balances = [
      { memberId: 'A', netAmount: -100, currency: 'INR' as const },
      { memberId: 'B', netAmount:  100, currency: 'INR' as const },
    ];
    const result = simplifyDebts(balances, 'INR');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ fromId: 'A', toId: 'B', amount: 100 });
  });

  test('circular debt: A owes B, B owes C → A pays C directly (1 txn)', () => {
    // After A paid nothing, B paid for A, C paid for B
    // Net: A = -200, B = 0, C = +200
    const balances = [
      { memberId: 'A', netAmount: -200, currency: 'INR' as const },
      { memberId: 'B', netAmount:    0, currency: 'INR' as const },
      { memberId: 'C', netAmount:  200, currency: 'INR' as const },
    ];
    const result = simplifyDebts(balances, 'INR');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ fromId: 'A', toId: 'C', amount: 200 });
  });

  test('4-member circular debt is simplified to ≤ N-1 transactions', () => {
    // A owes B 300, B owes C 200, C owes D 100, D owes A 400
    // Net: A = -300+400 = +100, B = +300-200 = +100, C = +200-100 = +100, D = +100-400 = -300
    const balances = [
      { memberId: 'A', netAmount:  100, currency: 'INR' as const },
      { memberId: 'B', netAmount:  100, currency: 'INR' as const },
      { memberId: 'C', netAmount:  100, currency: 'INR' as const },
      { memberId: 'D', netAmount: -300, currency: 'INR' as const },
    ];
    const result = simplifyDebts(balances, 'INR');
    expect(result.length).toBeLessThanOrEqual(3);
    const total = result.reduce((sum, r) => sum + r.amount, 0);
    expect(Math.round(total)).toBe(300);
  });

  test('all balances zero → no suggestions', () => {
    const balances = [
      { memberId: 'A', netAmount: 0, currency: 'INR' as const },
      { memberId: 'B', netAmount: 0, currency: 'INR' as const },
      { memberId: 'C', netAmount: 0, currency: 'INR' as const },
    ];
    expect(simplifyDebts(balances, 'INR')).toHaveLength(0);
  });

  test('1 payer, N others — minimum N-1 transactions', () => {
    // A paid for B, C, D equally (300 total)
    // Net: A = +200, B = -100, C = -100 (D = 0 if they paid their share)
    const balances = [
      { memberId: 'A', netAmount:  200, currency: 'INR' as const },
      { memberId: 'B', netAmount: -100, currency: 'INR' as const },
      { memberId: 'C', netAmount: -100, currency: 'INR' as const },
    ];
    const result = simplifyDebts(balances, 'INR');
    expect(result).toHaveLength(2);
    const total = result.reduce((sum, r) => sum + r.amount, 0);
    expect(total).toBe(200);
  });

});

//  computeNetBalances tests
describe('computeNetBalances', () => {

  test('A pays ₹300 for 3-way equal split', () => {
    const expenses = [{
      amount:   300,
      paidById: 'A',
      splits: [
        { memberId: 'A', amount: 100 },
        { memberId: 'B', amount: 100 },
        { memberId: 'C', amount: 100 },
      ],
    }];

    const net = computeNetBalances(['A', 'B', 'C'], expenses, [], 'INR');
    // A paid 300, owes 100 → net +200
    // B owes 100 → net -100
    // C owes 100 → net -100
    expect(net.find(n => n.memberId === 'A')?.netAmount).toBe(200);
    expect(net.find(n => n.memberId === 'B')?.netAmount).toBe(-100);
    expect(net.find(n => n.memberId === 'C')?.netAmount).toBe(-100);
  });

  test('settlement reduces debt correctly', () => {
    const expenses = [{
      amount:   200,
      paidById: 'A',
      splits: [
        { memberId: 'A', amount: 100 },
        { memberId: 'B', amount: 100 },
      ],
    }];

    const settlements = [{ fromId: 'B', toId: 'A', amount: 100 }];
    const net = computeNetBalances(['A', 'B'], expenses, settlements, 'INR');

    // After B pays A 100, both should be at 0
    expect(net.find(n => n.memberId === 'A')?.netAmount).toBe(0);
    expect(net.find(n => n.memberId === 'B')?.netAmount).toBe(0);
  });

  test('end-to-end: compute then simplify', () => {
    const expenses = [{
      amount:   300,
      paidById: 'A',
      splits: [
        { memberId: 'A', amount: 100 },
        { memberId: 'B', amount: 100 },
        { memberId: 'C', amount: 100 },
      ],
    }];

    const net         = computeNetBalances(['A', 'B', 'C'], expenses, [], 'INR');
    const suggestions = simplifyDebts(net, 'INR');

    expect(suggestions).toHaveLength(2);
    const total = suggestions.reduce((sum, sg) => sum + sg.amount, 0);
    expect(total).toBe(200);
    suggestions.forEach(sg => expect(sg.toId).toBe('A'));
  });

});
