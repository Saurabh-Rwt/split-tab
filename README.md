# ARCHITECTURE

## 1. Data Model

I used a normalized structure with separate slices for users, groups, expenses, and settlements. Each entity is linked via IDs (for example, expenses store `groupId`, `paidBy`, and splits array).

For storage, I used local persistence (AsyncStorage/MMKV) since there is no backend. I chose this over SQLite because the data size is small and setup is simpler for this assignment.

---

## 2. Settlement Algorithm

I calculate each member’s net balance (who owes or is owed), then split them into two lists:

* debtors (negative balance)
* creditors (positive balance)

Then I match them greedily:

* take one debtor and one creditor
* settle the minimum amount between them
* update balances and repeat

This reduces the number of transactions and handles circular debt.

Time complexity is roughly O(n log n) due to sorting.

---

## 3. Balance Consistency

Balances are not stored directly. They are derived using selectors from expenses and settlements.

This avoids stale data because:

* any update (add/edit/delete) automatically recalculates balances
* no duplication of state

---

## 4. Split Validation

Validation is handled before saving the expense:

* Exact → sum must match total
* Percentage → must equal 100%
* Shares → calculated proportionally

Even if validation is bypassed, invalid data cannot be saved because checks run in the same function that updates state.

---

## 5. Currency Architecture

When an expense is added:

* the current exchange rate is fetched (or taken from cache if offline)
* that rate is stored along with the expense

If user is offline:

* last cached rate is used
* a flag indicates offline mode

When viewing later:

* stored historical rate is used (not latest API rate)

---

## 6. Location Search

Implemented using:

* debounce (400ms) to limit API calls
* request cancellation using abort controller

Flow:
keystroke → debounce → API call → results → UI update

Last 5 successful searches are cached locally and shown as suggestions.

---

## 7. Extensibility (Recurring Expenses)

To support recurring expenses:

* Data model: add recurrence fields (frequency, next date)
* State: scheduler to generate new entries
* UI: option while creating expense

Existing logic (splits, balances, settlements) would not need changes, since recurring expenses behave like normal expenses once created.

---

## Final Notes

Focus was on keeping logic simple, predictable, and easy to extend. Most calculations are derived instead of stored to avoid inconsistencies.
