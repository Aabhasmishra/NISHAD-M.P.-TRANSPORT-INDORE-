import React, { useState, useEffect } from "react";
import { 
  FaChevronDown, FaChevronRight, FaPlus, FaEdit, FaFileAlt, 
  FaUser, FaTruck, FaChartBar, FaBars, FaSun, FaMoon, 
  FaExternalLinkAlt, FaTimes
} from "react-icons/fa";
import { MdOutlineContentPasteSearch } from "react-icons/md";
import { MdOutlinePayment, MdDelete } from "react-icons/md";
import { IoDocumentTextOutline } from "react-icons/io5";
import { FaEye } from "react-icons/fa";
import { HiDocumentText } from "react-icons/hi2";
import MyLogo from "../../Images/Logo.png";
import MyLogo2 from "../../Images/Logo2.png";
import "./Sidebar.css";

// Thin sidebar (always visible when extended is closed)
const ThinSidebar = ({ isLightMode, onToggleExtended, onOpenComponent, onOpenLink }) => {
  return (
    <div className={`sidebar-thin ${isLightMode ? "light-mode" : "dark-mode"}`}>
      <button 
        className={`sidebar-thin-button ${isLightMode ? "light-mode" : "dark-mode"}`}
        onClick={onToggleExtended}
        title="Open Menu"
      >
        <FaBars />
        <div className="thin-label">Menu</div>
      </button>
      <button 
        className={`sidebar-thin-button ${isLightMode ? "light-mode" : "dark-mode"}`}
        onClick={() => onOpenComponent('InvoiceGenerator', 'add')}
        title="New Builty"
      >
        <FaFileAlt />
        <div className="thin-label">New Builty</div>
      </button>
      <button 
        className={`sidebar-thin-button ${isLightMode ? "light-mode" : "dark-mode"}`}
        onClick={() => onOpenComponent('InvoiceGenerator', 'view')}
        title="View Builty"
      >
        <FaEye />
        <div className="thin-label">View Builty</div>
      </button>
      {/* New Add Customer button */}
      <button 
        className={`sidebar-thin-button ${isLightMode ? "light-mode" : "dark-mode"}`}
        onClick={() => onOpenComponent('CustomerManagement', 'add')}
        title="Add Customer"
      >
        <FaUser />
        <div className="thin-label">Add Customer</div>
      </button>
      <button 
        className={`sidebar-thin-button ${isLightMode ? "light-mode" : "dark-mode"}`}
        onClick={() => onOpenComponent('Challan', 'add')}
        title="New Challan"
      >
        <IoDocumentTextOutline />
        <div className="thin-label">New Challan</div>
      </button>
      <button 
        className={`sidebar-thin-button ${isLightMode ? "light-mode" : "dark-mode"}`}
        onClick={() => onOpenComponent('Challan', 'view')}
        title="View Challan"
      >
        <MdOutlineContentPasteSearch />
        <div className="thin-label">View Challan</div>
      </button>
      <button 
        className={`sidebar-thin-button ${isLightMode ? "light-mode" : "dark-mode"}`}
        onClick={() => onOpenComponent('PaymentManagement', 'add')}
        title="New Payment Receipt"
      >
        <MdOutlinePayment />
        <div className="thin-label">New Payment</div>
      </button>
      <button 
        className={`sidebar-thin-button ${isLightMode ? "light-mode" : "dark-mode"}`}
        onClick={onOpenLink}
        title="Link Aadhaar Status"
      >
        <FaExternalLinkAlt />
        <div className="thin-label">Link Aadhaar</div>
      </button>
    </div>
  );
};

