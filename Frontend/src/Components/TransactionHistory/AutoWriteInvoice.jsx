import { useEffect } from 'react';
import { formatNumericValue } from '../HelpFulComponents/FormatNumericValue';

const AutoWriteInvoice = ({ consignor, consignee, onData, onError, onLoading }) => {
  useEffect(() => {
    if (!consignor || !consignee) {
      onError?.('Consignor and consignee are required');
      onData?.(null);
      return;
    }

    const fetchLatestInvoice = async () => {
      onLoading?.(true);
      try {
        const url = `http://43.230.202.198:3000/api/transport-records/history?consignor=${encodeURIComponent(consignor)}&consignee=${encodeURIComponent(consignee)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch transport records');
        }

        if (!Array.isArray(data) || data.length === 0) {
          onData?.(null);
          return;
        }

        const sorted = [...data].sort((a, b) => {
          const getLastModified = (record) => {
            // console.log(record);
            const created = new Date(record.created_at);
            const updated = record.updated_at ? new Date(record.updated_at) : null;
            return updated && updated > created ? updated : created;
          };
          return getLastModified(b) - getLastModified(a);
        });

        const latest = sorted[0];
        const formatted = { ...latest };
        ['motor_freight', 'hammali', 'other_charges', 'value_declared'].forEach(field => {
          if (formatted.hasOwnProperty(field)) {
            formatted[field] = formatNumericValue(formatted[field]);
          }
        });

        onData?.(formatted);
      } catch (err) {
        console.error('AutoWriteInvoice error:', err);
        onError?.(err.message);
        onData?.(null);
      } finally {
        onLoading?.(false);
      }
    };

    fetchLatestInvoice();
  }, [consignor, consignee, onData, onError, onLoading]);

  return null;
};

export default AutoWriteInvoice;