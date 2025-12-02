import React, { useState, useEffect } from 'react';
import './TransactionHistory.css';
import { FaArrowLeft } from "react-icons/fa";

const TransactionHistory = ({ isLightMode, consignorName, consigneeName, onClose }) => {
  const [allCustomerNames, setAllCustomerNames] = useState([]);
  const [consignor, setConsignor] = useState(consignorName || '');
  const [consignee, setConsignee] = useState(consigneeName || '');
  const [transportRecords, setTransportRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [viewMode, setViewMode] = useState('table'); 
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchCustomerNames = async () => {
      try {
        const response = await fetch('http://43.230.202.198:3000/api/customers/all-names');
        const data = await response.json();
        setAllCustomerNames(data);
      } catch (err) {
        console.error('Failed to fetch customer names:', err);
      }
    };
    fetchCustomerNames();
  }, []);

  useEffect(() => {
    if (consignorName && consigneeName) {
      fetchTransportRecords();
    }
  }, [consignorName, consigneeName]);

  const fetchTransportRecords = async () => {
    if (!consignor || !consignee) {
      setError('Please enter both consignor and consignee names');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/transport-records/history?consignor=${encodeURIComponent(consignor)}&consignee=${encodeURIComponent(consignee)}`
      );
      const data = await response.json();
      
      if (response.ok) {
        // Sort by GR number in descending order
        const sortedRecords = data.sort((a, b) => b.gr_no - a.gr_no);
        setTransportRecords(sortedRecords);
        setExpandedInvoice(null);
        setViewMode('table');
      } else {
        throw new Error(data.error || 'Failed to fetch transport records');
      }
    } catch (err) {
      setError(err.message);
      setTransportRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (grNo) => {
    setExpandedInvoice(grNo);
    setViewMode('invoice');
    
    setPosition({
      x: window.innerWidth / 2 - 450,
      y: window.innerHeight / 2 - 300  
    });
  };

  const handleBackToTable = () => {
    setViewMode('table');
    setExpandedInvoice(null);
  };

  const getDisplayDate = (record) => {
    const createdAt = new Date(record.created_at);
    const updatedAt = record.updated_at ? new Date(record.updated_at) : null;
    
    if (updatedAt && updatedAt > createdAt) {
      return updatedAt.toLocaleString();
    }
    return createdAt.toLocaleString();
  };

  // Dragging functionality
  const handleMouseDown = (e) => {
    if (viewMode === 'invoice') return; 
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || viewMode === 'invoice') return;
    
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

  return (
    <div 
      className={`th-floating-window ${isLightMode ? 'th-light-mode' : 'th-dark-mode'} ${viewMode === 'invoice' ? 'th-invoice-mode' : ''}`}
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
        style={{ cursor: viewMode === 'table' ? 'move' : 'default' }}
      >
        <div className="th-window-title">
          Transaction History
        </div>
        <button className="th-window-close" onClick={onClose}>×</button>
      </div>
      
      <div className="th-window-content">
        {viewMode === 'table' ? (
          <>
            <div className="th-popup-header">
              <div className="th-consignor-consignee">
                <div><strong>Consignor:</strong> {consignor}</div>
                <div><strong>Consignee:</strong> {consignee}</div>
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
                      <th>Transaction No.</th>
                      <th>GR No.</th>
                      <th>Date</th>
                      <th>Created/Updated At</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transportRecords.map((record, index) => (
                      <tr key={record.gr_no}>
                        <td>{index + 1}</td>
                        <td>{record.gr_no}</td>
                        <td>{new Date(record.date).toLocaleDateString()}</td>
                        <td>{getDisplayDate(record)}</td>
                        <td>{record.from_location}</td>
                        <td>{record.to_location}</td>
                        <td>
                          <button 
                            onClick={() => handleViewInvoice(record.gr_no)}
                            className="th-view-btn"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="th-no-records">No transaction records found</div>
            )}
          </>
        ) : (
          <div className="th-invoice-view">
            <button 
              onClick={handleBackToTable}
              className="th-back-btn"
            >
              <FaArrowLeft /> Back to Transactions
            </button>
            
            {transportRecords
              .filter(record => record.gr_no === expandedInvoice)
              .map(record => (
                <div key={record.gr_no} className="th-full-invoice">
                  <div className="th-invoice-header">
                    <div className="th-company-name">M.P. TRANSPORT (INDORE)</div>
                    <div className="th-company-description">Clearing, Forwarding & Transport Agent</div>
                    
                    <div className="th-company-address">
                      <div className="th-address-left">
                        <div><strong>H.O.:</strong> 180, New Loha Mandi, Indore (M.P.) - 452001</div>
                        <div><strong>B.O.:</strong> 0771-2575983, 94253-15983</div>
                      </div>
                      <div className="th-address-right">
                        <div><strong>Mob:</strong> 94250-82053</div>
                        <div><strong>Ph:</strong> (0731)-2466047, 2364333, 2466379</div>
                        <div><strong>GSTIN:</strong> 23AACPT2351B1ZA</div>
                      </div>
                    </div>

                    <div className="th-invoice-meta">
                      <div className="th-form-group th-inline">
                        <strong>G.R. No.:&nbsp;</strong>
                        <span>{record.gr_no}</span>
                      </div>
                      <div className="th-form-group th-inline th-show-date">
                        <strong>Date:&nbsp;</strong>
                        <span>{new Date(record.date).toLocaleDateString()}</span>
                      </div>
                      <div className="th-form-group th-inline">
                        <strong>e-way Bill no.:&nbsp;</strong>
                        <span>{record.eway_bill_no}</span>
                      </div>
                    </div>

                    <div className="th-consignment-details">
                      <div className="th-consignment-from">
                        <div className="th-form-group th-inline">
                          <strong>From:</strong>
                          <span>{record.from_location}</span>
                        </div>
                        <div className="th-form-group th-inline">
                          <strong>Consignor Code:</strong>
                          <span>{record.consignor_code}</span>
                        </div>
                        <div className="th-form-group th-inline">
                          <strong>Consignor Name:</strong>
                          <span>{record.consignor_name}</span>
                        </div>
                        <div className="th-form-group th-inline">
                          <strong>Consignor GST:</strong>
                          <span>{record.consignor_gst}</span>
                        </div>
                      </div>
                      <div className="th-consignment-to">
                        <div className="th-form-group th-inline">
                          <strong>To:</strong>
                          <span>{record.to_location}</span>
                        </div>
                        <div className="th-form-group th-inline">
                          <strong>Consignee Code:</strong>
                          <span>{record.consignee_code}</span>
                        </div>
                        <div className="th-form-group th-inline">
                          <strong>Consignee Name:</strong>
                          <span>{record.consignee_name}</span>
                        </div>
                        <div className="th-form-group th-inline">
                          <strong>Consignee GST:</strong>
                          <span>{record.consignee_gst}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="th-payment-type">
                    <div className="th-form-group">
                      <label>
                        <strong>Payment Type: </strong>
                        <span>{record.payment_type === 'TO PAY' ? 'TO PAY' : 'PAID'}</span>
                      </label>
                    </div>
                  </div>

                  <div className="th-invoice-table">
                    <table>
                      <thead>
                        <tr className="th-header-row">
                          <th>Index</th>
                          <th>No. of Articles</th>
                          <th>Said to Contain</th>
                          <th>HSN</th>
                          <th>Tax Free (Yes/No)</th>
                          <th>Weight Chargeable</th>
                          <th>Actual Weight</th>
                          <th>{record.paid == 0 ? 'TO PAY' : 'PAID'}</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {record.articles.map((article, idx) => {
                          const articleNos = record.article_no?.split('|') || [];
                          const saidToContains = record.said_to_contain?.split('|') || [];
                          const taxFrees = record.tax_free?.split('|') || [];
                          const weightChargeables = record.weight_chargeable?.split('|') || [];
                          const actualWeights = record.actual_weight?.split('|') || [];
                          const hsns = record.hsn?.split('|') || [];
                          const amounts = record.amount?.split('|') || [];
                          const remarks = record.remarks?.split('|') || [];

                          return (
                            <tr key={idx}>
                              <td>{idx + 1}</td>
                              <td>{articleNos[idx] || ''}</td>
                              <td>{saidToContains[idx] || ''}</td>
                              <td>{hsns[idx] || ''}</td>
                              <td>{taxFrees[idx] || 'No'}</td>
                              <td>{weightChargeables[idx] || ''}</td>
                              <td>{actualWeights[idx] || ''}</td>
                              <td>{amounts[idx] || ''}</td>
                              <td>{remarks[idx] || ''}</td>
                            </tr>
                          );
                        })}
                        <tr className="th-total-row">
                          <td>Total</td>
                          <td>{
                            record.article_no?.split('|').reduce((sum, val) => sum + (Number(val) || 0), 0)
                          }</td>
                          <td></td>
                          <td></td>
                          <td></td>
                          <td>{
                            record.weight_chargeable?.split('|').reduce((sum, val) => sum + (Number(val) || 0), 0)
                          }</td>
                          <td>{
                            record.actual_weight?.split('|').reduce((sum, val) => sum + (Number(val) || 0), 0)
                          }</td>
                          <td>{
                            record.amount?.split('|').reduce((sum, val) => sum + (Number(val) || 0), 0)
                          }</td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="th-invoice-footer">
                    <div className="th-footer-left">
                      <div className="th-form-group th-inline">
                        <strong>Goods Type:</strong>
                        <span>{record.goods_type}</span>
                      </div>
                      <div className="th-form-group th-inline">
                        <strong>Value Declared:</strong>
                        <span>{record.value_declared}</span>
                      </div>
                      <div className="th-form-group th-inline">
                        <strong>GST Will be Paid By:</strong>
                        <span>{record.gst_will_be_paid_by}</span>
                      </div>
                      <p><strong>Subject to Indore Jurisdiction</strong></p>
                      <p><strong>AT OWNER'S RISK</strong></p>
                    </div>
                    <div className="th-footer-right">
                      <p>Driver Copy</p>
                      <div className="th-form-group th-inline th-signature">
                        <p className="th-signature">{record.driver_name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;