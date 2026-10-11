import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FaWallet,
  FaSave,
  FaChevronDown,
  FaChevronRight,
  FaMinus,
  FaSun,
  FaMoon,
} from 'react-icons/fa';
import BASE_URL from '../../config';
import Cookies from 'js-cookie';
import LoginSignup from '../LoginSignup/LoginSignup';
import './ExpenseManagement.css';

/* ============================================================================
   Endpoints
   ========================================================================== */
const LOAD_ENDPOINT = `${BASE_URL}/expenses`;   // GET  ?station=..&year=..&month=..
const SAVE_ENDPOINT = `${BASE_URL}/expenses`;   // POST { station, entries:[...] }

/* ============================================================================
   Fixed categories — order matches the backend table columns in AAA.js
   ========================================================================== */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CATEGORIES = [
  { id: 'hammali',     name: 'Hammali',     color: '#ef5f6b' },
  { id: 'auto_fare',   name: 'Auto Fare',   color: '#4aa8ff' },
  { id: 'food',        name: 'Food',        color: '#a06bff' },
  { id: 'petrol',      name: 'Petrol',      color: '#37c2a0' },
  { id: 'rent',        name: 'Rent',        color: '#f5b342' },
  { id: 'electricity', name: 'Electricity', color: '#ff8a5c' },
  { id: 'mobile',      name: 'Mobile',      color: '#5cc8ff' },
  { id: 'internet',    name: 'Internet',    color: '#c86bff' },
  { id: 'stationary',  name: 'Stationary',  color: '#6bd18a' },
  { id: 'travel',      name: 'Travel',      color: '#ff6b9d' },
  { id: 'others',      name: 'Others',      color: '#8ad15c' },
];

const STATIONS = ['Indore', 'Raipur'];

/* ============================================================================
   USER → BRANCH MAP   (LEGACY FALLBACK ONLY)
   ---------------------------------------------------------------------------
   The real source of truth is now `currentUser.branch`, which the backend
   sends from the `users.branch` column:
       Admin    -> 'All'
       Employee -> 'Indore' | 'Raipur'
   This map is only consulted when a user object has NO `.branch` field —
   i.e. an old cookie stored before the column existed. You can safely
   delete it once all sessions have refreshed.
   ========================================================================== */
const USER_BRANCH_MAP = {
  'nmpt01': 'Indore',
  'nmpt02': 'Raipur',
};

/* ---- Helpers ---- */
function toISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function pad(n) {
  return String(n).padStart(2, '0');
}
function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}
function inr(n) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

function isoDateOnly(v) {
  if (v == null) return '';
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return s.slice(0, 10);
  return toISO(d);
}

function isAdminUser(user) {
  return String(user?.type || '').toLowerCase() === 'admin';
}

/* ---------------------------------------------------------------------------
   Resolve the user's branch.
     1. Prefer `user.branch` — the value that came from the DB via the
        /users/authenticate response.
     2. Fall back to the legacy hardcoded map for old sessions.
   ------------------------------------------------------------------------- */
function branchOf(user) {
  if (!user) return null;

  // 1) DB-provided branch (current path).
  if (user.branch) return String(user.branch).trim();

  // 2) Legacy fallback.
  const keys = [
    user.name,
    user.mobile,
    user.mobile_number,   // <- was missing previously
    user.identifier,
    user.username,
  ]
    .filter(Boolean)
    .map((s) => String(s).trim());

  for (const k of keys) if (USER_BRANCH_MAP[k]) return USER_BRANCH_MAP[k];
  return null;
}

/* ============================================================================
   Outer shell — handles auth. Shows LoginSignup when there is no session.
   ========================================================================== */
