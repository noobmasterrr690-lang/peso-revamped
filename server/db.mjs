/**
 * PESO — Personal Expense & Spending Organizer
 * Relational SQLite Database Engine (Built on Node.js native node:sqlite)
 *
 * Persists student accounts, physical cash balances, cash inflows, expenses,
 * savings goal escrow vaults, quick fill presets, and audit trails in SQLite.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createDemoLedgerState,
  computeLedgerMetrics,
  DEFAULT_QUICK_PRESETS,
  generateRefId
} from '../js/ledger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
export const DB_PATH = path.join(DATA_DIR, 'peso.sqlite');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys for high concurrency and relational integrity
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    password TEXT NOT NULL,
    security_code TEXT DEFAULT 'PESO-4820',
    allowance_cycle TEXT DEFAULT 'MONTHLY',
    is_demo INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ledgers (
    email TEXT PRIMARY KEY,
    ledger_id TEXT NOT NULL,
    initial_cash REAL DEFAULT 0.00,
    spendable_balance REAL DEFAULT 0.00,
    locked_savings REAL DEFAULT 0.00,
    total_net_balance REAL DEFAULT 0.00,
    total_budget REAL DEFAULT 0.00,
    budget_period TEXT DEFAULT 'MONTHLY',
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    ref_id TEXT NOT NULL,
    tx_type TEXT NOT NULL,
    category TEXT NOT NULL,
    wallet TEXT DEFAULT 'cash',
    amount REAL NOT NULL,
    title TEXT NOT NULL,
    merchant_or_note TEXT DEFAULT '',
    tx_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    ref_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    locked_amount REAL NOT NULL,
    deadline TEXT NOT NULL,
    priority TEXT DEFAULT 'MEDIUM',
    updated_at TEXT NOT NULL,
    FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    ref_id TEXT NOT NULL,
    action TEXT NOT NULL,
    summary TEXT NOT NULL,
    delta_net REAL DEFAULT 0.00,
    delta_spendable REAL DEFAULT 0.00,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
  );
`);

/**
 * Seed default Demo Student account if not present in SQLite
 */
function ensureDemoAccountSeeded() {
  const demoState = createDemoLedgerState();
  const demoEmail = demoState.student.email.toLowerCase();
  const existing = db.prepare('SELECT email FROM users WHERE email = ?').get(demoEmail);

  if (!existing) {
    const nowIso = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (email, student_id, full_name, password, security_code, allowance_cycle, is_demo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      demoEmail,
      demoState.student.studentId,
      demoState.student.fullName,
      'peso-student-2026',
      demoState.student.securityCode || 'PESO-4820',
      demoState.student.allowanceCycle || 'MONTHLY',
      nowIso,
      nowIso
    );
    syncLedgerStateInDb(demoEmail, demoState);
  }
}

/**
 * Synchronize a student's complete ledger state into normalized SQLite tables
 */
