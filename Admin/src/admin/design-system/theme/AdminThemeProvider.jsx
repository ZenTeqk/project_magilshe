import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from "react";
import "./admin-theme.scss";

export const ADMIN_THEME_STORAGE_KEY="magilsheAdminTheme";
const ThemeContext=createContext(null);
const systemTheme=()=>typeof window!=="undefined"&&window.matchMedia?.("(prefers-color-scheme: dark)").matches?"dark":"light";
const validPreference=value=>["light","dark","system"].includes(value)?value:"light";

export const AdminThemeController=({children,defaultPreference="light"})=>{
  const [preference,setPreferenceState]=useState(()=>validPreference(localStorage.getItem(ADMIN_THEME_STORAGE_KEY)||defaultPreference));
  const [system,setSystem]=useState(systemTheme);
  useEffect(()=>{const query=window.matchMedia?.("(prefers-color-scheme: dark)"),update=()=>setSystem(query?.matches?"dark":"light");query?.addEventListener?.("change",update);return()=>query?.removeEventListener?.("change",update);},[]);
  const setPreference=useCallback(value=>{const next=validPreference(value);localStorage.setItem(ADMIN_THEME_STORAGE_KEY,next);setPreferenceState(next);},[]);
  const resolvedTheme=preference==="system"?system:preference;
  useEffect(()=>{document.body.dataset.adminTheme=resolvedTheme;return()=>{delete document.body.dataset.adminTheme;};},[resolvedTheme]);
  const toggleTheme=useCallback(()=>setPreference(resolvedTheme==="dark"?"light":"dark"),[resolvedTheme,setPreference]);
  const value=useMemo(()=>({preference,resolvedTheme,setPreference,toggleTheme}),[preference,resolvedTheme,setPreference,toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAdminTheme=()=>{const value=useContext(ThemeContext);if(!value)throw new Error("useAdminTheme must be used inside AdminThemeController");return value;};
export const useResolvedAdminTheme=()=>useContext(ThemeContext)?.resolvedTheme||"light";

/** Opt-in visual boundary. Legacy siblings remain unaffected. */
export const AdminThemeProvider=({children,className="",theme,...props})=>{const context=useContext(ThemeContext),resolved=theme||context?.resolvedTheme||"light";return <div className={`magilshe-admin-ds ${className}`.trim()} data-theme={resolved} {...props}>{children}</div>;};

export default AdminThemeProvider;
