import {
  buildPlan,
  CALENDAR_WEEKS,
  dateKey,
  dayPhases,
  isLiftDay,
  MAX_SEASON_WEEKS,
} from './plan.mjs';
import { ACCESS_CONFIG, isChannelLive } from './config.mjs';
import { renderQrSvg } from './qr.mjs';

const $ = id => document.getElementById(id);

const heroEl = document.querySelector('.hero');
const calendar = $('calendar');
const laterInput = $('later-date');
const noDateBtn = $('no-date');
const summaryEl = $('summary');
const legendEl = $('legend');
const heroCtaWrap = $('hero-cta-wrap');
const form = $('onramp');
const roleSeg = $('role-seg');
const roleThumb = roleSeg?.querySelector('.seg-thumb');
const parentWrap = $('parent-wrap');
const parentInput = $('parent-email');
const accessSection = $('access');
const channelsEl = $('channels');
const fineEl = $('fine');

const RING =
  '<svg class="ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M52 6C24 4 6 22 7 50c1 28 22 45 48 44 26-1 40-20 38-46C91 24 72 6 40 10"/></svg>';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 86400000;

const params = new URLSearchParams(location.search);
const source = (params.get('ref') || params.get('utm_source') || '').slice(0, 80);
// Keep previously shared Motion Lab links in preview mode.
const previewFlag = params.get('preview') === '1' || params.get('motion-lab') === '1';
const rawEndpoint = document.querySelector('meta[name="waitlist-endpoint"]')?.content.trim() ?? '';
const endpoint = previewFlag ? '' : rawEndpoint;

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const longDate = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const wk = n => `${n} ${n === 1 ? 'week' : 'weeks'}`;

const today = new Date();
today.setHours(0, 0, 0, 0);
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const offsetOf = d =>
  Math.round(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
      DAY
  );

function readUnlocked() {
  try {
    return localStorage.getItem('betaUnlocked') === 'true';
  } catch {
    return false;
  }
}

function writeUnlocked() {
  try {
    localStorage.setItem('betaUnlocked', 'true');
  } catch {
    // Private browsing or blocked storage
  }
}

function playIntroOnce(key) {
  if (reducedMotion()) return false;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}

function triggerPanelEnter(el) {
  if (reducedMotion()) return;
  el.classList.remove('panel-enter');
  void el.offsetWidth;
  el.classList.add('panel-enter');
}

// ---------- Calendar setup ----------
const start = addDays(today, -((today.getDay() + 6) % 7));
const cells = [];
for (let i = 0; i < CALENDAR_WEEKS * 7; i++) {
  const date = addDays(start, i);
  const offset = offsetOf(date);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'day';
  btn.setAttribute('role', 'gridcell');
  btn.tabIndex = -1;
  btn.setAttribute(
    'aria-label',
    date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  );
  const showMonth = date.getDate() === 1 || i === 0;
  btn.innerHTML = `<span>${date.getDate()}${showMonth ? ` <span class="m">${MONTHS[date.getMonth()]}</span>` : ''}</span><span class="lift" aria-hidden="true"></span>`;
  if (offset < 1) {
    btn.dataset.past = '';
    btn.disabled = offset < 0;
  }
  if (offset === 0) btn.dataset.today = '';
  cells.push({ btn, date, offset });
  calendar.append(btn);
}

const lastCell = cells.at(-1);
laterInput.min = dateKey(addDays(lastCell.date, 1));
laterInput.max = dateKey(addDays(today, MAX_SEASON_WEEKS * 7));

// Default: Saturday of week 12 (78..84 days out, matching NO_SEASON_PROGRAM_WEEKS), falling back to last cell.
let selected =
  cells.find(c => c.offset >= 78 && c.offset <= 84 && c.date.getDay() === 6) ??
  cells.find(c => c.offset >= 84 && c.date.getDay() === 6) ??
  lastCell;
let noDate = false;
let unlocked = readUnlocked();

function summaryText(plan) {
  if (!plan) return '';
  if (plan.isDefault) {
    return `No date yet. ${plan.programWeeks}-week default program, ${plan.sessions} sessions at 3 days/week (${wk(plan.weeksPerPhase)} each of GPP, SPP, and SSP).`;
  }
  const dateLabel = longDate(selected.date);
  if (plan.weeksUntil === plan.programWeeks) {
    return `${wk(plan.weeksUntil)} to ${dateLabel}. ${plan.sessions} sessions at 3 days/week (${wk(plan.weeksPerPhase)} each of GPP, SPP, and SSP).`;
  }
  return `${wk(plan.weeksUntil)} to ${dateLabel}. ${plan.programWeeks}-week program, ${plan.sessions} sessions at 3 days/week (${wk(plan.weeksPerPhase)} each of GPP, SPP, and SSP).`;
}

