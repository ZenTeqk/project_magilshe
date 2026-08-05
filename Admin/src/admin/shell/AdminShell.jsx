import React,{useMemo,useRef,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faBars,faBell,faChartLine,faChevronLeft,faChevronRight,faCircleQuestion,faGear,faGlobe,faIndustry,faMoon,faPlus,faSun} from "@fortawesome/free-solid-svg-icons";
import {AdminThemeController,AdminThemeProvider,Breadcrumb,IconButton,PrimaryButton,SearchBar,Sidebar,ToastProvider,TopBar,useAdminTheme,useMediaQuery} from "../design-system";
import DataContext from "../../context/DataContext";
import MainContext from "../../context/MainContext";
import Logout from "../../components/login/Logout";
import logo from "../../assets/img/tcc-logo.png";
import {NavigationProvider,useAdminNavigation} from "./NavigationContext";
import "./AdminShell.scss";
import "./crmWorkspace.scss";

const shellIcons={website:faGlobe,operations:faIndustry,reports:faChartLine,"configuration-group":faGear,help:faCircleQuestion};
const withRenderedIcons=nodes=>nodes.map(node=>({...node,icon:(node.icon||shellIcons[node.key])?<FontAwesomeIcon icon={node.icon||shellIcons[node.key]}/>:null,children:node.children?withRenderedIcons(node.children):undefined}));

const ShellSearch=()=>{
  const {searchableRoutes,recentRoutes,goTo}=useAdminNavigation();
  const [query,setQuery]=useState(""),[open,setOpen]=useState(false);
  const results=useMemo(()=>{const term=query.trim().toLowerCase();return term?searchableRoutes.filter(route=>route.searchText.includes(term)).slice(0,8):recentRoutes;},[query,recentRoutes,searchableRoutes]);
  const choose=route=>{goTo(route.href||route.link);setQuery("");setOpen(false);};
  return <div className="mads-shell-search" onBlur={event=>!event.currentTarget.contains(event.relatedTarget)&&setOpen(false)}>
    <SearchBar value={query} onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setOpen(true);}} onClear={()=>setQuery("")} placeholder="Search modules" label="Search Admin navigation"/>
    {open&&<div className="mads-shell-search-results" role="listbox" aria-label={query?"Navigation results":"Recently visited pages"}>
      {!query&&results.length>0&&<div className="mads-shell-search-heading">Recently visited</div>}
      {results.length?results.map(route=><button type="button" role="option" aria-selected="false" className="mads-shell-search-result" key={route.href||route.key} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(route)}>{route.label}<small>{route.href||route.link}</small></button>):<div className="mads-shell-search-empty">No matching module</div>}
    </div>}
  </div>;
};

const QuickActions=()=>{const {quickActions,goTo}=useAdminNavigation(),[open,setOpen]=useState(false);return <div className="mads-quick" onBlur={event=>!event.currentTarget.contains(event.relatedTarget)&&setOpen(false)}><PrimaryButton icon={<FontAwesomeIcon icon={faPlus}/>} aria-haspopup="menu" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>Create</PrimaryButton>{open&&<div className="mads-quick__menu" role="menu">{quickActions.map(action=><button type="button" role="menuitem" className="mads-quick__item" key={action.key} onClick={()=>{setOpen(false);goTo(action.href);}}>{action.label}</button>)}</div>}</div>};
const ThemeToggle=()=>{const {resolvedTheme,toggleTheme}=useAdminTheme(),next=resolvedTheme==="dark"?"light":"dark";return <IconButton label={`Switch to ${next} mode`} onClick={toggleTheme}><FontAwesomeIcon icon={resolvedTheme==="dark"?faSun:faMoon}/></IconButton>};

const AdminShellFrame=({children,setSigned,setMountLogin})=>{
  const {navigation,activeNavigationKey,breadcrumbs,pageTitle,goTo}=useAdminNavigation();
  const compact=useMediaQuery("(max-width: 899px)"),[mobileOpen,setMobileOpen]=useState(false),[collapsed,setCollapsed]=useState(()=>localStorage.getItem("adminShellCollapsed")==="true");
  const touchStart=useRef(null);
  const nav=useMemo(()=>withRenderedIcons(navigation),[navigation]);
  const toggleCollapsed=()=>setCollapsed(value=>{localStorage.setItem("adminShellCollapsed",String(!value));return !value;});
  const go=item=>{goTo(item.href);setMobileOpen(false);};
  return <AdminThemeProvider className="mads-shell-frame">
    <AdminThemeProvider className="mads-shell-sidebar-boundary" onTouchStart={event=>{touchStart.current=event.touches[0]?.clientX;}} onTouchEnd={event=>{const end=event.changedTouches[0]?.clientX;if(compact&&touchStart.current!==null&&end-touchStart.current < -60)setMobileOpen(false);touchStart.current=null;}}>
      {compact&&mobileOpen&&<button className="mads-shell-backdrop" aria-label="Close navigation" onClick={()=>setMobileOpen(false)}/>} 
      <Sidebar brand={<div className="mads-shell-brand"><img src={logo} alt="Magilshe"/><span className="mads-nav-label">Magilshe</span></div>} items={nav} activeKey={activeNavigationKey} onNavigate={go} collapsed={!compact&&collapsed} open={mobileOpen}/>
      {!compact&&<button type="button" className="mads-sidebar-edge-toggle" aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} title={collapsed?"Expand sidebar":"Collapse sidebar"} aria-expanded={!collapsed} onClick={toggleCollapsed}><FontAwesomeIcon icon={collapsed?faChevronRight:faChevronLeft}/><span className="mads-sidebar-edge-toggle__label">{collapsed?"Expand":"Collapse"}</span></button>}
    </AdminThemeProvider>
    <div className="mads-shell-content main-component-section p-0">
      <AdminThemeProvider className="mads-shell-topbar-boundary"><TopBar menuButton={<IconButton label="Open navigation" className="mads-mobile-menu" onClick={()=>setMobileOpen(true)}><FontAwesomeIcon icon={faBars}/></IconButton>} breadcrumbs={<><Breadcrumb items={breadcrumbs.map(item=>({...item,onClick:event=>{event.preventDefault();goTo(item.href);}}))}/><div className="mads-shell-page-title">{pageTitle}</div></>} search={<ShellSearch/>} actions={<><QuickActions/><ThemeToggle/><IconButton label="Notifications"><FontAwesomeIcon icon={faBell}/></IconButton></>} userMenu={<Logout setSigned={setSigned} setMountLogin={setMountLogin}/>}/></AdminThemeProvider>
      <section className="main-component mads-shell-legacy-content">{children}</section>
    </div>
  </AdminThemeProvider>;
};

export const AdminShell=props=>{const {RoutesList}=React.useContext(DataContext),{userRole}=React.useContext(MainContext);return <AdminThemeController><ToastProvider><NavigationProvider routes={RoutesList} userRole={userRole}><AdminShellFrame {...props}/></NavigationProvider></ToastProvider></AdminThemeController>};
export default AdminShell;
