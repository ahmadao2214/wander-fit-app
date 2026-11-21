import { buildPlan, CALENDAR_WEEKS, dateKey, dayPhases, isLiftDay } from './plan.mjs';

const TEST_NAMES = { tryout: 'team tryout', beep: 'beep test', mile: '1.5-mile run', academy: 'academy trial', none: 'season' };

const $ = id => document.getElementById(id);
const calendar = $('calendar');
const planForm = $('plan-form');
const signup = $('signup');
const endpoint = document.querySelector('meta[name="waitlist-endpoint"]')?.content.trim() ?? '';
const RING = '<svg class="ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M52 6C24 4 6 22 7 50c1 28 22 45 48 44 26-1 40-20 38-46C91 24 72 6 40 10"/></svg>';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY = 86400000;
const longDate = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// Where the visitor came from: ?ref=gym-flyer or ?utm_source=instagram
const params = new URLSearchParams(location.search);
const source = (params.get('ref') || params.get('utm_source') || '').slice(0, 80);

const today = new Date();
today.setHours(0, 0, 0, 0);
const offsetOf = date => Math.round((date - today) / DAY);

// Grid: Monday of this week, CALENDAR_WEEKS rows.
const start = new Date(today);
start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
const cells = [];
for (let i = 0; i < CALENDAR_WEEKS * 7; i++) {
  const date = new Date(start);
  date.setDate(start.getDate() + i);
  const offset = offsetOf(date);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'day';
  btn.setAttribute('role', 'gridcell');
  btn.tabIndex = -1;
  btn.setAttribute('aria-label', date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  const showMonth = date.getDate() === 1 || i === 0;
  btn.innerHTML = `<span>${date.getDate()}${showMonth ? ` <span class="m">${MONTHS[date.getMonth()]}</span>` : ''}</span><span class="lift" aria-hidden="true"></span>`;
  if (offset < 1) { btn.dataset.past = ''; btn.disabled = offset < 0; }
  if (offset === 0) btn.dataset.today = '';
  cells.push({ btn, date, offset });
  calendar.append(btn);
}

const lastCell = cells.at(-1);
const laterInput = $('later-date');
const dayAfter = new Date(lastCell.date.getTime() + DAY);
laterInput.min = dateKey(dayAfter);

// Default: the first Saturday at least 12 weeks out (matching NO_SEASON_PROGRAM_WEEKS), falling back to last cell.
let selected = cells.find(c => c.offset >= 84 && c.date.getDay() === 6) ?? lastCell;
let noDate = false;

function render({ animate = false } = {}) {
  const days = noDate ? null : selected.offset;
  const phases = noDate ? [] : dayPhases(days);
  const plan = buildPlan(days);
  for (const c of cells) {
    const phase = c.offset > 0 && c.offset < (days ?? 0) ? phases[c.offset] : null;
    const isTest = !noDate && c === selected;
    if (phase) c.btn.dataset.phase = phase; else delete c.btn.dataset.phase;
    if (isLiftDay(phase, c.date.getDay())) c.btn.dataset.lift = ''; else delete c.btn.dataset.lift;
    c.btn.style.setProperty('--delay', animate && phase ? `${Math.min(c.offset * 4, 240)}ms` : '0ms');
    c.btn.setAttribute('aria-selected', String(isTest));
    const focusable = isTest || ((noDate || !selected.btn) && c.offset === 1);
    c.btn.tabIndex = focusable ? 0 : -1;
    const ring = c.btn.querySelector('.ring');
    if (isTest && !ring) {
      c.btn.insertAdjacentHTML('beforeend', RING);
      c.btn.classList.toggle('drawn', animate);
    } else if (!isTest && ring) {
      ring.remove();
      c.btn.classList.remove('drawn');
    }
  }
  if (selected.btn || noDate) laterInput.value = '';
  $('no-date').setAttribute('aria-pressed', String(noDate));
  $('summary').innerHTML = summaryText(plan);
  $('save').textContent = noDate ? 'Start 2-week free beta' : `Start 2-week free beta for ${longDate(selected.date)}`;
}

function summaryText(plan) {
  if (!plan) return '';
  const w = n => `${n} ${n === 1 ? 'week' : 'weeks'}`;
  const bits = plan.phases.map(p => `<span class="key ${p.id}"></span>${w(p.weeks)} ${p.code}`);
  if (plan.isDefault) {
    return `<strong>12-week default, ${plan.sessions} sessions.</strong> ${bits.join(', ')}.`;
  }
  const test = TEST_NAMES[$('test')?.value] ?? 'season';
  const when = selected.btn ? '' : ` Your ${test} is ${longDate(selected.date)}.`;
  return `<strong>${plan.weeksUntil} ${plan.weeksUntil === 1 ? 'week' : 'weeks'}, ${plan.sessions} sessions.</strong> ${bits.join(', ')}.${when}`;
}

function select(cell, { focus = false } = {}) {
  if (!cell || cell.offset < 1) return;
  noDate = false;
  selected = cell;
  render({ animate: true });
  if (focus && cell.btn) cell.btn.focus();
}

calendar.addEventListener('click', e => {
  const btn = e.target.closest('.day');
  if (btn) select(cells.find(c => c.btn === btn));
});

// Arrow keys move the selection: left/right a day, up/down a week.
calendar.addEventListener('keydown', e => {
  const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
  if (!step) return;
  e.preventDefault();
  const from = selected.btn && !noDate ? cells.indexOf(selected) : cells.findIndex(c => c.offset === 1);
  select(cells[Math.max(0, Math.min(cells.length - 1, from + step))], { focus: true });
});

laterInput.addEventListener('change', () => {
  if (!laterInput.value) return;
  const [y, m, d] = laterInput.value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date <= lastCell.date) {
    select(cells.find(c => dateKey(c.date) === laterInput.value));
    return;
  }
  select({ btn: null, date, offset: offsetOf(date) });
});

