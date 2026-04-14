"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface UIContextType {
  isSearchOpen: boolean;
  isCartOpen: boolean;
  isSidebarOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openSearch = useCallback(() => {
    setIsSearchOpen(true);
    setIsCartOpen(false);
    setIsSidebarOpen(false);
  }, []);
  
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const toggleSearch = useCallback(() => setIsSearchOpen(prev => !prev), []);

  const openCart = useCallback(() => {
    setIsCartOpen(true);
    setIsSearchOpen(false);
    setIsSidebarOpen(false);
  }, []);

  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen(prev => !prev), []);

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
    setIsSearchOpen(false);
    setIsCartOpen(false);
  }, []);

  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);

  // Using React.createElement instead of JSX to stay in a .ts file
  return React.createElement(UIContext.Provider, {
    value: {
      isSearchOpen,
      isCartOpen,
      isSidebarOpen,
      openSearch,
      closeSearch,
      toggleSearch,
      openCart,
      closeCart,
      toggleCart,
      openSidebar,
      closeSidebar,
      toggleSidebar
    }
  }, children);
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    return {
      isSearchOpen: false,
      isCartOpen: false,
      isSidebarOpen: false,
      openSearch: () => {},
      closeSearch: () => {},
      toggleSearch: () => {},
      openCart: () => {},
      closeCart: () => {},
      toggleCart: () => {},
      openSidebar: () => {},
      closeSidebar: () => {},
      toggleSidebar: () => {}
    };
  }
  return context;
}