function pulseSummary() {
  if (reducedMotion()) return;
  summaryEl.classList.remove('summary-tick');
  void summaryEl.offsetWidth;
  summaryEl.classList.add('summary-tick');
}

function renderCalendar({ animate = false, userAction = false } = {}) {
  const days = noDate ? null : selected.offset;
  const phases = days ? dayPhases(days) : [];
  const plan = buildPlan(days);
  const doAnimate = animate && !reducedMotion();

  for (const c of cells) {
    const phase = days && c.offset > 0 && c.offset < days ? phases[c.offset] : null;
    const isTest = Boolean(days && c.offset === days);
    if (phase) c.btn.dataset.phase = phase;
    else delete c.btn.dataset.phase;
    if (isLiftDay(phase, c.date.getDay())) c.btn.dataset.lift = '';
    else delete c.btn.dataset.lift;
    c.btn.style.setProperty('--delay', doAnimate && phase ? `${Math.min(c.offset * 4, 240)}ms` : '0ms');
    c.btn.setAttribute('aria-selected', String(isTest));
    const focusable = isTest || ((noDate || !selected.btn) && c.offset === 1);
    c.btn.tabIndex = focusable ? 0 : -1;
    const ring = c.btn.querySelector('.ring');
    if (isTest && !ring) {
      c.btn.insertAdjacentHTML('beforeend', RING);
      c.btn.classList.toggle('drawn', doAnimate);
    } else if (!isTest && ring) {
      ring.remove();
      c.btn.classList.remove('drawn');
    }
  }

  if (days && days > lastCell.offset) {
    laterInput.value = dateKey(selected.date);
  } else {
    laterInput.value = '';
  }

  noDateBtn.setAttribute('aria-pressed', String(noDate));
  summaryEl.textContent = summaryText(plan);
  if (userAction) pulseSummary();
}

function selectCell(cell, { focus = false } = {}) {
  if (!cell || cell.offset < 1 || cell.offset > MAX_SEASON_WEEKS * 7) return;
  noDate = false;
  selected = cell;
  renderCalendar({ animate: true, userAction: true });
  if (focus && cell.btn) cell.btn.focus();
}

calendar.addEventListener('click', e => {
  const btn = e.target.closest('.day');
  if (!btn) return;
  const cell = cells.find(c => c.btn === btn);
  if (cell && cell.offset >= 1) selectCell(cell);
});

calendar.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse' || !legendEl) return;
  const btn = e.target.closest('.day[data-phase]');
  if (btn?.dataset.phase) {
    legendEl.dataset.activePhase = btn.dataset.phase;
  } else {
    delete legendEl.dataset.activePhase;
  }
});

calendar.addEventListener('pointerleave', () => {
  if (legendEl) delete legendEl.dataset.activePhase;
});

calendar.addEventListener('keydown', e => {
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
  if (!step) return;
  e.preventDefault();
  const from =
    selected.btn && !noDate
      ? cells.indexOf(selected)
      : cells.findIndex(c => c.offset === 1);
  const next = cells[Math.max(0, Math.min(cells.length - 1, from + step))];
  if (next && next.offset >= 1) selectCell(next, { focus: true });
});

laterInput.addEventListener('change', () => {
  if (!laterInput.value) return;
  const [y, m, d] = laterInput.value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const off = offsetOf(date);
  if (off < 1 || off > MAX_SEASON_WEEKS * 7) return;
  const inGrid = cells.find(c => dateKey(c.date) === laterInput.value);
  if (inGrid) {
    selectCell(inGrid);
    return;
  }
  selectCell({ btn: null, date, offset: off });
});

noDateBtn.addEventListener('click', () => {
  noDate = !noDate;
  renderCalendar({ animate: !noDate, userAction: true });
});

// ---------- Role Switcher ----------
function positionRoleThumb({ animate = true } = {}) {
  if (!roleSeg || !roleThumb || form.hidden) return;
  const checked = roleSeg.querySelector('input:checked');
  const label = checked?.closest('label');
  if (!label) return;
  if (!animate) roleSeg.dataset.ready = 'false';
  const left = label.offsetLeft;
  const top = label.offsetTop;
  const width = label.offsetWidth;
  const height = label.offsetHeight;
  if (!width || !height) return;
  roleThumb.style.width = `${width}px`;
  roleThumb.style.height = `${height}px`;
  roleThumb.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  roleSeg.dataset.thumbActive = 'true';
  if (!animate) {
    requestAnimationFrame(() => {
      roleSeg.dataset.ready = 'true';
    });
  }
}

