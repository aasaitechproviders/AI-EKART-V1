/* ══════════════════════════════════════════════════════════════════
   nav.js — eKart Navigation Controller
   Deps: api.js (getToken, apiFetch) · shared.js (revealSidebarUser)

   What this does:
   1. Injects nav-items into #sidebar-nav immediately (no API wait)
   2. Auth-checks and fetches user + stores in parallel
   3. Populates the sidebar user chip
   4. Populates desktop + mobile store selectors
   5. Injects + populates the AI Credits widget in the left sidebar
   6. Returns { user, stores, currentStoreId } to the page
══════════════════════════════════════════════════════════════════ */

/* ── NAVIGATION STRUCTURE ─────────────────────────────────────────
   activePage values used by each page:
     home.html       → 'stores'
     merchant.html   → 'manage'
     orders.html     → 'orders'
     payments.html   → 'payments'
     analytics.html  → 'analytics'
     marketing.html  → 'marketing'
     website-builder → 'website-builder'
     ai-builder      → 'ai-builder'
     ai-assistant    → 'ai-assistant'
     account.html    → 'account'
─────────────────────────────────────────────────────────────────── */
const _NAV_SECTIONS = [
  {
    label: 'Merchant',
    items: [
      { page: 'stores',           href: 'home.html',            icon: '🏪', label: 'My Stores'        },
      { page: 'manage',           href: 'merchant.html',         icon: '🎟️', label: 'Merchant Corner'  },
      { page: 'orders',           href: 'orders.html',           icon: '📋', label: 'Orders'            },
      { page: 'payments',         href: 'payments.html',         icon: '💳', label: 'Payments'          },
      { page: 'analytics',        href: 'analytics.html',        icon: '📊', label: 'Analytics'         },
      { page: 'marketing',        href: 'marketing.html',        icon: '📣', label: 'Marketing'         },
    ],
  },
  {
    label: 'Storefront',
    items: [
      { page: 'website-builder',  href: 'website-builder.html',  icon: '🎨', label: 'Website Builder'  },
      { page: 'ai-builder',       href: 'ai-builder.html',        icon: '🛠️', label: 'AI Builder'       },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { page: 'ai-assistant',     href: 'ai-assistant.html',     icon: '🤖', label: 'AI Assistant'     },
    ],
  },
  {
    label: 'Account',
    items: [
      { page: 'account',          href: 'account.html',           icon: '👤', label: 'Account & Billing' },
    ],
  },
];

/* ── NAV INJECTION ────────────────────────────────────────────────
   Writes HTML into #sidebar-nav. Called synchronously at page load
   so nav items are visible before the API resolves.
─────────────────────────────────────────────────────────────────── */
function _injectSidebarNav(activePage) {
  const container = document.getElementById('sidebar-nav');
  if (!container) return;
  container.innerHTML = _NAV_SECTIONS.map(({ label, items }) => `
    <div class="nav-section">
      <div class="nav-section-label">${label}</div>
      ${items.map(({ page, href, icon, label: lbl }) =>
        `<a class="nav-item${activePage === page ? ' active' : ''}" href="${href}">
          <span class="nav-icon">${icon}</span>${lbl}
        </a>`
      ).join('')}
    </div>
  `).join('');
}

/* ── AI CREDITS SIDEBAR WIDGET ────────────────────────────────────
   Injects the credit widget above #sidebar-nav (in the left sidebar)
   if it doesn't already exist in the page HTML.
   On account.html  → clicking calls goToSection('credits').
   On all other pages → clicking navigates to account.html.
─────────────────────────────────────────────────────────────────── */
function _injectCreditWidget() {
  /* If the page already has a hardcoded #credit-widget, skip */
  if (document.getElementById('credit-widget')) return;

  const navEl = document.getElementById('sidebar-nav');
  if (!navEl) return;

  const isAccountPage = window.location.pathname.endsWith('account.html') ||
                        window.location.href.includes('account.html');

  const widget = document.createElement('div');
  widget.className = 'credit-sidebar-widget';
  widget.id        = 'credit-widget';
  widget.title     = 'AI Credits';
  widget.setAttribute('onclick',
    isAccountPage
      ? "typeof goToSection==='function'&&goToSection('credits')"
      : "location.href='account.html'"
  );
  widget.innerHTML = `
    <div class="csw-header">
      <span class="csw-label">AI Credits</span>
      <span class="csw-badge" id="credit-badge">—</span>
    </div>
    <div class="progress-bar" style="height:5px;">
      <div class="progress-fill" id="credit-bar" style="width:0%;"></div>
    </div>
    <div class="csw-sub" id="credit-sub">Loading…</div>
  `;

  /* Insert between user chip and nav items */
  navEl.parentNode.insertBefore(widget, navEl);
}

