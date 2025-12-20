import React, { useState, useEffect } from "react";
import "./CustomerManagement.css";
import PopupAlert from "../PopupAlert/PopupAlert";

const CustomerManagement = ({ isLightMode, modeOfView, isPopup = false, onClose, onCustomerAdded }) => {
  const [addFormData, setAddFormData] = useState({
    name: "",
    type: "Individual",
    idType: "GST Number",
    idNumber: "",
    contactNumber: "",
  });

  const [customerName, setCustomerName] = useState("");
  const [updateFormData, setUpdateFormData] = useState({
    name: "",
    oldNameForSearch: "",
    type: "Individual",
    idType: "GST Number",
    idNumber: "",
    contactNumber: "",
  });
  const [isCustomerFound, setIsCustomerFound] = useState(false);

  // State for View Customer Details
  const [viewCustomerName, setViewCustomerName] = useState("");
  const [customerDetails, setCustomerDetails] = useState(null);
  const [isViewingCustomer, setIsViewingCustomer] = useState(false);

  // State for Delete Customer
  const [deleteCustomerName, setDeleteCustomerName] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  // State to track which form to show
  const [activeForm, setActiveForm] = useState(modeOfView);

  // State for search suggestions
  const [allCustomerNames, setAllCustomerNames] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // State for PopupAlert
  const [alert, setAlert] = useState({ message: '', type: 'info', show: false });

  // Show alert function
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type, show: true });
  };

  // Hide alert function
  const hideAlert = () => {
    setAlert({ message: '', type: 'info', show: false });
  };

  // Fetch all customer names when component mounts
  useEffect(() => {
    const fetchCustomerNames = async () => {
      try {
        const response = await fetch('http://43.230.202.198:3000/api/customers/all-names');
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setAllCustomerNames(data);
      } catch (error) {
        console.error('Failed to fetch customer names:', error);
        showAlert('Failed to fetch customer names', 'error');
      }
    };
    fetchCustomerNames();
  }, []);

  // Handle search input changes and show suggestions
  const handleSearchInputChange = (e, setSearchTerm) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length > 0) {
      const filteredSuggestions = allCustomerNames.filter(name =>
        name.toLowerCase().startsWith(value.toLowerCase())
      );
      setSuggestions(filteredSuggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion, setSearchTerm) => {
    setSearchTerm(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Handle input changes for Add form
  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
    setAddFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle input changes for Update form
  const handleUpdateInputChange = (e) => {
    const { name, value } = e.target;
    setUpdateFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Add Customer
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://43.230.202.198:3000/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addFormData.name,
          type: addFormData.type,
          idType: addFormData.idType,
          idNumber: addFormData.idNumber,
          contactNumber: addFormData.contactNumber
        }),
      });
      const data = await response.json();
      
      if (response.ok) {
        showAlert(`Customer added successfully! Code: ${data.customerCode}`, 'success');
        setAddFormData({
          name: "",
          type: "Individual",
          idType: "GST Number",
          idNumber: "",
          contactNumber: "",
        });
        
        // Refresh customer names after adding a new one
        const namesResponse = await fetch('http://43.230.202.198:3000/api/customers/all-names');
        const namesData = await namesResponse.json();
        setAllCustomerNames(namesData);
        
        // Call callback if provided
        if (onCustomerAdded) {
          onCustomerAdded(data);
        }
        
        // Close popup if in popup mode
        if (isPopup && onClose) {
          onClose();
        }
      } else {
        throw new Error(data.error || 'Failed to add customer');
      }
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  // Find Customer for Update
  const handleCustomerSearch = async (e) => {
    e.preventDefault();

    // Check if customer exists in our local suggestions
    const customerExists = allCustomerNames.some(name => 
      name.toLowerCase() === customerName.toLowerCase()
    );
    
    if (!customerExists) {
      showAlert('No matching customers found', 'error');
      return;
    }

    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/customers?name=${encodeURIComponent(customerName)}`
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      const updatedData = {
        ...data,
        oldNameForSearch: data.name
      };
      
      setUpdateFormData(updatedData);
      setIsCustomerFound(true);
    } catch (error) {
      showAlert(error.message, 'error');
    }
    // console.log(updateFormData);
  };

  // Update Customer
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/customers/${encodeURIComponent(updateFormData.oldNameForSearch)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: updateFormData.name,
            type: updateFormData.type,
            idType: updateFormData.id_type,
            idNumber: updateFormData.id_number,
            contactNumber: updateFormData.contact_number
          }),
        }
      );
      const data = await response.json();
      // console.log(data, updateFormData);
      
      if (response.ok) {
        showAlert(data.message || 'Customer updated successfully!', 'success');
        setCustomerName("");
        setIsCustomerFound(false);
        const namesResponse = await fetch('http://43.230.202.198:3000/api/customers/all-names');
        const namesData = await namesResponse.json();
        setAllCustomerNames(namesData);
      } else {
        throw new Error(data.error || 'Failed to update customer');
      }
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  // View Customer Details
  const handleViewCustomerSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/customers?name=${encodeURIComponent(viewCustomerName)}`
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setCustomerDetails(data);
      setIsViewingCustomer(true);
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  // Find Customer for Deletion
  const handleDeleteCustomerSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/customers?name=${encodeURIComponent(deleteCustomerName)}`
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setCustomerToDelete(data);
      setIsDeletingCustomer(true);
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async () => {
    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/customers/${encodeURIComponent(customerToDelete.name)}`,
        {
          method: 'DELETE',
        }
      );
      const data = await response.json();
      
      if (response.ok) {
        showAlert(data.message || 'Customer deleted successfully!', 'success');
        setIsDeletingCustomer(false);
        setDeleteCustomerName("");
        setCustomerToDelete(null);
        // Refresh customer names after deletion
        const namesResponse = await fetch('http://43.230.202.198:3000/api/customers/all-names');
        const namesData = await namesResponse.json();
        setAllCustomerNames(namesData);
      } else {
        throw new Error(data.error || 'Failed to delete customer');
      }
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  // Get validation pattern based on ID type
  const getIdValidationPattern = (idType) => {
    switch (idType) {
      case "GST Number":
        return "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$";
      case "PAN Number":
        return "^[A-Z]{5}[0-9]{4}[A-Z]{1}$";
      case "Aadhaar Number":
        return "^[2-9]{1}[0-9]{11}$";
      default:
        return "";
    }
  };

  // Get validation title based on ID type
  const getIdValidationTitle = (idType) => {
    switch (idType) {
      case "GST Number":
        return "GST must be in format: 12ABCDE3456F7Z8";
      case "PAN Number":
        return "PAN must be in format: ABCDE1234F";
      case "Aadhaar Number":
        return "Aadhaar must be 12 digits starting with 2-9";
      default:
        return "";
    }
  };

  // Render only the add form if in popup mode
  useEffect(() => {
    if (isPopup) {
      setActiveForm("add");
    } else {
      setActiveForm(modeOfView);
    }
  }, [isPopup, modeOfView]);

  return (
    <div className={`customer-management ${isLightMode ? 'light-mode' : 'dark-mode'} ${isPopup ? 'popup-mode' : ''}`}>
      <PopupAlert
        message={alert.message}
        type={alert.type}
        duration={5000}
        onClose={hideAlert}
        isLightMode={isLightMode}
        position="top-right"
      />
      
      {isPopup && (
        <div className="popup-header">
          <h2>Add New Customer</h2>
          <button className="close-popup" onClick={onClose}>×</button>
        </div>
      )}
      
      {activeForm === "add" && (
        <div className="form-container">
          {!isPopup && <h2 className="customer-header">Add New Customer</h2>}
          <form onSubmit={handleAddSubmit}>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                name="name"
                value={addFormData.name}
                onChange={handleAddInputChange}
                required
                className="no-outline"
              />
            </div>

            <div className="form-group">
              <label>Type:</label>
              <select
                name="type"
                value={addFormData.type}
                onChange={handleAddInputChange}
                required
                className="no-outline"
              >
                <option value="Individual">Individual</option>
                <option value="Company">Company</option>
                <option value="URD">URD</option>
              </select>
            </div>

            <div className="form-group">
              <label>ID Type:</label>
              <select
                name="idType"
                value={addFormData.idType}
                onChange={handleAddInputChange}
                required
                className="no-outline"
              >
                <option value="GST Number">GST Number</option>
                <option value="PAN Number">PAN Number</option>
                <option value="Aadhaar Number">Aadhaar Number</option>
              </select>
            </div>

            <div className="form-group">
              <label>ID Number:</label>
              <input
                type="text"
                name="idNumber"
                value={addFormData.idNumber}
                onChange={handleAddInputChange}
                required
                pattern={getIdValidationPattern(addFormData.idType)}
                title={getIdValidationTitle(addFormData.idType)}
                className="no-outline"
              />
            </div>

            <div className="form-group">
              <label>Contact Number:</label>
              <input
                type="tel"
                name="contactNumber"
                value={addFormData.contactNumber}
                onChange={handleAddInputChange}
                required
                pattern="[0-9]{10}"
                title="Contact number must be exactly 10 digits (no spaces or special characters)"
                maxLength="10"
                className="no-outline"
              />
            </div>
            
            <div className="button-group">
              {isPopup && (
                <button type="button" className="danger-btn customer-cancel-btn" onClick={onClose}>
                  Cancel
                </button>
              )}
              <button type="submit" className="submit-btn">
                Add Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {activeForm === "update" && (
        <div className="form-container">
          <h2 className="customer-header">Update Customer</h2>
          <form onSubmit={isCustomerFound ? handleUpdateSubmit : handleCustomerSearch}>
            <div className="form-group">
              <label>Customer Name:</label>
              <div className="search-container">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => handleSearchInputChange(e, setCustomerName)}
                  required
                  disabled={isCustomerFound}
                  className="no-outline"
                />
                {suggestions.length > 0 ? (
                  <ul className="suggestions-list">
                    {suggestions.map((suggestion, index) => {
                      const lowerInput = customerName.toLowerCase();
                      const lowerSuggestion = suggestion.toLowerCase();
                      const prefixIndex = lowerSuggestion.indexOf(lowerInput);
                      const prefix = suggestion.substring(0, prefixIndex + customerName.length);
                      const rest = suggestion.substring(prefixIndex + customerName.length);
                      
                      return (
                        <li 
                          key={index}
                          className="suggestion-item"
                          onClick={() => handleSuggestionClick(suggestion, setCustomerName)}
                        >
                          <span className="suggestion-prefix">{prefix}</span>
                          <span className="suggestion-rest">{rest}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  showSuggestions && (
                    <div className="no-suggestions">
                      No matching customers found
                    </div>
                  )
                )}
              </div>
            </div>

            {!isCustomerFound ? (
              <button type="submit" className="submit-btn">
                Find Customer
              </button>
            ) : (
              <>
                <div className="form-group">
                  <label>Name:</label>
                  <input
                    type="text"
                    name="name"
                    value={updateFormData.name}
                    onChange={handleUpdateInputChange}
                    required
                    className="no-outline"
                  />
                </div>

                <div className="form-group">
                  <label>Type:</label>
                  <select
                    name="type"
                    value={updateFormData.type}
                    onChange={handleUpdateInputChange}
                    required
                    className="no-outline"
                  >
                    <option value="Individual">Individual</option>
                    <option value="Company">Company</option>
                    <option value="URD">URD</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>ID Type:</label>
                  <select
                    name="id_type"
                    value={updateFormData.id_type}
                    onChange={handleUpdateInputChange}
                    required
                    className="no-outline"
                  >
                    <option value="GST Number">GST Number</option>
                    <option value="PAN Number">PAN Number</option>
                    <option value="Aadhaar Number">Aadhaar Number</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>ID Number:</label>
                  <input
                    type="text"
                    name="id_number"  // Changed from "idNumber"
                    value={updateFormData.id_number}
                    onChange={handleUpdateInputChange}
                    required
                    pattern={getIdValidationPattern(updateFormData.id_type)}
                    title={getIdValidationTitle(updateFormData.id_type)}
                    className="no-outline"
                  />
                </div>

                <div className="form-group">
                  <label>Contact Number:</label>
                  <input
                    type="tel"
                    name="contact_number"  // Changed from "contactNumber"
                    value={updateFormData.contact_number}
                    onChange={handleUpdateInputChange}
                    required
                    pattern="[0-9]{10}"
                    title="Contact number must be 10 digits"
                    className="no-outline"
                  />
                </div>

                <div className="button-group">
                  <button type="button" className="danger-btn customer-cancel-btn" onClick={() => {
                    setCustomerName("");
                    setIsCustomerFound(false);
                  }}>
                    Cancel
                  </button>
                  <button type="submit" className="submit-btn">
                    Update Customer
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {activeForm === "view" && (
        <div className="form-container">
          <h2 className="customer-header">View Customer Details</h2>
          <form onSubmit={handleViewCustomerSearch}>
            <div className="form-group">
              <label>Customer Name:</label>
              <div className="search-container">
                <input
                  type="text"
                  value={viewCustomerName}
                  onChange={(e) => handleSearchInputChange(e, setViewCustomerName)}
                  required
                  disabled={isViewingCustomer}
                  className="no-outline"
                />
                {suggestions.length > 0 ? (
                  <ul className="suggestions-list">
                    {suggestions.map((suggestion, index) => {
                      const lowerInput = viewCustomerName.toLowerCase();
                      const lowerSuggestion = suggestion.toLowerCase();
                      const prefixIndex = lowerSuggestion.indexOf(lowerInput);
                      const prefix = suggestion.substring(0, prefixIndex + viewCustomerName.length);
                      const rest = suggestion.substring(prefixIndex + viewCustomerName.length);
                      
                      return (
                        <li 
                          key={index}
                          className="suggestion-item"
                          onClick={() => handleSuggestionClick(suggestion, setViewCustomerName)}
                        >
                          <span className="suggestion-prefix">{prefix}</span>
                          <span className="suggestion-rest">{rest}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  showSuggestions && (
                    <div className="no-suggestions">
                      No matching customers found
                    </div>
                  )
                )}
              </div>
            </div>
            {!isViewingCustomer ? (
              <button type="submit" className="submit-btn">
                Find Customer
              </button>
            ) : ('')}
          </form>

          {isViewingCustomer && customerDetails && (
            <div>
              <div className="customer-details-view">
                <div className="form-group">
                  <label>Customer Code:</label>
                  <input
                    type="text"
                    value={customerDetails.customer_code || ""}
                    readOnly
                    className="no-outline readonly-field"
                  />
                </div>
                
                <div className="form-group">
                  <label>Name:</label>
                  <input
                    type="text"
                    value={customerDetails.name || ""}
                    readOnly
                    className="no-outline readonly-field"
                  />
                </div>

                <div className="form-group">
                  <label>Type:</label>
                  <input
                    type="text"
                    value={customerDetails.type || ""}
                    readOnly
                    className="no-outline readonly-field"
                  />
                </div>

                <div className="form-group">
                  <label>ID Type:</label>
                  <input
                    type="text"
                    value={customerDetails.id_type || ""}
                    readOnly
                    className="no-outline readonly-field"
                  />
                </div>

                <div className="form-group">
                  <label>ID Number:</label>
                  <input
                    type="text"
                    value={customerDetails.id_number || ""}
                    readOnly
                    className="no-outline readonly-field"
                  />
                </div>

                <div className="form-group">
                  <label>Contact Number:</label>
                  <input
                    type="tel"
                    value={customerDetails.contact_number || ""}
                    readOnly
                    className="no-outline readonly-field"
                  />
                </div>

                <div className="form-group">
                  <label>Created At:</label>
                  <input
                    type="text"
                    value={customerDetails.created_at ? new Date(customerDetails.created_at).toLocaleString() : ""}
                    readOnly
                    className="no-outline readonly-field"
                  />
                </div>
              </div>
              <div className="button-group">
                <button type="button" className="danger-btn customer-cancel-btn" onClick={() => {
                  setViewCustomerName("");
                  setIsViewingCustomer(false);
                  setCustomerDetails(null);
                }}>
                  Back to Search
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeForm === "delete" && (
        <div className="form-container">
          <h2 className="customer-header">Delete Customer</h2>
          <form onSubmit={handleDeleteCustomerSearch}>
            <div className="form-group">
              <label>Customer Name:</label>
              <div className="search-container">
                <input
                  type="text"
                  value={deleteCustomerName}
                  onChange={(e) => handleSearchInputChange(e, setDeleteCustomerName)}
                  required
                  disabled={isDeletingCustomer}
                  className="no-outline"
                />
                {suggestions.length > 0 ? (
                  <ul className="suggestions-list">
                    {suggestions.map((suggestion, index) => {
                      const lowerInput = deleteCustomerName.toLowerCase();
                      const lowerSuggestion = suggestion.toLowerCase();
                      const prefixIndex = lowerSuggestion.indexOf(lowerInput);
                      const prefix = suggestion.substring(0, prefixIndex + deleteCustomerName.length);
                      const rest = suggestion.substring(prefixIndex + deleteCustomerName.length);
                      
                      return (
                        <li 
                          key={index}
                          className="suggestion-item"
                          onClick={() => handleSuggestionClick(suggestion, setDeleteCustomerName)}
                        >
                          <span className="suggestion-prefix">{prefix}</span>
                          <span className="suggestion-rest">{rest}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  showSuggestions && (
                    <div className="no-suggestions">
                      No matching customers found
                    </div>
                  )
                )}
              </div>
            </div>
            
            {!isDeletingCustomer && (
              <button type="submit" className="submit-btn">
                Find Customer
              </button>
            )}
          </form>

          {isDeletingCustomer && customerToDelete && (
            <div>
            <div className="customer-details-view">
              <div className="form-group">
                <label>Customer Code:</label>
                <input
                  type="text"
                  value={customerToDelete.customer_code || ""}
                  readOnly
                  className="no-outline readonly-field"
                />
              </div>
              
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={customerToDelete.name || ""}
                  readOnly
                  className="no-outline readonly-field"
                />
              </div>

              <div className="form-group">
                <label>Type:</label>
                <input
                  type="text"
                  value={customerToDelete.type || ""}
                  readOnly
                  className="no-outline readonly-field"
                />
              </div>

              <div className="form-group">
                <label>ID Type:</label>
                <input
                  type="text"
                  value={customerToDelete.id_type || ""}
                  readOnly
                  className="no-outline readonly-field"
                />
              </div>

              <div className="form-group">
                <label>ID Number:</label>
                <input
                  type="text"
                  value={customerToDelete.id_number || ""}
                  readOnly
                  className="no-outline readonly-field"
                />
              </div>

              <div className="form-group">
                <label>Contact Number:</label>
                <input
                  type="tel"
                  value={customerToDelete.contact_number || ""}
                  readOnly
                  className="no-outline readonly-field"
                />
              </div>

              <div className="warning-message">
                <p>⚠️ Are you sure you want to delete this customer? This action cannot be undone.</p>
              </div>
              </div>
              <div className="button-group">
                <button type="button" className="danger-btn customer-cancel-btn" onClick={() => {
                  setDeleteCustomerName("");
                  setIsDeletingCustomer(false);
                  setCustomerToDelete(null);
                }}>
                  Cancel
                </button>
                <button type="button" className="danger-btn" onClick={handleDeleteCustomer}>
                  Delete Customer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
