import { useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import "./FreightPayment.css";
import BASE_URL from "../../config";
import PopupAlert from '../PopupAlert/PopupAlert';

// Normalize for case/whitespace-safe matching.
const normalizeTruckNo = (t) => (t || '').toString().trim().toUpperCase();

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
    to_pay: data?.to_pay || '',
    paid: data?.paid || '',
    crossing: data?.crossing || '',
    isDirty: false,
  };
};

const FreightPayment = ({ isLightMode, currentUser }) => {
  const [rows, setRows] = useState([]);
  const [allNumbers, setAllNumbers] = useState([]);
  const [challanMap, setChallanMap] = useState({});
  const [transporterCache, setTransporterCache] = useState({}); // truck -> {owner_name, id_number}

  // Map<normalizedTruckNo, fullVehicleNumberStringFromDB>
  // null while /transporters/all is still loading.
  const [knownTrucks, setKnownTrucks] = useState(null);

  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [recentlySaved, setRecentlySaved] = useState(false);
  const tableContainerRef = useRef(null);

  const rowsRef = useRef([]);
  const saveTimersRef = useRef({});
  const fetchedTrucksRef = useRef(new Set()); // dedupe transporter lookups

  useEffect(() => { rowsRef.current = rows; }, [rows]);

  const [alert, setAlert] = useState({ message: '', type: 'info', show: false });
  const showAlert = (message, type = 'info') => setAlert({ message, type, show: true });
  const hideAlert = () => setAlert({ message: '', type: 'info', show: false });

  // ---------- number helpers ----------
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

  // ---------- Load challans once ----------
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

        if (maxNum === 0) { setAllNumbers([]); return; }

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

  // ---------- Rebuild visible rows ----------
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

  // ---------- STEP 1: Fetch /transporters/all → build map of known trucks ----------
  // Map: normalizedTruckNo -> full vehicle_number string as stored in DB.
  // Storing the full string lets us call /transporters?search=<full-string>
  // later, which uniquely identifies the record (avoids LIKE-substring
  // matching picking the wrong transporter).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/transporters/all`);
        if (!res.ok) { if (!cancelled) setKnownTrucks(new Map()); return; }
        const all = await res.json();
        if (cancelled) return;

        const map = new Map();
        all.forEach(t => {
          if (!t.vehicle_number) return;
          t.vehicle_number.split(' | ').forEach(v => {
            const key = normalizeTruckNo(v);
            if (key && !map.has(key)) {
              map.set(key, t.vehicle_number); // full concatenated string
            }
          });
        });
        setKnownTrucks(map);
      } catch {
        if (!cancelled) setKnownTrucks(new Map());
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------- STEP 2: For each visible truck, fetch full details ----------
  // Only fires for trucks we KNOW exist (from STEP 1), so no 404s ever occur.
  // Trucks not in the map are marked NA immediately, no network call.
  useEffect(() => {
    if (knownTrucks === null) return;

    const visibleTrucks = [...new Set(
      rows.map(r => normalizeTruckNo(r.vehicle)).filter(Boolean)
    )];

    const toFetch = [];
    const naTrucks = [];

    visibleTrucks.forEach(t => {
      if (fetchedTrucksRef.current.has(t)) return;   // already handled
      if (knownTrucks.has(t)) toFetch.push(t);
      else naTrucks.push(t);
    });

    // Mark non-existent trucks as NA right away (no fetch, no 404)
    if (naTrucks.length > 0) {
      const patch = {};
      naTrucks.forEach(t => {
        patch[t] = { owner_name: 'NA', id_number: 'NA' };
        fetchedTrucksRef.current.add(t);
      });
      setTransporterCache(prev => ({ ...prev, ...patch }));
    }

    if (toFetch.length === 0) return;
    toFetch.forEach(t => fetchedTrucksRef.current.add(t));

    (async () => {
      const results = {};
      await Promise.all(toFetch.map(async (truck) => {
        // Use the exact full vehicle_number string as the search term so the
        // backend's LIKE '%term%' matches exactly one record.
        const fullString = knownTrucks.get(truck);
        try {
          const res = await fetch(
            `${BASE_URL}/transporters?search=${encodeURIComponent(fullString)}`
          );
          if (res.ok) {
            const data = await res.json();
            results[truck] = {
              owner_name: data.owner_name || 'NA',
              id_number: data.id_number || 'NA',
            };
          } else {
            results[truck] = { owner_name: 'NA', id_number: 'NA' };
          }
        } catch {
          results[truck] = { owner_name: 'NA', id_number: 'NA' };
        }
      }));
      setTransporterCache(prev => ({ ...prev, ...results }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, knownTrucks]);

  // ---------- Derived driver info ----------
  const getDriverName = (row) => {
    const key = normalizeTruckNo(row.vehicle);
    if (!key) return 'NA';
    return transporterCache[key]?.owner_name || 'NA';
  };
  const getDriverPan = (row) => {
    const key = normalizeTruckNo(row.vehicle);
    if (!key) return 'NA';
    return transporterCache[key]?.id_number || 'NA';
  };

  // ---------- Infinite scroll ----------
  const handleTableScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
      if (visibleCount < allNumbers.length) {
        setVisibleCount(prev => Math.min(prev + 5, allNumbers.length));
      }
    }
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
    const crossing = Number(row.crossing) || 0;
    const pl = totalAmount - totalFreight - crossing;
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
    t.to_pay         += Number(row.to_pay) || 0;
    t.paid           += Number(row.paid) || 0;
    t.total_amount   += totalAmount;
    t.crossing       += Number(row.crossing) || 0;
    t.pl             += pl;
    return t;
  }, {
    weight: 0, total_freight: 0, advance: 0, deduction: 0, freight_raipur: 0,
    balance_indore: 0, to_pay: 0, paid: 0, total_amount: 0, crossing: 0, pl: 0
  });

  // ---------- Auto-save (debounced per row, silent) ----------
  const saveRowNow = async (challanNo) => {
    const row = rowsRef.current.find(r => r.challan_no === challanNo);
    if (!row || !row.exists) return;

    const { balanceIndore, pl } = getRowCalculated(row);
    const payload = {
      weight:         row.weight || 0,
      rate:           row.rate || 0,
      total_freight:  row.total_freight || 0,
      advance:        row.advance || 0,
      deduction:      row.deduction || 0,
      freight_raipur: row.freight_raipur || 0,
      balance_indore: balanceIndore,
      transaction_date: row.transaction_date || null,
      transaction_id:   row.transaction_id,
      to_pay:   row.to_pay || 0,
      paid:     row.paid || 0,
      crossing: row.crossing || 0,
      plpl:     pl,
      freight_created_at: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${BASE_URL}/challan/${challanNo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('save failed');

      setRows(prev => prev.map(r =>
        r.challan_no === challanNo ? { ...r, isDirty: false } : r
      ));
      setRecentlySaved(true);
      setTimeout(() => setRecentlySaved(false), 1500);
    } catch {
      console.error(`Auto-save failed for ${challanNo}`);
    }
  };

  const scheduleRowSave = (challanNo) => {
    if (saveTimersRef.current[challanNo]) {
      clearTimeout(saveTimersRef.current[challanNo]);
    }
    saveTimersRef.current[challanNo] = setTimeout(() => {
      saveRowNow(challanNo);
      delete saveTimersRef.current[challanNo];
    }, 900);
  };

  const handleChange = (challanNo, field, value) => {
    setRows(prev =>
      prev.map(r =>
        r.challan_no === challanNo
          ? { ...r, [field]: value, isDirty: true }
          : r
      )
    );
    scheduleRowSave(challanNo);
  };

  useEffect(() => {
    return () => {
      Object.keys(saveTimersRef.current).forEach(no => {
        clearTimeout(saveTimersRef.current[no]);
        saveRowNow(no);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Excel download (no totals row) ----------
  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'MP Transport';
      wb.created = new Date();
      const ws = wb.addWorksheet('Freight Payment', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      ws.columns = [
        { header: 'Index',           key: 'index',            width: 7  },
        { header: 'Challan No',      key: 'challan_no',       width: 14 },
        { header: 'Vehicle',         key: 'vehicle',          width: 14 },
        { header: 'Driver Name',     key: 'driver_name',      width: 22 },
        { header: 'Driver PAN',      key: 'driver_pan',       width: 15 },
        { header: 'Weight',          key: 'weight',           width: 11 },
        { header: 'Rate',            key: 'rate',             width: 11 },
        { header: 'Total Freight',   key: 'total_freight',    width: 13 },
        { header: 'Advance',         key: 'advance',          width: 11 },
        { header: 'Deduction',       key: 'deduction',        width: 11 },
        { header: 'Freight Raipur',  key: 'freight_raipur',   width: 13 },
        { header: 'Balance Indore',  key: 'balance_indore',   width: 13 },
        { header: 'Txn Date',        key: 'transaction_date', width: 13 },
        { header: 'Txn ID',          key: 'transaction_id',   width: 16 },
        { header: 'To Pay',          key: 'to_pay',           width: 11 },
        { header: 'Paid',            key: 'paid',             width: 11 },
        { header: 'Total',           key: 'total_amount',     width: 11 },
        { header: 'Crossing',        key: 'crossing',         width: 11 },
        { header: 'P/L',             key: 'pl',               width: 11 },
      ];

      const headerRow = ws.getRow(1);
      headerRow.height = 26;
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FF4C1D95' } },
          left:   { style: 'thin', color: { argb: 'FF4C1D95' } },
          bottom: { style: 'thin', color: { argb: 'FF4C1D95' } },
          right:  { style: 'thin', color: { argb: 'FF4C1D95' } },
        };
      });

      const rowsByNo = new Map(rows.map(r => [r.challan_no, r]));
      const exportRows = allNumbers.map(no =>
        rowsByNo.get(no) || buildRowFromChallan(no, challanMap)
      );

      exportRows.forEach((row, i) => {
        const { balanceIndore, totalAmount, pl } = getRowCalculated(row);
        const excelRow = ws.addRow({
          index: i + 1,
          challan_no: row.challan_no,
          vehicle: row.vehicle || '-',
          driver_name: getDriverName(row),
          driver_pan: getDriverPan(row),
          weight: cleanNum(row.weight) ?? '',
          rate: cleanNum(row.rate) ?? '',
          total_freight: cleanNum(row.total_freight) ?? '',
          advance: cleanNum(row.advance) ?? '',
          deduction: cleanNum(row.deduction) ?? '',
          freight_raipur: cleanNum(row.freight_raipur) ?? '',
          balance_indore: cleanNum(balanceIndore) ?? '',
          transaction_date: row.transaction_date ? formatDateForDisplay(row.transaction_date) : '',
          transaction_id: row.transaction_id || '',
          to_pay: cleanNum(row.to_pay) ?? '',
          paid: cleanNum(row.paid) ?? '',
          total_amount: cleanNum(totalAmount) ?? '',
          crossing: cleanNum(row.crossing) ?? '',
          pl: cleanNum(pl) ?? '',
        });
        excelRow.height = 20;
        excelRow.alignment = { vertical: 'middle', horizontal: 'center' };

        if (i % 2 === 0) {
          excelRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F5FF' } };
          });
        }

        const plCell = excelRow.getCell('pl');
        plCell.font = { bold: true, color: { argb: pl < 0 ? 'FFDC2626' : 'FF059669' } };

        excelRow.eachCell(cell => {
          cell.border = {
            top:    { style: 'thin', color: { argb: 'FFEDE9FE' } },
            left:   { style: 'thin', color: { argb: 'FFEDE9FE' } },
            bottom: { style: 'thin', color: { argb: 'FFEDE9FE' } },
            right:  { style: 'thin', color: { argb: 'FFEDE9FE' } },
          };
        });
      });

      // Filename: Freight_DD-MM-YYYY.xlsx
      const today = new Date();
      const dd   = String(today.getDate()).padStart(2, '0');
      const mm   = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const filename = `Freight_${dd}-${mm}-${yyyy}.xlsx`;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      showAlert('Failed to export Excel: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

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

        <div className="fr-page-header">
          <div className="fr-page-header-left">
            <h2 className={`fr-page-title ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
              Freight Payment
            </h2>
            {/* <span className={`fr-row-count ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
              Showing {rows.length} of {allNumbers.length} challans
            </span> */}
            {/* {recentlySaved && (
              <span className={`fr-autosave-hint ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                ✓ Auto-saved
              </span>
            )} */}
          </div>
          <div className="fr-page-header-right">
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isExporting || rows.length === 0}
              className={`fr-download-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
            >
              {isExporting ? 'Exporting...' : 'Download Excel'}
            </button>
          </div>
        </div>

        <div className={`fr-divider ${isLightMode ? 'light-mode' : 'dark-mode'}`}></div>

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
                  <th>To Pay</th>
                  <th>Paid</th>
                  <th>Total</th>
                  <th>Crossing</th>
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
                      <td className="text-center">{getDriverName(row)}</td>
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

                      <td className="text-center">{row.to_pay ? Number(row.to_pay).toString() : '-'}</td>
                      <td className="text-center">{row.paid ? Number(row.paid).toString() : '-'}</td>

                      <td className={`text-center fr-auto-calc ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                        {displayVal(totalAmount)}
                      </td>

                      <td>{renderNumberInput(row, 'crossing')}</td>

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
                    <td className="text-center">{displayVal(totals.to_pay)}</td>
                    <td className="text-center">{displayVal(totals.paid)}</td>
                    <td className="text-center">{displayVal(totals.total_amount)}</td>
                    <td className="text-center">{displayVal(totals.crossing)}</td>
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
