import { createContext, useContext, useState } from "react";

// El visitante no tiene cuenta: los favoritos viven solo en su dispositivo.
const FavContext = createContext({ ids: [], alternar: () => {} });

export function FavProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("favoritos") || "[]"); } catch { return []; }
  });
  const alternar = (id) =>
    setIds((prev) => {
      const nuevo = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("favoritos", JSON.stringify(nuevo)); } catch { /* sin almacenamiento */ }
      return nuevo;
    });
  return <FavContext.Provider value={{ ids, alternar }}>{children}</FavContext.Provider>;
}

export const useFav = () => useContext(FavContext);
