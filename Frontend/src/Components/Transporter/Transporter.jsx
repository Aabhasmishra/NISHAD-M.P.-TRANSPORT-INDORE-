import { useState, useEffect } from 'react';
import "./Transporter.css";
import { IoSearch } from "react-icons/io5";
import PopupAlert from '../PopupAlert/PopupAlert';

const Transporter = ({ isLightMode, modeOfView }) => {
  // State for form fields
  const [formData, setFormData] = useState({
    ownerName: '',
    vehicleNumber: '',
    type: 'Individual',
    idType: 'GST number',
    idNumber: '',
    aadhaarNumber: '',
    contactNumber: '',
    declarationFile: 'Yes',
    comments: ''
  });

  const [mode, setMode] = useState(modeOfView);
  const [searchTerm, setSearchTerm] = useState('');
  const [foundTransporter, setFoundTransporter] = useState(null);
  const [confirmAlert, setConfirmAlert] = useState({ message: '', show: false, onConfirm: null });
  
  // State for search suggestions
  const [allVehicleNumbers, setAllVehicleNumbers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Popup Alert State
  const [alert, setAlert] = useState({ message: '', type: 'info', show: false });

  // Fetch all vehicle numbers when component mounts
  useEffect(() => {
    const fetchVehicleNumbers = async () => {
      try {
        const response = await fetch('http://43.230.202.198:3000/api/transporters/all');
        if (response.ok) {
          const data = await response.json();
          const vehicleNumbers = data.map(item => item.vehicle_number);
          setAllVehicleNumbers(vehicleNumbers);
          // console.log('Fetched vehicle numbers:', vehicleNumbers);
        }
      } catch (err) {
        console.error('Failed to fetch vehicle numbers:', err);
      }
    };
    
    fetchVehicleNumbers();
  }, []);

  // Handle search input changes and show suggestions
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length > 0) {
      const filteredSuggestions = allVehicleNumbers.filter(vehicleNumber =>
        vehicleNumber.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission for add
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://43.230.202.198:3000/api/transporters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerName: formData.ownerName,
          vehicleNumber: formData.vehicleNumber,
          type: formData.type,
          idType: formData.idType,
          idNumber: formData.idNumber,
          aadhaarNumber: formData.aadhaarNumber || '',
          contactNumber: formData.contactNumber,
          declaration_upload: formData.declarationFile,
          comments: formData.comments || ''
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add transporter');
      }

      const data = await response.json();
      showAlert(data.message || 'Transporter added successfully!', 'success');
      resetForm();
    } catch (err) {
      showAlert(`Error: ${err.message}`, 'error');
    }
  };

  // Handle search for view/update/delete
  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://43.230.202.198:3000/api/transporters?search=${searchTerm}`);
      if (!response.ok) {
        throw new Error('Transporter not found');
      }
      
      const data = await response.json();
      setFoundTransporter(data);
      setFormData({
        ownerName: data.owner_name,
        vehicleNumber: data.vehicle_number,
        type: data.type,
        idType: data.id_type,
        idNumber: data.id_number,
        aadhaarNumber: data.aadhaar_number || '',
        contactNumber: data.contact_number,
        declarationFile: data.declaration_upload,
        comments: data.comments || ''
      });
    } catch (err) {
      showAlert(err.message, 'error');
      setFoundTransporter(null);
    }
  };

  // Handle update submission
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://43.230.202.198:3000/api/transporters/${formData.vehicleNumber}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerName: formData.ownerName,
          vehicleNumber: formData.vehicleNumber,
          type: formData.type,
          idType: formData.idType,
          idNumber: formData.idNumber,
          aadhaarNumber: formData.aadhaarNumber || '',
          contactNumber: formData.contactNumber,
          declaration_upload: formData.declarationFile,
          comments: formData.comments || ''
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update transporter');
      }

      showAlert('Transporter updated successfully!', 'success');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