/* ── CREDIT WIDGET POPULATION ─────────────────────────────────────
   Fetches /account and fills the credit widget. Non-blocking —
   a failure here should never block the rest of the page.
─────────────────────────────────────────────────────────────────── */
function _populateCreditWidget() {
  apiFetch('/account')
    .then(function(data) {
      var cr = data && data.credits;
      if (!cr) return;

      var used = cr.monthly_used      || 0;
      var cap  = cr.monthly_cap       || 1;
      var rem  = cr.monthly_remaining || 0;
      var pct  = Math.min(100, Math.round((used / cap) * 100));

      var badge = document.getElementById('credit-badge');
      var bar   = document.getElementById('credit-bar');
      var sub   = document.getElementById('credit-sub');

      if (badge) badge.textContent = rem.toLocaleString('en-IN') + ' left';
      if (bar) {
        bar.style.width = pct + '%';
        bar.className   = 'progress-fill' +
          (pct >= 90 ? ' danger' : pct >= 70 ? ' warn' : '');
      }
      if (sub) sub.textContent = used.toLocaleString('en-IN') + ' / ' + cap.toLocaleString('en-IN') + ' used';
    })
    .catch(function() {
      var sub = document.getElementById('credit-sub');
      if (sub) sub.textContent = 'Unavailable';
    });
}

/* ── STORE SELECTOR POPULATION ───────────────────────────────────*/
function _populateStoreSelectors(stores, currentStoreId, onStoreChange) {
  const optsHTML = stores.length
    ? stores.map(s =>
        `<option value="${s._id}"${s._id === currentStoreId ? ' selected' : ''}>${s.name}</option>`
      ).join('')
    : '<option value="">No stores</option>';

  function syncChange(id) {
    sessionStorage.setItem('ekart_current_store', id);
    // Keep both selectors in sync
    const d = document.getElementById('store-selector');
    const m = document.getElementById('mob-store-selector');
    if (d && d.value !== id) d.value = id;
    if (m && m.value !== id) m.value = id;
    if (typeof onStoreChange === 'function') onStoreChange(id);
  }

  // Desktop selector
  const deskSel  = document.getElementById('store-selector');
  const deskWrap = document.getElementById('store-select-wrap');
  if (deskSel) {
    deskSel.innerHTML = optsHTML;
    deskSel.addEventListener('change', e => syncChange(e.target.value));
  }
  if (deskWrap && !stores.length) deskWrap.style.display = 'none';

  // Mobile pill selector
  const mobSel  = document.getElementById('mob-store-selector');
  const mobWrap = document.getElementById('mob-store-wrap');
  if (mobSel) {
    mobSel.innerHTML = optsHTML;
    mobSel.addEventListener('change', e => syncChange(e.target.value));
  }
  if (mobWrap && !stores.length) mobWrap.style.display = 'none';
}

/* ── MAIN: renderNav ──────────────────────────────────────────────
   Call at page load:
     const nav = await renderNav('stores');
     if (!nav) return;  // redirected to login
     const { user, stores, currentStoreId } = nav;
─────────────────────────────────────────────────────────────────── */
async function renderNav(activePage, onStoreChange) {

  // 1. Inject nav items right away — no loading wait
  _injectSidebarNav(activePage);

  // 2. Inject AI Credits widget immediately (skeleton state, filled later)
  _injectCreditWidget();

  // 3. Auth guard
  if (!getToken()) { location.replace('/'); return null; }

  // 4. Parallel fetch: user profile + stores list
  let user, stores;
  try {
    [user, stores] = await Promise.all([
      apiFetch('/auth/me'),
      apiFetch('/stores'),
    ]);
  } catch {
    location.replace('/');
    return null;
  }

  // 5. Resolve current store (persisted in sessionStorage)
  let currentStoreId = sessionStorage.getItem('ekart_current_store') || '';
  if (!stores.find(s => s._id === currentStoreId) && stores.length) {
    currentStoreId = stores[0]._id;
  }
  sessionStorage.setItem('ekart_current_store', currentStoreId);

  // 6. Fill sidebar user chip
  const avatarEl = document.getElementById('nav-avatar');
  if (avatarEl) {
    avatarEl.innerHTML = user.avatar
      ? `<img src="${user.avatar}" alt="">`
      : (user.name || 'U')[0].toUpperCase();
  }
  const nameEl  = document.getElementById('nav-user-name');
  const emailEl = document.getElementById('nav-user-email');
  if (nameEl)  nameEl.textContent  = user.name  || '';
  if (emailEl) emailEl.textContent = user.email || '';
  revealSidebarUser(); // from shared.js

  // 7. Populate AI Credits widget (non-blocking background fetch).
  //    Skip on account.html — that page calls renderSidebarCredit()
  //    itself with data already in memory after loadAccount().
  const isAccountPage = window.location.pathname.endsWith('account.html') ||
                        window.location.href.includes('account.html');
  if (!isAccountPage) {
    _populateCreditWidget();
  }

  // 8. Populate store selectors (skip for the stores listing page itself)
  if (activePage !== 'stores') {
    _populateStoreSelectors(stores, currentStoreId, onStoreChange);
  }

  return { user, stores, currentStoreId };
}

/* ── HELPERS ──────────────────────────────────────────────────────*/
function getCurrentStoreId() {
  return sessionStorage.getItem('ekart_current_store') || '';
}
