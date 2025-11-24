import React, { useState, useEffect, useRef } from "react";
import { FaTrashCan } from "react-icons/fa6";
import { IoSearch } from "react-icons/io5";
import { TfiWrite } from "react-icons/tfi";
import "./InvoiceGenerator.css";
import TransactionHistory from '../TransactionHistory/TransactionHistory';
import AutoWriteTable from '../TransactionHistory/TransactionHistory2';
// import CustomerManagement from "../CustomerManagement/CustomerManagement";
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
    otherCharges: "",
    created_at: "",
    updated_at: "",
  });

  const [isEditing, setIsEditing] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState(modeOfView);
  const [searchInvoiceNumber, setSearchInvoiceNumber] = useState("");
  const [allCustomerNames, setAllCustomerNames] = useState([]);
  const [allCustomersWithCodes, setAllCustomersWithCodes] = useState([]);
  const [consignorSuggestions, setConsignorSuggestions] = useState([]);
  const [consigneeSuggestions, setConsigneeSuggestions] = useState([]);
  const [showConsignorSuggestions, setShowConsignorSuggestions] = useState(false);
  const [showConsigneeSuggestions, setShowConsigneeSuggestions] = useState(false);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [shippingStatus, setShippingStatus] = useState(null);
  const [showCustomerPopup, setShowCustomerPopup] = useState(false);
  const [popupCustomerType, setPopupCustomerType] = useState('');
  const [transactionResult, setTransactionResult] = useState(null);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [paymentTypeDifferent, setPaymentTypeDifferent] = useState(false);
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isFillingArticle, setIsFillingArticle] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: 'info', show: false });
  const [confirmAlert, setConfirmAlert] = useState({ message: '', show: false, onConfirm: null });
  const [showInvoice, setShowInvoice] = useState(false);
  const consignorDebounceRef = useRef(null);
  const consigneeDebounceRef = useRef(null);

  const locationOptions = [
    "Ambikapur", "Bhilai", "Bilaspur", "Champa", "Cuttack", "Dantewada", 
    "Dhamtari", "Durg", "Indore", "Jagdalpur", "Janjgir", "Kanker", "Kawardha", 
    "Korba", "Koriya", "Mahasamud", "Manendragarh", "Naila", "Narayanpur", 
    "Pathalgaon", "Raigarh", "Raipur", "Rajnandgaon", "Rewa", "Satna", 
    "Surguja"
  ];

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        const response = await fetch(
          "http://localhost:3000/api/customers/all"
        );
        const data = await response.json();
        setAllCustomersWithCodes(data);
        setAllCustomerNames(data.map(customer => customer.name));
      } catch (err) {
        console.error("Failed to fetch customer data:", err);
      }
    };
    fetchCustomerData();
  }, []);

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
    if (!formData.consignor || !formData.consignee) return;
    
    setIsCheckingPayment(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/transport-records/history?consignor=${encodeURIComponent(formData.consignor)}&consignee=${encodeURIComponent(formData.consignee)}`
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

  const fillArticleFromHistory = async (articleIndex) => {
    const article = formData.articles[articleIndex];
    if (!article.hsn) {
      showAlert("Please enter 'HSN' value first", 'warning');
      return;
    }

    if (!article.noOfArticles) {
      showAlert("Please enter 'No. of Articles' value first", 'warning');
      return;
    }

    setIsFillingArticle(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/transport-records/history?consignor=${encodeURIComponent(formData.consignor)}&consignee=${encodeURIComponent(formData.consignee)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        let foundRecord = null;
        let foundIndex = -1;
        
        for (const record of data) {
          if (record.hsn) {
            const hsns = record.hsn.split('|');
            const index = hsns.findIndex(item => item === article.hsn);
            if (index !== -1) {
              foundRecord = record;
              foundIndex = index;
              break;
            }
          }
        }
        
        if (foundRecord && foundIndex !== -1) {
          const articleNos = foundRecord.article_no?.split('|') || [];
          const taxFrees = foundRecord.tax_free?.split('|') || [];
          const weightChargeables = foundRecord.weight_chargeable?.split('|') || [];
          const actualWeights = foundRecord.actual_weight?.split('|') || [];
          const hsns = foundRecord.hsn?.split('|') || [];
          const amounts = foundRecord.amount?.split('|') || [];
          const remarksList = foundRecord.remarks?.split('|') || [];
          const saidToContains = foundRecord.said_to_contain?.split('|') || [];
          
          const fetchedNoOfArticles = articleNos[foundIndex] ? parseInt(articleNos[foundIndex]) : 1;
          const currentNoOfArticles = parseInt(article.noOfArticles) || 1;
          
          const fetchedAmount = amounts[foundIndex] ? parseFloat(amounts[foundIndex]) : 0;
          const fetchedWeightChargeable = weightChargeables[foundIndex] ? parseFloat(weightChargeables[foundIndex]) : 0;
          const fetchedActualWeight = actualWeights[foundIndex] ? parseFloat(actualWeights[foundIndex]) : 0;
          
          const calculatedAmount = (fetchedAmount / fetchedNoOfArticles) * currentNoOfArticles;
          const calculatedWeightChargeable = (fetchedWeightChargeable / fetchedNoOfArticles) * currentNoOfArticles;
          const calculatedActualWeight = (fetchedActualWeight / fetchedNoOfArticles) * currentNoOfArticles;
          
          const updatedArticles = [...formData.articles];
          updatedArticles[articleIndex] = {
            ...updatedArticles[articleIndex],
            saidToContain: saidToContains[foundIndex] || updatedArticles[articleIndex].saidToContain,
            taxFree: taxFrees[foundIndex] || updatedArticles[articleIndex].taxFree,
            weightChargeable: calculatedWeightChargeable.toString() || updatedArticles[articleIndex].weightChargeable,
            actualWeight: calculatedActualWeight.toString() || updatedArticles[articleIndex].actualWeight,
            hsn: hsns[foundIndex] || updatedArticles[articleIndex].hsn,
            to_pay: formData.paymentType === "toPay" ? (calculatedAmount.toString() || updatedArticles[articleIndex].to_pay) : updatedArticles[articleIndex].to_pay,
            paid: formData.paymentType === "paid" ? (calculatedAmount.toString() || updatedArticles[articleIndex].paid) : updatedArticles[articleIndex].paid,
            remarks: remarksList[foundIndex] || updatedArticles[articleIndex].remarks,
          };
          
          setFormData(prev => ({ ...prev, articles: updatedArticles }));
        } else {
          showAlert("No matching records found for this HSN value", 'error');
        }
      } else {
        showAlert("No transaction history found between these parties", 'error');
      }
    } catch (err) {
      console.error('Error filling article:', err);
      showAlert("Error fetching historical data", 'error');
    } finally {
      setIsFillingArticle(false);
    }
  };

  const handleConsignorSearch = (value) => {
    if (value.length > 0) {
      const filtered = allCustomersWithCodes.filter((customer) =>
        customer.name.toLowerCase().startsWith(value.toLowerCase())
      );
      setConsignorSuggestions(filtered);
      setShowConsignorSuggestions(true);
    } else {
      setConsignorSuggestions([]);
      setShowConsignorSuggestions(false);
    }
  };

  const handleConsigneeSearch = (value) => {
    if (value.length > 0) {
      const filtered = allCustomersWithCodes.filter((customer) =>
        customer.name.toLowerCase().startsWith(value.toLowerCase())
      );
      setConsigneeSuggestions(filtered);
      setShowConsigneeSuggestions(true);
    } else {
      setConsigneeSuggestions([]);
      setShowConsigneeSuggestions(false);
    }
  };

  const handleConsignorSuggestionClick = (customer) => {
    let gstNumber = "UIN";
    if (customer.id_details && customer.id_details.length > 0) {
      const gstDetail = customer.id_details.find(detail => 
        detail.id_type === "GST Number"
      );
      if (gstDetail) {
        gstNumber = gstDetail.id_number;
      }
    }

    setFormData((prev) => ({ 
      ...prev, 
      consignor: customer.name,
      consignorCode: customer.customer_code,
      consignorGst: gstNumber
    }));
    setShowConsignorSuggestions(false);
  };

  const handleConsigneeSuggestionClick = (customer) => {
    let gstNumber = "UIN";
    if (customer.id_details && customer.id_details.length > 0) {
      const gstDetail = customer.id_details.find(detail => 
        detail.id_type === "GST Number"
      );
      if (gstDetail) {
        gstNumber = gstDetail.id_number;
      }
    }

    setFormData((prev) => ({ 
      ...prev, 
      consignee: customer.name,
      consigneeCode: customer.customer_code,
      consigneeGst: gstNumber
    }));
    setShowConsigneeSuggestions(false);
  };

  const verifyConsignorConsignee = async () => {
    setIsVerifying(true);
    setErrorMessage("");
    try {
      const consignorRes = await fetch(
        `http://localhost:3000/api/customers?name=${encodeURIComponent(
          formData.consignor
        )}`
      );
      const consignorData = await consignorRes.json();

      if (!consignorData.customer_code) {
        showAlert("Consignor not found in database", 'error');
        return false;
      }

      const consigneeRes = await fetch(
        `http://localhost:3000/api/customers?name=${encodeURIComponent(
          formData.consignee
        )}`
      );
      const consigneeData = await consigneeRes.json();

      if (!consigneeData.customer_code) {
        showAlert("Consignee not found in database", 'error');
        return false;
      }

      let consignorGst = "UIN";
      let consigneeGst = "UIN";
      
      if (consignorData.id_details && consignorData.id_details.length > 0) {
        const gstDetail = consignorData.id_details.find(detail => 
          detail.id_type === "GST Number"
        );
        if (gstDetail) {
          consignorGst = gstDetail.id_number;
        }
      }
      
      if (consigneeData.id_details && consigneeData.id_details.length > 0) {
        const gstDetail = consigneeData.id_details.find(detail => 
          detail.id_type === "GST Number"
        );
        if (gstDetail) {
          consigneeGst = gstDetail.id_number;
        }
      }

      setFormData((prev) => ({
        ...prev,
        consignorCode: consignorData.customer_code,
        consignorGst: consignorGst,
        consigneeCode: consigneeData.customer_code,
        consigneeGst: consigneeGst,
      }));

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

      const response = await fetch(
        "http://localhost:3000/api/transport-records",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
            hsn: articlesWithHSN.map((a) => a.hsn || "9999").join("|"),
            to_pay: articlesWithHSN.map((a) => a.to_pay).join("|"),
            paid: articlesWithHSN.map((a) => a.paid).join("|"),
            remarks: articlesWithHSN.map((a) => a.remarks).join("|"),
            paymentType: formData.paymentType === "toPay" ? "TO PAY" : "PAID",
            goodsType: formData.goodsType,
            valueDeclared: formData.valueDeclared,
            gstWillBePaidBy: formData.gstPaidBy,
            motorFreight: motorFreightValue,
            hammali: hammaliValue,
            otherCharges: otherChargesValue
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save invoice");
      } else {
        showAlert("Transport record saved successfully", 'success');
      }

      // Save to status database with challan_status 'Book' and payment_status 'Pending'
      if (response.ok) {
        try {
          const statusResponse = await fetch(
            "http://localhost:3000/api/status",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gr_no: data.grNo,
                challan_status: "Book",
                payment_status: "Pending"
              }),
            }
          );

          const statusData = await statusResponse.json();
          
          if (!statusResponse.ok) {
            console.warn("Failed to save status:", statusData.error);
          }
        } catch (statusErr) {
          console.warn("Error saving status:", statusErr.message);
        }
      }

      setFormData((prev) => ({
        ...prev,
        invoiceNumber: data.grNo,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }));
      setIsSubmitted(true);
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
      otherCharges: "",
      created_at: "",
      updated_at: "",
    });
    setIsEditing(true);
    setIsSubmitted(false);
    setErrorMessage("");
    setShowInvoice(false);
  };

  const fetchInvoice = async (invoiceNumber) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/transport-records?grNo=${invoiceNumber}`
      );
      const data = await response.json();

      if (!response.ok) {
        showAlert(data.error || "Invoice not found", 'error');
        return;
      }

      // Fetch status data
      try {
        const statusResponse = await fetch(
          `http://localhost:3000/api/status?gr_no=${invoiceNumber}`
        );
        const statusData = await statusResponse.json();
        
        if (statusResponse.ok) {
          setShippingStatus(statusData);
        } else {
          setShippingStatus(null);
        }
      } catch (statusErr) {
        console.warn("Error fetching status:", statusErr.message);
        setShippingStatus(null);
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
          remarks: data.remarks.split("|")[i] || "",
        });
      }

      const dbDate = new Date(data.date);
      const formattedDate = [
        dbDate.getDate().toString().padStart(2, "0"),
        (dbDate.getMonth() + 1).toString().padStart(2, "0"),
        dbDate.getFullYear(),
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
        valueDeclared: data.value_declared,
        gstPaidBy: data.gst_will_be_paid_by,
        motorFreight: data.motor_freight || "",
        hammali: data.hammali || "",
        otherCharges: data.other_charges || "",
        driverName: data.driver_name,
        created_at: data.created_at,
        updated_at: data.updated_at,
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
      input = "GR" + numPart.padStart(5, "0");
    } else {
      let numPart = input.replace(/^0+/, '');
      if (numPart === '') numPart = '0';
      input = "GR" + numPart.padStart(5, "0");
    }

    fetchInvoice(input);
  };

  const handleUpdateInvoice = async () => {
    try {
      setIsVerifying(true);
      setErrorMessage("");

      const consignorRes = await fetch(
        `http://localhost:3000/api/customers?name=${encodeURIComponent(
          formData.consignor
        )}`
      );
      const consignorData = await consignorRes.json();

      if (!consignorData.customer_code) {
        showAlert("Consignor not found in database", 'error');
        setIsVerifying(false);
        return;
      }

      const consigneeRes = await fetch(
        `http://localhost:3000/api/customers?name=${encodeURIComponent(
          formData.consignee
        )}`
      );
      const consigneeData = await consigneeRes.json();

      if (!consigneeData.customer_code) {
        showAlert("Consignee not found in database", 'error');
        setIsVerifying(false);
        return;
      }

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
        consignorCode: consignorData.customer_code,
        consignorGst: consignorData.gstin,
        toLocation: formData.toLocation,
        consignee: formData.consignee,
        consigneeCode: consigneeData.customer_code,
        consigneeGst: consigneeData.gstin,
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

      console.log(updatedData);

      const response = await fetch(
        `http://localhost:3000/api/transport-records/${formData.invoiceNumber}`,
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
      }));

      showAlert("Transport record updated successfully", 'success');
    } catch (err) {
      console.error("Update error:", err);
      setErrorMessage(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeleteInvoice = async () => {
    showConfirm("Are you sure you want to delete this invoice?", async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/transport-records/${formData.invoiceNumber}`,
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

const handlePrint = (pageSize = 'A4') => {
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

  // Check payment type from formData
  const isPaidType = formData.paymentType === "paid";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice Print</title>
        ${styles}
        <style>
          @page {
            size: A4;
            margin: 7mm;
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

          .company-description {
            font-size: 10px !important;
            margin-bottom: 3px !important;
          }

          .company-address {
            font-size: 10px !important;
          }

          .consignment-details {
            font-size: 10px !important;
            margin-bottom: 5px !important;
          }

          .form-group.inline {
            margin-bottom: 1px !important;
          }

          .invoice-table {
            margin-bottom: 3px !important;
          }

          .invoice-table table {
            width: 100% !important;
            table-layout: fixed !important;
          }

          .invoice-table th,
          .invoice-table td {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            font-size: 9px !important;
            padding: 2px 3px !important;
            line-height: 1.1 !important;
          }

          .invoice-table th {
            font-size: 9px !important;
            padding: 3px !important;
          }

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

          @media print {
            body {
              margin: 0 !important;
              padding: 7mm !important;
              width: 210mm;
              height: 297mm;
              box-sizing: border-box;
            }

            .print-container {
              width: 196mm;
              height: 283mm;
              display: flex;
              flex-direction: column;
              gap: 3mm;
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
              .driver-copy .invoice-table td:nth-child(8) {
                visibility: hidden !important;
              }
            ` : ''}
          }
        </style>
      </head>
      <body class="light-mode">
        <div class="print-container">
          ${copies.map((copy, index) => {
            // Replace the copy label in footer area
            const copyHTML = modifiedInvoiceHTML.replace(
              '<p class="copy-label">Driver Copy</p>',
              `<p class="copy-label">${copy.label}</p>`
            );
            
            // Add driver-copy class only for driver copy
            const copyClass = copy.label === 'DRIVER COPY' ? 'driver-copy' : '';
            
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

  const handleHistoryButtonClick = (articleIndex) => {
    setCurrentArticleIndex(articleIndex);
    fillArticleFromHistory(articleIndex);
  };

  const handleHistoryTransactionComplete = (result) => {
    setTransactionResult(result);
    setShowTransactionHistory(false);
    console.log(transactionResult);
  };

  const totals = calculateTotals();

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
        onClose={() => setOpenPopUp(false)}
      />
    )}

    {(activeTab === "view" ||
      activeTab === "update" ||
      activeTab === "delete") && (
      <div className={`invoice-search ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
        <form onSubmit={handleSearchInvoice} className={`invoice-search-form ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
          <input
            type="text"
            placeholder="Enter Invoice Number"
            value={searchInvoiceNumber}
            onChange={(e) => setSearchInvoiceNumber(e.target.value)}
            required
            className={`invoice-search-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
          />
          <button 
            type="submit" 
            className={`invoice-search-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
          >
            <IoSearch className={`invoice-search-icon ${isLightMode ? 'light-mode' : 'dark-mode'}`}/>
          </button>
        </form>
      </div>
    )}

    {/* Only show invoice if in add mode OR if invoice has been found in view/update/delete mode */}
    {(activeTab === "add" || (activeTab !== "add" && showInvoice)) && (
      <>
        {formData.created_at && (
          <div className="invoice-timestamps">
            <div>
              Created At: {new Date(formData.created_at).toLocaleString()}
              {shippingStatus && (
                <div className="status-info">
                  <strong>Challan Status:</strong> {shippingStatus.challan_status || "—"}
                </div>
              )}
            </div>
            <div>
              {formData.updated_at && (
                <>
                  Updated At: {new Date(formData.updated_at).toLocaleString()}
                  {shippingStatus && (
                    <div className="status-info">
                      <strong>Payment Status:</strong> {shippingStatus.payment_status || "—"}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className={`invoice-container ${isEditing ? "editable" : ""}`} id="print-area">
          <div className="invoice-header">
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
                        {isCheckingPayment && <span>Checking...</span>}
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
                    <span>{formData.date}</span>
                  )}
                </div>
                <div className="form-group inline">
                  <strong>G.R. No.:&nbsp;</strong>
                  <span>{formatGRForDisplay(formData.invoiceNumber) || "—"}</span>
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
                      <span>{formData.fromLocation}</span>
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
                      <span>{formData.toLocation}</span>
                    )}
                  </div>
                </div>
                <div className="consignment-from2 fixed-position">
                  <div className="form-group inline">
                    <strong>Consignor GST:</strong>
                    {formData.consignorGst ? (
                      <span style={{ width: "113px" }}>
                        {formData.consignorGst}
                      </span>
                    ) : (
                      <span>{"—"}</span>
                    )}
                  </div>
                  <div className={`form-group inline ${isEditing ? "" : "enter-names"} fixed-name-field`}>
                    <strong className="invoice-customerNames fixed-label">Consignor Name:</strong>
                    {isEditing ? (
                      <div
                        className="search-container fixed-input-container"
                        style={{ display: "inline-block", position: "relative" }}
                      >
                        <input
                          type="text"
                          name="consignor"
                          value={formData.consignor}
                          onChange={(e) => {
                            handleChange(e);
                            handleConsignorSearch(e.target.value);
                          }}
                          onFocus={() =>
                            formData.consignor &&
                            handleConsignorSearch(formData.consignor)
                          }
                          onBlur={() =>
                            setTimeout(
                              () => setShowConsignorSuggestions(false),
                              200
                            )
                          }
                          required
                          className="invoice-input customer-input fixed-input"
                        />
                        {showConsignorSuggestions && (
                          <ul
                            className={`suggestions-list customer-suggestions ${SCROLLBAR_CLASS}`}
                            style={{ 
                              minWidth: "400px",
                              width: "max-content",
                              maxWidth: "500px",
                              whiteSpace: "nowrap",
                              maxHeight: "200px",
                              overflowY: "auto"
                            }}
                          >
                            {consignorSuggestions.length > 0 ? (
                              consignorSuggestions.map((customer, index) => {
                                const lowerInput = formData.consignor.toLowerCase();
                                const lowerSuggestion = customer.name.toLowerCase();
                                const prefixIndex = lowerSuggestion.indexOf(lowerInput);
                                const prefix = customer.name.substring(
                                  0,
                                  prefixIndex + formData.consignor.length
                                );
                                const rest = customer.name.substring(
                                  prefixIndex + formData.consignor.length
                                );

                                return (
                                  <li
                                    key={index}
                                    className="suggestion-item customer-suggestion-item"
                                    onClick={() => handleConsignorSuggestionClick(customer)}
                                  >
                                    <span className="suggestion-prefix">
                                      {prefix}
                                    </span>
                                    <span className="suggestion-rest">
                                      {rest}
                                    </span>
                                    <span className="customer-code">
                                      - {customer.customer_code}
                                    </span>
                                  </li>
                                );
                              })
                            ) : (
                              <div className="no-suggestions">
                                No matching customers found.
                                <button 
                                  className="add-customer-btn"
                                  onClick={() => {
                                    setPopupCustomerType('consignor');
                                    setShowCustomerPopup(true);
                                  }}
                                >
                                  Add New Customer
                                </button>
                              </div>
                            )}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <span className="fixed-value">{formData.consignor}</span>
                    )}
                  </div>
                  <div className="form-group inline">
                    <strong>Consignor Code:</strong>
                    <span>{formData.consignorCode || "—"}</span>
                  </div>
                </div>
              </div>
              <div className="consignment-to">
                <div className="consignment-from2 fixed-position">
                  <div className="form-group inline">
                    <strong>Consignee GST:</strong>
                    {formData.consigneeGst ? (
                      <span style={{ width: "113px" }}>
                        {formData.consigneeGst}
                      </span>
                    ) : (
                      <span>{"—"}</span>
                    )}
                  </div>
                  <div className={`form-group inline ${isEditing ? "" : "enter-names"} fixed-name-field`}>
                    <strong className="invoice-customerNames fixed-label">Consignee Name:</strong>
                    {isEditing ? (
                      <div
                        className="search-container fixed-input-container"
                        style={{ display: "inline-block", position: "relative" }}
                      >
                        <input
                          type="text"
                          name="consignee"
                          value={formData.consignee}
                          onChange={(e) => {
                            handleChange(e);
                            handleConsigneeSearch(e.target.value);
                          }}
                          onFocus={() =>
                            formData.consignee &&
                            handleConsigneeSearch(formData.consignee)
                          }
                          onBlur={() =>
                            setTimeout(
                              () => setShowConsigneeSuggestions(false),
                              200
                            )
                          }
                          required
                          className="invoice-input customer-input fixed-input"
                        />
                        {showConsigneeSuggestions && (
                          <ul
                            className={`suggestions-list customer-suggestions ${SCROLLBAR_CLASS}`}
                            style={{ 
                              minWidth: "400px",
                              width: "max-content",
                              maxWidth: "500px",
                              whiteSpace: "nowrap",
                              maxHeight: "200px",
                              overflowY: "auto"
                            }}
                          >
                            {consigneeSuggestions.length > 0 ? (
                              consigneeSuggestions.map((customer, index) => {
                                const lowerInput = formData.consignee.toLowerCase();
                                const lowerSuggestion = customer.name.toLowerCase();
                                const prefixIndex = lowerSuggestion.indexOf(lowerInput);
                                const prefix = customer.name.substring(
                                  0,
                                  prefixIndex + formData.consignee.length
                                );
                                const rest = customer.name.substring(
                                  prefixIndex + formData.consignee.length
                                );

                                return (
                                  <li
                                    key={index}
                                    className="suggestion-item customer-suggestion-item"
                                    onClick={() => handleConsigneeSuggestionClick(customer)}
                                  >
                                    <span className="suggestion-prefix">
                                      {prefix}
                                    </span>
                                    <span className="suggestion-rest">
                                      {rest}
                                    </span>
                                    <span className="customer-code">
                                      - {customer.customer_code}
                                    </span>
                                  </li>
                                );
                              })
                            ) : (
                              <div className="no-suggestions">
                                No matching customers found.
                                <button 
                                  className="add-customer-btn"
                                  onClick={() => {
                                    setPopupCustomerType('consignee');
                                    setShowCustomerPopup(true);
                                  }}
                                >
                                  Add New Customer
                                </button>
                              </div>
                            )}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <span className="fixed-value">{formData.consignee}</span>
                    )}
                  </div>
                  <div className="form-group inline">
                    <strong>Consignee Code:</strong>
                    <span>{formData.consigneeCode || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="invoice-table">
            <table className="full-table">
              <thead>
                <tr className="header-row">
                  <th>S. No.</th>
                  <th>No. of Articles</th>
                  <th>Said to Contain</th>
                  <th>HSN</th>
                  <th>Tax Free (Yes/No)</th>
                  <th>Wt. Charg (KG)</th>
                  <th>Actual Wt. (KG)</th>
                  <th className="namered">{formData.paymentType === "toPay" ? "TO PAY" : "PAID"}</th>
                  <th>Remarks</th>
                  {isEditing && <th>Auto</th>}
                  {isEditing && formData.articles.length > 1 && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {formData.articles.map((article, index) => (
                  <tr key={index} className="article-row">
                    <td>{article.noIndex}</td>
                    <td>
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
                    <td>
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
                    <td>
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
                    <td>
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
                    <td>
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
                    <td>
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
                    {isEditing && <td>
                      <button 
                        onClick={() => handleHistoryButtonClick(index)}
                        disabled={isFillingArticle}
                        title="Auto-fill from history"
                        className={`auto_fill_button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                      >
                        {isFillingArticle && currentArticleIndex === index ? '...' : <TfiWrite className={"auto_icon"} />}
                      </button>
                    </td>}
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
                  <td><b>Motor Freight</b></td>
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
                      formatNumericValue(formData.motorFreight === "" ? "0" : formData.motorFreight)
                    )}
                  </td>
                  <td></td>
                  {isEditing && <td></td>}
                  {isEditing && formData.articles.length > 1 && (
                    <td></td>
                  )}
                </tr>
                <tr>
                  <td><b>Hammali</b></td>
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
                      formatNumericValue(formData.hammali === "" ? "0" : formData.hammali)
                    )}
                  </td>
                  {isEditing && <td></td>}
                  <td></td>
                  {isEditing && formData.articles.length > 1 && (
                    <td></td>
                  )}
                </tr>
                <tr>
                  <td><b>Other Charges</b></td>
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
                      formatNumericValue(formData.otherCharges === "" ? "0" : formData.otherCharges)
                    )}
                  </td>
                  {isEditing && <td></td>}
                  <td></td>
                  {isEditing && formData.articles.length > 1 && (
                    <td></td>
                  )}
                </tr>
                <tr className="total-row">
                  <td>Total</td>
                  <td>{totals.noOfArticles}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td>{formatNumericValue(totals.weightChargeable)}</td>
                  <td>{formatNumericValue(totals.actualWeight)}</td>
                  <td>
                    {formData.paymentType === "toPay" 
                      ? formatNumericValue(totals.to_pay)
                      : formatNumericValue(totals.paid)
                    }
                  </td>
                  <td></td>
                  {isEditing && <td></td>}
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

          <div className="invoice-footer">
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
                    <span>{formData.goodsType || "—"}</span>
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
                    <span>
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
                    <span>{formData.gstPaidBy || "—"}</span>
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
              <button
                type="button"
                onClick={handleGenerateInvoice}
                className="generate-btn"
                disabled={isVerifying}
              >
                {isVerifying ? "Verifying..." : "Generate Invoice"}
              </button>
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
                <button onClick={resetForm2} className="edit-btn">
                  Create New
                </button>
              )}
              {activeTab === "add" && !isSubmitted && (
                <button onClick={handleSubmitToServer} className="submit-btn">
                  Submit
                </button>
              )}
              {(activeTab === "add" || activeTab === "view") && isSubmitted && (
                <button onClick={handlePrint} className="print-btn">
                  Print
                </button>
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

    {showTransactionHistory && (
      <AutoWriteTable
        consignorName={formData.consignor}
        consigneeName={formData.consignee}
        hsn={formData.articles[currentArticleIndex]?.hsn}
        noOfArticles={formData.articles[currentArticleIndex]?.noOfArticles}
        onComplete={(result) => {
          if (result) {
            const updatedArticles = [...formData.articles];
            updatedArticles[currentArticleIndex] = {
              ...updatedArticles[currentArticleIndex],
              saidToContain: result.saidToContain || updatedArticles[currentArticleIndex].saidToContain,
              taxFree: result.taxFree || updatedArticles[currentArticleIndex].taxFree,
              weightChargeable: result.weightChargeable || updatedArticles[currentArticleIndex].weightChargeable,
              actualWeight: result.actualWeight || updatedArticles[currentArticleIndex].actualWeight,
              hsn: result.hsn || updatedArticles[currentArticleIndex].hsn,
              to_pay: formData.paymentType === "toPay" ? (result.amount || updatedArticles[currentArticleIndex].to_pay) : updatedArticles[currentArticleIndex].to_pay,
              paid: formData.paymentType === "paid" ? (result.amount || updatedArticles[currentArticleIndex].paid) : updatedArticles[currentArticleIndex].paid,
              remarks: result.remarks || updatedArticles[currentArticleIndex].remarks,
            };
            setFormData(prev => ({ ...prev, articles: updatedArticles }));
          }
          setShowTransactionHistory(false);
        }}
      />
    )}
  </div>
);
};

export default InvoiceGenerator;