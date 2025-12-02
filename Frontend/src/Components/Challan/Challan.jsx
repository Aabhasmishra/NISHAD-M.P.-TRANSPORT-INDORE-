import { useState, useEffect, useRef } from 'react';
import "./Challan.css";
import PopupAlert from '../PopupAlert/PopupAlert';

// Inlined SVG components
const IoAdd = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256 48C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48zm96 224h-80v80h-32v-80h-80v-32h80v-80h32v80h80v32z"></path></svg>;
const IoSearch = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M456.69 421.39L362.6 327.3a173.81 173.81 0 0034.84-104.58C397.44 126.38 319.06 48 222.72 48S48 126.38 48 222.72s78.38 174.72 174.72 174.72A173.81 173.81 0 00327.3 362.6l94.09 94.09a25 25 0 0035.3-35.3zM97.92 222.72a124.8 124.8 0 11124.8 124.8 124.95 124.95 0 01-124.8-124.8z"></path></svg>;
const IoTrash = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M296 64h-80a7.91 7.91 0 00-8 8v24h96V72a7.91 7.91 0 00-8-8z" fill="none"></path><path d="M432 96h-96V72a40 40 0 00-40-40h-80a40 40 0 00-40 40v24H80a16 16 0 000 32h17l19 304.92c1.42 26.85 22 47.08 48 47.08h184c26.13 0 46.3-19.78 48-47.08L415 128h17a16 16 0 000-32zM192 432c-6.62 0-12-5.37-12-12V200c0-6.63 5.38-12 12-12s12 5.37 12 12v220c0 6.63-5.38 12-12 12zm80 0c-6.62 0-12-5.37-12-12V200c0-6.63 5.38-12 12-12s12 5.37 12 12v220c0 6.63-5.38 12-12 12zm80 0c-6.62 0-12-5.37-12-12V200c0-6.63 5.38-12 12-12s12 5.37 12 12v220c0 6.63-5.38 12-12 12z"></path><path d="M200 72h112v24H200z" fill="none"></path></svg>;
const IoPrint = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M399.95 160h-287.9C76.824 160 48 188.803 48 224v138.667h79.899V448H384.1v-85.333H464V224c0-35.197-28.825-64-64.05-64zM352 416H160V288h192v128zm32.101-352H127.899v80H384.1V64z"></path></svg>;
const IoCreate = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M448 360.2V163.8c3.3-1.9 6.6-3.8 9.6-6 22.2-16.3 35.4-41.8 35.4-69.8 0-49.2-40.1-89.3-89.3-89.3-31.5 0-59.5 16.5-75.6 41.3-16.2-24.8-44.1-41.3-75.6-41.3C123.1 0 83 40.1 83 89.3c0 28 13.1 53.5 35.4 69.8 3 2.2 6.3 4.1 9.6 6v196.3c-3.3 1.9-6.6 3.8-9.6 6C123.1 369.2 110 394.7 110 422.7c0 49.2 40.1 89.3 89.3 89.3 31.5 0 59.5-16.5 75.6-41.3 16.2 24.8 44.1 41.3 75.6 41.3 49.2 0 89.3-40.1 89.3-89.3 0-28-13.1-53.5-35.4-69.8-3-2.2-6.3-4.1-9.6-6zM256 314.7c-49.2 0-89.3-40.1-89.3-89.3s40.1-89.3 89.3-89.3 89.3 40.1 89.3 89.3-40.1 89.3-89.3 89.3z"></path></svg>;
const IoEdit = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M384 224v184a40 40 0 01-40 40H104a40 40 0 01-40-40V168a40 40 0 0140-40h167.48M336 64h112v112M224 288L440 72"></path></svg>;