// Extended sidebar (slides in from left)
const Sidebar = ({ children, isOpen, isLightMode, onClose }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShouldRender(true);
  }, [isOpen]);

  const handleAnimationEnd = () => {
    if (!isOpen) setShouldRender(false);
  };

  return shouldRender ? (
    <div
      className={`sidebar-container ${isLightMode ? "light-mode" : "dark-mode"} ${
        isOpen ? "sidebar-container-open" : "sidebar-container-closing"
      }`}
      onAnimationEnd={handleAnimationEnd}
    >
      <button className="sidebar-close-button" onClick={onClose} title="Close Menu">
        <FaTimes />
      </button>
      {children}
    </div>
  ) : null;
};

const SidebarBody = ({ children }) => (
  <div className="sidebar-body">
    {children}
  </div>
);

const SidebarLink = ({ link, open, hasSubmenu, isSubmenuOpen, onClick, isLightMode }) => (
  <div className={`sidebar-link-container ${isLightMode ? "light-mode" : "dark-mode"}`}>
    <a 
      href={link.href} 
      className={`sidebar-link ${isLightMode ? "light-mode" : "dark-mode"}`}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
    >
      <span className="sidebar-link-content">
        {link.icon}
        {open && <span className="sidebar-link-label">{link.label}</span>}
      </span>
      {hasSubmenu && open && (
        <span className="sidebar-submenu-indicator">
          {isSubmenuOpen ? <FaChevronDown /> : <FaChevronRight />}
        </span>
      )}
    </a>
    {hasSubmenu && (
      <div className={`sidebar-submenu ${isSubmenuOpen ? "sidebar-submenu-open" : ""} ${isLightMode ? "light-mode" : "dark-mode"}`}>
        {link.subItems.map((subItem, idx) => (
          <a 
            key={idx} 
            href={subItem.href} 
            className={`sidebar-submenu-link ${isLightMode ? "light-mode" : "dark-mode"}`}
            onClick={(e) => {
              e.preventDefault();
              subItem.onClick();
            }}
          >
            {subItem.icon}
            <span className="sidebar-submenu-label">{subItem.label}</span>
          </a>
        ))}
      </div>
    )}
  </div>
);

const Logo = ({ isLightMode }) => (
  <div className="sidebar-logo">
    <img src={MyLogo} alt="Company Logo" className="sidebar-logo-image" />
  </div>
);

const LogoIcon = ({ isLightMode }) => (
  <div className="sidebar-logo">
    <img src={MyLogo2} alt="Company Logo" className="sidebar-logo-icon" />
  </div>
);

