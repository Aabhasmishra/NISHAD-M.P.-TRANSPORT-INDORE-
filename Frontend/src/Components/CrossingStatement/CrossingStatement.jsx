import { useState, useEffect } from 'react';
import "./CrossingStatement.css";
import PopupAlert from '../PopupAlert/PopupAlert';

// Inlined SVG components
const IoAdd = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M256 48C141.1 48 48 141.1 48 256s93.1 208 208 208 208-93.1 208-208S370.9 48 256 48zm96 224h-80v80h-32v-80h-80v-32h80v-80h32v80h80v32z"></path></svg>;
const IoSearch = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M456.69 421.39L362.6 327.3a173.81 173.81 0 0034.84-104.58C397.44 126.38 319.06 48 222.72 48S48 126.38 48 222.72s78.38 174.72 174.72 174.72A173.81 173.81 0 00327.3 362.6l94.09 94.09a25 25 0 0035.3-35.3zM97.92 222.72a124.8 124.8 0 11124.8 124.8 124.95 124.95 0 01-124.8-124.8z"></path></svg>;
const IoTrash = () => <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M296 64h-80a7.91 7.91 0 00-8 8v24h96V72a7.91 7.91 0 00-8-8z" fill="none"></path><path d="M432 96h-96V72a40 40 0 00-40-40h-80a40 40 0 00-40 40v24H80a16 16 0 000 32h17l19 304.92c1.42 26.85 22 47.08 48 47.08h184c26.13 0 46.3-19.78 48-47.08L415 128h17a16 16 0 000-32zM192 432c-6.62 0-12-5.37-12-12V200c0-6.63 5.38-12 12-12s12 5.37 12 12v220c0 6.63-5.38 12-12 12zm80 0c-6.62 0-12-5.37-12-12V200c0-6.63 5.38-12 12-12s12 5.37 12 12v220c0 6.63-5.38 12-12 12zm80 0c-6.62 0-12-5.37-12-12V200c0-6.63 5.38-12 12-12s12 5.37 12 12v220c0 6.63-5.38 12-12 12z"></path><path d="M200 72h112v24H200z" fill="none"></path></svg>;

