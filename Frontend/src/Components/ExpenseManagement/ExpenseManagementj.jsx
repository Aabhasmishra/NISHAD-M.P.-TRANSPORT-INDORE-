import React, { useState, useMemo } from 'react';
import {
  FaMoneyBillWave,
  FaGasPump,
  FaUsers,
  FaTaxi,
  FaRoad,
  FaWrench,
  FaBuilding,
  FaShieldAlt,
  FaEllipsisH,
  FaPlus,
  FaTrash,
  FaEdit,
  FaRoute,
  FaSearch,
  FaTimes,
} from 'react-icons/fa';
import './ExpenseManagement.css';

const CATEGORY_PRESETS = [
  { id: 'salary', label: 'Salaries', frequency: 'monthly', Icon: FaMoneyBillWave },
  { id: 'petrol', label: 'Petrol', frequency: 'weekly', Icon: FaGasPump },
  { id: 'hammali', label: 'Hammali', frequency: 'daily', Icon: FaUsers },
  { id: 'rickshaw', label: 'Auto Rickshaw Fare', frequency: 'daily', Icon: FaTaxi },
  { id: 'toll', label: 'Toll Tax', frequency: 'daily', Icon: FaRoad },
  { id: 'maintenance', label: 'Vehicle Maintenance', frequency: 'monthly', Icon: FaWrench },
  { id: 'rent', label: 'Office Rent', frequency: 'monthly', Icon: FaBuilding },
  { id: 'insurance', label: 'Insurance', frequency: 'monthly', Icon: FaShieldAlt },
  { id: 'misc', label: 'Miscellaneous', frequency: 'daily', Icon: FaEllipsisH },
];

const FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

const FILTERS = [{ id: 'all', label: 'All' }, ...FREQUENCIES];

