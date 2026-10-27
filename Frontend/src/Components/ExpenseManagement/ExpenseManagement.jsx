import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  FaWallet,
  FaChevronDown,
  FaChevronRight,
  FaMinus,
  FaSun,
  FaMoon,
  FaLock,
} from 'react-icons/fa';
import BASE_URL from '../../config';
import Cookies from 'js-cookie';
import LoginSignup from '../LoginSignup/LoginSignup';
import './ExpenseManagement.css';
import PopupAlert from '../PopupAlert/PopupAlert';

/* ============================================================================
   Endpoints
   ========================================================================== */
const LOAD_ENDPOINT = `${BASE_URL}/expenses`;
const SAVE_ENDPOINT = `${BASE_URL}/expenses`;

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

/* ---- Legacy fallback map ---- */
const USER_BRANCH_MAP = {
  'nmpt01': 'Indore',
  'nmpt02': 'Raipur',
};

/* ---- Helpers ---- */
function toISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function pad(n) { return String(n).padStart(2, '0'); }
function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function inr(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

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
  if (user.branch) return String(user.branch).trim();
  const keys = [user.name, user.mobile, user.mobile_number, user.identifier, user.username]
    .filter(Boolean).map((s) => String(s).trim());
  for (const k of keys) if (USER_BRANCH_MAP[k]) return USER_BRANCH_MAP[k];
  return null;
}

/* ---------------------------------------------------------------------------
   Per-category month-total sentinel helpers.
   A locked value N is stored as N.01 in that category's cell on the 1st.
   ------------------------------------------------------------------------- */