window.addEventListener('resize', () => positionRoleThumb({ animate: false }));

// ---------- FAQ Accordion ----------
function wireFaqMotion() {
  const items = [...document.querySelectorAll('.qs details')];
  for (const details of items) {
    const summary = details.querySelector('summary');
    const body = details.querySelector('.faq-body');
    if (!summary || !body) continue;
    let revision = 0;

    summary.addEventListener('click', e => {
      const current = ++revision;
      if (reducedMotion()) {
        delete details.dataset.anim;
        body.inert = false;
        return;
      }
      e.preventDefault();
      if (details.open && details.dataset.anim !== 'closed') {
        details.dataset.anim = 'closed';
        body.inert = true;
        const transitions = body.getAnimations().map(animation => animation.finished);
        Promise.allSettled(transitions).then(() => {
          if (current !== revision) return;
          details.open = false;
          delete details.dataset.anim;
        });
        return;
      }
      if (!details.open) {
        details.dataset.anim = 'closed';
        details.open = true;
        void body.offsetHeight;
      }
      delete details.dataset.anim;
      body.inert = false;
    });
  }
}

// ---------- Beta Access Panel ----------
function renderChannels() {
  const channels = Object.values(ACCESS_CONFIG.channels);
  channelsEl.innerHTML = channels
    .map(c => {
      const live = isChannelLive(c);
      const qrId = `qr-${c.id}`;
      const qrBlock = live
        ? `
          <div class="qr-wrap">
            <button class="quiet qr-toggle" type="button" aria-expanded="false" aria-controls="${qrId}" data-qr-toggle="${qrId}">Show QR for another device</button>
            <div class="qr" id="${qrId}" data-mobile-hidden="true">${renderQrSvg(c.url, { size: 120, margin: 2, label: `QR code for ${c.label}` })}</div>
          </div>`
        : '';
      return `
        <div class="channel" data-live="${live}">
          <div class="channel-top">
            <div class="channel-meta">
              <h3>${c.platform}<span>${c.label}</span></h3>
              ${
                live
                  ? `<a class="cta small" href="${c.url}" rel="noopener">${c.cta}</a>`
                  : `<p class="soon">${c.comingSoonNote}</p>`
              }
            </div>
            ${qrBlock}
          </div>
          <ol>${c.steps.map(step => `<li>${step}</li>`).join('')}</ol>
        </div>`;
    })
    .join('');

  channelsEl.addEventListener('click', e => {
    const toggle = e.target.closest('[data-qr-toggle]');
    if (!toggle) return;
    const qr = document.getElementById(toggle.dataset.qrToggle);
    if (!qr) return;
    const showing = qr.dataset.mobileHidden === 'true';
    qr.dataset.mobileHidden = showing ? 'false' : 'true';
    toggle.setAttribute('aria-expanded', String(showing));
    toggle.textContent = showing ? 'Hide QR code' : 'Show QR for another device';
  });
}

// ---------- State-aware CTAs & Form Visibility ----------
function syncCtas() {
  const label = unlocked ? 'View beta access' : 'Start 2-week free beta';
  for (const btn of document.querySelectorAll('[data-open-form]')) {
    btn.textContent = label;
  }
}