function toISODate(d) {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${da}`;
}

function startOfWeek(d) {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7; // Monday = 0
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatAmount(n) {
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function formatDateLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const SEED_EXPENSES = [
  { id: 'seed-1', categoryId: 'salary', label: 'Salaries', frequency: 'monthly', amount: 145000, date: toISODate(new Date()), note: 'Staff salary - August' },
  { id: 'seed-2', categoryId: 'petrol', label: 'Petrol', frequency: 'weekly', amount: 6200, date: toISODate(new Date()), note: 'Fleet refuel' },
  { id: 'seed-3', categoryId: 'hammali', label: 'Hammali', frequency: 'daily', amount: 850, date: toISODate(new Date()), note: 'Loading - Vijay Nagar godown' },
  { id: 'seed-4', categoryId: 'rickshaw', label: 'Auto Rickshaw Fare', frequency: 'daily', amount: 220, date: toISODate(new Date()), note: 'Local delivery run' },
  { id: 'seed-5', categoryId: 'toll', label: 'Toll Tax', frequency: 'daily', amount: 540, date: toISODate(new Date(Date.now() - 86400000)), note: 'Dewas Naka toll' },
  { id: 'seed-6', categoryId: 'maintenance', label: 'Vehicle Maintenance', frequency: 'monthly', amount: 8200, date: toISODate(new Date(Date.now() - 2 * 86400000)), note: 'Truck MP09-GT-4521 tyre change' },
];

const emptyForm = {
  selectedPreset: CATEGORY_PRESETS[0].id,
  customLabel: '',
  frequency: CATEGORY_PRESETS[0].frequency,
  amount: '',
  date: toISODate(new Date()),
  note: '',
};

export default function ExpenseManagement() {
  const [expenses, setExpenses] = useState(SEED_EXPENSES);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const isCustom = form.selectedPreset === 'custom';

  const totals = useMemo(() => {
    const now = new Date();
    const todayISO = toISODate(now);
    const weekStart = startOfWeek(now);
    const monthPrefix = todayISO.slice(0, 7);

    let today = 0;
    let week = 0;
    let month = 0;
    let allTime = 0;

    expenses.forEach((exp) => {
      const expDate = new Date(exp.date + 'T00:00:00');
      if (exp.date === todayISO) today += exp.amount;
      if (expDate >= weekStart) week += exp.amount;
      if (exp.date.slice(0, 7) === monthPrefix) month += exp.amount;
      allTime += exp.amount;
    });

    return { today, week, month, allTime };
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    let list = activeFilter === 'all'
      ? expenses
      : expenses.filter((e) => e.frequency === activeFilter);

    if (searchTerm.trim() !== '') {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (e) => e.label.toLowerCase().includes(q) || e.note.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [expenses, activeFilter, searchTerm]);

  function iconForCategory(categoryId) {
    const preset = CATEGORY_PRESETS.find((p) => p.id === categoryId);
    return preset ? preset.Icon : FaEllipsisH;
  }

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setIsModalOpen(true);
  }

  function openEditModal(exp) {
    const preset = CATEGORY_PRESETS.find((p) => p.id === exp.categoryId);
    setEditingId(exp.id);
    setForm({
      selectedPreset: preset ? preset.id : 'custom',
      customLabel: preset ? '' : exp.label,
      frequency: exp.frequency,
      amount: String(exp.amount),
      date: exp.date,
      note: exp.note,
    });
    setFormError('');
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setFormError('');
  }

  function handlePresetClick(preset) {
    setForm((f) => ({ ...f, selectedPreset: preset.id, frequency: preset.frequency }));
    setFormError('');
  }

  function handleCustomClick() {
    setForm((f) => ({ ...f, selectedPreset: 'custom' }));
    setFormError('');
  }

  function handleSubmit(e) {
    e.preventDefault();

    const numericAmount = parseFloat(form.amount);
    if (!numericAmount || numericAmount <= 0) {
      setFormError('Enter a valid amount');
      return;
    }
    if (isCustom && form.customLabel.trim() === '') {
      setFormError('Enter a category name');
      return;
    }

    const preset = CATEGORY_PRESETS.find((p) => p.id === form.selectedPreset);
    const label = isCustom ? form.customLabel.trim() : preset.label;

    if (editingId) {
      setExpenses((prev) =>
        prev.map((exp) =>
          exp.id === editingId
            ? {
                ...exp,
                categoryId: form.selectedPreset,
                label,
                frequency: form.frequency,
                amount: numericAmount,
                date: form.date,
                note: form.note.trim(),
              }
            : exp
        )
      );
    } else {
      const newExpense = {
        id: `exp-${Date.now()}`,
        categoryId: form.selectedPreset,
        label,
        frequency: form.frequency,
        amount: numericAmount,
        date: form.date,
        note: form.note.trim(),
      };
      setExpenses((prev) => [newExpense, ...prev]);
    }

    closeModal();
  }

  function handleDelete(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="exd-page">
      <div className="exd-header">
        <div className="exd-header-left">
          <div className="exd-header-icon">
            <FaRoute />
          </div>
          <div>
            <h1 className="exd-title">Expenses</h1>
            <p className="exd-subtitle">Daily, weekly and monthly costs across the fleet</p>
          </div>
        </div>
        <button type="button" className="exd-btn-primary" onClick={openAddModal}>
          <FaPlus />
          <span>Add Expense</span>
        </button>
      </div>

      <div className="exd-stats-row">
        <div className="exd-stat-card exd-stat-daily">
          <span className="exd-stat-label">Today</span>
          <span className="exd-stat-amount">{formatAmount(totals.today)}</span>
          <div className="exd-stat-bar" />
        </div>
        <div className="exd-stat-card exd-stat-weekly">
          <span className="exd-stat-label">This Week</span>
          <span className="exd-stat-amount">{formatAmount(totals.week)}</span>
          <div className="exd-stat-bar" />
        </div>
        <div className="exd-stat-card exd-stat-monthly">
          <span className="exd-stat-label">This Month</span>
          <span className="exd-stat-amount">{formatAmount(totals.month)}</span>
          <div className="exd-stat-bar" />
        </div>
        <div className="exd-stat-card exd-stat-total">
          <span className="exd-stat-label">Total Logged</span>
          <span className="exd-stat-amount">{formatAmount(totals.allTime)}</span>
          <div className="exd-stat-bar" />
        </div>
      </div>

      <div className="exd-manifest">
        <div className="exd-manifest-tear" aria-hidden="true" />

        <div className="exd-toolbar">
          <div className="exd-search">
            <FaSearch className="exd-search-icon" />
            <input
              type="text"
              placeholder="Search by category or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="exd-filter-tabs">
            {FILTERS.map((f) => (
              <button
                type="button"
                key={f.id}
                className={`exd-filter-tab${activeFilter === f.id ? ' exd-filter-tab-active' : ''}`}
                onClick={() => setActiveFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="exd-result-count">{filteredExpenses.length} entries</span>
        </div>

        <div className="exd-table">
          <div className="exd-table-head">
            <span className="exd-col-cat">Category</span>
            <span className="exd-col-freq">Frequency</span>
            <span className="exd-col-date">Date</span>
            <span className="exd-col-note">Note</span>
            <span className="exd-col-amount">Amount</span>
            <span className="exd-col-actions">Actions</span>
          </div>

          {filteredExpenses.length === 0 && (
            <div className="exd-empty">
              <FaRoute className="exd-empty-icon" />
              <p>No expenses match this view.</p>
            </div>
          )}

          {filteredExpenses.map((exp) => {
            const Icon = iconForCategory(exp.categoryId);
            return (
              <div key={exp.id} className={`exd-table-row exd-row-${exp.frequency}`}>
                <span className="exd-col-cat">
                  <span className={`exd-row-icon exd-row-icon-${exp.frequency}`}>
                    <Icon />
                  </span>
                  {exp.label}
                </span>
                <span className="exd-col-freq">
                  <span className={`exd-freq-tag exd-freq-tag-${exp.frequency}`}>{exp.frequency}</span>
                </span>
                <span className="exd-col-date">{formatDateLabel(exp.date)}</span>
                <span className="exd-col-note exd-note-text">{exp.note || '—'}</span>
                <span className="exd-col-amount">{formatAmount(exp.amount)}</span>
                <span className="exd-col-actions">
                  <button type="button" className="exd-icon-btn" aria-label="Edit expense" onClick={() => openEditModal(exp)}>
                    <FaEdit />
                  </button>
                  <button type="button" className="exd-icon-btn exd-icon-btn-danger" aria-label="Delete expense" onClick={() => handleDelete(exp.id)}>
                    <FaTrash />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="exd-modal-overlay" onClick={closeModal}>
          <div className="exd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exd-modal-header">
              <h2>{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
              <button type="button" className="exd-modal-close" onClick={closeModal} aria-label="Close">
                <FaTimes />
              </button>
            </div>

            <form className="exd-modal-form" onSubmit={handleSubmit}>
              <div className="exd-modal-grid">
                <div className="exd-modal-col">
                  <span className="exd-form-label">Category</span>
                  <div className="exd-presets">
                    {CATEGORY_PRESETS.map((preset) => {
                      const { Icon } = preset;
                      const active = form.selectedPreset === preset.id;
                      return (
                        <button
                          type="button"
                          key={preset.id}
                          className={`exd-preset-chip${active ? ' exd-preset-chip-active' : ''}`}
                          onClick={() => handlePresetClick(preset)}
                        >
                          <Icon className="exd-preset-icon" />
                          <span>{preset.label}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={`exd-preset-chip${isCustom ? ' exd-preset-chip-active' : ''}`}
                      onClick={handleCustomClick}
                    >
                      <FaPlus className="exd-preset-icon" />
                      <span>Other</span>
                    </button>
                  </div>

                  {isCustom && (
                    <div className="exd-field">
                      <label className="exd-form-label" htmlFor="exd-custom-label">Category name</label>
                      <input
                        id="exd-custom-label"
                        className="exd-input"
                        type="text"
                        placeholder="e.g. Tyre puncture repair"
                        value={form.customLabel}
                        onChange={(e) => setForm((f) => ({ ...f, customLabel: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="exd-field">
                    <span className="exd-form-label">Frequency</span>
                    <div className="exd-freq-toggle">
                      {FREQUENCIES.map((f) => (
                        <button
                          type="button"
                          key={f.id}
                          className={`exd-freq-btn exd-freq-${f.id}${form.frequency === f.id ? ' exd-freq-btn-active' : ''}`}
                          onClick={() => setForm((prev) => ({ ...prev, frequency: f.id }))}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="exd-modal-col">
                  <div className="exd-field">
                    <label className="exd-form-label" htmlFor="exd-amount">Amount</label>
                    <input
                      id="exd-amount"
                      className="exd-input exd-input-amount"
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    />
                  </div>

                  <div className="exd-field">
                    <label className="exd-form-label" htmlFor="exd-date">Date</label>
                    <input
                      id="exd-date"
                      className="exd-input"
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    />
                  </div>

                  <div className="exd-field">
                    <label className="exd-form-label" htmlFor="exd-note">Note (optional)</label>
                    <input
                      id="exd-note"
                      className="exd-input"
                      type="text"
                      placeholder="e.g. Vijay Nagar godown loading"
                      value={form.note}
                      onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    />
                  </div>

                  {formError && <p className="exd-form-error">{formError}</p>}
                </div>
              </div>

              <div className="exd-modal-actions">
                <button type="button" className="exd-btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="exd-btn-primary">
                  {editingId ? 'Save Changes' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
