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

  // Compute Total Amount: (paid or to_pay) - motor_freight - hammali - other_charges
  const computeTotalAmount = (record) => {
    let amount = 0;
    if (record.to_pay == 0) {
      amount = parseFloat(record.paid) || 0;
    } else if (record.paid == 0) {
      amount = parseFloat(record.to_pay) || 0;
    } else {
      // fallback: if both non-zero? Use to_pay as per typical logic
      amount = parseFloat(record.to_pay) || 0;
    }
    const motorFreight = parseFloat(record.motor_freight) || 0;
    const hammali = parseFloat(record.hammali) || 0;
    const otherCharges = parseFloat(record.other_charges) || 0;
    return amount - motorFreight - hammali - otherCharges;
  };

  // Open invoice in a new tab using the view mode URL
  const openInvoiceInNewTab = (record) => {
    const url = `${window.location.origin}/?component=InvoiceGenerator&mode=view&gr=${record.gr_no}`;
    window.open(url, '_blank');
  };

  // Dragging logic
  const handleMouseDown = (e) => {
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
      x: window.innerWidth / 2 - 400,
      y: window.innerHeight / 2 - 220
    });
  }, []);

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
                  <th>Created/Updated At</th>
                  <th>Total Amount (&#8377;)</th>
                  <th>Actual Wt. (KG)</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {transportRecords.map((record, index) => {
                  const totalAmount = computeTotalAmount(record);
                  const actualWeight = parseFloat(record.actual_weight) || 0;
                  const rate = actualWeight !== 0 ? (totalAmount / actualWeight).toFixed(1) : '0';
                  return (
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
                      <td>{getDisplayDate(record)}</td>
                      <td>{totalAmount}</td>
                      <td>{actualWeight}</td>
                      <td>{rate}</td>
                    </tr>
                  );
                })}
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
