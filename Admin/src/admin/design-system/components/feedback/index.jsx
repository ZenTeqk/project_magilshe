import React,{createContext,useCallback,useContext,useEffect,useId,useMemo,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {IconButton} from "../common";
import {useResolvedAdminTheme} from "../../theme/AdminThemeProvider";
import "./feedback.scss";

export const EmptyState=({icon="○",title="Nothing here yet",description,action})=><div className="mads-state"><div className="mads-state__icon" aria-hidden="true">{icon}</div><h3>{title}</h3>{description&&<p>{description}</p>}{action&&<div className="mads-state__action">{action}</div>}</div>;
export const LoadingState=({label="Loading"})=><div className="mads-state" role="status" aria-live="polite"><div className="mads-loading-dots" aria-hidden="true"><span/><span/><span/></div><p>{label}…</p></div>;
const Skeleton=({className="",...props})=><span className={`mads-skeleton ${className}`.trim()} aria-hidden="true" {...props}/>;
export const SkeletonCards=({count=4,announce=true})=><div className="mads-skeleton-grid" role={announce?"status":undefined} aria-label={announce?"Loading summary":undefined}>{Array.from({length:count},(_,index)=><div className="mads-skeleton-card" key={index}><Skeleton className="mads-skeleton--label"/><Skeleton className="mads-skeleton--value"/><Skeleton className="mads-skeleton--text"/></div>)}</div>;
export const SkeletonTable=({rows=5,columns=5,announce=true,ariaLabel="Loading table"})=><div className="mads-skeleton-table" role={announce?"status":undefined} aria-label={announce?ariaLabel:undefined}>{Array.from({length:rows+1},(_,row)=><div className="mads-skeleton-table__row" key={row}>{Array.from({length:columns},(_,column)=><Skeleton className={row===0?"mads-skeleton--label":"mads-skeleton--text"} key={column}/>)}</div>)}</div>;
export const SkeletonForm=({fields=6})=><div className="mads-skeleton-form" role="status" aria-label="Loading form">{Array.from({length:fields},(_,index)=><div key={index}><Skeleton className="mads-skeleton--label"/><Skeleton className="mads-skeleton--field"/></div>)}</div>;
export const SkeletonDashboard=()=> <div className="mads-skeleton-dashboard" role="status" aria-label="Loading dashboard"><SkeletonCards announce={false}/><div className="mads-skeleton-dashboard__body"><SkeletonTable rows={6} columns={4} announce={false}/><SkeletonCards count={2} announce={false}/></div></div>;

const DialogFrame=({kind,title,open,onClose,children,footer})=>{
  const titleId=useId(),panelRef=useRef(null),resolvedTheme=useResolvedAdminTheme();
  // Keep the latest onClose reachable from the effect below without putting it
  // in the dependency array: onClose is typically a fresh inline arrow fn on
  // every parent render (e.g. onClose={()=>setState(null)}), and every
  // keystroke inside the dialog's own inputs re-renders that parent. If
  // onClose were a dependency, the effect would tear down and re-run on every
  // keystroke — its cleanup restores focus to the pre-open element and its
  // setup re-focuses the dialog's first focusable node, yanking focus out of
  // whatever input the user is actively typing in. Depending on [open] only
  // keeps the effect (and the focus it manages) stable while typing.
  const onCloseRef=useRef(onClose);
  useEffect(()=>{onCloseRef.current=onClose;});
  useEffect(()=>{if(!open)return undefined;const previous=document.activeElement,previousOverflow=document.body.style.overflow;document.body.style.overflow="hidden";const handleKey=event=>{if(event.key==="Escape")onCloseRef.current?.();if(event.key==="Tab"&&panelRef.current){const focusable=[...panelRef.current.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')];if(!focusable.length){event.preventDefault();panelRef.current.focus();return;}const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};document.addEventListener("keydown",handleKey);requestAnimationFrame(()=>panelRef.current?.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')?.focus()||panelRef.current?.focus());return()=>{document.removeEventListener("keydown",handleKey);document.body.style.overflow=previousOverflow;previous?.focus?.();};},[open]);
  if(!open)return null;
  return createPortal(<div className="magilshe-admin-ds mads-overlay" data-theme={resolvedTheme} role="presentation" onMouseDown={event=>event.target===event.currentTarget&&onClose?.()}><section ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={kind==="drawer"?"mads-drawer":"mads-modal"}><header className="mads-dialog__header"><h2 id={titleId}>{title}</h2><IconButton label="Close" onClick={onClose}>×</IconButton></header><div className="mads-dialog__body">{children}</div>{footer&&<footer className="mads-dialog__footer">{footer}</footer>}</section></div>,document.body);
};
export const Modal=props=><DialogFrame kind="modal" {...props}/>;
export const Drawer=props=><DialogFrame kind="drawer" {...props}/>;
export const ConfirmationDialog=({open,title,description,confirmLabel="Confirm",cancelLabel="Cancel",tone="default",loading=false,onConfirm,onCancel,children})=><Modal open={open} title={title} onClose={loading?undefined:onCancel} footer={<><button type="button" className="mads-button mads-button--secondary" disabled={loading} onClick={onCancel}>{cancelLabel}</button><button type="button" className={`mads-button mads-button--${tone==="warning"?"danger":"primary"}`} disabled={loading} onClick={onConfirm}>{loading?"Working…":confirmLabel}</button></>}><p className="mads-confirmation__description">{description}</p>{children}</Modal>;

const ToastContext=createContext(null);
export const ToastProvider=({children,duration=5000})=>{const [toasts,setToasts]=useState([]),resolvedTheme=useResolvedAdminTheme();const dismiss=useCallback(id=>setToasts(items=>items.filter(item=>item.id!==id)),[]);const notify=useCallback((tone,message,options={})=>{const id=options.id||`${Date.now()}-${Math.random()}`;setToasts(items=>[...items,{id,tone,message,title:options.title}]);if(options.duration!==0)setTimeout(()=>dismiss(id),options.duration??duration);return id;},[dismiss,duration]);const value=useMemo(()=>({notify,dismiss,success:(message,options)=>notify("success",message,options),error:(message,options)=>notify("error",message,options),warning:(message,options)=>notify("warning",message,options),info:(message,options)=>notify("info",message,options)}),[dismiss,notify]);return <ToastContext.Provider value={value}>{children}{createPortal(<div className="magilshe-admin-ds mads-toast-region" data-theme={resolvedTheme} role="region" aria-label="Notifications">{toasts.map(toast=><div key={toast.id} className={`mads-toast mads-toast--${toast.tone}`} role={toast.tone==="error"?"alert":"status"}><div>{toast.title&&<strong>{toast.title}</strong>}<p>{toast.message}</p></div><IconButton label="Dismiss notification" onClick={()=>dismiss(toast.id)}>×</IconButton></div>)}</div>,document.body)}</ToastContext.Provider>};
export const useToast=()=>{const context=useContext(ToastContext);if(!context)throw new Error("useToast must be used inside ToastProvider");return context;};
