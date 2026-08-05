import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FaWallet,
  FaPlus,
  FaSave,
  FaPen,
  FaTrashAlt,
  FaChevronDown,
  FaChevronRight,
  FaMinus,
} from 'react-icons/fa';
import './ExpenseManagement.css';

/* ============================================================================
   CONFIG — wire this to the Node/Express backend
   ---------------------------------------------------------------------------
   SAVE_ENDPOINT : POST target. Payload shape is documented in buildPayload().
   LOAD_ENDPOINT : optional GET target, called whenever the month changes.
   Add auth headers (e.g. from js-cookie) inside handleSave() / loadMonth()
   once the real API route is confirmed.
   ========================================================================== */
const SAVE_ENDPOINT = 'http://43.230.202.198:3000/api/expenses/save';
const LOAD_ENDPOINT = null; // e.g. 'http://43.230.202.198:3000/api/expenses?month=YYYY-MM'

const MAX_CATEGORIES = 20;
const MAX_EXPENSES = 50;

const PALETTE = [
  '#ef5f6b', '#4aa8ff', '#a06bff', '#37c2a0', '#f5b342', '#ff8a5c',
  '#5cc8ff', '#c86bff', '#6bd18a', '#ff6b9d', '#8ad15c', '#d1a05c',
  '#5cd1c8', '#b05cff', '#ff9a5c', '#5c8aff', '#d15c8a', '#9ad15c',
  '#5cd18a', '#d1c85c',
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ---- Date / number helpers ------------------------------------------------ */
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

const SEED_CATEGORIES = [{ id: 'cat-rent', name: 'Rent', color: PALETTE[0] }];
const SEED_EXPENSES = [
  { id: 'exp-indore', categoryId: 'cat-rent', name: 'Indore' },
  { id: 'exp-raipur', categoryId: 'cat-rent', name: 'Raipur' },
];

export default function ExpenseManagement() {
  const todayRef = useRef(new Date());
  const today = todayRef.current;
  const todayISO = toISO(today);

  const [curYear, setCurYear] = useState(today.getFullYear());
  const [curMonth, setCurMonth] = useState(today.getMonth());

  const [categories, setCategories] = useState(SEED_CATEGORIES);
  const [expenses, setExpenses] = useState(SEED_EXPENSES);
  const [amounts, setAmounts] = useState({}); // `${expId}__${dateISO}` -> string
  const [collapsed, setCollapsed] = useState({}); // categoryId -> bool

  const uidRef = useRef(1);
  const nid = () => 'x' + uidRef.current++;

  const yearOptions = useMemo(() => {
    const base = today.getFullYear();
    const out = [];
    for (let y = base - 2; y <= base + 3; y++) out.push(y);
    return out;
  }, [today]);

  /* ---- Category modal ---- */
  const catDialogRef = useRef(null);
  const catNameRef = useRef(null);
  const [catName, setCatName] = useState('');
  const [catError, setCatError] = useState('');

  /* ---- Expense modal ---- */
  const expDialogRef = useRef(null);
  const expNameRef = useRef(null);
  const [expCategoryId, setExpCategoryId] = useState('');
  const [expName, setExpName] = useState('');
  const [expError, setExpError] = useState('');

  /* ---- Rename modal ---- */
  const renameDialogRef = useRef(null);
  const renameInputRef = useRef(null);
  const [renameTarget, setRenameTarget] = useState(null); // { type: 'cat' | 'exp', id }
  const [renameTitle, setRenameTitle] = useState('Rename');
  const [renameLabel, setRenameLabel] = useState('Name');
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');

  /* ---- Save / toast ---- */
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

  function valFor(expId, dISO, past) {
    const k = expId + '__' + dISO;
    if (k in amounts) return amounts[k];
    return past ? '0' : '';
  }
  function numFor(expId, dISO, past) {
    const n = parseFloat(valFor(expId, dISO, past));
    return isNaN(n) ? 0 : n;
  }

  /* ---- Totals ---- */
  const totals = useMemo(() => {
    const dateGrand = {};
    days.forEach((d) => (dateGrand[d.iso] = 0));
    let grandMonth = 0;
    const catDayTotals = {};
    const catMonthTotals = {};
    const expMonthTotals = {};

    categories.forEach((cat) => {
      const kids = expenses.filter((e) => e.categoryId === cat.id);
      const dayMap = {};
      let catMonth = 0;

      days.forEach((day) => {
        let sub = 0;
        kids.forEach((exp) => (sub += numFor(exp.id, day.iso, day.past)));
        dayMap[day.iso] = sub;
        dateGrand[day.iso] += sub;
        catMonth += sub;
      });

      catDayTotals[cat.id] = dayMap;
      catMonthTotals[cat.id] = catMonth;
      grandMonth += catMonth;

      kids.forEach((exp) => {
        let em = 0;
        days.forEach((day) => (em += numFor(exp.id, day.iso, day.past)));
        expMonthTotals[exp.id] = em;
      });
    });

    return { dateGrand, grandMonth, catDayTotals, catMonthTotals, expMonthTotals };
  }, [categories, expenses, amounts, days]);

  /* ---- Cell editing ---- */
  function handleCellChange(expId, dISO, value) {
    setAmounts((prev) => ({ ...prev, [expId + '__' + dISO]: value }));
  }
  function handleCellFocus(e) {
    e.target.select();
  }

  /* ---- Collapse / expand ---- */
  function toggleCat(id) {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  }
  const anyOpen = categories.some((c) => !collapsed[c.id]);
  function handleCollapseAll() {
    const next = {};
    categories.forEach((c) => (next[c.id] = anyOpen));
    setCollapsed(next);
  }

  /* ---- Category CRUD ---- */
  function openCatModal() {
    setCatName('');
    setCatError('');
    catDialogRef.current?.showModal();
    setTimeout(() => catNameRef.current?.focus(), 0);
  }
  function saveCategory() {
    const name = catName.trim();
    if (!name) return setCatError('Enter a category name.');
    if (categories.length >= MAX_CATEGORIES) return setCatError(`Limit reached (${MAX_CATEGORIES} categories).`);
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return setCatError('That category already exists.');
    }
    setCategories((prev) => [...prev, { id: nid(), name, color: PALETTE[prev.length % PALETTE.length] }]);
    catDialogRef.current?.close();
  }
  function deleteCategory(id) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const kidCount = expenses.filter((e) => e.categoryId === id).length;
    const msg = `Delete category "${cat.name}"${kidCount ? ` and its ${kidCount} expense${kidCount > 1 ? 's' : ''}` : ''}?`;
    if (!window.confirm(msg)) return;
    setExpenses((prev) => prev.filter((e) => e.categoryId !== id));
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setCollapsed((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  /* ---- Expense CRUD ---- */
  function openExpModal(preselectCatId) {
    if (categories.length === 0) return toast('Add a category first.');
    setExpCategoryId(preselectCatId || categories[0].id);
    setExpName('');
    setExpError('');
    expDialogRef.current?.showModal();
    setTimeout(() => expNameRef.current?.focus(), 0);
  }
  function saveExpense() {
    const name = expName.trim();
    if (!expCategoryId) return setExpError('Choose a category.');
    if (!name) return setExpError('Enter an expense name.');
    if (expenses.length >= MAX_EXPENSES) return setExpError(`Limit reached (${MAX_EXPENSES} expenses).`);
    setExpenses((prev) => [...prev, { id: nid(), categoryId: expCategoryId, name }]);
    setCollapsed((prev) => ({ ...prev, [expCategoryId]: false }));
    expDialogRef.current?.close();
  }
  function deleteExpense(id) {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;
    if (!window.confirm(`Delete expense "${exp.name}"? Its logged amounts for this month will be cleared on save.`)) return;
    setAmounts((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(id + '__')) delete next[k];
      });
      return next;
    });
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  /* ---- Rename (category or expense) ---- */
  function openEditCat(id) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    setRenameTarget({ type: 'cat', id });
    setRenameTitle('Rename category');
    setRenameLabel('Category name');
    setRenameValue(cat.name);
    setRenameError('');
    renameDialogRef.current?.showModal();
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
  }
  function openEditExp(id) {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;
    setRenameTarget({ type: 'exp', id });
    setRenameTitle('Rename expense');
    setRenameLabel('Expense name');
    setRenameValue(exp.name);
    setRenameError('');
    renameDialogRef.current?.showModal();
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
  }
  function saveRename() {
    const name = renameValue.trim();
    if (!name) return setRenameError('Enter a name.');
    if (!renameTarget) return;
    if (renameTarget.type === 'cat') {
      if (categories.some((c) => c.id !== renameTarget.id && c.name.toLowerCase() === name.toLowerCase())) {
        return setRenameError('That category name already exists.');
      }
      setCategories((prev) => prev.map((c) => (c.id === renameTarget.id ? { ...c, name } : c)));
    } else {
      setExpenses((prev) => prev.map((e) => (e.id === renameTarget.id ? { ...e, name } : e)));
    }
    setRenameTarget(null);
    renameDialogRef.current?.close();
  }

  /* ---- Save to database ---- */
  function buildPayload() {
    const rows = [];
    expenses.forEach((exp) => {
      days.forEach((day) => {
        rows.push({
          expenseId: exp.id,
          categoryId: exp.categoryId,
          date: day.iso,
          amount: numFor(exp.id, day.iso, day.past),
        });
      });
    });
    return {
      month: `${curYear}-${pad(curMonth + 1)}`,
      categories: categories.map((c) => ({ id: c.id, name: c.name, color: c.color })),
      expenses: expenses.map((e) => ({ id: e.id, categoryId: e.categoryId, name: e.name })),
      amounts: rows,
    };
  }
  async function handleSave() {
    if (categories.length === 0) return toast('Nothing to save yet.');
    const payload = buildPayload();
    setSaving(true);
    try {
      const res = await fetch(SAVE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      toast('Saved to database ✓');
    } catch (err) {
      console.log('POST ' + SAVE_ENDPOINT + ' failed:', err.message);
      console.log('Payload that would be sent:', payload);
      toast('No backend reachable — payload logged to console');
    } finally {
      setSaving(false);
    }
  }

  /* ---- Optional loader ---- */
  useEffect(() => {
    if (!LOAD_ENDPOINT) return;
    let cancelled = false;
    (async () => {
      try {
        const url = LOAD_ENDPOINT.replace('YYYY-MM', `${curYear}-${pad(curMonth + 1)}`);
        const res = await fetch(url);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.categories) setCategories(data.categories);
        if (data.expenses) setExpenses(data.expenses);
        const nextAmounts = {};
        (data.amounts || []).forEach((r) => {
          nextAmounts[r.expenseId + '__' + r.date] = String(r.amount);
        });
        setAmounts(nextAmounts);
      } catch (e) {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curYear, curMonth]);

  /* ---- Enter-to-submit helper ---- */
  function submitOnEnter(fn) {
    return (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        fn();
      }
    };
  }

  return (
    <div className="exg-wrap">
      <div className="exg-top">
        <div className="exg-brand">
          <div className="exg-logo">
            <FaWallet />
          </div>
          <div>
            <h1 className="exg-title">EXPENSES</h1>
            <div className="exg-sub">Monthly grid — daily costs by category across the fleet</div>
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

          <button type="button" className="exg-btn" onClick={handleCollapseAll} title="Collapse / expand all categories">
            <FaMinus />
            <span>{anyOpen ? 'Collapse all' : 'Expand all'}</span>
          </button>

          <button type="button" className="exg-btn" onClick={openCatModal} disabled={categories.length >= MAX_CATEGORIES}>
            <FaPlus />
            <span>Add category</span>
            <span className="exg-cap">{categories.length}/{MAX_CATEGORIES}</span>
          </button>

          <button
            type="button"
            className="exg-btn exg-btn-amber"
            onClick={() => openExpModal()}
            disabled={expenses.length >= MAX_EXPENSES}
          >
            <FaPlus />
            <span>Add expense</span>
            <span className="exg-cap exg-cap-dark">{expenses.length}/{MAX_EXPENSES}</span>
          </button>
        </div>
      </div>

      <div className="exg-card">
        <div className="exg-scroller">
          <table className="exg-table">
            <thead>
              <tr>
                <th className="exg-colname exg-stick-l" style={{ textAlign: 'left', paddingLeft: 14 }}>
                  CATEGORY · EXPENSE
                </th>
                {days.map((day) => (
                  <th key={day.iso} className={`exg-colday exg-daynum${day.weekend ? ' exg-weekend' : ''}`}>
                    {day.d}
                    <span className="exg-dow">{day.dow.toUpperCase()}</span>
                  </th>
                ))}
                <th className="exg-colmtot exg-stick-r" style={{ textAlign: 'right', paddingRight: 14 }}>
                  MONTH TOTAL
                </th>
              </tr>
            </thead>

            <tbody>
              {categories.length === 0 && (
                <tr>
                  <td className="exg-stick-l" colSpan={days.length + 2}>
                    <div className="exg-empty">
                      <h3>No categories yet</h3>
                      <p>Add a category (like Rent or Fuel), then add expenses inside it to start logging.</p>
                      <button type="button" className="exg-btn exg-btn-amber" onClick={openCatModal}>
                        Add your first category
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {categories.length > 0 && (
                <tr className="exg-total-row">
                  <td className="exg-stick-l">
                    <div className="exg-namecell">TOTAL</div>
                  </td>
                  {days.map((day) => (
                    <td key={day.iso} className={`exg-day${day.weekend ? ' exg-weekend' : ''}`}>
                      <div className="exg-tval">
                        {totals.dateGrand[day.iso] ? totals.dateGrand[day.iso].toLocaleString('en-IN') : '0'}
                      </div>
                    </td>
                  ))}
                  <td className="exg-mtot exg-stick-r">
                    <div className="exg-mtot-val">{inr(totals.grandMonth)}</div>
                  </td>
                </tr>
              )}

              {categories.map((cat) => {
                const kids = expenses.filter((e) => e.categoryId === cat.id);
                const isCollapsed = !!collapsed[cat.id];
                return (
                  <React.Fragment key={cat.id}>
                    <tr className="exg-cat-row">
                      <td className="exg-stick-l">
                        <div className="exg-namecell">
                          <span className="exg-chev" onClick={() => toggleCat(cat.id)} title="Expand / collapse">
                            {isCollapsed ? <FaChevronRight /> : <FaChevronDown />}
                          </span>
                          <span className="exg-dot" style={{ background: cat.color }} />
                          <span>{cat.name}</span>
                          <span className="exg-catcount">{kids.length}</span>
                          <span className="exg-rowbtn">
                            <button type="button" className="exg-icon" title={`Add expense to ${cat.name}`} onClick={() => openExpModal(cat.id)}>
                              <FaPlus />
                            </button>
                            <button type="button" className="exg-icon" title="Rename category" onClick={() => openEditCat(cat.id)}>
                              <FaPen />
                            </button>
                            <button type="button" className="exg-icon exg-icon-del" title="Delete category" onClick={() => deleteCategory(cat.id)}>
                              <FaTrashAlt />
                            </button>
                          </span>
                        </div>
                      </td>
                      {days.map((day) => (
                        <td key={day.iso} className={`exg-day${day.weekend ? ' exg-weekend' : ''}`}>
                          <div className="exg-cval">
                            {totals.catDayTotals[cat.id][day.iso] ? totals.catDayTotals[cat.id][day.iso].toLocaleString('en-IN') : '0'}
                          </div>
                        </td>
                      ))}
                      <td className="exg-mtot exg-stick-r">
                        <div className="exg-mtot-val">{inr(totals.catMonthTotals[cat.id])}</div>
                      </td>
                    </tr>

                    {!isCollapsed && kids.map((exp) => (
                      <tr className="exg-exp-row" key={exp.id}>
                        <td className="exg-stick-l">
                          <div className="exg-namecell exg-namecell-child">
                            <span className="exg-bar" style={{ background: cat.color }} />
                            <span>{exp.name}</span>
                            <span className="exg-rowbtn">
                              <button type="button" className="exg-icon" title="Rename expense" onClick={() => openEditExp(exp.id)}>
                                <FaPen />
                              </button>
                              <button type="button" className="exg-icon exg-icon-del" title="Delete expense" onClick={() => deleteExpense(exp.id)}>
                                <FaTrashAlt />
                              </button>
                            </span>
                          </div>
                        </td>
                        {days.map((day) => {
                          const key = exp.id + '__' + day.iso;
                          const entered = key in amounts;
                          const isDefaulted = !entered && day.past;
                          return (
                            <td key={day.iso} className={`exg-day${day.weekend ? ' exg-weekend' : ''}`}>
                              <input
                                className={`exg-cell${isDefaulted ? ' exg-cell-def' : ''}`}
                                inputMode="decimal"
                                value={valFor(exp.id, day.iso, day.past)}
                                onChange={(e) => handleCellChange(exp.id, day.iso, e.target.value)}
                                onFocus={handleCellFocus}
                              />
                            </td>
                          );
                        })}
                        <td className="exg-mtot exg-stick-r">
                          <div className="exg-mtot-val">{inr(totals.expMonthTotals[exp.id] || 0)}</div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="exg-footer">
        <div className="exg-grand">
          Month total<b>{inr(totals.grandMonth)}</b>
        </div>
        <button type="button" className="exg-btn exg-btn-amber exg-btn-save" onClick={handleSave} disabled={saving}>
          <FaSave />
          <span>{saving ? 'Saving…' : 'Save to database'}</span>
        </button>
      </div>

      {/* Add category dialog */}
      <dialog ref={catDialogRef} className="exg-dialog">
        <div className="exg-dlg-h">New category</div>
        <div className="exg-dlg-b">
          <div className="exg-field">
            <label htmlFor="exg-cat-name">Category name (e.g. Rent, Fuel, Salaries)</label>
            <input
              id="exg-cat-name"
              ref={catNameRef}
              maxLength={40}
              placeholder="Rent"
              autoComplete="off"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              onKeyDown={submitOnEnter(saveCategory)}
            />
          </div>
        </div>
        <div className="exg-dlg-err">{catError}</div>
        <div className="exg-dlg-f">
          <button type="button" className="exg-btn" onClick={() => catDialogRef.current?.close()}>Cancel</button>
          <button type="button" className="exg-btn exg-btn-amber" onClick={saveCategory}>Add category</button>
        </div>
      </dialog>

      {/* Add expense dialog */}
      <dialog ref={expDialogRef} className="exg-dialog">
        <div className="exg-dlg-h">New expense</div>
        <div className="exg-dlg-b">
          <div className="exg-field">
            <label htmlFor="exg-exp-cat">Category</label>
            <select id="exg-exp-cat" value={expCategoryId} onChange={(e) => setExpCategoryId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="exg-field">
            <label htmlFor="exg-exp-name">Expense name (e.g. Rent – Indore, Rent – Raipur)</label>
            <input
              id="exg-exp-name"
              ref={expNameRef}
              maxLength={50}
              placeholder="Rent – Indore"
              autoComplete="off"
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
              onKeyDown={submitOnEnter(saveExpense)}
            />
          </div>
        </div>
        <div className="exg-dlg-err">{expError}</div>
        <div className="exg-dlg-f">
          <button type="button" className="exg-btn" onClick={() => expDialogRef.current?.close()}>Cancel</button>
          <button type="button" className="exg-btn exg-btn-amber" onClick={saveExpense}>Add expense</button>
        </div>
      </dialog>

      {/* Rename dialog */}
      <dialog ref={renameDialogRef} className="exg-dialog">
        <div className="exg-dlg-h">{renameTitle}</div>
        <div className="exg-dlg-b">
          <div className="exg-field">
            <label htmlFor="exg-rename-input">{renameLabel}</label>
            <input
              id="exg-rename-input"
              ref={renameInputRef}
              maxLength={50}
              autoComplete="off"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={submitOnEnter(saveRename)}
            />
          </div>
        </div>
        <div className="exg-dlg-err">{renameError}</div>
        <div className="exg-dlg-f">
          <button type="button" className="exg-btn" onClick={() => renameDialogRef.current?.close()}>Cancel</button>
          <button type="button" className="exg-btn exg-btn-amber" onClick={saveRename}>Save name</button>
        </div>
      </dialog>

      <div className={`exg-toast${toastShown ? ' exg-toast-show' : ''}`}>{toastMsg}</div>
    </div>
  );
}
