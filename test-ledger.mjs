/**
 * Automated Verification Suite for PESO Core Accounting Engine & 7 Modules
 */
import assert from 'node:assert/strict';
import {
  LedgerStore,
  computeLedgerMetrics,
  createDemoLedgerState,
  roundCurrency
} from './js/ledger.js';

// Mock localStorage for Node environment
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k)
};

console.log('=== PESO IMMUTABLE LEDGER VERIFICATION SUITE ===');

const store = new LedgerStore();
const initialMetrics = store.getMetrics();

// 1. Verify Strict Accounting Equation on Demo State
const expectedNet = roundCurrency(
  initialMetrics.initialTotal + initialMetrics.totalInflows - initialMetrics.totalExpenses
);
assert.equal(initialMetrics.totalNetBalance, expectedNet, 'Total Net Balance equation mismatch');

const expectedSpendable = roundCurrency(
  initialMetrics.totalNetBalance - initialMetrics.totalLockedSavings
);
assert.equal(initialMetrics.spendableBalance, expectedSpendable, 'Spendable Balance equation mismatch');
console.log(
  `[PASS] 1. Accounting Equation Verified: Initial (₱${initialMetrics.initialTotal}) + Inflows (₱${initialMetrics.totalInflows}) - Expenses (₱${initialMetrics.totalExpenses}) = Net (₱${initialMetrics.totalNetBalance}) - Locked Savings (₱${initialMetrics.totalLockedSavings}) = Spendable (₱${initialMetrics.spendableBalance})`
);

// 2. Verify Atomic Expense CRUD (Create, Edit, Delete) & Input Validation
const invalidZero = store.addExpense({
  title: 'Invalid Zero Item',
  amount: 0,
  category: 'food',
  wallet: 'cash',
  date: new Date().toISOString().slice(0, 10)
});
assert.equal(invalidZero.ok, false, 'Zero expense should be blocked');

const addRes = store.addExpense({
  title: 'Test Lab Manual Printing',
  amount: 200,
  category: 'academic',
  wallet: 'cash',
  date: new Date().toISOString().slice(0, 10),
  merchantOrNote: 'Campus Print Shop'
});
assert.equal(addRes.ok, true, 'Valid expense should succeed');
const afterAddMetrics = store.getMetrics();
assert.equal(
  afterAddMetrics.spendableBalance,
  roundCurrency(initialMetrics.spendableBalance - 200),
  'Spendable balance must decrease by exact expense amount'
);

const editRes = store.updateExpense(addRes.expense.id, {
  title: 'Test Lab Manual Printing (Revised)',
  amount: 350,
  category: 'academic',
  wallet: 'cash',
  date: new Date().toISOString().slice(0, 10),
  merchantOrNote: 'Campus Print Shop'
});
assert.equal(editRes.ok, true, 'Expense edit should succeed');
const afterEditMetrics = store.getMetrics();
assert.equal(
  afterEditMetrics.spendableBalance,
  roundCurrency(initialMetrics.spendableBalance - 350),
  'Spendable balance must reflect edited expense delta'
);

const delRes = store.deleteExpense(addRes.expense.id);
assert.equal(delRes.ok, true, 'Expense delete should succeed');
const afterDelMetrics = store.getMetrics();
assert.equal(
  afterDelMetrics.spendableBalance,
  initialMetrics.spendableBalance,
  'Deleting expense must restore exact Spendable Balance'
);
console.log('[PASS] 2. Atomic Expense CRUD & Validation verified.');

// 3. Verify Escrow Savings Goals (Preventing Phantom Savings)
const goalId = store.getState().savingsGoals[0].id;
const allocRes = store.allocateToGoal(goalId, {
  amount: 500,
  wallet: 'cash',
  note: 'Test escrow lock'
});
assert.equal(allocRes.ok, true, 'Escrow allocation should succeed');
const afterAllocMetrics = store.getMetrics();
assert.equal(
  afterAllocMetrics.spendableBalance,
  roundCurrency(initialMetrics.spendableBalance - 500),
  'Allocating to savings goal must deduct exact amount from Spendable Balance'
);
assert.equal(
  afterAllocMetrics.totalLockedSavings,
  roundCurrency(initialMetrics.totalLockedSavings + 500),
  'Total locked savings must increase by exact allocation'
);

