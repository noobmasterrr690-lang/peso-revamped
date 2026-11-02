/**
 * PESO Bundled Production Script
 * Full-Stack React/Capacitor + SQLite Student Cash Budgeting Distribution
 */
(function() {
  'use strict';
/**
 * PESO — Personal Expense & Spending Organizer
 * Core Accounting Engine & Immutable Transaction Ledger State Machine
 *
 * Enforces the strict accounting identities:
 *   Total Net Balance = Initial Balance + Sum(Allowance/Inflows) - Sum(Logged Expenses)
 *   Spendable Balance = Total Net Balance - Sum(Locked Savings Allocations)
 */

const STORAGE_KEY = 'PESO_LEDGER_STATE_V1';
const USERS_STORAGE_KEY = 'PESO_REGISTERED_USERS_V1';

const EXPENSE_CATEGORIES = [
  {
    id: 'food',
    code: 'CAT-01',
    name: 'Food & Dining',
    shortName: 'Food & Dining',
    description: 'Canteen meals, karinderya, coffee, groceries, drinking water'
  },
  {
    id: 'transit',
    code: 'CAT-02',
    name: 'Campus Transit',
    shortName: 'Campus Transit',
    description: 'Jeepney, LRT/MRT, tricycle, student fare, Angkas/MoveIt'
  },
  {
    id: 'academic',
    code: 'CAT-03',
    name: 'Academic & Printing',
    shortName: 'Academic & Print',
    description: 'Thesis binding, photocopy, lab manuals, stationery, org dues'
  },
  {
    id: 'dorm',
    code: 'CAT-04',
    name: 'Dorm & Utilities',
    shortName: 'Dorm & Utilities',
    description: 'Dorm share, laundry, mobile data load, electricity contribution'
  },
  {
    id: 'leisure',
    code: 'CAT-05',
    name: 'Personal & Leisure',
    shortName: 'Personal/Leisure',
    description: 'Peer hangouts, streaming share, hygiene, personal care'
  }
];

const WALLET_CHANNELS = [
  { id: 'cash', code: 'WLT-CASH', name: 'Cash on Hand', badge: 'CASH' }
];

const INFLOW_TYPES = [
  { id: 'ALLOWANCE', label: 'Regular Cash Allowance' },
  { id: 'SCHOLARSHIP', label: 'Scholarship / Stipend Grant' },
  { id: 'PART_TIME', label: 'Part-Time / Student Work Pay' },
  { id: 'GIFT_REMITTANCE', label: 'Family Cash Gift' },
  { id: 'RECONCILIATION_ADJ', label: 'Cash Count Adjustment' }
];

const DEFAULT_QUICK_PRESETS = [
  { id: 'qp-1', label: 'Canteen Meal (₱85)', title: 'Canteen Meal', amount: 85.00, category: 'food', wallet: 'cash' },
  { id: 'qp-2', label: 'Jeep / LRT Fare (₱30)', title: 'Jeepney / LRT Fare', amount: 30.00, category: 'transit', wallet: 'cash' },
  { id: 'qp-3', label: 'Printing / Xerox (₱25)', title: 'Handout Printing', amount: 25.00, category: 'academic', wallet: 'cash' },
  { id: 'qp-4', label: 'Coffee / Snack (₱65)', title: 'Coffee & Snack', amount: 65.00, category: 'food', wallet: 'cash' },
  { id: 'qp-5', label: 'School Supplies (₱60)', title: 'Notebook & Pen', amount: 60.00, category: 'academic', wallet: 'cash' }
];

/**
 * Format numeric amount into strict Philippine Peso (₱) tabular string
 */
function formatPHP(amount, showSign = false) {
  const num = Number(amount) || 0;
  const absFormatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(num));

  if (num < 0) {
    return `-₱${absFormatted}`;
  }
  if (showSign && num > 0) {
    return `+₱${absFormatted}`;
  }
  return `₱${absFormatted}`;
}

/**
 * Generate deterministic-style receipt/audit reference IDs
 */
function generateRefId(prefix = 'TXN') {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${rand}`;
}

/**
 * Create realistic pre-populated Demo Student Ledger State in Philippine Pesos (₱)
 * Uses dates anchored around the current month so daily burn rates & remaining days work live.
 */
function createDemoLedgerState() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const todayDay = Math.min(Math.max(now.getDate(), 12), daysInMonth - 3);

  const makeDate = (dayOffset) => {
    const d = Math.max(1, Math.min(daysInMonth, todayDay + dayOffset));
    return `${year}-${month}-${String(d).padStart(2, '0')}`;
  };

  return {
    meta: {
      version: '1.0.0',
      ledgerId: 'PESO-LDG-2026-UPD',
      createdAt: `${year}-${month}-01T08:00:00+08:00`,
      lastAuditAt: new Date().toISOString(),
      isDemoMode: true
    },
    student: {
      studentId: '2023-10482-MN-0',
      fullName: 'Julianna Mae Reyes',
      university: 'Polytechnic University / State College',
      program: 'BS Computer Science — 3rd Year',
      email: 'jmreyes@iskolar.edu.ph',
      securityCode: 'PESO-4820',
      allowanceCycle: 'MONTHLY',
      authenticated: false
    },
    initialBalance: {
      initialized: true,
      refId: 'INI-804102',
      date: `${year}-${month}-01`,
      note: 'Starting semester pocket cash on hand',
      breakdown: {
        cash: 6000.00
      }
    },
    inflows: [
      {
        id: 'inf-1',
        refId: 'INF-901120',
        type: 'ALLOWANCE',
        wallet: 'cash',
        amount: 6000.00,
        description: 'Monthly student cash allowance from parents',
        date: `${year}-${month}-01`,
        createdAt: `${year}-${month}-01T09:15:00+08:00`
      },
      {
        id: 'inf-2',
        refId: 'INF-904518',
        type: 'SCHOLARSHIP',
        wallet: 'cash',
        amount: 2500.00,
        description: 'DOST-SEI Book & Connectivity stipend cash grant',
        date: makeDate(-7),
        createdAt: `${makeDate(-7)}T14:20:00+08:00`
      },
      {
        id: 'inf-3',
        refId: 'ADJ-908312',
        type: 'RECONCILIATION_ADJ',
        wallet: 'cash',
        amount: 150.00,
        description: 'Audited coin pouch & desk drawer cash count',
        date: makeDate(-3),
        createdAt: `${makeDate(-3)}T19:05:00+08:00`
      }
    ],
    expenses: [
      {
        id: 'exp-101',
        refId: 'EXP-301104',
        title: 'Dorm Co-op Shared Electric & Water Bill',
        category: 'dorm',
        wallet: 'cash',
        amount: 1450.00,
        date: `${year}-${month}-02`,
        merchantOrNote: 'Dorm Room 3B utility share paid in cash',
        createdAt: `${year}-${month}-02T10:30:00+08:00`
      },
      {
        id: 'exp-102',
        refId: 'EXP-301298',
        title: 'Weekly Canteen & Lagoon Meals Bundle',
        category: 'food',
        wallet: 'cash',
        amount: 920.00,
        date: makeDate(-9),
        merchantOrNote: 'Student Union Canteen — Rice bowls & gulaman',
        createdAt: `${makeDate(-9)}T12:45:00+08:00`
      },
      {
        id: 'exp-103',
        refId: 'EXP-301540',
        title: 'LRT-2 Stored Value Beep Load & Jeepney Fares',
        category: 'transit',
        wallet: 'cash',
        amount: 540.00,
        date: makeDate(-8),
        merchantOrNote: 'Pureza to Katipunan / Campus shuttle commutes',
        createdAt: `${makeDate(-8)}T07:50:00+08:00`
      },
      {
        id: 'exp-104',
        refId: 'EXP-301892',
        title: 'Software Engineering IEEE Manuscript Printing & Ringbind',
        category: 'academic',
        wallet: 'cash',
        amount: 685.00,
        date: makeDate(-6),
        merchantOrNote: 'Teresa Arcade Copy Center — 3 copies + acetate',
        createdAt: `${makeDate(-6)}T16:10:00+08:00`
      },
      {
        id: 'exp-105',
        refId: 'EXP-302115',
        title: 'Grocery Restock (Oats, Canned Tuna, Coffee, Eggs)',
        category: 'food',
        wallet: 'cash',
        amount: 1180.00,
        date: makeDate(-5),
        merchantOrNote: 'Campus Market — Dorm pantry essentials',
        createdAt: `${makeDate(-5)}T18:20:00+08:00`
      },
      {
        id: 'exp-106',
        refId: 'EXP-302409',
        title: 'Campus Prepaid Study Wi-Fi Card & Mobile Load',
        category: 'dorm',
        wallet: 'cash',
        amount: 599.00,
        date: makeDate(-4),
        merchantOrNote: 'Campus kiosk data reload for thesis research',
        createdAt: `${makeDate(-4)}T21:00:00+08:00`
      },
      {
        id: 'exp-107',
        refId: 'EXP-302771',
        title: 'Microcontroller Sensors & Breadboard Kit (Lab 4)',
        category: 'academic',
        wallet: 'cash',
        amount: 640.00,
        date: makeDate(-3),
        merchantOrNote: 'MakerLab Electronics — ESP32 + jumpers',
        createdAt: `${makeDate(-3)}T15:12:00+08:00`
      },
      {
        id: 'exp-108',
        refId: 'EXP-303104',
        title: 'Late-Night Thesis Group Study Brew & Pastries',
        category: 'food',
        wallet: 'cash',
        amount: 465.00,
        date: makeDate(-2),
        merchantOrNote: 'Kohi Campus Cafe — Spanish latte + toast',
        createdAt: `${makeDate(-2)}T20:15:00+08:00`
      },
      {
        id: 'exp-109',
        refId: 'EXP-303490',
        title: 'Exam Day Emergency Tricycle Ride & Shuttle',
        category: 'transit',
        wallet: 'cash',
        amount: 310.00,
        date: makeDate(-1),
        merchantOrNote: 'Rush campus ride for 7:30 AM Operating Systems exam',
        createdAt: `${makeDate(-1)}T07:05:00+08:00`
      },
      {
        id: 'exp-110',
        refId: 'EXP-303812',
        title: 'Org Film Screening Ticket & Post-Midterm Dinner',
        category: 'leisure',
        wallet: 'cash',
        amount: 490.00,
        date: makeDate(0),
        merchantOrNote: 'CS Society Block Screening & Samgyup share',
        createdAt: `${makeDate(0)}T19:30:00+08:00`
      }
    ],
    budget: {
      period: 'MONTHLY',
      totalBudget: 8500.00,
      periodStart: `${year}-${month}-01`,
      periodEnd: `${year}-${month}-${String(daysInMonth).padStart(2, '0')}`,
      categoryLimits: {
        food: 3000.00,      // Spent: 2565.00 -> 85.5% (CAUTION >=80%)
        transit: 1000.00,   // Spent: 850.00  -> 85.0% (CAUTION >=80%)
        academic: 1200.00,  // Spent: 1325.00 -> 110.4% (OVER-BUDGET BREACH >100%)
        dorm: 2300.00,      // Spent: 2049.00 -> 89.1% (CAUTION >=80%)
        leisure: 800.00     // Spent: 490.00  -> 61.3% (NOMINAL <80%)
      }
    },
    savingsGoals: [
      {
        id: 'goal-1',
        refId: 'SAV-701',
        name: 'Thesis Hardbound & IEEE Conference Fee',
        targetAmount: 3500.00,
        lockedAmount: 2100.00,
        deadline: `${year}-12-15`,
        priority: 'HIGH',
        notes: 'Escrow reserve for final manuscript binding and defense logistics',
        createdAt: `${year}-${month}-01T08:30:00+08:00`,
        history: [
          {
            id: 'sh-1',
            refId: 'ESC-501102',
            type: 'ALLOCATE',
            wallet: 'cash',
            amount: 1500.00,
            date: `${year}-${month}-02`,
            note: 'Initial semester thesis cash escrow lock'
          },
          {
            id: 'sh-2',
            refId: 'ESC-501884',
            type: 'ALLOCATE',
            wallet: 'cash',
            amount: 600.00,
            date: makeDate(-6),
            note: 'Locked from DOST stipend cash inflow'
          }
        ]
      },
      {
        id: 'goal-2',
        refId: 'SAV-702',
        name: 'Emergency Medical & Dorm Deposit Buffer',
        targetAmount: 2500.00,
        lockedAmount: 1250.00,
        deadline: `${year + 1}-03-30`,
        priority: 'MEDIUM',
        notes: 'Untouchable rainy-day buffer for clinic or utility spikes',
        createdAt: `${year}-${month}-01T08:35:00+08:00`,
        history: [
          {
            id: 'sh-3',
            refId: 'ESC-502019',
            type: 'ALLOCATE',
            wallet: 'cash',
            amount: 1250.00,
            date: `${year}-${month}-03`,
            note: '50% milestone cash allocation locked in vault'
          }
        ]
      },
      {
        id: 'goal-3',
        refId: 'SAV-703',
        name: '16GB DDR4 RAM Upgrade for Coding Laptop',
        targetAmount: 1800.00,
        lockedAmount: 650.00,
        deadline: `${year}-11-30`,
        priority: 'LOW',
        notes: 'For running local Docker containers and Android Studio smoothly',
        createdAt: `${year}-${month}-04T10:00:00+08:00`,
        history: [
          {
            id: 'sh-4',
            refId: 'ESC-502411',
            type: 'ALLOCATE',
            wallet: 'cash',
            amount: 650.00,
            date: makeDate(-4),
            note: 'Saved from canteen meal prep week'
          }
        ]
      }
    ],
    quickPresets: [...DEFAULT_QUICK_PRESETS],
    auditTrail: [
      {
        id: 'aud-1',
        refId: 'INI-804102',
        timestamp: `${year}-${month}-01T08:00:00+08:00`,
        action: 'INITIAL_BALANCE_SET',
        summary: 'Initialized student pocket cash baseline (Cash ₱6,000.00)',
        deltaNet: 6000.00,
        deltaSpendable: 6000.00
      },
      {
        id: 'aud-2',
        refId: 'INF-901120',
        timestamp: `${year}-${month}-01T09:15:00+08:00`,
        action: 'INFLOW_LOGGED',
        summary: 'Monthly student cash allowance from parents (+₱6,000.00)',
        deltaNet: 6000.00,
        deltaSpendable: 6000.00
      },
      {
        id: 'aud-3',
        refId: 'ESC-501102',
        timestamp: `${year}-${month}-02T09:00:00+08:00`,
        action: 'SAVINGS_ALLOCATED',
        summary: 'Locked ₱1,500.00 into Thesis Hardbound & IEEE Conference Fee',
        deltaNet: 0,
        deltaSpendable: -1500.00
      },
      {
        id: 'aud-4',
        refId: 'INF-904518',
        timestamp: `${makeDate(-7)}T14:20:00+08:00`,
        action: 'INFLOW_LOGGED',
        summary: 'DOST-SEI Book & Connectivity Partial Stipend (+₱2,500.00)',
        deltaNet: 2500.00,
        deltaSpendable: 2500.00
      },
      {
        id: 'aud-5',
        refId: 'ADJ-908312',
        timestamp: `${makeDate(-3)}T19:05:00+08:00`,
        action: 'RECONCILIATION_ADJUSTMENT',
        summary: 'Audited coin pouch & desk drawer cash reconciliation (+₱150.00)',
        deltaNet: 150.00,
        deltaSpendable: 150.00
      }
    ]
  };
}

/**
 * Pure Derived Accounting Selectors
 * Computes all balances, category burn rates, daily safe-to-spend, and wallet breakdowns
 * strictly from the immutable ledger state.
 */
function computeLedgerMetrics(state) {
  const b = state.initialBalance?.breakdown || { cash: 0 };
  const initialTotal = roundCurrency(
    (Number(b.cash) || 0) + (Number(b.ewallet) || 0) + (Number(b.bank) || 0)
  );

  const totalInflows = roundCurrency(
    (state.inflows || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  );

  const totalExpenses = roundCurrency(
    (state.expenses || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  );

  // Strict Accounting Equation #1:
  // Total Net Balance = Initial Balance + Sum(Allowance/Inflows) - Sum(Logged Expenses)
  const totalNetBalance = roundCurrency(initialTotal + totalInflows - totalExpenses);

  // Total Locked Savings across all Escrow Vaults
  const totalLockedSavings = roundCurrency(
    (state.savingsGoals || []).reduce((sum, goal) => sum + (Number(goal.lockedAmount) || 0), 0)
  );

  const totalSavingsTarget = roundCurrency(
    (state.savingsGoals || []).reduce((sum, goal) => sum + (Number(goal.targetAmount) || 0), 0)
  );

  // Strict Accounting Equation #2:
  // Spendable Balance = Total Net Balance - Sum(Locked Savings Allocations)
  const spendableBalance = roundCurrency(totalNetBalance - totalLockedSavings);

  // Single cash flow breakdown (strictly Cash only)
  const walletBalances = {
    cash: {
      initial: initialTotal,
      inflows: totalInflows,
      expenses: totalExpenses,
      locked: totalLockedSavings,
      net: totalNetBalance,
      spendable: spendableBalance
    }
  };

  // Budget & Category Limit Calculations
  const totalBudget = roundCurrency(Number(state.budget?.totalBudget) || 0);
  const categoryLimits = state.budget?.categoryLimits || {};

  const sumCategoryLimits = roundCurrency(
    EXPENSE_CATEGORIES.reduce((sum, cat) => sum + (Number(categoryLimits[cat.id]) || 0), 0)
  );

  const isCategoryLimitOverBudget = sumCategoryLimits > totalBudget && totalBudget > 0;
  const categoryLimitExcess = isCategoryLimitOverBudget
    ? roundCurrency(sumCategoryLimits - totalBudget)
    : 0;
  const unallocatedBudget = totalBudget > sumCategoryLimits
    ? roundCurrency(totalBudget - sumCategoryLimits)
    : 0;

  // Category spend breakdown
  const categoryBreakdown = EXPENSE_CATEGORIES.map((cat) => {
    const spent = roundCurrency(
      (state.expenses || [])
        .filter((e) => e.category === cat.id)
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    );
    const txCount = (state.expenses || []).filter((e) => e.category === cat.id).length;
    const limit = roundCurrency(Number(categoryLimits[cat.id]) || 0);
    const remaining = roundCurrency(limit - spent);
    const utilizationPct = limit > 0 ? (spent / limit) * 100 : (spent > 0 ? 100 : 0);
    const shareOfTotalSpendPct = totalExpenses > 0 ? (spent / totalExpenses) * 100 : 0;

    let status = 'NOMINAL'; // < 80%
    if (limit > 0 && spent > limit) {
      status = 'BREACH'; // > 100%
    } else if (limit > 0 && utilizationPct >= 80) {
      status = 'CAUTION'; // >= 80%
    }

    return {
      ...cat,
      spent,
      txCount,
      limit,
      remaining,
      utilizationPct,
      shareOfTotalSpendPct,
      status
    };
  });

  // Global Budget Status & Remaining Days in Period
  const remainingPeriodBudget = roundCurrency(totalBudget - totalExpenses);
  const globalBudgetUtilizationPct = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

  let globalBudgetStatus = 'NOMINAL';
  if (totalBudget > 0 && totalExpenses > totalBudget) {
    globalBudgetStatus = 'BREACH';
  } else if (totalBudget > 0 && globalBudgetUtilizationPct >= 80) {
    globalBudgetStatus = 'CAUTION';
  }

  // Calculate Remaining Days in Period
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let remainingDaysInPeriod = 1;
  let totalDaysInPeriod = 30;
  let elapsedDaysInPeriod = 1;

  if (state.budget?.periodEnd && state.budget?.periodStart) {
    const [ey, em, ed] = state.budget.periodEnd.split('-').map(Number);
    const [sy, sm, sd] = state.budget.periodStart.split('-').map(Number);
    const endMidnight = new Date(ey, em - 1, ed);
    const startMidnight = new Date(sy, sm - 1, sd);

    const diffMs = endMidnight.getTime() - todayMidnight.getTime();
    const totalMs = endMidnight.getTime() - startMidnight.getTime();
    totalDaysInPeriod = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)) + 1);
    remainingDaysInPeriod = Math.max(1, Math.min(totalDaysInPeriod, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1));
    elapsedDaysInPeriod = Math.max(1, totalDaysInPeriod - remainingDaysInPeriod + 1);
  }

  // Live "Safe-to-Spend Today" metric:
  // Uses Remaining Period Budget if a budget cap is set (> 0), or falls back to Spendable Cash Balance for new users
  const activeRemainingPool = totalBudget > 0 ? remainingPeriodBudget : spendableBalance;
  const safeToSpendToday = activeRemainingPool > 0
    ? roundCurrency(activeRemainingPool / remainingDaysInPeriod)
    : 0;

  const dailyBurnRate = roundCurrency(totalExpenses / elapsedDaysInPeriod);
  const projectedPeriodSpend = roundCurrency(dailyBurnRate * totalDaysInPeriod);

  // Ratios for Module 7 Financial Reports
  const totalInflowBase = roundCurrency(initialTotal + totalInflows);
  const savingsToExpenseRatio = totalExpenses > 0
    ? (totalLockedSavings / totalExpenses) * 100
    : (totalLockedSavings > 0 ? 100 : 0);
  const savingsRateOfInflow = totalInflowBase > 0
    ? (totalLockedSavings / totalInflowBase) * 100
    : 0;

  // Warnings count (categories in CAUTION or BREACH)
  const activeAlerts = [];
  if (isCategoryLimitOverBudget) {
    activeAlerts.push({
      level: 'BREACH',
      code: 'LIM-OVERALLOC',
      title: 'Category Caps Exceed Global Budget',
      message: `Sum of category limits (${formatPHP(sumCategoryLimits)}) exceeds your ${state.budget.period.toLowerCase()} budget cap (${formatPHP(totalBudget)}) by ${formatPHP(categoryLimitExcess)}.`
    });
  }
  if (globalBudgetStatus === 'BREACH') {
    activeAlerts.push({
      level: 'BREACH',
      code: 'BDG-BREACH',
      title: 'Global Period Budget Breached',
      message: `Total expenses (${formatPHP(totalExpenses)}) have exceeded your ${formatPHP(totalBudget)} period cap by ${formatPHP(Math.abs(remainingPeriodBudget))}.`
    });
  } else if (globalBudgetStatus === 'CAUTION') {
    activeAlerts.push({
      level: 'CAUTION',
      code: 'BDG-WARN80',
      title: 'Global Budget >= 80% Threshold',
      message: `You have consumed ${globalBudgetUtilizationPct.toFixed(1)}% of your period budget. Safe-to-Spend is ${formatPHP(safeToSpendToday)}/day.`
    });
  }

  for (const cat of categoryBreakdown) {
    if (cat.status === 'BREACH') {
      activeAlerts.push({
        level: 'BREACH',
        code: `${cat.code}-BREACH`,
        title: `${cat.shortName} Limit Breached (${cat.utilizationPct.toFixed(0)}%)`,
        message: `Spent ${formatPHP(cat.spent)} against ${formatPHP(cat.limit)} cap (Over by ${formatPHP(Math.abs(cat.remaining))}).`
      });
    } else if (cat.status === 'CAUTION') {
      activeAlerts.push({
        level: 'CAUTION',
        code: `${cat.code}-CAUTION`,
        title: `${cat.shortName} Approaching Cap (${cat.utilizationPct.toFixed(0)}%)`,
        message: `${formatPHP(cat.remaining)} remaining out of ${formatPHP(cat.limit)} limit.`
      });
    }
  }

  return {
    initialTotal,
    totalInflows,
    totalExpenses,
    totalNetBalance,
    totalLockedSavings,
    totalSavingsTarget,
    spendableBalance,
    walletBalances,
    totalBudget,
    sumCategoryLimits,
    isCategoryLimitOverBudget,
    categoryLimitExcess,
    unallocatedBudget,
    remainingPeriodBudget,
    globalBudgetUtilizationPct,
    globalBudgetStatus,
    remainingDaysInPeriod,
    totalDaysInPeriod,
    elapsedDaysInPeriod,
    safeToSpendToday,
    dailyBurnRate,
    projectedPeriodSpend,
    savingsToExpenseRatio,
    savingsRateOfInflow,
    categoryBreakdown,
    activeAlerts
  };
}

function roundCurrency(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

/**
 * Validate date string (YYYY-MM-DD) - prevents invalid dates or far-future dates
 */
function validateDateInput(dateStr, allowFuture = false) {
  if (!dateStr || typeof dateStr !== 'string') {
    return { valid: false, error: 'Date is required.' };
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    return { valid: false, error: 'Date must be in YYYY-MM-DD format.' };
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day ||
    year < 2020 ||
    year > 2035
  ) {
    return { valid: false, error: 'Invalid calendar date.' };
  }
  if (!allowFuture) {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (d > tomorrow) {
      return { valid: false, error: 'Expense/transaction date cannot be in the future.' };
    }
  }
  return { valid: true };
}

/**
 * Default Demo Credentials & Registered User Directory
 */
const DEFAULT_DEMO_USER = {
  studentId: '2023-10482-MN-0',
  email: 'jmreyes@iskolar.edu.ph',
  password: 'peso-student-2026',
  securityCode: 'PESO-4820',
  fullName: 'Julianna Mae Reyes',
  university: 'Polytechnic University / State College',
  program: 'BS Computer Science — 3rd Year',
  allowanceCycle: 'MONTHLY',
  isDemo: true
};

class LedgerStore {
  constructor() {
    this.listeners = new Set();
    this.dbStatus = {
      connected: false,
      engine: 'Local Storage + SQLite Sync',
      databaseFile: 'data/peso.sqlite',
      lastSyncedAt: null,
      lanUrl: '',
      counts: { users: 1, transactions: 0, savingsGoals: 0, auditLogs: 0 },
      accounts: []
    };
    this.state = this.loadState();
    this.ensureDefaultUserRegistered();
    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      this.checkDatabaseConnection();
    }
  }

  async checkDatabaseConnection() {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return this.dbStatus;
    try {
      const res = await window.fetch('/api/health', { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok) {
          this.dbStatus = {
            connected: true,
            engine: data.engine || 'SQLite 3 (node:sqlite WAL Mode)',
            databaseFile: data.databaseFile || 'data/peso.sqlite',
            lastSyncedAt: new Date().toISOString(),
            lanUrl: data.network?.lanUrl || window.location.origin,
            counts: data.counts || this.dbStatus.counts,
            accounts: data.accounts || []
          };
          // Also push current authenticated state to SQLite so DB is in sync
          if (this.state?.student?.email) {
            await this.syncToDatabase(this.state);
          }
          this.notify();
          return this.dbStatus;
        }
      }
    } catch {
      this.dbStatus.connected = false;
    }
    return this.dbStatus;
  }

  async syncToDatabase(stateToSync = this.state) {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    const email = stateToSync?.student?.email;
    if (!email) return;
    try {
      const res = await window.fetch('/api/ledger/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, state: stateToSync })
      });
      if (res.ok) {
        const result = await res.json();
        if (result && result.ok) {
          this.dbStatus.connected = true;
          this.dbStatus.lastSyncedAt = result.updatedAt || new Date().toISOString();
        }
      }
    } catch {
      // Offline mode fallback: data remains safely stored in localStorage
    }
  }

  getDatabaseStatus() {
    return this.dbStatus;
  }

  ensureDefaultUserRegistered() {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      const users = raw ? JSON.parse(raw) : [];
      if (!users.some((u) => u.email.toLowerCase() === DEFAULT_DEMO_USER.email.toLowerCase())) {
        users.push(DEFAULT_DEMO_USER);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      }
    } catch (e) {
      console.warn('LocalStorage user registry fallback:', e);
    }
  }

  getRegisteredUsers() {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [DEFAULT_DEMO_USER];
    } catch {
      return [DEFAULT_DEMO_USER];
    }
  }

  saveRegisteredUsers(users) {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Unable to save users:', e);
    }
  }

  loadState() {
    try {
      const activeEmail = localStorage.getItem('PESO_ACTIVE_USER_EMAIL');
      if (activeEmail) {
        const rawUser = localStorage.getItem(`PESO_USER_DATA_${activeEmail.toLowerCase()}`);
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed && parsed.initialBalance && Array.isArray(parsed.expenses)) {
            return parsed;
          }
        }
      }
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.initialBalance && Array.isArray(parsed.expenses)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved ledger state:', e);
    }
    const demo = createDemoLedgerState();
    demo.student.authenticated = false;
    return demo;
  }

  persist(nextState = this.state) {
    this.state = nextState;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      const userEmail = this.state.student?.email;
      if (userEmail) {
        localStorage.setItem(`PESO_USER_DATA_${userEmail.toLowerCase()}`, JSON.stringify(this.state));
      }
      if (this.state.student?.authenticated && userEmail) {
        localStorage.setItem('PESO_ACTIVE_USER_EMAIL', userEmail.toLowerCase());
      }
    } catch (e) {
      console.warn('Unable to persist ledger state:', e);
    }
    this.syncToDatabase(this.state);
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const metrics = this.getMetrics();
    for (const listener of this.listeners) {
      listener(this.state, metrics);
    }
  }

  getState() {
    return this.state;
  }

  getMetrics() {
    return computeLedgerMetrics(this.state);
  }

  getQuickPresets() {
    if (Array.isArray(this.state.quickPresets) && this.state.quickPresets.length > 0) {
      return this.state.quickPresets;
    }
    return [...DEFAULT_QUICK_PRESETS];
  }

  updateQuickPresets(presets) {
    if (!Array.isArray(presets)) {
      return { ok: false, error: 'Invalid shortcuts format.' };
    }
    const clean = presets
      .filter((p) => p && String(p.title || '').trim().length > 0)
      .map((p, idx) => {
        const title = String(p.title || 'Quick Expense').trim();
        const amt = roundCurrency(Math.max(0.50, Number(p.amount) || 10));
        const label = String(p.label || `${title} (₱${amt.toFixed(0)})`).trim();
        return {
          id: p.id || `qp-${Date.now()}-${idx}`,
          label,
          title,
          amount: amt,
          category: p.category || 'food',
          wallet: p.wallet || 'cash'
        };
      });

    if (clean.length === 0) {
      return { ok: false, error: 'Please keep at least one Quick Fill shortcut.' };
    }

    this.state.quickPresets = clean;
    this.appendAudit('QUICK_FILL_UPDATED', `Updated ${clean.length} Quick Fill expense shortcut(s)`);
    this.persist(this.state);
    return { ok: true, message: 'Quick Fill shortcuts saved successfully!' };
  }

  resetQuickPresets() {
    this.state.quickPresets = [...DEFAULT_QUICK_PRESETS];
    this.appendAudit('QUICK_FILL_RESET', 'Quick Fill shortcuts reset to standard campus defaults');
    this.persist(this.state);
    return { ok: true, message: 'Quick Fill shortcuts reset to campus defaults.' };
  }

  appendAudit(action, summary, deltaNet = 0, deltaSpendable = 0, customRef = null) {
    const refId = customRef || generateRefId('AUD');
    const entry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      refId,
      timestamp: new Date().toISOString(),
      action,
      summary,
      deltaNet: roundCurrency(deltaNet),
      deltaSpendable: roundCurrency(deltaSpendable)
    };
    this.state.auditTrail = [entry, ...(this.state.auditTrail || [])].slice(0, 120);
    this.state.meta.lastAuditAt = entry.timestamp;
    return entry;
  }

  // =========================================================================
  // MODULE 2: AUTHENTICATION, REGISTRATION, PASSWORD RESET & DEMO MODE
  // =========================================================================

  enterDemoMode() {
    const demoState = createDemoLedgerState();
    demoState.student.authenticated = true;
    demoState.meta.isDemoMode = true;
    try {
      localStorage.setItem('PESO_ACTIVE_USER_EMAIL', demoState.student.email.toLowerCase());
    } catch {
      // ignore
    }
    this.persist(demoState);
    return { ok: true, message: 'Student Demo Mode activated with realistic sample data.' };
  }

  resetDemoData() {
    if (!this.state.meta?.isDemoMode) {
      return { ok: false, error: 'Reset Demo is only available when testing Demo Mode.' };
    }
    const demoState = createDemoLedgerState();
    demoState.student.authenticated = true;
    demoState.meta.isDemoMode = true;
    this.persist(demoState);
    return { ok: true, message: 'Sample demo data has been reset.' };
  }

  login(identifier, password) {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    if (!cleanId || !cleanPass) {
      return { ok: false, error: 'Please enter both your email and password.' };
    }

    const users = this.getRegisteredUsers();
    const matched = users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        (u.fullName && u.fullName.toLowerCase() === cleanId) ||
        (u.studentId && u.studentId.toLowerCase() === cleanId)
    );

    if (!matched || matched.password !== cleanPass) {
      return {
        ok: false,
        error: 'Incorrect email or password. Please try again or create an account.'
      };
    }

    let userState = null;
    try {
      const rawUser = localStorage.getItem(`PESO_USER_DATA_${matched.email.toLowerCase()}`);
      if (rawUser) {
        userState = JSON.parse(rawUser);
      }
    } catch (e) {
      console.warn('Could not parse user state:', e);
    }

    if (!userState) {
      userState = createDemoLedgerState();
      userState.student.fullName = matched.fullName;
      userState.student.email = matched.email;
    }

    userState.student.authenticated = true;
    userState.meta.isDemoMode = Boolean(matched.isDemo);

    try {
      localStorage.setItem('PESO_ACTIVE_USER_EMAIL', matched.email.toLowerCase());
      localStorage.setItem(`PESO_USER_DATA_${matched.email.toLowerCase()}`, JSON.stringify(userState));
    } catch (e) {
      console.warn('Could not set active session:', e);
    }

    this.persist(userState);
    return { ok: true, message: `Welcome back, ${matched.fullName}!` };
  }

  logout() {
    this.state.student.authenticated = false;
    this.state.meta.isDemoMode = false;
    try {
      localStorage.removeItem('PESO_ACTIVE_USER_EMAIL');
    } catch (e) {
      // ignore
    }
    this.persist(this.state);
    return { ok: true, message: 'Signed out of PESO.' };
  }

  registerStudent(payload) {
    const {
      fullName = '',
      email = '',
      password = ''
    } = payload || {};

    const cleanName = String(fullName || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    if (!cleanName) {
      return { ok: false, error: 'Please enter your name.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { ok: false, error: 'Please enter a valid email address (e.g. yourname@gmail.com).' };
    }
    if (cleanPassword.length < 4) {
      return { ok: false, error: 'Password must be at least 4 characters long.' };
    }

    const newUser = {
      studentId: cleanEmail.split('@')[0].toUpperCase(),
      fullName: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      isDemo: false
    };

    const users = this.getRegisteredUsers().filter(
      (u) => u.email.toLowerCase() !== cleanEmail
    );
    users.push(newUser);
    this.saveRegisteredUsers(users);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
    const todayStr = `${year}-${month}-${String(now.getDate()).padStart(2, '0')}`;
    const initRef = generateRefId('INI');

    const freshState = {
      meta: {
        version: '1.0.0',
        ledgerId: generateRefId('LDG'),
        createdAt: new Date().toISOString(),
        lastAuditAt: new Date().toISOString(),
        isDemoMode: false
      },
      student: {
        ...newUser,
        authenticated: true
      },
      initialBalance: {
        initialized: true,
        refId: initRef,
        date: todayStr,
        note: `Starting cash baseline for ${cleanName}`,
        breakdown: { cash: 0.00 }
      },
      inflows: [],
      expenses: [],
      budget: {
        period: 'MONTHLY',
        totalBudget: 0.00,
        periodStart: `${year}-${month}-01`,
        periodEnd: `${year}-${month}-${String(daysInMonth).padStart(2, '0')}`,
        categoryLimits: {
          food: 0.00,
          transit: 0.00,
          academic: 0.00,
          dorm: 0.00,
          leisure: 0.00
        }
      },
      savingsGoals: [],
      quickPresets: [...DEFAULT_QUICK_PRESETS],
      auditTrail: [
        {
          id: `aud-${Date.now()}`,
          refId: initRef,
          timestamp: new Date().toISOString(),
          action: 'STUDENT_ACCOUNT_REGISTERED',
          summary: `Account registered for ${cleanName} (${cleanEmail}) with starting cash ₱0.00`,
          deltaNet: 0.00,
          deltaSpendable: 0.00
        }
      ]
    };

    try {
      localStorage.setItem('PESO_ACTIVE_USER_EMAIL', cleanEmail);
      localStorage.setItem(`PESO_USER_DATA_${cleanEmail}`, JSON.stringify(freshState));
    } catch (e) {
      console.warn('Could not save user data:', e);
    }

    this.persist(freshState);
    return { ok: true, message: `Account created! Welcome, ${cleanName}.` };
  }

  verifyAndResetPassword({ identifier, securityCode, newPassword }) {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanCode = (securityCode || '').trim().toUpperCase();
    const cleanPass = (newPassword || '').trim();

    if (!cleanId || !cleanCode || !cleanPass) {
      return { ok: false, error: 'Student ID/Email, Security Recovery Code, and New Password are required.' };
    }
    if (cleanPass.length < 6) {
      return { ok: false, error: 'New password must be at least 6 characters.' };
    }

    const users = this.getRegisteredUsers();
    const idx = users.findIndex(
      (u) => u.email.toLowerCase() === cleanId || u.studentId.toLowerCase() === cleanId
    );

    if (idx === -1) {
      return { ok: false, error: 'No registered student found with that Student ID or Email.' };
    }

    if ((users[idx].securityCode || 'PESO-4820').toUpperCase() !== cleanCode) {
      return {
        ok: false,
        error: 'Security verification failed. For Demo Account, use recovery token: PESO-4820.'
      };
    }

    users[idx].password = cleanPass;
    this.saveRegisteredUsers(users);
    this.appendAudit('PASSWORD_RESET', `Password reset completed via security token verification for ${users[idx].studentId}`);
    this.persist(this.state);

    return {
      ok: true,
      message: `Password successfully updated for ${users[idx].fullName}. You may now sign in.`
    };
  }

  // =========================================================================
  // MODULE 3: DERIVED BALANCE INTEGRITY (INPUT BALANCE & AUDITED INFLOWS)
  // =========================================================================

  setInitialBalance({ cash, ewallet = 0, bank = 0, date, note }) {
    const c = roundCurrency(Number(cash) || 0);

    if (isNaN(c) || c < 0) {
      return { ok: false, error: 'Initial cash balance must be a non-negative number (₱0.00 or higher).' };
    }

    const dateCheck = validateDateInput(date, false);
    if (!dateCheck.valid) {
      return { ok: false, error: dateCheck.error };
    }

    const prevMetrics = this.getMetrics();
    const newInitialTotal = c;
    const delta = roundCurrency(newInitialTotal - prevMetrics.initialTotal);

    // Check if reducing initial balance would push Spendable Balance below locked savings
    if (prevMetrics.spendableBalance + delta < 0) {
      return {
        ok: false,
        error: `Cannot reduce initial cash balance below locked savings (${formatPHP(prevMetrics.totalLockedSavings)}) and logged expenses.`
      };
    }

    const refId = generateRefId('INI');
    this.state.initialBalance = {
      initialized: true,
      refId,
      date,
      note: (note || 'Starting cash on hand').trim(),
      breakdown: { cash: c }
    };

    this.appendAudit(
      'INITIAL_BALANCE_SET',
      `Set Starting Cash Baseline: Cash ${formatPHP(c)} (${this.state.initialBalance.note})`,
      delta,
      delta,
      refId
    );
    this.persist(this.state);

    return {
      ok: true,
      message: `Starting cash balance recorded (${refId}): ${formatPHP(newInitialTotal)}.`
    };
  }

  addInflow({ type = 'ALLOWANCE', wallet = 'cash', amount, description, date }) {
    const numAmount = roundCurrency(Number(amount));
    const isReconciliation = type === 'RECONCILIATION_ADJ';

    if (isNaN(numAmount) || numAmount === 0) {
      return { ok: false, error: 'Amount cannot be zero.' };
    }
    if (!isReconciliation && numAmount < 0) {
      return {
        ok: false,
        error: 'Cash inflows / allowances must be positive.'
      };
    }
    if (!description || !description.trim()) {
      return { ok: false, error: 'An audit description / source note is required for ledger integrity.' };
    }

    const dateCheck = validateDateInput(date, false);
    if (!dateCheck.valid) {
      return { ok: false, error: dateCheck.error };
    }

    const metrics = this.getMetrics();
    if (numAmount < 0 && metrics.spendableBalance + numAmount < 0) {
      return {
        ok: false,
        error: `Negative reconciliation adjustment (${formatPHP(numAmount)}) exceeds available Spendable Balance (${formatPHP(metrics.spendableBalance)}).`
      };
    }

    const prefix = isReconciliation ? 'ADJ' : 'INF';
    const refId = generateRefId(prefix);
    const entry = {
      id: `inf-${Date.now()}`,
      refId,
      type,
      wallet,
      amount: numAmount,
      description: description.trim(),
      date,
      createdAt: new Date().toISOString()
    };

    this.state.inflows = [entry, ...(this.state.inflows || [])];
    this.appendAudit(
      isReconciliation ? 'RECONCILIATION_ADJUSTMENT' : 'INFLOW_LOGGED',
      `${entry.description} [${wallet.toUpperCase()}] (${formatPHP(numAmount, true)})`,
      numAmount,
      numAmount,
      refId
    );
    this.persist(this.state);

    return {
      ok: true,
      message: `Audited entry ${refId} posted (${formatPHP(numAmount, true)}). Balances recalculated.`
    };
  }

  deleteInflow(inflowId) {
    const target = (this.state.inflows || []).find((i) => i.id === inflowId);
    if (!target) {
      return { ok: false, error: 'Inflow entry not found.' };
    }
    const metrics = this.getMetrics();
    if (metrics.spendableBalance - target.amount < 0) {
      return {
        ok: false,
        error: `Cannot void inflow ${target.refId} because funds are currently locked in Savings Escrow or already spent.`
      };
    }
    this.state.inflows = this.state.inflows.filter((i) => i.id !== inflowId);
    this.appendAudit(
      'INFLOW_VOIDED',
      `Voided inflow ${target.refId}: ${target.description} (${formatPHP(-target.amount, true)})`,
      -target.amount,
      -target.amount
    );
    this.persist(this.state);
    return { ok: true, message: `Inflow entry ${target.refId} voided and removed.` };
  }

  // =========================================================================
  // MODULE 4: ATOMIC EXPENSE CRUD & VALIDATION
  // =========================================================================

  addExpense({ title, category, wallet, amount, date, merchantOrNote }) {
    const cleanTitle = (title || '').trim();
    const numAmount = roundCurrency(Number(amount));

    if (!cleanTitle) {
      return { ok: false, error: 'Expense item description is required.' };
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      return { ok: false, error: 'Expense amount must be strictly greater than ₱0.00.' };
    }
    if (!EXPENSE_CATEGORIES.some((c) => c.id === category)) {
      return { ok: false, error: 'Please select a valid spending category.' };
    }
    if (!WALLET_CHANNELS.some((w) => w.id === wallet)) {
      return { ok: false, error: 'Please select a valid payment wallet.' };
    }

    const dateCheck = validateDateInput(date, false);
    if (!dateCheck.valid) {
      return { ok: false, error: dateCheck.error };
    }

    const metrics = this.getMetrics();
    if (numAmount > metrics.spendableBalance) {
      if (metrics.totalLockedSavings > 0) {
        return {
          ok: false,
          error: `Insufficient Spendable Balance (${formatPHP(metrics.spendableBalance)} available). ${formatPHP(metrics.totalLockedSavings)} is locked in Savings Goals.`
        };
      }
      return {
        ok: false,
        error: `Insufficient Spendable Balance (${formatPHP(metrics.spendableBalance)} available). Please add your allowance or cash inflow in My Wallet first.`
      };
    }

    const refId = generateRefId('EXP');
    const newExpense = {
      id: `exp-${Date.now()}`,
      refId,
      title: cleanTitle,
      category,
      wallet: 'cash',
      amount: numAmount,
      date,
      merchantOrNote: (merchantOrNote || 'Campus Merchant / Cash Voucher').trim(),
      createdAt: new Date().toISOString()
    };

    this.state.expenses = [newExpense, ...(this.state.expenses || [])];
    this.appendAudit(
      'EXPENSE_LOGGED',
      `Logged expense ${refId}: ${cleanTitle} (-${formatPHP(numAmount)}) under ${category.toUpperCase()}`,
      -numAmount,
      -numAmount,
      refId
    );
    this.persist(this.state);

    return {
      ok: true,
      expense: newExpense,
      message: `Expense ${refId} (${formatPHP(numAmount)}) logged. Spendable balance & budget meters updated.`
    };
  }

  updateExpense(expenseId, { title, category, wallet, amount, date, merchantOrNote }) {
    const existing = (this.state.expenses || []).find((e) => e.id === expenseId);
    if (!existing) {
      return { ok: false, error: 'Expense record not found in ledger.' };
    }

    const cleanTitle = (title || '').trim();
    const numAmount = roundCurrency(Number(amount));

    if (!cleanTitle) {
      return { ok: false, error: 'Expense item description is required.' };
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      return { ok: false, error: 'Expense amount must be strictly greater than ₱0.00.' };
    }
    if (!EXPENSE_CATEGORIES.some((c) => c.id === category)) {
      return { ok: false, error: 'Please select a valid spending category.' };
    }
    if (!WALLET_CHANNELS.some((w) => w.id === wallet)) {
      return { ok: false, error: 'Please select a valid payment wallet.' };
    }

    const dateCheck = validateDateInput(date, false);
    if (!dateCheck.valid) {
      return { ok: false, error: dateCheck.error };
    }

    const metrics = this.getMetrics();
    const amountDiff = roundCurrency(numAmount - existing.amount); // positive means spending more
    if (amountDiff > metrics.spendableBalance) {
      return {
        ok: false,
        error: `Edited amount requires an additional ${formatPHP(amountDiff)}, which exceeds your Spendable Balance (${formatPHP(metrics.spendableBalance)}).`
      };
    }

    const prevAmount = existing.amount;
    this.state.expenses = this.state.expenses.map((e) =>
      e.id === expenseId
        ? {
            ...e,
            title: cleanTitle,
            category,
            wallet: 'cash',
            amount: numAmount,
            date,
            merchantOrNote: (merchantOrNote || '').trim(),
            updatedAt: new Date().toISOString()
          }
        : e
    );

    this.appendAudit(
      'EXPENSE_EDITED',
      `Edited ${existing.refId}: "${cleanTitle}" (${formatPHP(prevAmount)} → ${formatPHP(numAmount)})`,
      -amountDiff,
      -amountDiff,
      existing.refId
    );
    this.persist(this.state);

    return {
      ok: true,
      message: `Expense ${existing.refId} updated atomically. All balances and category limits recalculated.`
    };
  }

  deleteExpense(expenseId) {
    const existing = (this.state.expenses || []).find((e) => e.id === expenseId);
    if (!existing) {
      return { ok: false, error: 'Expense record not found.' };
    }

    this.state.expenses = this.state.expenses.filter((e) => e.id !== expenseId);
    this.appendAudit(
      'EXPENSE_DELETED',
      `Deleted expense ${existing.refId}: "${existing.title}" (+${formatPHP(existing.amount)} restored to spendable)`,
      existing.amount,
      existing.amount,
      existing.refId
    );
    this.persist(this.state);

    return {
      ok: true,
      message: `Deleted ${existing.refId}. Restored ${formatPHP(existing.amount)} to Spendable Balance.`
    };
  }

  // =========================================================================
  // MODULE 5: TWO-TIER BUDGET & SPENDING LIMIT HIERARCHY
  // =========================================================================

  updateGlobalBudget({ period, totalBudget, periodStart, periodEnd }) {
    const cap = roundCurrency(Number(totalBudget));
    if (isNaN(cap) || cap <= 0) {
      return { ok: false, error: 'Global period budget cap must be greater than ₱0.00.' };
    }
    if (!['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'].includes(period)) {
      return { ok: false, error: 'Please select a valid budget period.' };
    }

    const startCheck = validateDateInput(periodStart, true);
    const endCheck = validateDateInput(periodEnd, true);
    if (!startCheck.valid || !endCheck.valid) {
      return { ok: false, error: 'Please provide valid start and end dates for the budget period.' };
    }
    if (periodEnd < periodStart) {
      return { ok: false, error: 'Period end date must be on or after the period start date.' };
    }

    this.state.budget = {
      ...this.state.budget,
      period,
      totalBudget: cap,
      periodStart,
      periodEnd
    };

    this.appendAudit(
      'BUDGET_CAP_UPDATED',
      `Set global ${period} allowance budget cap to ${formatPHP(cap)} (${periodStart} to ${periodEnd})`
    );
    this.persist(this.state);

    const metrics = this.getMetrics();
    return {
      ok: true,
      warning: metrics.isCategoryLimitOverBudget
        ? `Caution: Your category spending limits (${formatPHP(metrics.sumCategoryLimits)}) exceed your new ${formatPHP(cap)} global budget by ${formatPHP(metrics.categoryLimitExcess)}.`
        : null,
      message: `Global ${period.toLowerCase()} budget updated to ${formatPHP(cap)}.`
    };
  }

  reconcileWalletToTarget({ wallet = 'cash', targetSpendable, note = '' }) {
    const targetVal = roundCurrency(Number(targetSpendable));
    if (isNaN(targetVal) || targetVal < 0) {
      return { ok: false, error: 'Target cash count must be ₱0.00 or higher.' };
    }

    const metrics = this.getMetrics();
    const currentWalletSpendable = metrics.spendableBalance;
    const diff = roundCurrency(targetVal - currentWalletSpendable);

    if (diff === 0) {
      return { ok: true, message: `Cash on hand is already balanced at ${formatPHP(targetVal)}.` };
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    return this.addInflow({
      type: diff > 0 ? 'ALLOWANCE' : 'RECONCILIATION_ADJ',
      wallet: 'cash',
      amount: diff,
      date: todayStr,
      description: (note || (diff > 0 ? `Reconciliation: found +${formatPHP(diff)} cash` : `Reconciliation: cash count shortage of ${formatPHP(Math.abs(diff))}`)).trim()
    });
  }

  updateCategoryLimits(newLimits) {
    const cleaned = {};
    for (const cat of EXPENSE_CATEGORIES) {
      const val = roundCurrency(Number(newLimits[cat.id]));
      if (isNaN(val) || val < 0) {
        return { ok: false, error: `Spending limit for ${cat.name} must be ₱0.00 or higher.` };
      }
      cleaned[cat.id] = val;
    }

    this.state.budget.categoryLimits = cleaned;
    const sum = Object.values(cleaned).reduce((a, b) => a + b, 0);

    this.appendAudit(
      'CATEGORY_LIMITS_UPDATED',
      `Updated category spending limits (Total allocated across 5 categories: ${formatPHP(sum)})`
    );
    this.persist(this.state);

    const metrics = this.getMetrics();
    return {
      ok: true,
      warning: metrics.isCategoryLimitOverBudget
        ? `Alert: Sum of category limits (${formatPHP(metrics.sumCategoryLimits)}) exceeds your global period budget (${formatPHP(metrics.totalBudget)}) by ${formatPHP(metrics.categoryLimitExcess)}!`
        : null,
      message: 'Category spending limits saved and progress meters recalculated.'
    };
  }

  // =========================================================================
  // MODULE 6: ESCROW SAVINGS GOALS (PREVENTING "PHANTOM SAVINGS")
  // =========================================================================

  createSavingsGoal({ name, targetAmount, initialAllocation = 0, wallet = 'cash', deadline, priority = 'MEDIUM', notes = '' }) {
    const cleanName = (name || '').trim();
    const target = roundCurrency(Number(targetAmount));
    const initialLock = roundCurrency(Number(initialAllocation) || 0);

    if (!cleanName) {
      return { ok: false, error: 'Savings goal title is required.' };
    }
    if (isNaN(target) || target <= 0) {
      return { ok: false, error: 'Target savings amount must be greater than ₱0.00.' };
    }
    if (isNaN(initialLock) || initialLock < 0) {
      return { ok: false, error: 'Initial escrow allocation cannot be negative.' };
    }

    const dateCheck = validateDateInput(deadline, true);
    if (!dateCheck.valid) {
      return { ok: false, error: 'Please select a valid target deadline date.' };
    }

    const metrics = this.getMetrics();
    if (initialLock > metrics.spendableBalance) {
      return {
        ok: false,
        error: `Cannot lock ${formatPHP(initialLock)}: exceeds current Spendable Balance (${formatPHP(metrics.spendableBalance)}).`
      };
    }

    const refId = generateRefId('SAV');
    const todayStr = new Date().toISOString().slice(0, 10);
    const history = [];

    if (initialLock > 0) {
      history.push({
        id: `sh-${Date.now()}`,
        refId: generateRefId('ESC'),
        type: 'ALLOCATE',
        wallet: 'cash',
        amount: initialLock,
        date: todayStr,
        note: 'Opening escrow deposit on goal creation'
      });
    }

    const newGoal = {
      id: `goal-${Date.now()}`,
      refId,
      name: cleanName,
      targetAmount: target,
      lockedAmount: initialLock,
      deadline,
      priority,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      history
    };

    this.state.savingsGoals = [...(this.state.savingsGoals || []), newGoal];
    this.appendAudit(
      'SAVINGS_GOAL_CREATED',
      `Created Escrow Vault ${refId}: "${cleanName}" (Target: ${formatPHP(target)}${initialLock > 0 ? `, Locked: ${formatPHP(initialLock)}` : ''})`,
      0,
      -initialLock,
      refId
    );
    this.persist(this.state);

    return {
      ok: true,
      message: initialLock > 0
        ? `Created "${cleanName}" and locked ${formatPHP(initialLock)} in escrow (deducted from Spendable Balance).`
        : `Created savings goal "${cleanName}" with target ${formatPHP(target)}.`
    };
  }

  updateSavingsGoal(goalId, { name, targetAmount, deadline, priority, notes }) {
    const goal = (this.state.savingsGoals || []).find((g) => g.id === goalId);
    if (!goal) {
      return { ok: false, error: 'Savings goal not found.' };
    }
    const cleanName = (name || '').trim();
    const target = roundCurrency(Number(targetAmount));
    if (!cleanName || isNaN(target) || target <= 0) {
      return { ok: false, error: 'Valid goal name and positive target amount are required.' };
    }
    const dateCheck = validateDateInput(deadline, true);
    if (!dateCheck.valid) {
      return { ok: false, error: dateCheck.error };
    }

    this.state.savingsGoals = this.state.savingsGoals.map((g) =>
      g.id === goalId
        ? { ...g, name: cleanName, targetAmount: target, deadline, priority: priority || g.priority, notes: (notes || '').trim() }
        : g
    );

    this.appendAudit(
      'SAVINGS_GOAL_UPDATED',
      `Updated savings vault ${goal.refId} ("${cleanName}") target to ${formatPHP(target)}`
    );
    this.persist(this.state);
    return { ok: true, message: `Updated goal "${cleanName}".` };
  }

  allocateToGoal(goalId, { amount, wallet = 'cash', note = '' }) {
    const goal = (this.state.savingsGoals || []).find((g) => g.id === goalId);
    if (!goal) {
      return { ok: false, error: 'Savings goal vault not found.' };
    }

    const numAmount = roundCurrency(Number(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      return { ok: false, error: 'Allocation amount must be strictly greater than ₱0.00.' };
    }

    const metrics = this.getMetrics();
    if (numAmount > metrics.spendableBalance) {
      return {
        ok: false,
        error: `Insufficient Spendable Balance! You tried to lock ${formatPHP(numAmount)}, but only ${formatPHP(metrics.spendableBalance)} is currently spendable.`
      };
    }

    const escRef = generateRefId('ESC');
    const todayStr = new Date().toISOString().slice(0, 10);
    const tx = {
      id: `sh-${Date.now()}`,
      refId: escRef,
      type: 'ALLOCATE',
      wallet: 'cash',
      amount: numAmount,
      date: todayStr,
      note: (note || 'Escrow allocation from spendable balance').trim()
    };

    goal.lockedAmount = roundCurrency(goal.lockedAmount + numAmount);
    goal.history = [tx, ...(goal.history || [])];

    this.appendAudit(
      'SAVINGS_ALLOCATED',
      `Locked ${formatPHP(numAmount)} into "${goal.name}" (${escRef}) — Deducted from Spendable Balance`,
      0,
      -numAmount,
      escRef
    );
    this.persist(this.state);

    return {
      ok: true,
      message: `Locked ${formatPHP(numAmount)} into "${goal.name}". Spendable Balance decreased by ${formatPHP(numAmount)}.`
    };
  }

  withdrawFromGoal(goalId, { amount, wallet = 'cash', note = '' }) {
    const goal = (this.state.savingsGoals || []).find((g) => g.id === goalId);
    if (!goal) {
      return { ok: false, error: 'Savings goal vault not found.' };
    }

    const numAmount = roundCurrency(Number(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      return { ok: false, error: 'Withdrawal amount must be strictly greater than ₱0.00.' };
    }
    if (numAmount > goal.lockedAmount) {
      return {
        ok: false,
        error: `Cannot withdraw ${formatPHP(numAmount)}: only ${formatPHP(goal.lockedAmount)} is currently locked in "${goal.name}".`
      };
    }

    const escRef = generateRefId('WTH');
    const todayStr = new Date().toISOString().slice(0, 10);
    const tx = {
      id: `sh-${Date.now()}`,
      refId: escRef,
      type: 'WITHDRAW',
      wallet: 'cash',
      amount: numAmount,
      date: todayStr,
      note: (note || 'Released escrow funds back to spendable balance').trim()
    };

    goal.lockedAmount = roundCurrency(goal.lockedAmount - numAmount);
    goal.history = [tx, ...(goal.history || [])];

    this.appendAudit(
      'SAVINGS_WITHDRAWN',
      `Released ${formatPHP(numAmount)} from "${goal.name}" (${escRef}) back to Spendable Balance`,
      0,
      numAmount,
      escRef
    );
    this.persist(this.state);

    return {
      ok: true,
      message: `Withdrew ${formatPHP(numAmount)} from "${goal.name}" back to Spendable Balance.`
    };
  }

  deleteSavingsGoal(goalId) {
    const goal = (this.state.savingsGoals || []).find((g) => g.id === goalId);
    if (!goal) {
      return { ok: false, error: 'Savings goal not found.' };
    }
    const unlocked = roundCurrency(goal.lockedAmount || 0);
    this.state.savingsGoals = this.state.savingsGoals.filter((g) => g.id !== goalId);

    this.appendAudit(
      'SAVINGS_GOAL_CLOSED',
      `Closed savings vault ${goal.refId} ("${goal.name}")${unlocked > 0 ? ` and returned ${formatPHP(unlocked)} to Spendable Balance` : ''}`,
      0,
      unlocked,
      goal.refId
    );
    this.persist(this.state);

    return {
      ok: true,
      message: unlocked > 0
        ? `Closed "${goal.name}" and returned ${formatPHP(unlocked)} to your Spendable Balance.`
        : `Deleted savings goal "${goal.name}".`
    };
  }
}


/**
 * PESO — Compact ISO/IEC 18004 QR Code SVG Generator (Zero External Dependencies)
 * Generates a scannable SVG QR Code for sharing the PESO app link with friends
 * on iOS and Android devices.
 */

// Galois Field GF(256) tables for Reed-Solomon Error Correction
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecLen) {
  const gen = rsGeneratorPoly(ecLen);
  const msg = new Uint8Array(data.length + ecLen);
  msg.set(data, 0);
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// QR Version specs for Level L (1 block) up to Version 5 (106 bytes max)
const QR_VERSIONS = {
  2: { size: 25, totalDataBytes: 34, ecBytes: 10, align: [6, 18] },
  3: { size: 29, totalDataBytes: 55, ecBytes: 15, align: [6, 22] },
  4: { size: 33, totalDataBytes: 80, ecBytes: 20, align: [6, 26] },
  5: { size: 37, totalDataBytes: 108, ecBytes: 26, align: [6, 30] }
};

function selectVersion(byteLen) {
  for (const v of [2, 3, 4, 5]) {
    if (byteLen + 3 <= QR_VERSIONS[v].totalDataBytes) return v;
  }
  return 5;
}

function renderQrCodeSvg(text, pixelSize = 180) {
  const rawBytes = new TextEncoder().encode(String(text || 'https://peso.app').slice(0, 100));
  const version = selectVersion(rawBytes.length);
  const spec = QR_VERSIONS[version];
  const size = spec.size;

  // Build data bit stream: Mode 0100 (Byte), 8-bit length, payload, terminator, pad bytes
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  pushBits(0b0100, 4);
  pushBits(rawBytes.length, 8);
  for (const b of rawBytes) pushBits(b, 8);
  pushBits(0, Math.min(4, spec.totalDataBytes * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const dataBytes = new Uint8Array(spec.totalDataBytes);
  for (let i = 0; i < bits.length / 8; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    dataBytes[i] = byte;
  }
  const pads = [0xec, 0x11];
  for (let i = bits.length / 8, p = 0; i < spec.totalDataBytes; i++, p++) {
    dataBytes[i] = pads[p % 2];
  }

  const ecBytes = rsEncode(dataBytes, spec.ecBytes);
  const allCodewords = new Uint8Array(dataBytes.length + ecBytes.length);
  allCodewords.set(dataBytes, 0);
  allCodewords.set(ecBytes, dataBytes.length);

  const matrix = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
  const isReserved = Array.from({ length: size }, () => new Uint8Array(size));

  const setModule = (r, c, val, reserve = true) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return;
    matrix[r][c] = val ? 1 : 0;
    if (reserve) isReserved[r][c] = 1;
  };

  // Finder patterns + separators
  const placeFinder = (row, col) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const inOuter = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const onBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setModule(row + r, col + c, inOuter && (onBorder || inInner) ? 1 : 0, true);
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Alignment pattern
  const [a0, a1] = spec.align;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const dark = Math.max(Math.abs(r), Math.abs(c)) !== 1;
      setModule(a1 + r, a1 + c, dark ? 1 : 0, true);
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isReserved[6][i]) setModule(6, i, i % 2 === 0 ? 1 : 0, true);
    if (!isReserved[i][6]) setModule(i, 6, i % 2 === 0 ? 1 : 0, true);
  }

  // Dark module & reserve format info areas
  setModule(size - 8, 8, 1, true);
  for (let i = 0; i < 9; i++) {
    if (!isReserved[8][i]) isReserved[8][i] = 1;
    if (!isReserved[i][8]) isReserved[i][8] = 1;
  }
  for (let i = 0; i < 8; i++) {
    isReserved[8][size - 1 - i] = 1;
    isReserved[size - 1 - i][8] = 1;
  }

  // Place data bits in upward/downward 2-column zigzag
  let bitIdx = 0;
  const totalBits = allCodewords.length * 8;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        if (!isReserved[r][c]) {
          let bit = 0;
          if (bitIdx < totalBits) {
            bit = (allCodewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
            bitIdx++;
          }
          // Apply Mask 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) bit ^= 1;
          matrix[r][c] = bit;
        }
      }
    }
    upward = !upward;
  }

  // Precomputed Format Info bits for Level L (01) + Mask 0 (000) -> 0x77c4
  const formatBits = 0x77c4;
  const fBits = [];
  for (let i = 0; i < 15; i++) fBits.push((formatBits >> i) & 1);

  const fCoords1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = fCoords1[i];
    matrix[r][c] = fBits[14 - i];
  }
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = fBits[14 - i];
  }
  for (let i = 7; i < 15; i++) {
    matrix[8][size - 15 + i] = fBits[14 - i];
  }

  // Render SVG path
  const margin = 3;
  const totalModules = size + margin * 2;
  let pathData = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (matrix[r][c] === 1) {
        pathData += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" width="${pixelSize}" height="${pixelSize}" role="img" aria-label="QR Code for PESO App Link" style="display:block; border:2px solid #111215; background:#FFFFFF;">
      <rect width="100%" height="100%" fill="#FFFFFF"/>
      <path d="${pathData}" fill="#111215"/>
    </svg>
  `.trim();
}


/**
 * PESO — Personal Expense & Spending Organizer
 * Clean, Student-Friendly, Zero-Emoji UI Renderers (Modules 1 to 7)
 * Built for Desktop, Tablet, and Mobile views with flexible allowance tools.
 */



function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStatusBadgeHTML(status, pct = null) {
  const pctText = pct !== null ? ` (${Math.round(pct)}%)` : '';
  if (status === 'BREACH') {
    return `<span class="status-badge status-badge--breach">Over Limit${pctText}</span>`;
  }
  if (status === 'CAUTION') {
    return `<span class="status-badge status-badge--caution">Near Limit${pctText}</span>`;
  }
  return `<span class="status-badge status-badge--nominal">On Track${pctText}</span>`;
}

function getMeterFillClass(status) {
  if (status === 'BREACH') return 'meter-fill meter-fill--breach';
  if (status === 'CAUTION') return 'meter-fill meter-fill--caution';
  return 'meter-fill';
}

function getCategoryName(catId) {
  const found = EXPENSE_CATEGORIES.find((c) => c.id === catId);
  return found ? found.name : catId;
}

function getWalletName(walletId) {
  return 'Cash on Hand';
}

function getWalletBadge(walletId) {
  return 'CASH';
}

const QUICK_EXPENSE_PRESETS = [
  { label: 'Canteen Meal (₱85)', title: 'Canteen Meal', amount: 85, category: 'food', wallet: 'cash' },
  { label: 'Jeep / LRT Fare (₱30)', title: 'Jeepney / LRT Fare', amount: 30, category: 'transit', wallet: 'cash' },
  { label: 'Printing / Xerox (₱25)', title: 'Handout Printing', amount: 25, category: 'academic', wallet: 'cash' },
  { label: 'Coffee / Snack (₱65)', title: 'Coffee & Snack', amount: 65, category: 'food', wallet: 'cash' },
  { label: 'School Supplies (₱60)', title: 'Notebook & Pen', amount: 60, category: 'academic', wallet: 'cash' }
];

const CATEGORY_COLORS = {
  food: '#0B6E4F',
  transit: '#2563EB',
  academic: '#D97706',
  dorm: '#7C3AED',
  leisure: '#D9381E'
};

// ============================================================================
// MODULE 1: OVERVIEW (DASHBOARD)
// ============================================================================
function renderDashboardModule(state, metrics) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const recentExpenses = (state.expenses || []).slice(0, 5);
  const firstName = (state.student.fullName || 'Student').split(' ')[0];
  const overBudgetCats = metrics.categoryBreakdown.filter((c) => c.status === 'BREACH');
  const presets = (state.quickPresets && state.quickPresets.length > 0) ? state.quickPresets : QUICK_EXPENSE_PRESETS;
  const isZeroBalance = metrics.spendableBalance === 0 && (state.expenses || []).length === 0;
  const activePool = metrics.totalBudget > 0 ? metrics.remainingPeriodBudget : metrics.spendableBalance;

  return `
    <div class="page-intro">
      <div>
        <h1 class="page-title">Hello, ${escapeHTML(firstName)}</h1>
        <p class="page-subtitle">Daily cash guide and spending summary.</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn--primary" id="btn-open-quick-log-modal">+ Quick Log</button>
        <button type="button" class="btn" data-nav-target="balance">Add Cash</button>
        <button type="button" class="btn btn--emerald" data-nav-target="savings">Savings</button>
      </div>
    </div>

    ${overBudgetCats.length > 0 ? `
      <div class="alert-banner alert-banner--breach">
        <div>
          <strong>Budget Notice:</strong> Over limit in
          <strong>${overBudgetCats.map((c) => escapeHTML(c.name)).join(', ')}</strong>.
        </div>
        <button type="button" class="btn btn--sm" data-nav-target="budget">Adjust</button>
      </div>
    ` : ''}

    <!-- DAILY ALLOWANCE COACH HERO -->
    <section class="coach-hero" aria-label="Daily Allowance Guide">
      <div>
        <span class="coach-hero__kicker">
          ${isZeroBalance ? 'New Account' : (activePool > 0 ? 'Daily Allowance Guide' : 'Budget Limit Reached')}
        </span>
        <h2 class="coach-hero__headline">
          ${isZeroBalance
            ? 'Starting Cash: <span class="coach-hero__amount">₱0.00</span>'
            : `Safe to spend: <span class="coach-hero__amount">${formatPHP(metrics.safeToSpendToday)}</span> today`}
        </h2>
        <p class="coach-hero__explain">
          ${isZeroBalance
            ? 'Tap <strong>Add Cash</strong> above to record your pocket allowance and get started.'
            : `<strong>${formatPHP(Math.max(0, activePool))}</strong> left for the next <strong>${metrics.remainingDaysInPeriod} days</strong>.`}
        </p>
      </div>

      <div class="coach-hero__buckets">
        <div class="bucket-box bucket-box--dark">
          <div class="bucket-box__label">Pocket Cash Left</div>
          <div class="bucket-box__val currency">${formatPHP(metrics.spendableBalance)}</div>
          <div class="bucket-box__note">Available right now</div>
        </div>

        <div class="bucket-box">
          <div class="bucket-box__label">Tucked in Savings</div>
          <div class="bucket-box__val currency" style="color:var(--emerald);">${formatPHP(metrics.totalLockedSavings)}</div>
          <div class="bucket-box__note">Protected savings</div>
        </div>
      </div>
    </section>

    <div class="grid-main-side">
      <!-- LEFT: QUICK LOG EXPENSE + RECENT EXPENSES -->
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <section class="ledger-card">
          <div class="card-header">
            <h2 class="card-title">Log an Expense</h2>
            <span class="mono" style="font-size:0.78rem; color:var(--ink-secondary);">
              Available: ${formatPHP(metrics.spendableBalance)}
            </span>
          </div>

          <!-- 1-TAP STUDENT QUICK PRESETS -->
          <div class="preset-strip">
            <div class="preset-strip__header">
              <span class="preset-strip__label">Quick Fill Shortcuts:</span>
              <button type="button" class="btn btn--sm btn-open-edit-presets" id="btn-open-edit-presets" title="Edit your 1-tap shortcuts" style="padding:0.18rem 0.55rem; font-size:0.73rem;">
                Edit Quick Fill
              </button>
            </div>
            <div class="preset-chips-list">
              ${presets.map((p, idx) => `
                <button
                  type="button"
                  class="preset-chip"
                  data-preset-idx="${idx}"
                  data-target-form="dashboard-quick-expense-form"
                  title="Fill ${escapeHTML(p.title)}: ₱${Number(p.amount).toFixed(2)}"
                >${escapeHTML(p.label || `${p.title} (₱${Number(p.amount).toFixed(0)})`)}</button>
              `).join('')}
            </div>
          </div>

          <form id="dashboard-quick-expense-form">
            <div class="form-grid">
              <div class="field">
                <label for="qe-title">What did you buy?</label>
                <input
                  type="text"
                  id="qe-title"
                  name="title"
                  required
                  minlength="2"
                  placeholder="e.g., Canteen lunch, Jeepney fare"
                >
                <div class="error-msg">Please enter what you spent on.</div>
              </div>

              <div class="field">
                <label for="qe-amount">Amount (₱)</label>
                <input
                  type="number"
                  id="qe-amount"
                  name="amount"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                >
                <div class="error-msg">Please enter a valid expense amount.</div>
              </div>
            </div>

            <div class="form-grid">
              <div class="field">
                <label for="qe-category">Category</label>
                <select id="qe-category" name="category" required>
                  ${EXPENSE_CATEGORIES.map((c) => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('')}
                </select>
              </div>

              <div class="field">
                <label for="qe-date">Date</label>
                <input type="date" id="qe-date" name="date" value="${todayStr}" max="${todayStr}" required>
              </div>
            </div>

            <input type="hidden" name="wallet" value="cash">

            <button type="submit" class="btn btn--primary btn--block">
              + Add Expense
            </button>
          </form>
        </section>

        <!-- RECENT EXPENSES -->
        <section class="ledger-card ledger-card--flush">
          <div class="card-header">
            <h2 class="card-title">Recent Expenses</h2>
            <button type="button" class="btn btn--sm" data-nav-target="expenses">
              View All (${(state.expenses || []).length})
            </button>
          </div>

          <div tabindex="0" role="region" aria-labelledby="dash-recent-caption" class="table-wrapper">
            <table class="ledger-table" style="--label-2:'Category'; --label-3:'Date'; --label-4:'Amount';">
              <caption id="dash-recent-caption">Recent student expenses</caption>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Category</th>
                  <th scope="col">Date</th>
                  <th scope="col" class="num-col">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${recentExpenses.length === 0 ? `
                  <tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--ink-secondary);">No expenses logged yet.</td></tr>
                ` : recentExpenses.map((exp) => `
                  <tr>
                    <th scope="row">${escapeHTML(exp.title)}</th>
                    <td><span class="status-badge status-badge--neutral">${escapeHTML(getCategoryName(exp.category))}</span></td>
                    <td class="mono" style="font-size:0.8rem; color:var(--ink-secondary);">${escapeHTML(exp.date)}</td>
                    <td class="num-col currency" style="font-weight:700; color:var(--vermilion);">-${formatPHP(exp.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- RIGHT: CATEGORY BUDGET PROGRESS & WALLETS -->
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <section class="ledger-card">
          <div class="card-header">
            <h2 class="card-title">Category Limits</h2>
            <button type="button" class="btn btn--sm" data-nav-target="budget">Edit Limits</button>
          </div>

          <div style="display:flex; flex-direction:column; gap:1rem;">
            ${metrics.categoryBreakdown.map((cat) => {
              const clampedWidth = Math.min(100, Math.max(0, cat.utilizationPct));
              return `
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem; font-size:0.86rem;">
                    <strong>${escapeHTML(cat.name)}</strong>
                    <span class="mono" style="font-size:0.8rem;">
                      ${formatPHP(cat.spent)} / ${formatPHP(cat.limit)}
                    </span>
                  </div>
                  <div class="meter-track">
                    <div class="${getMeterFillClass(cat.status)}" style="width: ${clampedWidth}%;"></div>
                  </div>
                  <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--ink-secondary); margin-top:0.2rem;">
                    <span>${cat.remaining >= 0 ? `${formatPHP(cat.remaining)} left` : `Over by ${formatPHP(Math.abs(cat.remaining))}`}</span>
                    <span>${Math.round(cat.utilizationPct)}%</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>

        <!-- SIMPLE WALLET BREAKDOWN -->
        <!-- CASH BALANCE SUMMARY CARD -->
        <section class="ledger-card">
          <div class="card-header">
            <h2 class="card-title">Cash on Hand</h2>
            <button type="button" class="btn btn--sm" data-nav-target="balance">My Wallet</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:0.65rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0; border-bottom:1px dashed #E0DDD3;">
              <span>Pocket Cash Left</span>
              <strong class="currency" style="color:var(--emerald); font-size:1.15rem;">${formatPHP(metrics.spendableBalance)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0; border-bottom:1px dashed #E0DDD3; font-size:0.84rem;">
              <span>Locked in Savings</span>
              <strong class="currency">${formatPHP(metrics.totalLockedSavings)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem 0; font-size:0.84rem;">
              <span>Total Net Cash</span>
              <strong class="currency">${formatPHP(metrics.totalNetBalance)}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- SIMPLE 3-STEP GUIDE FOR STUDENTS -->
    <section class="how-it-works" aria-label="How PESO Works">
      <div class="how-step">
        <span class="how-step__num">1</span>
        <div>
          <strong>Add Your Cash Allowance</strong>
          <div style="color:var(--ink-secondary);">Record your pocket cash or allowance in <em>My Wallet</em>.</div>
        </div>
      </div>
      <div class="how-step">
        <span class="how-step__num">2</span>
        <div>
          <strong>Set Aside Savings First</strong>
          <div style="color:var(--ink-secondary);">Move money into <em>Savings Goals</em> so you cannot accidentally spend it.</div>
        </div>
      </div>
      <div class="how-step">
        <span class="how-step__num">3</span>
        <div>
          <strong>Follow Your Daily Safe Limit</strong>
          <div style="color:var(--ink-secondary);">Stay near <strong>${formatPHP(metrics.safeToSpendToday)}/day</strong> so your allowance lasts all month.</div>
        </div>
      </div>
    </section>
  `;
}

// ============================================================================
// MODULE 4: EXPENSE TRACKING
// ============================================================================
function renderExpensesModule(state, metrics, filters = {}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const {
    search = '',
    category = 'ALL',
    wallet = 'ALL',
    sortBy = 'date_desc'
  } = filters;

  let filtered = [...(state.expenses || [])];
  if (category !== 'ALL') filtered = filtered.filter((e) => e.category === category);
  if (wallet !== 'ALL') filtered = filtered.filter((e) => e.wallet === wallet);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.merchantOrNote || '').toLowerCase().includes(q)
    );
  }

  filtered.sort((a, b) => {
    if (sortBy === 'amount_desc') return b.amount - a.amount;
    if (sortBy === 'amount_asc') return a.amount - b.amount;
    if (sortBy === 'date_asc') return a.date.localeCompare(b.date);
    return b.date.localeCompare(a.date);
  });

  const filteredSubtotal = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
  const presets = (state.quickPresets && state.quickPresets.length > 0) ? state.quickPresets : QUICK_EXPENSE_PRESETS;

  return `
    <div class="page-intro">
      <div>
        <h1 class="page-title">Expenses</h1>
        <p class="page-subtitle">Log new purchases or edit your past spending.</p>
      </div>
      <div class="page-actions">
        <span class="formula-chip formula-chip--highlight">
          Available to Spend: <span class="currency">${formatPHP(metrics.spendableBalance)}</span>
        </span>
      </div>
    </div>

    <!-- CLEAN ADD EXPENSE CARD -->
    <section class="ledger-card" style="margin-bottom:1.5rem;">
      <div class="card-header">
        <h2 class="card-title">Log a New Expense</h2>
      </div>

      <div class="preset-strip">
        <div class="preset-strip__header">
          <span class="preset-strip__label">Quick Fill Shortcuts:</span>
          <button type="button" class="btn btn--sm btn-open-edit-presets" id="btn-open-edit-presets-exp" title="Edit your 1-tap shortcuts" style="padding:0.18rem 0.55rem; font-size:0.73rem;">
            Edit Quick Fill
          </button>
        </div>
        <div class="preset-chips-list">
          ${presets.map((p, idx) => `
            <button
              type="button"
              class="preset-chip"
              data-preset-idx="${idx}"
              data-target-form="form-log-expense"
              title="Fill ${escapeHTML(p.title)}: ₱${Number(p.amount).toFixed(2)}"
            >${escapeHTML(p.label || `${p.title} (₱${Number(p.amount).toFixed(0)})`)}</button>
          `).join('')}
        </div>
      </div>

      <form id="form-log-expense">
        <div class="form-grid">
          <div class="field">
            <label for="exp-title">Description *</label>
            <input
              type="text"
              id="exp-title"
              name="title"
              required
              minlength="2"
              placeholder="e.g., Lunch, Printing, LRT load"
            >
            <div class="error-msg">Please enter a description.</div>
          </div>

          <div class="field">
            <label for="exp-amount">Amount (₱) *</label>
            <input
              type="number"
              id="exp-amount"
              name="amount"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
            >
            <div class="error-msg">Please enter a valid expense amount.</div>
          </div>

          <div class="field">
            <label for="exp-category">Category *</label>
            <select id="exp-category" name="category" required>
              ${EXPENSE_CATEGORIES.map((c) => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('')}
            </select>
          </div>

          <div class="field">
            <label for="exp-date">Date *</label>
            <input type="date" id="exp-date" name="date" value="${todayStr}" max="${todayStr}" required>
          </div>

          <div class="field">
            <label for="exp-note">Note (Optional)</label>
            <input type="text" id="exp-note" name="merchantOrNote" placeholder="Store or note">
          </div>
        </div>

        <input type="hidden" name="wallet" value="cash">
        <button type="submit" class="btn btn--emerald">
          + Save Expense
        </button>
      </form>
    </section>

    <!-- EXPENSE HISTORY & SIMPLE FILTERS -->
    <section class="ledger-card ledger-card--flush">
      <div class="card-header">
        <h2 class="card-title">Expense History (${filtered.length})</h2>
        <div class="mono" style="font-size:0.86rem; font-weight:700;">
          Total Shown: <span style="color:var(--vermilion);">-${formatPHP(filteredSubtotal)}</span>
        </div>
      </div>

      <div class="expense-filter-bar">
        <div class="field" style="margin-bottom:0;">
          <label for="flt-search">Search</label>
          <input type="search" id="flt-search" value="${escapeHTML(search)}" placeholder="Search expenses...">
        </div>

        <div class="field" style="margin-bottom:0;">
          <label for="flt-category">Category</label>
          <select id="flt-category">
            <option value="ALL" ${category === 'ALL' ? 'selected' : ''}>All Categories</option>
            ${EXPENSE_CATEGORIES.map((c) => `<option value="${c.id}" ${category === c.id ? 'selected' : ''}>${escapeHTML(c.name)}</option>`).join('')}
          </select>
        </div>

        <div class="field" style="margin-bottom:0;">
          <label for="flt-sort">Sort By</label>
          <select id="flt-sort">
            <option value="date_desc" ${sortBy === 'date_desc' ? 'selected' : ''}>Newest First</option>
            <option value="date_asc" ${sortBy === 'date_asc' ? 'selected' : ''}>Oldest First</option>
            <option value="amount_desc" ${sortBy === 'amount_desc' ? 'selected' : ''}>Highest Amount</option>
            <option value="amount_asc" ${sortBy === 'amount_asc' ? 'selected' : ''}>Lowest Amount</option>
          </select>
        </div>
      </div>

      <div tabindex="0" role="region" aria-labelledby="expense-crud-caption" class="table-wrapper">
        <table class="ledger-table" style="--label-2:'Category'; --label-3:'Date'; --label-4:'Amount'; --label-5:'Actions';">
          <caption id="expense-crud-caption">Student expense history</caption>
          <thead>
            <tr>
              <th scope="col">Expense</th>
              <th scope="col">Category</th>
              <th scope="col">Date</th>
              <th scope="col" class="num-col">Amount</th>
              <th scope="col" class="num-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length === 0 ? `
              <tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--ink-secondary);">No matching expenses found.</td></tr>
            ` : filtered.map((exp) => `
              <tr>
                <th scope="row">
                  <div>${escapeHTML(exp.title)}</div>
                  ${exp.merchantOrNote ? `<div style="font-size:0.75rem; font-weight:400; color:var(--ink-secondary);">${escapeHTML(exp.merchantOrNote)}</div>` : ''}
                </th>
                <td><span class="status-badge status-badge--neutral">${escapeHTML(getCategoryName(exp.category))}</span></td>
                <td class="mono" style="font-size:0.82rem;">${escapeHTML(exp.date)}</td>
                <td class="num-col currency" style="font-weight:700; color:var(--vermilion);">-${formatPHP(exp.amount)}</td>
                <td class="num-col">
                  <div style="display:inline-flex; gap:0.35rem;">
                    <button type="button" class="btn btn--sm" data-edit-expense="${escapeHTML(exp.id)}">Edit</button>
                    <button type="button" class="btn btn--sm btn--danger" data-delete-expense="${escapeHTML(exp.id)}">Delete</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// ============================================================================
// MODULE 5: BUDGET MANAGEMENT (Flexible Cycles & Category Caps)
// ============================================================================
function renderBudgetModule(state, metrics) {
  const bdg = state.budget || {};

  return `
    <div class="page-intro">
      <div>
        <h1 class="page-title">Budgets &amp; Spending Limits</h1>
        <p class="page-subtitle">Choose your allowance cycle (Weekly, Bi-Weekly, or Monthly) and set category limits.</p>
      </div>
    </div>

    ${metrics.isCategoryLimitOverBudget ? `
      <div class="alert-banner alert-banner--breach">
        <div>
          <strong>Category limits exceed your total budget:</strong> Your 5 category limits add up to
          <strong>${formatPHP(metrics.sumCategoryLimits)}</strong>, which is <strong>${formatPHP(metrics.categoryLimitExcess)}</strong> higher than your ${formatPHP(metrics.totalBudget)} budget.
        </div>
        <button type="button" class="btn btn--sm btn--primary" id="btn-autofit-limits">Auto-Fit Limits to ${formatPHP(metrics.totalBudget)}</button>
      </div>
    ` : ''}

    <section class="grid-3">
      <article class="stat-card ${metrics.globalBudgetStatus === 'BREACH' ? 'stat-card--vermilion' : metrics.globalBudgetStatus === 'CAUTION' ? 'stat-card--amber' : 'stat-card--emerald'}">
        <div class="stat-label">
          <span>Total Budget Used</span>
          ${getStatusBadgeHTML(metrics.globalBudgetStatus, metrics.globalBudgetUtilizationPct)}
        </div>
        <div class="stat-value currency">${formatPHP(metrics.totalExpenses)}</div>
        <p class="stat-help">Out of ${formatPHP(metrics.totalBudget)} ${escapeHTML(bdg.period.toLowerCase())} budget</p>
      </article>

      <article class="stat-card">
        <div class="stat-label"><span>Remaining Budget</span></div>
        <div class="stat-value currency">${formatPHP(metrics.remainingPeriodBudget)}</div>
        <p class="stat-help">${metrics.remainingDaysInPeriod} days remaining in this period</p>
      </article>

      <article class="stat-card stat-card--primary">
        <div class="stat-label"><span>Safe to Spend Today</span></div>
        <div class="stat-value currency">${formatPHP(metrics.safeToSpendToday)}<small style="font-size:0.9rem;"> / day</small></div>
        <p class="stat-help">Remaining budget divided by ${metrics.remainingDaysInPeriod} days</p>
      </article>
    </section>

    <div class="grid-2">
      <!-- LEFT: CATEGORY PROGRESS -->
      <section class="ledger-card">
        <div class="card-header">
          <h2 class="card-title">Category Spending Progress</h2>
        </div>

        <div style="display:flex; flex-direction:column; gap:1.15rem;">
          ${metrics.categoryBreakdown.map((cat) => {
            const clamped = Math.min(100, Math.max(0, cat.utilizationPct));
            return `
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.35rem;">
                  <strong>${escapeHTML(cat.name)}</strong>
                  ${getStatusBadgeHTML(cat.status, cat.utilizationPct)}
                </div>
                <div class="meter-track" style="height:12px;">
                  <div class="${getMeterFillClass(cat.status)}" style="width:${clamped}%;"></div>
                </div>
                <div class="mono" style="display:flex; justify-content:space-between; font-size:0.78rem; color:var(--ink-secondary); margin-top:0.25rem;">
                  <span>Spent: ${formatPHP(cat.spent)} of ${formatPHP(cat.limit)}</span>
                  <strong style="color:${cat.remaining < 0 ? 'var(--vermilion)' : 'var(--ink-primary)'};">
                    ${cat.remaining >= 0 ? `${formatPHP(cat.remaining)} left` : `Over by ${formatPHP(Math.abs(cat.remaining))}`}
                  </strong>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- RIGHT: EDIT GLOBAL BUDGET & CATEGORY LIMITS -->
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <section class="ledger-card">
          <div class="card-header">
            <h2 class="card-title">1. Set Overall Budget</h2>
          </div>

          <div class="preset-strip">
            <span class="preset-strip__label">Cycle Preset:</span>
            <button type="button" class="preset-chip" data-cycle-preset="WEEKLY" data-cycle-days="7">Weekly (7d)</button>
            <button type="button" class="preset-chip" data-cycle-preset="BIWEEKLY" data-cycle-days="15">Bi-Weekly (15d)</button>
            <button type="button" class="preset-chip" data-cycle-preset="MONTHLY" data-cycle-days="30">Monthly (30d)</button>
          </div>

          <form id="form-global-budget">
            <div class="form-grid">
              <div class="field">
                <label for="bdg-period">Allowance Cycle</label>
                <select id="bdg-period" name="period" required>
                  <option value="WEEKLY" ${bdg.period === 'WEEKLY' ? 'selected' : ''}>Weekly</option>
                  <option value="BIWEEKLY" ${bdg.period === 'BIWEEKLY' ? 'selected' : ''}>Bi-Weekly (15 Days)</option>
                  <option value="MONTHLY" ${bdg.period === 'MONTHLY' ? 'selected' : ''}>Monthly</option>
                  <option value="CUSTOM" ${bdg.period === 'CUSTOM' ? 'selected' : ''}>Custom Date Range</option>
                </select>
              </div>

              <div class="field">
                <label for="bdg-total">Total Budget (₱)</label>
                <input type="number" id="bdg-total" name="totalBudget" step="0.01" min="100" value="${Number(bdg.totalBudget).toFixed(2)}" required>
              </div>
            </div>

            <div class="form-grid">
              <div class="field">
                <label for="bdg-start">Start Date</label>
                <input type="date" id="bdg-start" name="periodStart" value="${escapeHTML(bdg.periodStart)}" required>
              </div>
              <div class="field">
                <label for="bdg-end">End Date</label>
                <input type="date" id="bdg-end" name="periodEnd" value="${escapeHTML(bdg.periodEnd)}" required>
              </div>
            </div>

            <button type="submit" class="btn btn--primary btn--block">Save Overall Budget</button>
          </form>
        </section>

        <section class="ledger-card">
          <div class="card-header">
            <h2 class="card-title">2. Set Category Limits</h2>
            <button type="button" class="btn btn--sm" id="btn-autofit-limits-2">Auto-Fit</button>
          </div>

          <form id="form-category-limits">
            <div class="form-grid">
              ${metrics.categoryBreakdown.map((cat) => `
                <div class="field" style="margin-bottom:0.5rem;">
                  <label for="lim-${cat.id}">${escapeHTML(cat.name)} (₱)</label>
                  <input type="number" id="lim-${cat.id}" name="${cat.id}" step="0.01" min="0" value="${Number(cat.limit).toFixed(2)}" required>
                </div>
              `).join('')}
            </div>
            <button type="submit" class="btn btn--emerald btn--block" style="margin-top:0.5rem;">
              Save Category Limits
            </button>
          </form>
        </section>
      </div>
    </div>
  `;
}

// ============================================================================
// MODULE 6: SAVINGS GOALS (With 1-Tap Quick-Save Buttons)
// ============================================================================
function renderSavingsModule(state, metrics) {
  const defaultDeadline = new Date(new Date().getFullYear(), new Date().getMonth() + 3, 15).toISOString().slice(0, 10);

  return `
    <div class="page-intro">
      <div>
        <h1 class="page-title">Savings Goals</h1>
        <p class="page-subtitle">Money added to a goal is set aside from your Available to Spend balance so you do not accidentally spend it.</p>
      </div>
      <div class="page-actions">
        <span class="formula-chip formula-chip--highlight">
          Available to Save: <span class="currency">${formatPHP(metrics.spendableBalance)}</span>
        </span>
      </div>
    </div>

    <div class="grid-main-side">
      <!-- LEFT: SAVINGS GOALS LIST -->
      <div style="display:flex; flex-direction:column; gap:1.15rem;">
        ${(state.savingsGoals || []).length === 0 ? `
          <div class="ledger-card" style="text-align:center; padding:2.5rem; color:var(--ink-secondary);">
            You do not have any savings goals yet. Create your first goal on the right.
          </div>
        ` : state.savingsGoals.map((goal) => {
          const pct = goal.targetAmount > 0 ? (goal.lockedAmount / goal.targetAmount) * 100 : 0;
          const clamped = Math.min(100, Math.max(0, pct));
          const toGo = Math.max(0, goal.targetAmount - goal.lockedAmount);
          return `
            <article class="ledger-card">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem; flex-wrap:wrap;">
                <div>
                  <h3 style="font-family:var(--font-display); font-size:1.15rem;">${escapeHTML(goal.name)}</h3>
                  ${goal.notes ? `<p style="font-size:0.84rem; color:var(--ink-secondary); margin-top:0.15rem;">${escapeHTML(goal.notes)}</p>` : ''}
                </div>
                <span class="status-badge status-badge--nominal">${Math.round(pct)}% Saved</span>
              </div>

              <div style="margin:1rem 0;">
                <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:0.35rem;">
                  <div class="mono">
                    <strong style="font-size:1.35rem; color:var(--emerald);">${formatPHP(goal.lockedAmount)}</strong>
                    <span style="font-size:0.84rem; color:var(--ink-secondary);"> saved of ${formatPHP(goal.targetAmount)}</span>
                  </div>
                  <span style="font-size:0.78rem; color:var(--ink-secondary);">Target: ${escapeHTML(goal.deadline)}</span>
                </div>
                <div class="meter-track" style="height:12px;">
                  <div class="meter-fill" style="width:${clamped}%;"></div>
                </div>
                <div style="font-size:0.78rem; color:var(--ink-secondary); margin-top:0.3rem;">
                  ${toGo > 0 ? `${formatPHP(toGo)} more to reach your goal` : 'Goal target reached'}
                </div>
              </div>

              <!-- 1-TAP QUICK SAVE + FLEXIBLE ACTIONS -->
              <div style="display:flex; gap:0.45rem; flex-wrap:wrap; padding-top:0.75rem; border-top:var(--border-dashed); align-items:center;">
                <button type="button" class="preset-chip" data-quick-save-goal="${escapeHTML(goal.id)}" data-quick-save-amt="50">+₱50</button>
                <button type="button" class="preset-chip" data-quick-save-goal="${escapeHTML(goal.id)}" data-quick-save-amt="100">+₱100</button>
                <button type="button" class="preset-chip" data-quick-save-goal="${escapeHTML(goal.id)}" data-quick-save-amt="200">+₱200</button>
                <button type="button" class="btn btn--sm btn--emerald" data-vault-allocate="${escapeHTML(goal.id)}">
                  Custom Amount
                </button>
                <button type="button" class="btn btn--sm" data-vault-withdraw="${escapeHTML(goal.id)}" ${goal.lockedAmount <= 0 ? 'disabled' : ''}>
                  Withdraw
                </button>
                <button type="button" class="btn btn--sm" data-vault-edit="${escapeHTML(goal.id)}">
                  Edit
                </button>
                <button type="button" class="btn btn--sm btn--danger" data-vault-delete="${escapeHTML(goal.id)}" style="margin-left:auto;">
                  Delete
                </button>
              </div>
            </article>
          `;
        }).join('')}
      </div>

      <!-- RIGHT: CREATE NEW GOAL -->
      <section class="ledger-card">
        <div class="card-header">
          <h2 class="card-title">Create New Goal</h2>
        </div>

        <form id="form-create-savings-goal">
          <div class="field">
            <label for="sav-name">Goal Name *</label>
            <input type="text" id="sav-name" name="name" required minlength="2" placeholder="e.g., Thesis Binding, Emergency Fund">
            <div class="error-msg">Please enter a goal name.</div>
          </div>

          <div class="field">
            <label for="sav-target">Target Amount (₱) *</label>
            <input type="number" id="sav-target" name="targetAmount" step="0.01" min="1" required placeholder="3000.00">
            <div class="error-msg">Enter a target amount greater than ₱0.</div>
          </div>

          <div class="field">
            <label for="sav-deadline">Target Date *</label>
            <input type="date" id="sav-deadline" name="deadline" value="${defaultDeadline}" required>
          </div>

          <div class="field">
            <label for="sav-initial">Starting Deposit (Optional, ₱)</label>
            <span class="hint">Deducted from your ${formatPHP(metrics.spendableBalance)} available balance</span>
            <input type="number" id="sav-initial" name="initialAllocation" step="0.01" min="0" max="${Math.max(0, metrics.spendableBalance)}" value="0">
          </div>

          <input type="hidden" name="wallet" value="cash">
          <input type="hidden" name="priority" value="MEDIUM">

          <div class="field">
            <label for="sav-notes">Short Note (Optional)</label>
            <input type="text" id="sav-notes" name="notes" placeholder="What is this goal for?">
          </div>

          <button type="submit" class="btn btn--emerald btn--block">
            + Create Savings Goal
          </button>
        </form>
      </section>
    </div>
  `;
}

// ============================================================================
// MODULE 3: MY WALLET (BALANCE MANAGEMENT & FLEXIBLE QUICK SYNC)
// ============================================================================
function renderBalanceModule(state, metrics) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const b = state.initialBalance?.breakdown || { cash: 0 };

  return `
    <div class="page-intro">
      <div>
        <h1 class="page-title">My Cash &amp; Allowance</h1>
        <p class="page-subtitle">Track your physical cash allowance, pocket money, and cash-in history.</p>
      </div>
    </div>

    <!-- SIMPLE VISUAL BALANCE FORMULA -->
    <section class="balance-formula-strip" aria-label="How your balance is calculated">
      <div class="formula-steps">
        <span class="formula-chip">Starting Cash: <strong class="currency">${formatPHP(metrics.initialTotal)}</strong></span>
        <span>+</span>
        <span class="formula-chip">Allowance Added: <strong class="currency" style="color:var(--emerald);">+${formatPHP(metrics.totalInflows)}</strong></span>
        <span>−</span>
        <span class="formula-chip">Expenses: <strong class="currency" style="color:var(--vermilion);">-${formatPHP(metrics.totalExpenses)}</strong></span>
        <span>−</span>
        <span class="formula-chip">Saved in Goals: <strong class="currency">-${formatPHP(metrics.totalLockedSavings)}</strong></span>
        <span>=</span>
        <span class="formula-chip formula-chip--highlight">Available Pocket Cash: <strong class="currency">${formatPHP(metrics.spendableBalance)}</strong></span>
      </div>
    </section>

    <!-- SINGLE PHYSICAL CASH CARD WITH QUICK RECONCILIATION -->
    <section class="stat-card stat-card--emerald" style="margin-bottom:1.25rem;">
      <div class="wallet-hero-row">
        <div>
          <span class="status-badge status-badge--nominal">Physical Cash Flow</span>
          <div class="stat-label" style="font-size:0.86rem; margin-top:0.4rem;">Pocket Cash (Available)</div>
          <div class="stat-value currency" style="margin-top:0.2rem;">
            ${formatPHP(metrics.spendableBalance)}
          </div>
        </div>

        <div class="wallet-summary-box">
          <div style="display:flex; justify-content:space-between; gap:0.75rem;">
            <span style="color:var(--ink-secondary);">Total Net Cash:</span>
            <strong>${formatPHP(metrics.totalNetBalance)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; gap:0.75rem;">
            <span style="color:var(--ink-secondary);">Locked in Savings:</span>
            <strong style="color:var(--emerald);">${formatPHP(metrics.totalLockedSavings)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; gap:0.75rem;">
            <span style="color:var(--ink-secondary);">Total Cash Added:</span>
            <strong style="color:var(--emerald);">+${formatPHP(metrics.totalInflows)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; gap:0.75rem;">
            <span style="color:var(--ink-secondary);">Total Cash Spent:</span>
            <strong style="color:var(--vermilion);">-${formatPHP(metrics.totalExpenses)}</strong>
          </div>
        </div>
      </div>

      <form class="form-quick-wallet-sync wallet-sync-form" data-sync-wallet="cash">
        <span style="font-size:0.82rem; font-weight:700;">Count Cash on Hand:</span>
        <input
          type="number"
          name="targetSpendable"
          step="0.01"
          min="0"
          placeholder="Actual ₱ bills & coins in pocket"
          required
          class="wallet-sync-input"
        >
        <button type="submit" class="btn btn--sm">Update Cash Count</button>
      </form>
    </section>

    <div class="grid-2">
      <!-- LEFT: ADD ALLOWANCE / CASH IN -->
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <section class="ledger-card">
          <div class="card-header">
            <h2 class="card-title">Add Allowance or Cash Inflow</h2>
          </div>

          <form id="form-add-inflow">
            <div class="field">
              <label for="inf-type">Allowance / Inflow Source</label>
              <select id="inf-type" name="type" required>
                ${INFLOW_TYPES.map((t) => `<option value="${t.id}">${escapeHTML(t.label)}</option>`).join('')}
              </select>
            </div>

            <div class="form-grid">
              <div class="field">
                <label for="inf-amount">Amount (₱) *</label>
                <input type="number" id="inf-amount" name="amount" step="0.01" required placeholder="1000.00">
                <div class="error-msg">Enter a valid non-zero amount.</div>
              </div>

              <div class="field">
                <label for="inf-date">Date *</label>
                <input type="date" id="inf-date" name="date" value="${todayStr}" max="${todayStr}" required>
              </div>
            </div>

            <div class="field">
              <label for="inf-desc">Note / Description *</label>
              <input type="text" id="inf-desc" name="description" required minlength="3" placeholder="e.g., Weekly cash allowance from parents">
              <div class="error-msg">Please add a short note for your records.</div>
            </div>

            <input type="hidden" name="wallet" value="cash">
            <button type="submit" class="btn btn--emerald btn--block">
              + Add Cash Allowance
            </button>
          </form>
        </section>

        <!-- TUCKED AWAY STARTING CASH SETUP -->
        <details class="ledger-card">
          <summary style="cursor:pointer; font-weight:700; font-family:var(--font-display);">
            Edit Starting Cash on Hand (${formatPHP(metrics.initialTotal)})
          </summary>
          <form id="form-input-initial-balance" style="margin-top:1rem;">
            <div class="field">
              <label for="init-cash">Starting Cash on Hand (₱) *</label>
              <input type="number" id="init-cash" name="cash" step="0.01" min="0" value="${Number(b.cash).toFixed(2)}" required>
            </div>
            <input type="hidden" name="ewallet" value="0">
            <input type="hidden" name="bank" value="0">
            <input type="hidden" name="date" value="${escapeHTML(state.initialBalance?.date || todayStr)}">
            <input type="hidden" name="note" value="Updated starting cash balance">
            <button type="submit" class="btn btn--primary btn--block">Save Starting Cash</button>
          </form>
        </details>
      </div>

      <!-- RIGHT: ALLOWANCE HISTORY -->
      <section class="ledger-card ledger-card--flush">
        <div class="card-header">
          <h2 class="card-title">Allowance &amp; Cash-In History</h2>
          <span class="mono" style="font-size:0.84rem; font-weight:700; color:var(--emerald);">
            +${formatPHP(metrics.totalInflows)}
          </span>
        </div>

        <div tabindex="0" role="region" aria-labelledby="inflow-table-caption" class="table-wrapper">
          <table class="ledger-table" style="--label-2:'Date'; --label-3:'Amount'; --label-4:'Action';">
            <caption id="inflow-table-caption">Allowance and cash inflow history</caption>
            <thead>
              <tr>
                <th scope="col">Note</th>
                <th scope="col">Date</th>
                <th scope="col" class="num-col">Amount</th>
                <th scope="col" class="num-col">Action</th>
              </tr>
            </thead>
            <tbody>
              ${(state.inflows || []).length === 0 ? `
                <tr><td colspan="4" style="text-align:center; padding:1.5rem; color:var(--ink-secondary);">No allowance entries added yet.</td></tr>
              ` : state.inflows.map((inf) => `
                <tr>
                  <th scope="row">${escapeHTML(inf.description)}</th>
                  <td class="mono" style="font-size:0.8rem;">${escapeHTML(inf.date)}</td>
                  <td class="num-col currency" style="font-weight:700; color:${inf.amount >= 0 ? 'var(--emerald)' : 'var(--vermilion)'};">
                    ${formatPHP(inf.amount, true)}
                  </td>
                  <td class="num-col">
                    <button type="button" class="btn btn--sm btn--danger" data-delete-inflow="${escapeHTML(inf.id)}">Remove</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

// ============================================================================
// MODULE 7: SUMMARY & RECEIPT (REPORTS)
// ============================================================================
function renderReportsModule(state, metrics) {
  const nowStr = new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' });

  return `
    <div class="page-intro no-print">
      <div>
        <h1 class="page-title">Summary &amp; Monthly Receipt</h1>
        <p class="page-subtitle">See where your money went and print or export your student statement.</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn--primary" id="btn-print-receipt">Print Receipt</button>
        <button type="button" class="btn btn--emerald" id="btn-export-csv">Export CSV</button>
      </div>
    </div>

    <section class="grid-3 no-print">
      <article class="stat-card">
        <div class="stat-label"><span>Total Spent</span></div>
        <div class="stat-value currency">${formatPHP(metrics.totalExpenses)}</div>
        <p class="stat-help">Average ${formatPHP(metrics.dailyBurnRate)} per day</p>
      </article>

      <article class="stat-card stat-card--emerald">
        <div class="stat-label"><span>Total Saved in Goals</span></div>
        <div class="stat-value currency">${formatPHP(metrics.totalLockedSavings)}</div>
        <p class="stat-help">${metrics.savingsRateOfInflow.toFixed(1)}% of your total money in</p>
      </article>

      <article class="stat-card stat-card--primary">
        <div class="stat-label"><span>Available to Spend</span></div>
        <div class="stat-value currency">${formatPHP(metrics.spendableBalance)}</div>
        <p class="stat-help">Total Net Balance: ${formatPHP(metrics.totalNetBalance)}</p>
      </article>
    </section>

    <div class="grid-2">
      <!-- LEFT: SPENDING BY CATEGORY -->
      <section class="ledger-card no-print">
        <div class="card-header">
          <h2 class="card-title">Spending by Category</h2>
        </div>

        <div class="stacked-bar">
          ${metrics.categoryBreakdown.map((cat) => `
            <div
              class="stacked-bar__seg"
              style="width:${cat.shareOfTotalSpendPct}%; background-color:${CATEGORY_COLORS[cat.id] || '#111215'};"
              title="${escapeHTML(cat.name)}: ${formatPHP(cat.spent)}"
            ></div>
          `).join('')}
        </div>

        <div tabindex="0" role="region" aria-labelledby="dist-table-caption" class="table-wrapper" style="margin-top:1rem;">
          <table class="ledger-table" style="--label-2:'Spent'; --label-3:'Share';">
            <caption id="dist-table-caption">Spending breakdown by category</caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col" class="num-col">Spent</th>
                <th scope="col" class="num-col">Share</th>
              </tr>
            </thead>
            <tbody>
              ${metrics.categoryBreakdown.map((cat) => `
                <tr>
                  <th scope="row">
                    <span style="display:inline-block;width:10px;height:10px;background:${CATEGORY_COLORS[cat.id]};margin-right:0.45rem;"></span>
                    ${escapeHTML(cat.name)}
                  </th>
                  <td class="num-col currency" style="font-weight:700;">${formatPHP(cat.spent)}</td>
                  <td class="num-col pct">${cat.shareOfTotalSpendPct.toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- RIGHT: CLEAN PRINTABLE RECEIPT -->
      <section class="thermal-receipt" id="printable-monthly-receipt" aria-label="Monthly Student Receipt">
        <div class="receipt-header">
          <div class="receipt-title">PESO STUDENT RECEIPT</div>
          <div style="font-size:0.76rem; color:var(--ink-secondary); margin-top:0.2rem;">
            ${escapeHTML(state.student.fullName)} • ${escapeHTML(nowStr)}
          </div>
        </div>

        <div class="receipt-line">
          <span>Starting Balance</span>
          <span class="currency">${formatPHP(metrics.initialTotal)}</span>
        </div>
        <div class="receipt-line">
          <span>+ Allowance &amp; Cash In</span>
          <span class="currency">+${formatPHP(metrics.totalInflows)}</span>
        </div>
        <div class="receipt-line">
          <span>− Total Expenses (${(state.expenses || []).length})</span>
          <span class="currency">-${formatPHP(metrics.totalExpenses)}</span>
        </div>
        <div class="receipt-line" style="font-weight:700;">
          <span>= Total Net Balance</span>
          <span class="currency">${formatPHP(metrics.totalNetBalance)}</span>
        </div>
        <div class="receipt-line">
          <span>− Locked in Savings Goals</span>
          <span class="currency">-${formatPHP(metrics.totalLockedSavings)}</span>
        </div>
        <div class="receipt-line receipt-line--total">
          <span>AVAILABLE TO SPEND</span>
          <span class="currency" style="color:var(--emerald);">${formatPHP(metrics.spendableBalance)}</span>
        </div>

        <div style="font-weight:700; font-size:0.78rem; margin:1rem 0 0.4rem;">
          ITEMIZED EXPENSES
        </div>
        ${(state.expenses || []).map((exp) => `
          <div class="receipt-line" style="font-size:0.76rem;">
            <span>${escapeHTML(exp.date)} — ${escapeHTML(exp.title)}</span>
            <span class="currency">-${formatPHP(exp.amount)}</span>
          </div>
        `).join('')}
      </section>
    </div>
  `;
}

// ============================================================================
// MODULE 2: SEPARATE LANDING PAGE (WELCOME, 1-CLICK DEMO & LOGIN PORTAL)
// ============================================================================
function renderLandingPage(state, activeAuthTab = 'register') {
  const isAuthed = Boolean(state.student?.authenticated);

  return `
    <div class="landing-container">
      <!-- HERO BANNER -->
      <section class="landing-hero" aria-label="Welcome to PESO">
        <div class="landing-badge">Student Cash &amp; Allowance App</div>
        <h1 class="landing-title">Stretch your student allowance without the stress.</h1>
        <p class="landing-lead">
          Manage your daily pocket cash, know how much is safe to spend today, and set aside savings so your allowance lasts all month.
        </p>
        <div style="display:flex; justify-content:center; gap:0.55rem; flex-wrap:wrap; margin-top:1rem;">
          <button type="button" class="btn btn--sm btn--primary" data-open-install-share="true">
            Install / Share App
          </button>
          <button type="button" class="btn btn--sm" data-open-db-modal="true">
            Database &amp; GitHub Sync
          </button>
        </div>
      </section>

      <!-- 2-COLUMN SECTION: DEMO MODE ON ONE SIDE, AUTHENTICATION ON THE OTHER -->
      <div class="landing-grid">
        <!-- COLUMN 1: 1-CLICK STUDENT DEMO MODE -->
        <section class="landing-card landing-card--demo" aria-labelledby="landing-demo-title">
          <div>
            <span class="landing-card__tag">Instant 1-Click Access</span>
            <h2 id="landing-demo-title" class="landing-card__title">Test Student Demo Mode</h2>
            <p class="landing-card__desc">
              Explore the full system immediately with pre-loaded, realistic Philippine Peso (₱) student allowance and campus expenses. No registration required.
            </p>

            <ul class="demo-feature-list">
              <li><strong>Pre-Funded Cash Wallet:</strong> Pocket cash on hand (₱6,000) and monthly allowance inflow (₱6,000).</li>
              <li><strong>Real Student Expenses:</strong> Canteen meals, jeepney fares, thesis photocopying, and dorm utilities.</li>
              <li><strong>Live Safe-to-Spend:</strong> Daily spending limit calculated automatically from remaining budget and days.</li>
              <li><strong>Protected Savings Vaults:</strong> Thesis binding and emergency clinic buffers locked in escrow.</li>
            </ul>
          </div>

          <div style="margin-top:1.25rem;">
            ${isAuthed ? `
              <div style="padding:0.75rem; background:var(--bg-vellum); border:var(--border-hairline); margin-bottom:0.75rem; font-size:0.84rem;">
                Currently signed in as <strong>${escapeHTML(state.student.fullName)}</strong>.
              </div>
              <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                <button type="button" class="btn btn--primary" style="flex:1;" data-nav-target="dashboard">
                  Open Dashboard
                </button>
                <button type="button" class="btn btn--emerald" id="btn-landing-enter-demo">
                  Reset &amp; Enter Demo Mode
                </button>
              </div>
            ` : `
              <button type="button" class="btn btn--emerald btn--block" id="btn-landing-enter-demo" style="font-size:0.95rem; padding:0.75rem 1rem;">
                Enter Student Demo Mode
              </button>
              <p style="font-size:0.75rem; color:var(--ink-secondary); text-align:center; margin-top:0.45rem;">
                Opens immediately with sample student data. Completely free to test.
              </p>
            `}
          </div>
        </section>

        <!-- COLUMN 2: STUDENT PORTAL (REGISTER / LOGIN) -->
        <section class="landing-card" aria-labelledby="landing-portal-title">
          <div>
            <span class="landing-card__tag" style="color:var(--ink-primary);">Student Portal</span>
            <h2 id="landing-portal-title" class="landing-card__title">
              ${activeAuthTab === 'login' ? 'Sign In to Your Account' : 'Create Your Account'}
            </h2>
            <p class="landing-card__desc">
              ${activeAuthTab === 'login'
                ? 'Access your saved expenses, budget, and savings vaults.'
                : 'Create an account to start tracking your daily allowance and expenses.'}
            </p>

            <!-- TABS -->
            <div style="display:flex; gap:0.4rem; margin-bottom:1.15rem; flex-wrap:wrap;">
              <button type="button" class="btn btn--sm ${activeAuthTab === 'register' ? 'btn--primary' : ''}" data-auth-tab="register">
                Create Account
              </button>
              <button type="button" class="btn btn--sm ${activeAuthTab === 'login' ? 'btn--primary' : ''}" data-auth-tab="login">
                Sign In
              </button>
            </div>

            ${activeAuthTab === 'register' ? `
              <form id="form-student-register">
                <div class="field">
                  <label for="reg-fullname">Your Name *</label>
                  <input
                    type="text"
                    id="reg-fullname"
                    name="fullName"
                    autocomplete="name"
                    required
                    placeholder="e.g. Maria Clara Santos"
                  >
                  <div class="error-msg">Please enter your name.</div>
                </div>

                <div class="field">
                  <label for="reg-email">Email Address (any email) *</label>
                  <input
                    type="email"
                    id="reg-email"
                    name="email"
                    autocomplete="email"
                    required
                    placeholder="e.g. maria@gmail.com, student@yahoo.com"
                  >
                  <div class="error-msg">Please enter a valid email address.</div>
                </div>

                <div class="field">
                  <label for="reg-password">Password *</label>
                  <input
                    type="password"
                    id="reg-password"
                    name="password"
                    autocomplete="new-password"
                    required
                    minlength="4"
                    placeholder="Enter password (at least 4 characters)"
                  >
                  <div class="error-msg">Password must be at least 4 characters.</div>
                </div>

                <button type="submit" class="btn btn--emerald btn--block" style="margin-top:0.75rem;">
                  Create Account &amp; Start
                </button>

                <div style="margin-top:0.85rem; font-size:0.82rem; text-align:center; color:var(--ink-secondary);">
                  Already have an account?
                  <button type="button" class="btn btn--sm" data-auth-tab="login" style="margin-left:0.35rem; padding:0.15rem 0.5rem;">
                    Sign In
                  </button>
                </div>
              </form>
            ` : ''}

            ${activeAuthTab === 'login' ? `
              <form id="form-student-login">
                <div class="field">
                  <label for="login-email">Email Address *</label>
                  <span id="login-id-hint" class="hint">Demo: jmreyes@iskolar.edu.ph</span>
                  <input
                    type="email"
                    id="login-email"
                    name="identifier"
                    autocomplete="username"
                    spellcheck="false"
                    autocorrect="off"
                    autocapitalize="off"
                    required
                    placeholder="e.g. maria@gmail.com"
                    aria-describedby="login-id-hint"
                  >
                  <div class="error-msg">Please enter your email.</div>
                </div>

                <div class="field">
                  <label for="current-password">Password *</label>
                  <span id="login-pw-hint" class="hint">Demo password: peso-student-2026</span>
                  <input
                    type="password"
                    id="current-password"
                    name="password"
                    autocomplete="current-password"
                    required
                    placeholder="Enter your password"
                    aria-describedby="login-pw-hint"
                  >
                  <div class="error-msg">Please enter your password.</div>
                </div>

                <div style="display:flex; gap:0.5rem; margin-top:1rem; flex-wrap:wrap;">
                  <button type="submit" class="btn btn--primary" style="flex:1;">Sign In</button>
                  <button type="button" class="btn btn--sm" id="btn-fill-demo-creds">Fill Demo Login</button>
                </div>

                <div style="margin-top:0.85rem; font-size:0.82rem; text-align:center; color:var(--ink-secondary);">
                  Do not have an account yet?
                  <button type="button" class="btn btn--sm" data-auth-tab="register" style="margin-left:0.35rem; padding:0.15rem 0.5rem;">
                    Create Account
                  </button>
                </div>
              </form>
            ` : ''}
          </div>
        </section>
      </div>

      <!-- 3-PILLAR BENEFIT CARDS -->
      <section class="landing-pillars" aria-label="Why Students Use PESO">
        <div class="pillar-card">
          <span class="pillar-card__num">01 / DAILY PACE</span>
          <h3 class="pillar-card__title">Safe-to-Spend Today</h3>
          <p class="pillar-card__desc">
            Never guess if you have enough money left for meals. PESO calculates your daily safe spending rate by dividing your remaining budget by remaining days.
          </p>
        </div>

        <div class="pillar-card">
          <span class="pillar-card__num">02 / SAVINGS ESCROW</span>
          <h3 class="pillar-card__title">Locked Savings Goals</h3>
          <p class="pillar-card__desc">
            Money saved for thesis manuscript, lab kits, or dorm emergencies is deducted from your spendable balance so you cannot accidentally spend it.
          </p>
        </div>

        <div class="pillar-card">
          <span class="pillar-card__num">03 / CASH FLOW</span>
          <h3 class="pillar-card__title">100% Cash Flow Simplicity</h3>
          <p class="pillar-card__desc">
            Designed specifically for students who manage physical cash allowance. No linked bank accounts, no e-wallet confusion—just clean, accurate tracking of your coins and bills.
          </p>
        </div>
      </section>
    </div>
  `;
}

// Backward compatibility export for auth module
function renderAuthModule(state, metrics, activeAuthTab = 'login') {
  if (state.student && state.student.authenticated) {
    return renderAccountModule(state, metrics);
  }
  return renderLandingPage(state, activeAuthTab);
}

// ============================================================================
// IN-APP STUDENT ACCOUNT PROFILE (ACCESSED WHEN LOGGED IN)
// ============================================================================
function renderAccountModule(state, metrics) {
  return `
    <div class="page-intro">
      <div>
        <h1 class="page-title">Student Account</h1>
        <p class="page-subtitle">Your student profile and session settings.</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn--primary" data-nav-target="dashboard">Return to Overview</button>
        <button type="button" class="btn btn--danger" id="btn-auth-logout">Sign Out to Landing Page</button>
      </div>
    </div>

    <div class="grid-2">
      <!-- STUDENT PROFILE DETAILS -->
      <section class="ledger-card">
        <div class="card-header">
          <h2 class="card-title">Student Profile</h2>
          <span class="status-badge status-badge--nominal">Authenticated</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.75rem; font-size:0.88rem;">
          <div style="display:flex; justify-content:space-between; padding-bottom:0.5rem; border-bottom:1px dashed #E0DDD3;">
            <span style="color:var(--ink-secondary);">Full Name:</span>
            <strong>${escapeHTML(state.student.fullName)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding-bottom:0.5rem; border-bottom:1px dashed #E0DDD3;">
            <span style="color:var(--ink-secondary);">Student ID:</span>
            <strong class="mono">${escapeHTML(state.student.studentId)}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding-bottom:0.5rem; border-bottom:1px dashed #E0DDD3;">
            <span style="color:var(--ink-secondary);">University / Campus:</span>
            <span>${escapeHTML(state.student.university || 'State University Campus')}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding-bottom:0.5rem; border-bottom:1px dashed #E0DDD3;">
            <span style="color:var(--ink-secondary);">Degree Program:</span>
            <span>${escapeHTML(state.student.program || 'Undergraduate')}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding-bottom:0.5rem; border-bottom:1px dashed #E0DDD3;">
            <span style="color:var(--ink-secondary);">University Email:</span>
            <span class="mono">${escapeHTML(state.student.email)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding-bottom:0.5rem; border-bottom:1px dashed #E0DDD3;">
            <span style="color:var(--ink-secondary);">Security Recovery Token:</span>
            <strong class="mono" style="color:var(--emerald);">${escapeHTML(state.student.securityCode || 'PESO-4820')}</strong>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span style="color:var(--ink-secondary);">Budget Cycle:</span>
            <span class="mono">${escapeHTML(state.budget?.period || 'MONTHLY')}</span>
          </div>
        </div>

        <div style="margin-top:1.5rem; padding-top:1rem; border-top:var(--border-hairline); display:flex; gap:0.5rem; flex-wrap:wrap;">
          <button type="button" class="btn btn--danger" id="btn-auth-logout-alt">
            Sign Out to Landing Page
          </button>
        </div>
      </section>

      <!-- DATA CONTROLS & DEMO RESTORE -->
      <section class="ledger-card">
        <div class="card-header">
          <h2 class="card-title">Ledger Session Management</h2>
          <span class="mono" style="font-size:0.75rem; color:var(--ink-secondary);">
            ${state.meta?.isDemoMode ? 'Demo Session' : 'Student Account'}
          </span>
        </div>

        <p style="font-size:0.86rem; color:var(--ink-secondary); margin-bottom:1.15rem; line-height:1.5;">
          ${state.meta?.isDemoMode
            ? 'You are currently in Student Demo Mode with sample data. You can reset the sample data at any time or create your own personal account.'
            : 'Your transactions, wallet balances, and savings goals are saved securely to your personal account on this device.'}
        </p>

        <div style="display:flex; flex-direction:column; gap:0.75rem;">
          <button type="button" class="btn btn--emerald" data-open-install-share="true">
            Install on iOS &amp; Android / Send App to Friends
          </button>
          <button type="button" class="btn" data-open-db-modal="true">
            Inspect SQLite Database &amp; GitHub Sync
          </button>
          ${state.meta?.isDemoMode ? `
            <button type="button" class="btn" id="btn-reset-demo-state">
              Reset to Sample Demo Dataset
            </button>
          ` : ''}
          <button type="button" class="btn" data-nav-target="landing">
            View Public Landing Page
          </button>
        </div>
      </section>
    </div>
  `;
}


/**
 * PESO — Personal Expense & Spending Organizer
 * Main Application Controller, Event Delegation, Dialog Workflows & Accessibility Sync
 */







// ============================================================================
// MODERN WEB GUIDANCE COMPLIANCE UTILITIES
// 1. :user-invalid WeakMap Fallback & aria-invalid synchronization
// 2. <dialog closedby="any"> light-dismiss fallback for browsers without closedBy
// ============================================================================

const UserInvalidFallback = (() => {
  const dirtyState = new WeakMap();

  const updateState = (input) => {
    if (!input || typeof input.checkValidity !== 'function') return;
    const isValid = input.checkValidity();
    input.classList.toggle('user-invalid-fallback', !isValid);
    input.classList.toggle('user-valid-fallback', isValid);
    if (!isValid) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  };

  const handleEvent = (event) => {
    const input = event.target;
    if (event.type === 'reset') {
      const controls = input.elements || [];
      for (const control of controls) {
        dirtyState.delete(control);
        control.classList.remove('user-invalid-fallback', 'user-valid-fallback');
        control.removeAttribute('aria-invalid');
      }
      return;
    }
    if (!input || !input.checkValidity) return;

    if (event.type === 'input' || event.type === 'change') {
      const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      state.hasInteracted = true;
      dirtyState.set(input, state);
      if (state.hasBlurred) updateState(input);
    } else if (event.type === 'blur') {
      const state = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      state.hasBlurred = true;
      dirtyState.set(input, state);
      if (state.hasInteracted) updateState(input);
    }
  };

  const init = (root = document) => {
    // Sync aria-invalid with native :user-invalid state
    const syncAria = (el) => {
      if (!el || typeof el.matches !== 'function') return;
      try {
        if (CSS.supports('selector(:user-invalid)')) {
          el.setAttribute?.('aria-invalid', el.matches(':user-invalid') ? 'true' : 'false');
        }
      } catch {
        // Fallback handled below
      }
    };

    root.addEventListener('blur', (e) => syncAria(e.target), true);
    root.addEventListener('input', (e) => {
      if (e.target?.hasAttribute?.('aria-invalid')) syncAria(e.target);
    });

    if (typeof CSS !== 'undefined' && CSS.supports('selector(:user-invalid)')) return;
    root.addEventListener('blur', handleEvent, true);
    root.addEventListener('input', handleEvent);
    root.addEventListener('change', handleEvent);
    root.addEventListener('reset', handleEvent, true);
  };

  return { init };
})();

function attachDialogLightDismissFallback(dialog) {
  if (!dialog) return;
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (isDialogContent) return;
      dialog.close();
    });
  }
}

// ============================================================================
// MAIN APPLICATION CONTROLLER
// ============================================================================

class PesoApp {
  constructor() {
    this.store = new LedgerStore();
    const state = this.store.getState();
    this.activeModule = state.student.authenticated ? 'dashboard' : 'landing';
    this.activeAuthTab = 'register';
    this.expenseFilters = {
      search: '',
      category: 'ALL',
      sortBy: 'date_desc'
    };

    this.workspaceEl = document.getElementById('workspace-root');
    this.toastRegionEl = document.getElementById('toast-region');
    this.editExpenseDialog = document.getElementById('dialog-edit-expense');
    this.vaultDialog = document.getElementById('dialog-vault-action');
    this.quickLogDialog = document.getElementById('dialog-quick-log');
    this.presetsDialog = document.getElementById('dialog-customize-presets');
    this.installShareDialog = document.getElementById('dialog-install-share');
    this.dbGithubDialog = document.getElementById('dialog-db-github');
    this.deferredInstallPrompt = null;

    this.init();
  }

  init() {
    UserInvalidFallback.init(document);
    attachDialogLightDismissFallback(this.editExpenseDialog);
    attachDialogLightDismissFallback(this.vaultDialog);
    attachDialogLightDismissFallback(this.quickLogDialog);
    attachDialogLightDismissFallback(this.presetsDialog);
    attachDialogLightDismissFallback(this.installShareDialog);
    attachDialogLightDismissFallback(this.dbGithubDialog);

    // Register Offline-First Service Worker for iOS & Android PWA Installation
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // Capture Android / Chrome native PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
    });

    // Listen for cross-tab storage sync
    window.addEventListener('storage', () => {
      this.store.state = this.store.loadState();
      this.renderShellTelemetry();
      this.renderActiveModule();
    });

    this.store.subscribe(() => {
      this.renderShellTelemetry();
      this.renderActiveModule();
    });

    this.bindGlobalEvents();
    this.renderShellTelemetry();
    this.renderActiveModule();
  }

  showToast(message, variant = 'emerald') {
    if (!this.toastRegionEl) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${variant}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <div>${escapeHTML(message)}</div>
      <button type="button" class="btn btn--sm" style="padding:0.1rem 0.4rem; font-size:0.65rem;">Close</button>
    `;
    toast.querySelector('button').addEventListener('click', () => toast.remove());
    this.toastRegionEl.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 4500);
  }

  navigateTo(moduleId) {
    const state = this.store.getState();

    // Map 'auth' to account if logged in, or landing if logged out
    if (moduleId === 'auth') {
      moduleId = state.student.authenticated ? 'account' : 'landing';
    }

    if (!state.student.authenticated && moduleId !== 'landing') {
      this.activeModule = 'landing';
      this.activeAuthTab = 'register';
      this.showToast('Please create an account or sign in first to access the organizer.', 'warn');
    } else {
      this.activeModule = moduleId;
    }

    this.renderShellTelemetry();
    this.renderActiveModule();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderShellTelemetry() {
    const state = this.store.getState();
    const metrics = this.store.getMetrics();
    const isLanding = this.activeModule === 'landing';

    // Toggle body class for styling (hides in-app navs on landing page)
    document.body.classList.toggle('on-landing', isLanding);

    // Update both Desktop and Mobile Navigation Bar active states
    const navButtons = document.querySelectorAll('.module-nav__btn, .mobile-nav-btn');
    navButtons.forEach((btn) => {
      const mod = btn.getAttribute('data-module');
      if (mod === this.activeModule || (mod === 'account' && this.activeModule === 'account')) {
        btn.setAttribute('aria-current', 'page');
      } else {
        btn.removeAttribute('aria-current');
      }
    });

    const budgetDotEl = document.getElementById('nav-dot-budget');
    if (budgetDotEl) {
      const hasAlerts = metrics.activeAlerts.length > 0;
      budgetDotEl.style.display = hasAlerts ? 'inline-block' : 'none';
    }

    // Dynamically render top header actions
    const headerActionsEl = document.getElementById('header-actions');
    if (headerActionsEl) {
      const dbStatus = this.store.getDatabaseStatus();
      const dbLabel = dbStatus.connected ? 'DB Synced' : 'SQLite DB';

      if (isLanding) {
        if (state.student.authenticated) {
          headerActionsEl.innerHTML = `
            <button type="button" class="btn btn--sm desktop-only-header-btn" id="header-btn-db-status" title="Inspect SQLite Database & GitHub Sync">
              ${dbLabel}
            </button>
            <button type="button" class="btn btn--sm" id="header-btn-install-share" title="Install on iOS/Android or Share with Friends">
              Share App
            </button>
            <button type="button" class="btn btn--sm btn--primary" data-nav-target="dashboard">
              Dashboard
            </button>
            <button type="button" class="btn btn--sm btn--danger" id="header-btn-logout" title="Sign Out">
              Sign Out
            </button>
          `;
        } else {
          headerActionsEl.innerHTML = `
            <button type="button" class="btn btn--sm desktop-only-header-btn" id="header-btn-db-status" title="Inspect SQLite Database & GitHub Sync">
              ${dbLabel}
            </button>
            <button type="button" class="btn btn--sm" id="header-btn-install-share" title="Install on iOS/Android or Share with Friends">
              Share App
            </button>
            <button type="button" class="btn btn--sm btn--emerald" id="header-btn-demo-mode">
              Demo
            </button>
            <button type="button" class="btn btn--sm btn--primary" id="header-btn-sign-in">
              Sign In
            </button>
          `;
        }
      } else {
        const isDemo = Boolean(state.meta?.isDemoMode);
        headerActionsEl.innerHTML = `
          <button type="button" class="btn btn--sm desktop-only-header-btn" id="header-btn-db-status" title="Inspect SQLite Database & GitHub Sync">
            ${dbLabel}
          </button>
          <button type="button" class="btn btn--sm" id="header-btn-install-share" title="Install on iOS/Android or Share with Friends">
            Share App
          </button>
          <button type="button" class="btn btn--sm mobile-only-account-btn ${this.activeModule === 'account' ? 'btn--primary' : ''}" data-nav-target="account">
            Account
          </button>
          ${isDemo ? `
            <button type="button" class="btn btn--sm desktop-only-header-btn" id="header-btn-reset-demo" title="Reset sample student data">
              Reset Demo
            </button>
          ` : ''}
          <button type="button" class="btn btn--sm btn--danger" id="header-btn-logout" title="Sign Out">
            Sign Out
          </button>
        `;
      }
    }
  }

  renderActiveModule() {
    if (!this.workspaceEl) return;
    const state = this.store.getState();
    const metrics = this.store.getMetrics();

    if (!state.student.authenticated && this.activeModule !== 'landing') {
      this.activeModule = 'landing';
    }

    let html = '';
    switch (this.activeModule) {
      case 'landing':
        html = renderLandingPage(state, this.activeAuthTab);
        break;
      case 'dashboard':
        html = renderDashboardModule(state, metrics);
        break;
      case 'account':
        html = renderAccountModule(state, metrics);
        break;
      case 'auth':
        html = state.student.authenticated ? renderAccountModule(state, metrics) : renderLandingPage(state, this.activeAuthTab);
        break;
      case 'balance':
        html = renderBalanceModule(state, metrics);
        break;
      case 'expenses':
        html = renderExpensesModule(state, metrics, this.expenseFilters);
        break;
      case 'budget':
        html = renderBudgetModule(state, metrics);
        break;
      case 'savings':
        html = renderSavingsModule(state, metrics);
        break;
      case 'reports':
        html = renderReportsModule(state, metrics);
        break;
      default:
        html = state.student.authenticated ? renderDashboardModule(state, metrics) : renderLandingPage(state, this.activeAuthTab);
    }

    this.workspaceEl.innerHTML = html;
    this.bindModuleControls();
  }

  bindGlobalEvents() {
    // Brand header click
    const brandLink = document.getElementById('brand-header-link');
    if (brandLink) {
      brandLink.addEventListener('click', (e) => {
        e.preventDefault();
        const state = this.store.getState();
        this.navigateTo(state.student.authenticated ? 'dashboard' : 'landing');
      });
    }

    // Module Navigation Bar clicks (Desktop & Mobile Bottom Nav)
    document.querySelectorAll('.module-nav__btn, .mobile-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-module');
        if (target) this.navigateTo(target);
      });
    });

    // Delegated clicks inside header actions
    const headerActionsEl = document.getElementById('header-actions');
    if (headerActionsEl) {
      headerActionsEl.addEventListener('click', (e) => {
        const dbBtn = e.target.closest('#header-btn-db-status');
        if (dbBtn) {
          this.openDbGithubModal();
          return;
        }

        const installShareBtn = e.target.closest('#header-btn-install-share');
        if (installShareBtn) {
          this.openInstallShareModal();
          return;
        }

        const demoBtn = e.target.closest('#header-btn-demo-mode');
        if (demoBtn) {
          const res = this.store.enterDemoMode();
          this.navigateTo('dashboard');
          this.showToast(res.message, 'emerald');
          return;
        }

        const signInBtn = e.target.closest('#header-btn-sign-in');
        if (signInBtn) {
          this.activeModule = 'landing';
          this.activeAuthTab = 'login';
          this.renderShellTelemetry();
          this.renderActiveModule();
          const formEl = document.getElementById('form-student-login');
          if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
          return;
        }

        const resetBtn = e.target.closest('#header-btn-reset-demo');
        if (resetBtn) {
          const res = this.store.resetDemoData();
          this.showToast(res.message, 'emerald');
          return;
        }

        const logoutBtn = e.target.closest('#header-btn-logout');
        if (logoutBtn) {
          const res = this.store.logout();
          this.navigateTo('landing');
          this.showToast(res.message, 'warn');
          return;
        }

        const navTarget = e.target.closest('[data-nav-target]');
        if (navTarget) {
          this.navigateTo(navTarget.getAttribute('data-nav-target'));
          return;
        }
      });
    }

    // Delegated clicks inside workspace
    this.workspaceEl.addEventListener('click', (e) => {
      const openInstallBtn = e.target.closest('[data-open-install-share]');
      if (openInstallBtn) {
        this.openInstallShareModal();
        return;
      }

      const openDbBtn = e.target.closest('[data-open-db-modal]');
      if (openDbBtn) {
        this.openDbGithubModal();
        return;
      }

      const landingDemoBtn = e.target.closest('#btn-landing-enter-demo');
      if (landingDemoBtn) {
        const res = this.store.enterDemoMode();
        this.navigateTo('dashboard');
        this.showToast(res.message, 'emerald');
        return;
      }

      const logoutBtn = e.target.closest('#btn-auth-logout, #btn-auth-logout-alt');
      if (logoutBtn) {
        const res = this.store.logout();
        this.navigateTo('landing');
        this.showToast(res.message, 'warn');
        return;
      }

      const openQuickLogBtn = e.target.closest('#btn-open-quick-log-modal');
      if (openQuickLogBtn && this.quickLogDialog) {
        const dateEl = document.getElementById('ql-date');
        if (dateEl) dateEl.value = new Date().toISOString().slice(0, 10);
        this.quickLogDialog.showModal();
        return;
      }

      const openEditPresetsBtn = e.target.closest('#btn-open-edit-presets, #btn-open-edit-presets-exp, .btn-open-edit-presets');
      if (openEditPresetsBtn) {
        this.openCustomizePresetsModal();
        return;
      }

      const presetBtn = e.target.closest('[data-preset-idx]');
      if (presetBtn) {
        const idx = Number(presetBtn.getAttribute('data-preset-idx'));
        const formId = presetBtn.getAttribute('data-target-form');
        const presets = this.store.getQuickPresets();
        const preset = presets[idx];
        const formEl = document.getElementById(formId);
        if (preset && formEl) {
          formEl.elements.title.value = preset.title;
          formEl.elements.amount.value = Number(preset.amount).toFixed(2);
          formEl.elements.category.value = preset.category;
          if (formEl.elements.wallet) formEl.elements.wallet.value = 'cash';
          formEl.elements.amount.focus();
        }
        return;
      }

      const cyclePresetBtn = e.target.closest('[data-cycle-preset]');
      if (cyclePresetBtn) {
        const cycle = cyclePresetBtn.getAttribute('data-cycle-preset');
        const days = Number(cyclePresetBtn.getAttribute('data-cycle-days')) || 30;
        const now = new Date();
        const startStr = now.toISOString().slice(0, 10);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days - 1);
        const endStr = end.toISOString().slice(0, 10);
        const periodEl = document.getElementById('bdg-period');
        const startEl = document.getElementById('bdg-start');
        const endEl = document.getElementById('bdg-end');
        if (periodEl) periodEl.value = cycle;
        if (startEl) startEl.value = startStr;
        if (endEl) endEl.value = endStr;
        this.showToast(`Preset set to ${cycle.toLowerCase()} (${days} days). Click "Save Overall Budget" to apply.`, 'emerald');
        return;
      }

      const quickSaveBtn = e.target.closest('[data-quick-save-goal]');
      if (quickSaveBtn) {
        const goalId = quickSaveBtn.getAttribute('data-quick-save-goal');
        const amt = Number(quickSaveBtn.getAttribute('data-quick-save-amt'));
        const res = this.store.allocateToGoal(goalId, {
          amount: amt,
          wallet: 'cash',
          note: `Quick save +₱${amt}`
        });
        this.showToast(res.ok ? res.message : res.error, res.ok ? 'emerald' : 'error');
        return;
      }

      const navTargetBtn = e.target.closest('[data-nav-target]');
      if (navTargetBtn) {
        this.navigateTo(navTargetBtn.getAttribute('data-nav-target'));
        return;
      }

      const authTabBtn = e.target.closest('[data-auth-tab]');
      if (authTabBtn) {
        this.activeAuthTab = authTabBtn.getAttribute('data-auth-tab');
        this.renderActiveModule();
        return;
      }

      const delInflowBtn = e.target.closest('[data-delete-inflow]');
      if (delInflowBtn) {
        const res = this.store.deleteInflow(delInflowBtn.getAttribute('data-delete-inflow'));
        this.showToast(res.ok ? res.message : res.error, res.ok ? 'warn' : 'error');
        return;
      }

      const editExpBtn = e.target.closest('[data-edit-expense]');
      if (editExpBtn) {
        this.openEditExpenseModal(editExpBtn.getAttribute('data-edit-expense'));
        return;
      }

      const delExpBtn = e.target.closest('[data-delete-expense]');
      if (delExpBtn) {
        const res = this.store.deleteExpense(delExpBtn.getAttribute('data-delete-expense'));
        this.showToast(res.ok ? res.message : res.error, res.ok ? 'warn' : 'error');
        return;
      }

      const allocBtn = e.target.closest('[data-vault-allocate]');
      if (allocBtn) {
        this.openVaultModal(allocBtn.getAttribute('data-vault-allocate'), 'ALLOCATE');
        return;
      }

      const withdrawBtn = e.target.closest('[data-vault-withdraw]');
      if (withdrawBtn) {
        this.openVaultModal(withdrawBtn.getAttribute('data-vault-withdraw'), 'WITHDRAW');
        return;
      }

      const editGoalBtn = e.target.closest('[data-vault-edit]');
      if (editGoalBtn) {
        this.openVaultModal(editGoalBtn.getAttribute('data-vault-edit'), 'EDIT');
        return;
      }

      const delGoalBtn = e.target.closest('[data-vault-delete]');
      if (delGoalBtn) {
        const res = this.store.deleteSavingsGoal(delGoalBtn.getAttribute('data-vault-delete'));
        this.showToast(res.ok ? res.message : res.error, res.ok ? 'warn' : 'error');
      }
    });

    // Edit Expense Modal Form Submission
    const editExpForm = document.getElementById('form-modal-edit-expense');
    if (editExpForm) {
      editExpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(editExpForm);
        const expId = fd.get('expenseId');
        const res = this.store.updateExpense(expId, {
          title: fd.get('title'),
          amount: fd.get('amount'),
          date: fd.get('date'),
          category: fd.get('category'),
          wallet: fd.get('wallet'),
          merchantOrNote: fd.get('merchantOrNote')
        });
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        this.editExpenseDialog.close();
        this.showToast(res.message, 'emerald');
      });
    }

    // Vault Action Modal Form Submission
    const vaultForm = document.getElementById('form-modal-vault-action');
    if (vaultForm) {
      vaultForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(vaultForm);
        const goalId = fd.get('goalId');
        const mode = fd.get('mode');
        let res;
        if (mode === 'ALLOCATE') {
          res = this.store.allocateToGoal(goalId, {
            amount: fd.get('amount'),
            wallet: fd.get('wallet'),
            note: fd.get('note')
          });
        } else if (mode === 'WITHDRAW') {
          res = this.store.withdrawFromGoal(goalId, {
            amount: fd.get('amount'),
            wallet: fd.get('wallet'),
            note: fd.get('note')
          });
        } else {
          res = this.store.updateSavingsGoal(goalId, {
            name: fd.get('name'),
            targetAmount: fd.get('targetAmount'),
            deadline: fd.get('deadline'),
            priority: fd.get('priority'),
            notes: fd.get('notes')
          });
        }

        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        this.vaultDialog.close();
        this.showToast(res.message, 'emerald');
      });
    }

    // Quick Log Expense Modal Form Submission
    const quickLogModalForm = document.getElementById('form-modal-quick-log');
    if (quickLogModalForm) {
      quickLogModalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(quickLogModalForm);
        const res = this.store.addExpense({
          title: fd.get('title'),
          amount: fd.get('amount'),
          date: fd.get('date'),
          category: fd.get('category'),
          wallet: fd.get('wallet'),
          merchantOrNote: ''
        });
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        quickLogModalForm.reset();
        this.quickLogDialog.close();
        this.showToast(res.message, 'emerald');
      });
    }

    // Customize Quick Fill Presets Modal Form Submission
    const editPresetsForm = document.getElementById('form-modal-edit-presets');
    if (editPresetsForm) {
      editPresetsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const rows = document.querySelectorAll('#presets-editor-container .preset-editor-row');
        const newPresets = [];
        rows.forEach((row) => {
          const title = row.querySelector('[name="row_title"]')?.value;
          const amount = row.querySelector('[name="row_amount"]')?.value;
          const category = row.querySelector('[name="row_category"]')?.value;
          const wallet = row.querySelector('[name="row_wallet"]')?.value;
          if (title && amount) {
            newPresets.push({
              title: title.trim(),
              amount: Number(amount) || 10,
              category: category || 'food',
              wallet: wallet || 'cash',
              label: `${title.trim()} (₱${Number(amount || 0).toFixed(0)})`
            });
          }
        });

        const res = this.store.updateQuickPresets(newPresets);
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        if (this.presetsDialog) this.presetsDialog.close();
        this.showToast(res.message, 'emerald');
        this.renderActiveModule();
      });
    }

    const addPresetRowBtn = document.getElementById('btn-add-preset-row');
    if (addPresetRowBtn) {
      addPresetRowBtn.addEventListener('click', () => {
        const container = document.getElementById('presets-editor-container');
        if (!container) return;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.renderPresetEditorRow({
          title: 'Campus Expense',
          amount: 50,
          category: 'food',
          wallet: 'cash'
        });
        const newRow = tempDiv.firstElementChild;
        container.appendChild(newRow);
        newRow.querySelector('input')?.focus();
      });
    }

    const restoreDefaultsBtn = document.getElementById('btn-restore-default-presets');
    if (restoreDefaultsBtn) {
      restoreDefaultsBtn.addEventListener('click', () => {
        const res = this.store.resetQuickPresets();
        const container = document.getElementById('presets-editor-container');
        if (container) {
          const presets = this.store.getQuickPresets();
          container.innerHTML = presets.map((p, idx) => this.renderPresetEditorRow(p, idx)).join('');
        }
        this.showToast(res.message, 'emerald');
        this.renderActiveModule();
      });
    }

    const presetsContainer = document.getElementById('presets-editor-container');
    if (presetsContainer) {
      presetsContainer.addEventListener('click', (e) => {
        const delRowBtn = e.target.closest('.btn-remove-preset-row');
        if (delRowBtn) {
          const row = delRowBtn.closest('.preset-editor-row');
          const allRows = presetsContainer.querySelectorAll('.preset-editor-row');
          if (allRows.length <= 1) {
            this.showToast('Please keep at least one Quick Fill shortcut.', 'warn');
            return;
          }
          if (row) row.remove();
        }
      });
    }

    const forceSyncBtn = document.getElementById('btn-force-db-sync');
    if (forceSyncBtn) {
      forceSyncBtn.addEventListener('click', async () => {
        await this.store.syncToDatabase(this.store.getState());
        await this.store.checkDatabaseConnection();
        this.renderDbGithubModalBody();
        this.showToast('Synchronized current student ledger to SQLite database (data/peso.sqlite).', 'emerald');
      });
    }

    // Modal close buttons
    document.querySelectorAll('[data-close-dialog]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dlg = btn.closest('dialog');
        if (dlg) dlg.close();
      });
    });
  }

  async openInstallShareModal() {
    if (!this.installShareDialog) return;
    await this.store.checkDatabaseConnection();
    const dbStatus = this.store.getDatabaseStatus();
    const shareUrl = dbStatus.lanUrl || window.location.origin;
    const qrSvg = renderQrCodeSvg(shareUrl, 164);

    const bodyEl = document.getElementById('install-share-modal-body');
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:1.15rem;">
          <!-- SHARE WITH FRIENDS & QR CODE -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(230px, 1fr)); gap:1rem; padding:1rem; background:var(--bg-vellum); border:var(--border-hairline);">
            <div>
              <span class="status-badge status-badge--nominal" style="margin-bottom:0.45rem;">Send to Friends (iOS &amp; Android)</span>
              <h3 style="font-family:var(--font-display); font-size:1rem; margin-bottom:0.35rem;">Share Link or Scan QR Code</h3>
              <p style="font-size:0.82rem; color:var(--ink-secondary); margin-bottom:0.75rem; line-height:1.45;">
                Send this link to your friends on Messenger, Telegram, iMessage, or let them scan the QR code with their phone camera to install PESO.
              </p>

              <div class="field" style="margin-bottom:0.6rem;">
                <label for="share-app-url-input" style="font-size:0.74rem;">Shareable App Link</label>
                <input type="text" id="share-app-url-input" value="${escapeHTML(shareUrl)}" readonly style="font-family:var(--font-mono); font-size:0.8rem; background:#FFFFFF;">
              </div>

              <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                <button type="button" class="btn btn--sm btn--emerald" id="btn-native-share-app">
                  Send to Friends
                </button>
                <button type="button" class="btn btn--sm btn--primary" id="btn-copy-app-link">
                  Copy Link
                </button>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0.75rem; background:#FFFFFF; border:var(--border-hairline);">
              ${qrSvg}
              <span class="mono" style="font-size:0.72rem; color:var(--ink-secondary); margin-top:0.45rem;">
                Scan with iOS or Android Camera
              </span>
            </div>
          </div>

          <!-- INSTALL INSTRUCTIONS FOR ANDROID & iOS -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1rem;">
            <!-- ANDROID INSTALL -->
            <div style="padding:1rem; border:var(--border-hairline); background:#FFFFFF;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                <strong style="font-family:var(--font-display); font-size:0.95rem;">Install on Android</strong>
                <span class="status-badge status-badge--nominal">Chrome / APK</span>
              </div>
              <ol style="font-size:0.82rem; color:var(--ink-secondary); padding-left:1.15rem; margin-bottom:0.85rem; line-height:1.55;">
                <li>Tap <strong>"Install App Now"</strong> below (or open the browser menu in Chrome).</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                <li>PESO launches full-screen from your Android app drawer and works offline.</li>
              </ol>
              <button type="button" class="btn btn--sm btn--emerald btn--block" id="btn-trigger-pwa-install">
                Install App on Device
              </button>
            </div>

            <!-- iOS INSTALL -->
            <div style="padding:1rem; border:var(--border-hairline); background:#FFFFFF;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                <strong style="font-family:var(--font-display); font-size:0.95rem;">Install on iPhone / iPad (iOS)</strong>
                <span class="status-badge status-badge--neutral">Safari iOS</span>
              </div>
              <ol style="font-size:0.82rem; color:var(--ink-secondary); padding-left:1.15rem; margin-bottom:0; line-height:1.55;">
                <li>Open this link in <strong>Safari</strong> on your iPhone or iPad.</li>
                <li>Tap the <strong>Share</strong> button at the bottom bar of Safari.</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong>, then tap <strong>"Add"</strong>.</li>
                <li>Open PESO directly from your iOS Home Screen like a native app.</li>
              </ol>
            </div>
          </div>

          <!-- CAPACITOR NATIVE BUILD COMMANDS -->
          <div style="padding:0.85rem 1rem; background:var(--bg-vellum); border:var(--border-hairline); font-size:0.8rem;">
            <strong>Native Mobile Packaging (Capacitor iOS &amp; Android + React):</strong>
            <div class="mono" style="margin-top:0.35rem; font-size:0.75rem; color:var(--ink-secondary);">
              npm run build &amp;&amp; npm run cap:sync | npm run cap:android | npm run cap:ios
            </div>
          </div>
        </div>
      `;

      const copyBtn = document.getElementById('btn-copy-app-link');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(shareUrl);
            this.showToast(`Copied app link (${shareUrl})! Send it to your friends.`, 'emerald');
          } catch {
            const input = document.getElementById('share-app-url-input');
            if (input) {
              input.select();
              document.execCommand('copy');
              this.showToast('Copied app link to clipboard!', 'emerald');
            }
          }
        });
      }

      const shareBtn = document.getElementById('btn-native-share-app');
      if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
          const shareData = {
            title: 'PESO — Student Cash & Allowance App',
            text: 'Track your student cash allowance, daily safe-to-spend limit, and savings goals on PESO:',
            url: shareUrl
          };
          if (navigator.share) {
            try {
              await navigator.share(shareData);
              this.showToast('Shared PESO app link!', 'emerald');
              return;
            } catch {
              // User cancelled native share sheet
            }
          }
          try {
            await navigator.clipboard.writeText(shareUrl);
            this.showToast('Link copied! Paste it in Messenger, Telegram, or iMessage to send to friends.', 'emerald');
          } catch {
            this.showToast(`Share this link with friends: ${shareUrl}`, 'emerald');
          }
        });
      }

      const installBtn = document.getElementById('btn-trigger-pwa-install');
      if (installBtn) {
        installBtn.addEventListener('click', async () => {
          if (this.deferredInstallPrompt) {
            this.deferredInstallPrompt.prompt();
            await this.deferredInstallPrompt.userChoice;
            this.deferredInstallPrompt = null;
            this.showToast('Installation prompt opened!', 'emerald');
          } else {
            this.showToast('To install: open your browser menu (three dots or Safari Share button) and tap "Add to Home Screen" or "Install App".', 'emerald');
          }
        });
      }
    }

    this.installShareDialog.showModal();
  }

  async openDbGithubModal() {
    if (!this.dbGithubDialog) return;
    await this.store.checkDatabaseConnection();
    this.renderDbGithubModalBody();
    this.dbGithubDialog.showModal();
  }

  renderDbGithubModalBody() {
    const bodyEl = document.getElementById('db-github-modal-body');
    if (!bodyEl) return;
    const dbStatus = this.store.getDatabaseStatus();
    const accounts = dbStatus.accounts || [];

    bodyEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.15rem;">
        <!-- SQLITE DATABASE TELEMETRY -->
        <div style="padding:1rem; background:var(--bg-vellum); border:var(--border-hairline);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.75rem;">
            <div>
              <strong style="font-family:var(--font-display); font-size:0.98rem;">Relational SQLite Database Status</strong>
              <div class="mono" style="font-size:0.76rem; color:var(--ink-secondary);">
                Engine: ${escapeHTML(dbStatus.engine)} | File: ${escapeHTML(dbStatus.databaseFile)}
              </div>
            </div>
            <span class="status-badge ${dbStatus.connected ? 'status-badge--nominal' : 'status-badge--caution'}">
              ${dbStatus.connected ? 'SQLite Server Connected' : 'Offline Local Cache Active'}
            </span>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:0.65rem;">
            <div style="padding:0.65rem; background:#FFFFFF; border:var(--border-hairline);">
              <div style="font-size:0.72rem; color:var(--ink-secondary);">Student Accounts</div>
              <div class="mono" style="font-size:1.15rem; font-weight:800;">${dbStatus.counts?.users ?? 1}</div>
            </div>
            <div style="padding:0.65rem; background:#FFFFFF; border:var(--border-hairline);">
              <div style="font-size:0.72rem; color:var(--ink-secondary);">Cash Transactions</div>
              <div class="mono" style="font-size:1.15rem; font-weight:800;">${dbStatus.counts?.transactions ?? 0}</div>
            </div>
            <div style="padding:0.65rem; background:#FFFFFF; border:var(--border-hairline);">
              <div style="font-size:0.72rem; color:var(--ink-secondary);">Savings Vaults</div>
              <div class="mono" style="font-size:1.15rem; font-weight:800;">${dbStatus.counts?.savingsGoals ?? 0}</div>
            </div>
            <div style="padding:0.65rem; background:#FFFFFF; border:var(--border-hairline);">
              <div style="font-size:0.72rem; color:var(--ink-secondary);">Audit Log Rows</div>
              <div class="mono" style="font-size:1.15rem; font-weight:800;">${dbStatus.counts?.auditLogs ?? 0}</div>
            </div>
          </div>

          ${accounts.length > 0 ? `
            <div style="margin-top:0.85rem;">
              <div style="font-size:0.76rem; font-weight:700; margin-bottom:0.35rem;">Stored Student Ledgers in SQLite (users + ledgers tables):</div>
              <div class="table-wrapper" style="max-height:160px; overflow-y:auto; background:#FFFFFF; border:var(--border-hairline);">
                <table class="ledger-table" style="--label-2:'Email'; --label-3:'Spendable Cash'; --label-4:'Savings';">
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">Email</th>
                      <th scope="col" class="num-col">Spendable Cash</th>
                      <th scope="col" class="num-col">Locked Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${accounts.map((acc) => `
                      <tr>
                        <th scope="row">${escapeHTML(acc.fullName)}</th>
                        <td class="mono" style="font-size:0.76rem;">${escapeHTML(acc.email)}</td>
                        <td class="num-col currency" style="color:var(--emerald); font-weight:700;">${formatPHP(acc.spendableBalance || 0)}</td>
                        <td class="num-col currency">${formatPHP(acc.lockedSavings || 0)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- GITHUB PUSH & AUTO-DEPLOY WORKFLOW -->
        <div style="padding:1rem; background:#FFFFFF; border:var(--border-hairline);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <strong style="font-family:var(--font-display); font-size:0.95rem;">GitHub Repository Push &amp; Auto-Deploy</strong>
            <span class="status-badge status-badge--nominal">Git Main Branch Ready</span>
          </div>
          <p style="font-size:0.82rem; color:var(--ink-secondary); margin-bottom:0.75rem; line-height:1.45;">
            Your project is initialized with Git, React + Vite, Capacitor (iOS/Android), and a GitHub Actions workflow (<code>.github/workflows/deploy.yml</code>) that automatically builds and publishes updates when you push.
          </p>
          <div style="display:flex; flex-direction:column; gap:0.5rem; font-size:0.78rem;">
            <div style="padding:0.55rem 0.75rem; background:var(--bg-vellum); border:var(--border-hairline);" class="mono">
              1. First time connecting your GitHub repo URL:<br>
              <strong>npm run github:push -- --repo https://github.com/YOUR_USERNAME/peso-app.git</strong>
            </div>
            <div style="padding:0.55rem 0.75rem; background:var(--bg-vellum); border:var(--border-hairline);" class="mono">
              2. Whenever you have changes and updates to push:<br>
              <strong>npm run github:push -- "Updated allowance features"</strong>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindModuleControls() {
    // Module 1: Quick-Log Expense Form
    const quickExpForm = document.getElementById('dashboard-quick-expense-form');
    if (quickExpForm) {
      quickExpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(quickExpForm);
        const res = this.store.addExpense({
          title: fd.get('title'),
          amount: fd.get('amount'),
          date: fd.get('date'),
          category: fd.get('category'),
          wallet: fd.get('wallet'),
          merchantOrNote: fd.get('merchantOrNote')
        });
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        quickExpForm.reset();
        this.showToast(res.message, 'emerald');
      });
    }

    // Module 2: Auth Controls
    const demoToggleBtn = document.getElementById('btn-auth-demo-toggle');
    if (demoToggleBtn) {
      demoToggleBtn.addEventListener('click', () => {
        const res = this.store.enterDemoMode();
        this.navigateTo('dashboard');
        this.showToast(res.message, 'emerald');
      });
    }

    const instantDemoBtn = document.getElementById('btn-login-instant-demo');
    if (instantDemoBtn) {
      instantDemoBtn.addEventListener('click', () => {
        const res = this.store.enterDemoMode();
        this.navigateTo('dashboard');
        this.showToast(res.message, 'emerald');
      });
    }

    const logoutBtn = document.getElementById('btn-auth-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        const res = this.store.logout();
        this.navigateTo('landing');
        this.showToast(res.message, 'warn');
      });
    }

    const logoutAltBtn = document.getElementById('btn-auth-logout-alt');
    if (logoutAltBtn) {
      logoutAltBtn.addEventListener('click', () => {
        const res = this.store.logout();
        this.navigateTo('landing');
        this.showToast(res.message, 'warn');
      });
    }

    const fillDemoBtn = document.getElementById('btn-fill-demo-creds');
    if (fillDemoBtn) {
      fillDemoBtn.addEventListener('click', () => {
        this.activeAuthTab = 'login';
        this.renderActiveModule();
        this.showToast('Demo Student credentials pre-filled in Sign-In form.', 'emerald');
      });
    }

    const resetDemoBtn = document.getElementById('btn-reset-demo-state');
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', () => {
        const res = this.store.resetDemoData();
        this.showToast(res.message, 'emerald');
      });
    }

    const togglePwBtn = document.getElementById('btn-toggle-login-pw');
    if (togglePwBtn) {
      togglePwBtn.addEventListener('click', () => {
        const pwInput = document.getElementById('current-password');
        if (!pwInput) return;
        const isPw = pwInput.type === 'password';
        pwInput.type = isPw ? 'text' : 'password';
        togglePwBtn.textContent = isPw ? 'Hide Password' : 'Show Password';
      });
    }

    const loginForm = document.getElementById('form-student-login');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(loginForm);
        const res = this.store.login(fd.get('identifier'), fd.get('password'));
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        this.showToast(res.message, 'emerald');
        this.navigateTo('dashboard');
      });
    }

    const registerForm = document.getElementById('form-student-register');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(registerForm);
        const res = this.store.registerStudent(Object.fromEntries(fd.entries()));
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        this.showToast(res.message, 'emerald');
        this.navigateTo('dashboard');
      });
    }

    const resetPwForm = document.getElementById('form-password-reset');
    if (resetPwForm) {
      resetPwForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(resetPwForm);
        const res = this.store.verifyAndResetPassword({
          identifier: fd.get('identifier'),
          securityCode: fd.get('securityCode'),
          newPassword: fd.get('newPassword')
        });
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        this.showToast(res.message, 'emerald');
        this.activeAuthTab = 'login';
        this.renderActiveModule();
      });
    }

    // Module 3: Balance Management Forms
    const addInflowForm = document.getElementById('form-add-inflow');
    if (addInflowForm) {
      addInflowForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(addInflowForm);
        const res = this.store.addInflow({
          type: fd.get('type'),
          wallet: fd.get('wallet'),
          amount: fd.get('amount'),
          date: fd.get('date'),
          description: fd.get('description')
        });
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        this.showToast(res.message, 'emerald');
      });
    }

    const initBalForm = document.getElementById('form-input-initial-balance');
    if (initBalForm) {
      initBalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(initBalForm);
        const res = this.store.setInitialBalance({
          cash: fd.get('cash'),
          ewallet: fd.get('ewallet'),
          bank: fd.get('bank'),
          date: fd.get('date'),
          note: fd.get('note')
        });
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        this.showToast(res.message, 'emerald');
      });
    }

    // Quick Wallet Sync Forms
    document.querySelectorAll('.form-quick-wallet-sync').forEach((syncForm) => {
      syncForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const wallet = syncForm.getAttribute('data-sync-wallet');
        const fd = new FormData(syncForm);
        const res = this.store.reconcileWalletToTarget({
          wallet,
          targetSpendable: fd.get('targetSpendable')
        });
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        this.showToast(res.message, 'emerald');
      });
    });

    // Module 4: Log Expense & Filter Controls
    const logExpForm = document.getElementById('form-log-expense');
    if (logExpForm) {
      logExpForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(logExpForm);
        const res = this.store.addExpense({
          title: fd.get('title'),
          amount: fd.get('amount'),
          date: fd.get('date'),
          category: fd.get('category'),
          wallet: fd.get('wallet'),
          merchantOrNote: fd.get('merchantOrNote')
        });
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        this.showToast(res.message, 'emerald');
      });
    }

    const fltSearch = document.getElementById('flt-search');
    const fltCategory = document.getElementById('flt-category');
    const fltSort = document.getElementById('flt-sort');

    if (fltSearch) {
      fltSearch.addEventListener('input', (e) => {
        this.expenseFilters.search = e.target.value;
        const pos = e.target.selectionStart;
        this.renderActiveModule();
        const nextInput = document.getElementById('flt-search');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(pos, pos);
        }
      });
    }
    if (fltCategory) {
      fltCategory.addEventListener('change', (e) => {
        this.expenseFilters.category = e.target.value;
        this.renderActiveModule();
      });
    }
    if (fltSort) {
      fltSort.addEventListener('change', (e) => {
        this.expenseFilters.sortBy = e.target.value;
        this.renderActiveModule();
      });
    }

    // Module 5: Global Budget & Category Limits Forms
    const globalBdgForm = document.getElementById('form-global-budget');
    if (globalBdgForm) {
      globalBdgForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(globalBdgForm);
        const res = this.store.updateGlobalBudget({
          period: fd.get('period'),
          totalBudget: fd.get('totalBudget'),
          periodStart: fd.get('periodStart'),
          periodEnd: fd.get('periodEnd')
        });
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        this.showToast(res.warning || res.message, res.warning ? 'warn' : 'emerald');
      });
    }

    const catLimitsForm = document.getElementById('form-category-limits');
    if (catLimitsForm) {
      catLimitsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(catLimitsForm);
        const limits = {};
        for (const cat of EXPENSE_CATEGORIES) {
          limits[cat.id] = fd.get(cat.id);
        }
        const res = this.store.updateCategoryLimits(limits);
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        this.showToast(res.warning || res.message, res.warning ? 'warn' : 'emerald');
      });
    }

    const handleAutoFit = () => {
      const state = this.store.getState();
      const metrics = this.store.getMetrics();
      const total = metrics.totalBudget;
      const curSum = metrics.sumCategoryLimits;
      const nextLimits = {};
      if (curSum > 0) {
        let running = 0;
        EXPENSE_CATEGORIES.forEach((cat, idx) => {
          if (idx === EXPENSE_CATEGORIES.length - 1) {
            nextLimits[cat.id] = roundCurrency(Math.max(0, total - running));
          } else {
            const share = roundCurrency(((state.budget.categoryLimits[cat.id] || 0) / curSum) * total);
            nextLimits[cat.id] = share;
            running += share;
          }
        });
      } else {
        EXPENSE_CATEGORIES.forEach((cat) => {
          nextLimits[cat.id] = roundCurrency(total / EXPENSE_CATEGORIES.length);
        });
      }
      const res = this.store.updateCategoryLimits(nextLimits);
      this.showToast(res.message, 'emerald');
    };

    const autoFitBtn1 = document.getElementById('btn-autofit-limits');
    const autoFitBtn2 = document.getElementById('btn-autofit-limits-2');
    if (autoFitBtn1) autoFitBtn1.addEventListener('click', handleAutoFit);
    if (autoFitBtn2) autoFitBtn2.addEventListener('click', handleAutoFit);

    // Module 6: Create Savings Goal Form
    const createGoalForm = document.getElementById('form-create-savings-goal');
    if (createGoalForm) {
      createGoalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const fd = new FormData(createGoalForm);
        const res = this.store.createSavingsGoal({
          name: fd.get('name'),
          targetAmount: fd.get('targetAmount'),
          initialAllocation: fd.get('initialAllocation'),
          wallet: fd.get('wallet'),
          deadline: fd.get('deadline'),
          priority: fd.get('priority'),
          notes: fd.get('notes')
        });
        if (!res.ok) {
          this.showToast(res.error, 'error');
          return;
        }
        this.showToast(res.message, 'emerald');
      });
    }

    // Module 7: Print Receipt & CSV Export
    const printBtn = document.getElementById('btn-print-receipt');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    const csvBtn = document.getElementById('btn-export-csv');
    if (csvBtn) {
      csvBtn.addEventListener('click', () => {
        this.exportLedgerCSV();
      });
    }
  }

  openEditExpenseModal(expenseId) {
    const state = this.store.getState();
    const exp = (state.expenses || []).find((e) => e.id === expenseId);
    if (!exp || !this.editExpenseDialog) return;

    document.getElementById('modal-exp-id').value = exp.id;
    document.getElementById('modal-exp-ref').textContent = exp.refId;
    document.getElementById('modal-exp-title').value = exp.title;
    document.getElementById('modal-exp-amount').value = Number(exp.amount).toFixed(2);
    document.getElementById('modal-exp-date').value = exp.date;
    document.getElementById('modal-exp-category').value = exp.category;
    document.getElementById('modal-exp-wallet').value = exp.wallet;
    document.getElementById('modal-exp-note').value = exp.merchantOrNote || '';

    this.editExpenseDialog.showModal();
  }

  openVaultModal(goalId, mode = 'ALLOCATE') {
    const state = this.store.getState();
    const metrics = this.store.getMetrics();
    const goal = (state.savingsGoals || []).find((g) => g.id === goalId);
    if (!goal || !this.vaultDialog) return;

    const titleEl = document.getElementById('dialog-vault-title');
    const bodyFieldsEl = document.getElementById('dialog-vault-fields');
    const submitBtnEl = document.getElementById('dialog-vault-submit');

    document.getElementById('modal-vault-goal-id').value = goal.id;
    document.getElementById('modal-vault-mode').value = mode;

    if (mode === 'ALLOCATE') {
      titleEl.textContent = `Add Money to "${goal.name}"`;
      submitBtnEl.textContent = 'Save to Goal';
      submitBtnEl.className = 'btn btn--emerald';
      bodyFieldsEl.innerHTML = `
        <div class="field">
          <label for="vault-alloc-amount">Amount to Save (₱) *</label>
          <span class="hint">Available cash to save: ${formatPHP(metrics.spendableBalance)}</span>
          <input
            type="number"
            id="vault-alloc-amount"
            name="amount"
            step="0.01"
            min="0.01"
            max="${Math.max(0.01, metrics.spendableBalance)}"
            value="${Math.min(500, Math.max(0, metrics.spendableBalance)).toFixed(2)}"
            required
          >
        </div>
        <input type="hidden" name="wallet" value="cash">
        <input type="hidden" name="note" value="Added to ${escapeHTML(goal.name)}">
      `;
    } else if (mode === 'WITHDRAW') {
      titleEl.textContent = `Withdraw from "${goal.name}"`;
      submitBtnEl.textContent = 'Move to Available Pocket Cash';
      submitBtnEl.className = 'btn btn--primary';
      bodyFieldsEl.innerHTML = `
        <div class="field">
          <label for="vault-with-amount">Amount to Withdraw (₱) *</label>
          <span class="hint">Currently saved in this goal: ${formatPHP(goal.lockedAmount)}</span>
          <input
            type="number"
            id="vault-with-amount"
            name="amount"
            step="0.01"
            min="0.01"
            max="${Math.max(0.01, goal.lockedAmount)}"
            value="${Math.min(250, goal.lockedAmount).toFixed(2)}"
            required
          >
        </div>
        <input type="hidden" name="wallet" value="cash">
        <input type="hidden" name="note" value="Withdrawn from ${escapeHTML(goal.name)}">
      `;
    } else {
      titleEl.textContent = `Edit Savings Goal`;
      submitBtnEl.textContent = 'Save Changes';
      submitBtnEl.className = 'btn btn--primary';
      bodyFieldsEl.innerHTML = `
        <div class="field">
          <label for="vault-edit-name">Goal Name *</label>
          <input type="text" id="vault-edit-name" name="name" value="${escapeHTML(goal.name)}" required>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="vault-edit-target">Target Amount (₱) *</label>
            <input type="number" id="vault-edit-target" name="targetAmount" step="0.01" min="1" value="${Number(goal.targetAmount).toFixed(2)}" required>
          </div>
          <div class="field">
            <label for="vault-edit-deadline">Target Date *</label>
            <input type="date" id="vault-edit-deadline" name="deadline" value="${escapeHTML(goal.deadline)}" required>
          </div>
        </div>
        <input type="hidden" name="priority" value="${escapeHTML(goal.priority || 'MEDIUM')}">
        <div class="field">
          <label for="vault-edit-notes">Note (Optional)</label>
          <input type="text" id="vault-edit-notes" name="notes" value="${escapeHTML(goal.notes || '')}">
        </div>
      `;
    }

    this.vaultDialog.showModal();
  }

  openCustomizePresetsModal() {
    if (!this.presetsDialog) return;
    const container = document.getElementById('presets-editor-container');
    if (!container) return;
    const presets = this.store.getQuickPresets();
    container.innerHTML = presets.map((p, idx) => this.renderPresetEditorRow(p, idx)).join('');
    this.presetsDialog.showModal();
  }

  renderPresetEditorRow(p = {}, idx = Date.now()) {
    const title = p.title || '';
    const amt = p.amount ? Number(p.amount).toFixed(2) : '50.00';
    const cat = p.category || 'food';

    return `
      <div class="preset-editor-row" data-preset-row>
        <div class="field" style="margin-bottom:0;">
          <label style="font-size:0.75rem;">Description *</label>
          <input type="text" name="row_title" value="${escapeHTML(title)}" required placeholder="e.g. Canteen Lunch">
        </div>
        <div class="field" style="margin-bottom:0;">
          <label style="font-size:0.75rem;">Amount (₱) *</label>
          <input type="number" name="row_amount" step="0.50" min="0.50" value="${amt}" required>
        </div>
        <div class="field" style="margin-bottom:0;">
          <label style="font-size:0.75rem;">Category</label>
          <select name="row_category">
            ${EXPENSE_CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === cat ? 'selected' : ''}>${escapeHTML(c.name)}</option>`).join('')}
          </select>
        </div>
        <input type="hidden" name="row_wallet" value="cash">
        <button type="button" class="btn btn--sm btn--danger btn-remove-preset-row" title="Delete shortcut" style="padding:0.42rem 0.6rem;">
          Delete
        </button>
      </div>
    `;
  }

  exportLedgerCSV() {
    const state = this.store.getState();
    const rows = [
      ['REF_ID', 'TYPE', 'DATE', 'TITLE_OR_DESCRIPTION', 'CATEGORY_OR_CLASS', 'WALLET', 'SIGNED_AMOUNT_PHP']
    ];

    rows.push([
      state.initialBalance.refId,
      'INITIAL_BASELINE',
      state.initialBalance.date,
      state.initialBalance.note,
      'BASELINE',
      'CASH',
      Number(state.initialBalance.breakdown.cash || 0).toFixed(2)
    ]);

    for (const inf of state.inflows || []) {
      rows.push([
        inf.refId,
        'INFLOW_OR_ADJ',
        inf.date,
        inf.description,
        inf.type,
        'CASH',
        Number(inf.amount).toFixed(2)
      ]);
    }

    for (const exp of state.expenses || []) {
      rows.push([
        exp.refId,
        'EXPENSE',
        exp.date,
        `${exp.title} (${exp.merchantOrNote || ''})`,
        exp.category.toUpperCase(),
        'CASH',
        (-Number(exp.amount)).toFixed(2)
      ]);
    }

    for (const g of state.savingsGoals || []) {
      rows.push([
        g.refId,
        'ESCROW_SAVINGS_LOCK',
        g.deadline,
        `Locked in Vault: ${g.name} (Target: ${g.targetAmount})`,
        'SAVINGS_ESCROW',
        'CASH',
        (-Number(g.lockedAmount)).toFixed(2)
      ]);
    }

    const csvContent = rows
      .map((r) => r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PESO_Student_Ledger_${state.student.studentId}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    this.showToast('Exported itemized PESO Student Ledger CSV.', 'emerald');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.pesoApp = new PesoApp();
});

})();
