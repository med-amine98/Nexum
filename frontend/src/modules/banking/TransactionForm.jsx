// frontend/src/components/Banking/TransactionForm.jsx
import React, { useState } from 'react';
import { uploadBankTransaction, detectFraud } from '../../services/minioService';

const TransactionForm = () => {
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState({
    amount: '',
    type: 'virement',
    recipient: '',
    reference: ''
  });
  const [fraudResult, setFraudResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFraudResult(null);
    
    try {
      // 1. Upload de la transaction
      const uploadResult = await uploadBankTransaction(transaction);
      
      if (uploadResult.success) {
        // 2. Détection de fraude
        const fraudResult = await detectFraud(uploadResult.file_id, 'bank');
        setFraudResult(fraudResult.result);
        
        alert(`✅ Transaction uploadée: ${uploadResult.file_id}`);
        setTransaction({ amount: '', type: 'virement', recipient: '', reference: '' });
      } else {
        alert(`❌ Erreur: ${uploadResult.error}`);
      }
    } catch (error) {
      alert('❌ Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-form">
      <h2>💳 Nouvelle Transaction</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="number"
          placeholder="Montant"
          value={transaction.amount}
          onChange={(e) => setTransaction({...transaction, amount: e.target.value})}
          required
        />
        <select
          value={transaction.type}
          onChange={(e) => setTransaction({...transaction, type: e.target.value})}
        >
          <option value="virement">Virement</option>
          <option value="paiement">Paiement</option>
          <option value="retrait">Retrait</option>
        </select>
        <input
          type="text"
          placeholder="Destinataire"
          value={transaction.recipient}
          onChange={(e) => setTransaction({...transaction, recipient: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Référence"
          value={transaction.reference}
          onChange={(e) => setTransaction({...transaction, reference: e.target.value})}
        />
        <button type="submit" disabled={loading}>
          {loading ? '⏳ Upload...' : '📤 Uploader la transaction'}
        </button>
      </form>
      
      {fraudResult && (
        <div className={`fraud-result ${fraudResult.fraud_level}`}>
          <h3>🔍 Analyse Anti-Fraude</h3>
          <p>Score: {fraudResult.fraud_score}%</p>
          <p>Niveau: {fraudResult.fraud_level}</p>
          <p>Recommandation: {fraudResult.recommendation}</p>
        </div>
      )}
    </div>
  );
};

export default TransactionForm;