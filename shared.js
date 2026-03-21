/* ══════════════════════════════════════════════════════════════════
   shared.js — eKart Common UI Helpers
   Load order: api.js → shared.js → nav.js → page-specific script
   Provides: theme · toast · skeleton · mobile sidebar · modals · logout
══════════════════════════════════════════════════════════════════ */

/* ── THEME ────────────────────────────────────────────────────────
   Pages may set window._pageDarkDefault = true before this script
   to opt into a dark-first default (e.g. marketing.html).
   Once the user explicitly toggles, localStorage takes precedence.
─────────────────────────────────────────────────────────────────── */
let _isDark = (() => {
  const saved = localStorage.getItem('ekart_theme');
  if (saved) return saved === 'dark';          // user's explicit choice
  return window._pageDarkDefault === true;     // page default (light unless page sets true)
})();

function applyTheme(dark) {
  _isDark = dark;
  const root = document.documentElement;
  if (dark) {
    root.setAttribute('data-theme', 'dark');
    root.style.background = '#07080D';
  } else {
    root.removeAttribute('data-theme');
    root.style.background = '#F2F3F9';
  }
  const icon = dark ? '🌙' : '☀️';
  ['themeToggleBtn', 'themeToggleMob'].forEach(id => {
    const b = document.getElementById(id);
    if (b) b.textContent = icon;
  });
  localStorage.setItem('ekart_theme', dark ? 'dark' : 'light');
}

function toggleTheme() { applyTheme(!_isDark); }

/* ── TOAST ────────────────────────────────────────────────────────
   toast(msg, type)   type: 'success' | 'error' | 'info' | 'warning'
─────────────────────────────────────────────────────────────────── */
function toast(msg, type = 'success') {
  let c = document.getElementById('toast-container');
  if (!c) {
    c = document.createElement('div');
    c.id = 'toast-container';
    document.body.appendChild(c);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  el.innerHTML = `<span style="font-size:14px;">${icons[type] ?? '✓'}</span><span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    el.addEventListener('animationend', () => el.remove());
  }, 3200);
}

/* ── SKELETON ─────────────────────────────────────────────────────
   Call dismissSkeleton() once page data has loaded.
   Call revealSidebarUser() once user chip data is ready.
─────────────────────────────────────────────────────────────────── */
function dismissSkeleton() {
  const skel = document.getElementById('page-skeleton');
  if (!skel || skel._dismissed) return;
  skel._dismissed = true;
  skel.classList.add('skel-hiding');
  skel.addEventListener('transitionend', () => skel.remove(), { once: true });
  setTimeout(() => { if (skel.parentNode) skel.remove(); }, 500);
}

function revealSidebarUser() {
  document.getElementById('sidebar-user-skel')?.classList.add('hidden');
  document.getElementById('sidebar-user-real')?.classList.remove('loading');
}

/* ── MOBILE SIDEBAR ───────────────────────────────────────────────*/
function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('mob-open');
  document.getElementById('sidebarBackdrop')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('mob-open');
  document.getElementById('sidebarBackdrop')?.classList.remove('open');
  _restoreScroll();
}

/* ── MODAL HELPERS ────────────────────────────────────────────────
   Generic open/close for .modal-overlay elements.
   Pass the element id (without #).
─────────────────────────────────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
  _restoreScroll();
}

/* ── TOPBAR ACTIONS SLOT ──────────────────────────────────────────
   Inject buttons/controls into the right-hand topbar slot.
─────────────────────────────────────────────────────────────────── */
function setTopbarActions(html) {
  const el = document.getElementById('topbar-actions');
  if (el) el.innerHTML = html;
}

/* ── LOGOUT ───────────────────────────────────────────────────────*/
function logout() {
  localStorage.removeItem('ekart_token');
  sessionStorage.clear();
  location.replace('/');
}

/* ── COPY TEXT ────────────────────────────────────────────────────*/
function copyText(text, msg) {
  navigator.clipboard.writeText(text)
    .then(() => toast(msg || 'Copied!', 'success'))
    .catch(() => toast(text, 'info'));
}

/* ── PRIVATE: scroll lock helper ─────────────────────────────────*/
function _restoreScroll() {
  const stillLocked = document.querySelector(
    '.panel-backdrop.open,.store-panel.open,.drawer-overlay.open,' +
    '.sidebar.mob-open,.modal-overlay.open,.cat-modal-overlay.open'
  );
  if (!stillLocked) document.body.style.overflow = '';
}

/* ── AUTO-SETUP on DOMContentLoaded ──────────────────────────────*/
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(_isDark);

  // Close mobile sidebar on any nav-item click (mobile only)
  document.addEventListener('click', e => {
    if (e.target.closest('.nav-item') && window.innerWidth <= 648) {
      closeMobileSidebar();
    }
    // Close modal overlays on backdrop click
    const overlay = e.target.closest('.modal-overlay');
    if (overlay && e.target === overlay) {
      overlay.classList.remove('open');
      _restoreScroll();
    }
  });

  // Escape key: close mobile sidebar (individual pages handle their own modals)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileSidebar();
  });
});
