// src/services/yoloDamageService.js
import api from './api';

class YOLODamageService {
  
  /**
   * Analyse une image avec YOLO et retourne les détections + image annotée
   */
  async analyzeDamage(imageFile, claimType) {
    const formData = new FormData();
    formData.append('photo', imageFile);
    formData.append('claim_type', claimType);
    
    try {
      const response = await api.post('/unified-yolo/assess', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000 // 60 secondes pour l'analyse
      });
      
      return response.data;
    } catch (error) {
      console.error('Erreur analyse YOLO:', error);
      return {
        success: false,
        error: error.message,
        message: 'Erreur lors de l\'analyse'
      };
    }
  }
  
  /**
   * Détection simple sans estimation
   */
  async detectOnly(imageFile, claimType) {
    const formData = new FormData();
    formData.append('photo', imageFile);
    formData.append('claim_type', claimType);
    
    try {
      const response = await api.post('/unified-yolo/detect', formData);
      return response.data;
    } catch (error) {
      console.error('Erreur détection:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new YOLODamageService();