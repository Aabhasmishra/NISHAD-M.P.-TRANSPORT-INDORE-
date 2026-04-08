import React, { useState, useEffect } from 'react';
import './TransactionHistory.css';

const TransactionHistory = ({ 
  isLightMode, 
  consignorName = '',
  consigneeName = '',
  consignorGst = '',
  consigeeGst = '',
  onClose
}) => {
  const [transportRecords, setTransportRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Fetch history when GSTs are available
  useEffect(() => {
    if (consignorGst && consigeeGst) {
      fetchTransportRecords();
    } else {
      // Optionally show a message if GSTs missing
      setError('Customer GSTs not provided. Cannot fetch transaction history.');
    }
  }, [consignorGst, consigeeGst]);

  const fetchTransportRecords = async () => {
    if (!consignorGst || !consigeeGst) return;

    setLoading(true);
    setError('');
    try {
      const url = `http://43.230.202.198:3000/api/transport-records/history?consignorGst=${encodeURIComponent(consignorGst)}&consigeeGst=${encodeURIComponent(consigeeGst)}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        const sortedRecords = data.sort((a, b) => b.gr_no - a.gr_no);
        setTransportRecords(sortedRecords);
      } else {
        throw new Error(data.error || 'Failed to fetch transport records');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
      setTransportRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayDate = (record) => {
    const createdAt = new Date(record.created_at);
    const updatedAt = record.updated_at ? new Date(record.updated_at) : null;
    if (updatedAt && updatedAt > createdAt) {
      return updatedAt.toLocaleString();
    }
    return createdAt.toLocaleString();
  };

  // Open invoice in a new tab
  const openInvoiceInNewTab = (record) => {
    const articles = [];
    const articleNos = record.article_no?.split('|') || [];
    const saidToContains = record.said_to_contain?.split('|') || [];
    const taxFrees = record.tax_free?.split('|') || [];
    const weightChargeables = record.weight_chargeable?.split('|') || [];
    const actualWeights = record.actual_weight?.split('|') || [];
    const hsns = record.hsn?.split('|') || [];
    const amounts = record.amount?.split('|') || [];
    const remarks = record.remarks?.split('|') || [];

    for (let i = 0; i < record.article_length; i++) {
      articles.push({
        noIndex: i + 1,
        noOfArticles: articleNos[i] || '',
        saidToContain: saidToContains[i] || '',
        taxFree: taxFrees[i] || 'No',
        weightChargeable: weightChargeables[i] || '',
        actualWeight: actualWeights[i] || '',
        hsn: hsns[i] || '',
        amount: amounts[i] || '',
        remarks: remarks[i] || ''
      });
    }

    const totalArticles = articleNos.reduce((sum, val) => sum + (Number(val) || 0), 0);
    const totalWeightChargeable = weightChargeables.reduce((sum, val) => sum + (Number(val) || 0), 0);
    const totalActualWeight = actualWeights.reduce((sum, val) => sum + (Number(val) || 0), 0);
    const totalAmount = amounts.reduce((sum, val) => sum + (Number(val) || 0), 0);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${record.gr_no}</title>
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family: Arial, sans-serif; background:#fff; padding:20px; color:#000; }
          .invoice-container { max-width:1200px; margin:0 auto; background:#fff; border:1px solid #ddd; padding:20px; }
          .company-name { font-size:24px; font-weight:bold; text-align:center; }
          .company-description { text-align:center; font-size:14px; margin-bottom:10px; }
          .company-address { display:flex; justify-content:space-between; border-top:1px solid #000; border-bottom:1px solid #000; padding:8px 0; margin-bottom:15px; font-size:12px; }
          .address-left, .address-right { flex:1; }
          .invoice-meta { display:flex; justify-content:space-between; margin-bottom:20px; padding:8px; background:#f9f9f9; }
          .consignment-details { display:flex; justify-content:space-between; margin-bottom:20px; gap:20px; }
          .consignment-from, .consignment-to { flex:1; border:1px solid #ccc; padding:10px; }
          .form-group { margin-bottom:6px; }
          .form-group strong { display:inline-block; width:130px; }
          .payment-type { margin-bottom:20px; padding:8px; background:#f0f0f0; }
          table { width:100%; border-collapse:collapse; margin-bottom:20px; }
          th, td { border:1px solid #000; padding:6px; text-align:left; font-size:12px; }
          th { background:#f2f2f2; }
          .total-row { background:#f9f9f9; font-weight:bold; }
          .invoice-footer { display:flex; justify-content:space-between; margin-top:30px; padding-top:20px; border-top:1px solid #ccc; }
          .footer-left { flex:2; }
          .footer-right { flex:1; text-align:center; }
          .signature { margin-top:40px; border-top:1px solid #000; padding-top:5px; width:200px; text-align:center; }
          @media print { body { padding:0; } .invoice-container { border:none; } }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="company-name">M.P. TRANSPORT (INDORE)</div>
          <div class="company-description">Clearing, Forwarding & Transport Agent</div>
          <div class="company-address">
            <div class="address-left">
              <div><strong>H.O.:</strong> 180, New Loha Mandi, Indore (M.P.) - 452001</div>
              <div><strong>B.O.:</strong> 0771-2575983, 94253-15983</div>
            </div>
            <div class="address-right">
              <div><strong>Mob:</strong> 94250-82053</div>
              <div><strong>Ph:</strong> (0731)-2466047, 2364333, 2466379</div>
              <div><strong>GSTIN:</strong> 23AACPT2351B1ZA</div>
            </div>
          </div>
          <div class="invoice-meta">
            <div><strong>G.R. No.:</strong> ${record.gr_no}</div>
            <div><strong>Date:</strong> ${new Date(record.date).toLocaleDateString()}</div>
            <div><strong>e-way Bill no.:</strong> ${record.eway_bill_no || ''}</div>
          </div>
          <div class="consignment-details">
            <div class="consignment-from">
              <div class="form-group"><strong>From:</strong> ${record.from_location}</div>
              <div class="form-group"><strong>Consignor Code:</strong> ${record.consignor_code}</div>
              <div class="form-group"><strong>Consignor Name:</strong> ${record.consignor_name}</div>
              <div class="form-group"><strong>Consignor GST:</strong> ${record.consignor_gst}</div>
            </div>
            <div class="consignment-to">
              <div class="form-group"><strong>To:</strong> ${record.to_location}</div>
              <div class="form-group"><strong>Consignee Code:</strong> ${record.consignee_code}</div>
              <div class="form-group"><strong>Consignee Name:</strong> ${record.consignee_name}</div>
              <div class="form-group"><strong>Consignee GST:</strong> ${record.consignee_gst}</div>
            </div>
          </div>
          <div class="payment-type"><strong>Payment Type:</strong> ${record.payment_type === 'TO PAY' ? 'TO PAY' : 'PAID'}</div>
          <table>
            <thead><tr><th>Index</th><th>No. of Articles</th><th>Said to Contain</th><th>HSN</th><th>Tax Free</th><th>Weight Chargeable</th><th>Actual Weight</th><th>${record.paid == 0 ? 'TO PAY' : 'PAID'}</th><th>Remarks</th></tr></thead>
            <tbody>
              ${articles.map(art => `
                <tr>
                  <td>${art.noIndex}</td>
                  <td>${art.noOfArticles}</td>
                  <td>${art.saidToContain}</td>
                  <td>${art.hsn}</td>
                  <td>${art.taxFree}</td>
                  <td>${art.weightChargeable}</td>
                  <td>${art.actualWeight}</td>
                  <td>${art.amount}</td>
                  <td>${art.remarks}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td>Total</td>
                <td>${totalArticles}</td>
                <td></td><td></td><td></td>
                <td>${totalWeightChargeable}</td>
                <td>${totalActualWeight}</td>
                <td>${totalAmount}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <div class="invoice-footer">
            <div class="footer-left">
              <div><strong>Goods Type:</strong> ${record.goods_type}</div>
              <div><strong>Value Declared:</strong> ${record.value_declared}</div>
              <div><strong>GST Will be Paid By:</strong> ${record.gst_will_be_paid_by}</div>
              <p><strong>Subject to Indore Jurisdiction</strong></p>
              <p><strong>AT OWNER'S RISK</strong></p>
            </div>
            <div class="footer-right">
              <p>Driver Copy</p>
              <div class="signature">${record.driver_name || ''}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(htmlContent);
      newWindow.document.close();
    } else {
      alert('Please allow pop-ups to view the invoice.');
    }
  };

  // Dragging logic
  const handleMouseDown = (e) => {
    // Only allow dragging if clicking on the header (target is header or its child)
    if (e.target.closest('.th-window-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    setPosition({
      x: window.innerWidth / 2 - 300,
      y: window.innerHeight / 2 - 200
    });
  }, []);

  // Safe close handler
  const handleClose = () => {
    if (onClose && typeof onClose === 'function') {
      onClose();
    } else {
      console.warn('onClose prop is missing or not a function');
    }
  };

  return (
    <div 
      className={`th-floating-window ${isLightMode ? 'th-light-mode' : 'th-dark-mode'}`}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        className="th-window-header"
        onMouseDown={handleMouseDown}
        style={{ cursor: 'move' }}
      >
        <div className="th-window-title">Transaction History</div>
        <button className="th-window-close" onClick={handleClose}>×</button>
      </div>
      
      <div className="th-window-content">
        <div className="th-popup-header">
          <div className="th-consignor-consignee">
            <div><strong>Consignor:</strong> {consignorName || 'Not provided'}</div>
            <div><strong>Consignee:</strong> {consigneeName || 'Not provided'}</div>
          </div>
        </div>

        {loading ? (
          <div className="th-loading">Loading...</div>
        ) : error ? (
          <div className="th-error-message">{error}</div>
        ) : transportRecords.length > 0 ? (
          <div className="th-table-container">
            <table className="th-history-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>GR No.</th>
                  <th>Date</th>
                  <th>Created/Updated At</th>
                  <th>From</th>
                  <th>To</th>
                </tr>
              </thead>
              <tbody>
                {transportRecords.map((record, index) => (
                  <tr key={record.gr_no}>
                    <td>{index + 1}</td>
                    <td>
                      <button 
                        onClick={() => openInvoiceInNewTab(record)}
                        className="th-gr-link"
                      >
                        {record.gr_no}
                      </button>
                    </td>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                    <td>{getDisplayDate(record)}</td>
                    <td>{record.from_location}</td>
                    <td>{record.to_location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="th-no-records">No transaction records found</div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
