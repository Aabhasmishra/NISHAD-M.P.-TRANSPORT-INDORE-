import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FaWallet,
  FaSave,
  FaChevronDown,
  FaChevronRight,
  FaMinus,
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
   USER → BRANCH MAP   ⬅ EDIT THIS LIST LATER
   ---------------------------------------------------------------------------
   Key   : any of the user's identifiers (name / mobile / username / identifier)
   Value : 'Indore' or 'Raipur'
   Admin users (currentUser.type === 'Admin') bypass this map entirely.
   ========================================================================== */
const USER_BRANCH_MAP = {
  // 'ramesh':     'Indore',
  // '9876543210': 'Raipur',
  // 'suresh':     'Indore',
  'nmpt01': 'Indore',
  'nmpt02': 'Raipur'
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

/* ---------------------------------------------------------------------------
   Robust date parsing for what the backend sends back.

   Problem: node-pg parses a PostgreSQL DATE as `new Date(y, m-1, d)` in the
   SERVER's local timezone. JSON.stringify converts that to a UTC ISO string.
   e.g. PG 2026-09-18 on an IST server → "2026-09-17T18:30:00.000Z".
   Blindly slicing 10 chars yields the wrong day.

   Fix: if it's a plain "YYYY-MM-DD" string, trust it as-is. Otherwise parse
   it as a Date and read the LOCAL year/month/day, which restores the original
   calendar day assuming the browser is in the same TZ as the server.

   (The cleanest permanent fix is to make the backend return a plain
   YYYY-MM-DD string — e.g. `TO_CHAR(expense_date, 'YYYY-MM-DD')` in the
   SELECT. Do that when convenient and this helper becomes a no-op.)
   ------------------------------------------------------------------------- */
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
function branchOf(user) {
  if (!user) return null;
  const keys = [user.name, user.mobile, user.identifier, user.username]
    .filter(Boolean)
    .map((s) => String(s).trim());
  for (const k of keys) if (USER_BRANCH_MAP[k]) return USER_BRANCH_MAP[k];
  return null;
}

/* ============================================================================
   Outer shell — handles auth. Shows LoginSignup when there is no session.
   ========================================================================== */
export default function ExpenseManagement({ currentUser: propUser }) {
  const [internalUser, setInternalUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (propUser) { setAuthChecked(true); return; }
    const raw = Cookies.get('userData');
    if (raw) {
      try { setInternalUser(JSON.parse(raw)); } catch { /* ignore */ }
    }
    setAuthChecked(true);
  }, [propUser]);

  const user = propUser || internalUser;

  if (!authChecked) return null;

  if (!user) {
    return (
      <div className="exg-wrap exg-auth-wrap">
        <LoginSignup
          onLoginSuccess={(u) => {
            Cookies.set('userData', JSON.stringify(u), { expires: 3 / 24 });
            setInternalUser(u);
          }}
        />
      </div>
    );
  }

  return <ExpenseGrid currentUser={user} />;
}

/* ============================================================================
   Grid
   ========================================================================== */
function ExpenseGrid({ currentUser }) {
  const todayRef = useRef(new Date());
  const today = todayRef.current;
  const todayISO = toISO(today);

  const isAdmin = isAdminUser(currentUser);
  const myBranch = useMemo(() => branchOf(currentUser), [currentUser]);

  const stationsToShow = useMemo(() => {
    if (isAdmin) return STATIONS;
    return myBranch ? [myBranch] : [];
  }, [isAdmin, myBranch]);

  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());

  // key: `${station}__${catId}__${dateISO}` -> string
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

  /* ---- Days of the selected month ---- */
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

  /* ---- Cell value helpers ---- */
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

  /* ---- Load month when it changes (or the user's branch changes) ---- */
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

  /* ---- Totals ---- */
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

  /* ---- Collapse / expand (admin only) ---- */
  const anyOpen = CATEGORIES.some((c) => !collapsed[c.id]);
  function toggleCat(id) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  function handleCollapseAll() {
    const next = {};
    CATEGORIES.forEach((c) => (next[c.id] = anyOpen));
    setCollapsed(next);
  }

  /* ---- Submit: only (station, date) rows that were touched ---- */
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

  /* ---- Helper: render one editable input cell ---- */
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

  /* ---- Employee with no branch mapping ---- */
  if (!isAdmin && !myBranch) {
    return (
      <div className="exg-wrap">
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

  /* ---- Render ---- */
  return (
    <div className="exg-wrap">
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

          {/* Collapse / Expand: admin only */}
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
              {/* Grand total row — both admin and employee */}
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
                /* ----------------------------- ADMIN ----------------------------- */
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

                /* --------------------------- EMPLOYEE ---------------------------- */
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
