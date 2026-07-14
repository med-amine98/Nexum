// frontend/src/services/minioService.js
// Service complet pour interagir avec MinIO via le backend

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Configuration des headers avec JWT
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// ============================================
// SECTEUR BANQUE
// ============================================

export const uploadBankTransaction = async (transactionData) => {
  try {
    const response = await fetch(`${API_URL}/banking/upload-transaction-public`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(transactionData)
    });
    return await response.json();
  } catch (error) {
    console.error('Erreur upload transaction:', error);
    throw error;
  }
};

export const uploadKYCDocument = async (file, clientId, documentType) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('client_id', clientId);
  formData.append('document_type', documentType);

  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/banking/upload-kyc`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  return response.json();
};

// ============================================
// SECTEUR ASSURANCE
// ============================================

export const uploadInsuranceClaim = async (claimData, photos = []) => {
  try {
    const formData = new FormData();
    formData.append('claim_data', JSON.stringify(claimData));
    
    photos.forEach((photo, index) => {
      formData.append('files', photo);
    });

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/insurance/upload-claim-public`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    return await response.json();
  } catch (error) {
    console.error('Erreur upload sinistre:', error);
    throw error;
  }
};

export const upload3DModel = async (claimId, modelFile) => {
  const formData = new FormData();
  formData.append('claim_id', claimId);
  formData.append('file', modelFile);

  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/insurance/upload-3d-model`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  return response.json();
};

// ============================================
// SECTEUR ENTREPRISE
// ============================================

export const uploadEnterpriseDocument = async (docType, documentData) => {
  try {
    const response = await fetch(`${API_URL}/enterprise/upload-document-public`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        doc_type: docType,
        document_data: documentData
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Erreur upload document:', error);
    throw error;
  }
};

// ============================================
// FRAUD DETECTION
// ============================================

export const detectFraud = async (fileId, sector) => {
  try {
    const response = await fetch(`${API_URL}/fraud/detect-public`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ file_id: fileId, sector })
    });
    return await response.json();
  } catch (error) {
    console.error('Erreur détection fraude:', error);
    throw error;
  }
};

// ============================================
// WEBHOOKS
// ============================================

export const registerWebhook = async (url, events, sector = null) => {
  try {
    const response = await fetch(`${API_URL}/webhooks/register-public`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ url, events, sector })
    });
    return await response.json();
  } catch (error) {
    console.error('Erreur enregistrement webhook:', error);
    throw error;
  }
};

// ============================================
// RÉCUPÉRATION DES FICHIERS
// ============================================

export const listFiles = async (bucket, prefix = '') => {
  try {
    const response = await fetch(`${API_URL}/minio/list/${bucket}?prefix=${prefix}`, {
      headers: getHeaders()
    });
    return await response.json();
  } catch (error) {
    console.error('Erreur liste fichiers:', error);
    throw error;
  }
};

export const getFileUrl = async (bucket, objectName) => {
  try {
    const response = await fetch(`${API_URL}/minio/url/${bucket}/${objectName}`, {
      headers: getHeaders()
    });
    return await response.json();
  } catch (error) {
    console.error('Erreur get URL:', error);
    throw error;
  }
};

export default {
  uploadBankTransaction,
  uploadKYCDocument,
  uploadInsuranceClaim,
  upload3DModel,
  uploadEnterpriseDocument,
  detectFraud,
  registerWebhook,
  listFiles,
  getFileUrl
};