import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface StoreContextType {
  storeId: string;
  setStoreId: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [storeId, setStoreIdState] = useState<string>(() => {
    return localStorage.getItem("vcomm-store_storeId") || "";
  });

  const setStoreId = (id: string) => {
    setStoreIdState(id);
    localStorage.setItem("vcomm-store_storeId", id);
  };

  return (
    <StoreContext.Provider value={{ storeId, setStoreId }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreId() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStoreId must be used within a StoreProvider");
  }
  return context;
}
