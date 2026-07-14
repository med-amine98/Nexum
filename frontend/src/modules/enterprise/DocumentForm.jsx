// frontend/src/components/Enterprise/DocumentForm.jsx
import React, { useState } from 'react';
import { uploadEnterpriseDocument, detectFraud } from '../../services/minioService';

const DocumentForm = () => {
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState({
    doc_type: 'quote',
    client: '',
    amount: '',
    products: []
  });
  const [fraudResult, setFraudResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFraudResult(null);
    
    try {
      const documentData = {
        client: document.client,
        amount: parseFloat(document.amount),
        products: document.products.split(',').map(p => p.trim())
      };
      
      const result = await uploadEnterpriseDocument(document.doc_type, documentData);
      
      if (result.success) {
        // Détection de fraude
        const fraudResult = await detectFraud(result.doc_id, 'enterprise');
        setFraudResult(fraudResult.result);
        
        alert(`✅ Document uploadé: ${result.doc_id}`);
        setDocument({ doc_type: 'quote', client: '', amount: '', products: [] });
      } else {
        alert(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      alert('❌ Erreur lors de l\'upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="document-form">
      <h2>🏢 Nouveau Document</h2>
      <form onSubmit={handleSubmit}>
        <select
          value={document.doc_type}
          onChange={(e) => setDocument({...document, doc_type: e.target.value})}
        >
          <option value="quote">📋 Devis</option>
          <option value="invoice">📄 Facture</option>
          <option value="contract">📜 Contrat</option>
          <option value="stock">📦 Stock</option>
        </select>
        <input
          type="text"
          placeholder="Client"
          value={document.client}
          onChange={(e) => setDocument({...document, client: e.target.value})}
          required
        />
        <input
          type="number"
          placeholder="Montant"
          value={document.amount}
          onChange={(e) => setDocument({...document, amount: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="Produits (séparés par des virgules)"
          value={document.products}
          onChange={(e) => setDocument({...document, products: e.target.value})}
        />
        <button type="submit" disabled={loading}>
          {loading ? '⏳ Upload...' : '📤 Uploader le document'}
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

export default DocumentForm;