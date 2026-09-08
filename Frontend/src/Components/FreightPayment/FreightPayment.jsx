import { useState, useEffect } from 'react';
import "./FreightPayment.css";
import BASE_URL from "../../config";
import PopupAlert from '../PopupAlert/PopupAlert';

// Inlined SVG components (kept consistent with the rest of the app)
const IoAdd = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256 48C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48zm96 224h-80v80h-32v-80h-80v-32h80v-80h32v80h80v32z"></path></svg>;
const IoTrash = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M296 64h-80a7.91 7.91 0 00-8 8v24h96V72a7.91 7.91 0 00-8-8z" fill="none"></path><path d="M432 96h-96V72a40 40 0 00-40-40h-80a40 40 0 00-40 40v24H80a16 16 0 000 32h17l19 304.92c1.42 26.85 22 47.08 48 47.08h184c26.13 0 46.3-19.78 48-47.08L415 128h17a16 16 0 000-32zM192 432c-6.62 0-12-5.37-12-12V200c0-6.63 5.38-12 12-12s12 5.37 12 12v220c0 6.63-5.38 12-12 12zm80 0c-6.62 0-12-5.37-12-12V200c0-6.63 5.38-12 12-12s12 5.37 12 12v220c0 6.63-5.38 12-12 12zm80 0c-6.62 0-12-5.37-12-12V200c0-6.63 5.38-12 12-12s12 5.37 12 12v220c0 6.63-5.38 12-12 12z"></path><path d="M200 72h112v24H200z" fill="none"></path></svg>;
const IoSearch = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M456.69 421.39L362.6 327.3a173.81 173.81 0 0034.84-104.58C397.44 126.38 319.06 48 222.72 48S48 126.38 48 222.72s78.38 174.72 174.72 174.72A173.81 173.81 0 00327.3 362.6l94.09 94.09a25 25 0 0035.3-35.3zM97.92 222.72a124.8 124.8 0 11124.8 124.8 124.95 124.95 0 01-124.8-124.8z"></path></svg>;
const IoCreate = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M448 360.2V163.8c3.3-1.9 6.6-3.8 9.6-6 22.2-16.3 35.4-41.8 35.4-69.8 0-49.2-40.1-89.3-89.3-89.3-31.5 0-59.5 16.5-75.6 41.3-16.2-24.8-44.1-41.3-75.6-41.3C123.1 0 83 40.1 83 89.3c0 28 13.1 53.5 35.4 69.8 3 2.2 6.3 4.1 9.6 6v196.3c-3.3 1.9-6.6 3.8-9.6 6C123.1 369.2 110 394.7 110 422.7c0 49.2 40.1 89.3 89.3 89.3 31.5 0 59.5-16.5 75.6-41.3 16.2 24.8 44.1 41.3 75.6 41.3 49.2 0 89.3-40.1 89.3-89.3 0-28-13.1-53.5-35.4-69.8-3-2.2-6.3-4.1-9.6-6zM256 314.7c-49.2 0-89.3-40.1-89.3-89.3s40.1-89.3 89.3-89.3 89.3 40.1 89.3 89.3-40.1 89.3-89.3 89.3z"></path></svg>;
const IoEdit = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M384 224v184a40 40 0 01-40 40H104a40 40 0 01-40-40V168a40 40 0 0140-40h167.48M336 64h112v112M224 288L440 72"></path></svg>;

