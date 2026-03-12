import React from 'react';

export const formatNumericValue = (value, isEditing = false) => {
  if (value === '' || value === null || value === undefined) return isEditing ? '' : '—';

  const numValue = Number(value);
  if (isNaN(numValue)) return isEditing ? value : '—';

  if (isEditing) {
    return value;
  } else {
    return numValue % 1 === 0 ? numValue.toString() : numValue.toFixed(2);
  }
};

const FormatNumericValue = ({ value, isEditing = false, className = '' }) => {
  const formatted = formatNumericValue(value, isEditing);
  return <span className={className}>{formatted}</span>;
};

export default FormatNumericValue;
