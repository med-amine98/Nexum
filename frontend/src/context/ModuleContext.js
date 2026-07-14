import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { message } from 'antd';

const ModuleContext = createContext();

const LS_CUSTOM   = 'user_custom_modules';
const LS_HIDDEN   = 'user_hidden_modules';   // ← modules masqués par l'utilisateur
const LS_ACTIVE   = 'activeModules';

// ── Helpers localStorage ──────────────────────────────────────────────────────
const lsGet = (key, fallback = []) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
};
const lsSet = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

export const ModuleProvider = ({ children }) => {
  const [installedModules, setInstalledModules] = useState(() => lsGet(LS_ACTIVE));
  const [customModules,    setCustomModulesRaw]  = useState(() => lsGet(LS_CUSTOM));
  // hiddenModules = clés des modules que l'utilisateur a masqués (survivent au refresh)
  const [hiddenModules,    setHiddenModulesRaw]  = useState(() => lsGet(LS_HIDDEN));
  const [loading, setLoading] = useState(false);

  // ── Setters synchronisés avec localStorage ────────────────────────────────
  const setCustomModules = useCallback((valOrFn) => {
    setCustomModulesRaw(prev => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      const deduped = Array.from(new Set(Array.isArray(next) ? next : []));
      lsSet(LS_CUSTOM, deduped);
      return deduped;
    });
  }, []);

  const setHiddenModules = useCallback((valOrFn) => {
    setHiddenModulesRaw(prev => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      const deduped = Array.from(new Set(Array.isArray(next) ? next : []));
      lsSet(LS_HIDDEN, deduped);
      return deduped;
    });
  }, []);

  // ── Récupérer les modules depuis le serveur ───────────────────────────────
  const fetchInstalledModules = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/modules/installed-keys');
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : [];
      setInstalledModules(list);
      lsSet(LS_ACTIVE, list);
    } catch {
      // Garder l'état courant en cas d'erreur réseau
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomModules = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await api.get('/user/modules');
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : [];
      setCustomModulesRaw(list);
      lsSet(LS_CUSTOM, list);
    } catch {
      // Garder l'état courant — ne pas écraser depuis localStorage
    }
  }, []);

  // ── Masquer / afficher un module (persistance locale garantie) ───────────
  const hideModule = useCallback(async (moduleKey) => {
    // 1. Masquer immédiatement dans l'UI
    setHiddenModules(prev => [...prev, moduleKey]);
    // 2. Retirer de customModules si présent
    setCustomModules(prev => prev.filter(k => k !== moduleKey));
    // 3. Appel API en arrière-plan (best-effort, non bloquant)
    try {
      await api.delete(`/user/modules/${moduleKey}`);
    } catch (err) {
      // L'API peut échouer si le module n'est pas en BDD (module frontend-only)
      // On garde quand même le masquage local — c'est le comportement voulu
      console.warn(`hideModule API warning for ${moduleKey}:`, err?.response?.status);
    }
    // 4. Resync serveur
    try { await fetchCustomModules(); } catch {}
  }, [setHiddenModules, setCustomModules, fetchCustomModules]);

  const showModule = useCallback((moduleKey) => {
    setHiddenModules(prev => prev.filter(k => k !== moduleKey));
  }, [setHiddenModules]);

  // ── Ajouter un module ─────────────────────────────────────────────────────
  const addCustomModule = useCallback(async (moduleKey) => {
    if (customModules.includes(moduleKey)) {
      message.info('Ce module est déjà dans votre espace');
      return { success: false, alreadyExists: true };
    }
    // Si le module était masqué, le réafficher
    showModule(moduleKey);
    setCustomModules(prev => [...prev, moduleKey]);

    try {
      await api.post(`/modules/${moduleKey}/buy`);
      message.success('Module ajouté avec succès');
      await fetchCustomModules();
      return { success: true };
    } catch (err) {
      if (err.response?.status === 409) {
        await fetchCustomModules();
        return { success: true };
      }
      setCustomModules(prev => prev.filter(k => k !== moduleKey));
      message.error("Erreur lors de l'ajout du module");
      return { success: false };
    }
  }, [customModules, fetchCustomModules, setCustomModules, showModule]);

  // ── Supprimer / masquer un module ─────────────────────────────────────────
  const removeCustomModule = useCallback(async (moduleKey) => {
    // Déléguer à hideModule qui gère tout
    await hideModule(moduleKey);
    message.success('Module retiré du sidebar');
    return { success: true };
  }, [hideModule]);

  // ── Toggle module premium ─────────────────────────────────────────────────
  const toggleModule = async (moduleKeyOrId) => {
    setLoading(true);
    try {
      const res = await api.post(`/modules/${moduleKeyOrId}/install`);
      const { is_installed } = res.data;
      await fetchInstalledModules();
      window.dispatchEvent(new Event('modulesChanged'));
      message.success(is_installed ? 'Module activé' : 'Module désactivé');
      return { success: true, isInstalled: is_installed };
    } catch {
      setInstalledModules(prev => {
        const on = prev.includes(moduleKeyOrId);
        const next = on ? prev.filter(k => k !== moduleKeyOrId) : [...prev, moduleKeyOrId];
        lsSet(LS_ACTIVE, next);
        window.dispatchEvent(new Event('modulesChanged'));
        return next;
      });
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  const isInstalled   = (key) => installedModules.includes(key);
  const isCustomModule = (key) => customModules.includes(key);
  const isHidden      = (key) => hiddenModules.includes(key);

  useEffect(() => {
    fetchInstalledModules();
    fetchCustomModules();
  }, [fetchInstalledModules, fetchCustomModules]);

  return (
    <ModuleContext.Provider value={{
      installedModules,
      customModules,
      hiddenModules,
      setCustomModules,
      loading,
      fetchInstalledModules,
      fetchCustomModules,
      toggleModule,
      addCustomModule,
      removeCustomModule,
      hideModule,
      showModule,
      isInstalled,
      isCustomModule,
      isHidden,
    }}>
      {children}
    </ModuleContext.Provider>
  );
};

export const useModules = () => {
  const context = useContext(ModuleContext);
  if (!context) throw new Error('useModules must be used within a ModuleProvider');
  return context;
};