/**
 * PESO — Personal Expense & Spending Organizer
 * Core Accounting Engine & Immutable Transaction Ledger State Machine
 *
 * Enforces the strict accounting identities:
 *   Total Net Balance = Initial Balance + Sum(Allowance/Inflows) - Sum(Logged Expenses)
 *   Spendable Balance = Total Net Balance - Sum(Locked Savings Allocations)
 */

export const STORAGE_KEY = 'PESO_LEDGER_STATE_V1';
export const USERS_STORAGE_KEY = 'PESO_REGISTERED_USERS_V1';

export const EXPENSE_CATEGORIES = [
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

export const WALLET_CHANNELS = [
  { id: 'cash', code: 'WLT-CASH', name: 'Cash on Hand', badge: 'CASH' }
];

export const INFLOW_TYPES = [
  { id: 'ALLOWANCE', label: 'Regular Cash Allowance' },
  { id: 'SCHOLARSHIP', label: 'Scholarship / Stipend Grant' },
  { id: 'PART_TIME', label: 'Part-Time / Student Work Pay' },
  { id: 'GIFT_REMITTANCE', label: 'Family Cash Gift' },
  { id: 'RECONCILIATION_ADJ', label: 'Cash Count Adjustment' }
];

export const DEFAULT_QUICK_PRESETS = [
  { id: 'qp-1', label: 'Canteen Meal (₱85)', title: 'Canteen Meal', amount: 85.00, category: 'food', wallet: 'cash' },
  { id: 'qp-2', label: 'Jeep / LRT Fare (₱30)', title: 'Jeepney / LRT Fare', amount: 30.00, category: 'transit', wallet: 'cash' },
  { id: 'qp-3', label: 'Printing / Xerox (₱25)', title: 'Handout Printing', amount: 25.00, category: 'academic', wallet: 'cash' },
  { id: 'qp-4', label: 'Coffee / Snack (₱65)', title: 'Coffee & Snack', amount: 65.00, category: 'food', wallet: 'cash' },
  { id: 'qp-5', label: 'School Supplies (₱60)', title: 'Notebook & Pen', amount: 60.00, category: 'academic', wallet: 'cash' }
];

/**
 * Format numeric amount into strict Philippine Peso (₱) tabular string
 */
export function formatPHP(amount, showSign = false) {
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
export function generateRefId(prefix = 'TXN') {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${rand}`;
}

/**
 * Create realistic pre-populated Demo Student Ledger State in Philippine Pesos (₱)
 * Uses dates anchored around the current month so daily burn rates & remaining days work live.
 */
export function createDemoLedgerState() {
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
export function computeLedgerMetrics(state) {
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

  // Live "Safe-to-Spend Today" metric: (Remaining Period Budget / Remaining Days in Period)
  const safeToSpendToday = remainingPeriodBudget > 0
    ? roundCurrency(remainingPeriodBudget / remainingDaysInPeriod)
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

export function roundCurrency(val) {
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}

/**
 * Validate date string (YYYY-MM-DD) - prevents invalid dates or far-future dates
 */
export function validateDateInput(dateStr, allowFuture = false) {
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

export class LedgerStore {
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