export function syncLedgerStateInDb(email, state) {
  const cleanEmail = String(email || state?.student?.email || '').trim().toLowerCase();
  if (!cleanEmail || !state) {
    return { ok: false, error: 'Valid student email and state are required for database sync.' };
  }

  const metrics = computeLedgerMetrics(state);
  const nowIso = new Date().toISOString();

  // Ensure user row exists
  const existingUser = db.prepare('SELECT email FROM users WHERE email = ?').get(cleanEmail);
  if (!existingUser) {
    db.prepare(`
      INSERT INTO users (email, student_id, full_name, password, security_code, allowance_cycle, is_demo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cleanEmail,
      state.student?.studentId || cleanEmail.split('@')[0].toUpperCase(),
      state.student?.fullName || 'Student User',
      state.student?.password || 'peso-student',
      state.student?.securityCode || 'PESO-4820',
      state.budget?.period || 'MONTHLY',
      state.meta?.isDemoMode ? 1 : 0,
      nowIso,
      nowIso
    );
  } else {
    db.prepare(`
      UPDATE users
      SET full_name = ?, allowance_cycle = ?, updated_at = ?
      WHERE email = ?
    `).run(
      state.student?.fullName || 'Student User',
      state.budget?.period || 'MONTHLY',
      nowIso,
      cleanEmail
    );
  }

  // Upsert ledgers summary & JSON state
  db.prepare(`
    INSERT INTO ledgers (
      email, ledger_id, initial_cash, spendable_balance, locked_savings,
      total_net_balance, total_budget, budget_period, state_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      ledger_id = excluded.ledger_id,
      initial_cash = excluded.initial_cash,
      spendable_balance = excluded.spendable_balance,
      locked_savings = excluded.locked_savings,
      total_net_balance = excluded.total_net_balance,
      total_budget = excluded.total_budget,
      budget_period = excluded.budget_period,
      state_json = excluded.state_json,
      updated_at = excluded.updated_at
  `).run(
    cleanEmail,
    state.meta?.ledgerId || 'PESO-LDG',
    metrics.initialTotal,
    metrics.spendableBalance,
    metrics.totalLockedSavings,
    metrics.totalNetBalance,
    metrics.totalBudget,
    state.budget?.period || 'MONTHLY',
    JSON.stringify(state),
    nowIso
  );

  // Sync normalized transactions (inflows + expenses)
  db.prepare('DELETE FROM transactions WHERE email = ?').run(cleanEmail);
  const insertTx = db.prepare(`
    INSERT INTO transactions (id, email, ref_id, tx_type, category, wallet, amount, title, merchant_or_note, tx_date, created_at)
    VALUES (?, ?, ?, ?, ?, 'cash', ?, ?, ?, ?, ?)
  `);

  for (const inf of (state.inflows || [])) {
    insertTx.run(
      `${cleanEmail}_${inf.id}`,
      cleanEmail,
      inf.refId || 'INF-000',
      'INFLOW',
      inf.type || 'ALLOWANCE',
      Number(inf.amount) || 0,
      inf.description || 'Cash Allowance',
      inf.type || 'ALLOWANCE',
      inf.date || nowIso.slice(0, 10),
      inf.createdAt || nowIso
    );
  }

  for (const exp of (state.expenses || [])) {
    insertTx.run(
      `${cleanEmail}_${exp.id}`,
      cleanEmail,
      exp.refId || 'EXP-000',
      'EXPENSE',
      exp.category || 'food',
      Number(exp.amount) || 0,
      exp.title || 'Expense',
      exp.merchantOrNote || '',
      exp.date || nowIso.slice(0, 10),
      exp.createdAt || nowIso
    );
  }

  // Sync normalized savings_goals
  db.prepare('DELETE FROM savings_goals WHERE email = ?').run(cleanEmail);
  const insertGoal = db.prepare(`
    INSERT INTO savings_goals (id, email, ref_id, name, target_amount, locked_amount, deadline, priority, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const goal of (state.savingsGoals || [])) {
    insertGoal.run(
      `${cleanEmail}_${goal.id}`,
      cleanEmail,
      goal.refId || 'SAV-000',
      goal.name || 'Savings Goal',
      Number(goal.targetAmount) || 0,
      Number(goal.lockedAmount) || 0,
      goal.deadline || nowIso.slice(0, 10),
      goal.priority || 'MEDIUM',
      nowIso
    );
  }

  // Sync latest audit logs
  db.prepare('DELETE FROM audit_logs WHERE email = ?').run(cleanEmail);
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, email, ref_id, action, summary, delta_net, delta_spendable, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const aud of (state.auditTrail || []).slice(0, 60)) {
    insertAudit.run(
      `${cleanEmail}_${aud.id}`,
      cleanEmail,
      aud.refId || 'AUD-000',
      aud.action || 'LEDGER_EVENT',
      aud.summary || '',
      Number(aud.deltaNet) || 0,
      Number(aud.deltaSpendable) || 0,
      aud.timestamp || nowIso
    );
  }

  return {
    ok: true,
    email: cleanEmail,
    updatedAt: nowIso,
    metrics: {
      spendableBalance: metrics.spendableBalance,
      totalLockedSavings: metrics.totalLockedSavings,
      totalNetBalance: metrics.totalNetBalance
    }
  };
}

/**
 * Create a new student account in SQLite starting at strictly ₱0.00 Cash Balance
 */
export function registerUserInDb({ fullName, email, password }) {
  const cleanName = String(fullName || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();

  if (!cleanName) {
    return { ok: false, error: 'Please enter your name.' };
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (cleanPassword.length < 4) {
    return { ok: false, error: 'Password must be at least 4 characters long.' };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
  const todayStr = `${year}-${month}-${String(now.getDate()).padStart(2, '0')}`;
  const initRef = generateRefId('INI');
  const studentId = cleanEmail.split('@')[0].toUpperCase();

  const freshState = {
    meta: {
      version: '1.0.0',
      ledgerId: generateRefId('LDG'),
      createdAt: nowIso,
      lastAuditAt: nowIso,
      isDemoMode: false
    },
    student: {
      studentId,
      fullName: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      securityCode: 'PESO-4820',
      allowanceCycle: 'MONTHLY',
      isDemo: false,
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
        timestamp: nowIso,
        action: 'STUDENT_ACCOUNT_REGISTERED',
        summary: `Account registered in SQLite database for ${cleanName} (${cleanEmail}) with starting cash ₱0.00`,
        deltaNet: 0.00,
        deltaSpendable: 0.00
      }
    ]
  };

  db.prepare(`
    INSERT INTO users (email, student_id, full_name, password, security_code, allowance_cycle, is_demo, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'PESO-4820', 'MONTHLY', 0, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      full_name = excluded.full_name,
      password = excluded.password,
      updated_at = excluded.updated_at
  `).run(cleanEmail, studentId, cleanName, cleanPassword, nowIso, nowIso);

  syncLedgerStateInDb(cleanEmail, freshState);

  return {
    ok: true,
    user: {
      studentId,
      fullName: cleanName,
      email: cleanEmail,
      isDemo: false
    },
    state: freshState,
    message: `Account created and saved to SQLite database! Welcome, ${cleanName}.`
  };
}

/**
 * Authenticate a user against SQLite and return their stored ledger
 */
export function authenticateUserInDb(identifier, password) {
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  if (!cleanId || !cleanPass) {
    return { ok: false, error: 'Please enter both your email and password.' };
  }

  const user = db.prepare(`
    SELECT * FROM users
    WHERE lower(email) = ? OR lower(student_id) = ? OR lower(full_name) = ?
  `).get(cleanId, cleanId, cleanId);

  if (!user || user.password !== cleanPass) {
    return { ok: false, error: 'Incorrect email or password. Please try again or create an account.' };
  }

  const ledgerRow = db.prepare('SELECT state_json FROM ledgers WHERE email = ?').get(user.email);
  let state = null;
  if (ledgerRow && ledgerRow.state_json) {
    try {
      state = JSON.parse(ledgerRow.state_json);
    } catch {
      state = null;
    }
  }

  if (!state) {
    state = createDemoLedgerState();
    state.student.fullName = user.full_name;
    state.student.email = user.email;
  }

  state.student.authenticated = true;
  state.meta.isDemoMode = Boolean(user.is_demo);

  return {
    ok: true,
    user: {
      email: user.email,
      studentId: user.student_id,
      fullName: user.full_name,
      isDemo: Boolean(user.is_demo)
    },
    state,
    message: `Welcome back, ${user.full_name}!`
  };
}

/**
 * Get a user's ledger state from SQLite
 */
export function getUserLedgerFromDb(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return null;

  const row = db.prepare('SELECT state_json, updated_at FROM ledgers WHERE email = ?').get(cleanEmail);
  if (!row) return null;
  try {
    return {
      state: JSON.parse(row.state_json),
      updatedAt: row.updated_at
    };
  } catch {
    return null;
  }
}

/**
 * Get live SQLite database telemetry and summary rows for the Database Status panel
 */
export function getDatabaseStats() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
  const goalCount = db.prepare('SELECT COUNT(*) as count FROM savings_goals').get().count;
  const auditCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count;

  const accounts = db.prepare(`
    SELECT
      u.email,
      u.full_name as fullName,
      u.student_id as studentId,
      u.is_demo as isDemo,
      l.spendable_balance as spendableBalance,
      l.locked_savings as lockedSavings,
      l.total_net_balance as totalNetBalance,
      l.updated_at as updatedAt
    FROM users u
    LEFT JOIN ledgers l ON u.email = l.email
    ORDER BY u.updated_at DESC
    LIMIT 20
  `).all();

  const recentTransactions = db.prepare(`
    SELECT ref_id as refId, email, tx_type as type, category, amount, title, tx_date as date
    FROM transactions
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  return {
    ok: true,
    engine: 'SQLite 3 (node:sqlite WAL Mode)',
    databaseFile: 'data/peso.sqlite',
    counts: {
      users: userCount,
      transactions: txCount,
      savingsGoals: goalCount,
      auditLogs: auditCount
    },
    accounts,
    recentTransactions
  };
}

// Initialize seed data on startup
ensureDemoAccountSeeded();
