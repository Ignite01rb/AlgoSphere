import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AppContextType {
  activeGroup: number | null;
  setActiveGroup: (id: number | null) => void;
  showCreateGroup: boolean;
  setShowCreateGroup: (show: boolean) => void;
  showDiscover: boolean;
  setShowDiscover: (show: boolean) => void;
  activeTab: "overview" | "members";
  setActiveTab: (tab: "overview" | "members") => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [activeGroup, setActiveGroup] = useState<number | null>(() => {
    const stored = localStorage.getItem("algosphere-active-group");
    return stored ? Number(stored) : null;
  });
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "members">("overview");

  useEffect(() => {
    if (activeGroup) {
      localStorage.setItem("algosphere-active-group", String(activeGroup));
    } else {
      localStorage.removeItem("algosphere-active-group");
    }
  }, [activeGroup]);

  return (
    <AppContext.Provider
      value={{
        activeGroup,
        setActiveGroup,
        showCreateGroup,
        setShowCreateGroup,
        showDiscover,
        setShowDiscover,
        activeTab,
        setActiveTab,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