export default function ExpenseManagement({ currentUser: propUser, isLightMode = true }) {
  const [internalUser, setInternalUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [lightMode, setLightMode] = useState(isLightMode);
  const toggleTheme = () => setLightMode((v) => !v);

  useEffect(() => {
    if (propUser) { setAuthChecked(true); return; }
    const raw = Cookies.get('userData');
    if (raw) {
      try { setInternalUser(JSON.parse(raw)); } catch { /* ignore */ }
    }
    setAuthChecked(true);
  }, [propUser]);

  const user = propUser || internalUser;
  const themeClass = lightMode ? 'exg-light' : 'exg-dark';

  if (!authChecked) return null;

  if (!user) {
    return (
      <div className={`exg-wrap exg-auth-wrap ${themeClass}`}>
        <LoginSignup
          onLoginSuccess={(u) => {
            Cookies.set('userData', JSON.stringify(u), { expires: 3 / 24 });
            setInternalUser(u);
          }}
        />
      </div>
    );
  }

  return <ExpenseGrid currentUser={user} lightMode={lightMode} onToggleTheme={toggleTheme} />;
}

/* ============================================================================
   Grid
   ========================================================================== */
function ExpenseGrid({ currentUser, lightMode, onToggleTheme }) {
  const todayRef = useRef(new Date());
  const today = todayRef.current;
  const todayISO = toISO(today);
  const themeClass = lightMode ? 'exg-light' : 'exg-dark';

  const isAdmin = isAdminUser(currentUser);
  const myBranch = useMemo(() => branchOf(currentUser), [currentUser]);

  const stationsToShow = useMemo(() => {
    if (isAdmin) return STATIONS;
    return myBranch ? [myBranch] : [];
  }, [isAdmin, myBranch]);

  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());

  const [amounts, setAmounts] = useState({});
  const [dirtyCells, setDirtyCells] = useState(() => new Set());
  const [collapsed, setCollapsed] = useState({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toastMsg, setToastMsg] = useState('');
  const [toastShown, setToastShown] = useState(false);
  const toastTimerRef = useRef(null);
  function toast(msg) {
    setToastMsg(msg);
    setToastShown(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastShown(false), 2600);
  }
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const yearOptions = useMemo(() => {
    const base = today.getFullYear();
    const out = [];
    for (let y = base - 2; y <= base + 3; y++) out.push(y);
    return out;
  }, [today]);

  const days = useMemo(() => {
    const n = daysInMonth(curYear, curMonth);
    const out = [];
    for (let d = 1; d <= n; d++) {
      const date = new Date(curYear, curMonth, d);
      const dISO = toISO(date);
      out.push({
        d,
        iso: dISO,
        dow: date.toLocaleDateString('en-US', { weekday: 'short' }),
        weekend: date.getDay() === 0 || date.getDay() === 6,
        past: dISO < todayISO,
      });
    }
    return out;
  }, [curYear, curMonth, todayISO]);

  function valFor(station, catId, dISO, past) {
    const k = `${station}__${catId}__${dISO}`;
    if (k in amounts) return amounts[k];
    return past ? '0' : '';
  }
  function numFor(station, catId, dISO, past) {
    const n = parseFloat(valFor(station, catId, dISO, past));
    return isNaN(n) ? 0 : n;
  }
  function handleCellChange(station, catId, dISO, value) {
    const k = `${station}__${catId}__${dISO}`;
    setAmounts((prev) => ({ ...prev, [k]: value }));
    setDirtyCells((prev) => {
      const next = new Set(prev);
      next.add(k);
      return next;
    });
  }
  function handleCellFocus(e) { e.target.select(); }

  useEffect(() => {
    if (stationsToShow.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const next = {};
      try {
        for (const st of stationsToShow) {
          const url =
            `${LOAD_ENDPOINT}?station=${encodeURIComponent(st)}` +
            `&year=${curYear}&month=${curMonth + 1}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${st}`);
          const data = await res.json();
          if (cancelled) return;
          (data.entries || []).forEach((entry) => {
            const dISO = isoDateOnly(entry.expense_date);
            if (!dISO) return;
            CATEGORIES.forEach((cat) => {
              const raw = entry[cat.id];
              const v = raw === null || raw === undefined ? '' : String(parseFloat(raw));
              next[`${st}__${cat.id}__${dISO}`] = v;
            });
          });
        }
        if (!cancelled) {
          setAmounts(next);
          setDirtyCells(new Set());
        }
      } catch (e) {
        if (!cancelled) toast('Failed to load month data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curYear, curMonth, isAdmin, myBranch]);

  const totals = useMemo(() => {
    const dateGrand = {};
    days.forEach((d) => (dateGrand[d.iso] = 0));

    const catDayTotals = {};
    const catMonthTotals = {};
    const stationMonthTotals = {};
    let grandMonth = 0;

    CATEGORIES.forEach((cat) => {
      catDayTotals[cat.id] = {};
      days.forEach((d) => (catDayTotals[cat.id][d.iso] = 0));
      catMonthTotals[cat.id] = 0;

      stationsToShow.forEach((st) => {
        let stTotal = 0;
        days.forEach((day) => {
          const v = numFor(st, cat.id, day.iso, day.past);
          catDayTotals[cat.id][day.iso] += v;
          dateGrand[day.iso] += v;
          stTotal += v;
        });
        stationMonthTotals[`${st}__${cat.id}`] = stTotal;
        catMonthTotals[cat.id] += stTotal;
        grandMonth += stTotal;
      });
    });

    return { dateGrand, catDayTotals, catMonthTotals, stationMonthTotals, grandMonth };
  }, [amounts, days, stationsToShow]);

  const anyOpen = CATEGORIES.some((c) => !collapsed[c.id]);
  function toggleCat(id) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function handleCollapseAll() {
    const next = {};
    CATEGORIES.forEach((c) => (next[c.id] = anyOpen));
    setCollapsed(next);
  }

  async function handleSave() {
    if (dirtyCells.size === 0) {
      toast('No changes to save');
      return;
    }

    const pairs = new Set();
    dirtyCells.forEach((key) => {
      const parts = key.split('__');
      if (parts.length !== 3) return;
      const [st, , date] = parts;
      pairs.add(`${st}__${date}`);
    });

    const byStation = {};
    pairs.forEach((pair) => {
      const [st, date] = pair.split('__');
      const past = date < todayISO;
      const entry = { expense_date: date };
      CATEGORIES.forEach((cat) => {
        entry[cat.id] = numFor(st, cat.id, date, past);
      });
      if (!byStation[st]) byStation[st] = [];
      byStation[st].push(entry);
    });

    setSaving(true);
    try {
      const results = await Promise.all(
        Object.entries(byStation).map(async ([st, entries]) => {
          const res = await fetch(SAVE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ station: st, entries }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status} (${st})`);
          return res.json();
        })
      );
      setDirtyCells(new Set());
      const count = results.reduce((n, r) => n + (r.saved_count || 0), 0);
      toast(`Saved ${count} ${count === 1 ? 'entry' : 'entries'} ✓`);
    } catch (err) {
      toast(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function renderInputCell(station, catId, day) {
    const key = `${station}__${catId}__${day.iso}`;
    const rawVal = valFor(station, catId, day.iso, day.past);
    const num = parseFloat(rawVal);
    const isNonZero = rawVal !== '' && !isNaN(num) && num !== 0;
    const isDirty = dirtyCells.has(key);

    const cls = [
      'exg-cell',
      isNonZero ? 'exg-cell-nonzero' : 'exg-cell-zero',
      isDirty ? 'exg-cell-dirty' : '',
    ].filter(Boolean).join(' ');

    return (
      <td key={day.iso} className={`exg-day${day.weekend ? ' exg-weekend' : ''}`}>
        <input
          className={cls}
          inputMode="decimal"
          value={rawVal}
          onChange={(e) => handleCellChange(station, catId, day.iso, e.target.value)}
          onFocus={handleCellFocus}
        />
      </td>
    );
  }

  if (!isAdmin && !myBranch) {
    return (
      <div className={`exg-wrap ${themeClass}`}>
        <div className="exg-top">
          <div className="exg-brand">
            <div className="exg-logo"><FaWallet /></div>
            <div>
              <h1 className="exg-title">EXPENSES</h1>
              <div className="exg-sub">Monthly grid</div>
            </div>
          </div>
        </div>
        <div className="exg-card">
          <div className="exg-empty">
            <h3>Branch not configured</h3>
            <p>Your account is not mapped to a branch yet. Please contact the administrator.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`exg-wrap ${themeClass}`}>
      <div className="exg-top">
        <div className="exg-brand">
          <div className="exg-logo"><FaWallet /></div>
          <div>
            <h1 className="exg-title">EXPENSES</h1>
            <div className="exg-sub">
              {isAdmin
                ? 'All branches — daily costs by category'
                : `${myBranch} branch — daily costs by category`}
            </div>
          </div>
        </div>

        <div className="exg-controls">
          <button
            type="button"
            className="exg-btn exg-theme-toggle"
            onClick={onToggleTheme}
            title={lightMode ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {lightMode ? <FaMoon /> : <FaSun />}
            <span>{lightMode ? 'Dark' : 'Light'}</span>
          </button>
          <select
            className="exg-select"
            aria-label="Month"
            value={curMonth}
            onChange={(e) => setCurMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            className="exg-select"
            aria-label="Year"
            value={curYear}
            onChange={(e) => setCurYear(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {isAdmin && (
            <button
              type="button"
              className="exg-btn"
              onClick={handleCollapseAll}
              title="Collapse / expand all categories"
            >
              <FaMinus />
              <span>{anyOpen ? 'Collapse all' : 'Expand all'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="exg-card">
        <div className="exg-scroller">
          <table className="exg-table">
            <thead>
              <tr>
                <th
                  className="exg-colname exg-stick-l"
                  style={{ textAlign: 'left', paddingLeft: 14 }}
                >
                  {isAdmin ? 'CATEGORY · BRANCH' : 'CATEGORY'}
                </th>
                {days.map((day) => (
                  <th
                    key={day.iso}
                    className={`exg-colday exg-daynum${day.weekend ? ' exg-weekend' : ''}`}
                  >
                    {day.d}
                    <span className="exg-dow">{day.dow.toUpperCase()}</span>
                  </th>
                ))}
                <th
                  className="exg-colmtot exg-stick-r"
                  style={{ textAlign: 'right', paddingRight: 14 }}
                >
                  MONTH TOTAL
                </th>
              </tr>
            </thead>

            <tbody>
              <tr className="exg-total-row">
                <td className="exg-stick-l">
                  <div className="exg-namecell">TOTAL</div>
                </td>
                {days.map((day) => (
                  <td key={day.iso} className={`exg-day${day.weekend ? ' exg-weekend' : ''}`}>
                    <div className="exg-tval">
                      {totals.dateGrand[day.iso]
                        ? totals.dateGrand[day.iso].toLocaleString('en-IN')
                        : '0'}
                    </div>
                  </td>
                ))}
                <td className="exg-mtot exg-stick-r">
                  <div className="exg-mtot-val">{inr(totals.grandMonth)}</div>
                </td>
              </tr>

              {CATEGORIES.map((cat) => {
                if (isAdmin) {
                  const isCollapsed = !!collapsed[cat.id];
                  return (
                    <React.Fragment key={cat.id}>
                      <tr className="exg-cat-row">
                        <td className="exg-stick-l">
                          <div className="exg-namecell">
                            <span
                              className="exg-chev"
                              onClick={() => toggleCat(cat.id)}
                              title="Expand / collapse"
                            >
                              {isCollapsed ? <FaChevronRight /> : <FaChevronDown />}
                            </span>
                            <span className="exg-dot" style={{ background: cat.color }} />
                            <span>{cat.name}</span>
                          </div>
                        </td>
                        {days.map((day) => (
                          <td
                            key={day.iso}
                            className={`exg-day${day.weekend ? ' exg-weekend' : ''}`}
                          >
                            <div className={`exg-cval ${totals.catDayTotals[cat.id][day.iso] ? 'exg-cval-nonzero' : 'exg-cval-zero'}`}>
                              {totals.catDayTotals[cat.id][day.iso]
                                ? totals.catDayTotals[cat.id][day.iso].toLocaleString('en-IN')
                                : '0'}
                            </div>
                          </td>
                        ))}
                        <td className="exg-mtot exg-stick-r">
                          <div className="exg-mtot-val">{inr(totals.catMonthTotals[cat.id])}</div>
                        </td>
                      </tr>

                      {!isCollapsed && stationsToShow.map((st, si) => (
                        <tr
                          key={`${cat.id}__${st}`}
                          className={`exg-exp-row${si % 2 === 1 ? ' exg-exp-row-alt' : ''}`}
                        >
                          <td className="exg-stick-l">
                            <div className="exg-namecell exg-namecell-child">
                              <span className="exg-bar" style={{ background: cat.color }} />
                              <span>{st}</span>
                            </div>
                          </td>
                          {days.map((day) => renderInputCell(st, cat.id, day))}
                          <td className="exg-mtot exg-stick-r">
                            <div className="exg-mtot-val">
                              {inr(totals.stationMonthTotals[`${st}__${cat.id}`] || 0)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                }

                const st = stationsToShow[0];
                return (
                  <tr key={cat.id} className="exg-cat-row exg-cat-row-emp">
                    <td className="exg-stick-l">
                      <div className="exg-namecell">
                        <span className="exg-dot" style={{ background: cat.color }} />
                        <span>{cat.name}</span>
                      </div>
                    </td>
                    {days.map((day) => renderInputCell(st, cat.id, day))}
                    <td className="exg-mtot exg-stick-r">
                      <div className="exg-mtot-val">
                        {inr(totals.stationMonthTotals[`${st}__${cat.id}`] || 0)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="exg-footer">
        <div className="exg-grand">
          Month total<b>{inr(totals.grandMonth)}</b>
          {loading && (
            <span style={{ marginLeft: 12, color: 'var(--muted)' }}>· loading…</span>
          )}
          {dirtyCells.size > 0 && (
            <span style={{ marginLeft: 12, color: 'var(--amber)' }}>
              · {dirtyCells.size} unsaved {dirtyCells.size === 1 ? 'cell' : 'cells'}
            </span>
          )}
        </div>
        <button
          type="button"
          className="exg-btn exg-btn-amber exg-btn-save"
          onClick={handleSave}
          disabled={saving || dirtyCells.size === 0}
        >
          <FaSave />
          <span>{saving ? 'Saving…' : 'Submit'}</span>
        </button>
      </div>

      <div className={`exg-toast${toastShown ? ' exg-toast-show' : ''}`}>{toastMsg}</div>
    </div>
  );
}