const FreightPayment = ({ isLightMode, modeOfView, currentUser }) => {
    // A single, fixed reference for "current year" — computed once when the
    // component loads. Used to auto-complete any short Challan No the user
    // types into a row (e.g. "5" -> "26CH00005") without needing a dropdown
    // per row. A fully-typed number (e.g. "25CH00007") is always left as-is.
    const currentYearShort = new Date().getFullYear().toString().slice(-2);

    // A fresh, blank row for the freight table
    const initialRowState = () => ({
        index: 1,
        challan_no: '',
        vehicle: '',          // fetched from the challan (truck_no)
        driver_name: '',      // fetched from the challan (driver_no)
        driver_pan: '',       // user input
        weight: '',
        rate: '',
        total_freight: '',
        advance: '',
        deduction: '',
        freight_raipur: '',
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_id: '',
        bulk_wt: '',
        other_wt: '',
        to_pay: '',
        paid: '',
        isFetched: false,
        fetchError: false,
    });

    // UI / mode states
    const [mode, setMode] = useState(modeOfView);
    const [freightEditMode, setFreightEditMode] = useState(modeOfView === 'add');
    const [isLoading, setIsLoading] = useState(false);
    const [hasFetchedData, setHasFetchedData] = useState(false);
    const [showAddViewUpdateButtons, setShowAddViewUpdateButtons] = useState(false);

    // Freight header (single, non-editable value for the whole payment sheet)
    const [freightNo, setFreightNo] = useState('');

    // Table rows
    const [rows, setRows] = useState(Array(5).fill(null).map((_, i) => ({ ...initialRowState(), index: i + 1 })));

    // Search (view / update / delete mode)
    const [searchTerm, setSearchTerm] = useState('');
    const [searchYear, setSearchYear] = useState(new Date().getFullYear());
    const [years, setYears] = useState([]);

    // Alerts
    const [alert, setAlert] = useState({ message: '', type: 'info', show: false });
    const showAlert = (message, type = 'info') => setAlert({ message, type, show: true });
    const hideAlert = () => setAlert({ message: '', type: 'info', show: false });

    // Populate year dropdown (search box)
    useEffect(() => {
        const cy = new Date().getFullYear();
        const yearOptions = [];
        for (let i = cy + 1; i >= cy - 5; i--) yearOptions.push(i);
        setYears(yearOptions);
    }, []);

    // --------------------------------------------------------------------
    // Number formatting helpers
    // --------------------------------------------------------------------

    // "25CH00007" stays as-is. "5" / "05" / "005" -> "<currentYear>CH00005".
    const formatChallanNo = (input) => {
        if (!input) return '';
        const trimmed = input.trim().toUpperCase();
        const fullMatch = trimmed.match(/^(\d{2})CH0*(\d+)$/);
        if (fullMatch) {
            return `${fullMatch[1]}CH${fullMatch[2].padStart(5, '0')}`;
        }
        const numeric = trimmed.replace(/\D/g, '');
        if (!numeric) return '';
        return `${currentYearShort}CH${numeric.padStart(5, '0')}`;
    };

    // Same idea, for the top-level Freight No search (has its own year picker).
    const formatFreightNo = (input, year) => {
        if (!input) return '';
        const trimmed = input.trim().toUpperCase();
        const fullMatch = trimmed.match(/^(\d{2})FR0*(\d+)$/);
        if (fullMatch) {
            return `${fullMatch[1]}FR${fullMatch[2].padStart(5, '0')}`;
        }
        const numeric = trimmed.replace(/\D/g, '');
        if (!numeric) return '';
        const yearPrefix = year.toString().slice(-2);
        return `${yearPrefix}FR${numeric.padStart(5, '0')}`;
    };

    // Strips a numeric value down to its cleanest form: 0 -> null, 55.00 -> 55,
    // 55.32 -> 55.32. Returns null for empty/invalid so callers can decide
    // how to render "nothing" (blank input vs. a dash).
    const cleanNum = (val) => {
        if (val === null || val === undefined || val === '') return null;
        const num = Number(val);
        if (isNaN(num)) return null;
        const rounded = parseFloat(num.toFixed(2));
        return rounded === 0 ? null : rounded;
    };

    // For editable inputs — blank instead of 0, otherwise the clean number.
    const inputVal = (val) => cleanNum(val) ?? '';

    // For read-only display cells — a dash instead of 0/blank.
    const displayVal = (val) => cleanNum(val) ?? '-';

    // 2026-12-24 -> 24-12-2026
    const formatDateForDisplay = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}-${month}-${d.getFullYear()}`;
    };

    // --------------------------------------------------------------------
    // Freight No generation (add mode only)
    // NOTE: the backend currently just stores whatever `freight_no` is sent
    // (defaulting to 'Not Assigned') — there's no generateFreightNo()
    // equivalent to generateChallanNo() yet. Until that exists server-side,
    // this mirrors the same "<yy>FR00001" numbering scheme on the frontend
    // by scanning existing challans for the highest freight_no this year.
    // --------------------------------------------------------------------
    useEffect(() => {
        const generateFreightNo = async () => {
            try {
                const res = await fetch(`${BASE_URL}/challan`);
                if (!res.ok) throw new Error('Failed to reach challan records');
                const all = await res.json();

                const prefix = `${currentYearShort}FR`;
                let maxNum = 0;
                all.forEach(c => {
                    if (c.freight_no && c.freight_no.startsWith(prefix)) {
                        const num = parseInt(c.freight_no.substring(prefix.length)) || 0;
                        if (num > maxNum) maxNum = num;
                    }
                });

                setFreightNo(`${prefix}${(maxNum + 1).toString().padStart(5, '0')}`);
            } catch (err) {
                console.error('Error generating freight number:', err);
                setFreightNo('Pending');
            }
        };

        if (mode === 'add') generateFreightNo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // --------------------------------------------------------------------
    // Per-row derived (auto-calculated) values
    // --------------------------------------------------------------------
    const getRowCalculated = (row) => {
        const totalFreight = Number(row.total_freight) || 0;
        const advance = Number(row.advance) || 0;
        const deduction = Number(row.deduction) || 0;
        const freightRaipur = Number(row.freight_raipur) || 0;
        const balanceIndore = totalFreight - advance - deduction - freightRaipur;

        const toPay = Number(row.to_pay) || 0;
        const paid = Number(row.paid) || 0;
        const totalAmount = toPay + paid;

        const pl = totalAmount - totalFreight;

        return { balanceIndore, totalAmount, pl };
    };

    const calculateColumnTotals = () => {
        return rows.reduce((totals, row) => {
            if (row.challan_no) {
                const { balanceIndore, totalAmount, pl } = getRowCalculated(row);
                totals.weight += Number(row.weight) || 0;
                totals.total_freight += Number(row.total_freight) || 0;
                totals.advance += Number(row.advance) || 0;
                totals.deduction += Number(row.deduction) || 0;
                totals.freight_raipur += Number(row.freight_raipur) || 0;
                totals.balance_indore += balanceIndore;
                totals.bulk_wt += Number(row.bulk_wt) || 0;
                totals.other_wt += Number(row.other_wt) || 0;
                totals.to_pay += Number(row.to_pay) || 0;
                totals.paid += Number(row.paid) || 0;
                totals.total_amount += totalAmount;
                totals.pl += pl;
            }
            return totals;
        }, {
            weight: 0, total_freight: 0, advance: 0, deduction: 0, freight_raipur: 0,
            balance_indore: 0, bulk_wt: 0, other_wt: 0, to_pay: 0, paid: 0,
            total_amount: 0, pl: 0
        });
    };

    // --------------------------------------------------------------------
    // Row editing
    // --------------------------------------------------------------------
    const handleTableChange = (index, field, value) => {
        setRows(prevRows => {
            const newRows = [...prevRows];
            newRows[index] = {
                ...newRows[index],
                [field]: value,
                ...(field === 'challan_no' && { isFetched: false, fetchError: false })
            };
            return newRows;
        });
    };

    const addMoreRows = () => {
        const lastIndex = rows.length;
        setRows([...rows, ...Array(5).fill(null).map((_, i) => ({ ...initialRowState(), index: lastIndex + i + 1 }))]);
    };

    const deleteRow = (index) => {
        if (rows.length <= 1) return;
        setRows(prev => prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, index: i + 1 })));
    };

    // --------------------------------------------------------------------
    // Fetch challan details as soon as a Challan No is entered in a row
    // (debounced, same pattern used for builty lookups in Challan.jsx)
    // --------------------------------------------------------------------
    useEffect(() => {
        const fetchChallanDetails = async (challanNoInput, index) => {
            if (!challanNoInput.trim()) return;
            const formatted = formatChallanNo(challanNoInput);
            if (!formatted) return;

            try {
                const response = await fetch(`${BASE_URL}/challan?challan_no=${formatted}`);
                if (!response.ok) throw new Error('Challan not found');
                const data = await response.json();

                if (data) {
                    setRows(prev => {
                        const newRows = [...prev];
                        newRows[index] = {
                            ...newRows[index],
                            challan_no: formatted,
                            vehicle: data.truck_no || '',
                            driver_name: data.driver_no || '',
                            // Pre-fill freight fields if this challan already has some saved
                            driver_pan: data.driver_pan || newRows[index].driver_pan,
                            weight: data.weight || newRows[index].weight,
                            rate: data.rate || newRows[index].rate,
                            total_freight: data.total_freight || newRows[index].total_freight,
                            advance: data.advance || newRows[index].advance,
                            deduction: data.deduction || newRows[index].deduction,
                            freight_raipur: data.freight_raipur || newRows[index].freight_raipur,
                            transaction_date: data.transaction_date
                                ? new Date(data.transaction_date).toISOString().split('T')[0]
                                : newRows[index].transaction_date,
                            transaction_id: data.transaction_id || newRows[index].transaction_id,
                            bulk_wt: data.bulk_wt || newRows[index].bulk_wt,
                            other_wt: data.other_wt || newRows[index].other_wt,
                            to_pay: data.to_pay || newRows[index].to_pay,
                            paid: data.paid || newRows[index].paid,
                            isFetched: true,
                            fetchError: false,
                        };
                        return newRows;
                    });

                    if (data.freight_no && data.freight_no !== 'Not Assigned' && data.freight_no !== freightNo) {
                        showAlert(`Heads up: Challan ${formatted} is already linked to Freight No ${data.freight_no}.`, 'info');
                    }
                }
            } catch (err) {
                showAlert(`Challan ${formatted} not found.`, 'error');
                setRows(prev => {
                    const newRows = [...prev];
                    newRows[index] = { ...newRows[index], challan_no: formatted, isFetched: false, fetchError: true, vehicle: '', driver_name: '' };
                    return newRows;
                });
            }
        };

        const timeouts = rows.map((row, index) => {
            if (row.challan_no && !row.isFetched && !row.fetchError) {
                return setTimeout(() => fetchChallanDetails(row.challan_no, index), 1200);
            }
            return null;
        });

        return () => timeouts.forEach(t => t && clearTimeout(t));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows]);

    // --------------------------------------------------------------------
    // Search an existing Freight No (view / update / delete mode)
    // NOTE: there's no dedicated "get by freight_no" backend route yet, so
    // this pulls all challans and filters client-side. Worth adding a
    // `GET /challan?freight_no=` query on the backend later for efficiency.
    // --------------------------------------------------------------------
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) {
            showAlert('Please enter a Freight No to search.', 'error');
            return;
        }
        const formatted = formatFreightNo(searchTerm, searchYear);
        setIsLoading(true);
        setHasFetchedData(false);
        try {
            const response = await fetch(`${BASE_URL}/challan`);
            if (!response.ok) throw new Error('Failed to fetch challans.');
            const all = await response.json();

            const matches = all.filter(c => (c.freight_no || '').toUpperCase() === formatted);
            if (matches.length === 0) throw new Error('No challans found for this Freight No.');

            const newRows = matches.map((data, i) => ({
                index: i + 1,
                challan_no: data.challan_no,
                vehicle: data.truck_no || '',
                driver_name: data.driver_no || '',
                driver_pan: data.driver_pan || '',
                weight: data.weight || '',
                rate: data.rate || '',
                total_freight: data.total_freight || '',
                advance: data.advance || '',
                deduction: data.deduction || '',
                freight_raipur: data.freight_raipur || '',
                transaction_date: data.transaction_date
                    ? new Date(data.transaction_date).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0],
                transaction_id: data.transaction_id || '',
                bulk_wt: data.bulk_wt || '',
                other_wt: data.other_wt || '',
                to_pay: data.to_pay || '',
                paid: data.paid || '',
                isFetched: true,
                fetchError: false,
            }));

            setRows(newRows);
            setFreightNo(formatted);
            setHasFetchedData(true);
            setFreightEditMode(mode === 'update');
        } catch (err) {
            showAlert(err.message, 'error');
            resetForm();
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setRows(Array(5).fill(null).map((_, i) => ({ ...initialRowState(), index: i + 1 })));
        setFreightNo('');
        setSearchTerm('');
        setHasFetchedData(false);
        setShowAddViewUpdateButtons(false);
    };

    // --------------------------------------------------------------------
    // Submit — pushes freight fields onto each referenced challan record
    // --------------------------------------------------------------------
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const filledRows = rows.filter(row => row.challan_no && row.isFetched);
            if (filledRows.length === 0) {
                throw new Error('Please enter at least one valid Challan No.');
            }

            const challanNos = filledRows.map(r => r.challan_no);
            if (new Set(challanNos).size !== challanNos.length) {
                throw new Error('Duplicate Challan numbers found. Please remove duplicates.');
            }

            for (const row of filledRows) {
                const { balanceIndore, pl } = getRowCalculated(row);
                const payload = {
                    freight_no: freightNo,
                    driver_pan: row.driver_pan,
                    weight: row.weight || 0,
                    rate: row.rate || 0,
                    total_freight: row.total_freight || 0,
                    advance: row.advance || 0,
                    deduction: row.deduction || 0,
                    freight_raipur: row.freight_raipur || 0,
                    balance_indore: balanceIndore,
                    transaction_date: row.transaction_date || null,
                    transaction_id: row.transaction_id,
                    bulk_wt: row.bulk_wt || 0,
                    other_wt: row.other_wt || 0,
                    to_pay: row.to_pay || 0,
                    paid: row.paid || 0,
                    plpl: pl,
                    freight_created_at: new Date().toISOString(),
                };

                const response = await fetch(`${BASE_URL}/challan/${row.challan_no}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(`Failed to save freight details for ${row.challan_no}.`);
            }

            showAlert(`Freight ${mode === 'add' ? 'payment saved' : 'payment updated'} successfully! Freight No: ${freightNo}`, 'success');
            setFreightEditMode(false);
            setShowAddViewUpdateButtons(true);
            setHasFetchedData(true);
        } catch (err) {
            showAlert(`Error: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --------------------------------------------------------------------
    // Delete — clears the freight fields off every challan in this sheet.
    // The challans themselves are left completely untouched.
    // --------------------------------------------------------------------
    const handleDelete = async () => {
        setIsLoading(true);
        try {
            const filledRows = rows.filter(row => row.challan_no);
            for (const row of filledRows) {
                const payload = {
                    freight_no: 'Not Assigned',
                    driver_pan: '',
                    weight: 0,
                    rate: 0,
                    total_freight: 0,
                    advance: 0,
                    deduction: 0,
                    freight_raipur: 0,
                    balance_indore: 0,
                    transaction_date: null,
                    transaction_id: '',
                    bulk_wt: 0,
                    other_wt: 0,
                    plpl: 0,
                    freight_created_at: null,
                };
                const response = await fetch(`${BASE_URL}/challan/${row.challan_no}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error(`Failed to clear freight details for ${row.challan_no}.`);
            }
            showAlert('Freight payment deleted successfully.', 'success');
            resetForm();
            setMode('view');
        } catch (err) {
            showAlert(`Error: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateNew = () => {
        resetForm();
        setMode('add');
        setFreightEditMode(true);
        setHasFetchedData(true);
        setShowAddViewUpdateButtons(false);
    };

    const handleUpdate = () => {
        setMode('update');
        setFreightEditMode(true);
        setShowAddViewUpdateButtons(false);
    };

    const handleDeleteMode = () => {
        if (freightNo) {
            setMode('delete');
            setFreightEditMode(false);
            setShowAddViewUpdateButtons(false);
        }
    };

    const freightBackButton = (text) => (
        <button
            onClick={() => {
                if (mode === 'view') setHasFetchedData(false);
                setMode('view');
                setFreightEditMode(false);
                setSearchTerm('');
            }}
            className={`fr-back-to-search-button ${isLightMode ? "light-mode" : "dark-mode"}`}
        >
            🡰 {text}
        </button>
    );

    const totals = calculateColumnTotals();

    const modeTitle = {
        add: 'New Freight Payment',
        view: 'View Freight Payment',
        update: 'Update Freight Payment',
        delete: 'Delete Freight Payment',
    }[mode];

    // Renders a numeric cell — editable input in edit mode, formatted
    // read-only value (or auto-calculated value) otherwise.
    const renderNumberCell = (row, index, field) => (
        freightEditMode ? (
            <input
                type="number"
                value={inputVal(row[field])}
                onChange={(e) => handleTableChange(index, field, e.target.value)}
                className={`fr-table-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
            />
        ) : <div className="text-center">{displayVal(row[field])}</div>
    );

    return (
        <>
            {(mode === 'view' || mode === 'update' || mode === 'delete') && (
                <>
                    <PopupAlert
                        message={alert.message}
                        type={alert.type}
                        duration={5000}
                        onClose={hideAlert}
                        isLightMode={isLightMode}
                        position="top-right"
                    />
                    {!hasFetchedData && (
                        <div className={`fr-search ${isLightMode ? "light-mode" : "dark-mode"}`}>
                            <div className="fr-search-text">Search Freight Payment</div>
                            <form onSubmit={handleSearch} className="fr-search-form">
                                <input
                                    type="text"
                                    placeholder="Enter Freight No"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    required
                                    className={`fr-search-input ${isLightMode ? "light-mode" : "dark-mode"}`}
                                />
                                <select
                                    value={searchYear}
                                    onChange={(e) => setSearchYear(e.target.value)}
                                    className={`fr-search-select ${isLightMode ? "light-mode" : "dark-mode"}`}
                                >
                                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <div
                                    className={`fr-search-preview ${isLightMode ? "light-mode" : "dark-mode"}`}
                                    style={{ opacity: searchTerm ? 1 : 0.55 }}
                                >
                                    {searchTerm ? formatFreightNo(searchTerm, searchYear) : "Preview"}
                                </div>
                                <button type="submit" className={`fr-search-button ${isLightMode ? "light-mode" : "dark-mode"}`}>
                                    <IoSearch className="fr-search-icon" />
                                </button>
                            </form>
                        </div>
                    )}
                </>
            )}

            {(mode === 'add' || hasFetchedData) && (
                <div className={`fr-main-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                    <PopupAlert
                        message={alert.message}
                        type={alert.type}
                        duration={5000}
                        onClose={hideAlert}
                        isLightMode={isLightMode}
                        position="top-right"
                    />

                    {/* Header row: title left, Freight No right */}
                    <div className="fr-page-header">
                        <h2 className={`fr-page-title ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{modeTitle}</h2>
                        <div className={`fr-freight-badge ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                            <span className={`fr-freight-badge-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Freight No:</span>
                            <span className={`fr-freight-badge-value ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                {freightNo || 'Generating...'}
                            </span>
                        </div>
                    </div>
                    <div className={`fr-divider ${isLightMode ? 'light-mode' : 'dark-mode'}`}></div>

                    {/* Table */}
                    <div className={`fr-table-card ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                        <div className="fr-table-container">
                            <table className={`fr-table ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                <thead>
                                    <tr className={`fr-table-header ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                        <th>Index</th>
                                        <th>Challan No</th>
                                        <th>Vehicle</th>
                                        <th>Driver Name</th>
                                        <th>Driver PAN</th>
                                        <th>Weight</th>
                                        <th>Rate</th>
                                        <th>Total Freight</th>
                                        <th>Advance</th>
                                        <th>Deduction</th>
                                        <th>Freight Raipur</th>
                                        <th>Balance Indore</th>
                                        <th>Txn Date</th>
                                        <th>Txn ID</th>
                                        <th>Bulk Wt</th>
                                        <th>Other Wt</th>
                                        <th>To Pay</th>
                                        <th>Paid</th>
                                        <th>Total Amount</th>
                                        <th>P/L</th>
                                        {freightEditMode && <th>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, index) => {
                                        const { balanceIndore, totalAmount, pl } = getRowCalculated(row);
                                        return (
                                            <tr key={index} className={`fr-table-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                                <td className="text-center">{row.index}</td>
                                                <td>
                                                    {freightEditMode ? (
                                                        <input
                                                            type="text"
                                                            value={row.challan_no}
                                                            onChange={(e) => handleTableChange(index, 'challan_no', e.target.value)}
                                                            className={`fr-table-input ${row.fetchError ? 'fr-input-error' : ''} ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                                                            placeholder="e.g. 5 or 26CH00005"
                                                        />
                                                    ) : <div className="text-center">{row.challan_no || '-'}</div>}
                                                </td>
                                                <td className="text-center">{row.vehicle || '-'}</td>
                                                <td className="text-center">{row.driver_name || '-'}</td>
                                                <td>
                                                    {freightEditMode ? (
                                                        <input type="text" value={row.driver_pan} onChange={(e) => handleTableChange(index, 'driver_pan', e.target.value)} className={`fr-table-input ${isLightMode ? 'light-mode' : 'dark-mode'}`} />
                                                    ) : <div className="text-center">{row.driver_pan || '-'}</div>}
                                                </td>
                                                <td>{renderNumberCell(row, index, 'weight')}</td>
                                                <td>{renderNumberCell(row, index, 'rate')}</td>
                                                <td>{renderNumberCell(row, index, 'total_freight')}</td>
                                                <td>{renderNumberCell(row, index, 'advance')}</td>
                                                <td>{renderNumberCell(row, index, 'deduction')}</td>
                                                <td>{renderNumberCell(row, index, 'freight_raipur')}</td>
                                                <td className={`text-center fr-auto-calc ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{displayVal(balanceIndore)}</td>
                                                <td>
                                                    {freightEditMode ? (
                                                        <input type="date" value={row.transaction_date} onChange={(e) => handleTableChange(index, 'transaction_date', e.target.value)} className={`fr-table-input ${isLightMode ? 'light-mode' : 'dark-mode'}`} />
                                                    ) : <div className="text-center">{formatDateForDisplay(row.transaction_date)}</div>}
                                                </td>
                                                <td>
                                                    {freightEditMode ? (
                                                        <input type="text" value={row.transaction_id} onChange={(e) => handleTableChange(index, 'transaction_id', e.target.value)} className={`fr-table-input ${isLightMode ? 'light-mode' : 'dark-mode'}`} />
                                                    ) : <div className="text-center">{row.transaction_id || '-'}</div>}
                                                </td>
                                                <td>{renderNumberCell(row, index, 'bulk_wt')}</td>
                                                <td>{renderNumberCell(row, index, 'other_wt')}</td>
                                                <td className="text-center">{row.to_pay ? Number(row.to_pay).toString() : '-'}</td>
                                                <td className="text-center">{row.paid ? Number(row.paid).toString() : '-'}</td>
                                                <td className={`text-center fr-auto-calc ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{displayVal(totalAmount)}</td>
                                                <td className={`text-center fr-auto-calc ${pl < 0 ? 'fr-negative' : 'fr-positive'} ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{displayVal(pl)}</td>
                                                {freightEditMode && (
                                                    <td className="text-center">
                                                        <button type="button" onClick={() => deleteRow(index)} className={`fr-delete-row-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}><IoTrash /></button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {rows.some(row => row.challan_no) && (
                                        <tr className={`fr-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                            <td className="text-center">Total</td>
                                            <td colSpan="4"></td>
                                            <td className="text-center">{displayVal(totals.weight)}</td>
                                            <td></td>
                                            <td className="text-center">{displayVal(totals.total_freight)}</td>
                                            <td className="text-center">{displayVal(totals.advance)}</td>
                                            <td className="text-center">{displayVal(totals.deduction)}</td>
                                            <td className="text-center">{displayVal(totals.freight_raipur)}</td>
                                            <td className="text-center">{displayVal(totals.balance_indore)}</td>
                                            <td colSpan="2"></td>
                                            <td className="text-center">{displayVal(totals.bulk_wt)}</td>
                                            <td className="text-center">{displayVal(totals.other_wt)}</td>
                                            <td className="text-center">{displayVal(totals.to_pay)}</td>
                                            <td className="text-center">{displayVal(totals.paid)}</td>
                                            <td className="text-center">{displayVal(totals.total_amount)}</td>
                                            <td className="text-center">{displayVal(totals.pl)}</td>
                                            {freightEditMode && <td></td>}
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {freightEditMode && (
                        <div className="fr-add-more-container">
                            <button type="button" onClick={addMoreRows} className={`fr-add-more-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}><IoAdd /> Add 5 More Rows</button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className={`fr-submit-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                            >
                                {isLoading ? 'Saving...' : (mode === 'add' ? 'Save Freight Payment' : 'Update Freight Payment')}
                            </button>
                            {mode !== 'add' && freightBackButton('Back')}
                        </div>
                    )}

                    {(mode === 'view' || showAddViewUpdateButtons) && (
                        <div className={`fr-action-buttons ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                            <button onClick={handleCreateNew} className={`fr-create-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                <IoCreate /> New Freight Payment
                            </button>
                            <button onClick={handleUpdate} className={`fr-update-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                <IoEdit /> Update This Freight
                            </button>
                            {currentUser === 'Admin' && (
                                <button onClick={handleDeleteMode} className={`fr-delete-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                    <IoTrash /> Delete This Freight
                                </button>
                            )}
                            {freightBackButton('Back to Search')}
                        </div>
                    )}

                    {mode === 'delete' && hasFetchedData && (
                        <div className="fr-add-more-container">
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isLoading}
                                className={`fr-delete-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                            >
                                <IoTrash /> {isLoading ? 'Deleting...' : 'Delete Freight Payment'}
                            </button>
                            {freightBackButton('Back')}
                        </div>
                    )}
                </div>
            )}

            {isLoading && (
                <div className="fr-loading-overlay">
                    <div className={`fr-loading-spinner ${isLightMode ? 'light-mode' : 'dark-mode'}`}></div>
                </div>
            )}
        </>
    );
};

export default FreightPayment;
