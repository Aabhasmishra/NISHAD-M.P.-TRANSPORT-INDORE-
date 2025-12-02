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
    type: "Individual",
    idType: "GST Number",
    idNumber: "",
    contactNumber: "",
  });
  const [isCustomerFound, setIsCustomerFound] = useState(false);

  // State for View Customer Details
  const [viewCustomerName, setViewCustomerName] = useState("");
  const [customerDetails, setCustomerDetails] = useState(null);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);

  // State for Delete Customer
  const [deleteCustomerName, setDeleteCustomerName] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

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
    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/customers?name=${encodeURIComponent(customerName)}`
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setUpdateFormData(data);
      setIsCustomerFound(true);
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  // Update Customer
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/customers/${encodeURIComponent(updateFormData.name)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: updateFormData.name,
            type: updateFormData.type,
            idType: updateFormData.idType,
            idNumber: updateFormData.idNumber,
            contactNumber: updateFormData.contactNumber
          }),
        }
      );
      const data = await response.json();
      
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
      setIsViewModalVisible(true);
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
      setIsDeleteModalVisible(true);
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
        setIsDeleteModalVisible(false);
        setDeleteCustomerName("");
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
    }
  }, [isPopup]);

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
      
      {!isPopup && (
        <div className="form-selector">
          <button onClick={() => setActiveForm("add")} className={activeForm === "add" ? "active" : ""}>
            Add Customer
          </button>
          <button onClick={() => setActiveForm("update")} className={activeForm === "update" ? "active" : ""}>
            Update Customer
          </button>
          <button onClick={() => setActiveForm("view")} className={activeForm === "view" ? "active" : ""}>
            View Details
          </button>
          <button onClick={() => setActiveForm("delete")} className={activeForm === "delete" ? "active" : ""}>
            Delete Customer
          </button>
        </div>
      )}

      {activeForm === "add" && (
        <div className="form-container">
          {!isPopup && <h2>Add New Customer</h2>}
          <form onSubmit={handleAddSubmit}>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                name="name"
                value={addFormData.name}
                onChange={handleAddInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Type:</label>
              <select
                name="type"
                value={addFormData.type}
                onChange={handleAddInputChange}
                required
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
              />
            </div>
            
            <div className="button-group">
              {isPopup && (
                <button type="button" className="danger-btn cancel-btn" onClick={onClose}>
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

      {!isPopup && (
        <>
          {activeForm === "update" && (
            <div className="form-container">
              <h2>Update Customer</h2>
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
                      />
                    </div>

                    <div className="form-group">
                      <label>Type:</label>
                      <select
                        name="type"
                        value={updateFormData.type}
                        onChange={handleUpdateInputChange}
                        required
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
                        value={updateFormData.idType}
                        onChange={handleUpdateInputChange}
                        required
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
                        value={updateFormData.idNumber}
                        onChange={handleUpdateInputChange}
                        required
                        pattern={getIdValidationPattern(updateFormData.idType)}
                        title={getIdValidationTitle(updateFormData.idType)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Contact Number:</label>
                      <input
                        type="tel"
                        name="contactNumber"
                        value={updateFormData.contactNumber}
                        onChange={handleUpdateInputChange}
                        required
                        pattern="[0-9]{10}"
                        title="Contact number must be 10 digits"
                      />
                    </div>

                    <div className="button-group">
                      <button type="button" className="danger-btn cancel-btn" onClick={() => {
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
              <h2>View Customer Details</h2>
              <form onSubmit={handleViewCustomerSearch}>
                <div className="form-group">
                  <label>Customer Name:</label>
                  <div className="search-container">
                    <input
                      type="text"
                      value={viewCustomerName}
                      onChange={(e) => handleSearchInputChange(e, setViewCustomerName)}
                      required
                      disabled={isCustomerFound}
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
                <button type="submit" className="submit-btn">
                  View Details
                </button>
              </form>

              {isViewModalVisible && (
                <div className="custom-modal">
                  <div className={`modal-content ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                    <div className="modal-header">
                      <h3 className="modal-title">Customer Details</h3>
                    </div>
                    <div className="modal-body">
                      {customerDetails && (
                        <table className={`data-table ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                          <thead>
                            <tr>
                              <th>Field</th>
                              <th>Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>Customer Code</td>
                              <td>{customerDetails.customer_code}</td>
                            </tr>
                            <tr>
                              <td>Name</td>
                              <td>{customerDetails.name}</td>
                            </tr>
                            <tr>
                              <td>Type</td>
                              <td>{customerDetails.type}</td>
                            </tr>
                            <tr>
                              <td>ID Type</td>
                              <td>{customerDetails.id_type}</td>
                            </tr>
                            <tr>
                              <td>ID Number</td>
                              <td>{customerDetails.id_number}</td>
                            </tr>
                            <tr>
                              <td>Contact Number</td>
                              <td>{customerDetails.contact_number}</td>
                            </tr>
                            <tr>
                              <td>Created At</td>
                              <td>{new Date(customerDetails.created_at).toLocaleString()}</td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                    <div className={`modal-footer ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                      <button 
                        className={`${isLightMode ? 'light-mode' : 'dark-mode'} danger-btn cancel-btn`}
                        onClick={() => setIsViewModalVisible(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeForm === "delete" && (
            <div className="form-container">
              <h2>Delete Customer</h2>
              <form onSubmit={handleDeleteCustomerSearch}>
                <div className="form-group">
                  <label>Customer Name:</label>
                  <div className="search-container">
                    <input
                      type="text"
                      value={deleteCustomerName}
                      onChange={(e) => handleSearchInputChange(e, setDeleteCustomerName)}
                      required
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
                <button type="submit" className="submit-btn">
                  Find Customer
                </button>
              </form>

              {isDeleteModalVisible && (
                <div className="custom-modal">
                  <div className={`modal-content ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                    <div className="modal-header">
                      <h3 className="modal-title">Confirm Deletion</h3>
                    </div>
                    <div className="modal-body">
                      {customerToDelete && (
                        <>
                          <p>Are you sure you want to delete this customer?</p>
                          <table className={`data-table ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                            <thead>
                              <tr>
                                <th>Field</th>
                                <th>Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>Customer Code</td>
                                <td>{customerToDelete.customer_code}</td>
                              </tr>
                              <tr>
                                <td>Name</td>
                                <td>{customerToDelete.name}</td>
                              </tr>
                              <tr>
                                <td>Type</td>
                                <td>{customerToDelete.type}</td>
                              </tr>
                            </tbody>
                          </table>
                        </>
                      )}
                    </div>
                    <div className={`modal-footer ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                      <button 
                        className={`${isLightMode ? 'light-mode' : 'dark-mode'} danger-btn cancel-btn`}
                        onClick={() => setIsDeleteModalVisible(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="danger-btn"
                        onClick={handleDeleteCustomer}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerManagement;