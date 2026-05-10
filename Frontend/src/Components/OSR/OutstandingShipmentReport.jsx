import { useState, useEffect, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const OutstandingShipmentReport = ({ isLightMode }) => {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    const fetchOutstanding = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await fetch('http://43.230.202.198:3000/api/transport-records');
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        const filtered = Array.isArray(data)
          ? data.filter(rec => String(rec.challan_status).toUpperCase().trim() === 'NOT SHIPPED')
          : [];
        setRecords(filtered);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOutstanding();
  }, []);

  const display = (val) => val !== undefined && val !== null ? val : '-';

  const formatBuiltyForDisplay = (builtyNo) => {
    if (!builtyNo) return '';
    return builtyNo.replace(/^GR0*/, '');
  };

  const processedRecords = useMemo(() => {
    const processed = records.map((rec, idx) => {
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
        rawDate: isNaN(rawDate.getTime()) ? null : rawDate,
        originalIndex: idx + 1,
      };
    });

    if (!sortColumn) return processed;

    return [...processed].sort((a, b) => {
      let valA, valB;
      switch (sortColumn) {
        case 'index':
          valA = a.originalIndex; valB = b.originalIndex; break;
        case 'builty_no':
          valA = a.gr_no; valB = b.gr_no; break;
        case 'date':
          valA = a.rawDate ? a.rawDate.getTime() : 0; valB = b.rawDate ? b.rawDate.getTime() : 0; break;
        case 'destination':
          valA = a.destination.toLowerCase(); valB = b.destination.toLowerCase(); break;
        case 'consignor':
          valA = a.consignor.toLowerCase(); valB = b.consignor.toLowerCase(); break;
        case 'consignee':
          valA = a.consignee.toLowerCase(); valB = b.consignee.toLowerCase(); break;
        case 'units':
          valA = a.units; valB = b.units; break;
        case 'weight':
          valA = a.weight; valB = b.weight; break;
        case 'good_type':
          valA = a.goodType.toLowerCase(); valB = b.goodType.toLowerCase(); break;
        case 'to_pay':
          valA = a.toPay; valB = b.toPay; break;
        case 'paid':
          valA = a.paid; valB = b.paid; break;
        default: return 0;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [records, sortColumn, sortDirection]);

  const totals = records.reduce((acc, rec) => {
    acc.weight += (rec.actual_weight || '').split('|').reduce((s, w) => s + (parseFloat(w) || 0), 0);
    acc.units += (rec.article_no || '').split('|').reduce((s, a) => s + (parseInt(a, 10) || 0), 0);
    acc.toPay += parseFloat(rec.to_pay) || 0;
    acc.paid += parseFloat(rec.paid) || 0;
    return acc;
  }, { weight: 0, units: 0, toPay: 0, paid: 0 });

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

    // Sort buttons styled like action buttons but compact
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

            backgroundColor: isActive
            ? (isLightMode ? '#4a90e2' : '#63b3ed')
            : 'transparent',

            color: isActive
            ? '#ffffff'
            : (isLightMode ? '#718096' : '#a0aec0'),

            opacity: isActive ? 1 : 0.8,
        }}
        title="Sort"
        >
        {isActive
            ? (sortDirection === 'asc' ? '▲' : '▼')
            : '↕'}
        </span>
    );
    };

const downloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Outstanding Report', {
      views: [{ showGridLines: false }] // Hide default gridlines to show off our custom clean borders
    });

    // --- Helper to fix "Number stored as text" ---
    const parseSafeNumber = (val) => {
      const num = Number(val);
      // If it's a valid number and not an empty string or dash, return as Number
      return (val !== '' && val !== '-' && val !== null && !isNaN(num)) ? num : val;
    };

    // --- Title ---
    worksheet.mergeCells('A1:K1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Outstanding Shipment Report';
    titleCell.font = { name: 'Segoe UI', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; 
    worksheet.getRow(1).height = 40;

    // --- Headers ---
    const headers = [
      'Index', 'Builty No', 'Date', 'Destination', 'Consignor',
      'Consignee', 'Units', 'Weight', 'Good Type', 'To Pay', 'Paid'
    ];

    // --- Data rows (without totals) ---
    const dataRows = processedRecords.map((rec, idx) => [
      idx + 1,
      parseSafeNumber(rec.builtyDisplay), // Fixed text-to-number error here
      rec.date,
      display(rec.destination),
      display(rec.consignor),
      display(rec.consignee),
      parseSafeNumber(rec.units) || '-',
      parseSafeNumber(rec.weight) || '-',
      display(rec.goodType),
      parseSafeNumber(rec.toPay) || '-',
      parseSafeNumber(rec.paid) || '-',
    ]);

    // --- Write table (Data only) ---
    worksheet.addTable({
      name: 'OutstandingShipmentTable',
      ref: 'A2',
      headerRow: true,
      totalsRow: false,
      style: {
        theme: null, // Removed default Excel theme so our custom borders render perfectly
        showRowStripes: false, 
      },
      columns: headers.map(h => ({ name: h })),
      rows: dataRows,
    });

    const borderThin = { style: 'thin', color: { argb: 'FFD1D5DB' } };   // Light gray for inner cells
    const borderMedium = { style: 'medium', color: { argb: 'FF9CA3AF' } }; // Darker gray for the outer box

    // --- Styling Header Row (Row 2) ---
    const headerRow = worksheet.getRow(2);
    headerRow.height = 30;
    headerRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Top gets medium border, inner cells get thin borders, outer edges get medium
      cell.border = {
        top: borderMedium,
        bottom: borderThin,
        left: colNumber === 1 ? borderMedium : borderThin,
        right: colNumber === 11 ? borderMedium : borderThin,
      };
    });

    // --- Formatting Data Cells & Borders ---
    const lastDataRow = 2 + dataRows.length;
    for (let r = 3; r <= lastDataRow; r++) {
      const row = worksheet.getRow(r);
      row.height = 24;

      // Manual Zebra Striping for a modern look without relying on Excel themes
      const isEvenRow = r % 2 === 0;
      const rowColor = isEvenRow ? 'FFF9FAFB' : 'FFFFFFFF'; 

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Segoe UI', size: 11, color: { argb: 'FF374151' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };

        // Apply grid borders to EVERY cell, with medium borders on the far left and right
        cell.border = {
          top: borderThin,
          bottom: borderThin,
          left: colNumber === 1 ? borderMedium : borderThin,
          right: colNumber === 11 ? borderMedium : borderThin,
        };

        // Alignment logic
        if ([4, 5, 6, 9].includes(colNumber)) { 
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
        } else if ([2, 7, 8, 10, 11].includes(colNumber)) { 
          cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
        } else { 
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    }

    // --- Totals Row ---
    const totalsRowNumber = lastDataRow + 1;
    const totalsValues = [
      'Total', '', '', '', '', '',
      parseSafeNumber(totals.units), parseSafeNumber(totals.weight), '', 
      parseSafeNumber(totals.toPay), parseSafeNumber(totals.paid),
    ];

    const totalsRow = worksheet.getRow(totalsRowNumber);
    totalsRow.height = 28;
    
    totalsValues.forEach((val, colIdx) => {
      const colNumber = colIdx + 1;
      const cell = totalsRow.getCell(colNumber);
      cell.value = val;

      cell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF111827' } }; 
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }; // Slightly darker gray for totals
      
      // Bottom gets medium border to close the table box
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF9CA3AF' } }, // Thick separator from data
        bottom: borderMedium,
        left: colNumber === 1 ? borderMedium : borderThin,
        right: colNumber === 11 ? borderMedium : borderThin,
      };

      if ([2, 7, 8, 10, 11].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });

    // --- Column Widths ---
    worksheet.columns = [
      { width: 8 },  // Index
      { width: 14 }, // Builty No
      { width: 14 }, // Date
      { width: 20 }, // Destination
      { width: 30 }, // Consignor
      { width: 30 }, // Consignee
      { width: 10 }, // Units
      { width: 12 }, // Weight
      { width: 18 }, // Good Type
      { width: 14 }, // To Pay
      { width: 14 }, // Paid
    ];

    // --- Export ---
    const buffer = await workbook.xlsx.writeBuffer();
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    saveAs(new Blob([buffer]), `Outstanding_Shipment_Report_${formattedDate}.xlsx`);
  };

  return (
    <div className={`challan-main-container ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ maxWidth: '1350px' }}>
      <h2 className={`challan-title ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
        Outstanding Shipment Report
      </h2>

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
              <tr
                className={`challan-table-header ${isLightMode ? 'light-mode' : 'dark-mode'}`}
              >
                {[
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
                ].map(([label, key]) => (
                  <th
                    key={key}
                    style={{
                      padding: '14px 12px',
                      fontWeight: '700',
                      fontSize: '14.5px',
                      letterSpacing: '0.2px',

                      background: isLightMode
                        ? '#f8fafc'
                        : '#3c4657',

                      color: isLightMode
                        ? '#2d3748'
                        : '#f7fafc',

                      borderBottom: isLightMode
                        ? '2px solid #dbe4f0'
                        : '2px solid #4a5568',

                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <span>{label}</span>

                      {key !== 'index' && (
                        <SortButtons column={key} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedRecords.length === 0 ? (
                <tr className={`challan-table-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                  <td colSpan="11" className="text-center">No outstanding shipments found.</td>
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
                    <td className="text-center">{rec.toPay || '-'}</td>
                    <td className="text-center">{rec.paid || '-'}</td>
                  </tr>
                ))
              )}
              {records.length > 0 && (
                <tr className={`challan-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                  <td className="text-center">Total</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="text-center">{totals.units}</td>
                  <td className="text-center">{totals.weight}</td>
                  <td></td>
                  <td className="text-center">{totals.toPay}</td>
                  <td className="text-center">{totals.paid}</td>
                </tr>
              )}
            </tbody>
          </table>

          {records.length > 0 && (
            <div className={`challan-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`} style={{ fontWeight: 'inherit', marginTop: '10px', marginBottom: '15px', display: 'flex', justifyContent: 'start', padding: '10px' }}>
                <b style={{ marginRight: '4px', marginLeft: '4px' }}>Note:</b> This report shows all builties that have not yet been assigned to a challan (status = NOT SHIPPED)
            </div>
          )}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center'
          }}
        >
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
  );
};

export default OutstandingShipmentReport;
