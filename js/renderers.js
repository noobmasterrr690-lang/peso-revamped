/**
 * PESO — Personal Expense & Spending Organizer
 * Clean, Student-Friendly, Zero-Emoji UI Renderers (Modules 1 to 7)
 * Built for Desktop, Tablet, and Mobile views with flexible allowance tools.
 */

import {
  EXPENSE_CATEGORIES,
  WALLET_CHANNELS,
  INFLOW_TYPES,
  formatPHP
} from './ledger.js';

export function escapeHTML(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderPesoLogoSvg(size = 44, className = 'peso-inline-logo') {
  return `
    <svg class="${escapeHTML(className)}" viewBox="0 0 120 120" width="${Number(size)}" height="${Number(size)}" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="116" height="116" rx="22" fill="#111215" stroke="#111215" stroke-width="4"/>
      <rect x="19" y="17" width="88" height="88" rx="14" fill="#0B6E4F"/>
      <rect x="13" y="11" width="88" height="88" rx="14" fill="#F6F5F0" stroke="#111215" stroke-width="4"/>
      <path d="M22 28 V20 H30 M84 20 H92 V28 M22 82 V90 H30 M84 90 H92 V82" stroke="#0B6E4F" stroke-width="2.5" stroke-linecap="square"/>
      <path fill-rule="evenodd" clip-rule="evenodd"
        d="M41 26 H67 A19 19 0 0 1 67 64 H53 V84 H41 Z M53 36 V54 H65 A9 9 0 0 0 65 36 Z"
        fill="#D5D2C8"/>
      <path fill-rule="evenodd" clip-rule="evenodd"
        d="M38 23 H64 A19 19 0 0 1 64 61 H50 V81 H38 Z M50 33 V51 H62 A9 9 0 0 0 62 33 Z"
        fill="#111215"/>
      <rect x="27" y="31.5" width="62" height="9" rx="3" fill="#F6F5F0"/>
      <rect x="27" y="43.5" width="62" height="9" rx="3" fill="#F6F5F0"/>
      <rect x="29" y="33" width="58" height="6" rx="2" fill="#0B6E4F" stroke="#111215" stroke-width="1.8"/>
      <rect x="29" y="45" width="58" height="6" rx="2" fill="#0B6E4F" stroke="#111215" stroke-width="1.8"/>
    </svg>
  `.trim();
}

export function getStatusBadgeHTML(status, pct = null) {
  const pctText = pct !== null ? ` (${Math.round(pct)}%)` : '';
  if (status === 'BREACH') {
    return `<span class="status-badge status-badge--breach">Over Limit${pctText}</span>`;
  }
  if (status === 'CAUTION') {
    return `<span class="status-badge status-badge--caution">Near Limit${pctText}</span>`;
  }
  return `<span class="status-badge status-badge--nominal">On Track${pctText}</span>`;
}

export function getMeterFillClass(status) {
  if (status === 'BREACH') return 'meter-fill meter-fill--breach';
  if (status === 'CAUTION') return 'meter-fill meter-fill--caution';
  return 'meter-fill';
}

export function getCategoryName(catId) {
  const found = EXPENSE_CATEGORIES.find((c) => c.id === catId);
  return found ? found.name : catId;
}

export function getWalletName(walletId) {
  return 'Cash on Hand';
}

export function getWalletBadge(walletId) {
  return 'CASH';
}

export const QUICK_EXPENSE_PRESETS = [
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
export function renderDashboardModule(state, metrics) {
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
export function renderExpensesModule(state, metrics, filters = {}) {
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
export function renderBudgetModule(state, metrics) {
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
export function renderSavingsModule(state, metrics) {
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
export function renderBalanceModule(state, metrics) {
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
export function renderReportsModule(state, metrics) {
  const nowStr = new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' });

  return `
    <div class="page-intro">
      <div>
        <h1 class="page-title">Summary &amp; Receipt</h1>
        <p class="page-subtitle">View your spending summary and download an image of your receipt.</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn--primary" id="btn-download-receipt-image">Download Receipt Image</button>
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
          <div class="receipt-brand-seal" aria-hidden="true">
            ${renderPesoLogoSvg(38, 'receipt-logo-svg')}
          </div>
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
        ${(state.expenses || []).length === 0 ? `
          <div style="font-size:0.76rem; color:var(--ink-secondary); padding:0.4rem 0;">No expenses logged yet.</div>
        ` : (state.expenses || []).map((exp) => `
          <div class="receipt-line" style="font-size:0.76rem;">
            <span>${escapeHTML(exp.date)} — ${escapeHTML(exp.title)}</span>
            <span class="currency">-${formatPHP(exp.amount)}</span>
          </div>
        `).join('')}

        <div style="margin-top:1.25rem; padding-top:0.85rem; border-top:1px dashed var(--ink-primary);">
          <button type="button" class="btn btn--primary btn--block" id="btn-download-receipt-card">
            Download Receipt Image (.PNG)
          </button>
        </div>
      </section>
    </div>
  `;
}

// ============================================================================
// MODULE 2: SEPARATE LANDING PAGE (WELCOME, 1-CLICK DEMO & LOGIN PORTAL)
// ============================================================================
export function renderLandingPage(state, activeAuthTab = 'register') {
  const isAuthed = Boolean(state.student?.authenticated);

  return `
    <div class="landing-container">
      <!-- HERO BANNER -->
      <section class="landing-hero" aria-label="Welcome to PESO">
        <div class="landing-crest" aria-hidden="true">
          <span class="landing-crest__line"></span>
          <div class="landing-crest__emblem">
            ${renderPesoLogoSvg(52, 'landing-crest__svg')}
          </div>
          <span class="landing-crest__line"></span>
        </div>
        <div class="landing-badge">PESO • Student Cash &amp; Allowance Ledger</div>
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
export function renderAuthModule(state, metrics, activeAuthTab = 'login') {
  if (state.student && state.student.authenticated) {
    return renderAccountModule(state, metrics);
  }
  return renderLandingPage(state, activeAuthTab);
}

// ============================================================================
// IN-APP STUDENT ACCOUNT PROFILE (ACCESSED WHEN LOGGED IN)
// ============================================================================
export function renderAccountModule(state, metrics) {
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
