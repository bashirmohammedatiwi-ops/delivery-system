import React, { createContext, useContext } from 'react';

const TabNavContext = createContext(null);

export function TabNavProvider({ value, children }) {
  return <TabNavContext.Provider value={value}>{children}</TabNavContext.Provider>;
}

export function useTabNav() {
  const ctx = useContext(TabNavContext);
  if (!ctx) throw new Error('useTabNav must be used within TabNavProvider');
  return ctx;
}
