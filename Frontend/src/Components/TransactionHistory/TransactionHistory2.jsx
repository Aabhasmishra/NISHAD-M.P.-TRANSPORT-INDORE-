import React, { useState, useEffect } from 'react';

const TransactionHistory2 = ({
  consignorName,
  consigneeName,
  paymentType,
  noOfArticles,
  saidToContain,
  taxFree,
  weightChargeable,
  actualWeight,
  hsn,
  amount,
  remarks,
  differentOrNot,
  onComplete 
}) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const processData = async () => {
      setLoading(true);
      setError('');
      
      try {
        if (differentOrNot !== undefined) {
          await handlePaymentTypeCheck();
        } else if (hsn && noOfArticles !== undefined) {
          await handleSaidToContainLookup();
        }

        if (result && onComplete) {
          onComplete(result);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    processData();
  }, [consignorName, consigneeName, paymentType, hsn, noOfArticles, differentOrNot]);

  const handlePaymentTypeCheck = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/transport-records/history?consignor=${encodeURIComponent(consignorName)}&consignee=${encodeURIComponent(consigneeName)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch latest transaction');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const latestRecord = data[0];
        const latestPaymentType = latestRecord.paid == 0 ? 'TO PAY' : 'PAID';
        
        const isDifferent = paymentType !== latestPaymentType;
        
        setResult({
          differentOrNot: isDifferent ? 1 : 0
        });
      } else {
        // No previous records found
        setResult({
          differentOrNot: 1
        });
      }
    } catch (err) {
      throw new Error(`Error checking payment type: ${err.message}`);
    }
  };

  const handleSaidToContainLookup = async () => {
    try {
      // Fetch transaction history between consignor and consignee
      const response = await fetch(
        `http://localhost:3000/api/transport-records/history?consignor=${encodeURIComponent(consignorName)}&consignee=${encodeURIComponent(consigneeName)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch transaction history');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        // Find the latest record that contains the hsn value
        let foundRecord = null;
        let foundIndex = -1;
        
        for (const record of data) {
          if (record.hsn) {
            const hsns = record.hsn.split('|');
            const index = hsns.findIndex(item => item === hsn);
            if (index !== -1) {
              foundRecord = record;
              foundIndex = index;
              break;
            }
          }
        }
        
        if (foundRecord && foundIndex !== -1) {
          // Extract values from the found record at the specific index
          const articleNos = foundRecord.article_no?.split('|') || [];
          const taxFrees = foundRecord.tax_free?.split('|') || [];
          const weightChargeables = foundRecord.weight_chargeable?.split('|') || [];
          const actualWeights = foundRecord.actual_weight?.split('|') || [];
          const hsns = foundRecord.hsn?.split('|') || [];
          const amounts = foundRecord.amount?.split('|') || [];
          const remarksList = foundRecord.remarks?.split('|') || [];
          const saidToContains = foundRecord.said_to_contain?.split('|') || [];
          
          // Get the fetched number of articles
          const fetchedNoOfArticles = articleNos[foundIndex] ? parseInt(articleNos[foundIndex]) : 1;
          
          const fetchedAmount = amounts[foundIndex] ? parseFloat(amounts[foundIndex]) : 0;
          const fetchedWeightChargeable = weightChargeables[foundIndex] ? parseFloat(weightChargeables[foundIndex]) : 0;
          const fetchedActualWeight = actualWeights[foundIndex] ? parseFloat(actualWeights[foundIndex]) : 0;
          
          const calculatedAmount = (fetchedAmount / fetchedNoOfArticles) * noOfArticles;
          const calculatedWeightChargeable = (fetchedWeightChargeable / fetchedNoOfArticles) * noOfArticles;
          const calculatedActualWeight = (fetchedActualWeight / fetchedNoOfArticles) * noOfArticles;
          
          setResult({
            saidToContain: saidToContains[foundIndex] || '',
            taxFree: taxFrees[foundIndex] || '',
            weightChargeable: calculatedWeightChargeable.toString(),
            actualWeight: calculatedActualWeight.toString(),
            hsn: hsns[foundIndex] || '',
            amount: calculatedAmount.toString(),
            remarks: remarksList[foundIndex] || ''
          });
        } else {
          setResult({
            saidToContain: '',
            taxFree: '',
            weightChargeable: '',
            actualWeight: '',
            hsn: '',
            amount: '',
            remarks: ''
          });
        }
      } else {
        setResult({
          saidToContain: '',
          taxFree: '',
          weightChargeable: '',
          actualWeight: '',
          hsn: '',
          amount: '',
          remarks: ''
        });
      }
    } catch (err) {
      throw new Error(`Error looking up HSN: ${err.message}`);
    }
  };

  return null;
};

export default TransactionHistory2;