import React, { useState, useEffect, useRef } from "react";
import { FaTrashCan } from "react-icons/fa6";
import { IoSearch } from "react-icons/io5";
import { TfiWrite } from "react-icons/tfi";
import "./InvoiceGenerator.css";
import TransactionHistory from '../TransactionHistory/TransactionHistory';
import AutoWriteInvoice from "../TransactionHistory/AutoWriteInvoice";
import CustomerManagement from "../CustomerManagement/CustomerManagement";
import CustomerSearchInput from "../HelpFulComponents/CustomerSearchInput";
import PopupAlert from '../PopupAlert/PopupAlert';

const SCROLLBAR_CLASS = "custom-scrollbar";

// Column width percentages for print mode - adjustable variables
const PRINT_COLUMN_WIDTHS = {
  serialNo: '10%',
  noOfArticles: '8%',
  saidToContain: '20%',
  hsn: '8%',
  taxFree: '8%',
  weightChargeable: '8%',
  actualWeight: '8%',
  payment: '8%',
  remarks: '15%',
  auto: '8%',
  action: '8%'
};

const InvoiceGenerator = ({ isLightMode, modeOfView }) => {
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    ewayBillNo: "",
    fromLocation: "Indore",
    consignor: "",
    consignorCode: "",
    consignorGst: "",
    toLocation: "Raipur",
    consignee: "",
    consigneeCode: "",
    consigneeGst: "",
    articles: [
      {
        noIndex: 1,
        noOfArticles: "",
        saidToContain: "",
        taxFree: "No",
        weightChargeable: "",
        actualWeight: "",
        hsn: "",
        to_pay: "",
        paid: "",
        remarks: "",
      },
    ],
    paymentType: "toPay",
    goodsType: "",
    valueDeclared: "",
    gstPaidBy: "Consignor",
    motorFreight: "",
    hammali: "",
    otherCharges: "10",
    created_at: "",
    updated_at: "",
    
    // Status Fields
    challan_status: 'NOT SHIPPED',
    payment_status: 'Pending',
    crossing_status: 'NO'
  });

  const [isEditing, setIsEditing] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState(modeOfView);
  const [searchInvoiceNumber, setSearchInvoiceNumber] = useState("");
  
  const [openPopUp, setOpenPopUp] = useState(false);
  const [showCustomerPopup, setShowCustomerPopup] = useState(false);
  const [popupCustomerType, setPopupCustomerType] = useState('');
  const [showAutoWrite, setShowAutoWrite] = useState(false);
  const [autoWriteLoading, setAutoWriteLoading] = useState(false);
  const [paymentTypeDifferent, setPaymentTypeDifferent] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: 'info', show: false });
  const [confirmAlert, setConfirmAlert] = useState({ message: '', show: false, onConfirm: null });
  const [showInvoice, setShowInvoice] = useState(false);
  const consignorDebounceRef = useRef(null);
  const consigneeDebounceRef = useRef(null);
  const [grNumberInput, setGrNumberInput] = useState('');

  const locationOptions = [
    "Ambikapur", "Bhilai", "Bilaspur", "Champa", "Cuttack", "Dantewada", 
    "Dhamtari", "Durg", "Indore", "Jagdalpur", "Janjgir", "Kanker", "Kawardha", 
    "Korba", "Koriya", "Mahasamud", "Manendragarh", "Naila", "Narayanpur", 
    "Pathalgaon", "Raigarh", "Raipur", "Rajnandgaon", "Rewa", "Satna", 
    "Surguja"
  ];

  useEffect(() => {
    if (formData.consignor && formData.consignee) {
      if (consignorDebounceRef.current) {
        clearTimeout(consignorDebounceRef.current);
      }
      if (consigneeDebounceRef.current) {
        clearTimeout(consigneeDebounceRef.current);
      }

      const timeoutId = setTimeout(() => {
        checkPaymentTypeConsistency();
      }, 3000);

      consignorDebounceRef.current = timeoutId;
      consigneeDebounceRef.current = timeoutId;

      return () => {
        clearTimeout(timeoutId);
      };
    } else {
      setPaymentTypeDifferent(false);
    }
  }, [formData.consignor, formData.consignee]);

  useEffect(() => {
    let timeoutId;

    if (formData.consignor && formData.consignee) {
      if (consignorDebounceRef.current) {
        clearTimeout(consignorDebounceRef.current);
      }
      if (consigneeDebounceRef.current) {
        clearTimeout(consigneeDebounceRef.current);
      }

      timeoutId = setTimeout(() => {
        checkPaymentTypeConsistency();
      }, 3000);

      consignorDebounceRef.current = timeoutId;
      consigneeDebounceRef.current = timeoutId;
    } else {
      setPaymentTypeDifferent(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [formData.consignor, formData.consignee]);

  useEffect(() => {
    if (formData.consignor && formData.consignee) {
      checkPaymentTypeConsistency();
    }
  }, [formData.paymentType]);

  const checkPaymentTypeConsistency = async () => {
    if (!formData.consignorCode || !formData.consigneeCode) return;
    
    setIsCheckingPayment(true);
    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/transport-records/history?consignorGst=${encodeURIComponent(formData.consignorGst)}&consigeeGst=${encodeURIComponent(formData.consigneeGst)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch latest transaction');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const latestRecord = data[0];
        const latestPaymentType = latestRecord.paid == 0 ? 'TO PAY' : 'PAID';
        const currentPaymentType = formData.paymentType === "toPay" ? "TO PAY" : "PAID";
        
        const isDifferent = latestPaymentType !== currentPaymentType;
        setPaymentTypeDifferent(isDifferent);
        
        if (isDifferent && isEditing) {
          showAlert("Payment type is Different from previous transactions", 'warning');
        }
      } else {
        setPaymentTypeDifferent(false);
      }
    } catch (err) {
      console.error('Error checking payment type:', err);
      setPaymentTypeDifferent(false);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const showAlert = (message, type = 'info') => {
    setAlert({ message, type, show: true });
  };

  const hideAlert = () => {
    setAlert({ message: '', type: 'info', show: false });
  };

  const showConfirm = (message, onConfirm) => {
    setConfirmAlert({ message, show: true, onConfirm });
  };

  const hideConfirm = () => {
    setConfirmAlert({ message: '', show: false, onConfirm: null });
  };

  const handleConfirm = () => {
    if (confirmAlert.onConfirm) {
      confirmAlert.onConfirm();
    }
    hideConfirm();
  };

  // Format GR number for display
  const formatGRForDisplay = (builtyNo) => {
    if (!builtyNo) return '';
    // Remove GR prefix and leading zeros
    const numberPart = builtyNo.replace(/^GR0*/, '');
    return numberPart === '' ? '0' : numberPart;
  };

  const handleCustomerAdded = (newCustomer) => {
    if (popupCustomerType === 'consignor') {
      setFormData(prev => ({
        ...prev,
        consignor: newCustomer.name,
        consignorCode: newCustomer.customerCode
      }));
    } else if (popupCustomerType === 'consignee') {
      setFormData(prev => ({
        ...prev,
        consignee: newCustomer.name,
        consigneeCode: newCustomer.customerCode
      }));
    }
  };

  const verifyConsignorConsignee = async () => {
    setIsVerifying(true);
    setErrorMessage("");

    const cleanIdNumber = (value) => {
      const str = (value || "").trim();
      return str.startsWith("URD - ") ? str.replace("URD - ", "").trim() : str;
    };

    try {
      const consignorId = cleanIdNumber(formData.consignorGst);
      const consigneeId = cleanIdNumber(formData.consigneeGst);

      // 1. Validate consignor
      const consignorRes = await fetch(
        `http://43.230.202.198:3000/api/customers?name=${encodeURIComponent(
          formData.consignor
        )}&id_number=${encodeURIComponent(consignorId)}`
      );
      const consignorData = await consignorRes.json();

      if (!consignorData.valid) {
        showAlert("Consignor details not found in database", "error");
        return false;
      }

      // 2. Validate consignee
      const consigneeRes = await fetch(
        `http://43.230.202.198:3000/api/customers?name=${encodeURIComponent(
          formData.consignee
        )}&id_number=${encodeURIComponent(consigneeId)}`
      );
      const consigneeData = await consigneeRes.json();

      if (!consigneeData.valid) {
        showAlert("Consignee details not found in database", "error");
        return false;
      }

      return true;
    } catch (err) {
      setErrorMessage(err.message);
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const formatNumericValue = (value, isEditing = false) => {
    if (value === '' || value === null || value === undefined) return isEditing ? '' : '—';
    
    const numValue = Number(value);
    if (isNaN(numValue)) return isEditing ? value : '—';
    
    if (isEditing) {
      return value;
    } else {
      return numValue % 1 === 0 ? numValue.toString() : numValue.toFixed(2);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    const numericFields = ['motorFreight', 'hammali', 'otherCharges', 'valueDeclared'];
    
    if (numericFields.includes(name)) {
      if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleArticleChange = (index, e) => {
    const { name, value } = e.target;
    
    const numericFields = ['weightChargeable', 'actualWeight', 'to_pay', 'paid', 'noOfArticles'];
    
    if (numericFields.includes(name)) {
      if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
        const updatedArticles = [...formData.articles];
        updatedArticles[index] = { ...updatedArticles[index], [name]: value };
        setFormData((prev) => ({ ...prev, articles: updatedArticles }));
      }
    } else {
      const updatedArticles = [...formData.articles];
      updatedArticles[index] = { ...updatedArticles[index], [name]: value };
      setFormData((prev) => ({ ...prev, articles: updatedArticles }));
    }
  };

  const addArticle = () => {
    setFormData((prev) => ({
      ...prev,
      articles: [
        ...prev.articles,
        {
          noIndex: prev.articles.length + 1,
          noOfArticles: "",
          saidToContain: "",
          taxFree: "No",
          weightChargeable: "",
          actualWeight: "",
          hsn: "",
          to_pay: "",
          paid: "",
          remarks: "",
        },
      ],
    }));
  };

  const removeArticle = (index) => {
    if (formData.articles.length > 1) {
      const updatedArticles = formData.articles
        .filter((_, i) => i !== index)
        .map((article, idx) => ({ ...article, noIndex: idx + 1 }));

      setFormData((prev) => ({ ...prev, articles: updatedArticles }));
    }
  };

  const formatGRForBackend = (input) => {
    if (input.startsWith("GR")) {
      let numPart = input.slice(2).replace(/^0+/, '');
      if (numPart === '') numPart = '0';
      input = "GR" + numPart.padStart(6, "0");
    } else {
      // Remove any non-digit prefix (like "R", etc.) and leading zeros
      let numPart = input.replace(/^[^0-9]*/, '').replace(/^0+/, '');
      if (numPart === '') numPart = '0';
      input = "GR" + numPart.padStart(6, "0");
    }
    return input;
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();

    const isValid = await verifyConsignorConsignee();
    if (!isValid) {
      setIsEditing(true);
      return;
    }

    setIsEditing(false);
  };

  const handleSubmitToServer = async () => {
    // Validate required fields
    if (!formData.valueDeclared || formData.valueDeclared.trim() === '') {
      showAlert("Value Declared is required", 'warning');
      return;
    }
    if (!formData.goodsType || formData.goodsType.trim() === '') {
      showAlert("Goods Type is required", 'warning');
      return;
    }

    try {
      const articlesWithHSN = formData.articles.map((article) => ({
        ...article,
        hsn: article.hsn || "",
      }));

      const [day, month, year] = formData.date.split("-");
      const formattedDate = `${year}-${month}-${day}`;

      const motorFreightValue = formData.motorFreight === "" ? "0" : formData.motorFreight;
      const hammaliValue = formData.hammali === "" ? "0" : formData.hammali;
      const otherChargesValue = formData.otherCharges === "" ? "0" : formData.otherCharges;

      // NEW: Include grNo in request body
      const requestBody = {
        grNo: formData.invoiceNumber, // formatted GR number
        date: formattedDate,
        ewayBillNo: formData.ewayBillNo,
        fromLocation: formData.fromLocation,
        consignorCode: formData.consignorCode,
        consignor: formData.consignor,
        consignorGst: formData.consignorGst,
        toLocation: formData.toLocation,
        consigneeCode: formData.consigneeCode,
        consignee: formData.consignee,
        consigneeGst: formData.consigneeGst,
        articleLength: articlesWithHSN.length,
        articleNo: articlesWithHSN.map((a) => a.noOfArticles).join("|"),
        saidToContain: articlesWithHSN.map((a) => a.saidToContain).join("|"),
        taxFree: articlesWithHSN.map((a) => a.taxFree).join("|"),
        weightChargeable: articlesWithHSN.map((a) => a.weightChargeable).join("|"),
        actualWeight: articlesWithHSN.map((a) => a.actualWeight).join("|"),
        amount: articlesWithHSN.map((a) => 
          formData.paymentType === "toPay" ? a.to_pay || "0" : a.paid || "0"
        ).join("|"),
        hsn: articlesWithHSN.map((a) => a.hsn || "0").join("|"),
        to_pay: articlesWithHSN.map((a) => a.to_pay).join("|"),
        paid: articlesWithHSN.map((a) => a.paid).join("|"),
        remarks: articlesWithHSN.map((a) => a.remarks).join("|"),
        paymentType: formData.paymentType === "toPay" ? "TO PAY" : "PAID",
        goodsType: formData.goodsType,
        valueDeclared: formData.valueDeclared,
        gstWillBePaidBy: formData.gstPaidBy,
        motorFreight: motorFreightValue,
        hammali: hammaliValue,
        otherCharges: otherChargesValue,
        payment_status: formData.payment_status
      };

      const response = await fetch(
        "http://43.230.202.198:3000/api/transport-records",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle duplicate GR number error from backend
        if (data.error && data.error.includes("GR number already exists")) {
          showAlert("GR number already exists. Please use a different number.", 'error');
        } else {
          throw new Error(data.error || "Failed to save invoice");
        }
        return;
      } else {
        showAlert("Transport record saved successfully", 'success');
      }

      setFormData((prev) => ({
        ...prev,
        invoiceNumber: data.grNo,
        created_at: data.created_at,
        updated_at: data.updated_at,
        challan_status: 'NOT SHIPPED',
        payment_status: 'Pending',
        crossing_status: 'NO',
      }));
      setIsSubmitted(true);
      // Clear the raw GR input after successful save
      setGrNumberInput('');
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const resetForm = () => {
    setIsEditing(true);
    setIsSubmitted(false);
    setErrorMessage("");
    setFormData((prev) => ({
      ...prev,
      invoiceNumber: "",
      consignorCode: "",
      consignorGst: "",
      consigneeCode: "",
      consigneeGst: "",
    }));
    setGrNumberInput('');
  };

  const resetForm2 = () => {
    setFormData({
      invoiceNumber: "",
      date: new Date().toISOString().split("T")[0],
      ewayBillNo: "",
      fromLocation: "Indore",
      consignor: "",
      consignorCode: "",
      consignorGst: "",
      toLocation: "Raipur",
      consignee: "",
      consigneeCode: "",
      consigneeGst: "",
      articles: [
        {
          noIndex: 1,
          noOfArticles: "",
          saidToContain: "",
          taxFree: "No",
          weightChargeable: "",
          actualWeight: "",
          hsn: "",
          to_pay: "",
          paid: "",
          remarks: "",
        },
      ],
      paymentType: "toPay",
      goodsType: "",
      valueDeclared: "",
      gstPaidBy: "Consignor",
      motorFreight: "",
      hammali: "",
      otherCharges: "10",
      created_at: "",
      updated_at: "",
      challan_status: 'NOT SHIPPED',
      payment_status: 'Pending',
      crossing_status: 'NO',
    });
    setIsEditing(true);
    setIsSubmitted(false);
    setErrorMessage("");
    setShowInvoice(false);
    setGrNumberInput('');
  };

  const fetchInvoice = async (invoiceNumber) => {
    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/transport-records?grNo=${invoiceNumber}`
      );
      const data = await response.json();
      
      if (!response.ok) {
        showAlert(data.error || "Invoice not found", 'error');
        return;
      }

      const articles = [];
      for (let i = 0; i < data.article_length; i++) {
        articles.push({
          noIndex: i + 1,
          noOfArticles: data.article_no.split("|")[i] || "",
          saidToContain: data.said_to_contain.split("|")[i] || "",
          taxFree: data.tax_free.split("|")[i] || "No",
          weightChargeable: data.weight_chargeable.split("|")[i] || "",
          actualWeight: data.actual_weight.split("|")[i] || "",
          hsn: data.hsn ? data.hsn.split("|")[i] || "" : "",
          to_pay: (data.paid == 0) ? data.amount.split("|")[i] || "" : 0,
          paid: (data.to_pay == 0) ? data.amount.split("|")[i] || "" : 0,
          remarks: data.remarks ? data.remarks.split("|")[i] : "",
        });
      }

      const dbDate = new Date(data.date);
      const formattedDate = [
        dbDate.getFullYear(),
        (dbDate.getMonth() + 1).toString().padStart(2, "0"),
        dbDate.getDate().toString().padStart(2, "0"),
      ].join("-");

      setFormData({
        invoiceNumber: data.gr_no,
        date: formattedDate,
        ewayBillNo: data.eway_bill_no,
        fromLocation: data.from_location,
        consignor: data.consignor_name || "",
        consignorCode: data.consignor_code,
        consignorGst: data.consignor_gst,
        toLocation: data.to_location,
        consignee: data.consignee_name || "",
        consigneeCode: data.consignee_code,
        consigneeGst: data.consignee_gst,
        articles,
        paymentType: data.paid == 0 ? "toPay" : "paid",
        goodsType: data.goods_type,
        valueDeclared: formatNumericValue(data.value_declared),
        gstPaidBy: data.gst_will_be_paid_by,
        motorFreight: formatNumericValue(data.motor_freight) || "",
        hammali: formatNumericValue(data.hammali) || "",
        otherCharges: formatNumericValue(data.other_charges) || "",
        driverName: data.driver_name,
        created_at: data.created_at,
        updated_at: data.updated_at,
        challan_status: data.challan_status || 'NOT SHIPPED',
        payment_status: data.payment_status || 'Pending',
        crossing_status: data.crossing_status || 'NO',
      });

      setIsEditing(activeTab === "update");
      setIsSubmitted(true);
      setShowInvoice(true);
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleSearchInvoice = (e) => {
    e.preventDefault();

    if (!searchInvoiceNumber) {
      setErrorMessage("Please enter an invoice number");
      return;
    }

    let input = searchInvoiceNumber.trim().toUpperCase();

    if (input.startsWith("GR")) {
      let numPart = input.slice(2).replace(/^0+/, '');
      if (numPart === '') numPart = '0';
      input = "GR" + numPart.padStart(6, "0");
    } else {
      let numPart = input.replace(/^0+/, '');
      if (numPart === '') numPart = '0';
      input = "GR" + numPart.padStart(6, "0");
    }

    fetchInvoice(input);
  };

  const handleUpdateInvoice = async () => {
    try {
      setIsVerifying(true);
      setErrorMessage("");

      // Helper to fetch full customer details after validation
      const fetchCustomerDetails = async (name, idNumber) => {
        const validateRes = await fetch(
          `http://43.230.202.198:3000/api/customers?name=${encodeURIComponent(name)}&id_number=${encodeURIComponent(idNumber)}`
        );
        const validateData = await validateRes.json();
        if (!validateData.valid) {
          throw new Error(`Customer "${name}" with ID "${idNumber}" not found`);
        }

        // 2. Get full details using search endpoint
        const searchRes = await fetch(
          `http://43.230.202.198:3000/api/customers/search?q=${encodeURIComponent(name)}`
        );
        const searchResults = await searchRes.json();
        const customer = searchResults.find(c => c.id_number === idNumber);
        if (!customer) {
          throw new Error(`Details for "${name}" (ID: ${idNumber}) not found in search results`);
        }

        // Build GST string exactly as before
        let gst = `URD - ${customer.id_number}`;
        if (customer.id_type === "GST Number") {
          gst = customer.id_number;
        }

        return {
          code: customer.customer_code,
          gst: gst
        };
      };

      // Validate and fetch consignor details
      const consignorDetails = await fetchCustomerDetails(
        formData.consignor,
        formData.consignorGst   // this field holds the ID number (e.g., GST or Aadhar)
      );

      // Validate and fetch consignee details
      const consigneeDetails = await fetchCustomerDetails(
        formData.consignee,
        formData.consigneeGst   // this field holds the ID number
      );

      // Continue with the rest of the update (unchanged)
      const [day, month, year] = formData.date.split("-");
      const formattedDate = `${year}-${month}-${day}`;

      const motorFreightValue = formData.motorFreight === "" ? "0" : formData.motorFreight;
      const hammaliValue = formData.hammali === "" ? "0" : formData.hammali;
      const otherChargesValue = formData.otherCharges === "" ? "0" : formData.otherCharges;

      const updatedData = {
        date: formattedDate,
        ewayBillNo: formData.ewayBillNo,
        fromLocation: formData.fromLocation,
        consignor: formData.consignor,
        consignorCode: consignorDetails.code,
        consignorGst: consignorDetails.gst,
        toLocation: formData.toLocation,
        consignee: formData.consignee,
        consigneeCode: consigneeDetails.code,
        consigneeGst: consigneeDetails.gst,
        articleLength: formData.articles.length,
        articleNo: formData.articles.map((a) => a.noOfArticles).join("|"),
        saidToContain: formData.articles.map((a) => a.saidToContain).join("|"),
        taxFree: formData.articles.map((a) => a.taxFree).join("|"),
        weightChargeable: formData.articles.map((a) => a.weightChargeable).join("|"),
        actualWeight: formData.articles.map((a) => a.actualWeight).join("|"),
        amount: formData.articles.map((a) => 
          formData.paymentType === "toPay" ? a.to_pay || "0" : a.paid || "0"
        ).join("|"),
        hsn: formData.articles.map((a) => a.hsn || "9999").join("|"),
        to_pay: formData.articles.map((a) => a.to_pay).join("|"),
        paid: formData.articles.map((a) => a.paid).join("|"),
        remarks: formData.articles.map((a) => a.remarks).join("|"),
        paymentType: formData.paymentType === "toPay" ? "TO PAY" : "PAID",
        goodsType: formData.goodsType,
        valueDeclared: formData.valueDeclared,
        gstWillBePaidBy: formData.gstPaidBy,
        motorFreight: motorFreightValue,
        hammali: hammaliValue,
        otherCharges: otherChargesValue,
        driverName: formData.driverName,
      };

      const response = await fetch(
        `http://43.230.202.198:3000/api/transport-records/${formData.invoiceNumber}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update invoice");
      }

      setFormData((prev) => ({
        ...prev,
        ...updatedData,
        updated_at: data.updated_at,
        date: formData.date,
        challan_status: 'NOT SHIPPED',
        payment_status: 'Pending',
        crossing_status: 'NO',
      }));

      showAlert("Transport record updated successfully", 'success');
      setShowInvoice(false);
    } catch (err) {
      console.error("Update error:", err);
      setErrorMessage(err.message);
      showAlert(err.message, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeleteInvoice = async () => {
    showConfirm("Are you sure you want to delete this invoice?", async () => {
      try {
        const response = await fetch(
          `http://43.230.202.198:3000/api/transport-records/${formData.invoiceNumber}`,
          {
            method: "DELETE",
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to delete invoice");
        } else {
          showAlert("Transport record deleted successfully", 'success');
          resetForm2();
        }
      } catch (err) {
        setErrorMessage(err.message);
      }
    });
  };

  const handlePrintBase = ({ hideCopyLabels = false, usePrint2Styles = false } = {}) => {
    const printWindow = window.open('', '_blank');
    
    const originalInvoiceElement = document.getElementById('print-area');
    const modifiedInvoiceHTML = ensureThreeRowsInTable(originalInvoiceElement.innerHTML);
    
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    const copies = [
      { label: 'CONSIGNOR COPY' },
      { label: 'CONSIGNEE COPY' },
      { label: 'DRIVER COPY' }
    ];

    const isPaidType = formData.paymentType === "paid";

    // Build the dynamic CSS string with conditional rules
    const getStyles = () => {
      let css = `
        @page {
          size: A4;
          margin: 0;
        }

        body {
          margin: 0;
          padding: 7mm;
          background: white !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          font-size: 10px;
          width: 196mm;
          height: 283mm;
          box-sizing: border-box;
        }

        .print-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 3mm;
        }

        .invoice-copy {
          flex: 1;
          position: relative;
          min-height: 0;
        }

        .invoice-container {
          border: 1px solid #000 !important;
          margin: 0 auto;
          padding: 8px !important;
          height: 100%;
          box-sizing: border-box;
          transform: scale(0.82);
          transform-origin: top left;
          width: 121.95%;
        }

        .copy-label {
          position: absolute;
          top: 6px;
          right: 12px;
          font-weight: bold;
          font-size: 11px;
          color: #000;
          margin: 0;
          z-index: 1000;
        }

        .footer-right .copy-label {
          position: static !important;
          font-weight: bold;
          font-size: 11px;
          color: #000;
          margin: 0;
          text-align: right;
        }

        body * {
          visibility: visible !important;
        }

        .no-print,
        .invoice-actions,
        .invoice-tabs,
        .error-message,
        .search-container,
        .suggestions-list,
        .invoice-timestamps {
          display: none !important;
        }

        .company-name {
          font-size: 15px !important;
        }
      `;

      // Add print2 specific styles if needed
      if (usePrint2Styles) {
        css += `
          .GRNOCss {
            position: relative;
            top: -8px;
            right: 30px;
          }

          .company-name {
            display: none !important;
          }

          .printTextWhite, .printTextWhite th, .printTextWhite td, .header-row th:not(:last-child) {
            color: #ffffff !important;
            border-color: white !important;
            background: white !important;
          }

          .printValueText, .printValueText td {
            color: black !important;
            font-size: 12px !important;
          }

          .article-row {
            height: 25px;
          }

          .textShiftUp {
            position: relative;
            top: -20px;
          }

          .textShiftUp2 {
            position: relative;
            top: -10px;
            right: 40px;
          }
            
          .toLocationCss {
            position: relative;
            right: 65px;
            text-align: right;
          }

          .textShiftUp3 {
            position: relative;
            top: -20px;
          }

          .textShiftLeft {
            position: relative;
            left: -12px;
          }

          .textShiftDown {
            position: relative;
            bottom: 7px;
          }

          .invoice-table td:nth-child(8), .invoice-table td:nth-child(9) {
            right: 20px;
            top: 5px;
          }
          
          .total-row {
            height: 20px;
          }

          .total-row td:nth-child(7), .total-row td:nth-child(6){
            right: 10px;
          }

          .total-row td:nth-child(8) p{
            top: 10px;
            right: 30px;
            background-color: transparent;
          }

          .goodsTypePrCss {
            left: 15px;
          }
        `;
      }

      css += `
        .company-description {
          font-size: 10px !important;
          margin-bottom: 3px !important;
        }

        .company-address {
          font-size: 10px !important;
        }

        .showDateCss {
          width: 80px;
        }

        .GRNOCss {
          width: 30px;
        }

        .MFHOCText {
          font-size: 9px;
        }

        .consignment-details {
          font-size: 10px !important;
          margin-bottom: 5px !important;
        }

        .consignment-from2 {
          display: flex;
          justify-content: space-between;
        }

        .gstWillBePaidBy {
          width: 50px;
        }

        .valueDeclaredcss {
          width: 50px;
        }

        .toLocationCss {
          width: 65px;
        }

        .goodsTypeCss {
          width: 60px;
        }

        .fixed-name-field {
          width: 350px;
        }

        .customer-GST-Fields,
        .customer-GST-value {
          display: flex;
          justify-content: flex-end;
        }

        .customer-GST-value {
          width: 111px;
          justify-content: center;
        }

        .form-group.inline {
          margin-bottom: 1px !important;
        }

        .invoice-table {
          margin-bottom: 3px !important;
          overflow: hidden;
        }

        .invoice-table table {
          width: 100% !important;
          table-layout: fixed !important;
        }
      `;

      // Table cell styles – different for print2
      if (usePrint2Styles) {
        css += `
          .invoice-table td {
            font-size: 12px !important;
            padding: 2px 3px !important;
            line-height: 1.1 !important;
          }
          .invoice-table th {
            font-size: 9px !important;
            padding: 3px !important;
          }
        `;
      } else {
        css += `
          .invoice-table th,
          .invoice-table td {
            font-size: 10px !important;
            padding: 2px 3px !important;
            line-height: 1.1 !important;
          }
        `;
      }

      css += `
        .invoice-table th:nth-child(1),
        .invoice-table td:nth-child(1) {
          width: ${PRINT_COLUMN_WIDTHS.serialNo} !important;
        }

        .invoice-table th:nth-child(2),
        .invoice-table td:nth-child(2) {
          width: ${PRINT_COLUMN_WIDTHS.noOfArticles} !important;
        }

        .invoice-table th:nth-child(3),
        .invoice-table td:nth-child(3) {
          width: ${PRINT_COLUMN_WIDTHS.saidToContain} !important;
        }

        .invoice-table th:nth-child(4),
        .invoice-table td:nth-child(4) {
          width: ${PRINT_COLUMN_WIDTHS.hsn} !important;
        }

        .invoice-table th:nth-child(5),
        .invoice-table td:nth-child(5) {
          width: ${PRINT_COLUMN_WIDTHS.taxFree} !important;
        }

        .invoice-table th:nth-child(6),
        .invoice-table td:nth-child(6) {
          width: ${PRINT_COLUMN_WIDTHS.weightChargeable} !important;
        }

        .invoice-table th:nth-child(7),
        .invoice-table td:nth-child(7) {
          width: ${PRINT_COLUMN_WIDTHS.actualWeight} !important;
        }

        .invoice-table th:nth-child(8),
        .invoice-table td:nth-child(8) {
          width: ${PRINT_COLUMN_WIDTHS.payment} !important;
        }

        .invoice-table th:nth-child(9),
        .invoice-table td:nth-child(9) {
          width: ${PRINT_COLUMN_WIDTHS.remarks} !important;
        }

        .invoice-table th:nth-child(10),
        .invoice-table td:nth-child(10) {
          width: ${PRINT_COLUMN_WIDTHS.auto} !important;
        }

        .invoice-table th:nth-child(11),
        .invoice-table td:nth-child(11) {
          width: ${PRINT_COLUMN_WIDTHS.action} !important;
        }

        .invoice-table th:nth-child(10),
        .invoice-table td:nth-child(10),
        .invoice-table th:nth-child(11),
        .invoice-table td:nth-child(11) {
          display: none !important;
        }

        ${isPaidType ? `
          .driver-copy .invoice-table td:nth-child(8) {
            visibility: hidden !important;
          }
          
          .driver-copy .invoice-table td:nth-child(8)::after {
            content: "" !important;
          }
        ` : ''}

        .invoice-input {
          font-size: 9px !important;
          padding: 1px 2px !important;
        }

        .table-input {
          padding: 1px 2px !important;
        }

        .invoice-footer {
          font-size: 10px !important;
          margin-top: 2px !important;
        }

        .goods-type-row {
          margin-bottom: 0px !important;
        }

        .GoodsTypeCSS {
          margin-right: 120px;
        }

        .spaceForSign {
          width: 85px;
        }

        .footer-below {
          margin-top: 1px !important;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .invoice-header {
          margin-bottom: 5px !important;
        }

        .address-left,
        .address-right {
          font-size: 9px !important;
        }

        .gstin {
          width: 310px;
          font-size: 10px !important;
          text-align: left;
          padding-left: 35px;
        }

        .payment-type-selector {
          font-size: 9px !important;
        }

        .form-group.inline {
          gap: 2px !important;
        }

        /* Print-specific overrides to ensure consistency */
        @media print {
        body {
          margin: 0 !important;
          padding: 7mm;
          width: 230mm;
          height: 297mm;
          box-sizing: border-box;
        }

        .print-container {
          width: 220mm;
          height: 290mm;          /* Exactly the printable height (297mm - 2*7mm) */
          display: flex;
          flex-direction: column;
          gap: 2mm;              /* Reduced gap to save vertical space */
        }

          .invoice-copy {
            flex: 1;
            height: calc((283mm - 6mm) / 3);
            min-height: 0;
            position: relative;
          }

          .invoice-container {
            border: 1px solid #000 !important;
            margin: 0 auto !important;
            padding: 8px !important;
            height: 100%;
            transform: scale(0.82);
            transform-origin: top left;
            width: 121.95%;
            box-sizing: border-box;
          }

          .copy-label {
            display: none !important;
          }

          .footer-right .copy-label {
            display: block !important;
            position: static !important;
            font-weight: bold;
            font-size: 11px;
            color: #000;
            margin: 0;
            text-align: right;
          }

          ${isPaidType ? `
            .driver-copy .invoice-table td:nth-child(8) div {
              visibility: hidden !important;
            }

            .driver-copy .total-row td:nth-child(8) p{
              visibility: hidden !important;
            }
          ` : ''}
        }
      `;

      // Override copy label color if hideCopyLabels is true
      if (hideCopyLabels) {
        css += `
          .copy-label, .footer-right .copy-label {
            color: white !important;
          }
        `;
      }

      if (usePrint2Styles) {
        css += `
          .consignor-copy .textShiftUp {
            top: 10px;
            left: 15px;
          }
            
          .consignor-copy .textShiftUp2, .GRNOCss {
            top: 20px;
          }

          .consignor-copy .invoice-table {
            height: 230px;
          }

          .consignor-copy .invoice-table {
            top: 10px;
          }
          
          .consignor-copy .textShiftLeft:nth-child(6) {
            left: -3px;
          }

          .consignor-copy .total-row p {
            position: relative;
            top: 10px;
          }

          .consignor-copy .total-row td:not(:nth-child(2)) {
            left: 10px;
          }

          .consignor-copy .total-row td:nth-child(7) {
            left: -10px;
            top: 5px;
          }

          .consignor-copy .textShiftDown {
            top: 8px;
            z-index: 1;
          }

          .consignee-copy .textShiftUp {
            top: 30px;
            left: 15px;
          }

          .consignee-copy .invoice-table {
            top: 30px;
            height: 250px;
          }

          .consignee-copy .total-row p {
            top: 10px;
          }

          .consignee-copy .total-row td:nth-child(7) {
            top: 15px;
          }

          .consignee-copy .total-row td:nth-child(8) {
            top: 20px;
          }

          .consignee-copy .textShiftUp2, .consignee-copy .GRNOCss  {
            top: 45px;
            z-index: 1;
          }

          .consignee-copy .invoice-table th {
            margin-top: 20px;
            background-color: transparent;
          }

          .consignee-copy .textShiftDown {
            top: 5px;
            z-index: 100;
          }

          .consignee-copy .goodsTypePrCss {
            top: -2px;
          }

          .driver-copy .textShiftUp {
            top: 40px;
            left: 15px;
            z-index: 100;
          }

          .driver-copy .textShiftUp2, .driver-copy .GRNOCss {
            top: 50px;
            right: 50px;
            z-index: 100;
          }

          .driver-copy .toLocationCss {
            right: 75px;
          }

          .driver-copy .invoice-table {
            top: 50px;
            z-index: 1;
          }

          .driver-copy .invoice-table td:nth-child(8), .driver-copy .invoice-table td:nth-child(9) {
            right: 30px;
            bottom: 5px;
          }

          .driver-copy .textShiftLeft {
            bottom: 7px;
          }

          .driver-copy .total-row td:nth-child(2), .driver-copy .total-row td:nth-child(6) {
            top: 10px;
          }

          .driver-copy .total-row td:nth-child(7) {
            top: 6px;
          }

          .driver-copy .total-row td:nth-child(8) {
            top: 6px;
          }

          .driver-copy .textShiftDown {
            top: 75px;
            background-color: transparent;
          }

          .driver-copy .goodsTypePrCss {
            top: 68px;
          }
        `;
      }

      // ✅ MOBILE PRINT FIX (ADD THIS AT THE END BEFORE return css)

      css += `
      @media print and (max-width: 768px) {
        @page {
          size: A4;
          margin: 0;
        }
        body {
          margin: 0 !important;
          padding: 6mm !important;
          width: 210mm !important;
          height: 297mm !important;
          overflow: hidden !important;
        }

        .print-container {
          width: 100% !important;
          height: 270mm !important;
          gap: 2mm !important;
        }

        .invoice-copy {
          height: calc((270mm - 4mm) / 3) !important;
        }

        .invoice-container {
          transform: scale(0.80) !important;  /* slight adjust */
          transform-origin: top left !important;
          width: 125% !important;
          height: 100% !important;
        }

        /* 🔥 Prevent page break */
        .invoice-copy {
          page-break-inside: avoid !important;
        }

        gstin {
          display: none;
          width: 0px;
        }
      }
      `;

      return css;
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice Print</title>
          ${styles}
          <style>${getStyles()}</style>
        </head>
        <body class="light-mode">
          <div class="print-container">
            ${copies.map((copy, index) => {
              const copyHTML = modifiedInvoiceHTML.replace(
                '<p class="copy-label">Driver Copy</p>',
                `<p class="copy-label">${copy.label}</p>`
              );
              let copyClass = '';
              if (copy.label === 'CONSIGNOR COPY') copyClass = 'consignor-copy';
              else if (copy.label === 'CONSIGNEE COPY') copyClass = 'consignee-copy';
              else if (copy.label === 'DRIVER COPY') copyClass = 'driver-copy';
              return `
                <div class="invoice-copy ${copyClass}">
                  ${copyHTML}
                </div>
              `;
            }).join('')}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              setTimeout(() => {
                window.close();
              }, 100);
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Original handlePrint: shows copy labels, no print2 styles
  const handlePrint = () => handlePrintBase({ hideCopyLabels: false, usePrint2Styles: false });

  // Original handlePrint2: hides copy labels, uses print2 styles
  const handlePrint2 = () => handlePrintBase({ hideCopyLabels: true, usePrint2Styles: true });

  // Helper function to ensure exactly 3 rows in the table
  const ensureThreeRowsInTable = (html) => {
    // Create a temporary DOM element to parse and modify the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const tbodies = tempDiv.querySelectorAll('.invoice-table tbody');
    
    tbodies.forEach(tbody => {
      const allRows = Array.from(tbody.querySelectorAll('tr'));
      
      const motorFreightRow = allRows.find(tr => 
        tr.textContent.includes('Motor Freight')
      );
      const hammaliRow = allRows.find(tr => 
        tr.textContent.includes('Hammali')
      );
      const otherChargesRow = allRows.find(tr => 
        tr.textContent.includes('Other Charges')
      );
      const totalRow = allRows.find(tr => 
        tr.classList.contains('total-row')
      );
      
      // Find article rows
      const articleRows = allRows.filter(tr => 
        tr.classList.contains('article-row') &&
        !tr.textContent.includes('Motor Freight') &&
        !tr.textContent.includes('Hammali') &&
        !tr.textContent.includes('Other Charges') &&
        !tr.classList.contains('total-row')
      );
      
      const currentRowCount = articleRows.length;
      
      tbody.innerHTML = '';
      
      if (currentRowCount < 3) {
        // Add existing article rows with correct numbering
        articleRows.forEach((row, index) => {
          const newRow = row.cloneNode(true);
          const firstTd = newRow.querySelector('td:first-child');
          if (firstTd) {
            firstTd.textContent = index + 1;
          }
          tbody.appendChild(newRow);
        });
        
        // Add empty rows to make exactly 3
        for (let i = currentRowCount; i < 3; i++) {
          const emptyRow = document.createElement('tr');
          emptyRow.className = 'article-row';
          emptyRow.innerHTML = `
            <td>${i + 1}</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td style="display: none;"></td>
            <td style="display: none;"></td>
          `;
          tbody.appendChild(emptyRow);
        }
      } else {
        // Add first 3 article rows
        articleRows.slice(0, 3).forEach((row, index) => {
          const newRow = row.cloneNode(true);
          const firstTd = newRow.querySelector('td:first-child');
          if (firstTd) {
            firstTd.textContent = index + 1;
          }
          tbody.appendChild(newRow);
        });
      }
      
      // Add special rows after article rows
      if (motorFreightRow) tbody.appendChild(motorFreightRow.cloneNode(true));
      if (hammaliRow) tbody.appendChild(hammaliRow.cloneNode(true));
      if (otherChargesRow) tbody.appendChild(otherChargesRow.cloneNode(true));
      if (totalRow) tbody.appendChild(totalRow.cloneNode(true));
    });
    
    return tempDiv.innerHTML;
  };

  const calculateTotals = () => {
    const articleTotals = formData.articles.reduce(
      (acc, article) => {
        acc.noOfArticles += Number(article.noOfArticles) || 0;
        acc.weightChargeable += Number(article.weightChargeable) || 0;
        acc.actualWeight += Number(article.actualWeight) || 0;
        acc.to_pay += Number(article.to_pay) || 0;
        acc.paid += Number(article.paid) || 0;
        return acc;
      },
      { noOfArticles: 0, weightChargeable: 0, actualWeight: 0, to_pay: 0, paid: 0 }
    );

    const motorFreightValue = formData.motorFreight === "" ? 0 : Number(formData.motorFreight || 0);
    const hammaliValue = formData.hammali === "" ? 0 : Number(formData.hammali || 0);
    const otherChargesValue = formData.otherCharges === "" ? 0 : Number(formData.otherCharges || 0);

    const additionalCharges = motorFreightValue + hammaliValue + otherChargesValue;

    return {
      ...articleTotals,
      to_pay: formData.paymentType === "toPay" ? articleTotals.to_pay + additionalCharges : articleTotals.to_pay,
      paid: formData.paymentType === "paid" ? articleTotals.paid + additionalCharges : articleTotals.paid,
      additionalCharges: additionalCharges
    };
  };

  const handleAutoWriteClick = () => {
    if (!formData.consignor || !formData.consignee) {
      showAlert('Consignor and Consignee are required to auto-write invoice', 'warning');
      return;
    }
    setShowAutoWrite(true);
  };

  const handleAutoWriteData = (invoice) => {
    setShowAutoWrite(false);
    if (invoice) {
      showAlert(`Auto-filled invoice from GR No: ${invoice.gr_no}`, 'info');
      populateFormWithInvoice(invoice);
    } else {
      showAlert('No previous invoice found for this consignor/consignee pair', 'info');
    }
  };

  const handleAutoWriteError = (errorMsg) => {
    setShowAutoWrite(false);
    showAlert(`Error: ${errorMsg}`, 'error');
  };

  const populateFormWithInvoice = (invoice) => {
    // Build articles array from pipe‑separated strings
    const articles = [];
    for (let i = 0; i < invoice.article_length; i++) {
      articles.push({
        noIndex: i + 1,
        noOfArticles: invoice.article_no?.split('|')[i] || "",
        saidToContain: invoice.said_to_contain?.split('|')[i] || "",
        taxFree: invoice.tax_free?.split('|')[i] || "No",
        weightChargeable: invoice.weight_chargeable?.split('|')[i] || "",
        actualWeight: invoice.actual_weight?.split('|')[i] || "",
        hsn: invoice.hsn ? invoice.hsn.split('|')[i] || "" : "",
        to_pay: (invoice.paid == 0) ? invoice.amount?.split('|')[i] || "" : "",
        paid: (invoice.to_pay == 0) ? invoice.amount?.split('|')[i] || "" : "",
        remarks: invoice.remarks?.split('|')[i] || "",
      });
    }

    // Format date from database (YYYY-MM-DD)
    const dbDate = new Date(invoice.date);
    const formattedDate = [
      dbDate.getFullYear(),
      (dbDate.getMonth() + 1).toString().padStart(2, "0"),
      dbDate.getDate().toString().padStart(2, "0"),
    ].join("-");

    setFormData({
      invoiceNumber: "",               // new invoice, so clear previous number
      date: formattedDate,
      ewayBillNo: invoice.eway_bill_no || "",
      fromLocation: invoice.from_location || "Indore",
      consignor: invoice.consignor_name || "",
      consignorCode: invoice.consignor_code || "",
      consignorGst: invoice.consignor_gst || "",
      toLocation: invoice.to_location || "Raipur",
      consignee: invoice.consignee_name || "",
      consigneeCode: invoice.consignee_code || "",
      consigneeGst: invoice.consignee_gst || "",
      articles,
      paymentType: invoice.paid == 0 ? "toPay" : "paid",
      goodsType: invoice.goods_type || "",
      valueDeclared: invoice.value_declared || "",
      gstPaidBy: invoice.gst_will_be_paid_by || "Consignor",
      motorFreight: invoice.motor_freight || "",
      hammali: invoice.hammali || "",
      otherCharges: invoice.other_charges || "",
      driverName: invoice.driver_name,
      created_at: "",
      updated_at: "",
    });
  };

  const totals = calculateTotals();

  {isEditing ? (
    <CustomerSearchInput
      name="consignor"
      value={formData.consignor}
      onChange={handleChange}
      onSelect={(customer) => {
        let gstValue = customer.id_number;
        if (customer.id_type !== "GST Number") {
          gstValue = `URD - ${customer.id_number}`;
        }
        setFormData(prev => ({
          ...prev,
          consignor: customer.name,
          consignorCode: customer.customer_code,
          consignorGst: gstValue
        }));
      }}
      type="consignor"
      placeholder=""
      className="invoice-input customer-input fixed-input"
      isLightMode={isLightMode}
      showGstHighlight={false}
      onOpenCustomerPopup={setPopupCustomerType}
      suggestionDisplayField="id" 
    />
  ) : (
    <span className="fixed-value">{formData.consignor}</span>
  )}

  {isEditing ? (
    <CustomerSearchInput
      name="consignorGst"
      value={formData.consignorGst}
      onChange={handleChange}
      onSelect={(customer) => {
        let gstValue = customer.id_number;
        if (customer.id_type !== "GST Number") {
          gstValue = `URD - ${customer.id_number}`;
        }
        setFormData(prev => ({
          ...prev,
          consignor: customer.name,        // also fill name
          consignorCode: customer.customer_code,
          consignorGst: gstValue
        }));
      }}
      type="consignor"
      placeholder=""
      className="invoice-input customer-input fixed-input"
      isLightMode={isLightMode}
      showGstHighlight={true}
      onOpenCustomerPopup={setPopupCustomerType}
    />
  ) : (
    <span className="customer-GST-value">{formData.consignorGst || "—"}</span>
  )}

  const handleOpenCustomerPopup = (type) => {
    setPopupCustomerType(type);
    setShowCustomerPopup(true);
  };

  return (
    <div
      className={`invoice-generator-container ${
        isLightMode ? "light-mode" : "dark-mode"
      }`}
    >
      {/* Popup Alert */}
      <PopupAlert
        message={alert.message}
        type={alert.type}
        duration={5000}
        onClose={hideAlert}
        isLightMode={isLightMode}
        position="top-right"
      />

      {/* Confirm Alert */}
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

      {openPopUp && (
        <TransactionHistory
          isLightMode={isLightMode}
          consignorName={formData.consignor}
          consigneeName={formData.consignee}
          consignorGst={formData.consignorGst}
          consigeeGst={formData.consigneeGst}
          onClose={() => setOpenPopUp(false)}
        />
      )}

      {showAutoWrite && (
        <AutoWriteInvoice
          consignorGst={formData.consignorGst}
          consigeeGst={formData.consigneeGst}
          onData={handleAutoWriteData}
          onError={handleAutoWriteError}
          onLoading={setAutoWriteLoading}
        />
      )}

      {(activeTab === "view" ||
        activeTab === "update" ||
        activeTab === "delete") && (
        <>
          {!showInvoice ? (
            <div className={`invoice-search ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
              <div className="invoice-search-text">Search Invoice:</div>

              <form
                onSubmit={handleSearchInvoice}
                className={`invoice-search-form ${isLightMode ? 'light-mode' : 'dark-mode'}`}
              >
                <input
                  type="text"
                  placeholder="Enter GR. Number"
                  value={searchInvoiceNumber}
                  onChange={(e) => setSearchInvoiceNumber(e.target.value)}
                  required
                  className={`invoice-search-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                />

                <button
                  type="submit"
                  className={`invoice-search-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                >
                  <IoSearch className="invoice-search-icon" />
                </button>
              </form>
            </div>
          ) : (
            <div className="back-to-search-wrapper">
              <button
                onClick={() => {
                  setShowInvoice(false);
                  setSearchInvoiceNumber('');
                }}
                className={`back-to-search-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
              >
                🡰 Back to Search
              </button>
            </div>
          )}
        </>
      )}

      {/* Only show invoice if in add mode OR if invoice has been found in view/update/delete mode */}
      {(activeTab === "add" || (activeTab !== "add" && showInvoice)) && (
        <>
          {formData.created_at && (
            <div className="invoice-timestamps">
              <div>
                <strong>Challan Status:</strong>
                <span className={`pm-detail-value ${
                  formData.challan_status === 'NOT SHIPPED' ? 'pm-status-partial' : 'pm-status-paid'
                }`}> {formData.challan_status || "—"}</span>
              </div>
              <div>
                <strong>Payment Status:</strong> 
                <span className={`pm-detail-value ${
                  formData.payment_status === 'Paid' ? 'pm-status-paid' :
                  (formData.payment_status === 'Paid-D+' || formData.payment_status === 'Paid-D-') ? 'pm-status-partial' :
                  'pm-status-pending'
                }`}> {formData.payment_status || "—"}</span>
              </div>
            </div>
          )}

          <div className={`invoice-container ${isEditing ? "editable" : ""}`} id="print-area">
            <div className="invoice-header printTextWhite">
              <div className="company-name">NISHAD M.P. TRANSPORT (INDORE)</div>
              <div className="company-description">
                Clearing, Forwarding & Transport Agent
              </div>

              <div className="company-address">
                <div className="address-left">
                  <div>
                    <strong>H.O.:</strong> 180, Loha Mandi, Indore (M.P.) - 452001
                  </div>
                  <div>
                    <strong>Mobile No:</strong> 94250-82053, 94799-82057
                  </div>
                  <div>
                    <strong>Raipur Branch:</strong> 94253-15983, 97703-87681
                  </div>
                </div>
                <div>
                  <div className="gstin">
                    <strong>GSTIN:</strong> 23AACPT2351B1ZA
                  </div>
                  <div className="payment-type-selector">
                    {isEditing && (
                      <div className="form-group">
                        <label>
                          <strong>Payment Type: </strong>
                          <select
                            name="paymentType"
                            className={`payment-type-selector-dropDown ${SCROLLBAR_CLASS}`}
                            value={formData.paymentType}
                            onChange={handleChange}
                            disabled={isCheckingPayment}
                          >
                            <option value="toPay">TO PAY</option>
                            <option value="paid">PAID</option>
                          </select>
                          {/* {isCheckingPayment && <span>Checking...</span>} */}
                        </label>
                      </div>
                    )}
                  </div>
                </div>
                <div className="address-right">
                  <div className="form-group inline ShowDate">
                    <strong>Date:&nbsp;</strong>
                    {isEditing ? (
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        required
                        className="invoice-input"
                      />
                    ) : (
                      <span className="showDateCss printValueText textShiftUp2">{formData.date.split("-").reverse().join("-")}</span>
                    )}
                  </div>
                  <div className="form-group inline">
                    <strong>G.R. No.:&nbsp;</strong>
                    {activeTab === "add" && isEditing ? (
                      // In Add mode while editing, show input for GR number
                      <input
                        type="text"
                        placeholder="Auto Generate"
                        value={grNumberInput}
                        onChange={(e) => setGrNumberInput(e.target.value)}
                        className="invoice-input"
                        style={{ width: '100px' }}
                        readOnly={true} 
                      />
                    ) : (
                      <span className="GRNOCss printValueText">{formatGRForDisplay(formData.invoiceNumber) || "—"}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="consignment-details">
                <div className="consignment-from">
                  <div className="from-to">
                    <div className="form-group inline">
                      <strong>From:</strong>
                      {isEditing ? (
                        <select
                          name="fromLocation"
                          value={formData.fromLocation}
                          onChange={handleChange}
                          required
                          className={`invoice-input location-select ${SCROLLBAR_CLASS}`}
                          style={{ maxHeight: '200px' }}
                        >
                          {locationOptions.map((location) => (
                            <option key={location} value={location}>
                              {location}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="printValueText textShiftUp">{formData.fromLocation}</span>
                      )}
                    </div>
                    <div className="form-group inline">
                      <strong>To:</strong>
                      {isEditing ? (
                        <select
                          name="toLocation"
                          value={formData.toLocation}
                          onChange={handleChange}
                          required
                          className={`invoice-input location-select ${SCROLLBAR_CLASS}`}
                          style={{ maxHeight: '200px' }}
                        >
                          {locationOptions.map((location) => (
                            <option key={location} value={location}>
                              {location}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="toLocationCss printValueText textShiftUp2">{formData.toLocation}</span>
                      )}
                    </div>
                  </div>
                  <div className="consignment-from2 fixed-position">
                    {/* Consignor Name field */}
                    <div className={`form-group inline ${isEditing ? "" : "enter-names"} fixed-name-field`}>
                      <strong style={{marginRight: '2px'}} className="invoice-customerNames fixed-label">Consignor Name:</strong>
                      {isEditing ? (
                        <CustomerSearchInput
                          name="consignor"
                          value={formData.consignor}
                          onChange={handleChange}
                          onSelect={(customer) => {
                            let gstValue = customer.id_number;
                            if (customer.id_type !== "GST Number") {
                              gstValue = `URD - ${customer.id_number}`;
                            }
                            setFormData(prev => ({
                              ...prev,
                              consignor: customer.name,
                              consignorCode: customer.customer_code,
                              consignorGst: gstValue
                            }));
                          }}
                          type="consignor"
                          placeholder=""
                          className="invoice-input customer-input fixed-input"
                          isLightMode={isLightMode}
                          showGstHighlight={false}
                          onOpenCustomerPopup={handleOpenCustomerPopup}
                          suggestionDisplayField="id" 
                        />
                      ) : (
                        <span className="fixed-value printValueText textShiftUp">{formData.consignor}</span>
                      )}
                    </div>

                    {/* Consignor GST field */}
                    <div className="form-group inline customer-GST-Fields">
                      <strong style={{marginRight: "2px"}}>Consignor GST:</strong>
                      {isEditing ? (
                        <CustomerSearchInput
                          name="consignorGst" 
                          value={formData.consignorGst}
                          onChange={handleChange}
                          onSelect={(customer) => {
                            let gstValue = customer.id_number;
                            if (customer.id_type !== "GST Number") {
                              gstValue = `URD - ${customer.id_number}`;
                            }
                            setFormData(prev => ({
                              ...prev,
                              consignor: customer.name,
                              consignorCode: customer.customer_code,
                              consignorGst: gstValue
                            }));
                          }}
                          type="consignor"
                          placeholder=""
                          className="invoice-input customer-input fixed-input"
                          isLightMode={isLightMode}
                          showGstHighlight={true}
                          onOpenCustomerPopup={handleOpenCustomerPopup}
                        />
                      ) : (
                        <span className="customer-GST-value printValueText textShiftUp2">{formData.consignorGst || "—"}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="consignment-to">
                  <div className="consignment-from2 fixed-position">
                    {/* Consignee Name field */}
                    <div className={`form-group inline ${isEditing ? "" : "enter-names"} fixed-name-field`}>
                      <strong className="invoice-customerNames fixed-label">Consignee Name:</strong>
                      {isEditing ? (
                        <CustomerSearchInput
                          name="consignee"
                          value={formData.consignee}
                          onChange={handleChange}
                          onSelect={(customer) => {
                            let gstValue = customer.id_number;
                            if (customer.id_type !== "GST Number") {
                              gstValue = `URD - ${customer.id_number}`;
                            }
                            setFormData(prev => ({
                              ...prev,
                              consignee: customer.name,
                              consigneeCode: customer.customer_code,
                              consigneeGst: gstValue
                            }));
                          }}
                          type="consignee"
                          placeholder=""
                          className="invoice-input customer-input fixed-input"
                          isLightMode={isLightMode}
                          showGstHighlight={false}
                          onOpenCustomerPopup={handleOpenCustomerPopup}
                          suggestionDisplayField="id" 
                        />
                      ) : (
                        <span className="fixed-value printValueText textShiftUp">{formData.consignee}</span>
                      )}
                    </div>

                    {/* Consignee GST field */}
                    <div className="form-group inline customer-GST-Fields">
                      <strong style={{marginRight: "2px"}}>Consignee GST:</strong>
                      {isEditing ? (
                        <CustomerSearchInput
                          name="consigneeGst" 
                          value={formData.consigneeGst}
                          onChange={handleChange}
                          onSelect={(customer) => {
                            let gstValue = customer.id_number;
                            if (customer.id_type !== "GST Number") {
                              gstValue = `URD - ${customer.id_number}`;
                            }
                            setFormData(prev => ({
                              ...prev,
                              consignee: customer.name,
                              consigneeCode: customer.customer_code,
                              consigneeGst: gstValue
                            }));
                          }}
                          type="consignee"
                          placeholder=""
                          className="invoice-input customer-input fixed-input"
                          isLightMode={isLightMode}
                          showGstHighlight={true}
                          onOpenCustomerPopup={handleOpenCustomerPopup}
                        />
                      ) : (
                        <span className="customer-GST-value printValueText textShiftUp2">{formData.consigneeGst || "—"}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="invoice-table textShiftUp3">
              <table className="full-table">
                <thead>
                  <tr className="header-row printTextWhite">
                    <th>S. No.</th>
                    <th>No. of Articles</th>
                    <th>Said to Contain</th>
                    <th>HSN</th>
                    <th>Tax Free (Yes/No)</th>
                    <th>Wt. Charg (KG)</th>
                    <th>Actual Wt. (KG)</th>
                    <th className="namered">{formData.paymentType === "toPay" ? "TO PAY" : "PAID"}</th>
                    <th>Remarks</th>
                    {isEditing && formData.articles.length > 1 && <th>Action</th>}
                  </tr>
                </thead>
                <tbody className="printTextWhite">
                  {formData.articles.map((article, index) => (
                    <tr key={index} className="article-row printTextWhite printValueText">
                      <td className="textShiftLeft">{article.noIndex}</td>
                      <td className="textShiftLeft">
                        {isEditing ? (
                          <input
                            type="text"
                            name="noOfArticles"
                            value={article.noOfArticles}
                            onChange={(e) => handleArticleChange(index, e)}
                            required
                            className="invoice-input table-input center-input"
                          />
                        ) : (
                          article.noOfArticles || "—"
                        )}
                      </td>
                      <td className="textShiftLeft">
                        {isEditing ? (
                          <input
                            type="text"
                            name="saidToContain"
                            value={article.saidToContain}
                            onChange={(e) => handleArticleChange(index, e)}
                            required
                            className="invoice-input table-input center-input"
                          />
                        ) : (
                          article.saidToContain || "—"
                        )}
                      </td>
                      <td className="textShiftLeft">
                        {isEditing ? (
                          <input
                            type="text"
                            name="hsn"
                            value={article.hsn}
                            onChange={(e) => handleArticleChange(index, e)}
                            className="invoice-input table-input center-input"
                          />
                        ) : (
                          article.hsn || "—"
                        )}
                      </td>
                      <td className="textShiftLeft">
                        {isEditing ? (
                          <select
                            name="taxFree"
                            value={article.taxFree}
                            onChange={(e) => handleArticleChange(index, e)}
                            className={`invoice-input center-input ${SCROLLBAR_CLASS}`}
                          >
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </select>
                        ) : (
                          article.taxFree || "—"
                        )}
                      </td>
                      <td className="textShiftLeft">
                        {isEditing ? (
                          <input
                            type="text"
                            name="weightChargeable"
                            value={article.weightChargeable}
                            onChange={(e) => handleArticleChange(index, e)}
                            className="invoice-input table-input center-input"
                          />
                        ) : (
                          formatNumericValue(article.weightChargeable)
                        )}
                      </td>
                      <td className="textShiftLeft">
                        {isEditing ? (
                          <input
                            type="text"
                            name="actualWeight"
                            value={article.actualWeight}
                            onChange={(e) => handleArticleChange(index, e)}
                            className="invoice-input table-input center-input"
                          />
                        ) : (
                          formatNumericValue(article.actualWeight)
                        )}
                      </td>   
                      {formData.paymentType === "toPay" ? (
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              name="to_pay"
                              value={article.to_pay}
                              onChange={(e) => handleArticleChange(index, e)}
                              className="invoice-input table-input center-input"
                            />
                          ) : (
                            formatNumericValue(article.to_pay)
                          )}
                        </td>
                      ) : (
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              name="paid"
                              value={article.paid}
                              onChange={(e) => handleArticleChange(index, e)}
                              className="invoice-input table-input center-input"
                            />
                          ) : (
                            formatNumericValue(article.paid)
                          )}
                        </td>
                      )}
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            name="remarks"
                            value={article.remarks}
                            onChange={(e) => handleArticleChange(index, e)}
                            className="invoice-input table-input center-input"
                          />
                        ) : (
                          article.remarks || "—"
                        )}
                      </td>
                      {isEditing && formData.articles.length > 1 && (
                        <td className="action-cell">
                          <button
                            type="button"
                            onClick={() => removeArticle(index)}
                            className={`remove-btn ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                            title="Remove article"
                          >
                            <FaTrashCan />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr>
                    <td><b className="MFHOCText">Motor Freight</b></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          name="motorFreight"
                          value={formData.motorFreight}
                          onChange={handleChange}
                          className="invoice-input table-input center-input"
                        />
                      ) : (
                        <div className="printValueText">{`${formatNumericValue(formData.motorFreight === "" ? "0" : formData.motorFreight)}`}</div>
                      )}
                    </td>
                    <td></td>
                    {isEditing && formData.articles.length > 1 && (
                      <td></td>
                    )}
                  </tr>
                  <tr>
                    <td><b className="MFHOCText">Hammali</b></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          name="hammali"
                          value={formData.hammali}
                          onChange={handleChange}
                          className="invoice-input table-input center-input"
                        />
                      ) : (
                        <div className="printValueText">{`${formatNumericValue(formData.hammali === "" ? "0" : formData.hammali)}`}</div>
                      )}
                    </td>
                    <td></td>
                    {isEditing && formData.articles.length > 1 && (
                      <td></td>
                    )}
                  </tr>
                  <tr>
                    <td><b className="MFHOCText">Other Charges</b></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          name="otherCharges"
                          value={formData.otherCharges}
                          onChange={handleChange}
                          className="invoice-input table-input center-input"
                        />
                      ) : (
                        <div className="printValueText">{`${formatNumericValue(formData.otherCharges === "" ? "0" : formData.otherCharges)}`}</div>
                      )}
                    </td>
                    <td></td>
                    {isEditing && formData.articles.length > 1 && (
                      <td></td>
                    )}
                  </tr>
                  <tr className="total-row printTextWhite">
                    <td>Total</td>
                    <td><p className="printValueText textShiftLeft">{totals.noOfArticles}</p></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td><p className="printValueText textShiftLeft">{formatNumericValue(totals.weightChargeable)}</p></td>
                    <td><p className="printValueText">{formatNumericValue(totals.actualWeight)}</p></td>
                    <td>
                      <p className="printValueText">
                        {formData.paymentType === "toPay" 
                          ? formatNumericValue(totals.to_pay)
                          : formatNumericValue(totals.paid)
                        }
                      </p>
                    </td>
                    <td></td>
                    {isEditing && formData.articles.length > 1 && <td></td>}
                  </tr>
                </tbody>
              </table>
              {isEditing && (
                <button type="button" onClick={addArticle} className="add-btn">
                  Add Article
                </button>
              )}
            </div>

            <div className="invoice-footer printTextWhite textShiftUp3">
              <div className="footer-left">
                <div className="goods-type-row">
                  <div className={`form-group inline ${!isEditing ? 'GoodsTypeCSS' : ''}`}>
                    <strong>Goods Type:</strong>
                    {isEditing ? (
                      <input
                        type="text"
                        name="goodsType"
                        value={formData.goodsType}
                        onChange={handleChange}
                        className="invoice-input"
                      />
                    ) : (
                      <span className="goodsTypeCss printValueText textShiftDown goodsTypePrCss">{formData.goodsType || formData.articles[0].saidToContain}</span>
                    )}
                  </div>
                  <div className="form-group inline">
                    <strong>Value Declared:</strong>
                    {isEditing ? (
                      <input
                        type="text"
                        name="valueDeclared"
                        value={formData.valueDeclared}
                        onChange={handleChange}
                        className="invoice-input"
                      />
                    ) : (
                      <span className="valueDeclaredcss printValueText textShiftDown">
                        {formatNumericValue(formData.valueDeclared)}
                      </span>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="spaceForSign"></div>
                  )}
                </div>
                <div className="footer-below">
                  <p>
                    <strong>
                      Subject to Indore Jurisdiction || AT OWNER'S RISK
                    </strong>
                  </p>
                  <div className="form-group inline">
                    <strong>GST Will be Paid By:</strong>
                    {isEditing ? (
                      <select
                        name="gstPaidBy"
                        value={formData.gstPaidBy}
                        onChange={handleChange}
                        className={`invoice-input ${SCROLLBAR_CLASS}`}
                      >
                        <option value="Consignor">Consignor</option>
                        <option value="Consignee">Consignee</option>
                      </select>
                    ) : (
                      <span className="gstWillBePaidBy printValueText textShiftDown">{formData.gstPaidBy || "—"}</span>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="footer-right">
                      <p className="copy-label">Driver Copy</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="invoice-actions">
            {isEditing && (
              <button className="invoice-history-button" onClick={() => setOpenPopUp(true)}>
                View Transaction History
              </button>
            )}
            {isEditing ? (
              activeTab === "add" ? (
                <div>
                  <button
                    type="button"
                    onClick={handleGenerateInvoice}
                    className="generate-btn"
                    disabled={isVerifying}
                  >
                    {isVerifying ? "Verifying..." : "Generate Invoice"}
                  </button>
                  <button
                    type="button"
                    onClick={handleAutoWriteClick}
                    className="auto-write-btn"
                    disabled={autoWriteLoading}
                  >
                    Auto Fill Invoice
                  </button>
                </div>
              ) : activeTab === "update" ? (
                <>
                  <button onClick={handleUpdateInvoice} className="generate-btn update-btn">
                    Update Invoice
                  </button>
                  <button onClick={resetForm2} className="cancel-btn">
                    Cancel
                  </button>
                </>
              ) : null
            ) : (
              <div className="invoice-actions no-print">
                {activeTab === "add" && !isSubmitted && (
                  <button onClick={resetForm} className="edit-btn">
                    Edit
                  </button>
                )}
                {activeTab === "add" && isSubmitted && (
                  <button onClick={resetForm2} className="edit-btn" style={{marginTop: '-9px', marginRight: '3px'}}>
                    Create New
                  </button>
                )}
                {activeTab === "add" && !isSubmitted && (
                  <button onClick={handleSubmitToServer} className="submit-btn">
                    Submit
                  </button>
                )}
                {(activeTab === "add" || activeTab === "view") && isSubmitted && (
                  <div style={{marginTop: '-12px'}}>
                    <button onClick={handlePrint2} className="print-btn">
                      Print
                    </button>
                    <button onClick={handlePrint} className="generate-btn" style={{margin: '3px'}}>
                      Download
                    </button>
                  </div>
                )}
                {activeTab === "delete" && (
                  <>
                    <button onClick={handleDeleteInvoice} className="delete-btn">
                      Delete Invoice
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("add");
                        setShowInvoice(false);
                      }}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {showCustomerPopup && (
        <div onClick={() => setShowCustomerPopup(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <CustomerManagement 
              isLightMode={isLightMode} 
              isPopup={true} 
              onClose={() => setShowCustomerPopup(false)}
              onCustomerAdded={handleCustomerAdded}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceGenerator;