const Challan = ({ isLightMode, modeOfView }) => {
    // Form states
    const [formData, setFormData] = useState({
        date: '',
        truck_no: '',
        driver_no: '',
        from: '',
        destination: ''
    });

    // Table states
    const initialRowState = () => ({
        index: 1, builty_no: '', destination: '', consignor_name: '',
        consignee_name: '', units: '', weight: '', good_type: '',
        to_pay: '', paid: '', collection: '', isFetched: false
    });
    const [rows, setRows] = useState(Array(10).fill(null).map((_, i) => ({ ...initialRowState(), index: i + 1 })));

    // UI states
    const [mode, setMode] = useState(modeOfView);
    const [challanEditMode, setChallanEditMode] = useState(modeOfView === 'add');
    const [isLoading, setIsLoading] = useState(false);
    const [challanNo, setChallanNo] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchYear, setSearchYear] = useState(new Date().getFullYear());
    const [years, setYears] = useState([]);
    const [hasFetchedData, setHasFetchedData] = useState(false);
    const [removedBuiltyNos, setRemovedBuiltyNos] = useState([]);
    
    // Popup Alert State
    const [alert, setAlert] = useState({ message: '', type: 'info', show: false });
    const [confirmAlert, setConfirmAlert] = useState({ message: '', show: false, onConfirm: null });

    // Print functionality
    const printRef = useRef();

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

    // Populate year dropdown
    useEffect(() => {
        const currentYear = new Date().getFullYear();
        const yearOptions = [];
        for (let i = currentYear + 1; i >= currentYear - 5; i--) {
            yearOptions.push(i);
        }
        setYears(yearOptions);
    }, []);

    // Format challan number based on year and input
    const formatChallanNo = (input, year) => {
        if (!input || !year) return '';
        const yearPrefix = year.toString().slice(-2);
        let numericPart = input.trim().toUpperCase().replace(/[A-Z]/g, '');
        numericPart = numericPart.replace(/^0+/, '');
        if (!numericPart) return ''; 
        return `${yearPrefix}CH${numericPart.padStart(5, '0')}`;
    };

    // Format builty number for display
    const formatBuiltyForDisplay = (builtyNo) => {
        if (!builtyNo) return '';
        // Remove GR prefix and leading zeros
        return builtyNo.replace(/^GR0*/, '');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTableChange = (index, field, value) => {
        setRows(prevRows => {
            const newRows = [...prevRows];
            newRows[index] = {
                ...newRows[index],
                [field]: value,
                ...(field === 'builty_no' && { isFetched: false })
            };
            return newRows;
        });
    };
    
    // Fetch builty details
    useEffect(() => {
        const fetchBuiltyDetails = async (builtyNo, index) => {
            if (!builtyNo.trim()) return;
            try {
                let formattedBuilty = builtyNo.trim().toUpperCase();
                if (!formattedBuilty.startsWith("GR")) {
                    formattedBuilty = "GR" + formattedBuilty.replace(/\D/g, "").padStart(5, "0");
                }
                
                const response = await fetch(`http://43.230.202.198:3000/api/transport-records?grNo=${formattedBuilty}`);
                if (!response.ok) throw new Error('Builty not found');
                
                const data = await response.json();
                if (data) {
                    const units = data.article_no.split('|').reduce((sum, val) => sum + parseInt(val || 0), 0);
                    const weight = data.actual_weight.split('|').reduce((sum, val) => sum + parseInt(val || 0), 0);
                    setRows(prev => {
                        const newRows = [...prev];
                        newRows[index] = {
                            ...newRows[index], builty_no: formattedBuilty, destination: data.to_location,
                            consignor_name: data.consignor_name, consignee_name: data.consignee_name,
                            units, weight, to_pay: data.to_pay, paid: data.paid,
                            good_type: data.goods_type, isFetched: true
                        };
                        return newRows;
                    });
                }
            } catch (err) {
                console.error('Error fetching builty:', err);
                // Optionally reset row if fetch fails
            }
        };

        const timeouts = rows.map((row, index) => {
            if (row.builty_no && !row.isFetched) {
                return setTimeout(() => fetchBuiltyDetails(row.builty_no, index), 1500);
            }
            return null;
        });

        return () => timeouts.forEach(timeout => timeout && clearTimeout(timeout));
    }, [rows]);

    const addMoreRows = () => {
        const lastIndex = rows.length;
        setRows([...rows, ...Array(5).fill(null).map((_, i) => ({ ...initialRowState(), index: lastIndex + i + 1 }))]);
    };

    const deleteRow = (index) => {
        if (rows.length <= 1) return;
        
        if (mode === 'update' && rows[index].builty_no) {
            setRemovedBuiltyNos(prev => [...prev, rows[index].builty_no]);
        }
        
        setRows(prev => prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, index: i + 1 })));
    };

    // Check status for all builty numbers using the new /api/status endpoint
    const checkBuiltyStatuses = async () => {
        const builtyNos = rows.filter(r => r.builty_no.trim()).map(r => r.builty_no.trim().toUpperCase());
        for (const builtyNo of builtyNos) {
            try {
                const response = await fetch(`http://43.230.202.198:3000/api/status?gr_no=${builtyNo}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.challan_status && data.challan_status.toLowerCase() !== 'book') {
                        if (mode === 'update' && data.challan_status === challanNo) {
                            continue;
                        }
                        return { isAssigned: true, builtyNo, assignedTo: data.challan_status };
                    }
                }
            } catch (err) {
                console.error(`Error checking status for ${builtyNo}:`, err);
            }
        }
        return { isAssigned: false };
    };

    // Update status for all builty numbers
    const updateBuiltyStatuses = async (newChallanNo) => {
        const builtyNos = rows.filter(r => r.builty_no.trim()).map(r => r.builty_no.trim().toUpperCase());
        for (const builtyNo of builtyNos) {
            try {
                await fetch(`http://43.230.202.198:3000/api/status/${builtyNo}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ challan_status: newChallanNo })
                });
            } catch (err) {
                console.error(`Error updating status for ${builtyNo}:`, err);
                showAlert(`Failed to update status for GR ${builtyNo}. Please check manually.`, 'error');
            }
        }
    };

    // Update removed builties status back to "Book"
    const updateRemovedBuiltyStatuses = async () => {
        for (const builtyNo of removedBuiltyNos) {
            try {
                await fetch(`http://43.230.202.198:3000/api/status/${builtyNo}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ challan_status: 'Book' })
                });
            } catch (err) {
                console.error(`Error updating removed builty status for ${builtyNo}:`, err);
                showAlert(`Failed to update removed builty ${builtyNo}. Please check manually.`, 'error');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (!formData.date || !formData.truck_no || !formData.driver_no || !formData.from || !formData.destination) {
                throw new Error('Please fill all header fields.');
            }
            const filledRows = rows.filter(row => row.builty_no);
            if (filledRows.length === 0) {
                throw new Error('Please add at least one builty number.');
            }
            
            const builtyNos = filledRows.map(r => r.builty_no.trim().toUpperCase());
            if (new Set(builtyNos).size !== builtyNos.length) {
                throw new Error('Duplicate builty numbers found. Please remove duplicates.');
            }

            const statusCheck = await checkBuiltyStatuses();
            if (statusCheck.isAssigned) {
                throw new Error(`Builty ${statusCheck.builtyNo} is already assigned to Challan ${statusCheck.assignedTo}.`);
            }
            
            const payload = { ...formData, builty_no: builtyNos.join(' | ') };
            const url = mode === 'update' ? `http://43.230.202.198:3000/api/challan/${challanNo}` : 'http://43.230.202.198:3000/api/challan';
            
            const response = await fetch(url, {
                method: mode === 'update' ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`Failed to ${mode} challan.`);
            
            const data = await response.json();
            const newChallanNo = data.challan_no || challanNo;
            setChallanNo(newChallanNo);
            
            // For update mode, update removed builties first
            if (mode === 'update' && removedBuiltyNos.length > 0) {
                await updateRemovedBuiltyStatuses();
                setRemovedBuiltyNos([]);
            }
            
            await updateBuiltyStatuses(newChallanNo);
            
            showAlert(`Challan ${mode}d successfully! Challan No: ${newChallanNo}`, 'success');
            
            // Set challanEditMode to false after successful submission
            setChallanEditMode(false);
            
        } catch (err) {
            showAlert(`Error: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const resetForm = () => {
        setFormData({ date: '', truck_no: '', driver_no: '', from: '', destination: '' });
        setRows(Array(10).fill(null).map((_, i) => ({ ...initialRowState(), index: i + 1 })));
        setChallanNo('');
        setSearchTerm('');
        setHasFetchedData(false);
        setRemovedBuiltyNos([]);
    };

    const handleDelete = () => {
        showConfirm('Delete this challan? This will unassign its builty numbers.', async () => {
            setIsLoading(true);
            try {
                await updateBuiltyStatuses('Book');

                const response = await fetch(`http://43.230.202.198:3000/api/challan/${challanNo}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete challan');
                
                showAlert('Challan deleted successfully.', 'success');
                resetForm();

            } catch (err) {
                showAlert(`Error: ${err.message}`, 'error');
            } finally {
                setIsLoading(false);
            }
        });
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setHasFetchedData(false);
        try {
            const formattedChallanNo = formatChallanNo(searchTerm, searchYear);
            if (!formattedChallanNo) throw new Error('Invalid challan number format.');

            const response = await fetch(`http://43.230.202.198:3000/api/challan?challan_no=${formattedChallanNo}`);
            if (!response.ok) throw new Error('Challan not found.');
            
            const data = await response.json();
            setFormData({
                date: data.date, truck_no: data.truck_no, driver_no: data.driver_no || '',
                from: data.from_location, destination: data.destination
            });
            
            const builtyNos = data.builty_no.split('|').map(b => b.trim());
            
            const newRows = builtyNos.map((builty, i) => ({ ...initialRowState(), index: i + 1, builty_no: builty }));
            
            setRows(newRows);
            setChallanNo(data.challan_no);
            setHasFetchedData(true);
            
            // Set challanEditMode based on current mode
            if (mode === 'update') {
                setChallanEditMode(true);
            } else {
                setChallanEditMode(false);
            }
            
        } catch (err) {
            showAlert(err.message, 'error');
            resetForm();
        } finally {
            setIsLoading(false);
        }
    };

    const calculateTotals = () => {
        return rows.reduce((totals, row) => {
            if (row.builty_no) {
                totals.units += Number(row.units) || 0;
                totals.weight += Number(row.weight) || 0;
                totals.to_pay += Number(row.to_pay) || 0;
                totals.paid += Number(row.paid) || 0;
            }
            return totals;
        }, { units: 0, weight: 0, to_pay: 0, paid: 0 });
    };

    // Function to ensure minimum rows in the table
    const ensureMinimumRows = (currentRows, minRows = 15) => {
        const currentRowCount = currentRows.length;
        
        if (currentRowCount >= minRows) {
            return currentRows;
        }
        
        // Add empty rows to reach minimum
        const emptyRowsNeeded = minRows - currentRowCount;
        const lastIndex = currentRowCount;
        
        const emptyRows = Array(emptyRowsNeeded).fill(null).map((_, i) => ({
            ...initialRowState(),
            index: lastIndex + i + 1,
            builty_no: '',
            destination: '',
            consignor_name: '',
            consignee_name: '',
            units: '',
            weight: '',
            good_type: '',
            to_pay: '',
            paid: '',
            collection: '',
            isFetched: false
        }));
        
        return [...currentRows, ...emptyRows];
    };

    // Print functionality
    const handlePrint = () => {
        const rowsForPrint = ensureMinimumRows(rows, 30);
        
        const printWindow = window.open('', '_blank');
        
        const printContent = `
            <div class="challan-print-content">
                ${printRef.current.querySelector('.challan-box-container').outerHTML}
                <div class="challan-table-container">
                    <table class="challan-table">
                        <thead>
                            <tr class="challan-table-header">
                                <th>Index</th><th>Builty No</th><th>Destination</th><th>Consignor</th>
                                <th>Consignee</th><th>Units</th><th>Weight</th><th>Good Type</th>
                                <th>To Pay</th><th>Paid</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsForPrint.map((row, index) => `
                                <tr class="challan-table-row print-row">
                                    <td class="text-center">${row.index}</td>
                                    <td class="text-center">${formatBuiltyForDisplay(row.builty_no) || '-'}</td>
                                    <td class="text-center">${row.destination || '-'}</td>
                                    <td class="text-center consignor-cell">${row.consignor_name || '-'}</td>
                                    <td class="text-center consignee-cell">${row.consignee_name || '-'}</td>
                                    <td class="text-center">${row.units || '-'}</td>
                                    <td class="text-center">${row.index <= rows.length ? row.weight : '-'}</td>
                                    <td class="text-center challan-goodType-Print">${row.good_type || '-'}</td>
                                    <td class="text-center">${row.index <= rows.length ? Number(row.to_pay) : '-'}</td>
                                    <td class="text-center">${row.index <= rows.length ? Number(row.paid) : '-'}</td>
                                </tr>
                            `).join('')}
                            ${rows.some(row => row.builty_no) && `
                                <tr class="challan-table-total-row">
                                    <td class="text-center">Total</td><td colSpan="4"></td>
                                    <td class="text-center">${calculateTotals().units}</td>
                                    <td class="text-center">${calculateTotals().weight}</td><td></td>
                                    <td class="text-center">${calculateTotals().to_pay}</td>
                                    <td class="text-center">${calculateTotals().paid}</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        const printDocument = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Challan ${challanNo}</title>
                <style>
                    :root {
                        --consignor-cell-width: 150px;
                        --consignee-cell-width: 150px;
                        --table-row-height: 14.5px;
                        --table-font-size: 10px;
                        --consignor-font-size: 9px;
                        --consignee-font-size: 9px;
                    }
                    
                    @media print {
                        @page {
                            margin: 10mm;
                        }
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                            background: white !important;
                            color: black !important;
                        }
                        .challan-print-container {
                            width: 100%;
                            max-width: 210mm;
                            margin: 0 auto;
                            background: white;
                            color: black;
                        }
                        .challan-box-container {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 15px;
                            margin-right: 0.6px;
                            border: 2px solid #000;
                            padding: 15px;
                            background: white !important;
                            color: black !important;
                        }
                        .challan-input-box {
                        }
                        .challan-company-box {
                            flex: 1;
                            text-align: center;
                            border-left: 2px solid #000;
                            padding-left: 20px;
                        }
                        .challan-form {
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                            height: 100%;
                            gap: 0;
                        }
                        .challan-form-row {
                            display: flex;
                            flex-wrap: wrap;
                        }
                        .challan-form-group {
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            flex: 1;
                            min-width: 200px;
                        }
                        .challan-form-label {
                            font-weight: bold;
                            font-size: 14px;
                            display: inline-block;
                            min-width: 75px;
                            margin: 0;
                            color: black !important;
                            text-align: left;
                        }
                        .challan-form-value, .challan-form-input {
                            width: 93px;
                            font-size: 13px;
                            padding: 4px 0px 4px 8px;
                            border: 1px solid #000;
                            background: white !important;
                            color: black !important;
                            min-height: auto;
                            margin: 0;
                        }
                        .challan-company-name {
                            font-size: 16px;
                            font-weight: bold;
                            margin: 0 0 5px 0;
                            color: black !important;
                        }
                        .challan-company-tagline {
                            font-size: 11px;
                            margin: 0 0 8px 0;
                            color: black !important;
                        }
                        .challan-company-address, .challan-company-contact {
                            font-size: 11px;
                            margin: 2px 0;
                            color: black !important;
                        }
                        .challan-table {
                            width: 99.8%;
                            border-collapse: collapse;
                            margin-top: 10px;
                            background: white !important;
                            color: black !important;
                        }
                        .challan-table th, .challan-table td {
                            border: 1px solid #000;
                            padding: 6px;
                            text-align: center;
                            font-size: var(--table-font-size);
                            background: white !important;
                            color: black !important;
                            height: var(--table-row-height);
                            max-height: var(--table-row-height);
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        }
                        .challan-table th {
                            background-color: #f0f0f0 !important;
                            font-weight: bold;
                        }
                        .challan-table-total-row {
                            font-weight: bold;
                            background-color: #f8f8f8 !important;
                        }
                        .print-row {
                            height: var(--table-row-height) !important;
                            max-height: var(--table-row-height) !important;
                        }
                        .consignor-cell, .consignee-cell {
                            max-width: var(--consignor-cell-width) !important;
                            width: var(--consignee-cell-width) !important;
                            overflow: hidden !important;
                            text-overflow: ellipsis !important;
                            white-space: nowrap !important;
                            font-size: var(--consignor-font-size) !important;
                        }
                        .challan-goodType-Print {
                            max-width: 75px !important;
                            font-size: var(--consignor-font-size) !important;
                        }
                        .text-center { text-align: center; }
                        .no-print { display: none !important; }
                    }
                </style>
            </head>
            <body>
                <div class="challan-print-container">
                    ${printContent}
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => window.close(), 100);
                    }
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(printDocument);
        printWindow.document.close();
    };

    const handleCreateNew = () => {
        resetForm();
        setMode('add');
        setChallanEditMode(true);
        setHasFetchedData(true);
    };

    const handleUpdate = () => {
        if (challanNo) {
            setMode('update');
            setChallanEditMode(true);
        }
    };

    const handleDeleteMode = () => {
        if (challanNo) {
            setMode('delete');
            setChallanEditMode(false);
        }
    };

    return (
        <>
            <div className={`challan-main-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                {/* Popup Alert Component */}
                <PopupAlert
                    message={alert.message}
                    type={alert.type}
                    duration={5000}
                    onClose={hideAlert}
                    isLightMode={isLightMode}
                    position="top-right"
                />
                
                {/* Confirm Alert Component */}
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
                
                <h2 className={`challan-title ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                    {mode === 'add' && 'Create New Challan'}
                    {mode === 'view' && 'View Challan'}
                    {mode === 'update' && 'Update Challan'}
                    {mode === 'delete' && 'Delete Challan'}
                </h2>

                {(mode === 'view' || mode === 'update' || mode === 'delete') && (
                    <div className={`challan-search-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                        <form onSubmit={handleSearch}>
                            <div className="challan-search-header">
                                <h3>Search Existing Challan</h3>
                            </div>
                            <div className={`challan-search-group ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                <div className="challan-search-inputs">
                                    <div className="challan-search-field">
                                        <label className={`challan-search-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Challan Number</label>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            required
                                            className={`challan-search-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                                            placeholder="Enter number (e.g., 123)"
                                        />
                                    </div>
                                    <div className="challan-search-field">
                                        <label className={`challan-search-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Year</label>
                                        <select 
                                            value={searchYear} 
                                            onChange={(e) => setSearchYear(e.target.value)} 
                                            className={`challan-search-select improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                                        >
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                    <div className="challan-search-field">
                                        <label className={`challan-search-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>&nbsp;</label>
                                        <button type="submit" className={`challan-search-button improved-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                            <IoSearch className={`challan-search-icon ${isLightMode ? 'light-mode' : 'dark-mode'}`}/>
                                            Search
                                        </button>
                                    </div>
                                    <div className="challan-search-field">
                                        <label className={`challan-search-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>&nbsp;</label>
                                        <div className="challan-search-preview">
                                            {formatChallanNo(searchTerm, searchYear) && (
                                                <span className="challan-preview">
                                                    Preview: <strong>{formatChallanNo(searchTerm, searchYear)}</strong>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {(mode === 'add' || hasFetchedData) && (
                    <div>
                        {/* Print content reference */}
                        <div ref={printRef} className="challan-print-content">
                            <div className={`challan-box-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                <div className={`challan-input-box ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                    <div className={`challan-form ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                        <div className="challan-form-row">
                                            <div className={`challan-form-group`}>
                                                <label className={`challan-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Challan No</label>
                                                <div className={`challan-form-value ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{challanNo || 'Generated by backend'}</div>
                                            </div>
                                            <div className={`challan-form-group`}>
                                                <label className={`challan-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Date</label>
                                                <input 
                                                    type="date" 
                                                    name="date" 
                                                    value={formData.date} 
                                                    onChange={handleChange} 
                                                    required 
                                                    className={`challan-form-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`} 
                                                    readOnly={!challanEditMode} 
                                                />
                                            </div>
                                        </div>
                                        <div className="challan-form-row">
                                            <div className={`challan-form-group`}>
                                                <label className={`challan-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>From</label>
                                                <input 
                                                    type="text" 
                                                    name="from" 
                                                    value={formData.from} 
                                                    onChange={handleChange} 
                                                    required 
                                                    placeholder="Source location" 
                                                    className={`challan-form-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`} 
                                                    readOnly={!challanEditMode} 
                                                />
                                            </div>
                                            <div className={`challan-form-group`}>
                                                <label className={`challan-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Destination</label>
                                                <input 
                                                    type="text" 
                                                    name="destination" 
                                                    value={formData.destination} 
                                                    onChange={handleChange} 
                                                    required 
                                                    placeholder="Destination location" 
                                                    className={`challan-form-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`} 
                                                    readOnly={!challanEditMode}
                                                />
                                            </div>
                                        </div>
                                        <div className="challan-form-row">
                                            <div className={`challan-form-group`}>
                                                <label className={`challan-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Truck No</label>
                                                <input 
                                                    type="text" 
                                                    name="truck_no" 
                                                    value={formData.truck_no} 
                                                    onChange={handleChange} 
                                                    required 
                                                    placeholder="Truck number" 
                                                    className={`challan-form-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`} 
                                                    readOnly={!challanEditMode}
                                                />
                                            </div>
                                            <div className={`challan-form-group`}>
                                                <label className={`challan-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Driver No</label>
                                                <input 
                                                    type="text" 
                                                    name="driver_no" 
                                                    value={formData.driver_no} 
                                                    onChange={handleChange} 
                                                    required 
                                                    placeholder="Driver number" 
                                                    className={`challan-form-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`} 
                                                    readOnly={!challanEditMode}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={`challan-company-box ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                    <h3 className={`challan-company-name ${isLightMode ? 'light-mode' : 'dark-mode'}`}>NISHAD M.P. TRANSPORT (INDORE)</h3>
                                    <p className={`challan-company-tagline ${isLightMode ? 'light-mode' : 'dark-mode'}`}>CLEARING, FORWARDING & TRANSPORT AGENT</p>
                                    <p className={`challan-company-address ${isLightMode ? 'light-mode' : 'dark-mode'}`}><b>H.O. :</b> 180, New Loha Mandi, Indore (M.P.) - 452001</p>
                                    <p className={`challan-company-contact ${isLightMode ? 'light-mode' : 'dark-mode'}`}><b>Head Office:</b> Indore - 94250 82053</p>
                                    <p className={`challan-company-contact challan-company-contact2 ${isLightMode ? 'light-mode' : 'dark-mode'}`}><b>Raipur Branch:</b> 94253 15983</p>
                                </div>
                            </div>

                            <div className={`challan-table-container`}>
                                <table className={`challan-table ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                    <thead>
                                        <tr className={`challan-table-header ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                            <th>Index</th><th>Builty No</th><th>Destination</th><th>Consignor</th>
                                            <th>Consignee</th><th>Units</th><th>Weight</th><th>Good Type</th>
                                            <th>To Pay</th><th>Paid</th>
                                            {challanEditMode && <th>Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, index) => (
                                            <tr key={index} className={`challan-table-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                                <td className="text-center">{row.index}</td>
                                                <td>
                                                    {challanEditMode ? (
                                                        <input 
                                                            type="text" 
                                                            value={row.builty_no} 
                                                            onChange={(e) => handleTableChange(index, 'builty_no', e.target.value)} 
                                                            className={`challan-table-input improved-input ${isLightMode ? 'light-mode' : 'dark-mode'}`} 
                                                        />
                                                    ) : <div className="text-center">{formatBuiltyForDisplay(row.builty_no) || '-'}</div>}
                                                </td>
                                                <td className="text-center">{row.destination || '-'}</td>
                                                <td className="text-center">{row.consignor_name || '-'}</td>
                                                <td className="text-center">{row.consignee_name || '-'}</td>
                                                <td className="text-center">{row.units || '-'}</td>
                                                <td className="text-center">{row.weight || '-'}</td>
                                                <td className="text-center">{row.good_type || '-'}</td>
                                                <td className="text-center">{row.to_pay != null ? Number(row.to_pay) : '-'}</td>
                                                <td className="text-center">{row.paid != null ? Number(row.paid) : '-'}</td>
                                                {challanEditMode && (
                                                    <td className="text-center">
                                                        <button type="button" onClick={() => deleteRow(index)} className={`challan-delete-row-button improved-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}><IoTrash /></button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        {rows.some(row => row.builty_no) && (
                                            <tr className={`challan-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                                <td className="text-center">Total</td><td colSpan="4"></td>
                                                <td className="text-center">{calculateTotals().units}</td>
                                                <td className="text-center">{calculateTotals().weight}</td><td></td>
                                                <td className="text-center">{calculateTotals().to_pay}</td>
                                                <td className="text-center">{calculateTotals().paid}</td>
                                                {challanEditMode && <td></td>}
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {challanEditMode && (
                            <div className={`challan-add-more-container`}>
                                <button type="button" onClick={addMoreRows} className={`challan-add-more-button improved-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}><IoAdd /> Add 5 More Rows</button>
                            </div>
                        )}

                        {/* Action buttons for view mode */}
                        {mode === 'view' && (
                            <div className={`challan-action-buttons ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                <button 
                                    onClick={handlePrint} 
                                    className={`challan-print-button improved-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                                >
                                    <IoPrint /> Print Challan
                                </button>
                                <button 
                                    onClick={handleCreateNew}
                                    className={`challan-create-button improved-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                                >
                                    <IoCreate /> Create New Challan
                                </button>
                                <button 
                                    onClick={handleUpdate}
                                    className={`challan-update-button improved-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                                >
                                    <IoEdit /> Update This Challan
                                </button>
                                <button 
                                    onClick={handleDeleteMode}
                                    className={`challan-delete-button improved-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                                >
                                    <IoTrash /> Delete This Challan
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {(mode === 'add' || hasFetchedData) && (
                    <div className={`challan-submit-container`}>
                        {(mode === 'add' || mode === 'update') && (
                            <button 
                                type="button" 
                                onClick={handleSubmit} 
                                disabled={isLoading} 
                                className={`challan-submit-button improved-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                            >
                                {isLoading ? 'Saving...' : (mode === 'add' ? 'Save Challan' : 'Update Challan')}
                            </button>
                        )}
                        {mode === 'delete' && (
                            <button 
                                type="button" 
                                onClick={handleDelete} 
                                disabled={isLoading} 
                                className={`challan-delete-button improved-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                            >
                                {isLoading ? 'Deleting...' : 'Delete Challan'}
                            </button>
                        )}
                    </div>
                )}

                {isLoading && (
                    <div className={`challan-loading-overlay`}>
                        <div className={`challan-loading-spinner ${isLightMode ? 'light-mode' : 'dark-mode'}`}></div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Challan;