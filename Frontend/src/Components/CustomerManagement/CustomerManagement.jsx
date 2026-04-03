import React, { useState, useEffect } from "react";
import "./CustomerManagement.css";
import PopupAlert from "../PopupAlert/PopupAlert";
import CustomerSearchInput from "../HelpFulComponents/CustomerSearchInput";

const CustomerManagement = ({ isLightMode, modeOfView, isPopup = false, onClose, onCustomerAdded }) => {
  const [addFormData, setAddFormData] = useState({
    name: "",
    type: "Individual",
    idType: "GST Number",
    idNumber: "",
    contactNumber: "",
  });

  const [customerName, setCustomerName] = useState("");
  const [selectedUpdateCustomerId, setSelectedUpdateCustomerId] = useState(""); // NEW: store selected customer ID for update
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
  const [selectedViewCustomerId, setSelectedViewCustomerId] = useState(""); // NEW: store selected customer ID for view
  const [customerDetails, setCustomerDetails] = useState(null);
  const [isViewingCustomer, setIsViewingCustomer] = useState(false);

  // State for Delete Customer
  const [deleteCustomerName, setDeleteCustomerName] = useState("");
  const [selectedDeleteCustomerId, setSelectedDeleteCustomerId] = useState(""); // NEW: store selected customer ID for delete
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  // State to track which form to show
  const [activeForm, setActiveForm] = useState(modeOfView);

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

  // Dummy function for onOpenCustomerPopup – we don't want the "Add New Customer" button in these search fields
  const dummyPopupHandler = () => {};

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

  // Find Customer for Update (using name + ID)
  const handleCustomerSearch = async (e) => {
    e.preventDefault();

    if (!customerName) {
      showAlert('Please enter a customer name', 'error');
      return;
    }
    if (!selectedUpdateCustomerId) {
      showAlert('Please select a customer from the suggestions', 'error');
      return;
    }

    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/customers/searchByID?id_number=${encodeURIComponent(selectedUpdateCustomerId)}`
      );
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Customer not found');

      console.log(data); // data is an array

      // ✅ Extract the first customer from the array
      if (!data.length) {
        throw new Error('No customer found with that ID number');
      }
      const customer = data[0];

      const updatedData = {
        ...customer,
        oldNameForSearch: customer.name
      };
      setUpdateFormData(updatedData);
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
      
      if (response.ok) {
        showAlert(data.message || 'Customer updated successfully!', 'success');
        setCustomerName("");
        setSelectedUpdateCustomerId(""); // Clear selected ID
        setIsCustomerFound(false);
      } else {
        throw new Error(data.error || 'Failed to update customer');
      }
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  // View Customer Details (with name + ID)
  const handleViewCustomerSearch = async (e) => {
    e.preventDefault();

    if (!viewCustomerName) {
      showAlert('Please enter a customer name', 'error');
      return;
    }
    if (!selectedViewCustomerId) {
      showAlert('Please select a customer from the suggestions', 'error');
      return;
    }

    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/customers/searchByID?id_number=${encodeURIComponent(selectedViewCustomerId)}`
      );
      const data = await response.json();

      if (!response.ok || data.error) throw new Error(data.error || 'Customer not found');

      if (data.length === 0) {
        throw new Error('No customer found with that ID number');
      }

      const customer = data[0];
      setCustomerDetails(customer);
      console.log(customer);
      setIsViewingCustomer(true);
    } catch (error) {
      showAlert(error.message, 'error');
    }
  };

  // Find Customer for Deletion
  const handleDeleteCustomerSearch = async (e) => {
    e.preventDefault();

    if (!deleteCustomerName) {
      showAlert('Please enter a customer name', 'error');
      return;
    }
    if (!selectedDeleteCustomerId) {
      showAlert('Please select a customer from the suggestions', 'error');
      return;
    }

    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/customers/searchByID?id_number=${encodeURIComponent(selectedDeleteCustomerId)}`
      );
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Customer not found');

      // ✅ Extract first customer
      if (!data.length) {
        throw new Error('No customer found with that ID number');
      }
      const customer = data[0];
      setCustomerToDelete(customer);
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
        setSelectedDeleteCustomerId(""); // Clear selected ID
        setCustomerToDelete(null);
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
              <CustomerSearchInput
                name="customerName"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setSelectedUpdateCustomerId(""); // Clear ID when user types manually
                }}
                onSelect={(customer) => {
                  setCustomerName(customer.name);
                  // Store the ID – prefer customer_code, fallback to id_number
                  const customerId = customer.id_number || "";
                  setSelectedUpdateCustomerId(customerId);
                  // Optional: You can also log or use the ID elsewhere
                  console.log(`Selected customer: ${customer.name} with ID: ${customerId}`);
                }}
                type="update"
                placeholder=""
                className="no-outline"
                isLightMode={isLightMode}
                showGstHighlight={false}
                onOpenCustomerPopup={dummyPopupHandler}
                suggestionDisplayField="id"
                showAddNewButton={false}
                emptyMessage="No matching customers found"
                disabled={isCustomerFound}
              />
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
                    name="id_number"
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
                    name="contact_number"
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
                    setSelectedUpdateCustomerId("");
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
              <CustomerSearchInput
                name="viewCustomerName"
                value={viewCustomerName}
                onChange={(e) => {
                  setViewCustomerName(e.target.value);
                  setSelectedViewCustomerId(""); // Clear ID when typing manually
                }}
                onSelect={(customer) => {
                  setViewCustomerName(customer.name);
                  const customerId = customer.id_number || "";
                  setSelectedViewCustomerId(customerId);
                  console.log(`Selected customer for view: ${customer.name} with ID: ${customerId}`);
                }}
                type="view"
                placeholder=""
                className="no-outline"
                isLightMode={isLightMode}
                showGstHighlight={false}
                onOpenCustomerPopup={dummyPopupHandler}
                suggestionDisplayField="id"
                showAddNewButton={false}
                emptyMessage="No matching customers found"
                disabled={isViewingCustomer}
              />
            </div>
            {!isViewingCustomer ? (
              <button type="submit" className="submit-btn">
                Find Customer
              </button>
            ) : null}
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
                  setSelectedViewCustomerId("");
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
              <CustomerSearchInput
                name="deleteCustomerName"
                value={deleteCustomerName}
                onChange={(e) => {
                  setDeleteCustomerName(e.target.value);
                  setSelectedDeleteCustomerId(""); // Clear ID when typing manually
                }}
                onSelect={(customer) => {
                  setDeleteCustomerName(customer.name);
                  const customerId = customer.id_number || "";
                  setSelectedDeleteCustomerId(customerId);
                  console.log(`Selected customer for deletion: ${customer.name} with ID: ${customerId}`);
                }}
                type="delete"
                placeholder=""
                className="no-outline"
                isLightMode={isLightMode}
                showGstHighlight={false}
                onOpenCustomerPopup={dummyPopupHandler}
                suggestionDisplayField="id"
                showAddNewButton={false}
                emptyMessage="No matching customers found"
                disabled={isDeletingCustomer}
              />
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
                  setSelectedDeleteCustomerId("");
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
