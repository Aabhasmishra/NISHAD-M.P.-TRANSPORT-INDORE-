import { useState, useEffect, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ShipmentReportModule = ({ isLightMode, modeOfView }) => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Month / custom state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [previousMonth, setPreviousMonth] = useState(selectedMonth);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const isPBR = modeOfView === 'PBR';

  // Fetch data
  useEffect(() => {
    const fetchRecords = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch('http://43.230.202.198:3000/api/transport-records');
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        let filtered = Array.isArray(data) ? data : [];

        if (!isPBR) {
          filtered = filtered.filter(rec => String(rec.challan_status).toUpperCase().trim() === 'NOT SHIPPED');
        } else {
          filtered = filtered.filter(rec => (parseFloat(rec.paid) || 0) !== 0);
        }
        setRecords(filtered);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecords();
  }, [isPBR]);

  // Helper to get month-year string from date field
  const getMonthYear = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // Generate last 12 months + "Custom" (only for PBR)
  const availableMonths = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
      months.push({ value, label });
    }
    if (isPBR) months.push({ value: 'custom', label: 'Custom' });
    return months;
  }, [isPBR]);

  // Handle month dropdown change
  const handleMonthChange = (e) => {
    const value = e.target.value;
    setSelectedMonth(value);
    if (value === 'custom') {
      setIsCustomRange(true);
    } else {
      setIsCustomRange(false);
      setPreviousMonth(value);
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  // Filter logic – for PBR only
  const filteredRecords = useMemo(() => {
    if (!isPBR) return records;

    if (isCustomRange && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return records.filter(rec => {
        const recDate = new Date(rec.date);
        if (isNaN(recDate.getTime())) return false;
        return recDate >= start && recDate <= end;
      });
    }

    const activeMonth = (isCustomRange && !(customStartDate && customEndDate)) ? previousMonth : selectedMonth;
    if (!activeMonth || activeMonth === 'custom') return records;
    return records.filter(rec => {
      const my = getMonthYear(rec.date);
      return my === activeMonth;
    });
  }, [isPBR, records, isCustomRange, customStartDate, customEndDate, selectedMonth, previousMonth]);

  const display = (val) => (val !== undefined && val !== null ? val : '-');

  const formatBuiltyForDisplay = (builtyNo) => {
    if (!builtyNo) return '';
    return builtyNo.replace(/^GR0*/, '');
  };

  const processedRecords = useMemo(() => {
    const sourceRecords = isPBR ? filteredRecords : records;
    const processed = sourceRecords.map((rec, idx) => {
      const units = rec.article_no?.split('|').reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0) || 0;
      const weight = rec.actual_weight?.split('|').reduce((sum, v) => sum + (parseFloat(v) || 0), 0) || 0;
      const toPay = parseFloat(rec.to_pay) || 0;
      const paid = parseFloat(rec.paid) || 0;
      const rawDate = new Date(rec.date);
      const day = String(rawDate.getDate()).padStart(2, '0');
      const month = String(rawDate.getMonth() + 1).padStart(2, '0');
      const year = rawDate.getFullYear();
      const dateFormatted = isNaN(rawDate.getTime()) ? display(rec.date) : `${day}-${month}-${year}`;

      return {
        gr_no: rec.gr_no,
        builtyDisplay: formatBuiltyForDisplay(rec.gr_no),
        date: dateFormatted,
        destination: rec.to_location || '',
        consignor: rec.consignor_name || '',
        consignee: rec.consignee_name || '',
        units,
        weight,
        goodType: rec.goods_type || '',
        toPay,
        paid,
        challanStatus: rec.challan_status || '',
        rawDate: isNaN(rawDate.getTime()) ? null : rawDate,
        originalIndex: idx + 1,
      };
    });

    if (!sortColumn) return processed;

    return [...processed].sort((a, b) => {
      let valA, valB;
      switch (sortColumn) {
        case 'index': valA = a.originalIndex; valB = b.originalIndex; break;
        case 'builty_no': valA = a.gr_no; valB = b.gr_no; break;
        case 'date': valA = a.rawDate ? a.rawDate.getTime() : 0; valB = b.rawDate ? b.rawDate.getTime() : 0; break;
        case 'destination': valA = a.destination.toLowerCase(); valB = b.destination.toLowerCase(); break;
        case 'consignor': valA = a.consignor.toLowerCase(); valB = b.consignor.toLowerCase(); break;
        case 'consignee': valA = a.consignee.toLowerCase(); valB = b.consignee.toLowerCase(); break;
        case 'units': valA = a.units; valB = b.units; break;
        case 'weight': valA = a.weight; valB = b.weight; break;
        case 'good_type': valA = a.goodType.toLowerCase(); valB = b.goodType.toLowerCase(); break;
        case 'to_pay': valA = a.toPay; valB = b.toPay; break;
        case 'paid': valA = a.paid; valB = b.paid; break;
        case 'challan_status': valA = a.challanStatus.toLowerCase(); valB = b.challanStatus.toLowerCase(); break;
        default: return 0;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [isPBR, records, filteredRecords, sortColumn, sortDirection]);

  const totals = useMemo(() => {
    const source = isPBR ? filteredRecords : records;
    return source.reduce(
      (acc, rec) => {
        acc.weight += (rec.actual_weight || '').split('|').reduce((s, w) => s + (parseFloat(w) || 0), 0);
        acc.units += (rec.article_no || '').split('|').reduce((s, a) => s + (parseInt(a, 10) || 0), 0);
        acc.toPay += parseFloat(rec.to_pay) || 0;
        acc.paid += parseFloat(rec.paid) || 0;
        return acc;
      },
      { weight: 0, units: 0, toPay: 0, paid: 0 }
    );
  }, [isPBR, records, filteredRecords]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortButtons = ({ column }) => {
    const isActive = sortColumn === column;
    return (
      <span
        onClick={() => handleSort(column)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: '6px',
          width: '18px', height: '18px', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s ease',
          fontSize: '11px', fontWeight: 'bold', userSelect: 'none',
          backgroundColor: isActive ? (isLightMode ? '#4a90e2' : '#63b3ed') : 'transparent',
          color: isActive ? '#ffffff' : isLightMode ? '#718096' : '#a0aec0',
          opacity: isActive ? 1 : 0.8,
        }}
        title="Sort"
      >
        {isActive ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    );
  };

  const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(isPBR ? 'Paid Builty Report' : 'Outstanding Report', {
      views: [{ showGridLines: false }],
    });

    const parseSafeNumber = (val) => {
      const num = Number(val);
      return val !== '' && val !== '-' && val !== null && !isNaN(num) ? num : val;
    };

    const titleText = isPBR ? 'Paid Builty Report' : 'Outstanding Shipment Report';
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = titleText;
    titleCell.font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    worksheet.getRow(1).height = 40;

    let headers;
    if (isPBR) {
      headers = [
        'Index', 'Builty No', 'Date', 'Destination', 'Consignor',
        'Consignee', 'Units', 'Weight', 'Good Type', 'Paid', 'Shipment'
      ];
    } else {
      headers = [
        'Index', 'Builty No', 'Date', 'Destination', 'Consignor',
        'Consignee', 'Units', 'Weight', 'Good Type', 'To Pay', 'Paid'
      ];
    }

    const dataRows = processedRecords.map((rec, idx) => {
      const row = [
        idx + 1,
        parseSafeNumber(rec.builtyDisplay),
        rec.date,
        display(rec.destination),
        display(rec.consignor),
        display(rec.consignee),
        parseSafeNumber(rec.units) || '-',
        parseSafeNumber(rec.weight) || '-',
        display(rec.goodType),
      ];
      if (isPBR) {
        row.push(parseSafeNumber(rec.paid) || '-');
        row.push(display(rec.challanStatus));
      } else {
        row.push(parseSafeNumber(rec.toPay) || '-');
        row.push(parseSafeNumber(rec.paid) || '-');
      }
      return row;
    });

    worksheet.addTable({
      name: 'ReportTable',
      ref: 'A2',
      headerRow: true,
      totalsRow: false,
      style: { theme: null, showRowStripes: false },
      columns: headers.map((h) => ({ name: h })),
      rows: dataRows,
    });

    const borderThin = { style: 'thin', color: { argb: 'FFD1D5DB' } };
    const borderMedium = { style: 'medium', color: { argb: 'FF9CA3AF' } };
    const colCount = headers.length;

    const headerRow = worksheet.getRow(2);
    headerRow.height = 30;
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: borderMedium,
        bottom: borderThin,
        left: colNumber === 1 ? borderMedium : borderThin,
        right: colNumber === colCount ? borderMedium : borderThin,
      };
    });

    const lastDataRow = 2 + dataRows.length;
    for (let r = 3; r <= lastDataRow; r++) {
      const row = worksheet.getRow(r);
      row.height = 24;
      const isEvenRow = r % 2 === 0;
      const rowColor = isEvenRow ? 'FFF9FAFB' : 'FFFFFFFF';

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 11, color: { argb: 'FF374151' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
        cell.border = {
          top: borderThin,
          bottom: borderThin,
          left: colNumber === 1 ? borderMedium : borderThin,
          right: colNumber === colCount ? borderMedium : borderThin,
        };

        if ([4, 5, 6, 9].includes(colNumber)) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
        } else if ([2, 7, 8, 10, 11].includes(colNumber) || (isPBR && [10, 11].includes(colNumber))) {
          cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    }

    const totalsRowNumber = lastDataRow + 1;
    let totalsValues;
    if (isPBR) {
      totalsValues = [
        'Total', '', '', '', '', '',
        parseSafeNumber(totals.units), parseSafeNumber(totals.weight), '',
        parseSafeNumber(totals.paid), ''
      ];
    } else {
      totalsValues = [
        'Total', '', '', '', '', '',
        parseSafeNumber(totals.units), parseSafeNumber(totals.weight), '',
        parseSafeNumber(totals.toPay), parseSafeNumber(totals.paid)
      ];
    }

    const totalsRow = worksheet.getRow(totalsRowNumber);
    totalsRow.height = 28;
    totalsValues.forEach((val, colIdx) => {
      const colNumber = colIdx + 1;
      const cell = totalsRow.getCell(colNumber);
      cell.value = val;
      cell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF111827' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF9CA3AF' } },
        bottom: borderMedium,
        left: colNumber === 1 ? borderMedium : borderThin,
        right: colNumber === colCount ? borderMedium : borderThin,
      };
      if ([2, 7, 8, 10, 11].includes(colNumber) || (isPBR && [10].includes(colNumber))) {
        cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });

    const widths = isPBR
      ? [8, 14, 14, 20, 30, 30, 10, 12, 18, 14, 18]
      : [8, 14, 14, 20, 30, 30, 10, 12, 18, 14, 14];
    worksheet.columns = widths.map((w) => ({ width: w }));

    const buffer = await workbook.xlsx.writeBuffer();
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    const fileName = isPBR ? `Paid_Builty_Report_${formattedDate}.xlsx` : `Outstanding_Shipment_Report_${formattedDate}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
  };

  const tableHeaders = isPBR
    ? [
        ['Index', 'index'],
        ['Builty No', 'builty_no'],
        ['Date', 'date'],
        ['Destination', 'destination'],
        ['Consignor', 'consignor'],
        ['Consignee', 'consignee'],
        ['Units', 'units'],
        ['Weight', 'weight'],
        ['Good Type', 'good_type'],
        ['Paid', 'paid'],
        ['Shipment', 'challan_status'],
      ]
    : [
        ['Index', 'index'],
        ['Builty No', 'builty_no'],
        ['Date', 'date'],
        ['Destination', 'destination'],
        ['Consignor', 'consignor'],
        ['Consignee', 'consignee'],
        ['Units', 'units'],
        ['Weight', 'weight'],
        ['Good Type', 'good_type'],
        ['To Pay', 'to_pay'],
        ['Paid', 'paid'],
      ];

  return (
    <div className={`challan-main-container ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ maxWidth: '1350px' }}>
      {isPBR ? (
        // Sticky top bar for PBR
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            backgroundColor: isLightMode ? '#ffffff' : '#2d3748',
            padding: '0.75rem 0',
            marginBottom: '1rem',
            borderBottom: isLightMode ? '1px solid #e2e8f0' : '1px solid #4a5568',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Left side: Heading */}
            <h2 className={`challan-title ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ margin: 0 }}>
              Paid Builty Report
            </h2>
            
            {/* Right side: Download button + month dropdown + custom date inputs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="challan-form-group" style={{ marginBottom: 0, width: 'auto' }}>
                <label className={`challan-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Select Month:</label>
                <select
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className={`challan-form-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                  style={{ width: '180px' }}
                >
                  {availableMonths.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              {isCustomRange && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className={`challan-form-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                    style={{ width: '150px' }}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className={`challan-form-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                    style={{ width: '150px' }}
                  />
                </div>
              )}

              <button
                onClick={downloadExcel}
                style={{
                  backgroundColor: isLightMode ? '#38a169' : '#48bb78',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: '0.2s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              >
                Download Excel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <h2 className={`challan-title ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
          Outstanding Shipment Report
        </h2>
      )}

      {isLoading && (
        <div className="challan-loading-overlay">
          <div className={`challan-loading-spinner ${isLightMode ? 'light-mode' : 'dark-mode'}`}></div>
        </div>
      )}

      {error && (
        <div className={`challan-form-value ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ color: 'red', marginBottom: '1rem' }}>
          Error: {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="challan-table-container" style={{ marginBottom: '0' }}>
          <table className={`challan-table ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <thead>
              <tr className={`challan-table-header ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                {tableHeaders.map(([label, key]) => (
                  <th
                    key={key}
                    style={{
                      padding: '14px 12px',
                      fontWeight: '700',
                      fontSize: '14.5px',
                      letterSpacing: '0.2px',
                      background: isLightMode ? '#f8fafc' : '#3c4657',
                      color: isLightMode ? '#2d3748' : '#f7fafc',
                      borderBottom: isLightMode ? '2px solid #dbe4f0' : '2px solid #4a5568',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span>{label}</span>
                      {key !== 'index' && <SortButtons column={key} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedRecords.length === 0 ? (
                <tr className={`challan-table-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                  <td colSpan={isPBR ? 11 : 11} className="text-center">No records found.</td>
                </tr>
              ) : (
                processedRecords.map((rec, idx) => (
                  <tr key={rec.gr_no} className={`challan-table-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                    <td className="text-center">{idx + 1}</td>
                    <td className="text-center" style={{ width: '90px' }}>{rec.builtyDisplay}</td>
                    <td className="text-center" style={{ width: '140px', fontSize: '15.5px' }}>{rec.date}</td>
                    <td className="text-center">{display(rec.destination)}</td>
                    <td className="text-center" style={{ fontSize: '14.5px' }}>{display(rec.consignor)}</td>
                    <td className="text-center" style={{ fontSize: '14.5px' }}>{display(rec.consignee)}</td>
                    <td className="text-center">{rec.units || '-'}</td>
                    <td className="text-center">{rec.weight || '-'}</td>
                    <td className="text-center">{display(rec.goodType)}</td>
                    {isPBR ? (
                      <>
                        <td className="text-center">{rec.paid || '-'}</td>
                        <td className="text-center">{display(rec.challanStatus)}</td>
                      </>
                    ) : (
                      <>
                        <td className="text-center">{rec.toPay || '-'}</td>
                        <td className="text-center">{rec.paid || '-'}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
              {processedRecords.length > 0 && (
                <tr className={`challan-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                  <td className="text-center">Total</td>
                  <td></td><td></td><td></td><td></td><td></td>
                  <td className="text-center">{totals.units}</td>
                  <td className="text-center">{totals.weight}</td>
                  <td></td>
                  {isPBR ? (
                    <>
                      <td className="text-center">{totals.paid}</td>
                      <td></td>
                    </>
                  ) : (
                    <>
                      <td className="text-center">{totals.toPay}</td>
                      <td className="text-center">{totals.paid}</td>
                    </>
                  )}
                </tr>
              )}
            </tbody>
          </table>

          {!isPBR && records.length > 0 && (
            <div className={`challan-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ fontWeight: 'inherit', marginTop: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'start', padding: '10px' }}>
              <b style={{ marginRight: '4px', marginLeft: '4px' }}>Note:</b> This report shows all builties that have not yet been assigned to a challan (status = NOT SHIPPED)
            </div>
          )}
          {isPBR && processedRecords.length > 0 && (
            <div className={`challan-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ fontWeight: 'inherit', marginTop: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'start', padding: '10px' }}>
              <b style={{ marginRight: '4px', marginLeft: '4px' }}>Note:</b> This report shows all the Paid Builties. You can filter by month or custom date range.
            </div>
          )}
        </div>
      )}
      {/* For OSR mode, keep the original centered download button */}
      {!isPBR && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <button
            onClick={downloadExcel}
            style={{
              backgroundColor: isLightMode ? '#38a169' : '#48bb78',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              transition: '0.2s ease',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            Download Excel
          </button>
        </div>
      )}
    </div>
  );
};

export default ShipmentReportModule;