function openForm() {
  if (unlocked) {
    showAccess();
    return;
  }
  heroCtaWrap.hidden = true;
  accessSection.hidden = true;
  form.hidden = false;
  syncRole();
  positionRoleThumb({ animate: false });
  triggerPanelEnter(form);
  $('onramp-title').focus({ preventScroll: true });
  form.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

function showAccess({ focus = true, scroll = true, animate = true } = {}) {
  form.hidden = true;
  heroCtaWrap.hidden = true;
  accessSection.hidden = false;
  syncCtas();
  if (animate) triggerPanelEnter(accessSection);
  if (focus) {
    accessSection.focus({ preventScroll: true });
  }
  if (scroll) {
    accessSection.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }
}

for (const btn of document.querySelectorAll('[data-open-form]')) {
  btn.addEventListener('click', openForm);
}

for (const link of document.querySelectorAll('#already, [data-show-access]')) {
  link.addEventListener('click', e => {
    e.preventDefault();
    showAccess({ focus: true, scroll: true });
  });
}

$('again').addEventListener('click', () => {
  accessSection.hidden = true;
  heroCtaWrap.hidden = true;
  form.hidden = false;
  form.reset();
  syncRole();
  positionRoleThumb({ animate: false });
  triggerPanelEnter(form);
  $('onramp-title').focus({ preventScroll: true });
  form.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
});

// ---------- Form Behavior & Validation ----------
function syncRole() {
  const role = form.elements.role.value;
  const showParent = role === 'athlete_14_17';
  if (parentWrap) {
    parentWrap.dataset.open = String(showParent);
    parentWrap.inert = !showParent;
  }
  if (parentInput) {
    parentInput.tabIndex = showParent ? 0 : -1;
  }
  $('email-label').textContent = role === 'parent' ? 'Parent or guardian email' : 'Your email';
}

form.addEventListener('change', e => {
  if (e.target.name === 'role') {
    syncRole();
    positionRoleThumb({ animate: true });
  }
  if (e.target.name === 'intent' && !$('intent-err').hidden) {
    setErr(null, $('intent-err'), '');
  }
});

const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function setErr(input, errEl, message) {
  if (input) input.setAttribute('aria-invalid', String(Boolean(message)));
  errEl.textContent = message || '';
  errEl.hidden = !message;
}

$('email').addEventListener('blur', () => {
  const v = $('email').value.trim();
  if (v) {
    setErr(
      $('email'),
      $('email-err'),
      isEmail(v) ? '' : 'Enter a valid email address, like name@example.com.'
    );
  }
});

$('email').addEventListener('input', () => {
  if ($('email').getAttribute('aria-invalid') === 'true' && isEmail($('email').value.trim())) {
    setErr($('email'), $('email-err'), '');
  }
});

$('parent-email').addEventListener('blur', () => {
  const v = $('parent-email').value.trim();
  if (v) {
    setErr(
      $('parent-email'),
      $('parent-err'),
      isEmail(v) ? '' : 'Enter a valid parent email, or leave it blank.'
    );
  } else {
    setErr($('parent-email'), $('parent-err'), '');
  }
});

$('parent-email').addEventListener('input', () => {
  const v = $('parent-email').value.trim();
  if ($('parent-email').getAttribute('aria-invalid') === 'true' && (!v || isEmail(v))) {
    setErr($('parent-email'), $('parent-err'), '');
  }
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  setErr(null, $('form-err'), '');

  const role = form.elements.role.value;
  const email = $('email').value.trim();
  const parentEmail = role === 'athlete_14_17' ? $('parent-email').value.trim() : '';
  const intent = form.elements.intent.value;

  const invalid = [];

  if (!isEmail(email)) {
    setErr(
      $('email'),
      $('email-err'),
      email
        ? 'Enter a valid email address, like name@example.com.'
        : 'Add your email so we can share your beta links.'
    );
    invalid.push($('email'));
  } else {
    setErr($('email'), $('email-err'), '');
  }

  if (parentEmail && !isEmail(parentEmail)) {
    setErr($('parent-email'), $('parent-err'), 'Enter a valid parent email, or leave it blank.');
    invalid.push($('parent-email'));
  } else {
    setErr($('parent-email'), $('parent-err'), '');
  }

  if (!intent) {
    setErr(null, $('intent-err'), 'Pick one option. Nothing is charged during the beta.');
    invalid.push(form.querySelector('[name="intent"]'));
  } else {
    setErr(null, $('intent-err'), '');
  }

  if (invalid.length) {
    invalid[0].focus();
    return;
  }

  const body = {
    role,
    email,
    ...(parentEmail ? { parentEmail } : {}),
    intent,
    ...(noDate ? {} : { seasonDate: dateKey(selected.date) }),
    ...(source ? { source } : {}),
    website: $('website').value,
  };

  const submitBtn = $('submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Starting…';

  try {
    if (endpoint) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(
          null,
          $('form-err'),
          data.error || 'That did not save. Please try again in a minute.'
        );
        return;
      }
    }
    unlocked = true;
    writeUnlocked();
    showAccess({ focus: true, scroll: true });
  } catch {
    setErr(null, $('form-err'), 'Could not reach the server. Check your connection and try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Start 2-week free beta';
  }
});

// ---------- Boot ----------
if (!endpoint && fineEl) {
  fineEl.textContent = 'Preview mode: sign-ups validate locally without storing.';
}

syncRole();
renderChannels();
wireFaqMotion();

const shouldPlayIntro = playIntroOnce('wf-intro');
renderCalendar({ animate: shouldPlayIntro });
if (shouldPlayIntro) heroEl.classList.add('intro-play');
syncCtas();

if (unlocked || location.hash === '#access') {
  showAccess({ focus: false, scroll: false, animate: false });
}
