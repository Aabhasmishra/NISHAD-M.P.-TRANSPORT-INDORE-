import React, { useState, useEffect } from "react";
import "./App.css";
// import LoginSignup from "./Components/LoginSignup/LoginSignup";
// import UserManagement from "./Components/UserManagement/UserManagement";
// import MySidebar from "./Components/Sidebar/Sidebar";
import InvoiceGenerator from "./Components/InvoiceGenerator/InvoiceGenerator";
// import CustomerManagement from "./Components/CustomerManagement/CustomerManagement";
// import Transporter from "./Components/Transporter/Transporter";
// import PaymentManagement from "./Components/PaymentManagement/PaymentManagement";
// import Challan from "./Components/Challan/Challan";
// import CrossingStatement from "./Components/CrossingStatement/CrossingStatement";
import Cookies from 'js-cookie';

const App = () => {
  const [isLightMode, setIsLightMode] = useState(false); // Make it "true" if you want to see light mode
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeComponent, setActiveComponent] = useState("InvoiceGenerator");
  const [modeOfView, setModeOfView] = useState("add");
  // There are 4 mods "add", "view", "update", "delete". You just need to write here.

  return (
    <div className={`appClass ${isLightMode ? "light-mode" : "dark-mode"}`}>
      <InvoiceGenerator key={`InvoiceGenerator-${modeOfView}`} isLightMode={isLightMode} modeOfView={modeOfView} />
    </div>
  );
};

export default App;