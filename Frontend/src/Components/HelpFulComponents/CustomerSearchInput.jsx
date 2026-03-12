import React, { useState, useRef } from 'react';

const SCROLLBAR_CLASS = "custom-scrollbar";

const CustomerSearchInput = ({
  name,
  value,
  onChange,
  onSelect,
  type,
  placeholder = "",
  className = "invoice-input customer-input fixed-input",
  isLightMode,
  showGstHighlight = false,
  onOpenCustomerPopup,
  suggestionDisplayField = 'code',      // 'code' or 'id'
  showAddNewButton = true,
  emptyMessage = "No matching customers found.",
  disabled = false,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounce utility
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const searchCustomers = async (query) => {
    if (!query) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const response = await fetch(
        `http://43.230.202.198:3000/api/customers/search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);

      // Auto-select if exactly one match and it matches the input (case‑insensitive)
      if (data.length === 1) {
        const customer = data[0];
        const trimmedQuery = query.trim().toLowerCase();

        if (showGstHighlight) {
          // For GST fields, compare with ID number
          if (customer.id_number && customer.id_number.toLowerCase() === trimmedQuery) {
            onSelect(customer);
            setShowSuggestions(false);
          }
        } else {
          // For name fields, compare with name
          if (customer.name.toLowerCase() === trimmedQuery) {
            onSelect(customer);
            setShowSuggestions(false);
          }
        }
      }
    } catch (err) {
      console.error('Search error:', err);
      setSuggestions([]);
    }
  };

  const debouncedSearch = useRef(debounce(searchCustomers, 300)).current;

  const handleInputChange = (e) => {
    onChange(e);
    debouncedSearch(e.target.value);
  };

  const handleFocus = () => {
    if (value) debouncedSearch(value);
  };

  const handleBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSuggestionClick = (customer) => {
    onSelect(customer);
    setShowSuggestions(false);
  };

  // Render suggestion item with highlighting
  const renderSuggestionItem = (customer) => {
    if (showGstHighlight) {
      // Highlight GST number
      const inputVal = value.toLowerCase();
      const gstNumber = customer.id_number || '';
      const gstLower = gstNumber.toLowerCase();
      const matchIndex = inputVal ? gstLower.indexOf(inputVal) : -1;

      const displayName = customer.name.length > 15
        ? customer.name.substring(0, 15) + '...'
        : customer.name;

      return (
        <>
          {matchIndex === -1 ? (
            <span className="suggestion-rest">{gstNumber}</span>
          ) : (
            <>
              {matchIndex > 0 && (
                <span className="suggestion-rest">{gstNumber.substring(0, matchIndex)}</span>
              )}
              <span className="suggestion-prefix">
                {gstNumber.substring(matchIndex, matchIndex + inputVal.length)}
              </span>
              {matchIndex + inputVal.length < gstNumber.length && (
                <span className="suggestion-rest">
                  {gstNumber.substring(matchIndex + inputVal.length)}
                </span>
              )}
            </>
          )}
          <span className="customer-code">
            {' '}– {displayName}
          </span>
        </>
      );
    } else {
      // Highlight name
      const inputVal = value.toLowerCase();
      const name = customer.name;
      const lowerName = name.toLowerCase();
      const matchIndex = lowerName.indexOf(inputVal);

      const displayField = suggestionDisplayField === 'code'
        ? customer.customer_code
        : customer.id_number || '';

      if (matchIndex === -1) {
        return (
          <>
            <span className="suggestion-rest">{name}</span>
            <span className="customer-code"> – {displayField}</span>
          </>
        );
      }

      const beforeMatch = name.substring(0, matchIndex);
      const match = name.substring(matchIndex, matchIndex + inputVal.length);
      const afterMatch = name.substring(matchIndex + inputVal.length);

      return (
        <>
          {beforeMatch && <span className="suggestion-rest">{beforeMatch}</span>}
          <span className="suggestion-prefix">{match}</span>
          {afterMatch && <span className="suggestion-rest">{afterMatch}</span>}
          <span className="customer-code"> – {displayField}</span>
        </>
      );
    }
  };

  const noSuggestionsContent = showAddNewButton ? (
    <>
      No matching customers found.
      <button
        className="add-customer-btn"
        onClick={() => onOpenCustomerPopup(type)}
      >
        Add New Customer
      </button>
    </>
  ) : (
    emptyMessage
  );

  return (
    <div className="search-container" style={{ display: "inline-block", position: "relative", width: "66%" }}>
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
      {showSuggestions && suggestions.length > 0 && (
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
          {suggestions.map((customer, index) => (
            <li
              key={index}
              className="suggestion-item customer-suggestion-item"
              onClick={() => handleSuggestionClick(customer)}
            >
              {renderSuggestionItem(customer)}
            </li>
          ))}
        </ul>
      )}
      {showSuggestions && suggestions.length === 0 && (
        <div
          className="no-suggestions"
          style={{
            position: 'absolute',
            background: 'white',
            border: '1px solid #ccc',
            zIndex: 1000,
            padding: '5px'
          }}
        >
          {noSuggestionsContent}
        </div>
      )}
    </div>
  );
};

export default CustomerSearchInput;