$('no-date').addEventListener('click', () => {
  noDate = !noDate;
  render({ animate: !noDate });
});

planForm.addEventListener('change', () => render());

// Sign-up
$('save').addEventListener('click', () => {
  signup.hidden = false;
  $('done').hidden = true;
  $('signup-title').focus();
});

function syncRole() {
  const parent = signup.elements.role.value === 'parent';
  $('email-label').textContent = parent ? 'Athlete’s email (optional)' : 'Your email';
  $('parent-label').textContent = parent ? 'Your email' : 'Parent’s email';
  $('email').required = !parent;
}
signup.addEventListener('change', e => { if (e.target.name === 'role') syncRole(); });

const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function showError(message, field) {
  $('error').textContent = message;
  $('error').hidden = false;
  field?.focus();
}

signup.addEventListener('submit', async e => {
  e.preventDefault();
  const parent = signup.elements.role.value === 'parent';
  const name = $('name').value.trim();
  const age = $('age').value;
  const email = $('email').value.trim();
  const parentEmail = $('parent-email').value.trim();
  const checks = [
    [$('name'), !name, 'the athlete’s first name'],
    [$('age'), !age, 'the athlete’s age'],
    [$('sport'), !$('sport').value, 'a sport'],
    [$('email'), parent ? (email !== '' && !isEmail(email)) : !isEmail(email), parent ? 'a valid athlete email, or leave it blank' : 'your email'],
    [$('parent-email'), !isEmail(parentEmail), parent ? 'your email' : 'a parent’s email'],
  ];
  const missing = checks.filter(([el, bad]) => { el.setAttribute('aria-invalid', String(bad)); return bad; });
  if (missing.length) return showError(`Add ${missing.map(m => m[2]).join(', ')}.`, missing[0][0]);
  if (Number(age) < 13) {
    $('age').setAttribute('aria-invalid', 'true');
    return showError('WanderFit is for athletes 13 and older. Thanks for checking us out.', $('age'));
  }
  $('error').hidden = true;

  const numericAge = Number(age);
  const mappedRole = parent ? 'parent' : numericAge >= 18 ? 'athlete_18_plus' : 'athlete_14_17';
  const body = {
    role: mappedRole,
    email: parent ? parentEmail : email,
    ...(mappedRole === 'athlete_14_17' && parentEmail ? { parentEmail } : {}),
    intent: signup.elements.intent.value === 'reserve' ? 'season_pass' : 'free_beta_only',
    ...(noDate ? {} : { seasonDate: dateKey(selected.date) }),
    source,
    website: $('website').value,
    athleteName: name,
  };

  const button = $('submit');
  button.disabled = true;
  button.textContent = 'Saving…';
  try {
    if (endpoint) {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        return showError(error || 'That didn’t save. Try again in a minute.');
      }
    }
    showDone(body, parent);
  } catch {
    showError('That didn’t save. Check your connection and try again.');
  } finally {
    button.disabled = false;
    button.textContent = 'Save my spot';
  }
});

function showDone(body, parent) {
  const held = body.intent === 'reserve';
  $('done-title').textContent = noDate ? `${body.athleteName} is on the list.` : `${body.athleteName}: ${longDate(selected.date)}, circled.`;
  const who = parent ? 'you' : 'you and your parent';
  const lines = [
    noDate ? 'We’ll email when the next group starts.' : `${selected.offset} days to go. We’ll email ${who} the app link and the plan.`,
    held ? 'Your season pass is held. Nothing is charged until the two free weeks are up.' : '',
    endpoint ? '' : 'Preview page: this sign-up wasn’t stored.',
  ];
  $('done-body').textContent = lines.filter(Boolean).join(' ');
  signup.reset();
  syncRole();
  signup.hidden = true;
  $('done').hidden = false;
  $('done').focus();
}

$('again').addEventListener('click', () => {
  $('done').hidden = true;
  signup.hidden = false;
  $('name').focus();
});

if (!endpoint) $('fine').textContent = 'Preview page: sign-ups aren’t stored yet.';
render();
