import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from 'js-cookie';
import PopupAlert from '../PopupAlert/PopupAlert';
import "./LoginSignup.css";

const LoginSignup = ({ onLoginSuccess }) => {
  const [credentials, setCredentials] = useState({
    identifier: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "info"
  });

  useEffect(() => {
    const savedCredentials = Cookies.get('userCredentials');
    if (savedCredentials) {
      try {
        const { identifier, password } = JSON.parse(savedCredentials);
        setCredentials({ identifier, password });
        handleAutoLogin(identifier, password);
      } catch (err) {
        Cookies.remove('userCredentials');
      }
    }
  }, []);

  const handleAutoLogin = async (identifier, password) => {
    setIsLoading(true);
    try {
      const response = await axios.post("http://43.230.202.198:3000/api/users/authenticate", {
        identifier,
        password,
      });
      
      if (response.data.success) {
        // Save credentials only if auto-login succeeds
        Cookies.set('userCredentials', JSON.stringify({ identifier, password }), { expires: 3/24 });
        onLoginSuccess(response.data.user);
      } else {
        Cookies.remove('userCredentials');
        if (response.data.status === 'inactive') {
          showAlert("Your account is inactive. Please contact administrator.", "error");
        }
      }
    } catch (err) {
      Cookies.remove('userCredentials');
      if (err.response?.data?.status === 'inactive') {
        showAlert("Your account is inactive. Please contact administrator.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setAlert(prev => ({ ...prev, show: false }));

    try {
      const response = await axios.post("http://43.230.202.198:3000/api/users/authenticate", {
        identifier: credentials.identifier,
        password: credentials.password,
      });

      if (response.data.success) {
        // Save credentials in cookie for 3 hours
        Cookies.set('userCredentials', JSON.stringify(credentials), { expires: 3/24 });
        onLoginSuccess(response.data.user);
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } catch (err) {
      const errorData = err.response?.data;
      
      if (errorData?.status === 'inactive') {
        showAlert("Your account is inactive. Please contact administrator.", "error");
        setCredentials({ identifier: "", password: "" });
        Cookies.remove('userCredentials');
      } else {
        setError(errorData?.message || "Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (message, type = "info") => {
    setAlert({
      show: true,
      message,
      type
    });
  };

  const handleAlertClose = () => {
    setAlert(prev => ({ ...prev, show: false }));
  };

  return (
    <div className="login-main-container">
      <div className="login-wrapper">
        <div className="login-title-text">
          <div className="login-title active">
            Login
          </div>
        </div>
        <div className="login-form-container">
          <div className="login-form-inner">
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <input 
                  type="text" 
                  name="identifier"
                  placeholder="Name or Mobile Number" 
                  required 
                  value={credentials.identifier}
                  onChange={handleInputChange}
                  className="login-input"
                  autoComplete="username"
                />
              </div>
              <div className="login-field">
                <input 
                  type="password" 
                  name="password"
                  placeholder="Password" 
                  required 
                  value={credentials.password}
                  onChange={handleInputChange}
                  className="login-input"
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <div className="login-error-message">
                  {error}
                </div>
              )}
              <div className="login-field login-btn">
                <button 
                  type="submit" 
                  className="login-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* PopupAlert for inactive users */}
      {alert.show && (
        <PopupAlert
          message={alert.message}
          type={alert.type}
          duration={6000}
          onClose={handleAlertClose}
          position="top-center"
          isLightMode={false}
        />
      )}
    </div>
  );
};

export default LoginSignup;