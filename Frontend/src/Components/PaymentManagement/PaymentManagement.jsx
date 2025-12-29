import React, { useState, useEffect, useRef } from 'react';
import './PaymentManagement.css';
import PopupAlert from '../PopupAlert/PopupAlert';

const PaymentManagement = ({ isLightMode, modeOfView }) => {
  const activeTab = modeOfView || 'view';
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [statusDetails, setStatusDetails] = useState(null);
  const [formData, setFormData] = useState({
    amountCollected: '',
    modeOfCollection: 'Cash',
    comments: '',
    customComment: ''
  });
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showCommentsField, setShowCommentsField] = useState(false);
  
  // Popup Alert State
  const [alert, setAlert] = useState({ message: '', type: 'info', show: false });

  // Refs for debounce
  const amountCollectedTimeoutRef = useRef(null);

  // Show alert function
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type, show: true });
  };

  // Hide alert function
  const hideAlert = () => {
    setAlert({ message: '', type: 'info', show: false });
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        hideAlert();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert.show]);

  // Function to normalize GR number
  const normalizeGRNumber = (input) => {
    if (!input) return '';
    
    // Remove any spaces and convert to uppercase
    let normalized = input.trim().toUpperCase();
    
    // Extract numbers from the input
    const numbers = normalized.match(/\d+/g);
    if (!numbers) return normalized;
    
    const numberPart = numbers[0].padStart(5, '0');
    
    if (normalized.includes('GR')) {
      return `GR${numberPart}`;
    } else {
      return `GR${numberPart}`;
    }
  };

  const formatDateTime = (date) => {
    // if (!date) return '';
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

  // Fetch status information
  const fetchStatusInfo = async (grNo) => {
    try {
      const normalizedGR = normalizeGRNumber(grNo);
      const response = await fetch(`http://43.230.202.198:3000/api/status?gr_no=${normalizedGR}`);
      if (response.ok) {
        const statusData = await response.json();
        setStatusDetails(statusData);
        return statusData;
      } else {
        setStatusDetails(null);
        return null;
      }
    } catch (err) {
      console.error('Error fetching status:', err);
      setStatusDetails(null);
      return null;
    }
  };

  // Update status in status database
  const updatePaymentStatus = async (grNo, amountCollected, invoiceAmount) => {
    try {
      const normalizedGR = normalizeGRNumber(grNo);
      let paymentStatus;
      
      if (parseFloat(amountCollected) === parseFloat(invoiceAmount)) {
        paymentStatus = 'Paid';
      } else if (parseFloat(amountCollected) < parseFloat(invoiceAmount)) {
        paymentStatus = 'Paid-D';
      } else {
        return false;
      }

      const response = await fetch(`http://43.230.202.198:3000/api/status/${normalizedGR}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_status: paymentStatus
        })
      });

      return response.ok;
    } catch (err) {
      console.error('Error updating payment status:', err);
      return false;
    }
  };

  const handleSearchInvoice = async () => {
    if (!invoiceNumber.trim()) {
      showAlert('Please enter an invoice number (GR No.)', 'error');
      return;
    }

    setLoading(true);
    setInvoiceDetails(null);
    setPaymentDetails(null);
    setStatusDetails(null);
    setFormData({
      amountCollected: '',
      modeOfCollection: 'Cash',
      comments: ''
    });
    setShowCommentsField(false);
    setDeleteConfirm(false);
    hideAlert();

    try {
      const normalizedGR = normalizeGRNumber(invoiceNumber);
      
      const response = await fetch(`http://43.230.202.198:3000/api/transport-records/${normalizedGR}`);
      const data = await response.json();
      
      if (response.ok) {
        if (activeTab === 'add') {
          try {
            const paymentResponse = await fetch(`http://43.230.202.198:3000/api/payments/${normalizedGR}`);
            if (paymentResponse.ok) {
              showAlert(
                `This invoice (${normalizedGR}) already has a payment record. Please use the Update Payment tab to modify the existing record.`,
                'error'
              );
              setLoading(false);
              return;
            }
          } catch (err) {
            console.error('Error checking payment:', err);
          }
        }

        setInvoiceDetails(data);
        
        // Fetch status information
        const statusData = await fetchStatusInfo(normalizedGR);
        
        let currentPaymentData = null;
        
        // Check if payment exists for this invoice
        if (activeTab !== 'add') {
          try {
            const paymentResponse = await fetch(`http://43.230.202.198:3000/api/payments/${normalizedGR}`);
            if (paymentResponse.ok) {
              currentPaymentData = await paymentResponse.json();
              setPaymentDetails(currentPaymentData);
              
              if (activeTab === 'update') {
                const predefinedModes = ['Incorrect Invoice Freight', 'Damage Deduction', 'Roundoff', 'Party Default'];
                const commentValue = currentPaymentData.comments || '';

                setFormData({
                  amountCollected: currentPaymentData.amount_collected || '',
                  modeOfCollection: currentPaymentData.mode_of_collection || 'Cash',
                  comments: predefinedModes.includes(commentValue) ? commentValue : 'Other',
                  customComment: predefinedModes.includes(commentValue) ? '' : commentValue
                });
                
                // Show comments field if amount collected is less than invoice amount
                if (parseFloat(currentPaymentData.amount_collected) < parseFloat(data.invoiceAmount)) {
                  setShowCommentsField(true);
                }
              }
            } else {
              // No payment record exists yet, which is fine for view/delete tabs
              if (activeTab === 'view' || activeTab === 'delete' ||activeTab === 'update') {
                showAlert('No payment record found for this invoice', 'info');
              }
            }
          } catch (err) {
            console.error('Error checking payment:', err);
          }
        }

        // Show warning if payment exists and amount collected is less than invoice amount
        if (currentPaymentData && parseFloat(currentPaymentData.amount_collected) < parseFloat(data.invoiceAmount)) {
          showAlert('Amount Collected is less than Invoice Amount. Please complete the remaining payment.', 'warning');
        }
      } else {
        throw new Error(data.error || 'Invoice not found');
      }
    } catch (err) {
      showAlert(err.message || 'Failed to fetch invoice details', 'error');
    } finally {
      setLoading(false);
    }
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!invoiceDetails) {
    showAlert('Please search for an invoice first', 'error');
    return;
  }

  // Validation: Amount Collected should not be greater than Invoice Amount
  if (parseFloat(formData.amountCollected) > parseFloat(invoiceDetails.invoiceAmount)) {
    showAlert('Amount Collected cannot be greater than Invoice Amount', 'error');
    return;
  }

  // If "Other" is selected, use customComment, otherwise use the selected comment
  let finalComments = formData.comments === "Other" ? formData.customComment : formData.comments;

  // Validation: If Amount Collected is less than Invoice Amount
  if (parseFloat(formData.amountCollected) < parseFloat(invoiceDetails.invoiceAmount) && 
      (!finalComments || finalComments.trim() === '')) {
    showAlert('Please select a reason for the amount difference', 'error');
    return;
  }

  setLoading(true);
  hideAlert();

  try {
    const payload = {
      invoiceNumber: invoiceDetails.invoiceNumber,
      invoiceType: invoiceDetails.invoiceType,
      invoiceAmount: invoiceDetails.invoiceAmount,
      amountCollected: parseFloat(formData.amountCollected),
      modeOfCollection: formData.modeOfCollection,
      comments: finalComments
    };

      let response;
      let method;
      let url;

      if (activeTab === 'add') {
        method = 'POST';
        url = 'http://43.230.202.198:3000/api/payments';
      } else {
        method = 'PUT';
        url = `http://43.230.202.198:3000/api/payments/${invoiceDetails.invoiceNumber}`;
      }

      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update payment status in status database
        const statusUpdated = await updatePaymentStatus(
          invoiceDetails.invoiceNumber,
          formData.amountCollected,
          invoiceDetails.invoiceAmount
        );

        if (statusUpdated) {
          // Refresh status information
          await fetchStatusInfo(invoiceDetails.invoiceNumber);
        }

        if (activeTab === 'add') {
          showAlert(`Payment successfully recorded for Invoice: ${data.invoice_number}`, 'success');
          setFormData({
            amountCollected: '',
            modeOfCollection: 'Cash',
            comments: ''
          });
          setShowCommentsField(false);
        } else {
          showAlert('Payment successfully updated', 'success');
          const paymentResponse = await fetch(`http://43.230.202.198:3000/api/payments/${invoiceDetails.invoiceNumber}`);
          if (paymentResponse.ok) {
            const paymentData = await paymentResponse.json();
            setPaymentDetails(paymentData);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to process payment');
      }
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setLoading(true);
    hideAlert();

    try {
      const response = await fetch(`http://43.230.202.198:3000/api/payments/${invoiceDetails.invoiceNumber}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showAlert('Payment successfully deleted', 'success');
        setPaymentDetails(null);
        setDeleteConfirm(false);
      } else {
        throw new Error(data.error || 'Failed to delete payment');
      }
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountCollectedChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      amountCollected: value
    }));

    // Clear existing timeout
    if (amountCollectedTimeoutRef.current) {
      clearTimeout(amountCollectedTimeoutRef.current);
    }

    // Set new timeout to show comments field after user stops typing (500ms delay)
    amountCollectedTimeoutRef.current = setTimeout(() => {
      if (invoiceDetails && value && parseFloat(value) < parseFloat(invoiceDetails.invoiceAmount)) {
        setShowCommentsField(true);
      } else {
        setShowCommentsField(false);
        if (!value || parseFloat(value) >= parseFloat(invoiceDetails.invoiceAmount)) {
          setFormData(prev => ({
            ...prev,
            comments: ''
          }));
        }
      }
    }, 500);
  };

  const handleCommentsChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      comments: value
    }));
  };

  const handleCommentsSelectChange = (e) => {
    const value = e.target.value;
    // if (value === "Other") {
    //   setFormData(prev => ({
    //     ...prev,
    //     comments: ''
    //   }));
    // } else {
    //   setFormData(prev => ({
    //     ...prev,
    //     comments: value
    //   }));
    // }
        setFormData(prev => ({
        ...prev,
        comments: value
        }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setInvoiceNumber('');
    setInvoiceDetails(null);
    setPaymentDetails(null);
    setStatusDetails(null);
    setFormData({
      amountCollected: '',
      modeOfCollection: 'Cash',
      comments: '',
      customComment: ''
    });
    setShowCommentsField(false);
    setDeleteConfirm(false);
    hideAlert();
    
    if (amountCollectedTimeoutRef.current) {
      clearTimeout(amountCollectedTimeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (amountCollectedTimeoutRef.current) {
        clearTimeout(amountCollectedTimeoutRef.current);
      }
    };
  }, []);

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
            <span className="pm-detail-value">₹{parseFloat(invoiceDetails.invoiceAmount || 0).toFixed(2)}</span>
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
          {/* Status Details */}
          {statusDetails && (
            <>
              <div className="pm-detail-item">
                <span className="pm-detail-label">Challan Status:</span>
                <span className="pm-detail-value">{statusDetails.challan_status || 'N/A'}</span>
              </div>
              <div className="pm-detail-item">
                <span className="pm-detail-label">Payment Status:</span>
                <span className={`pm-detail-value ${
                  statusDetails.payment_status === 'Paid' ? 'pm-status-paid' :
                  statusDetails.payment_status === 'Paid-D' ? 'pm-status-partial' :
                  'pm-status-pending'
                }`}>
                  {statusDetails.payment_status || 'N/A'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderPaymentDetails = () => {
    if (!paymentDetails) return null;

    return (
      <div className="pm-payment-details">
        <h3>Payment Details</h3>
        <div className="pm-detail-grid">
          <div className="pm-detail-item">
            <span className="pm-detail-label">Amount Collected:</span>
            <span className="pm-detail-value">₹{parseFloat(paymentDetails.amount_collected || 0).toFixed(2)}</span>
          </div>
          <div className="pm-detail-item">
            <span className="pm-detail-label">Mode of Collection:</span>
            <span className="pm-detail-value">{paymentDetails.mode_of_collection}</span>
          </div>
          {paymentDetails.comments && (
            <div className="pm-detail-item">
              <span className="pm-detail-label">Comments:</span>
              <span className="pm-detail-value">{paymentDetails.comments}</span>
            </div>
          )}
          <div className="pm-detail-item">
            <span className="pm-detail-label">Payment Date:</span>
            <span className="pm-detail-value">{formatDateTime(paymentDetails.created_at)}</span>
          </div>
          {paymentDetails.created_at !== paymentDetails.updated_at && (
            <div className="pm-detail-item">
              <span className="pm-detail-label">Last Updated:</span>
              <span className="pm-detail-value">
                {formatDateTime(paymentDetails.updated_at)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEditableFields = () => {
    if (!invoiceDetails) return null;

    const showCustomComment = formData.comments === "Other";

    return (
      <form onSubmit={handleSubmit} className="pm-payment-form">
        <div className="pm-form-group">
          <label htmlFor="amountCollected">Amount Collected (₹):</label>
          <input
            id="amountCollected"
            type="number"
            name="amountCollected"
            value={formData.amountCollected}
            onChange={handleAmountCollectedChange}
            required
            min="0"
            step="0.01"
            max={invoiceDetails.invoiceAmount}
            className="pm-input pm-number-input"
          />
          <small className="pm-input-hint">
            Maximum: ₹{parseFloat(invoiceDetails.invoiceAmount).toFixed(2)}
          </small>
        </div>

        <div className="pm-form-group">
          <label htmlFor="modeOfCollection">Mode of Collection:</label>
          <select
            id="modeOfCollection"
            name="modeOfCollection"
            value={formData.modeOfCollection}
            onChange={handleInputChange}
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
                onChange={handleCommentsSelectChange}
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

            {/* {showCustomComment && ( */}
            {formData.comments === "Other" && (
              <div className="pm-form-group">
                <label htmlFor="customComment">Custom Comment:</label>
                <input
                  id="customComment"
                  type="text"
                  value={formData.customComment || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    customComment: e.target.value
                  }))}
                  className="pm-input"
                  placeholder="Enter custom reason"
                  required
                />
              </div>
            )}
          </>
        )}

        <div className="pm-form-actions">
          <button 
            type="submit" 
            disabled={loading} 
            className="pm-button pm-primary-button"
          >
            {loading ? 'Processing...' : (activeTab === 'add' ? 'Record Payment' : 'Update Payment')}
          </button>
          <button 
            type="button" 
            onClick={resetForm}
            className="pm-button pm-secondary-button"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  const renderTabContent = () => {
    return (
      <div className="pm-tab-content">
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
                onClick={resetForm}
                className="pm-button pm-secondary-button"
              >
                Clear
              </button>
            </div>
            <small className="pm-input-hint">
              You can enter: 15, 015, 0015, gr00015, Gr00015, r00015 - all will search for GR00015
            </small>
          </div>
        </div>

        {loading && (
          <div className="pm-loading">Loading invoice details...</div>
        )}

        {invoiceDetails && (
          <>
            {renderInvoiceDetails()}
            
            {activeTab === 'view' && paymentDetails && renderPaymentDetails()}
            {(activeTab === 'view' || activeTab === 'update') && !paymentDetails && (
              <div className="pm-info-message">
                <span>No payment record exists for this invoice.</span>
              </div>
            )}

            {activeTab === 'add' && renderEditableFields()}

            {activeTab === 'update' && paymentDetails && renderEditableFields()}
            
            {activeTab === 'delete' && (
              <div className="pm-delete-section">
                {paymentDetails ? (
                  <>
                    {renderPaymentDetails()}
                    <div className="pm-delete-actions">
                      {!deleteConfirm ? (
                        <button 
                          onClick={handleDeletePayment}
                          className="pm-button pm-danger-button"
                        >
                          Delete Payment Record
                        </button>
                      ) : (
                        <>
                          <p className="pm-confirm-text">Are you sure you want to delete this payment record?</p>
                          <div className="pm-confirm-actions">
                            <button 
                              onClick={handleDeletePayment}
                              disabled={loading}
                              className="pm-button pm-danger-button"
                            >
                              {loading ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                            <button 
                              onClick={() => setDeleteConfirm(false)}
                              className="pm-button pm-secondary-button"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="pm-info-message">
                    <span>No payment record exists for this invoice.</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className={`pm-container ${isLightMode ? 'pm-light-mode' : 'pm-dark-mode'}`}>
      {/* Popup Alert Component */}
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
        {activeTab === 'add' && 'Add Payment'}
        {activeTab === 'update' && 'Update Payment'}
        {activeTab === 'delete' && 'Delete Payment'}
      </h1>
      </div>

      <div className="pm-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default PaymentManagement;
