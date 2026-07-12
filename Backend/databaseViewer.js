const express = require('express');
const ExcelJS = require('exceljs');

// ── Signature matches your mainServer.js call ──
function createDatabaseViewer(
  transportDB,
  customersDB,
  transporterDB,
  userDB,
  challanDB,
  crossingDB,
  otherDB
) {
  const router = express.Router();

  // ── Helper to fetch table data ──
  async function getTableData(db, tableName) {
    try {
      // If the DB has an inspectDatabase method, use it
      if (db && typeof db.inspectDatabase === 'function') {
        const result = await db.inspectDatabase();
        if (result && result.table && !result.tables) {
          return {
            columns: Object.keys(result.Table_Content[0] || {}),
            rows: result.Table_Content || []
          };
        }
        if (result && result.tables && result.tables[0]) {
          const table = result.tables[0];
          return {
            columns: Object.keys(table.Table_Content[0] || {}),
            rows: table.Table_Content || []
          };
        }
        // fallback
        return { columns: [], rows: [] };
      }

      // If DB has a pool, run a raw SELECT
      if (db && db.pool && typeof db.pool.query === 'function') {
        const safeTable = tableName.replace(/[^a-zA-Z0-9_-]/g, '');
        const query = `SELECT * FROM ${safeTable}`;
        const result = await db.pool.query(query);
        const rows = result.rows || [];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return { columns, rows };
      }

      console.warn(`No data access method for table "${tableName}"`);
      return { columns: [], rows: [] };
    } catch (err) {
      console.error(`Error fetching table "${tableName}":`, err.message);
      throw new Error(`Failed to fetch ${tableName}: ${err.message}`);
    }
  }

  // ── Main HTML page ──
  router.get('/AabhasServer', async (req, res) => {
    try {
      const html = generateHTML();
      res.send(html);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── API: get table data ──
  router.get('/api/table/:dbName', async (req, res) => {
    try {
      const { dbName } = req.params;
      let db, tableName;

      switch (dbName) {
        case 'transport_records':
          db = transportDB;
          tableName = 'transport_records';
          break;
        case 'customers':
          db = customersDB;
          tableName = 'customers';
          break;
        case 'transporter_details':
          db = transporterDB;
          tableName = 'Transporter-details';
          break;
        case 'users':
          db = userDB;
          tableName = 'users';
          break;
        case 'challan':
          db = challanDB;
          tableName = 'challan';
          break;
        case 'crossing':
          db = crossingDB;
          tableName = 'crossing_statement';   // actual table name from crossingDB
          break;
        default:
          return res.status(404).json({ error: 'Database not found' });
      }

      if (!db) {
        console.error(`Database object for "${dbName}" is undefined or null.`);
        return res.status(500).json({ error: `Database "${dbName}" not properly initialized.` });
      }

      const { columns, rows } = await getTableData(db, tableName);
      res.json({ columns, rows, count: rows.length, tableName });
    } catch (err) {
      console.error(`Error in /api/table/${req.params.dbName}:`, err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── API: stations (from otherDB) ──
  router.get('/api/stations', async (req, res) => {
    try {
      if (!otherDB) {
        console.error('otherDB is undefined or null.');
        return res.status(500).json({ error: 'Stations database not initialized.' });
      }
      const stationString = await otherDB.getStationList();
      const stations = stationString ? stationString.split(' | ').filter(s => s.trim() !== '') : [];
      res.json({ stations });
    } catch (err) {
      console.error('Error fetching stations:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Excel Export ──
  router.get('/export/:dbName', async (req, res) => {
    try {
      const { dbName } = req.params;
      let db, tableName;

      switch (dbName) {
        case 'transport_records':
          db = transportDB;
          tableName = 'transport_records';
          break;
        case 'customers':
          db = customersDB;
          tableName = 'customers';
          break;
        case 'transporter_details':
          db = transporterDB;
          tableName = 'Transporter-details';
          break;
        case 'users':
          db = userDB;
          tableName = 'users';
          break;
        case 'challan':
          db = challanDB;
          tableName = 'challan';
          break;
        case 'crossing':
          db = crossingDB;
          tableName = 'crossing_statement';
          break;
        default:
          return res.status(404).json({ error: 'Database not found' });
      }

      if (!db) {
        return res.status(500).json({ error: `Database "${dbName}" not initialized.` });
      }

      const { columns, rows } = await getTableData(db, tableName);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'No data available to export' });
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(tableName);

      const headerRow = worksheet.addRow(columns);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      rows.forEach((row, rowIndex) => {
        const rowValues = columns.map(col => {
          const value = row[col];
          if (typeof value === 'string' && isDateString(value)) {
            return parseDateString(value);
          }
          return value;
        });
        const dataRow = worksheet.addRow(rowValues);
        dataRow.eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          if (cell.value instanceof Date) cell.numFmt = 'dd-mm-yyyy hh:mm:ss';
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: rowIndex % 2 === 0 ? 'FFDDEBF7' : 'FFFFFFFF' }
          };
        });
      });

      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const length = cell.value ? cell.value.toString().length : 10;
          if (length > maxLength) maxLength = length;
        });
        column.width = Math.min(maxLength + 2, 50);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${tableName}_export.xlsx`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Date helpers (unchanged) ──
  function isDateString(value) {
    if (typeof value !== 'string') return false;
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return true;
    if (/^[A-Za-z]{3} [A-Za-z]{3} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT/.test(value)) return true;
    if (/^\d{2}-\d{2}-\d{4}/.test(value)) return true;
    if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) return true;
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return true;
    return false;
  }

  function parseDateString(dateString) {
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) return date;
      const match = dateString.match(/^[A-Za-z]{3} [A-Za-z]{3} (\d{2}) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT([+-]\d{4})/);
      if (match) {
        const [, day, year, hours, minutes, seconds, timezone] = match;
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthName = dateString.substring(4, 7);
        const month = (monthNames.indexOf(monthName) + 1).toString().padStart(2, '0');
        return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezone}`);
      }
      return dateString;
    } catch (_) { return dateString; }
  }

  return router;
}

// ── HTML generation (unchanged, but included for completeness) ──
function generateHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Database Viewer</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    /* same CSS as before – keep it */
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Inter', -apple-system, sans-serif; }
    :root {
      --primary-bg: #f9fafb;
      --container-bg: #ffffff;
      --header-bg: #4f46e5;
      --button-bg: #4f46e5;
      --button-active: #7c3aed;
      --button-hover: #6366f1;
      --th-bg: #4f46e5;
      --info-bg: #f8fafc;
      --text-color: #1f2937;
      --text-secondary: #6b7280;
      --footer-bg: #f8fafc;
      --footer-color: #6b7280;
      --even-row: #f9fafb;
      --hover-row: #f3f4f6;
      --border-color: #e5e7eb;
      --sort-btn-bg: rgba(255,255,255,0.2);
      --sort-btn-hover: rgba(255,255,255,0.3);
      --card-shadow: 0 1px 3px rgba(0,0,0,0.05);
      --button-shadow: 0 1px 2px rgba(0,0,0,0.05);
      --accent-color: #7c3aed;
    }
    body.dark-mode {
      --primary-bg: #111827;
      --container-bg: #1f2937;
      --header-bg: #4f46e5;
      --button-bg: #6366f1;
      --button-active: #8b5cf6;
      --button-hover: #818cf8;
      --th-bg: #4f46e5;
      --info-bg: #1f2937;
      --text-color: #f9fafb;
      --text-secondary: #9ca3af;
      --footer-bg: #1f2937;
      --footer-color: #9ca3af;
      --even-row: #1f2937;
      --hover-row: #374151;
      --border-color: #374151;
      --sort-btn-bg: rgba(255,255,255,0.1);
      --sort-btn-hover: rgba(255,255,255,0.2);
      --card-shadow: 0 1px 3px rgba(0,0,0,0.1);
      --button-shadow: 0 1px 2px rgba(0,0,0,0.1);
      --accent-color: #8b5cf6;
    }
    body {
      background: var(--primary-bg);
      color: var(--text-color);
      min-height: 100vh;
      padding: 12px;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    .container {
      max-width: 1800px;
      margin: 0 auto;
      background: var(--container-bg);
      border-radius: 10px;
      box-shadow: var(--card-shadow);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 97vh;
      transition: all 0.3s ease;
      border: 1px solid var(--border-color);
    }
    header {
      background: var(--header-bg);
      color: white;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    h1 { font-size: 1.5rem; font-weight: 600; }
    .theme-toggle {
      background: rgba(255,255,255,0.15);
      border: none;
      border-radius: 6px;
      padding: 8px 12px;
      color: white;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
    }
    .theme-toggle:hover { background: rgba(255,255,255,0.25); }
    .database-buttons {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px;
      padding: 12px;
      background: var(--info-bg);
      border-bottom: 1px solid var(--border-color);
      flex-shrink: 0;
      transition: all 0.3s;
    }
    .db-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: var(--button-bg);
      color: white;
      font-weight: 500;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: var(--button-shadow);
    }
    .db-btn:hover { background: var(--button-hover); }
    .db-btn.active { background: var(--button-active); box-shadow: 0 0 0 2px rgba(124,58,237,0.25); }
    .db-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .database-content {
      padding: 16px;
      padding-bottom: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      gap: 12px;
    }
    .db-info {
      padding: 10px 14px;
      background: var(--info-bg);
      border-radius: 6px;
      font-size: 0.85rem;
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.3s;
      border: 1px solid var(--border-color);
    }
    .export-btn {
      padding: 6px 12px;
      background: var(--button-bg);
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .export-btn:hover { background: var(--button-hover); }

    .table-scroll-container {
      overflow: auto;
      flex-grow: 1;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      position: relative;
      transition: all 0.3s;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      min-width: 600px;
    }
    th {
      background: var(--th-bg);
      color: white;
      padding: 10px 14px;
      text-align: left;
      position: sticky;
      top: 0;
      z-index: 10;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .sortable-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sort-buttons {
      display: flex;
      flex-direction: column;
      margin-left: 6px;
    }
    .sort-btn {
      background: var(--sort-btn-bg);
      border: none;
      border-radius: 2px;
      color: rgba(255,255,255,0.9);
      cursor: pointer;
      font-size: 9px;
      height: 12px;
      line-height: 9px;
      margin: 1px 0;
      padding: 0;
      width: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .sort-btn:hover { background: var(--sort-btn-hover); color: white; }
    .sort-btn.active { background: rgba(255,255,255,0.4) !important; color: white !important; font-weight: bold; }
    body.dark-mode .sort-btn.active { background: rgba(255,255,255,0.3) !important; }

    td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-color);
      white-space: nowrap;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    tr:nth-child(even) { background-color: var(--even-row); }
    tr:hover { background-color: var(--hover-row); }
    .no-data {
      text-align: center;
      padding: 30px;
      color: var(--text-secondary);
      font-style: italic;
    }
    .pagination-bar {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      padding-up: 0;
      flex-shrink: 0;
    }
    .pagination-bar button {
      padding: 4px 12px;
      background: var(--button-bg);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pagination-bar button:hover { background: var(--button-hover); }
    .pagination-bar button:disabled { opacity: 0.5; cursor: not-allowed; }
    .pagination-bar span {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }
    footer {
      text-align: center;
      padding: 12px;
      background: var(--footer-bg);
      color: var(--footer-color);
      border-top: 1px solid var(--border-color);
      flex-shrink: 0;
      font-size: 0.8rem;
    }
    .table-scroll-container::-webkit-scrollbar {
      height: 6px;
      width: 6px;
    }
    .table-scroll-container::-webkit-scrollbar-track {
      background: var(--even-row);
      border-radius: 3px;
    }
    .table-scroll-container::-webkit-scrollbar-thumb {
      background: var(--text-secondary);
      border-radius: 3px;
    }
    .table-scroll-container::-webkit-scrollbar-thumb:hover {
      background: var(--text-color);
    }
    @media (max-width: 768px) {
      body { padding: 8px; }
      .database-buttons { gap: 4px; }
      .db-btn { padding: 6px 12px; font-size: 0.8rem; }
      .db-info { flex-direction: column; gap: 6px; text-align: center; }
      header { flex-direction: column; gap: 8px; }
      .sort-buttons { margin-left: 4px; }
      .sort-btn { width: 14px; font-size: 8px; }
      th, td { padding: 8px 10px; }
      h1 { font-size: 1.3rem; }
    }
  </style>
</head>
<body>
<div class="container">
  <header>
    <h1>Database Viewer</h1>
    <button class="theme-toggle" id="themeToggle">
      <i class="fas fa-moon"></i> Dark Mode
    </button>
  </header>

  <div class="database-buttons">
    <button class="db-btn active" data-db="transport_records">Builty</button>
    <button class="db-btn" data-db="customers">Customers</button>
    <button class="db-btn" data-db="transporter_details">Transporters</button>
    <button class="db-btn" data-db="users">Users</button>
    <button class="db-btn" data-db="challan">Challan</button>
    <button class="db-btn" data-db="crossing">Crossing</button>
    <button class="db-btn" data-db="stations">Stations</button>
  </div>

  <div class="database-content">
    <div class="db-info" id="dbInfo">
      <span><strong id="dbNameLabel">Builty</strong></span>
      <span id="recordCount">Loading…</span>
      <button class="export-btn" id="exportBtn">
        <i class="fas fa-download"></i> Export
      </button>
    </div>
    <div class="table-scroll-container" id="tableContainer">
      <div id="tableWrapper">
        <div class="no-data">Loading data…</div>
      </div>
    </div>
    <div class="pagination-bar" id="paginationBar">
      <button id="prevPage" disabled>‹ Previous</button>
      <span id="pageInfo">Page 1 of 1</span>
      <button id="nextPage" disabled>Next ›</button>
    </div>
  </div>

  <footer>
    NISHAD M.P. TRANSPORT (INDORE) | Clearing, Forwarding & Transport Agent
  </footer>
</div>

<script>
  (function() {
    var state = {
      dbName: 'transport_records',
      columns: [],
      rows: [],
      pageSize: 100,
      currentPage: 1,
      sortColumn: null,
      sortDirection: null,
      isLoading: false,
      isStations: false,
    };

    var dbNameLabel = document.getElementById('dbNameLabel');
    var recordCount = document.getElementById('recordCount');
    var exportBtn = document.getElementById('exportBtn');
    var tableWrapper = document.getElementById('tableWrapper');
    var prevBtn = document.getElementById('prevPage');
    var nextBtn = document.getElementById('nextPage');
    var pageInfo = document.getElementById('pageInfo');

    // Theme toggle
    var themeToggle = document.getElementById('themeToggle');
    var body = document.body;
    if (localStorage.getItem('theme') === 'dark') {
      body.classList.add('dark-mode');
      themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    }
    themeToggle.addEventListener('click', function() {
      body.classList.toggle('dark-mode');
      if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
      } else {
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
      }
    });

    // Database buttons
    var dbButtons = document.querySelectorAll('.db-btn');
    dbButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var db = this.getAttribute('data-db');
        if (db === state.dbName && !state.isLoading) return;
        dbButtons.forEach(function(b) { b.classList.remove('active'); });
        this.classList.add('active');
        loadDatabase(db);
      });
    });

    // Pagination
    prevBtn.addEventListener('click', function() {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderTable();
      }
    });
    nextBtn.addEventListener('click', function() {
      var totalPages = Math.ceil(state.rows.length / state.pageSize);
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderTable();
      }
    });

    // Export
    exportBtn.addEventListener('click', function() {
      var db = state.isStations ? 'stations' : state.dbName;
      if (db === 'stations') {
        alert('Export for Stations is not implemented yet.');
        return;
      }
      window.location.href = '/export/' + db;
    });

    function loadDatabase(dbName) {
      if (state.isLoading) return;
      state.isLoading = true;
      state.currentPage = 1;
      state.sortColumn = null;
      state.sortDirection = null;

      tableWrapper.innerHTML = '<div class="no-data">Loading…</div>';
      recordCount.textContent = 'Loading…';
      exportBtn.disabled = true;

      if (dbName === 'stations') {
        fetch('/api/stations')
          .then(function(resp) {
            if (!resp.ok) throw new Error('Failed to fetch stations');
            return resp.json();
          })
          .then(function(data) {
            var stations = data.stations || [];
            state.rows = stations.map(function(s) { return { station: s }; });
            state.columns = ['station'];
            state.isStations = true;
            state.dbName = dbName;
            dbNameLabel.textContent = 'Stations';
            recordCount.textContent = stations.length + ' records';
            exportBtn.disabled = false;
            renderTable();
            state.isLoading = false;
          })
          .catch(function(err) {
            console.error(err);
            tableWrapper.innerHTML = '<div class="no-data">Error loading stations: ' + err.message + '</div>';
            recordCount.textContent = 'Error';
            state.isLoading = false;
          });
      } else {
        state.isStations = false;
        fetch('/api/table/' + dbName)
          .then(function(resp) {
            if (!resp.ok) throw new Error('Failed to fetch data');
            return resp.json();
          })
          .then(function(data) {
            state.rows = data.rows || [];
            state.columns = data.columns || [];
            state.dbName = dbName;
            var labelMap = {
              'transport_records': 'Builty',
              'customers': 'Customers',
              'transporter_details': 'Transporters',
              'users': 'Users',
              'challan': 'Challan',
              'crossing': 'Crossing'
            };
            dbNameLabel.textContent = labelMap[dbName] || dbName;
            recordCount.textContent = state.rows.length + ' records';
            exportBtn.disabled = false;
            renderTable();
            state.isLoading = false;
          })
          .catch(function(err) {
            console.error(err);
            tableWrapper.innerHTML = '<div class="no-data">Error loading data: ' + err.message + '</div>';
            recordCount.textContent = 'Error';
            state.isLoading = false;
          });
      }
    }

    function renderTable() {
      var rows = state.rows;
      var columns = state.columns;
      var pageSize = state.pageSize;
      var currentPage = state.currentPage;
      var totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

      if (currentPage > totalPages) state.currentPage = totalPages;

      var start = (state.currentPage - 1) * pageSize;
      var end = Math.min(start + pageSize, rows.length);
      var pageRows = rows.slice(start, end);

      var html = '<table><thead><tr>';
      columns.forEach(function(col) {
        var ascActive = (state.sortColumn === col && state.sortDirection === 'asc') ? 'active' : '';
        var descActive = (state.sortColumn === col && state.sortDirection === 'desc') ? 'active' : '';
        html += '<th><div class="sortable-header"><span>' + col + '</span><div class="sort-buttons">' +
                '<button class="sort-btn sort-asc ' + ascActive + '" data-col="' + col + '" data-dir="asc">▲</button>' +
                '<button class="sort-btn sort-desc ' + descActive + '" data-col="' + col + '" data-dir="desc">▼</button>' +
                '</div></div></th>';
      });
      html += '</tr></thead><tbody>';

      if (pageRows.length === 0) {
        html += '<tr><td colspan="' + columns.length + '" class="no-data">' + 
                (state.isStations ? 'No stations found' : 'No records') + '</td></tr>';
      } else {
        pageRows.forEach(function(row) {
          html += '<tr>';
          columns.forEach(function(col) {
            var val = row[col] !== undefined && row[col] !== null ? row[col] : '';
            if (typeof val === 'string' && /^\\d{4}-\\d{2}-\\d{2}/.test(val)) {
              var d = new Date(val);
              if (!isNaN(d.getTime())) val = d.toLocaleString();
            }
            html += '<td>' + val + '</td>';
          });
          html += '</tr>';
        });
      }
      html += '</tbody></table>';

      tableWrapper.innerHTML = html;

      pageInfo.textContent = 'Page ' + state.currentPage + ' of ' + totalPages;
      prevBtn.disabled = (state.currentPage <= 1);
      nextBtn.disabled = (state.currentPage >= totalPages);

      document.querySelectorAll('.sort-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var col = this.getAttribute('data-col');
          var dir = this.getAttribute('data-dir');
          handleSort(col, dir);
        });
      });
    }

    function handleSort(column, direction) {
      if (state.sortColumn === column && state.sortDirection === direction) {
        state.sortColumn = null;
        state.sortDirection = null;
      } else {
        state.sortColumn = column;
        state.sortDirection = direction;
      }
      var col = state.sortColumn;
      var dir = state.sortDirection;
      if (col && dir) {
        var multiplier = dir === 'asc' ? 1 : -1;
        state.rows.sort(function(a, b) {
          var aVal = a[col] !== undefined ? a[col] : '';
          var bVal = b[col] !== undefined ? b[col] : '';
          var aNum = parseFloat(aVal);
          var bNum = parseFloat(bVal);
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return (aNum - bNum) * multiplier;
          }
          var aDate = new Date(aVal);
          var bDate = new Date(bVal);
          if (!isNaN(aDate) && !isNaN(bDate)) {
            return (aDate - bDate) * multiplier;
          }
          aVal = aVal.toString().toLowerCase();
          bVal = bVal.toString().toLowerCase();
          return aVal.localeCompare(bVal) * multiplier;
        });
      }
      state.currentPage = 1;
      renderTable();
    }

    // Initial load
    loadDatabase('transport_records');
  })();
</script>
</body>
</html>
  `;
}

module.exports = createDatabaseViewer;
