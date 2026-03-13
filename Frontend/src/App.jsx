import React, { useState, useEffect } from "react";
import "./App.css";
import UserManagement from "./Components/UserManagement/UserManagement";
import MySidebar from "./Components/Sidebar/Sidebar";
import InvoiceGenerator from "./Components/InvoiceGenerator/InvoiceGenerator";
import CustomerManagement from "./Components/CustomerManagement/CustomerManagement";
import Transporter from "./Components/Transporter/Transporter";
import PaymentManagement from "./Components/PaymentManagement/PaymentManagement";
import Challan from "./Components/Challan/Challan";
import CrossingStatement from "./Components/CrossingStatement/CrossingStatement";
import Cookies from 'js-cookie';
import LoginSignup from "./Components/LoginSignup/LoginSignup";
import TermsAndConditions from "./Components/TermsAndConditions/TermsAndConditions";

const App = () => {
  const [isLightMode, setIsLightMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeComponent, setActiveComponent] = useState("InvoiceGenerator");
  const [modeOfView, setModeOfView] = useState("add");
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Listen for path changes (browser back/forward)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Check for existing session on app load
  useEffect(() => {
    const userData = Cookies.get('userData');
    if (userData) {
      const user = JSON.parse(userData);
      setCurrentUser(user);
      setIsAuthenticated(true);
    }
  }, []);

  // --- PUBLIC ROUTE: Terms & Conditions (no login required) ---
  if (currentPath === '/TermsAndConditions') {
    return <TermsAndConditions />;
  }

  const change_theme = () => {
    setIsLightMode(!isLightMode);
    console.log(currentUser);
  };

  const handleLoginSuccess = (user) => {
    Cookies.set('userData', JSON.stringify(user), { expires: 3/24 });
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    Cookies.remove('userData');
    Cookies.remove('userCredentials');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleSidebarItemClick = (component, mode) => {
    setActiveComponent(component);
    setModeOfView(mode);
  };

  if (!isAuthenticated) {
    return (
      <div className={`appClass ${isLightMode ? "light-mode" : "dark-mode"}`}>
        <LoginSignup onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  const renderComponent = () => {
    switch (activeComponent) {
      case 'InvoiceGenerator':
        return <InvoiceGenerator key={`InvoiceGenerator-${modeOfView}`} isLightMode={isLightMode} modeOfView={modeOfView} />;
      case 'Challan':
        return <Challan key={`Challan-${modeOfView}`} isLightMode={isLightMode} modeOfView={modeOfView} />;
      case 'CrossingStatement':
        return <CrossingStatement key={`CrossingStatement-${modeOfView}`} isLightMode={isLightMode} modeOfView={modeOfView} />;
      case 'UserManagement':
        return <UserManagement key={`UserManagement-${modeOfView}`} isLightMode={isLightMode} modeOfView={modeOfView} />;
      case 'CustomerManagement':
        return <CustomerManagement key={`CustomerManagement-${modeOfView}`} isLightMode={isLightMode} modeOfView={modeOfView} />;
      case 'Transporter':
        return <Transporter key={`Transporter-${modeOfView}`} isLightMode={isLightMode} modeOfView={modeOfView} />;
      case 'PaymentManagement':
        return <PaymentManagement key={`PaymentManagement-${modeOfView}`} isLightMode={isLightMode} modeOfView={modeOfView} />;
      default:
        return <div className="default-content">Select an option from the sidebar</div>;
    }
  };

  return (
    <div className={`appClass ${isLightMode ? "light-mode" : "dark-mode"}`}>
      <MySidebar
        isLightMode={isLightMode}
        currentUser={currentUser.type}
        onItemClick={handleSidebarItemClick}
        onThemeChange={change_theme}
        onLogout={handleLogout}
      >
        {renderComponent()}
      </MySidebar>
    </div>
  );
};

export default App;