function encodeMonthTotal(total) {
  return Number((Math.round(total) + 0.01).toFixed(2));
}
function decodeMonthTotal(rawValue) {
  if (rawValue === null || rawValue === undefined) return null;
  const v = parseFloat(rawValue);
  if (!isFinite(v) || v <= 0) return null;
  const whole = Math.floor(v);
  const frac = v - whole;
  if (whole <= 0) return null;
  if (Math.abs(frac - 0.01) > 1e-6) return null;
  return whole;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ============================================================================
   Outer shell — auth
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
  const [monthMode, setMonthMode] = useState({});
  const [collapsed, setCollapsed] = useState({});

  /* ---- Manual-entry column state ---- */
  const [manualOpen, setManualOpen] = useState(false);
  const [manualDraft, setManualDraft] = useState({});
  const [savingManual, setSavingManual] = useState({});
  const manualQueueRef = useRef(Promise.resolve());

  function withManualLock(fn) {
    const result = manualQueueRef.current.then(fn, fn);
    manualQueueRef.current = result.then(() => undefined, () => undefined);
    return result;
  }

  /* ---- Popup ---- */
  const [popup, setPopup] = useState({ open: false, message: '', type: 'info' });
  function showPopup(message, type = 'info') { setPopup({ open: true, message, type }); }
  function closePopup() { setPopup((p) => ({ ...p, open: false })); }

  /* ---- Toast (background errors only) ---- */
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

  /* ---- Auto-save plumbing ---- */
  const amountsRef = useRef(amounts);
  const dirtyRef = useRef(dirtyCells);
  const savingRef = useRef(false);
  const saveTimerRef = useRef(null);

  useEffect(() => { amountsRef.current = amounts; }, [amounts]);
  useEffect(() => { dirtyRef.current = dirtyCells; }, [dirtyCells]);

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

  const firstISO = useMemo(
    () => `${curYear}-${pad(curMonth + 1)}-01`,
    [curYear, curMonth]
  );

  /* ---- Value getters ---- */
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
    if (monthMode[station]?.[catId] != null) return;
    const k = `${station}__${catId}__${dISO}`;
    setAmounts((prev) => ({ ...prev, [k]: value }));
    setDirtyCells((prev) => {
      const next = new Set(prev);
      next.add(k);
      return next;
    });
  }
  function handleCellFocus(e) { e.target.select(); }

  /* ---- Silent auto-save ---- */
  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    let guard = 0;
    while (savingRef.current && guard++ < 120) await sleep(50);

    const dirty = new Set(dirtyRef.current);
    if (dirty.size === 0) return;

    const snapshot = {};
    const pairs = new Set();
    dirty.forEach((k) => {
      const parts = k.split('__');
      if (parts.length !== 3) return;
      snapshot[k] = amountsRef.current[k] ?? '';
      pairs.add(`${parts[0]}__${parts[2]}`);
    });
    if (pairs.size === 0) { setDirtyCells(new Set()); return; }

    const byStation = {};
    pairs.forEach((pair) => {
      const [st, date] = pair.split('__');
      const past = date < todayISO;
      const entry = { expense_date: date };
      CATEGORIES.forEach((cat) => {
        const ck = `${st}__${cat.id}__${date}`;
        const raw = ck in amountsRef.current
          ? amountsRef.current[ck]
          : (past ? '0' : '');
        const n = parseFloat(raw);
        entry[cat.id] = isNaN(n) ? 0 : n;
      });
      (byStation[st] = byStation[st] || []).push(entry);
    });

    savingRef.current = true;
    try {
      await Promise.all(
        Object.entries(byStation).map(async ([st, entries]) => {
          const res = await fetch(SAVE_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ station: st, entries }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status} (${st})`);
        })
      );
      setDirtyCells((prev) => {
        const next = new Set(prev);
        Object.entries(snapshot).forEach(([k, v]) => {
          if ((amountsRef.current[k] ?? '') === v) next.delete(k);
        });
        return next;
      });
    } catch (err) {
      toast('Auto-save failed, will retry');
    } finally {
      savingRef.current = false;
      if (dirtyRef.current.size > 0 && !saveTimerRef.current) {
        saveTimerRef.current = setTimeout(() => {
          saveTimerRef.current = null;
          flushSave();
        }, 2500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayISO]);

  useEffect(() => {
    if (dirtyCells.size === 0) return undefined;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      flushSave();
    }, 900);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [dirtyCells, flushSave]);

  /* ---- Load month data ---- */
  useEffect(() => {
    if (stationsToShow.length === 0) return undefined;
    let cancelled = false;
    (async () => {
      const next = {};
      const nextMonthMode = {};
      try {
        for (const st of stationsToShow) {
          const url =
            `${LOAD_ENDPOINT}?station=${encodeURIComponent(st)}` +
            `&year=${curYear}&month=${curMonth + 1}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${st}`);
          const data = await res.json();
          if (cancelled) return;

          const entries = data.entries || [];
          const first = entries.find(
            (e) => isoDateOnly(e.expense_date) === firstISO
          );
          if (first) {
            CATEGORIES.forEach((cat) => {
              const decoded = decodeMonthTotal(first[cat.id]);
              if (decoded != null) {
                if (!nextMonthMode[st]) nextMonthMode[st] = {};
                nextMonthMode[st][cat.id] = decoded;
              }
            });
          }

          entries.forEach((entry) => {
            const dISO = isoDateOnly(entry.expense_date);
            if (!dISO) return;
            CATEGORIES.forEach((cat) => {
              const raw = entry[cat.id];
              const v = raw === null || raw === undefined
                ? ''
                : String(parseFloat(raw));
              next[`${st}__${cat.id}__${dISO}`] = v;
            });
          });
        }
        if (!cancelled) {
          setAmounts(next);
          setMonthMode(nextMonthMode);
          setDirtyCells(new Set());
          setManualDraft({});
        }
      } catch (e) {
        if (!cancelled) toast('Failed to load month data');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curYear, curMonth, isAdmin, myBranch, firstISO]);

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
        const locked = monthMode[st]?.[cat.id];
        if (locked != null) {
          stationMonthTotals[`${st}__${cat.id}`] = locked;
          catMonthTotals[cat.id] += locked;
          return;
        }
        let stTotal = 0;
        days.forEach((day) => {
          const v = numFor(st, cat.id, day.iso, day.past);
          catDayTotals[cat.id][day.iso] += v;
          dateGrand[day.iso] += v;
          stTotal += v;
        });
        stationMonthTotals[`${st}__${cat.id}`] = stTotal;
        catMonthTotals[cat.id] += stTotal;
      });

      grandMonth += catMonthTotals[cat.id];
    });

    return { dateGrand, catDayTotals, catMonthTotals, stationMonthTotals, grandMonth };
  }, [amounts, monthMode, days, stationsToShow]);

  /* ---- Collapse helpers ---- */
  const anyOpen = CATEGORIES.some((c) => !collapsed[c.id]);
  function toggleCat(id) { setCollapsed((prev) => ({ ...prev, [id]: !prev[id] })); }
  function handleCollapseAll() {
    const next = {};
    CATEGORIES.forEach((c) => (next[c.id] = anyOpen));
    setCollapsed(next);
  }

  /* ---- Month / year change ---- */
  async function handleMonthChange(m) { await flushSave(); setCurMonth(m); }
  async function handleYearChange(y) { await flushSave(); setCurYear(y); }

  /* ---- Manual-entry column toggle ---- */
  function handleToggleManual() {
    if (manualOpen) {
      setManualOpen(false);
      setManualDraft({});
      closePopup();
    } else {
      setManualOpen(true);
      showPopup(
        'Entering a total here permanently erases and locks this category\'s daily entries.',
        'info'
      );
    }
  }

  /* ---- Commit one manual month total (0 = unlock) ---- */
  async function commitManual(st, catId) {
    const k = `${st}__${catId}`;
    const draft = manualDraft[k];
    const locked = monthMode[st]?.[catId];

    if (draft === undefined) return;

    const raw = draft.trim();
    if (raw === '') {
      setManualDraft((d) => { const n = { ...d }; delete n[k]; return n; });
      return;
    }

    const amt = Number(raw);
    if (!isFinite(amt) || amt < 0 || Math.abs(amt - Math.round(amt)) > 1e-9) {
      showPopup('Please enter a whole number (0 or more).', 'error');
      return;
    }

    const whole = Math.round(amt);
    const isUnlock = whole === 0;

    if (!isUnlock && locked === whole) {
      setManualDraft((d) => { const n = { ...d }; delete n[k]; return n; });
      return;
    }
    if (isUnlock && locked == null) {
      setManualDraft((d) => { const n = { ...d }; delete n[k]; return n; });
      return;
    }

    await withManualLock(async () => {
      setSavingManual((prev) => ({ ...prev, [k]: true }));

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      let guard = 0;
      while (savingRef.current && guard++ < 120) await sleep(50);

      savingRef.current = true;
      try {
        const base = amountsRef.current;
        const day1 = days[0].iso;
        const day1Value = isUnlock ? 0 : encodeMonthTotal(whole);

        const entries = days.map((day) => {
          const e = { expense_date: day.iso };
          CATEGORIES.forEach((cat) => {
            if (cat.id === catId) {
              e[cat.id] = day.d === 1 ? day1Value : 0;
            } else {
              const ck = `${st}__${cat.id}__${day.iso}`;
              const rawVal = ck in base ? base[ck] : (day.past ? '0' : '');
              const n = parseFloat(rawVal);
              e[cat.id] = isNaN(n) ? 0 : n;
            }
          });
          return e;
        });

        const res = await fetch(SAVE_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ station: st, entries }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const next = {};
        Object.keys(base).forEach((k2) => {
          if (!k2.startsWith(`${st}__${catId}__`)) next[k2] = base[k2];
        });
        if (!isUnlock) {
          next[`${st}__${catId}__${day1}`] = String(day1Value);
        }
        amountsRef.current = next;
        setAmounts(next);

        setMonthMode((prev) => {
          const perStation = { ...(prev[st] || {}) };
          if (isUnlock) delete perStation[catId];
          else perStation[catId] = whole;
          const outer = { ...prev };
          if (Object.keys(perStation).length === 0) delete outer[st];
          else outer[st] = perStation;
          return outer;
        });

        setDirtyCells((prev) => {
          const nx = new Set();
          prev.forEach((dk) => {
            const parts = dk.split('__');
            if (!(parts[0] === st && parts[1] === catId)) nx.add(dk);
          });
          return nx;
        });

        setManualDraft((d) => { const n = { ...d }; delete n[k]; return n; });
      } catch (err) {
        showPopup(`Could not save month total: ${err.message}`, 'error');
      } finally {
        savingRef.current = false;
        setSavingManual((prev) => { const n = { ...prev }; delete n[k]; return n; });
        if (dirtyRef.current.size > 0 && !saveTimerRef.current) {
          saveTimerRef.current = setTimeout(() => {
            saveTimerRef.current = null;
            flushSave();
          }, 400);
        }
      }
    });
  }

  /* ---- Cell rendering ---- */
  function renderCell(st, cat, day) {
    const locked = monthMode[st]?.[cat.id] != null;

    if (locked) {
      return (
        <td
          key={day.iso}
          className={`exg-day${day.weekend ? ' exg-weekend' : ''}`}
        >
          <div className="exg-cell exg-cell-ro exg-cell-nil">
            <span className="exg-nil">—</span>
          </div>
        </td>
      );
    }

    const key = `${st}__${cat.id}__${day.iso}`;
    const rawVal = valFor(st, cat.id, day.iso, day.past);
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
          onChange={(e) => handleCellChange(st, cat.id, day.iso, e.target.value)}
          onFocus={handleCellFocus}
          onBlur={() => { if (dirtyRef.current.size > 0) flushSave(); }}
        />
      </td>
    );
  }

  /* ---- Manual-entry cell ---- */
  function renderManualInput(st, cat) {
    const k = `${st}__${cat.id}`;
    const locked = monthMode[st]?.[cat.id];
    const draft = manualDraft[k];
    const value = draft !== undefined ? draft : (locked != null ? String(locked) : '');
    const saving = !!savingManual[k];

    return (
      <td key={`manual-${st}-${cat.id}`} className="exg-mtot exg-stick-r-2">
        <input
          className="exg-cell"
          inputMode="numeric"
          value={value}
          disabled={saving}
          onChange={(e) =>
            setManualDraft((d) => ({ ...d, [k]: e.target.value }))
          }
          onFocus={handleCellFocus}
          onBlur={() => commitManual(st, cat.id)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
      </td>
    );
  }

  /* ---- Sticky stacking: Month Total sits just left of Manual Entry ---- */
  //  • manual closed → Month Total alone at right edge (exg-stick-r)
  //  • manual open   → Month Total stacked at right: var(--mtot-w) (exg-stick-r-2)
  //                    Manual Entry at right: 0 (exg-stick-r)
  const mtotCellClass = 'exg-mtot exg-stick-r';
  const mtotHeadClass = 'exg-colmtot exg-stick-r';

  /* ---- Branch-not-configured guard ---- */
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

  /* ---- Main render ---- */
  return (
    <div className={`exg-wrap ${themeClass}`}>
      <div className="exg-top">
        <div className="exg-brand">
          <div className="exg-logo"><FaWallet /></div>
          <div>
            <h1 className="exg-title">EXPENSES</h1>
            <div className="exg-sub">
              {isAdmin
                ? 'All branches. Daily costs by category.'
                : `${myBranch} branch. Daily costs by category.`}
            </div>
          </div>
        </div>

        <div className="exg-controls">
          <select
            className="exg-select"
            aria-label="Month"
            value={curMonth}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>

          <select
            className="exg-select"
            aria-label="Year"
            value={curYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            type="button"
            className={`exg-btn${manualOpen ? ' exg-btn-active' : ''}`}
            onClick={handleToggleManual}
            title="Enter whole-month totals per category"
          >
            <span>{manualOpen ? 'Monthly' : 'Daily'}</span>
          </button>

          <button
            type="button"
            className="exg-btn exg-theme-toggle"
            onClick={onToggleTheme}
            title={lightMode ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {lightMode ? <FaMoon /> : <FaSun />}
            <span>{lightMode ? 'Dark' : 'Light'}</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className="exg-btn"
              onClick={handleCollapseAll}
              title="Collapse or expand all categories"
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
                {manualOpen && (
                  <th
                    className="exg-colmtot exg-stick-r-2"
                    style={{ textAlign: 'right', paddingRight: 14 }}
                  >
                    MANUAL ENTRY
                  </th>
                )}
                <th
                  className={mtotHeadClass}
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
                        ? Math.round(totals.dateGrand[day.iso]).toLocaleString('en-IN')
                        : '0'}
                    </div>
                  </td>
                ))}
                {manualOpen && (
                  <td className="exg-mtot exg-stick-r-2" />
                )}
                <td className={mtotCellClass}>
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
                              title="Expand or collapse"
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
                            <div
                              className={`exg-cval ${
                                totals.catDayTotals[cat.id][day.iso]
                                  ? 'exg-cval-nonzero'
                                  : 'exg-cval-zero'
                              }`}
                            >
                              {totals.catDayTotals[cat.id][day.iso]
                                ? Math.round(totals.catDayTotals[cat.id][day.iso]).toLocaleString('en-IN')
                                : '0'}
                            </div>
                          </td>
                        ))}
                        {manualOpen && (
                          <td className="exg-mtot exg-stick-r-2" />
                        )}
                        <td className={mtotCellClass}>
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
                              {monthMode[st]?.[cat.id] != null && (
                                <FaLock
                                  className="exg-rowlock"
                                  title={`${cat.name} is stored as a whole-month total for ${st}`}
                                />
                              )}
                            </div>
                          </td>
                          {days.map((day) => renderCell(st, cat, day))}
                          {manualOpen && renderManualInput(st, cat)}
                          <td className={mtotCellClass}>
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
                        {monthMode[st]?.[cat.id] != null && (
                          <FaLock
                            className="exg-rowlock"
                            title={`${cat.name} is stored as a whole-month total`}
                          />
                        )}
                      </div>
                    </td>
                    {days.map((day) => renderCell(st, cat, day))}
                    {manualOpen && renderManualInput(st, cat)}
                    <td className={mtotCellClass}>
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

      {popup.open && (
        <PopupAlert
          message={popup.message}
          type={popup.type}
          isLightMode={lightMode}
          onClose={closePopup}
          position="top-right"
        />
      )}

      <div className={`exg-toast${toastShown ? ' exg-toast-show' : ''}`}>{toastMsg}</div>
    </div>
  );
}
