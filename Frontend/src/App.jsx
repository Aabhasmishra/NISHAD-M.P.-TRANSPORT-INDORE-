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
import OSR from "./Components/OSR/OutstandingShipmentReport"

const App = () => {
  const [isLightMode, setIsLightMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeComponent, setActiveComponent] = useState("InvoiceGenerator");
  const [modeOfView, setModeOfView] = useState("add");
  const [invoiceGrNumber, setInvoiceGrNumber] = useState(null);

  // Function to read URL params and update state
  const updateStateFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    const component = params.get('component') || 'InvoiceGenerator';
    const mode = params.get('mode') || 'add';
    const gr = params.get('gr') || null;
    setActiveComponent(component);
    setModeOfView(mode);
    setInvoiceGrNumber(gr);
  };

  // Listen for popstate (browser back/forward)
  useEffect(() => {
    updateStateFromURL();
    const handlePopState = () => updateStateFromURL();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
  const currentPath = window.location.pathname;
  if (currentPath === '/TermsAndConditions') {
    return <TermsAndConditions />;
  }

  const change_theme = () => {
    setIsLightMode(!isLightMode);
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

  // Update URL when component, mode or GR changes
  const updateURL = (component, mode, gr) => {
    const params = new URLSearchParams();
    if (component) params.set('component', component);
    if (mode) params.set('mode', mode);
    if (gr) params.set('gr', gr);
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newURL);
  };

  const handleSidebarItemClick = (component, mode) => {
    setActiveComponent(component);
    setModeOfView(mode);
    setInvoiceGrNumber(null);
    updateURL(component, mode, null);
  };

  // Callbacks for InvoiceGenerator to update URL
  const handleModeChange = (newMode) => {
    setModeOfView(newMode);
    updateURL(activeComponent, newMode, invoiceGrNumber);
  };

  const handleGrChange = (newGr) => {
    setInvoiceGrNumber(newGr);
    updateURL(activeComponent, modeOfView, newGr);
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
        return <InvoiceGenerator 
          key={`InvoiceGenerator-${modeOfView}`}
          isLightMode={isLightMode}
          modeOfView={modeOfView}
          initialGrNumber={invoiceGrNumber}
          onModeChange={handleModeChange}
          onGrChange={handleGrChange}
        />;
      case 'Challan':
        return <Challan 
          key={`Challan-${modeOfView}`}
          isLightMode={isLightMode}
          modeOfView={modeOfView}
          currentUser={currentUser.type}
        />;
      case 'CrossingStatement':
        return <CrossingStatement 
          key={`CrossingStatement-${modeOfView}`}
          isLightMode={isLightMode}
          modeOfView={modeOfView}
        />;
      case 'UserManagement':
        return <UserManagement 
          key={`UserManagement-${modeOfView}`}
          isLightMode={isLightMode}
          modeOfView={modeOfView}
        />;
      case 'CustomerManagement':
        return <CustomerManagement 
          key={`CustomerManagement-${modeOfView}`}
          isLightMode={isLightMode}
          modeOfView={modeOfView}
        />;
      case 'Transporter':
        return <Transporter 
          key={`Transporter-${modeOfView}`}
          isLightMode={isLightMode}
          modeOfView={modeOfView}
        />;
      case 'PaymentManagement':
        return <PaymentManagement 
          key={`PaymentManagement-${modeOfView}`}
          isLightMode={isLightMode}
          modeOfView={modeOfView}
        />;
      case 'OSR':
        return <OSR isLightMode={isLightMode} />;
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
