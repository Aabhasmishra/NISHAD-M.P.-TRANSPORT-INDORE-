const express = require('express');
const ExcelJS = require('exceljs');

function createDatabaseViewer(transportDB, customersDB, transporterDB, userDB, challanDB, shippingStatusDB, paymentDB) {
  const router = express.Router();
  
  // Helper function to get database inspection
  async function inspectDatabase(db, tableName) {
    try {
      if (db && typeof db.inspectDatabase === 'function') {
        const result = await db.inspectDatabase();
        if (result && result.table && !result.tables) {
          return {
            database: 'mp_transport',
            tables: [result]
          };
        }

        return result;

      } else {
        return {
          database: 'mp_transport',
          tables: [{
            table: tableName,
            columns: [],
            Table_Content: []
          }]
        };
      }
    } catch (err) {
      console.error(`Error inspecting ${tableName}:`, err);
      return { 
        error: err.message,
        database: 'mp_transport',
        tables: [{
          table: tableName,
          columns: [],
          Table_Content: []
        }]
      };
    }
  }
  
  // Route to render the database viewer
  router.get('/AabhasServer', async (req, res) => {
    try {
      // Get data from all databases
      const transportData = await inspectDatabase(transportDB, 'transport_records');
      const customersData = await inspectDatabase(customersDB, 'customers');
      const transporterData = await inspectDatabase(transporterDB, 'Transporter-details');
      const userData = await inspectDatabase(userDB, 'users');
      const challanData = await inspectDatabase(challanDB, 'challan');
      const shippingStatusData = await inspectDatabase(shippingStatusDB, 'status');
      const paymentData = await inspectDatabase(paymentDB, 'payment');
      
      // Generate HTML with embedded CSS and JavaScript
      const html = generateHTML({
        transportData,
        customersData,
        transporterData,
        userData,
        challanData,
        shippingStatusData,
        paymentData
      });
      
      res.send(html);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  // Route to export database to Excel
  router.get('/export/:dbName', async (req, res) => {
    try {
      const { dbName } = req.params;
      let dbData;
      let actualTableName;
      
      // Get the appropriate database data
      switch (dbName) {
        case 'transport_records':
          dbData = await inspectDatabase(transportDB, 'transport_records');
          actualTableName = 'transport_records';
          break;
        case 'customers':
          dbData = await inspectDatabase(customersDB, 'customers');
          actualTableName = 'customers';
          break;
        case 'transporter_details':
          dbData = await inspectDatabase(transporterDB, 'Transporter-details');
          actualTableName = 'Transporter-details';
          break;
        case 'users':
          dbData = await inspectDatabase(userDB, 'users');
          actualTableName = 'users';
          break;
        case 'challan':
          dbData = await inspectDatabase(challanDB, 'challan');
          actualTableName = 'challan';
          break;
        case 'status':
          dbData = await inspectDatabase(shippingStatusDB, 'status');
          actualTableName = 'status';
          break;
        case 'payment':
          dbData = await inspectDatabase(paymentDB, 'payment');
          actualTableName = 'payment';
          break;
        default:
          return res.status(404).json({ error: 'Database not found' });
      }
      
      if (!dbData.tables || !dbData.tables[0] || !dbData.tables[0].Table_Content || dbData.tables[0].Table_Content.length === 0) {
        return res.status(404).json({ error: 'No data available to export' });
      }
      
      // Create workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(actualTableName);
      
      // Get table data
      const tableData = dbData.tables[0];
      const columns = Object.keys(tableData.Table_Content[0]);
      
      const headerRow = worksheet.addRow(columns);
      headerRow.eachCell((cell, colNumber) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F81BD' }
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' },
          bold: true
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      
      tableData.Table_Content.forEach((row, rowIndex) => {
        const rowValues = columns.map(col => {
          const value = row[col];
          if (typeof value === 'string' && isDateString(value)) {
            return parseDateString(value);
          }
          return value;
        });
        
        const dataRow = worksheet.addRow(rowValues);
        
        dataRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          if (cell.value instanceof Date) {
            cell.numFmt = 'dd-mm-yyyy hh:mm:ss';
          }
          
          if (rowIndex % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFDDEBF7' }
            };
          } else {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFFFF' }
            };
          }
        });
      });
      
      // Auto-fit columns
      worksheet.columns.forEach(column => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50);
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${actualTableName}_export.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      res.status(500).json({ error: err.message });
    }
  });

// Helper function to check if a string is a date
function isDateString(value) {
  if (typeof value !== 'string') return false;
  
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return true;
  
  if (/^[A-Za-z]{3} [A-Za-z]{3} \d{2} \d{4} \d{2}:\d{2}:\d{2} GMT/.test(value)) return true;
  
  if (/^\d{2}-\d{2}-\d{4}/.test(value)) return true;
  if (/^\d{2}\/\d{2}\/\d{4}/.test(value)) return true;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return true;
  
  return false;
}

// Helper function to parse date strings
function parseDateString(dateString) {
  try {
    // Try to parse the date string
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    const match = dateString.match(/^[A-Za-z]{3} [A-Za-z]{3} (\d{2}) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT([+-]\d{4})/);
    
    if (match) {
      const day = match[1];
      const year = match[2];
      const hours = match[3];
      const minutes = match[4];
      const seconds = match[5];
      const timezone = match[6];
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthName = dateString.substring(4, 7);
      const month = (monthNames.indexOf(monthName) + 1).toString().padStart(2, '0');
      
      const isoDateString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezone}`;
      return new Date(isoDateString);
    }
    
    return dateString;
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return dateString;
  }
}
  
  return router;
}

// Generate the HTML page with embedded CSS and JavaScript
function generateHTML(data) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Viewer</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        :root {
            /* Light theme - Refined modern palette */
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
            --sort-btn-bg: rgba(255, 255, 255, 0.2);
            --sort-btn-hover: rgba(255, 255, 255, 0.3);
            --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            --button-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            --accent-color: #7c3aed;
        }
        
        body.dark-mode {
            /* Dark theme - Sophisticated dark palette */
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
            --sort-btn-bg: rgba(255, 255, 255, 0.1);
            --sort-btn-hover: rgba(255, 255, 255, 0.2);
            --card-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            --button-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            --accent-color: #8b5cf6;
        }
        
        body {
            background: var(--primary-bg);
            color: var(--text-color);
            min-height: 100vh;
            padding: 12px;
            overflow: hidden;
            transition: all 0.3s ease;
            line-height: 1.5;
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
            text-align: center;
            flex-shrink: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        h1 {
            font-size: 1.5rem;
            margin-bottom: 0;
            font-weight: 600;
            letter-spacing: -0.025em;
        }
        
        .theme-toggle {
            background: rgba(255, 255, 255, 0.15);
            border: none;
            border-radius: 6px;
            padding: 8px 12px;
            color: white;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.85rem;
        }
        
        .theme-toggle:hover {
            background: rgba(255, 255, 255, 0.25);
        }
        
        .database-buttons {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 6px;
            padding: 12px;
            background: var(--info-bg);
            border-bottom: 1px solid var(--border-color);
            flex-shrink: 0;
            transition: all 0.3s ease;
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
            transition: all 0.2s ease;
            box-shadow: var(--button-shadow);
        }
        
        .db-btn:hover {
            background: var(--button-hover);
        }
        
        .db-btn.active {
            background: var(--button-active);
            box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.25);
        }
        
        .database-content {
            padding: 16px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            flex-grow: 1;
            gap: 12px;
        }
        
        .db-section {
            display: none;
            flex-direction: column;
            height: 100%;
        }
        
        .db-section.active {
            display: flex;
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
            transition: all 0.3s ease;
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
            transition: all 0.2s ease;
            box-shadow: var(--button-shadow);
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .export-btn:hover {
            background: var(--button-hover);
        }
        
        .table-scroll-container {
            overflow: auto;
            flex-grow: 1;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            position: relative;
            transition: all 0.3s ease;
        }
        
        .table-container {
            min-width: 100%;
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
            color: rgba(255, 255, 255, 0.9);
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
            transition: all 0.2s ease;
        }
        
        .sort-btn:hover {
            background: var(--sort-btn-hover);
            color: white;
        }
        
        .sort-btn.active {
          background: rgba(255, 255, 255, 0.4) !important;
          color: white !important;
          font-weight: bold;
        }

        body.dark-mode .sort-btn.active {
          background: rgba(255, 255, 255, 0.3) !important;
          color: white !important;
          font-weight: bold;
        }
        
        td {
            padding: 10px 14px;
            border-bottom: 1px solid var(--border-color);
            white-space: nowrap;
            font-size: 0.85rem;
            color: var(--text-secondary);
        }
        
        tr:nth-child(even) {
            background-color: var(--even-row);
        }
        
        tr:hover {
            background-color: var(--hover-row);
        }
        
        .no-data {
            text-align: center;
            padding: 30px;
            color: var(--text-secondary);
            font-style: italic;
        }
        
        footer {
            text-align: center;
            padding: 12px;
            background: var(--footer-bg);
            color: var(--footer-color);
            border-top: 1px solid var(--border-color);
            flex-shrink: 0;
            font-size: 0.8rem;
            transition: all 0.3s ease;
        }
        
        /* Custom scrollbar */
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
            body {
                padding: 8px;
            }
            
            .database-buttons {
                gap: 4px;
            }
            
            .db-btn {
                padding: 6px 12px;
                font-size: 0.8rem;
            }
            
            .db-info {
                flex-direction: column;
                gap: 6px;
                text-align: center;
            }
            
            header {
                flex-direction: column;
                gap: 8px;
            }
            
            .sort-buttons {
                margin-left: 4px;
            }
            
            .sort-btn {
                width: 14px;
                font-size: 8px;
            }
            
            th, td {
                padding: 8px 10px;
            }
            
            h1 {
                font-size: 1.3rem;
            }
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
            <button class="db-btn" data-db="payment">Payment</button>
            <button class="db-btn" data-db="transporter_details">Transporters</button>
            <button class="db-btn" data-db="users">Users</button>
            <button class="db-btn" data-db="challan">Challan</button>
            <button class="db-btn" data-db="status">Status</button>
        </div>
        
        <div class="database-content">
            <div id="transport_records" class="db-section active">
                <div class="db-info">
                    <span><strong>Database:</strong> Builty</span>
                    <span><strong>Records:</strong> ${data.transportData.tables && data.transportData.tables[0] ? data.transportData.tables[0].Table_Content.length : 0}</span>
                    <button class="export-btn" data-db="transport_records">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
                <div class="table-scroll-container">
                    <div class="table-container">
                        ${renderTable(data.transportData.tables && data.transportData.tables[0] ? data.transportData.tables[0] : null, 'transport_records')}
                    </div>
                </div>
            </div>
            
            <div id="customers" class="db-section">
                <div class="db-info">
                    <span><strong>Database:</strong> customers</span>
                    <span><strong>Records:</strong> ${data.customersData.tables && data.customersData.tables[0] ? data.customersData.tables[0].Table_Content.length : 0}</span>
                    <button class="export-btn" data-db="customers">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
                <div class="table-scroll-container">
                    <div class="table-container">
                        ${renderTable(data.customersData.tables && data.customersData.tables[0] ? data.customersData.tables[0] : null, 'customers')}
                    </div>
                </div>
            </div>
            
            <div id="payment" class="db-section">
                <div class="db-info">
                    <span><strong>Database:</strong> payment</span>
                    <span><strong>Records:</strong> ${data.paymentData.tables && data.paymentData.tables[0] ? data.paymentData.tables[0].Table_Content.length : 0}</span>
                    <button class="export-btn" data-db="payment">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
                <div class="table-scroll-container">
                    <div class="table-container">
                        ${renderTable(data.paymentData.tables && data.paymentData.tables[0] ? data.paymentData.tables[0] : null, 'payment')}
                    </div>
                </div>
            </div>
            
            <div id="transporter_details" class="db-section">
                <div class="db-info">
                    <span><strong>Database:</strong> Transporter Details</span>
                    <span><strong>Records:</strong> ${data.transporterData.tables && data.transporterData.tables[0] ? data.transporterData.tables[0].Table_Content.length : 0}</span>
                    <button class="export-btn" data-db="transporter_details">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
                <div class="table-scroll-container">
                    <div class="table-container">
                        ${renderTable(data.transporterData.tables && data.transporterData.tables[0] ? data.transporterData.tables[0] : null, 'transporter_details')}
                    </div>
                </div>
            </div>
            
            <div id="users" class="db-section">
                <div class="db-info">
                    <span><strong>Database:</strong> users</span>
                    <span><strong>Records:</strong> ${data.userData.tables && data.userData.tables[0] ? data.userData.tables[0].Table_Content.length : 0}</span>
                    <button class="export-btn" data-db="users">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
                <div class="table-scroll-container">
                    <div class="table-container">
                        ${renderTable(data.userData.tables && data.userData.tables[0] ? data.userData.tables[0] : null, 'users')}
                    </div>
                </div>
            </div>
            
            <div id="challan" class="db-section">
                <div class="db-info">
                    <span><strong>Database:</strong> challan</span>
                    <span><strong>Records:</strong> ${data.challanData.tables && data.challanData.tables[0] ? data.challanData.tables[0].Table_Content.length : 0}</span>
                    <button class="export-btn" data-db="challan">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
                <div class="table-scroll-container">
                    <div class="table-container">
                        ${renderTable(data.challanData.tables && data.challanData.tables[0] ? data.challanData.tables[0] : null, 'challan')}
                    </div>
                </div>
            </div>
            
            <div id="status" class="db-section">
                <div class="db-info">
                    <span><strong>Database:</strong> status</span>
                    <span><strong>Records:</strong> ${data.shippingStatusData.tables && data.shippingStatusData.tables[0] ? data.shippingStatusData.tables[0].Table_Content.length : 0}</span>
                    <button class="export-btn" data-db="status">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
                <div class="table-scroll-container">
                    <div class="table-container">
                        ${renderTable(data.shippingStatusData.tables && data.shippingStatusData.tables[0] ? data.shippingStatusData.tables[0] : null, 'status')}
                    </div>
                </div>
            </div>
        </div>
        
        <footer>
            NISHAD M.P. TRANSPORT (INDORE) | Clearing, Forwarding & Transport Agent
        </footer>
    </div>

    <script>
        function showDatabase(dbName) {
            var sections = document.querySelectorAll('.db-section');
            for (var i = 0; i < sections.length; i++) {
                sections[i].classList.remove('active');
            }
            
            var dbSection = document.getElementById(dbName);
            if (dbSection) {
                dbSection.classList.add('active');
            }
            
            var buttons = document.querySelectorAll('.db-btn');
            for (var i = 0; i < buttons.length; i++) {
                buttons[i].classList.remove('active');
            }
            
            var activeButton = document.querySelector('.db-btn[data-db="' + dbName + '"]');
            if (activeButton) {
                activeButton.classList.add('active');
            }
            
            setTimeout(initializeSorting, 100);
        }
        
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
        
        var dbButtons = document.querySelectorAll('.db-btn');
        for (var i = 0; i < dbButtons.length; i++) {
            dbButtons[i].addEventListener('click', function() {
                var dbName = this.getAttribute('data-db');
                showDatabase(dbName);
            });
        }
        
        var exportButtons = document.querySelectorAll('.export-btn');
        for (var i = 0; i < exportButtons.length; i++) {
            exportButtons[i].addEventListener('click', function() {
                var dbName = this.getAttribute('data-db');
                window.location.href = '/export/' + dbName;
            });
        }
        
        function tryParseDate(value) {
            if (!value) return null;
            var date = new Date(value);
            return !isNaN(date.getTime()) ? date : null;
        }

        function sortTable(table, columnIndex, direction) {
            var tbody = table.querySelector('tbody');
            if (!tbody) return;
            
            var rows = Array.from(tbody.querySelectorAll('tr'));
            
            var isNumeric = true;
            var hasData = false;
            
            for (var i = 0; i < rows.length; i++) {
                var cell = rows[i].cells[columnIndex];
                if (cell) {
                    var value = cell.textContent || cell.innerText || '';
                    value = value.trim();
                    
                    if (value !== '' && !/^-?\d*\.?\d+$/.test(value)) {
                        isNumeric = false;
                    }
                    if (value !== '') {
                        hasData = true;
                    }
                }
            }
            
            if (!hasData) return;
            
            rows.sort(function(a, b) {
                var aCell = a.cells[columnIndex];
                var bCell = b.cells[columnIndex];
                
                var aValue = aCell ? (aCell.textContent || aCell.innerText || '') : '';
                var bValue = bCell ? (bCell.textContent || bCell.innerText || '') : '';
                
                aValue = aValue.toString().trim();
                bValue = bValue.toString().trim();
                
                if (aValue === '' && bValue === '') return 0;
                if (aValue === '') return direction === 'asc' ? -1 : 1;
                if (bValue === '') return direction === 'asc' ? 1 : -1;
                
                if (isNumeric) {
                    aValue = parseFloat(aValue) || 0;
                    bValue = parseFloat(bValue) || 0;
                    
                    if (direction === 'asc') {
                        return aValue - bValue;
                    } else {
                        return bValue - aValue;
                    }
                } else {
                    var aDate = tryParseDate(aValue);
                    var bDate = tryParseDate(bValue);
                    
                    if (aDate && bDate) {
                        if (direction === 'asc') {
                            return aDate - bDate;
                        } else {
                            return bDate - aDate;
                        }
                    }
                    
                    aValue = aValue.toLowerCase();
                    bValue = bValue.toLowerCase();
                    
                    if (direction === 'asc') {
                        return aValue.localeCompare(bValue);
                    } else {
                        return bValue.localeCompare(aValue);
                    }
                }
            });
            
            while (tbody.firstChild) {
                tbody.removeChild(tbody.firstChild);
            }
            
            for (var i = 0; i < rows.length; i++) {
                tbody.appendChild(rows[i]);
            }
        }

        function updateSortButtons(headerRow, columnIndex, direction) {
            var headers = headerRow.parentNode.querySelectorAll('th');
            
            for (var i = 0; i < headers.length; i++) {
                var sortAscBtn = headers[i].querySelector('.sort-asc');
                var sortDescBtn = headers[i].querySelector('.sort-desc');
                
                if (sortAscBtn && sortDescBtn) {
                    if (i === columnIndex) {
                        sortAscBtn.classList.toggle('active', direction === 'asc');
                        sortDescBtn.classList.toggle('active', direction === 'desc');
                    } else {
                        sortAscBtn.classList.remove('active');
                        sortDescBtn.classList.remove('active');
                    }
                }
            }
        }

        function initializeSorting() {
            var tables = document.querySelectorAll('table');
            
            for (var t = 0; t < tables.length; t++) {
                var table = tables[t];
                var headers = table.querySelectorAll('th');
                var tbody = table.querySelector('tbody');
                
                if (!tbody) continue;
                
                for (var i = 0; i < headers.length; i++) {
                    var header = headers[i];
                    var sortAscBtn = header.querySelector('.sort-asc');
                    var sortDescBtn = header.querySelector('.sort-desc');
                    
                    if (sortAscBtn) {
                        sortAscBtn.replaceWith(sortAscBtn.cloneNode(true));
                        sortAscBtn = header.querySelector('.sort-asc');
                        
                        sortAscBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            var headerCell = this.closest('th');
                            var headerRow = headerCell.parentElement;
                            var table = headerRow.closest('table');
                            var columnIndex = Array.prototype.indexOf.call(headerRow.cells, headerCell);
                            sortTable(table, columnIndex, 'asc');
                            updateSortButtons(headerRow, columnIndex, 'asc');
                        });
                    }
                    
                    if (sortDescBtn) {
                        sortDescBtn.replaceWith(sortDescBtn.cloneNode(true));
                        sortDescBtn = header.querySelector('.sort-desc');
                        
                        sortDescBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            var headerCell = this.closest('th');
                            var headerRow = headerCell.parentElement;
                            var table = headerRow.closest('table');
                            var columnIndex = Array.prototype.indexOf.call(headerRow.cells, headerCell);
                            sortTable(table, columnIndex, 'desc');
                            updateSortButtons(headerRow, columnIndex, 'desc');
                        });
                    }
                }
            }
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initializeSorting, 500);
        });
        
        setTimeout(initializeSorting, 1000);
    </script>
</body>
</html>
  `;
}

// Render a table with sorting buttons
function renderTable(tableData, tableId) {
  if (!tableData || !tableData.Table_Content || tableData.Table_Content.length === 0) {
    return '<div class="no-data">No data available</div>';
  }
  
  const columns = Object.keys(tableData.Table_Content[0]);
  let html = `
    <table id="${tableId}-table">
      <thead>
        <tr>
  `;
  
  // Create table headers with sorting buttons
  columns.forEach(col => {
    html += `
      <th>
        <div class="sortable-header">
          <span>${col}</span>
          <div class="sort-buttons">
            <button class="sort-btn sort-asc" title="Sort ascending">▲</button>
            <button class="sort-btn sort-desc" title="Sort descending">▼</button>
          </div>
        </div>
      </th>
    `;
  });
  
  html += `
        </tr>
      </thead>
      <tbody>
  `;
  
  // Create table rows
  tableData.Table_Content.forEach(row => {
    html += `<tr>`;
    columns.forEach(col => {
      const value = row[col] !== null && row[col] !== undefined ? row[col] : '';
      html += `<td>${formatValue(value)}</td>`;
    });
    html += `</tr>`;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  return html;
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Format dates
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString();
    }
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  return value.toString();
}

module.exports = createDatabaseViewer;