// Main component
export default function SidebarComponent({ 
  children,          // 👈 add this prop
  isLightMode, 
  currentUser, 
  onItemClick, 
  onThemeChange 
}) {
  const [isExtendedOpen, setIsExtendedOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState({});

  useEffect(() => {
    if (!isExtendedOpen) {
      setOpenSubmenus({});
    }
  }, [isExtendedOpen]);

  const toggleSubmenu = (menuKey) => {
    setOpenSubmenus(prev => {
      const newState = {};
      if (!prev[menuKey]) {
        newState[menuKey] = true;
      }
      return newState;
    });
  };

  const handleComponentClick = (component, mode) => {
    onItemClick(component, mode);
    setIsExtendedOpen(false); // close extended sidebar after selection
  };

  const handleExternalLink = () => {
    window.open("https://eportal.incometax.gov.in/iec/foservices/#/pre-login/link-aadhaar-status", "_blank");
  };

  const isAdmin = currentUser === 'Admin';

  // Menu items (unchanged)
  const menuItems = [
    {
      key: "builty",
      label: "Builty",
      icon: <FaFileAlt className="sidebar-link-icon" />,
      subItems: [
        { 
          label: "New Builty", 
          href: "#", 
          icon: <FaPlus />,
          onClick: () => handleComponentClick('InvoiceGenerator', 'add')
        },
        { 
          label: "View Builty", 
          href: "#", 
          icon: <FaEye />,
          onClick: () => handleComponentClick('InvoiceGenerator', 'view')
        },
        { 
          label: "Update Builty", 
          href: "#", 
          icon: <FaEdit />,
          onClick: () => handleComponentClick('InvoiceGenerator', 'update')
        },
        ...(isAdmin ? [{
          label: "Delete Builty", 
          href: "#", 
          icon: <MdDelete />,
          onClick: () => handleComponentClick('InvoiceGenerator', 'delete')
        }] : [])
      ]
    },
    {
      key: "challan",
      label: "Challan",
      icon: <IoDocumentTextOutline className="sidebar-link-icon" />,
      subItems: [
        { 
          label: "New Challan", 
          href: "#", 
          icon: <FaPlus />,
          onClick: () => handleComponentClick('Challan', 'add')
        },
        { 
          label: "View Challan", 
          href: "#", 
          icon: <FaEye />,
          onClick: () => handleComponentClick('Challan', 'view')
        },
        { 
          label: "Update Challan", 
          href: "#", 
          icon: <FaEdit />,
          onClick: () => handleComponentClick('Challan', 'update')
        },
        ...(isAdmin ? [{
          label: "Delete Challan", 
          href: "#", 
          icon: <MdDelete />,
          onClick: () => handleComponentClick('Challan', 'delete')
        }] : [])
      ]
    },
    {
      key: "payment",
      label: "Payment Receipt",
      icon: <MdOutlinePayment className="sidebar-link-icon" />,
      subItems: [
        { 
          label: "New Receipt", 
          href: "#", 
          icon: <FaPlus />,
          onClick: () => handleComponentClick('PaymentManagement', 'add')
        },
        { 
          label: "View Receipt", 
          href: "#", 
          icon: <FaEye />,
          onClick: () => handleComponentClick('PaymentManagement', 'view')
        },
        { 
          label: "Update Receipt", 
          href: "#", 
          icon: <FaEdit />,
          onClick: () => handleComponentClick('PaymentManagement', 'update')
        },
        ...(isAdmin ? [{
          label: "Delete Receipt", 
          href: "#", 
          icon: <MdDelete />,
          onClick: () => handleComponentClick('PaymentManagement', 'delete')
        }] : [])
      ]
    },
    {
      key: "crossing",
      label: "Crossing Statement",
      icon: <HiDocumentText className="sidebar-link-icon" />,
      subItems: [
        { 
          label: "New Crossing", 
          href: "#", 
          icon: <FaPlus />,
          onClick: () => handleComponentClick('CrossingStatement', 'add')
        },
        { 
          label: "View Crossing", 
          href: "#", 
          icon: <FaEye />,
          onClick: () => handleComponentClick('CrossingStatement', 'view')
        },
        { 
          label: "Update Crossing", 
          href: "#", 
          icon: <FaEdit />,
          onClick: () => handleComponentClick('CrossingStatement', 'update')
        },
        ...(isAdmin ? [{
          label: "Delete Crossing", 
          href: "#", 
          icon: <MdDelete />,
          onClick: () => handleComponentClick('CrossingStatement', 'delete')
        }] : [])
      ]
    },
    {
      key: "customer",
      label: "Customer",
      icon: <FaUser className="sidebar-link-icon" />,
      subItems: [
        { 
          label: "Add Customer", 
          href: "#", 
          icon: <FaPlus />,
          onClick: () => handleComponentClick('CustomerManagement', 'add')
        },
        { 
          label: "View Customer", 
          href: "#", 
          icon: <FaEye />,
          onClick: () => handleComponentClick('CustomerManagement', 'view')
        },
        { 
          label: "Update Customer", 
          href: "#", 
          icon: <FaEdit />,
          onClick: () => handleComponentClick('CustomerManagement', 'update')
        },
        {
          label: "Delete Customer", 
          href: "#", 
          icon: <MdDelete />,
          onClick: () => handleComponentClick('CustomerManagement', 'delete')
        }
      ]
    },
    ...(isAdmin ? [{
      key: "user",
      label: "User",
      icon: <FaUser className="sidebar-link-icon" />,
      subItems: [
        { 
          label: "Add User", 
          href: "#", 
          icon: <FaPlus />,
          onClick: () => handleComponentClick('UserManagement', 'add')
        },
        { 
          label: "View User", 
          href: "#", 
          icon: <FaEye />,
          onClick: () => handleComponentClick('UserManagement', 'view')
        },
        { 
          label: "Update User", 
          href: "#", 
          icon: <FaEdit />,
          onClick: () => handleComponentClick('UserManagement', 'update')
        },
        { 
          label: "Delete User", 
          href: "#", 
          icon: <MdDelete />,
          onClick: () => handleComponentClick('UserManagement', 'delete')
        }
      ]
    }] : []),
    {
      key: "transporter",
      label: "Transporter",
      icon: <FaTruck className="sidebar-link-icon" />,
      subItems: [
        { 
          label: "Add Transporter", 
          href: "#", 
          icon: <FaPlus />,
          onClick: () => handleComponentClick('Transporter', 'add')
        },
        { 
          label: "View Transporter", 
          href: "#", 
          icon: <FaEye />,
          onClick: () => handleComponentClick('Transporter', 'view')
        },
        { 
          label: "Update Transporter", 
          href: "#", 
          icon: <FaEdit />,
          onClick: () => handleComponentClick('Transporter', 'update')
        },
        ...(isAdmin ? [{
          label: "Delete Transporter", 
          href: "#", 
          icon: <MdDelete />,
          onClick: () => handleComponentClick('Transporter', 'delete')
        }] : [])
      ]
    },
    {
      key: "reports",
      label: "Reports",
      icon: <FaChartBar className="sidebar-link-icon" />,
      subItems: [
        { label: "Monthly Shipment Report", href: "#", icon: <FaFileAlt /> },
        { label: "Monthly Booking Report", href: "#", icon: <FaFileAlt /> },
        { label: "Outstanding Shipment Report", href: "#", icon: <FaFileAlt /> }
      ]
    },
    {
      key: "theme",
      label: isLightMode ? "Dark Mode" : "Light Mode",
      icon: isLightMode ? <FaMoon className="sidebar-link-icon" /> : <FaSun className="sidebar-link-icon" />,
      onClick: () => onThemeChange()
    }
  ];

  return (
    <>
      {/* Thin sidebar is always present when extended is closed */}
      {!isExtendedOpen && (
        <ThinSidebar 
          isLightMode={isLightMode}
          onToggleExtended={() => setIsExtendedOpen(true)}
          onOpenComponent={handleComponentClick}
          onOpenLink={handleExternalLink}
        />
      )}

      {/* Extended sidebar with smooth animation */}
      <Sidebar isOpen={isExtendedOpen} isLightMode={isLightMode} onClose={() => setIsExtendedOpen(false)}>
        <SidebarBody>
          <div className="sidebar-content">
            <Logo isLightMode={isLightMode} />
            <div className="sidebar-links">
              {menuItems.map((item) => (
                <SidebarLink
                  key={item.key}
                  link={item}
                  open={true} // always open when extended is visible
                  hasSubmenu={item.subItems && item.subItems.length > 0}
                  isSubmenuOpen={openSubmenus[item.key]}
                  onClick={() => item.onClick ? item.onClick() : toggleSubmenu(item.key)}
                  isLightMode={isLightMode}
                />
              ))}
            </div>
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Overlay only when extended is open */}
      {isExtendedOpen && (
        <div className="sidebar-content-overlay sidebar-content-overlay-active" onClick={() => setIsExtendedOpen(false)} />
      )}

      {/* Main content area (adjust margin based on which sidebar is visible) */}
      <div className={`sidebar-main-content ${isExtendedOpen ? "sidebar-main-content-extended" : "sidebar-main-content-thin"}`}>
        {children}   {/* 👈 render the passed content here */}
      </div>
    </>
  );
}
