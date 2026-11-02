/**
 * PESO — Personal Expense & Spending Organizer
 * Main Application Controller, Event Delegation, Dialog Workflows & Accessibility Sync
 */

import {
  LedgerStore,
  EXPENSE_CATEGORIES,
  WALLET_CHANNELS,
  formatPHP,
  roundCurrency
} from './ledger.js';

import {
  renderLandingPage,
  renderAccountModule,
  renderDashboardModule,
  renderBalanceModule,
  renderExpensesModule,
  renderBudgetModule,
  renderSavingsModule,
  renderReportsModule,
  QUICK_EXPENSE_PRESETS,
  escapeHTML
} from './renderers.js';

import { renderQrCodeSvg } from './qr.js';

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