const CrossingStatement = ({ isLightMode, modeOfView }) => {
    // Form states
    const [formData, setFormData] = useState({
        date: ''
    });

    // Table states
    const initialRowState = () => ({
        index: 1, builty_no: '', destination: '', units: '', 
        weight: '', to_pay: '', paid: '', isFetched: false
    });
    const [rows, setRows] = useState(Array(10).fill(null).map((_, i) => ({ ...initialRowState(), index: i + 1 })));

    // UI states
    const [mode, setMode] = useState(modeOfView);
    const [isLoading, setIsLoading] = useState(false);
    const [cxNumber, setCxNumber] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchYear, setSearchYear] = useState(new Date().getFullYear());
    const [years, setYears] = useState([]);
    const [hasFetchedData, setHasFetchedData] = useState(false);
    
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

    // Populate year dropdown
    useEffect(() => {
        const currentYear = new Date().getFullYear();
        const yearOptions = [];
        for (let i = currentYear + 1; i >= currentYear - 5; i--) {
            yearOptions.push(i);
        }
        setYears(yearOptions);
    }, []);

    // Format CX number based on year and input
    const formatCXNumber = (input, year) => {
        if (!input || !year) return '';
        const yearPrefix = year.toString().slice(-2);
        let numericPart = input.trim().toUpperCase().replace(/[A-Z]/g, '');
        numericPart = numericPart.replace(/^0+/, '');
        if (!numericPart) return ''; 
        return `${yearPrefix}CX${numericPart.padStart(5, '0')}`;
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
                            units, weight, to_pay: data.to_pay, paid: data.paid,
                            isFetched: true
                        };
                        return newRows;
                    });
                }
            } catch (err) {
                console.error('Error fetching builty:', err);
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
        setRows(prev => prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, index: i + 1 })));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (!formData.date) {
                throw new Error('Please select a date.');
            }
            const filledRows = rows.filter(row => row.builty_no);
            if (filledRows.length === 0) {
                throw new Error('Please add at least one builty number.');
            }
            
            const builtyNos = filledRows.map(r => r.builty_no.trim().toUpperCase());
            if (new Set(builtyNos).size !== builtyNos.length) {
                throw new Error('Duplicate builty numbers found. Please remove duplicates.');
            }

            const payload = { ...formData, builty_no: builtyNos.join(' | ') };
            const url = mode === 'update' ? `http://43.230.202.198:3000/api/crossing/${cxNumber}` : 'http://43.230.202.198:3000/api/crossing';
            
            const response = await fetch(url, {
                method: mode === 'update' ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`Failed to ${mode} crossing statement.`);
            
            const data = await response.json();
            const newCXNumber = data.cx_number || cxNumber;
            setCxNumber(newCXNumber);
            
            showAlert(`Crossing Statement ${mode}d successfully! CX Number: ${newCXNumber}`, 'success');
            if (mode === 'add') {
                 setMode('update');
            }
        } catch (err) {
            showAlert(`Error: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const resetForm = () => {
        setFormData({ date: '' });
        setRows(Array(10).fill(null).map((_, i) => ({ ...initialRowState(), index: i + 1 })));
        setCxNumber('');
        setSearchTerm('');
        setHasFetchedData(false);
    };

    const handleDelete = () => {
        showConfirm('Delete this crossing statement?', async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`http://43.230.202.198:3000/api/crossing/${cxNumber}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete crossing statement');
                
                showAlert('Crossing statement deleted successfully.', 'success');
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
            const formattedCXNumber = formatCXNumber(searchTerm, searchYear);
            if (!formattedCXNumber) throw new Error('Invalid CX number format.');

            const response = await fetch(`http://43.230.202.198:3000/api/crossing?cx_number=${formattedCXNumber}`);
            if (!response.ok) throw new Error('Crossing statement not found.');
            
            const data = await response.json();
            setFormData({
                date: data.date
            });
            
            const builtyNos = data.builty_no.split('|').map(b => b.trim());
            
            const newRows = builtyNos.map((builty, i) => ({ ...initialRowState(), index: i + 1, builty_no: builty }));
            
            setRows(newRows);
            setCxNumber(data.cx_number);
            setHasFetchedData(true);
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

    return (
        <>
            <div className={`crossing-main-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
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
                    <div className="crossing-modal-overlay">
                        <div className={`crossing-modal-content ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                            <p>{confirmAlert.message}</p>
                            <div className="crossing-modal-actions">
                                <button onClick={hideConfirm}>Cancel</button>
                                <button onClick={handleConfirm}>Confirm</button>
                            </div>
                        </div>
                    </div>
                )}
                
                <h2 className={`crossing-title ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                    {mode === 'add' && 'Create New Crossing Statement'}
                    {mode === 'view' && 'View Crossing Statement'}
                    {mode === 'update' && 'Update Crossing Statement'}
                    {mode === 'delete' && 'Delete Crossing Statement'}
                </h2>

                {(mode === 'view' || mode === 'update' || mode === 'delete') && (
                    <div className={`crossing-search-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                        <form onSubmit={handleSearch}>
                            <div className="crossing-search-header">
                                <h3>Search Existing Crossing Statement</h3>
                            </div>
                            <div className={`crossing-search-group ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                <div className="crossing-search-inputs">
                                    <div className="crossing-search-field">
                                        <label className={`crossing-search-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>CX Number</label>
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            required
                                            className={`crossing-search-input ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                                            placeholder="Enter number (e.g., 123)"
                                        />
                                    </div>
                                    <div className="crossing-search-field">
                                        <label className={`crossing-search-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Year</label>
                                        <select 
                                            value={searchYear} 
                                            onChange={(e) => setSearchYear(e.target.value)} 
                                            className={`crossing-search-select ${isLightMode ? 'light-mode' : 'dark-mode'}`}
                                        >
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                    <div className="crossing-search-field">
                                        <label className={`crossing-search-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>&nbsp;</label>
                                        <button type="submit" className={`crossing-search-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                            <IoSearch className={`crossing-search-icon ${isLightMode ? 'light-mode' : 'dark-mode'}`}/>
                                            Search
                                        </button>
                                    </div>
                                </div>
                                <div className="crossing-search-preview">
                                    {formatCXNumber(searchTerm, searchYear) && (
                                        <span className="crossing-preview">
                                            Preview: <strong>{formatCXNumber(searchTerm, searchYear)}</strong>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {(mode === 'add' || hasFetchedData) && (
                    <div id="crossing-printable-area">
                        <div className={`crossing-form-container ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                            <div className={`crossing-input-box ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                <div className={`crossing-form ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                    <div className="crossing-form-row">
                                        <div className={`crossing-form-group`}>
                                            <label className={`crossing-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>CX Number</label>
                                            <div className={`crossing-form-value ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{cxNumber || 'Generated by backend'}</div>
                                        </div>
                                        <div className={`crossing-form-group`}>
                                            <label className={`crossing-form-label ${isLightMode ? 'light-mode' : 'dark-mode'}`}>Date</label>
                                            <input type="date" name="date" value={formData.date} onChange={handleChange} required className={`crossing-form-input ${isLightMode ? 'light-mode' : 'dark-mode'}`} readOnly={mode==='view'} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`crossing-table-container`}>
                            <table className={`crossing-table ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                <thead>
                                    <tr className={`crossing-table-header ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                        <th>Index</th><th>Builty No</th><th>Destination</th>
                                        <th>Units</th><th>Weight</th><th>To Pay</th><th>Paid</th>
                                        {(mode === 'add' || mode === 'update') && <th className="no-print">Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, index) => (
                                        <tr key={index} className={`crossing-table-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                            <td className="text-center">{row.index}</td>
                                            <td>
                                                {(mode === 'add' || mode === 'update') ? (
                                                    <input type="text" value={row.builty_no} onChange={(e) => handleTableChange(index, 'builty_no', e.target.value)} className={`crossing-table-input ${isLightMode ? 'light-mode' : 'dark-mode'}`} />
                                                ) : <div className="text-center">{row.builty_no || '-'}</div>}
                                            </td>
                                            <td className="text-center">{row.destination || '-'}</td>
                                            <td className="text-center">{row.units || '-'}</td>
                                            <td className="text-center">{row.weight || '-'}</td>
                                            <td className="text-center">{row.to_pay != null ? Number(row.to_pay) : '-'}</td>
                                            <td className="text-center">{row.paid != null ? Number(row.paid) : '-'}</td>
                                            {(mode === 'add' || mode === 'update') && (
                                                <td className="text-center no-print">
                                                    <button type="button" onClick={() => deleteRow(index)} className={`crossing-delete-row-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}><IoTrash /></button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {rows.some(row => row.builty_no) && (
                                        <tr className={`crossing-table-total-row ${isLightMode ? 'light-mode' : 'dark-mode'}`}>
                                            <td className="text-center">Total</td><td colSpan="2"></td>
                                            <td className="text-center">{calculateTotals().units}</td>
                                            <td className="text-center">{calculateTotals().weight}</td>
                                            <td className="text-center">{calculateTotals().to_pay}</td>
                                            <td className="text-center">{calculateTotals().paid}</td>
                                            {(mode === 'add' || mode === 'update') && <td></td>}
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {(mode === 'add' || mode === 'update') && (
                            <div className={`crossing-add-more-container no-print`}>
                                <button type="button" onClick={addMoreRows} className={`crossing-add-more-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}><IoAdd /> Add 5 More Rows</button>
                            </div>
                        )}
                    </div>
                )}

                {(mode === 'add' || hasFetchedData) && (
                    <div className={`crossing-submit-container no-print`}>
                        {(mode === 'add' || mode === 'update') && <button type="button" onClick={handleSubmit} disabled={isLoading} className={`crossing-submit-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{isLoading ? 'Saving...' : (mode === 'add' ? 'Save Crossing Statement' : 'Update Crossing Statement')}</button>}
                        {mode === 'delete' && <button type="button" onClick={handleDelete} disabled={isLoading} className={`crossing-delete-button ${isLightMode ? 'light-mode' : 'dark-mode'}`}>{isLoading ? 'Deleting...' : 'Delete Crossing Statement'}</button>}
                    </div>
                )}

                {isLoading && (
                    <div className={`crossing-loading-overlay`}>
                        <div className={`crossing-loading-spinner ${isLightMode ? 'light-mode' : 'dark-mode'}`}></div>
                    </div>
                )}
            </div>
        </>
    );
};

export default CrossingStatement;