// Replace the confirm dialog and alerts:
const handleDelete = async () => {
  showConfirm('Are you sure you want to delete this transporter?', async () => {
    try {
      const response = await fetch(`http://43.230.202.198:3000/api/transporters/${formData.vehicleNumber}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showAlert('Transporter deleted successfully!', 'success');
        resetForm();
        setFoundTransporter(null);
        setSearchTerm('');
      } else {
        throw new Error('Failed to delete transporter');
      }
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });
};

  // Reset form
  const resetForm = () => {
    setFormData({
      ownerName: '',
      vehicleNumber: '',
      type: 'Individual',
      idType: 'GST number',
      idNumber: '',
      aadhaarNumber: '',
      contactNumber: '',
      declarationFile: 'Yes',
      comments: ''
    });
  };

  // Show alert function
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type, show: true });
  };

  // Hide alert function
  const hideAlert = () => {
    setAlert({ message: '', type: 'info', show: false });
  };

  // Show confirm function
  const showConfirm = (message, onConfirm) => {
    setConfirmAlert({ message, show: true, onConfirm });
  };

  // Hide confirm function
  const hideConfirm = () => {
    setConfirmAlert({ message: '', show: false, onConfirm: null });
  };

  // Handle confirm
  const handleConfirm = () => {
    if (confirmAlert.onConfirm) {
      confirmAlert.onConfirm();
    }
    hideConfirm();
  };

  return (
    <div className={`transporter-main-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
      {/* Popup Alert Component */}
      <PopupAlert
        message={alert.message}
        type={alert.type}
        duration={5000}
        onClose={hideAlert}
        isLightMode={isLightMode}
        position="top-right"
      />

      {/* Confirm Modal */}
      {confirmAlert.show && (
        <div className="modal-overlay">
          <div className={`modal-content ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <p>{confirmAlert.message}</p>
            <div className="modal-actions">
              <button onClick={hideConfirm}>Cancel</button>
              <button onClick={handleConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <h2 className="transporter-title">Transporter Management</h2>
      
      {/* Mode Selection */}
      <div className="transporter-mode-selector">
        <button 
          className={`transporter-mode-button ${mode === 'add' ? 'transporter-active' : ''}`}
          onClick={() => setMode('add')}
        >
          Add Transporter
        </button>
        <button 
          className={`transporter-mode-button ${mode === 'view' ? 'transporter-active' : ''}`}
          onClick={() => setMode('view')}
        >
          View Transporter
        </button>
        <button 
          className={`transporter-mode-button ${mode === 'update' ? 'transporter-active' : ''}`}
          onClick={() => setMode('update')}
        >
          Update Transporter
        </button>
        <button 
          className={`transporter-mode-button ${mode === 'delete' ? 'transporter-active' : ''}`}
          onClick={() => setMode('delete')}
        >
          Delete Transporter
        </button>
      </div>

      {/* Search Form (for view/update/delete) */}
      {(mode === 'view' || mode === 'update' || mode === 'delete') && (
        <div className="transporter-search-container">
          <form onSubmit={handleSearch} className="transporter-search-form">
            <div className="transporter-form-group">
              <label className="transporter-form-label">Enter Vehicle Number</label>
              <div className="transporter-input-wrapper">
                <div className="transporter-input-group">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    required
                    className="transporter-form-input transporter-search-input"
                    placeholder="MH12AB1234"
                  />
                  {showSuggestions && (
                    <div className={`transporter-suggestions-dropdown ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                      {suggestions.length > 0 ? (
                        <ul className="transporter-suggestions-list">
                          {suggestions.map((suggestion, index) => {
                            const lowerInput = searchTerm.toLowerCase();
                            const lowerSuggestion = suggestion.toLowerCase();
                            const matchIndex = lowerSuggestion.indexOf(lowerInput);
                            const prefix = suggestion.substring(0, matchIndex + searchTerm.length);
                            const rest = suggestion.substring(matchIndex + searchTerm.length);
                            
                            return (
                              <li 
                                key={index}
                                className="transporter-suggestion-item"
                                onClick={() => handleSuggestionClick(suggestion)}
                              >
                                <span className="transporter-suggestion-prefix">{prefix}</span>
                                <span className="transporter-suggestion-rest">{rest}</span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="transporter-no-suggestions">
                          No matching vehicles found
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button type="submit" className="transporter-search-button">
                  <IoSearch className="transporter-search-icon"/>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Display found transporter info (view mode) */}
      {mode === 'view' && foundTransporter && (
        <div className="transporter-details-container">
          <h3 className="transporter-details-container-header">Transporter Details</h3>
          <div className="transporter-detail-item">
            <span className="transporter-detail-label">Owner Name:</span>
            <span className="transporter-detail-value">{foundTransporter.owner_name}</span>
          </div>
          <div className="transporter-detail-item">
            <span className="transporter-detail-label">Vehicle Number:</span>
            <span className="transporter-detail-value">{foundTransporter.vehicle_number}</span>
          </div>
          <div className="transporter-detail-item">
            <span className="transporter-detail-label">Type:</span>
            <span className="transporter-detail-value">{foundTransporter.type}</span>
          </div>
          <div className="transporter-detail-item">
            <span className="transporter-detail-label">ID Type:</span>
            <span className="transporter-detail-value">{foundTransporter.id_type}</span>
          </div>
          <div className="transporter-detail-item">
            <span className="transporter-detail-label">ID Number:</span>
            <span className="transporter-detail-value">{foundTransporter.id_number}</span>
          </div>
          {foundTransporter.id_type === 'PAN number' && foundTransporter.aadhaar_number && (
            <div className="transporter-detail-item">
              <span className="transporter-detail-label">Aadhaar Number:</span>
              <span className="transporter-detail-value">{foundTransporter.aadhaar_number}</span>
            </div>
          )}
          <div className="transporter-detail-item">
            <span className="transporter-detail-label">Contact Number:</span>
            <span className="transporter-detail-value">{foundTransporter.contact_number}</span>
          </div>
          <div className="transporter-detail-item">
            <span className="transporter-detail-label">Declaration Received:</span>
            <span className="transporter-detail-value">{formData.declarationFile}</span>
          </div>
          {foundTransporter.comments && (
            <div className="transporter-detail-item">
              <span className="transporter-detail-label">Comments:</span>
              <span className="transporter-detail-value transporter-comment-text">
                {foundTransporter.comments}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {mode === 'delete' && foundTransporter && (
        <div className="transporter-delete-confirmation">
          <h3>Delete Transporter</h3>
          <p>Are you sure you want to delete the following transporter?</p>
          <div className="transporter-details-container">
            <div className="transporter-detail-item">
              <span className="transporter-detail-label">Vehicle Number:</span>
              <span className="transporter-detail-value">{foundTransporter.vehicle_number}</span>
            </div>
            <div className="transporter-detail-item">
              <span className="transporter-detail-label">Owner Name:</span>
              <span className="transporter-detail-value">{foundTransporter.owner_name}</span>
            </div>
          </div>
          <button onClick={handleDelete} className="transporter-delete-button">
            Confirm Delete
          </button>
        </div>
      )}

      {/* Transporter Form (add/update) */}
      {(mode === 'add' || (mode === 'update' && foundTransporter)) && (
        <form 
          onSubmit={mode === 'add' ? handleSubmit : handleUpdate} 
          className="transporter-form-container"
        >
          {/* Owner Name */}
          <div className="transporter-form-group">
            <label className="transporter-form-label">Name of the Owner</label>
            <input
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              required
              className="transporter-form-input"
            />
          </div>

          {/* Vehicle Number */}
          <div className="transporter-form-group">
            <label className="transporter-form-label">Vehicle Number</label>
            <input
              type="text"
              name="vehicleNumber"
              value={formData.vehicleNumber}
              onChange={handleChange}
              required
              className="transporter-form-input"
              disabled={mode === 'update'}
            />
          </div>

          {/* Type (Individual/Company) */}
          <div className="transporter-form-group">
            <label className="transporter-form-label">Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="transporter-form-input"
            >
              <option value="Individual">Individual</option>
              <option value="Company">Company</option>
            </select>
          </div>

          {/* ID Type */}
          <div className="transporter-form-group">
            <label className="transporter-form-label">ID Type</label>
            <select
              name="idType"
              value={formData.idType}
              onChange={handleChange}
              className="transporter-form-input"
            >
              <option value="GST number">GST Number</option>
              <option value="PAN number">PAN Number</option>
            </select>
          </div>

          {/* ID Number */}
          <div className="transporter-form-group">
            <label className="transporter-form-label">
              {formData.idType === 'GST number' ? 'GST Number' : 'PAN Number'}
            </label>
            <div className="transporter-input-with-buttons">
              <input
                type="text"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleChange}
                required
                className="transporter-form-input"
              />
              <div className="transporter-input-buttons">
                <button 
                  type="button" 
                  className="transporter-copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(formData.idNumber);
                  }}
                  disabled={!formData.idNumber}
                >
                  Copy
                </button>
                <button 
                  type="button" 
                  className="transporter-verify-button"
                  onClick={() => window.open(
                    'https://eportal.incometax.gov.in/iec/foservices/#/pre-login/link-aadhaar-status',
                    '_blank'
                  )}
                >
                  Verify
                </button>
              </div>
            </div>
          </div>

          {/* Aadhaar Number (if PAN selected) */}
          {formData.idType === 'PAN number' && (
          <div className="transporter-form-group">
            <label className="transporter-form-label">Aadhaar Number</label>
            <div className="transporter-input-with-buttons">
              <input
                type="text"
                name="aadhaarNumber"
                value={formData.aadhaarNumber}
                onChange={handleChange}
                required={formData.idType === 'PAN number'}
                className="transporter-form-input"
              />
              <div className="transporter-input-buttons">
                <button 
                  type="button" 
                  className="transporter-copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(formData.aadhaarNumber);
                  }}
                  disabled={!formData.aadhaarNumber}
                >
                  Copy
                </button>
                <button 
                  type="button" 
                  className="transporter-verify-button"
                  onClick={() => window.open(
                    'https://eportal.incometax.gov.in/iec/foservices/#/pre-login/link-aadhaar-status',
                    '_blank'
                  )}
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Contact Number */}
          <div className="transporter-form-group">
            <label className="transporter-form-label">Contact Number</label>
            <input
              type="tel"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              required
              className="transporter-form-input"
            />
          </div>

          {/* Declaration Upload */}
          <div className="transporter-form-group">
            <label className="transporter-form-label">Declaration Received</label>
            <select
              name="declarationFile"
              value={formData.declarationFile}
              onChange={handleChange}
              className="transporter-form-input"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* Comments */}
          <div className="transporter-form-group">
            <label className="transporter-form-label">Comments</label>
            <textarea
              name="comments"
              value={formData.comments}
              onChange={handleChange}
              className="transporter-form-input transporter-textarea"
            />
          </div>

          {/* Submit Button */}
          <button type="submit" className="transporter-submit-button">
            {mode === 'add' ? 'Add Transporter' : 'Update Transporter'}
          </button>
        </form>
      )}
    </div>
  );
};

export default Transporter;