import { useState, useEffect, useRef } from 'react';
import "./FreightPayment.css";
import BASE_URL from "../../config";
import PopupAlert from '../PopupAlert/PopupAlert';

// Build a fresh row object for a given challan number using the DB snapshot.
// driver_name / driver_pan are intentionally NOT sourced from the challan anymore
// — they're derived at render time from the transporter cache.
const buildRowFromChallan = (challanNo, map) => {
  const data = map[challanNo];
  return {
    challan_no: challanNo,
    exists: !!data,
    vehicle: data?.truck_no || '',
    weight: data?.weight || '',
    rate: data?.rate || '',
    total_freight: data?.total_freight || '',
    advance: data?.advance || '',
    deduction: data?.deduction || '',
    freight_raipur: data?.freight_raipur || '',
    transaction_date: data?.transaction_date
      ? String(data.transaction_date).split('T')[0]
      : '',
    transaction_id: data?.transaction_id || '',
    bulk_wt: data?.bulk_wt || '',
    other_wt: data?.other_wt || '',
    to_pay: data?.to_pay || '',
    paid: data?.paid || '',
    isDirty: false,
  };
};

const FreightPayment = ({ isLightMode, currentUser }) => {
  const [rows, setRows] = useState([]);              // currently visible rows
  const [allNumbers, setAllNumbers] = useState([]);  // full descending list
  const [challanMap, setChallanMap] = useState({});  // challan_no -> challan record
  const [transporterCache, setTransporterCache] = useState({}); // truck_no -> { owner_name, id_number }
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const tableContainerRef = useRef(null);

  const [alert, setAlert] = useState({ message: '', type: 'info', show: false });
  const showAlert = (message, type = 'info') => setAlert({ message, type, show: true });
  const hideAlert = () => setAlert({ message: '', type: 'info', show: false });

  // ---------- number formatting helpers ----------
  const cleanNum = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    if (isNaN(num)) return null;
    const rounded = parseFloat(num.toFixed(2));
    return rounded === 0 ? null : rounded;
  };
  const inputVal = (val) => cleanNum(val) ?? '';
  const displayVal = (val) => cleanNum(val) ?? '-';

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${d.getFullYear()}`;
  };

  // ---------- Load every challan once on mount ----------
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/challan`);
        if (!res.ok) throw new Error('Failed to load challans.');
        const all = await res.json();
        if (cancelled) return;

        const map = {};
        let maxNum = 0;
        let detectedPrefix = '';
        all.forEach(c => {
          if (!c.challan_no) return;
          map[c.challan_no] = c;
          const m = c.challan_no.match(/^(\d{2})CH(\d+)$/);
          if (m) {
            const num = parseInt(m[2], 10);
            if (num > maxNum) {
              maxNum = num;
              detectedPrefix = `${m[1]}CH`;
            }
          }
        });

        setChallanMap(map);

        if (maxNum === 0) {
          setAllNumbers([]);
          return;
        }

        const numbers = [];
        for (let i = maxNum; i >= 1; i--) {
          numbers.push(`${detectedPrefix}${i.toString().padStart(5, '0')}`);
        }
        setAllNumbers(numbers);
      } catch (err) {
        if (!cancelled) showAlert(err.message, 'error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Rebuild visible rows whenever the pool or visibleCount changes ----------
  useEffect(() => {
    if (allNumbers.length === 0) return;
    setRows(prev => {
      const byNo = new Map(prev.map(r => [r.challan_no, r]));
      return allNumbers
        .slice(0, visibleCount)
        .map(no => byNo.get(no) || buildRowFromChallan(no, challanMap));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allNumbers, visibleCount, challanMap]);

  // ---------- Fetch all transporters once, build a truck_no -> driver map ----------
  // Uses /transporters/all (always returns 200). Individual missing trucks never
  // hit the network, so no 404s show up in the console for unknown vehicles.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/transporters/all`);
        if (!res.ok) return;                     // silent — no console noise
        const all = await res.json();
        if (cancelled) return;

        const cache = {};
        all.forEach(t => {
          if (!t.vehicle_number) return;
          // vehicle_number can be a concatenated string like "MH12AB1234 | MH12CD5678"
          t.vehicle_number.split(' | ').forEach(v => {
            const key = v.trim();
            if (key) {
              cache[key] = {
                owner_name: t.owner_name || 'NA',
                id_number: t.id_number || 'NA',
              };
            }
          });
        });
        setTransporterCache(cache);
      } catch {
        // Swallow — driver name/PAN will just render as 'NA'
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------- Derived driver info (read-only, from transporter cache) ----------
  const getDriverName = (row) => {
    if (!row.vehicle) return 'NA';
    return transporterCache[row.vehicle]?.owner_name || 'NA';
  };
  const getDriverPan = (row) => {
    if (!row.vehicle) return 'NA';
    return transporterCache[row.vehicle]?.id_number || 'NA';
  };

  // ---------- Infinite scroll: add 5 more when near bottom ----------
  const handleTableScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      if (visibleCount < allNumbers.length) {
        setVisibleCount(prev => Math.min(prev + 5, allNumbers.length));
      }
    }
  };

  // ---------- Cell edits ----------
  const handleChange = (challanNo, field, value) => {
    setRows(prev =>
      prev.map(r =>
        r.challan_no === challanNo
          ? { ...r, [field]: value, isDirty: true }
          : r
      )
    );
  };

  // ---------- Per-row derived values ----------
  const getRowCalculated = (row) => {
    const totalFreight  = Number(row.total_freight) || 0;
    const advance       = Number(row.advance) || 0;
    const deduction     = Number(row.deduction) || 0;
    const freightRaipur = Number(row.freight_raipur) || 0;
    const balanceIndore = totalFreight - advance - deduction - freightRaipur;

    const toPay = Number(row.to_pay) || 0;
    const paid  = Number(row.paid) || 0;
    const totalAmount = toPay + paid;
    const pl = totalAmount - totalFreight;
    return { balanceIndore, totalAmount, pl };
  };

  const totals = rows.reduce((t, row) => {
    const { balanceIndore, totalAmount, pl } = getRowCalculated(row);
    t.weight         += Number(row.weight) || 0;
    t.total_freight  += Number(row.total_freight) || 0;
    t.advance        += Number(row.advance) || 0;
    t.deduction      += Number(row.deduction) || 0;
    t.freight_raipur += Number(row.freight_raipur) || 0;
    t.balance_indore += balanceIndore;
    t.bulk_wt        += Number(row.bulk_wt) || 0;
    t.other_wt       += Number(row.other_wt) || 0;
    t.to_pay         += Number(row.to_pay) || 0;
    t.paid           += Number(row.paid) || 0;
    t.total_amount   += totalAmount;
    t.pl             += pl;
    return t;
  }, {
    weight: 0, total_freight: 0, advance: 0, deduction: 0, freight_raipur: 0,
    balance_indore: 0, bulk_wt: 0, other_wt: 0, to_pay: 0, paid: 0,
    total_amount: 0, pl: 0
  });

  const dirtyCount = rows.filter(r => r.isDirty).length;

  // ---------- Save only the rows the user actually touched ----------
  const handleSave = async () => {
    const dirtyRows = rows.filter(r => r.isDirty && r.exists);
    if (dirtyRows.length === 0) {
      showAlert('No changes to save.', 'info');
      return;
    }
    setIsSaving(true);
    try {
      for (const row of dirtyRows) {
        const { balanceIndore, pl } = getRowCalculated(row);
        const payload = {
          // driver_pan is now sourced from the transporter backend
          // (falls back to 'NA' when the transporter is not on file).
          driver_pan: getDriverPan(row),
          weight:         row.weight || 0,
          rate:           row.rate || 0,
          total_freight:  row.total_freight || 0,
          advance:        row.advance || 0,
          deduction:      row.deduction || 0,
          freight_raipur: row.freight_raipur || 0,
          balance_indore: balanceIndore,
          transaction_date: row.transaction_date || null,
          transaction_id:   row.transaction_id,
          bulk_wt:  row.bulk_wt || 0,
          other_wt: row.other_wt || 0,
          to_pay:   row.to_pay || 0,
          paid:     row.paid || 0,
          plpl:     pl,
          freight_created_at: new Date().toISOString(),
        };

        const res = await fetch(`${BASE_URL}/challan/${row.challan_no}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(`Failed to save freight for ${row.challan_no}.`);
      }

      setRows(prev => prev.map(r => r.isDirty ? { ...r, isDirty: false } : r));
      showAlert(`Saved ${dirtyRows.length} row(s) successfully.`, 'success');
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper for numeric input cells
  const renderNumberInput = (row, field) => (
    <input
      type="number"
      value={inputVal(row[field])}
      onChange={(e) => handleChange(row.challan_no, field, e.target.value)}
      disabled={!row.exists}
      className={`fr-table-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
    />
  );

  return (
    <>
      <div className={`fr-main-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
        <PopupAlert
          message={alert.message}
          type={alert.type}
          duration={5000}
          onClose={hideAlert}
          isLightMode={isLightMode}
          position="top-right"
        />

        {/* ---------- Header ---------- */}
        <div className="fr-page-header">
          <div className="fr-page-header-left">
            <h2 className={`fr-page-title ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
              Freight Payment
            </h2>
          </div>
          <div className="fr-page-header-right">
            {dirtyCount > 0 && (
              <span className={`fr-dirty-badge ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                {dirtyCount} edited
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || dirtyCount === 0}
              className={`fr-submit-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
            >
              {isSaving ? 'Saving...' : 'Save Freight Payment'}
            </button>
          </div>
        </div>

        <div className={`fr-divider ${isLightMode ? 'light-mode' : 'dark-mode'}`}></div>

        {/* ---------- Table (owns its own scrollbars) ---------- */}
        <div className={`fr-table-card ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
          <div
            className="fr-table-container"
            ref={tableContainerRef}
            onScroll={handleTableScroll}
          >
            <table className={`fr-table ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
              <thead>
                <tr className={`fr-table-header ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                  <th>Index</th>
                  <th>Challan No</th>
                  <th>Vehicle</th>
                  <th>Driver Name</th>
                  <th>Driver PAN</th>
                  <th>Weight</th>
                  <th>Rate</th>
                  <th>Total Freight</th>
                  <th>Advance</th>
                  <th>Deduction</th>
                  <th>Freight Raipur</th>
                  <th>Balance Indore</th>
                  <th>Txn Date</th>
                  <th>Txn ID</th>
                  <th>Bulk Wt</th>
                  <th>Other Wt</th>
                  <th>To Pay</th>
                  <th>Paid</th>
                  <th>Total Amount</th>
                  <th>P/L</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const { balanceIndore, totalAmount, pl } = getRowCalculated(row);
                  const isMissing = !row.exists;
                  return (
                    <tr
                      key={row.challan_no}
                      className={
                        `fr-table-row ${isLightMode ? 'light-mode' : 'dark-mode'}` +
                        `${isMissing ? ' fr-row-missing' : ''}` +
                        `${row.isDirty ? ' fr-row-dirty' : ''}`
                      }
                    >
                      <td className="text-center">{index + 1}</td>
                      <td className="text-center">{row.challan_no}</td>
                      <td className="text-center">{row.vehicle || '-'}</td>

                      {/* Driver name — sourced from transporter backend, read-only */}
                      <td className="text-center">{getDriverName(row)}</td>

                      {/* Driver PAN — sourced from transporter backend, read-only */}
                      <td className="text-center">{getDriverPan(row)}</td>

                      <td>{renderNumberInput(row, 'weight')}</td>
                      <td>{renderNumberInput(row, 'rate')}</td>
                      <td>{renderNumberInput(row, 'total_freight')}</td>
                      <td>{renderNumberInput(row, 'advance')}</td>
                      <td>{renderNumberInput(row, 'deduction')}</td>
                      <td>{renderNumberInput(row, 'freight_raipur')}</td>

                      <td className={`text-center fr-auto-calc ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                        {displayVal(balanceIndore)}
                      </td>

                      <td>
                        <input
                          type="date"
                          value={row.transaction_date}
                          onChange={(e) => handleChange(row.challan_no, 'transaction_date', e.target.value)}
                          disabled={isMissing}
                          className={`fr-table-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={row.transaction_id}
                          onChange={(e) => handleChange(row.challan_no, 'transaction_id', e.target.value)}
                          disabled={isMissing}
                          className={`fr-table-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                        />
                      </td>

                      <td>{renderNumberInput(row, 'bulk_wt')}</td>
                      <td>{renderNumberInput(row, 'other_wt')}</td>
                      <td>{renderNumberInput(row, 'to_pay')}</td>
                      <td>{renderNumberInput(row, 'paid')}</td>

                      <td className={`text-center fr-auto-calc ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                        {displayVal(totalAmount)}
                      </td>
                      <td className={`text-center fr-auto-calc ${pl < 0 ? 'fr-negative' : 'fr-positive'} ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                        {displayVal(pl)}
                      </td>
                    </tr>
                  );
                })}

                {rows.length > 0 && (
                  <tr className={`fr-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                    <td className="text-center">Total</td>
                    <td colSpan="4"></td>
                    <td className="text-center">{displayVal(totals.weight)}</td>
                    <td></td>
                    <td className="text-center">{displayVal(totals.total_freight)}</td>
                    <td className="text-center">{displayVal(totals.advance)}</td>
                    <td className="text-center">{displayVal(totals.deduction)}</td>
                    <td className="text-center">{displayVal(totals.freight_raipur)}</td>
                    <td className="text-center">{displayVal(totals.balance_indore)}</td>
                    <td colSpan="2"></td>
                    <td className="text-center">{displayVal(totals.bulk_wt)}</td>
                    <td className="text-center">{displayVal(totals.other_wt)}</td>
                    <td className="text-center">{displayVal(totals.to_pay)}</td>
                    <td className="text-center">{displayVal(totals.paid)}</td>
                    <td className="text-center">{displayVal(totals.total_amount)}</td>
                    <td className="text-center">{displayVal(totals.pl)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="fr-loading-overlay">
          <div className={`fr-loading-spinner ${isLightMode ? 'light-mode' : 'dark-mode'}`}></div>
        </div>
      )}
    </>
  );
};

export default FreightPayment;
