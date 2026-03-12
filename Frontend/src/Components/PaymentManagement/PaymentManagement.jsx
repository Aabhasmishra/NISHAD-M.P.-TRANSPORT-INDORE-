import React, { useState, useEffect, useRef } from 'react';
import './PaymentManagement.css';
import PopupAlert from '../PopupAlert/PopupAlert';
import { formatNumericValue } from '../HelpFulComponents/FormatNumericValue'

// Inline SVG icons (same as in Challan)
const IoAdd = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256 48C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48zm96 224h-80v80h-32v-80h-80v-32h80v-80h32v80h80v32z"></path></svg>;
import { IoSearch } from "react-icons/io5";
const IoTrash = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M296 64h-80a7.91 7.91 0 00-8 8v24h96V72a7.91 7.91 0 00-8-8z" fill="none"></path><path d="M432 96h-96V72a40 40 0 00-40-40h-80a40 40 0 00-40 40v24H80a16 16 0 000 32h17l19 304.92c1.42 26.85 22 47.08 48 47.08h184c26.13 0 46.3-19.78 48-47.08L415 128h17a16 16 0 000-32zM192 432c-6.62 0-12-5.37-12-12V200c0-6.63 5.38-12 12-12s12 5.37 12 12v220c0 6.63-5.38 12-12 12zm80 0c-6.62 0-12-5.37-12-12V200c0-6.63 5.38-12 12-12s12 5.37 12 12v220c0 6.63-5.38 12-12 12zm80 0c-6.62 0-12-5.37-12-12V200c0-6.63 5.38-12 12-12s12 5.37 12 12v220c0 6.63-5.38 12-12 12z"></path><path d="M200 72h112v24H200z" fill="none"></path></svg>;

