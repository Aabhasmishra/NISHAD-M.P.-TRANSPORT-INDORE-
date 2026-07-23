import { useState, useEffect, useMemo } from 'react';
import ExcelJS from 'exceljs';
import BASE_URL from "../../config";
import { saveAs } from 'file-saver';

const ShipmentReportModule = ({ isLightMode, modeOfView }) => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // ── Determine mode ──────────────────────────────────────────────────────────
  const isPBR = modeOfView === 'PBR';
  const isBR  = modeOfView === 'BR';
  const isPPR = modeOfView === 'PPR';   // new: Payment Status Report

  // ── Filter state ──────────────────────────────────────────────────────────
  const currentMonthValue = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [previousMonth, setPreviousMonth] = useState(selectedMonth);
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchRecords = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch(`${BASE_URL}/transport-records`);
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        let filtered = Array.isArray(data) ? data : [];

        if (isBR) {
          // BR: all records (no filter applied here)
          filtered = filtered;
        } else if (isPBR) {
          // PBR: paid !== 0
          filtered = filtered.filter(rec => (parseFloat(rec.paid) || 0) !== 0);
        } else if (isPPR) {
          // PPR: payment_status is not 'Paid' (i.e. incomplete)
          filtered = filtered.filter(rec => {
            const status = rec.payment_status || '';
            return status !== 'Paid' && status !== '';
          });
        } else {
          // OSR: NOT SHIPPED
          filtered = filtered.filter(rec => String(rec.challan_status).toUpperCase().trim() === 'NOT SHIPPED');
        }
        setRecords(filtered);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecords();
  }, [isPBR, isBR, isPPR]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const display = (val) => (val !== undefined && val !== null ? val : '-');
  const formatBuilty = (b) => (b ? b.replace(/^GR0*/, '') : '');
  const getMonthYear = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  // ── Period options (for BR, PBR and PPR) ──────────────────────────────────
  const availablePeriods = useMemo(() => {
    const periods = [];
    const now = new Date();

    if (isBR) {
      // Fiscal year options
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      periods.push({
        value: `fy-${fyStartYear}`,
        label: `Current FY (1 Apr ${fyStartYear} – 31 Mar ${fyStartYear + 1})`,
        start: `${fyStartYear}-04-01`,
        end: `${fyStartYear + 1}-03-31`,
      });
      periods.push({
        value: `fy-${fyStartYear - 1}`,
        label: `Prior FY (1 Apr ${fyStartYear - 1} – 31 Mar ${fyStartYear})`,
        start: `${fyStartYear - 1}-04-01`,
        end: `${fyStartYear}-03-31`,
      });
    }

    // Last 12 months
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
      periods.push({ value, label });
    }

    // Custom option for PBR and PPR
    if (isPBR || isPPR) {
      periods.push({ value: 'custom', label: 'Custom' });
    }
    return periods;
  }, [isPBR, isBR, isPPR]);

  // ── Handle filter change ───────────────────────────────────────────────────
  const handlePeriodChange = (e) => {
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

  // ── Filter logic ───────────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => {
    // OSR: no filter
    if (!isPBR && !isBR && !isPPR) return records;

    // PBR / PPR custom range
    if ((isPBR || isPPR) && isCustomRange && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return records.filter(rec => {
        const d = new Date(rec.date);
        return !isNaN(d.getTime()) && d >= start && d <= end;
      });
    }

    // For PBR/PPR: if custom is active but dates missing, fallback to previous month
    if ((isPBR || isPPR) && isCustomRange && !(customStartDate && customEndDate)) {
      return records.filter(rec => getMonthYear(rec.date) === previousMonth);
    }

    const active = selectedMonth;
    if (!active || active === 'custom') return records;

    // BR: handle fiscal year
    if (isBR && active.startsWith('fy-')) {
      const fyOption = availablePeriods.find(p => p.value === active);
      if (fyOption?.start && fyOption?.end) {
        const start = new Date(fyOption.start);
        const end = new Date(fyOption.end);
        end.setHours(23, 59, 59, 999);
        return records.filter(rec => {
          const d = new Date(rec.date);
          return !isNaN(d.getTime()) && d >= start && d <= end;
        });
      }
    }

    // Month filter (for PBR, PPR and BR)
    return records.filter(rec => getMonthYear(rec.date) === active);
  }, [isPBR, isBR, isPPR, records, isCustomRange, customStartDate, customEndDate, selectedMonth, previousMonth, availablePeriods]);

  // ── Process records for display ───────────────────────────────────────────
  const processedRecords = useMemo(() => {
    const source = filteredRecords;
    let processed = source.map((rec, idx) => {
      const units = rec.article_no?.split('|').reduce((s, v) => s + (parseInt(v, 10) || 0), 0) || 0;
      const weight = rec.actual_weight?.split('|').reduce((s, v) => s + (parseFloat(v) || 0), 0) || 0;
      const toPay = parseFloat(rec.to_pay) || 0;
      const paid = parseFloat(rec.paid) || 0;
      const rawDate = new Date(rec.date);
      const dateFormatted = isNaN(rawDate.getTime())
        ? display(rec.date)
        : `${String(rawDate.getDate()).padStart(2, '0')}-${String(rawDate.getMonth() + 1).padStart(2, '0')}-${rawDate.getFullYear()}`;

      return {
        gr_no: rec.gr_no,
        builtyDisplay: formatBuilty(rec.gr_no),
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
        paymentStatus: rec.payment_status || '',      // new
        amountCollected: parseFloat(rec.amount_collected) || 0, // new
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
        case 'payment_status': valA = a.paymentStatus.toLowerCase(); valB = b.paymentStatus.toLowerCase(); break;
        case 'amount_collected': valA = a.amountCollected; valB = b.amountCollected; break;
        default: return 0;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortColumn, sortDirection]);

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    return processedRecords.reduce(
      (acc, rec) => {
        acc.weight += rec.weight || 0;
        acc.units += rec.units || 0;
        acc.toPay += rec.toPay || 0;
        acc.paid += rec.paid || 0;
        acc.amountCollected += rec.amountCollected || 0;
        return acc;
      },
      { weight: 0, units: 0, toPay: 0, paid: 0, amountCollected: 0 }
    );
  }, [processedRecords]);

  // ── Sort handlers ──────────────────────────────────────────────────────────
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
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: '6px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          fontSize: '11px',
          fontWeight: 'bold',
          userSelect: 'none',
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

  // ── Excel download ─────────────────────────────────────────────────────────
  const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    let sheetName;
    if (isBR) sheetName = 'Booking Register';
    else if (isPBR) sheetName = 'Paid Builty Report';
    else if (isPPR) sheetName = 'Payment Status Report';
    else sheetName = 'Outstanding Report';
    const worksheet = workbook.addWorksheet(sheetName, { views: [{ showGridLines: false }] });

    const parseSafeNumber = (val) => {
      const num = Number(val);
      return val !== '' && val !== '-' && val !== null && !isNaN(num) ? num : val;
    };

    let titleText;
    if (isBR) titleText = 'Booking Register';
    else if (isPBR) titleText = 'Paid Builty Report';
    else if (isPPR) titleText = 'Payment Status Report';
    else titleText = 'Outstanding Shipment Report';

    const colCount = isPPR ? 12 : 11; // PPR has 12 columns
    const mergeEnd = String.fromCharCode(64 + colCount) + '1';
    worksheet.mergeCells(`A1:${mergeEnd}`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = titleText;
    titleCell.font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isBR ? 'FF0F766E' : isPPR ? 'FF8B5CF6' : 'FF4F46E5' },
    };
    worksheet.getRow(1).height = 40;

    let headers;
    if (isBR) {
      headers = [
        'Index', 'Builty No', 'Date', 'Station', 'Consignor',
        'Consignee', 'Total Qty', 'Weight', 'To Pay', 'Paid', 'Challan Status',
      ];
    } else if (isPBR) {
      headers = [
        'Index', 'Builty No', 'Date', 'Destination', 'Consignor',
        'Consignee', 'Units', 'Weight', 'Good Type', 'Paid', 'Shipment',
      ];
    } else if (isPPR) {
      headers = [
        'Index', 'Builty No', 'Date', 'Destination', 'Consignor',
        'Consignee', 'To Pay', 'Paid', 'Shipment', 'Collected', 'Payment Status',
      ];
    } else {
      headers = [
        'Index', 'Builty No', 'Date', 'Destination', 'Consignor',
        'Consignee', 'Units', 'Weight', 'Good Type', 'To Pay', 'Paid',
      ];
    }

    const dataRows = processedRecords.map((rec, idx) => {
      if (isBR) {
        return [
          idx + 1,
          parseSafeNumber(rec.builtyDisplay),
          rec.date,
          display(rec.destination),
          display(rec.consignor),
          display(rec.consignee),
          parseSafeNumber(rec.units) || '-',
          parseSafeNumber(rec.weight) || '-',
          parseSafeNumber(rec.toPay) || '-',
          parseSafeNumber(rec.paid) || '-',
          display(rec.challanStatus),
        ];
      } else if (isPBR) {
        return [
          idx + 1,
          parseSafeNumber(rec.builtyDisplay),
          rec.date,
          display(rec.destination),
          display(rec.consignor),
          display(rec.consignee),
          parseSafeNumber(rec.units) || '-',
          parseSafeNumber(rec.weight) || '-',
          display(rec.goodType),
          parseSafeNumber(rec.paid) || '-',
          display(rec.challanStatus),
        ];
      } else if (isPPR) {
        return [
          idx + 1,
          parseSafeNumber(rec.builtyDisplay),
          rec.date,
          display(rec.destination),
          display(rec.consignor),
          display(rec.consignee),
          parseSafeNumber(rec.toPay) || '-',
          parseSafeNumber(rec.paid) || '-',
          display(rec.challanStatus),
          parseSafeNumber(rec.amountCollected) || '-',
          display(rec.paymentStatus),
        ];
      } else {
        return [
          idx + 1,
          parseSafeNumber(rec.builtyDisplay),
          rec.date,
          display(rec.destination),
          display(rec.consignor),
          display(rec.consignee),
          parseSafeNumber(rec.units) || '-',
          parseSafeNumber(rec.weight) || '-',
          display(rec.goodType),
          parseSafeNumber(rec.toPay) || '-',
          parseSafeNumber(rec.paid) || '-',
        ];
      }
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

        // Alignment logic – we keep it simple: most numeric right, others center/left
        if (isBR) {
          if ([4, 5, 6].includes(colNumber)) {
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
          } else if ([7, 8, 9, 10].includes(colNumber)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        } else if (isPBR) {
          if ([4, 5, 6, 9].includes(colNumber)) {
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
          } else if ([2, 7, 8, 10, 11].includes(colNumber)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        } else if (isPPR) {
          if ([4, 5, 6, 11].includes(colNumber)) {
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
          } else if ([2, 7, 8, 10].includes(colNumber)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        } else {
          if ([4, 5, 6, 9].includes(colNumber)) {
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
          } else if ([2, 7, 8, 10, 11].includes(colNumber)) {
            cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
          } else {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }
        }
      });
    }

    // Totals row
    const totalsRowNumber = lastDataRow + 1;
    let totalsValues;
    if (isBR) {
      totalsValues = [
        'Total', '', '', '', '', '',
        parseSafeNumber(totals.units),
        parseSafeNumber(totals.weight),
        parseSafeNumber(totals.toPay),
        parseSafeNumber(totals.paid),
        '',
      ];
    } else if (isPBR) {
      totalsValues = [
        'Total', '', '', '', '', '',
        parseSafeNumber(totals.units),
        parseSafeNumber(totals.weight),
        '',
        parseSafeNumber(totals.paid),
        '',
      ];
    } else if (isPPR) {
      totalsValues = [
        'Total', '', '', '', '', '',
        parseSafeNumber(totals.toPay),
        parseSafeNumber(totals.paid),
        '',
        parseSafeNumber(totals.amountCollected),
        '',
      ];
    } else {
      totalsValues = [
        'Total', '', '', '', '', '',
        parseSafeNumber(totals.units),
        parseSafeNumber(totals.weight),
        '',
        parseSafeNumber(totals.toPay),
        parseSafeNumber(totals.paid),
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
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Column widths
    let widths;
    if (isBR) {
      widths = [8, 14, 14, 22, 30, 30, 10, 12, 14, 14, 24];
    } else if (isPBR) {
      widths = [8, 14, 14, 20, 30, 30, 10, 12, 18, 14, 18];
    } else if (isPPR) {
      widths = [8, 14, 14, 20, 30, 30, 14, 14, 18, 16, 18];
    } else {
      widths = [8, 14, 14, 20, 30, 30, 10, 12, 18, 14, 14];
    }
    worksheet.columns = widths.map((w) => ({ width: w }));

    const buffer = await workbook.xlsx.writeBuffer();
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    let fileName;
    if (isBR) fileName = `Booking_Register_${formattedDate}.xlsx`;
    else if (isPBR) fileName = `Paid_Builty_Report_${formattedDate}.xlsx`;
    else if (isPPR) fileName = `Payment_Status_Report_${formattedDate}.xlsx`;
    else fileName = `Outstanding_Shipment_Report_${formattedDate}.xlsx`;
    saveAs(new Blob([buffer]), fileName);
  };

  // ── Table headers for rendering ───────────────────────────────────────────
  const tableHeaders = (() => {
    if (isBR) {
      return [
        ['Index', 'index'],
        ['Builty No', 'builty_no'],
        ['Date', 'date'],
        ['Station', 'destination'],
        ['Consignor', 'consignor'],
        ['Consignee', 'consignee'],
        ['Total Qty', 'units'],
        ['Weight', 'weight'],
        ['To Pay', 'to_pay'],
        ['Paid', 'paid'],
        ['Challan Status', 'challan_status'],
      ];
    }
    if (isPBR) {
      return [
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
      ];
    }
    if (isPPR) {
      return [
        ['Index', 'index'],
        ['Builty No', 'builty_no'],
        ['Date', 'date'],
        ['Destination', 'destination'],
        ['Consignor', 'consignor'],
        ['Consignee', 'consignee'],
        ['To Pay', 'to_pay'],
        ['Paid', 'paid'],
        ['Shipment', 'challan_status'],
        ['Collected', 'amount_collected'],
        ['Payment Status', 'payment_status'],
      ];
    }
    return [
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
  })();

  // ── Active filter label ────────────────────────────────────────────────────
  const activeFilterLabel = useMemo(() => {
    if (!isPBR && !isBR && !isPPR) return null;
    if ((isPBR || isPPR) && isCustomRange && customStartDate && customEndDate) {
      return `${customStartDate} → ${customEndDate}`;
    }
    const found = availablePeriods.find(p => p.value === selectedMonth);
    return found ? found.label : selectedMonth;
  }, [isPBR, isBR, isPPR, isCustomRange, customStartDate, customEndDate, selectedMonth, availablePeriods]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const showFilter = isPBR || isBR || isPPR;

  // Helper styles for long columns
  const getColumnStyle = (key) => {
    const longColumns = ['consignor', 'consignee', 'challan_status', 'payment_status'];
    if (longColumns.includes(key)) {
      return {
        fontSize: '13px',
        padding: '10px 8px',
        maxWidth: '200px',
        wordBreak: 'break-word',
        whiteSpace: 'normal',
      };
    }
    return {
      fontSize: '14.5px',
      padding: '14px 12px',
    };
  };

  // ── Helper to get payment status class ────────────────────────────────────
  const getPaymentStatusClass = (status) => {
    if (status === 'Paid') return 'pm-status-paid';
    if (status === 'Pending') return 'pm-status-pending';
    if (status === 'Paid-D-' || status === 'Paid-D+') return 'pm-status-partial';
    return '';
  };

  return (
    <div className={`challan-main-container ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ maxWidth: '1350px', paddingTop: '10px' }}>
      {/* ── Sticky Top Bar for all modes ── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backgroundColor: isLightMode ? '#ffffff' : '#2d3748',
          padding: '0.75rem 0',
          marginBottom: '1rem',
          borderBottom: isLightMode ? '1px solid #e2e8f0' : '1px solid #4a5568',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Left: Heading */}
        <h2 className={`challan-title ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ margin: 0 }}>
          {isBR ? 'Booking Register' : isPBR ? 'Paid Builty Report' : isPPR ? 'Payment Status Report' : 'Outstanding Shipment Report'}
        </h2>

        {/* Right: Records count + Filter (if applicable) + Download */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 14px',
              borderRadius: '20px',
              fontWeight: '700',
              fontSize: '14px',
              backgroundColor: isLightMode ? '#e0e7ff' : '#1e1b4b',
              color: isLightMode ? '#4338ca' : '#818cf8',
              whiteSpace: 'nowrap',
            }}
          >
            Records: {processedRecords.length}
          </span>

          {showFilter && (
            <div className="challan-form-group" style={{ marginBottom: 0, width: 'auto' }}>
              <label className={`challan-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                {isBR ? 'Select Period:' : 'Select Month:'}
              </label>
              <select
                value={selectedMonth}
                onChange={handlePeriodChange}
                className={`challan-form-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                style={{ width: '151px', paddingRight: '15px' }}
              >
                {availablePeriods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(isPBR || isPPR) && isCustomRange && (
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
        <div className="challan-table-container" style={{ marginBottom: '0', overflowX: 'auto' }}>
          <table className={`challan-table ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ minWidth: '100%' }}>
            <thead>
              <tr className={`challan-table-header ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                {tableHeaders.map(([label, key]) => {
                  const style = getColumnStyle(key);
                  return (
                    <th
                      key={key}
                      style={{
                        fontWeight: '700',
                        letterSpacing: '0.2px',
                        background: isLightMode ? '#f8fafc' : '#3c4657',
                        color: isLightMode ? '#2d3748' : '#f7fafc',
                        borderBottom: isLightMode ? '2px solid #dbe4f0' : '2px solid #4a5568',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                        ...style,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <span>{label}</span>
                        {key !== 'index' && <SortButtons column={key} />}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {processedRecords.length === 0 ? (
                <tr className={`challan-table-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                  <td colSpan={isPPR ? 11 : 11} className="text-center">No records found.</td>
                </tr>
              ) : (
                processedRecords.map((rec, idx) => (
                  <tr key={rec.gr_no} className={`challan-table-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                    <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{idx + 1}</td>
                    <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px', width: '90px' }}>{rec.builtyDisplay}</td>
                    <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px', width: '140px' }}>{rec.date}</td>
                    <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{display(rec.destination)}</td>
                    <td className="text-center" style={{ padding: '8px 6px', fontSize: '13px', maxWidth: '200px', wordBreak: 'break-word' }}>{display(rec.consignor)}</td>
                    <td className="text-center" style={{ padding: '8px 6px', fontSize: '13px', maxWidth: '200px', wordBreak: 'break-word' }}>{display(rec.consignee)}</td>

                    {isBR ? (
                      <>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.units || '-'}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.weight || '-'}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.toPay || '-'}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.paid || '-'}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '13px', maxWidth: '200px', wordBreak: 'break-word' }}>{display(rec.challanStatus)}</td>
                      </>
                    ) : isPBR ? (
                      <>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.units || '-'}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.weight || '-'}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{display(rec.goodType)}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.paid || '-'}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '13px', maxWidth: '200px', wordBreak: 'break-word' }}>{display(rec.challanStatus)}</td>
                      </>
                    ) : isPPR ? (
                      <>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.toPay || '-'}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.paid || '-'}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '13px', maxWidth: '200px', wordBreak: 'break-word' }}>{display(rec.challanStatus)}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.amountCollected || '-'}</td>
                        <td className={`text-center ${getPaymentStatusClass(rec.paymentStatus)}`} style={{ padding: '8px 6px', fontSize: '13px', fontWeight: '500' }}>
                          {display(rec.paymentStatus)}
                        </td>
                      </>
                    ) : (
                      // OSR
                      <>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.units || '-'}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.weight || '-'}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{display(rec.goodType)}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.toPay || '-'}</td>
                        <td className="text-center" style={{ padding: '8px 6px', fontSize: '14px' }}>{rec.paid || '-'}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
              {processedRecords.length > 0 && (
                <tr className={`challan-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                  <td className="text-center" style={{ fontWeight: 'bold' }}>Total</td>
                  <td></td><td></td><td></td><td></td><td></td>

                  {isBR ? (
                    <>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.units}</td>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.weight}</td>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.toPay}</td>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.paid}</td>
                      <td></td>
                    </>
                  ) : isPBR ? (
                    <>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.units}</td>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.weight}</td>
                      <td></td>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.paid}</td>
                      <td></td>
                    </>
                  ) : isPPR ? (
                    <>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.toPay}</td>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.paid}</td>
                      <td></td>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.amountCollected}</td>
                      <td></td>
                    </>
                  ) : (
                    // OSR
                    <>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.units}</td>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.weight}</td>
                      <td></td>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.toPay}</td>
                      <td className="text-center" style={{ fontWeight: 'bold' }}>{totals.paid}</td>
                    </>
                  )}
                </tr>
              )}
            </tbody>
          </table>

          {/* Notes */}
          {!isPBR && !isBR && !isPPR && records.length > 0 && (
            <div className={`challan-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ fontWeight: 'inherit', marginTop: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'start', padding: '10px' }}>
              <b style={{ marginRight: '4px', marginLeft: '4px' }}>Note:</b> This report shows all builties that have not yet been assigned to a challan (status = NOT SHIPPED)
            </div>
          )}
          {isPBR && processedRecords.length > 0 && (
            <div className={`challan-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ fontWeight: 'inherit', marginTop: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'start', padding: '10px' }}>
              <b style={{ marginRight: '4px', marginLeft: '4px' }}>Note:</b> This report shows all the Paid Builties. You can filter by month or custom date range.
            </div>
          )}
          {isBR && processedRecords.length > 0 && (
            <div className={`challan-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ fontWeight: 'inherit', marginTop: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'start', padding: '10px' }}>
              <b style={{ marginRight: '4px', marginLeft: '4px' }}>Note:</b> Booking Register: Showing all bookings for the selected period.
            </div>
          )}
          {isPPR && processedRecords.length > 0 && (
            <div className={`challan-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ fontWeight: 'inherit', marginTop: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'start', padding: '10px' }}>
              <b style={{ marginRight: '4px', marginLeft: '4px' }}>Note:</b> This report shows all builties with incomplete payment (Pending, Paid-D-, Paid-D+). You can filter by month or custom date range.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShipmentReportModule;