const withdrawRes = store.withdrawFromGoal(goalId, {
  amount: 500,
  wallet: 'cash',
  note: 'Test escrow release'
});
assert.equal(withdrawRes.ok, true, 'Escrow withdrawal should succeed');
const afterWithdrawMetrics = store.getMetrics();
assert.equal(
  afterWithdrawMetrics.spendableBalance,
  initialMetrics.spendableBalance,
  'Withdrawing from savings goal must restore Spendable Balance'
);
console.log('[PASS] 3. Escrow Savings Goals (Lock & Withdraw) verified.');

// 4. Verify Two-Tier Budget & Category Limit Over-Allocation Alert
const overCapRes = store.updateCategoryLimits({
  food: 3500,
  transit: 1500,
  academic: 1500,
  dorm: 2500,
  leisure: 1000
});
assert.equal(overCapRes.ok, true);
assert.ok(overCapRes.warning, 'Should warn when sum of category limits (10,000) > global budget (8,500)');
console.log('[PASS] 4. Two-Tier Budget Hierarchy & Over-Allocation Alert verified.');

// 5. Verify User Registration (Name, any email, password), Outside Demo Mode & Data Persistence
const regRes = store.registerStudent({
  fullName: 'Alex Cruz',
  email: 'alexcruz@gmail.com',
  password: 'alexpassword123'
});
assert.equal(regRes.ok, true, 'User registration with any email should succeed');
assert.equal(store.getState().student.authenticated, true, 'Registered user should be authenticated');
assert.equal(store.getState().student.fullName, 'Alex Cruz');
assert.equal(store.getState().student.email, 'alexcruz@gmail.com');
assert.equal(store.getState().meta.isDemoMode, false, 'Registered user must NOT be in demo mode');

// Check that a new user starts with strictly 0 balance in single cash flow
const newStudentMetrics = store.getMetrics();
assert.equal(newStudentMetrics.initialTotal, 0, 'New user starting baseline must be 0.00');
assert.equal(newStudentMetrics.walletBalances.cash.spendable, 0, 'Cash spendable balance must be 0.00');
assert.equal(newStudentMetrics.totalInflows, 0, 'Inflows must be 0.00');
assert.equal(newStudentMetrics.totalExpenses, 0, 'Expenses must be 0.00');
assert.equal(newStudentMetrics.totalLockedSavings, 0, 'Locked savings must be 0.00');
assert.equal(newStudentMetrics.totalNetBalance, 0, 'Total Net balance must be 0.00');
assert.equal(newStudentMetrics.spendableBalance, 0, 'Spendable balance must be 0.00');
assert.equal(newStudentMetrics.totalBudget, 0, 'Total period budget must be 0.00');
console.log('[PASS] 5a. Brand new user starts with strictly ₱0.00 cash balance.');

// Check Quick Presets customization
const initialPresets = store.getQuickPresets();
assert.ok(Array.isArray(initialPresets) && initialPresets.length >= 5, 'Must have default quick presets');

const updatePresetsRes = store.updateQuickPresets([
  { title: 'Milk Tea Treat', amount: 95, category: 'food', wallet: 'cash' },
  { title: 'Tricycle Ride', amount: 20, category: 'transit', wallet: 'cash' },
  { title: 'Photocopy Notes', amount: 15, category: 'academic', wallet: 'cash' }
]);
assert.equal(updatePresetsRes.ok, true, 'Preset update should succeed');
assert.equal(store.getQuickPresets().length, 3);
assert.equal(store.getQuickPresets()[0].title, 'Milk Tea Treat');
assert.equal(store.getQuickPresets()[0].amount, 95);

// Reset quick presets back to default
const resetPresetsRes = store.resetQuickPresets();
assert.equal(resetPresetsRes.ok, true, 'Reset presets to defaults should succeed');
assert.equal(store.getQuickPresets().length, 5, 'Default presets should be restored');
console.log('[PASS] 5b. Quick Fill customization and restore defaults verified.');

// Outside demo mode, resetDemoData must be rejected
const resetOutsideDemo = store.resetDemoData();
assert.equal(resetOutsideDemo.ok, false, 'Reset Demo must be blocked when outside demo mode');