const PaymentManagement = ({ isLightMode, modeOfView }) => {
  const activeTab = modeOfView || 'view';
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: 'info', show: false });

  // ----- Single‑invoice modes (view, update, delete) -----
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [formData, setFormData] = useState({
    amountCollected: '',
    modeOfCollection: 'Cash',
    comments: '',
    customComment: ''
  });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showCommentsField, setShowCommentsField] = useState(false);
  const amountCollectedTimeoutRef = useRef(null);

  // ----- Add mode: challan search & table rows -----
  const [challanSearchTerm, setChallanSearchTerm] = useState('');
  const [challanSearchYear, setChallanSearchYear] = useState(new Date().getFullYear());
  const [challanYears, setChallanYears] = useState([]);
  const [challanFetched, setChallanFetched] = useState(false);
  const [builtyFetched, setBuiltyFetched] = useState(false);

  // Table rows for add mode (initially empty)
  const [rows, setRows] = useState([]);

  const initialRow = () => ({
    id: Date.now() + Math.random(), // temporary unique id
    index: 1,
    builty_no: '',
    destination: '',
    crossing: 'NO',
    consignor: '',
    consignee: '',
    to_pay: 0,
    paid: 0,
    amount_collected: '',
    mode_of_collection: 'Cash',
    comments: '',
    isFetched: false
  });

  // ----- Utility functions -----
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type, show: true });
  };

  const hideAlert = () => {
    setAlert({ message: '', type: 'info', show: false });
  };

  const normalizeGRNumber = (input) => {
    if (!input) return '';
    let normalized = input.trim().toUpperCase();
    const numbers = normalized.match(/\d+/g);
    if (!numbers) return normalized;
    const numberPart = numbers[0].padStart(5, '0');
    return `GR${numberPart}`;
  };

  const formatDateTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).replace('am', 'AM').replace('pm', 'PM');
  };

  // Format challan number (same as Challan component)
  const formatChallanNo = (input, year) => {
    if (!input || !year) return '';
    const yearPrefix = year.toString().slice(-2);
    let numericPart = input.trim().toUpperCase().replace(/[A-Z]/g, '');
    numericPart = numericPart.replace(/^0+/, '');
    if (!numericPart) return ''; 
    return `${yearPrefix}CH${numericPart.padStart(5, '0')}`;
  };

  // Populate year dropdown (same as Challan)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let i = currentYear + 1; i >= currentYear - 5; i--) {
      yearOptions.push(i);
    }
    setChallanYears(yearOptions);
  }, []);

  // ----- Single‑invoice search (view/update/delete) -----
  const handleSearchInvoice = async () => {
    if (!invoiceNumber.trim()) {
      showAlert('Please enter an invoice number (GR No.)', 'error');
      return;
    }

    setLoading(true);
    setInvoiceDetails(null);
    setFormData({ amountCollected: '', modeOfCollection: 'Cash', comments: '', customComment: '' });
    setShowCommentsField(false);
    setDeleteConfirm(false);
    hideAlert();

    try {
      const normalizedGR = normalizeGRNumber(invoiceNumber);
      const response = await fetch(`http://43.230.202.198:3000/api/transport-records?grNo=${normalizedGR}`);
      if (!response.ok) throw new Error('Invoice not found');
      const data = await response.json();

      if (activeTab === 'add' && data.payment_status !== 'Pending') {
        showAlert(
          `This invoice (${normalizedGR}) already has a payment record. Please use the Update Payment tab to modify texisting record.`,
          'error'
        );
        setLoading(false);
        return;
      }

      const invoiceAmount = (parseFloat(data.to_pay) || 0) + (parseFloat(data.paid) || 0);
      const invoiceType = parseFloat(data.paid) === 0 ? 'TO PAY' : 'PAID';
      
      setInvoiceDetails({
        invoiceNumber: data.gr_no,
        invoiceType,
        invoiceAmount,
        consignor: data.consignor_name,
        consignee: data.consignee_name,
        date: data.date,
        createdAt: data.created_at,
        amountCollected: data.amount_collected,
        modeOfCollection: data.mode_of_collection,
        comments: data.comments,
        paymentCreatedAt: data.payment_created_at,
        paymentUpdatedAt: data.payment_updated_at,
        challanStatus: data.challan_status,
        paymentStatus: parseFloat(data.payment_status) < parseFloat(invoiceAmount) 
          ? ('Paid-D+' || 'Paid-D-') 
          : parseFloat(data.payment_status) === parseFloat(invoiceAmount) 
            ? 'Paid' 
            : data.payment_status
      });

      if (activeTab === 'update' && data.amount_collected != null) {
        const predefinedModes = ['Incorrect Invoice Freight', 'Damage Deduction', 'Roundoff', 'Party Default'];
        const commentValue = data.comments || '';
        setFormData({
          amountCollected: data.amount_collected || '',
          modeOfCollection: data.mode_of_collection || 'Cash',
          comments: predefinedModes.includes(commentValue) ? commentValue : 'Other',
          customComment: predefinedModes.includes(commentValue) ? '' : commentValue
        });
        if (parseFloat(data.amount_collected) < invoiceAmount) {
          setShowCommentsField(true);
        }
      }

      setBuiltyFetched(true);

      if (data.amount_collected && parseFloat(data.amount_collected) < invoiceAmount && activeTab !== 'add') {
        showAlert('Amount Collected is less than Invoice Amount. Please complete the remaining payment.', 'warning');
      }
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ----- Update single invoice -----
  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!invoiceDetails) return;

    const amount = parseFloat(formData.amountCollected);

    let finalComments = formData.comments === "Other" ? formData.customComment : formData.comments;
    if (amount < invoiceDetails.invoiceAmount && (!finalComments || finalComments.trim() === '')) {
      showAlert('Please provide a reason for the amount difference', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://43.230.202.198:3000/api/transport-records/${invoiceDetails.invoiceNumber}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCollected: amount,
          modeOfCollection: formData.modeOfCollection,
          comments: finalComments
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update payment');
      }

      const updated = await response.json();
      const paymentStatus = amount === invoiceDetails.invoiceAmount ? 'Paid' : amount > invoiceDetails.invoiceAmount ? 'Paid-D+' : 'Paid-D-';
      await fetch(`http://43.230.202.198:3000/api/transport-records/${invoiceDetails.invoiceNumber}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus })
      });

      showAlert(`Payment ${activeTab === 'add' ? 'added' : 'updated'} successfully`, 'success');
      setInvoiceDetails(prev => ({
        ...prev,
        amountCollected: updated.amount_collected,
        modeOfCollection: updated.mode_of_collection,
        comments: updated.comments,
        paymentUpdatedAt: updated.payment_updated_at,
        paymentCreatedAt: updated.payment_created_at,
        paymentStatus
      }));
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ----- Delete single invoice -----
  const handleDeletePayment = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`http://43.230.202.198:3000/api/transport-records/${invoiceDetails.invoiceNumber}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCollected: 0,
          modeOfCollection: null,
          comments: null
        })
      });
      if (!response.ok) throw new Error('Failed to delete payment');

      await fetch(`http://43.230.202.198:3000/api/transport-records/${invoiceDetails.invoiceNumber}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'Pending' })
      });

      showAlert('Payment deleted successfully', 'success');
      setInvoiceDetails(prev => ({
        ...prev,
        amountCollected: 0,
        modeOfCollection: '',
        comments: '',
        payment_created_at: '',
        paymentUpdatedAt: '',
        paymentStatus: 'Pending',
      }));
      setDeleteConfirm(false);
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ----- Add mode: challan search -----
  const handleChallanSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setChallanFetched(false);
    try {
      const formattedChallanNo = formatChallanNo(challanSearchTerm, challanSearchYear);
      if (!formattedChallanNo) throw new Error('Invalid challan number format.');

      const response = await fetch(`http://43.230.202.198:3000/api/challan?challan_no=${formattedChallanNo}`);
      if (!response.ok) throw new Error('Challan not found.');
      
      const data = await response.json();

      const builtyNos = data.builty_no.split('|').map(b => b.trim()).filter(b => b);
      if (builtyNos.length === 0) {
        throw new Error('No builties found in this challan.');
      }

      const newRows = builtyNos.map((builty, i) => ({
        ...initialRow(),
        index: i + 1,
        id: Date.now() + i,
        builty_no: builty,
        isFetched: false
      }));

      setRows(newRows);
      setChallanFetched(true);
    } catch (err) {
      showAlert(err.message, 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // ----- Add mode table handlers -----
  const addMoreRows = () => {
    const lastIndex = rows.length;
    setRows([...rows, ...Array(5).fill(null).map((_, i) => ({
      ...initialRow(),
      index: lastIndex + i + 1,
      id: Date.now() + i
    }))]);
  };

  const removeRow = (id) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== id).map((r, idx) => ({ ...r, index: idx + 1 })));
  };

  const handleRowChange = (id, field, value) => {
    setRows(prev =>
      prev.map(r =>
        r.id === id
          ? { ...r, [field]: value, ...(field === 'builty_no' && { isFetched: false }) }
          : r
      )
    );
  };

  // Debounced fetch of builty details (with auto‑fill for "Paid" type)
  useEffect(() => {
    const fetchBuiltyDetails = async (row) => {
      if (!row.builty_no.trim() || row.isFetched) return;
      try {
        const normalized = normalizeGRNumber(row.builty_no);
        const response = await fetch(`http://43.230.202.198:3000/api/transport-records?grNo=${normalized}`);
        if (!response.ok) throw new Error('Builty not found');
        const data = await response.json();

        const shouldAutoFill = data.to_pay == 0 && parseFloat(data.paid) > 0;

        setRows(prev =>
          prev.map(r =>
            r.id === row.id
              ? {
                  ...r,
                  destination: data.to_location,
                  crossing: data.crossing_status,
                  consignor: data.consignor_name,
                  consignee: data.consignee_name,
                  to_pay: formatNumericValue(data.to_pay),
                  paid: formatNumericValue(data.paid),
                  builty_no: normalized,
                  isFetched: true,
                  // Auto‑fill if it's a "Paid" invoice
                  amount_collected: data.amount_collected ? formatNumericValue(data.amount_collected) : shouldAutoFill ? formatNumericValue(data.paid) : r.amount_collected,
                  // amount_collected: shouldAutoFill ? formatNumericValue(data.paid) : r.amount_collected,
                  comments: data.crossing === 'YES' ? 'Crossing' : shouldAutoFill ? 'Indore' : r.comments
                  // comments: shouldAutoFill ? 'Indore' : r.comments
                }
              : r
          )
        );
      } catch (err) {
        console.error('Error fetching builty:', err);
        // Optionally clear row or show inline error
      }
    };

    const timeouts = rows.map(row => {
      if (row.builty_no && !row.isFetched) {
        return setTimeout(() => fetchBuiltyDetails(row), 1500);
      }
      return null;
    });

    return () => timeouts.forEach(t => t && clearTimeout(t));
  }, [rows]);

  // Submit multiple payments (add mode)
  const handleAddPayments = async () => {
    const validRows = rows.filter(r => r.builty_no.trim() && r.amount_collected !== '');
    if (validRows.length === 0) {
      showAlert('Please enter at least one builty number and amount collected', 'error');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of validRows) {
      try {
        const normalized = normalizeGRNumber(row.builty_no);

        const paymentResponse = await fetch(`http://43.230.202.198:3000/api/transport-records/${normalized}/payment`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amountCollected: parseFloat(row.amount_collected) || 0,
            modeOfCollection: row.mode_of_collection,
            comments: row.comments || null
          })
        });

        if (paymentResponse.ok) {
          const invoiceAmount = row.to_pay > 0 ? parseFloat(row.to_pay) : parseFloat(row.paid);
          const amountCollected = parseFloat(row.amount_collected);
          const paymentStatus = amountCollected === invoiceAmount ? 'Paid' : amountCollected > invoiceAmount ? 'Paid-D+' : 'Paid-D-';

          await fetch(`http://43.230.202.198:3000/api/transport-records/${normalized}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentStatus })
          });

          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
    }

    if (successCount > 0) {
      showAlert(`Payments recorded for ${successCount} builty(s).`, 'success');
      // Return to search after successful save
      setRows([]);
      setChallanFetched(false);
      setChallanSearchTerm('');
    } else {
      showAlert('No payments were recorded', 'error');
    }
    setLoading(false);
  };

  // ----- Render functions -----

  const renderInvoiceDetails = () => {
    if (!invoiceDetails) return null;

    return (
      <div className="pm-invoice-details">
        <h3>Invoice Details</h3>
        <div className="pm-detail-grid">
          <div className="pm-detail-item">
            <span className="pm-detail-label">Invoice Number:</span>
            <span className="pm-detail-value">{invoiceDetails.invoiceNumber}</span>
          </div>
          <div className="pm-detail-item">
            <span className="pm-detail-label">Invoice Type:</span>
            <span className="pm-detail-value">{invoiceDetails.invoiceType}</span>
          </div>
          <div className="pm-detail-item">
            <span className="pm-detail-label">Invoice Amount:</span>
            <span className="pm-detail-value">{invoiceDetails.invoiceAmount.toFixed(2)}</span>
          </div>
          <div className="pm-detail-item">
            <span className="pm-detail-label">Consignor:</span>
            <span className="pm-detail-value">{invoiceDetails.consignor}</span>
          </div>
          <div className="pm-detail-item">
            <span className="pm-detail-label">Consignee:</span>
            <span className="pm-detail-value">{invoiceDetails.consignee}</span>
          </div>
          <div className="pm-detail-item">
            <span className="pm-detail-label">Date:</span>
            <span className="pm-detail-value">{formatDateTime(invoiceDetails.date)}</span>
          </div>
          <div className="pm-detail-item">
            <span className="pm-detail-label">Created:</span>
            <span className="pm-detail-value">{formatDateTime(invoiceDetails.createdAt)}</span>
          </div>
          {invoiceDetails.amountCollected != null && (
            <>
              <div className="pm-detail-item">
                <span className="pm-detail-label">Amount Collected:</span>
                <span className="pm-detail-value">{parseFloat(invoiceDetails.amountCollected).toFixed(2)}</span>
              </div>
              <div className="pm-detail-item">
                <span className="pm-detail-label">Mode of Collection:</span>
                <span className="pm-detail-value">{invoiceDetails.modeOfCollection || '—'}</span>
              </div>
              {invoiceDetails.comments && (
                <div className="pm-detail-item">
                  <span className="pm-detail-label">Comments:</span>
                  <span className="pm-detail-value">{invoiceDetails.comments}</span>
                </div>
              )}
              <div className="pm-detail-item">
                <span className="pm-detail-label">Payment Created:</span>
                <span className="pm-detail-value">{formatDateTime(invoiceDetails.paymentCreatedAt)}</span>
              </div>
              {invoiceDetails.paymentCreatedAt !== invoiceDetails.paymentUpdatedAt && (
                <div className="pm-detail-item">
                  <span className="pm-detail-label">Payment Updated:</span>
                  <span className="pm-detail-value">{formatDateTime(invoiceDetails.paymentUpdatedAt)}</span>
                </div>
              )}
            </>
          )}
          <div className="pm-detail-item">
            <span className="pm-detail-label">Challan Status:</span>
            <span className="pm-detail-value">{invoiceDetails.challanStatus}</span>
          </div>
          <div className="pm-detail-item">
            <span className="pm-detail-label">Payment Status:</span>
            <span className={`pm-detail-value ${
              invoiceDetails.paymentStatus === 'Paid' ? 'pm-status-paid' :
              (invoiceDetails.paymentStatus === 'Paid-D+' || invoiceDetails.paymentStatus === 'Paid-D-') ? 'pm-status-partial' :
              'pm-status-pending'
            }`}>
              {invoiceDetails.paymentStatus || '—'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderEditableSingleForm = () => {
    if (!invoiceDetails) return null;

    const showCustomComment = formData.comments === "Other";

    return (
      <form onSubmit={handleUpdatePayment}>
        <div className="pm-payment-form">
        <div className="pm-form-group">
          <label htmlFor="amountCollected">Amount Collected (₹):</label>
          <input
            id="amountCollected"
            type="number"
            name="amountCollected"
            value={formData.amountCollected}
            onChange={(e) => {
              const value = e.target.value;
              setFormData(prev => ({ ...prev, amountCollected: value }));
              if (amountCollectedTimeoutRef.current) clearTimeout(amountCollectedTimeoutRef.current);
              amountCollectedTimeoutRef.current = setTimeout(() => {
                if (value && parseFloat(value) < invoiceDetails.invoiceAmount) {
                  setShowCommentsField(true);
                } else {
                  setShowCommentsField(false);
                }
              }, 500);
            }}
            required
            min="0"
            step="0.01"
            className="pm-input pm-number-input"
          />
        </div>

        <div className="pm-form-group">
          <label htmlFor="modeOfCollection">Mode of Collection:</label>
          <select
            id="modeOfCollection"
            name="modeOfCollection"
            value={formData.modeOfCollection}
            onChange={(e) => setFormData(prev => ({ ...prev, modeOfCollection: e.target.value }))}
            required
            className="pm-select"
          >
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {showCommentsField && (
          <>
            <div className="pm-form-group">
              <label htmlFor="comments">Comments (Reason for difference):</label>
              <select
                id="comments"
                name="comments"
                value={formData.comments}
                onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                className="pm-select"
                required
              >
                <option value="">Select a reason</option>
                <option value="Incorrect Invoice Freight">Incorrect Invoice Freight</option>
                <option value="Damage Deduction">Damage Deduction</option>
                <option value="Roundoff">Roundoff</option>
                <option value="Party Default">Party Default</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {showCustomComment && (
              <div className="pm-form-group" style={{marginBottom: '7px'}}>
                <label htmlFor="customComment">Custom Comment:</label>
                <input
                  id="customComment"
                  type="text"
                  value={formData.customComment || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, customComment: e.target.value }))}
                  className="pm-input"
                  placeholder="Enter custom reason"
                  required
                />
              </div>
            )}
          </>
        )}
        </div>
      
        <div className="pm-form-actions">
          <button type="submit" disabled={loading} className="pm-button pm-primary-button">
            {activeTab === 'update' ? loading ? 'Updating...' : 'Update Payment' : loading ? 'Adding...' : 'Add Payment'}
            {/* {loading ? 'Updating...' : 'Update Payment'} */}
          </button>
          <button type="button" style={{ marginLeft: '10px' }} onClick={() => {
            setInvoiceNumber('');
            setInvoiceDetails(null);
            setBuiltyFetched(activeTab === 'add' ? false : true);
          }} className="pm-button pm-secondary-button">
            Cancel
          </button>
        </div>
      </form>
    );
  };

  const renderAddTable = () => {
    return (
      <div className="pm-add-table-container">
        <div className="challan-table-container" style={{ overflowX: 'auto' }}>
          <table className={`challan-table ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <thead>
              <tr className="challan-table-header">
                <th>Index</th>
                <th>Builty No</th>
                <th>Destination</th>
                <th>Crossing</th>
                <th>Consignor</th>
                <th>Consignee</th>
                <th>To Pay</th>
                <th>Paid</th>
                <th>Amount Collected</th>
                <th>Mode of Collection</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="challan-table-row">
                  <td className="text-center">{row.index}</td>
                  <td>
                    <input
                      type="text"
                      value={row.builty_no}
                      onChange={(e) => handleRowChange(row.id, 'builty_no', e.target.value)}
                      className={`challan-table-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                    />
                  </td>
                  <td className="text-center">{row.destination || '—'}</td>
                  <td>
                    <select
                      value={row.crossing}
                      onChange={(e) => handleRowChange(row.id, 'crossing', e.target.value)}
                      className={`challan-table-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                    >
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                    </select>
                  </td>
                  <td className="text-center">{row.consignor || '—'}</td>
                  <td className="text-center">{row.consignee || '—'}</td>
                  <td className="text-center">{row.to_pay ? `${row.to_pay}` : '—'}</td>
                  <td className="text-center">{row.paid ? `${row.paid}` : '—'}</td>
                  <td>
                    <input
                      type="text"
                      value={row.amount_collected}
                      onChange={(e) => handleRowChange(row.id, 'amount_collected', e.target.value)}
                      className={`challan-table-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                    />
                  </td>
                  <td>
                    <select
                      value={row.mode_of_collection}
                      onChange={(e) => handleRowChange(row.id, 'mode_of_collection', e.target.value)}
                      className={`challan-table-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                  </td>
                  <td className="text-center challan-makeItCenter">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className={`challan-delete-row-button improved-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                    >
                      <IoTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="challan-add-more-container">
          <button type="button" onClick={addMoreRows} className={`challan-add-more-button improved-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <IoAdd /> Add 5 More Rows
          </button>

          <button
            type="button"
            onClick={handleAddPayments}
            disabled={loading}
            className="pm-button pm-primary-button"
          >
            {loading ? 'Saving...' : 'Save Payments'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setRows([]);
              setChallanFetched(false);
              setChallanSearchTerm('');
            }}
            className="pm-button pm-secondary-button"
          >
            New Search
          </button>
        </div>
      </div>
    );
  };

  // ----- Main render -----
  return (
    <div>
        {activeTab === 'add' && (
          <>
            <PopupAlert
              message={alert.message}
              type={alert.type}
              duration={5000}
              onClose={hideAlert}
              isLightMode={isLightMode}
              position="top-right"
            />

            {!challanFetched && !builtyFetched && (
              <div>
                {/* Builty Search */}
                <div className={`invoice-search ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                  <div className="invoice-search-text">Search Single Invoice:</div>

                  <div
                    className={`invoice-search-form ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                  >
                    <input
                      type="text"
                      placeholder="Enter GR. Number"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      required
                      className={`invoice-search-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                    />

                    <button
                      onClick={handleSearchInvoice}
                      className={`invoice-search-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                    >
                      <IoSearch className="invoice-search-icon" />
                    </button>
                  </div>
                </div>

                {/* Challan Search */}
                <div className={`invoice-search challan-search ${isLightMode ? "light-mode" : "dark-mode"}`}>
                  <div className="invoice-search-text">Bulk Entry:</div>
                  <form onSubmit={handleChallanSearch} className={`invoice-search-form challan-search-form ${isLightMode ? "light-mode" : "dark-mode"}`}>
                    <input
                      type="text"
                      placeholder="Enter Challan Number"
                      value={challanSearchTerm}
                      onChange={(e) => setChallanSearchTerm(e.target.value)}
                      required
                      className={`invoice-search-input ${isLightMode ? "light-mode" : "dark-mode"}`}
                    />
                    <select
                      value={challanSearchYear}
                      onChange={(e) => setChallanSearchYear(parseInt(e.target.value))}
                      className={`challan-search-select ${isLightMode ? "light-mode" : "dark-mode"}`}
                    >
                      {challanYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <div
                      className={`invoice-search-input challan-search-preview ${isLightMode ? "light-mode" : "dark-mode"}`}
                      style={{ opacity: challanSearchTerm ? 1 : 0.6, borderRadius: '0px' }}
                    >
                      {challanSearchTerm ? formatChallanNo(challanSearchTerm, challanSearchYear) : "Preview"}
                    </div>
                    <button type="submit" className={`invoice-search-button challan-search-button ${isLightMode ? "light-mode" : "dark-mode"}`}>
                      <IoSearch className="invoice-search-icon" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

    {(activeTab !== 'add' || challanFetched || builtyFetched) && (  
    <div 
      className={`pm-container ${isLightMode ? 'pm-light-mode' : 'pm-dark-mode'}`} 
      style={{maxWidth: activeTab === 'add' ? '1340px' : '1000px'}}
    >
      <PopupAlert
        message={alert.message}
        type={alert.type}
        duration={5000}
        onClose={hideAlert}
        isLightMode={isLightMode}
        position="top-right"
      />

      <div className="pm-header">
        <h1>
          {activeTab === 'view' && 'View Payment'}
          {activeTab === 'add' && builtyFetched ? 'Add Payment' : 'Add Payments'}
          {activeTab === 'update' && 'Update Payment'}
          {activeTab === 'delete' && 'Delete Payment'}
        </h1>
      </div>

      <div className="pm-content">
        {activeTab === 'add' && challanFetched ? (
          <>
            {challanFetched && (
              renderAddTable()
            )}
          </>
        ) : (
          <>
            {/* Search section for single invoice */}
            <div className="pm-search-section">
              <div className="pm-form-group">
                <label htmlFor="invoiceNumber">Invoice Number (GR No.):</label>
                <div className="pm-search-container">
                  <input
                    id="invoiceNumber"
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Enter GR Number (e.g., 15, 015, gr00015)"
                    className="pm-input"
                    disabled={loading}
                  />
                  <button
                    onClick={handleSearchInvoice}
                    disabled={loading || !invoiceNumber.trim()}
                    className="pm-button pm-primary-button"
                  >
                    {loading ? 'Searching...' : 'Search Invoice'}
                  </button>
                  <button
                    onClick={() => {
                      setInvoiceNumber('');
                      setInvoiceDetails(null);
                    }}
                    className="pm-button pm-secondary-button"
                  >
                    Clear
                  </button>
                </div>
                <small className="pm-input-hint">
                  You can enter: 15, 015, 0015, gr00015, etc. – all will search for GR00015
                </small>
              </div>
            </div>

            {loading && <div className="pm-loading">Loading invoice details...</div>}

            {invoiceDetails && (
              <>
                {renderInvoiceDetails()}

                {activeTab === 'view' && !invoiceDetails.amountCollected && (
                  <div className="pm-info-message">No payment record exists for this invoice.</div>
                )}

                {(activeTab === 'add' || activeTab === 'update') && renderEditableSingleForm()}

                {activeTab === 'delete' && (
                  <div className="pm-delete-section">
                    {invoiceDetails.amountCollected != null ? (
                      <>
                        <div className="pm-delete-actions">
                          {!deleteConfirm ? (
                            <button onClick={handleDeletePayment} className="pm-button pm-danger-button">
                              Delete Payment Record
                            </button>
                          ) : (
                            <>
                              <p className="pm-confirm-text">Are you sure you want to delete this payment record?</p>
                              <div className="pm-confirm-actions">
                                <button onClick={handleDeletePayment} disabled={loading} className="pm-button pm-danger-button">
                                  {loading ? 'Deleting...' : 'Yes, Delete'}
                                </button>
                                <button onClick={() => setDeleteConfirm(false)} className="pm-button pm-secondary-button">
                                  Cancel
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="pm-info-message">No payment record exists for this invoice.</div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
    )}
    </div>
  );
};

export default PaymentManagement;
