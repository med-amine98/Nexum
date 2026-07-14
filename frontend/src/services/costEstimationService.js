// src/services/costEstimationService.js
import api from './api';

/**
 * Service d'estimation des coûts pour tous les types de sinistres
 */
class CostEstimationService {
  
  // ========== ESTIMATION PAR TYPE ==========
  
  /**
   * Estimation pour accident automobile
   * @param {File} imageFile - Photo du véhicule
   * @param {Array} detectedParts - Pièces détectées par l'IA
   */
  async estimateAccident(imageFile, detectedParts = []) {
    const formData = new FormData();
    formData.append('photo', imageFile);
    
    try {
      // 1. Analyser l'image avec YOLO
      const analysisResponse = await api.post('/claims/analyze-photo-public', formData);
      const analysis = analysisResponse.data;
      
      // 2. Extraire les pièces détectées ou utiliser celles fournies
      const parts = detectedParts.length > 0 ? detectedParts : analysis.detected_parts || [];
      
      // 3. Estimer les coûts
      const costResponse = await api.post('/estimate/accident', {
        parts: parts,
        region: 'paris'
      });
      
      return {
        success: true,
        analysis: analysis,
        estimation: costResponse.data,
        detected_parts: parts
      };
    } catch (error) {
      console.error('Erreur estimation accident:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Estimation pour sinistre habitation
   * @param {File} imageFile - Photo des dégâts
   */
  async estimateHabitation(imageFile) {
    const formData = new FormData();
    formData.append('photo', imageFile);
    
    try {
      // 1. Analyser l'image
      const analysisResponse = await api.post('/claims/analyze-building-damage-public', formData);
      const analysis = analysisResponse.data;
      
      // 2. Déterminer le type de dégât
      const damageType = analysis.damage_type || 'mur';
      const surface = analysis.severity_score ? Math.min(analysis.severity_score / 10, 50) : 10;
      
      // 3. Estimer les coûts
      const costResponse = await api.post('/estimate/habitation', {
        damage_type: damageType,
        surface_m2: surface
      });
      
      return {
        success: true,
        analysis: analysis,
        estimation: costResponse.data,
        damage_type: damageType
      };
    } catch (error) {
      console.error('Erreur estimation habitation:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Estimation pour sinistre agricole
   * @param {File} imageFile - Photo de la plante/animal
   */
  async estimateAgricole(imageFile) {
    const formData = new FormData();
    formData.append('photo', imageFile);
    
    try {
      // 1. Analyser l'image
      const analysisResponse = await api.post('/claims/analyze-agricole-damage-public', formData);
      const analysis = analysisResponse.data;
      
      // 2. Estimer les coûts
      const costResponse = await api.post('/estimate/agricole', {
        disease_name: analysis.disease_name || 'early_blight'
      });
      
      return {
        success: true,
        analysis: analysis,
        estimation: costResponse.data
      };
    } catch (error) {
      console.error('Erreur estimation agricole:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Estimation pour santé
   * @param {File} imageFile - Photo du document médical
   * @param {string} text - Texte extrait (optionnel)
   */
  async estimateSante(imageFile, text = '') {
    const formData = new FormData();
    formData.append('photo', imageFile);
    
    try {
      // 1. Analyser le document
      const analysisResponse = await api.post('/claims/analyze-medical-document-public', formData);
      const analysis = analysisResponse.data;
      
      // 2. Estimer les coûts
      const careType = analysis.care_type || 'consultation';
      const costResponse = await api.post('/estimate/sante', {
        care_type: careType
      });
      
      return {
        success: true,
        analysis: analysis,
        estimation: costResponse.data
      };
    } catch (error) {
      console.error('Erreur estimation santé:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Estimation générique pour tout type de sinistre
   * @param {File} imageFile - Photo du sinistre
   * @param {string} claimType - Type de sinistre
   */
  async estimateAny(imageFile, claimType) {
    const formData = new FormData();
    formData.append('photo', imageFile);
    
    try {
      // 1. Analyser l'image selon le type
      let analysisResponse;
      switch(claimType) {
        case 'accident':
          analysisResponse = await api.post('/claims/analyze-photo-public', formData);
          break;
        case 'habitation':
          analysisResponse = await api.post('/claims/analyze-building-damage-public', formData);
          break;
        case 'agricole':
          analysisResponse = await api.post('/claims/analyze-agricole-damage-public', formData);
          break;
        case 'sante':
          analysisResponse = await api.post('/claims/analyze-medical-document-public', formData);
          break;
        default:
          analysisResponse = await api.post('/claims/analyze-photo-public', formData);
      }
      
      const analysis = analysisResponse.data;
      
      // 2. Estimer les coûts
      const costResponse = await api.post(`/estimate/any?claim_type=${claimType}`, analysis);
      
      return {
        success: true,
        analysis: analysis,
        estimation: costResponse.data
      };
    } catch (error) {
      console.error('Erreur estimation:', error);
      return { success: false, error: error.message };
    }
  }
  
}

export default new CostEstimationService();