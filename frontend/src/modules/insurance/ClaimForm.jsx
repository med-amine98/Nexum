// frontend/src/components/Insurance/ClaimForm.jsx
import React, { useState } from 'react';
import { uploadInsuranceClaim, detectFraud } from '../../services/minioService';

const ClaimForm = () => {
  const [loading, setLoading] = useState(false);
  const [claim, setClaim] = useState({
    client_name: '',
    incident_type: 'accident_auto',
    amount: '',
    description: '',
    date: ''
  });
  const [photos, setPhotos] = useState([]);
  const [fraudResult, setFraudResult] = useState(null);

  const handleFileChange = (e) => {
    setPhotos([...e.target.files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFraudResult(null);
    
    try {
      const result = await uploadInsuranceClaim(claim, photos);
      
      if (result.success) {
        // Détection de fraude
        const fraudResult = await detectFraud(result.claim_id, 'insurance');
        setFraudResult(fraudResult.result);
        
        alert(`✅ Sinistre uploadé: ${result.claim_id}`);
        setClaim({ client_name: '', incident_type: 'accident_auto', amount: '', description: '', date: '' });
        setPhotos([]);
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
    <div className="claim-form">
      <h2>🛡️ Nouveau Sinistre</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Client"
          value={claim.client_name}
          onChange={(e) => setClaim({...claim, client_name: e.target.value})}
          required
        />
        <select
          value={claim.incident_type}
          onChange={(e) => setClaim({...claim, incident_type: e.target.value})}
        >
          <option value="accident_auto">Accident Auto</option>
          <option value="accident_maison">Accident Maison</option>
          <option value="sante">Santé</option>
          <option value="autre">Autre</option>
        </select>
        <input
          type="number"
          placeholder="Montant"
          value={claim.amount}
          onChange={(e) => setClaim({...claim, amount: e.target.value})}
          required
        />
        <input
          type="date"
          value={claim.date}
          onChange={(e) => setClaim({...claim, date: e.target.value})}
        />
        <textarea
          placeholder="Description"
          value={claim.description}
          onChange={(e) => setClaim({...claim, description: e.target.value})}
        />
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
        />
        {photos.length > 0 && <p>📸 {photos.length} photo(s) sélectionnée(s)</p>}
        <button type="submit" disabled={loading}>
          {loading ? '⏳ Upload...' : '📤 Uploader le sinistre'}
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

export default ClaimForm;