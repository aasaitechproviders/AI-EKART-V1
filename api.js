// ── eKart Shared API & Auth ───────────────────────────────────────────────────
const API = 'https://apiv2.aasaitech.in'

function getToken() { return localStorage.getItem('ekart_token') }

async function apiFetch(path, opts = {}) {
  const token = getToken()
  const isFormData = opts.body instanceof FormData
  const headers = { 'Authorization': 'Bearer ' + token }
  if (!isFormData) headers['Content-Type'] = 'application/json'
  Object.assign(headers, opts.headers || {})
  const res = await fetch(API + path, { ...opts, headers })
  if (res.status === 401) { localStorage.removeItem('ekart_token'); location.replace('/'); return }
  if (!res.ok) { const e = await res.json().catch(() => ({ error: 'Request failed' })); throw new Error(e.error || 'Request failed') }
  return res.json()
}

function logout() { localStorage.removeItem('ekart_token'); location.replace('/') }

function formatCurrency(amount, currency = 'INR') {
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₹'
  return sym + parseFloat(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
}

function timeAgo(date) {
  const d = new Date(date), now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  return Math.floor(diff / 86400) + 'd ago'
}
// Note: toast() is defined in nav.js — do not redefine here
