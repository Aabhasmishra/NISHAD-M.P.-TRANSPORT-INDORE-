import { useState, useEffect } from 'react';
import { IoSearch, IoEye, IoEyeOff } from "react-icons/io5";
import "./UserManagement.css";
import PopupAlert from '../PopupAlert/PopupAlert';

const UserManagement = ({ isLightMode, modeOfView }) => {
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    type: 'Employee',
    mobile_number: '',
    status: 'Active'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState(modeOfView);
  const [searchTerm, setSearchTerm] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [inactiveUsers, setInactiveUsers] = useState([]);
  
  // Popup Alert State
  const [alert, setAlert] = useState({ message: '', type: 'info', show: false });
  const [confirmAlert, setConfirmAlert] = useState({ message: '', show: false, onConfirm: null });

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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('http://43.230.202.198:3000/api/users/all');
        if (response.ok) {
          const data = await response.json();
          setAllUsers(data);
          setActiveUsers(data.filter(user => user.status === 'Active'));
          setInactiveUsers(data.filter(user => user.status === 'Inactive'));
        }
      } catch (err) {
        console.error('Failed to fetch users:', err);
        showAlert('Failed to fetch users', 'error');
      }
    };
    
    fetchUsers();
  }, [mode]);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://43.230.202.198:3000/api/users/search?name=${searchTerm}`);
      if (!response.ok) throw new Error('User not found');
      
      const data = await response.json();
      setFoundUser(data[0]);
      if (data.length > 0) {
        setFormData({
          name: data[0].name,
          password: data[0].password,
          type: data[0].type,
          mobile_number: data[0].mobile_number,
          status: data[0].status
        });
      }
    } catch (err) {
      showAlert(err.message, 'error');
      setFoundUser(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://43.230.202.198:3000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add user');
      }

      showAlert('User added successfully!', 'success');
      resetForm();
      setMode('view');
    } catch (err) {
      showAlert(`Error: ${err.message}`, 'error');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://43.230.202.198:3000/api/users/${foundUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to update user');
      showAlert('User updated successfully!', 'success');
      setMode('view');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    showConfirm('Are you sure you want to delete this user?', async () => {
      try {
        const response = await fetch(`http://43.230.202.198:3000/api/users/${foundUser.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          showAlert('User deleted successfully!', 'success');
          resetForm();
          setFoundUser(null);
          setSearchTerm('');
          setMode('view');
        } else {
          throw new Error('Failed to delete user');
        }
      } catch (err) {
        showAlert(err.message, 'error');
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      password: '',
      type: 'Employee',
      mobile_number: '',
      status: 'Active'
    });
    setShowPassword(false);
  };

  return (
    <div className={`user-main-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
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
      
      <h2 className={`user-title ${isLightMode ? 'light-mode' : 'dark-mode'}`}>User Management</h2>
      
      <div className={`user-mode-selector ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
        <button 
          className={`user-mode-button ${mode === 'add' ? 'user-active' : ''} ${isLightMode ? 'light-mode' : 'dark-mode'}`}
          onClick={() => setMode('add')}
        >
          Add User
        </button>
        <button 
          className={`user-mode-button ${mode === 'view' ? 'user-active' : ''} ${isLightMode ? 'light-mode' : 'dark-mode'}`}
          onClick={() => setMode('view')}
        >
          View Users
        </button>
        <button 
          className={`user-mode-button ${mode === 'update' ? 'user-active' : ''} ${isLightMode ? 'light-mode' : 'dark-mode'}`}
          onClick={() => setMode('update')}
        >
          Update User
        </button>
        <button 
          className={`user-mode-button ${mode === 'delete' ? 'user-active' : ''} ${isLightMode ? 'light-mode' : 'dark-mode'}`}
          onClick={() => setMode('delete')}
        >
          Delete User
        </button>
      </div>

      {(mode === 'view' || mode === 'update' || mode === 'delete') && (
        <div className={`user-search-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
          <form onSubmit={handleSearch} className={`user-search-form ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <div className={`user-form-group ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
              <label className={`user-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Search by Name</label>
              <div className={`user-input-wrapper ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  required
                  className={`user-form-input user-search-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                  placeholder="Enter user name"
                />
                <button type="submit" className={`user-search-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                  <IoSearch className={`user-search-icon ${isLightMode ? 'light-mode' : 'dark-mode'}`}/>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {mode === 'view' && (
        <div className={`user-list-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
          {activeUsers.length > 0 && (
            <>
              <h3 className={`user-section-title ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Active Users</h3>
              <table className={`user-table ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                <thead>
                  <tr className={`user-table-title ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Mobile</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeUsers.map((user) => (
                    <tr key={user.id} className={`user-active-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                      <td>{user.name}</td>
                      <td>{user.type}</td>
                      <td>{user.mobile_number}</td>
                      <td>
                        <span className={`user-status-badge active ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {inactiveUsers.length > 0 && (
            <>
              <h3 className={`user-section-title ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Inactive Users</h3>
              <table className={`user-table ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                <thead>
                  <tr className={`user-table-title ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Mobile</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveUsers.map((user) => (
                    <tr key={user.id} className={`user-inactive-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                      <td>{user.name}</td>
                      <td>{user.type}</td>
                      <td>{user.mobile_number}</td>
                      <td>
                        <span className={`user-status-badge inactive ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {allUsers.length === 0 && (
            <p className={`user-no-results ${isLightMode ? 'light-mode' : 'dark-mode'}`}>No users found</p>
          )}
        </div>
      )}

      {mode === 'view' && foundUser && (
        <div className={`user-details-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
          <h3 className={`user-details-header ${isLightMode ? 'light-mode' : 'dark-mode'}`}>User Details</h3>
          <div className={`user-detail-item ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <span className={`user-detail-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Name:</span>
            <span className={`user-detail-value ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{foundUser.name}</span>
          </div>
          <div className={`user-detail-item ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <span className={`user-detail-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Password:</span>
            <span className={`user-detail-value ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{foundUser.password}</span>
          </div>
          <div className={`user-detail-item ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <span className={`user-detail-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Type:</span>
            <span className={`user-detail-value ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{foundUser.type}</span>
          </div>
          <div className={`user-detail-item ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <span className={`user-detail-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Mobile Number:</span>
            <span className={`user-detail-value ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{foundUser.mobile_number}</span>
          </div>
          <div className={`user-detail-item ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <span className={`user-detail-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Status:</span>
            <span className={`user-detail-value user-status-badge ${foundUser.status.toLowerCase()} ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
              {foundUser.status}
            </span>
          </div>
        </div>
      )}

      {mode === 'delete' && foundUser && (
        <div className={`user-delete-confirmation ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
          <h3 className={isLightMode ? 'light-mode' : 'dark-mode'}>Delete User</h3>
          <p className={isLightMode ? 'light-mode' : 'dark-mode'}>Are you sure you want to delete the following user?</p>
          <div className={`user-details-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <div className={`user-detail-item ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
              <span className={`user-detail-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Name:</span>
              <span className={`user-detail-value ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{foundUser.name}</span>
            </div>
            <div className={`user-detail-item ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
              <span className={`user-detail-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Type:</span>
              <span className={`user-detail-value ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{foundUser.type}</span>
            </div>
          </div>
          <button onClick={handleDelete} className={`user-delete-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            Confirm Delete
          </button>
        </div>
      )}

      {(mode === 'add' || (mode === 'update' && foundUser)) && (
        <form 
          onSubmit={mode === 'add' ? handleSubmit : handleUpdate} 
          className={`user-form-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}
        >
          <div className={`user-form-group ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <label className={`user-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={`user-form-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
            />
          </div>

          <div className={`user-form-group ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <label className={`user-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
              {mode === 'add' ? 'Password' : 'New Password (leave blank to keep current)'}
            </label>
            <div className={`user-password-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required={mode === 'add'}
                className={`user-form-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
              />
              <button 
                type="button" 
                className={`user-password-toggle ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <IoEyeOff className={isLightMode ? 'light-mode' : 'dark-mode'}/> : <IoEye className={isLightMode ? 'light-mode' : 'dark-mode'}/>}
              </button>
            </div>
          </div>

          <div className={`user-form-group ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <label className={`user-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className={`user-form-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
            >
              <option value="Admin">Admin</option>
              <option value="Employee">Employee</option>
            </select>
          </div>

          <div className={`user-form-group ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <label className={`user-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Mobile Number</label>
            <input
              type="tel"
              name="mobile_number"
              value={formData.mobile_number}
              onChange={handleChange}
              required
              className={`user-form-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
            />
          </div>

          <div className={`user-form-group ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            <label className={`user-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={`user-form-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <button type="submit" className={`user-submit-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
            {mode === 'add' ? 'Add User' : 'Update User'}
          </button>
        </form>
      )}
    </div>
  );
};

export default UserManagement;