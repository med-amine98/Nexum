// src/utils/eventDispatcher.js
export const dispatchModuleEvent = (type, detail = {}) => {
  const event = new CustomEvent(type, { detail });
  window.dispatchEvent(event);
};