// Trying to spend with ₱0 balance returns friendly error
const zeroSpendCheck = store.addExpense({
  title: 'Alex Books & Notebooks',
  amount: 450,
  category: 'academic',
  wallet: 'cash',
  date: new Date().toISOString().slice(0, 10)
});
assert.equal(zeroSpendCheck.ok, false, 'Spending with 0 balance should be prevented');
assert.ok(zeroSpendCheck.error.includes('Insufficient Spendable Balance'));

// Alex adds weekly allowance in My Wallet
const alexInflow = store.addInflow({
  amount: 1500,
  wallet: 'cash',
  type: 'ALLOWANCE',
  description: 'Weekly Allowance from Parents',
  date: new Date().toISOString().slice(0, 10)
});
assert.equal(alexInflow.ok, true, 'Adding allowance should succeed');
assert.equal(store.getMetrics().spendableBalance, 1500, 'Spendable balance must now be 1500.00');

// Log custom expense for Alex after receiving allowance
const alexExp = store.addExpense({
  title: 'Alex Books & Notebooks',
  amount: 450,
  category: 'academic',
  wallet: 'cash',
  date: new Date().toISOString().slice(0, 10)
});
assert.equal(alexExp.ok, true, 'Expense with sufficient funds must succeed');
assert.equal(store.getMetrics().spendableBalance, 1050, 'Spendable balance must now be 1050.00');

// Logout
const logoutRes = store.logout();
assert.equal(logoutRes.ok, true);
assert.equal(store.getState().student.authenticated, false, 'Logged out state must be unauthenticated');

// Login with Alex's credentials
const loginRes = store.login('alexcruz@gmail.com', 'alexpassword123');
assert.equal(loginRes.ok, true, 'Login with saved credentials must succeed');
assert.equal(store.getState().student.authenticated, true);
assert.equal(store.getState().meta.isDemoMode, false, 'Logged in real user is outside demo mode');
const foundAlexExp = store.getState().expenses.find(e => e.title === 'Alex Books & Notebooks');
assert.ok(foundAlexExp, 'Alex custom expenses must persist across sessions in saved user data');

console.log('[PASS] 5. Account Registration (Name, any email, password), Outside Demo Mode & Data Persistence verified.');

// 6. Test SQLite Database Engine (server/db.mjs)
import {
  registerUserInDb,
  authenticateUserInDb,
  syncLedgerStateInDb,
  getUserLedgerFromDb,
  getDatabaseStats
} from './server/db.mjs';

const dbReg = registerUserInDb({
  fullName: 'Kier Student',
  email: 'kier.student@campus.edu.ph',
  password: 'kierpassword'
});
assert.equal(dbReg.ok, true, 'SQLite user registration must succeed');
assert.equal(dbReg.state.initialBalance.breakdown.cash, 0, 'SQLite new user starts with 0.00 cash');

const dbAuth = authenticateUserInDb('kier.student@campus.edu.ph', 'kierpassword');
assert.equal(dbAuth.ok, true, 'SQLite user authentication must succeed');
assert.equal(dbAuth.user.fullName, 'Kier Student');

// Sync Alex's ledger state into SQLite and verify relational tables
const dbSync = syncLedgerStateInDb('alexcruz@gmail.com', store.getState());
assert.equal(dbSync.ok, true, 'SQLite ledger sync must succeed');
assert.equal(dbSync.metrics.spendableBalance, 1050, 'SQLite synced spendable balance must be 1050.00');

const dbFetched = getUserLedgerFromDb('alexcruz@gmail.com');
assert.ok(dbFetched && dbFetched.state, 'SQLite must return stored ledger JSON');
assert.equal(dbFetched.state.expenses.length, 1);

const dbStats = getDatabaseStats();
assert.equal(dbStats.ok, true);
assert.ok(dbStats.counts.users >= 3, 'SQLite must store Demo, Alex, and Kier accounts');
assert.ok(dbStats.counts.transactions >= 10, 'SQLite must store normalized cash transactions');
console.log('[PASS] 6. Relational SQLite Database (users, ledgers, transactions, savings_goals, audit_logs) verified.');

console.log('ALL PESO LEDGER & SQLITE DATABASE INVARIANTS PASSED.');
