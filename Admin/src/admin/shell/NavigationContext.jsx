import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from "react";
import { matchPath,useLocation,useNavigate } from "react-router-dom";
import { navigationGroups,quickActionConfig,routeAliases,routeLabelOverrides,routeParents } from "./navigationConfig";

const NavigationContext=createContext(null);
const RECENT_STORAGE_KEY="magilsheAdminRecentRoutes";
const canAccess=(route,userRole)=>route?.accessRoles==="all"||route?.accessRoles?.includes(Number(userRole));
const flattenRoutes=routes=>routes.flatMap(route=>route.subMenu?[route,...route.subMenu]:[route]);

export const NavigationProvider=({routes,userRole,children})=>{
  const location=useLocation(),navigate=useNavigate();
  const [pageMeta,setPageMetaState]=useState({pathname:null});
  const [recentRoutes,setRecentRoutes]=useState(()=>{try{return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY)||"[]");}catch{return [];}});
  const currentPageMeta=pageMeta.pathname===location.pathname?pageMeta:{};
  const allRoutes=useMemo(()=>flattenRoutes(routes),[routes]);
  const routeMap=useMemo(()=>Object.fromEntries(allRoutes.map(route=>[route.key,route])),[allRoutes]);
  const activeRoute=useMemo(()=>allRoutes.filter(route=>route.link&&matchPath({path:route.link,end:route.link==="/"},location.pathname)).sort((a,b)=>b.link.length-a.link.length)[0]||null,[allRoutes,location.pathname]);
  const resolveNode=useCallback(node=>{if(typeof node==="string"){const route=routeMap[node];return route&&canAccess(route,userRole)?{key:route.key,label:routeLabelOverrides[route.key]||route.label,href:route.link,icon:route.icon}:null;}const source=node.routeKey?routeMap[node.routeKey]:null;const children=(node.children||(source?.subMenu?.map(item=>item.key))||[]).map(resolveNode).filter(Boolean);if(source&&!canAccess(source,userRole)&&!children.length)return null;return {key:node.key,label:node.label||routeLabelOverrides[source?.key]||source?.label,href:source?.link,icon:node.icon||source?.icon,children:children.length?children:undefined};},[routeMap,userRole]);
  const navigation=useMemo(()=>navigationGroups.map(resolveNode).filter(Boolean),[resolveNode]);
  const activeNavigationKey=routeParents[activeRoute?.key]||activeRoute?.key||"home";
  const breadcrumbs=useMemo(()=>{if(!activeRoute)return [{key:"home",label:"Dashboard",href:"/"}];const parentKey=routeParents[activeRoute.key];const parent=parentKey&&routeMap[parentKey],isCustomerRoute=activeRoute.key?.startsWith("crm-customer");const values=[{key:"home",label:"Dashboard",href:"/"}];if(activeRoute.link?.startsWith("/crm")&&activeRoute.key!=="crm-overview"&&!isCustomerRoute)values.push({key:"crm",label:"CRM",href:"/crm"});if(parent)values.push({key:parent.key,label:routeLabelOverrides[parent.key]||parent.label,href:parent.link});if(activeRoute.key!=="home"&&activeRoute.key!=="crm-overview"&&activeRoute.key!==parent?.key)values.push({key:activeRoute.key,label:currentPageMeta.breadcrumb||routeLabelOverrides[activeRoute.key]||activeRoute.label,href:location.pathname});return values;},[activeRoute,location.pathname,currentPageMeta.breadcrumb,routeMap]);
  const searchableRoutes=useMemo(()=>allRoutes.filter(route=>route.link&&!route.link.includes(":")&&canAccess(route,userRole)).map(route=>({...route,label:routeLabelOverrides[route.key]||route.label,searchText:[routeLabelOverrides[route.key]||route.label,...(routeAliases[route.key]||[])].join(" ").toLowerCase()})),[allRoutes,userRole]);
  const quickActions=useMemo(()=>quickActionConfig.map(action=>{const route=routeMap[action.routeKey];return route&&canAccess(route,userRole)?{...action,href:route.link}:null;}).filter(Boolean),[routeMap,userRole]);
  const goTo=useCallback(target=>navigate(typeof target==="string"?target:target.href),[navigate]);
  const setPageMeta=useCallback(meta=>setPageMetaState(current=>current.pathname===location.pathname?{...current,...meta}:{pathname:location.pathname,...meta}),[location.pathname]);
  useEffect(()=>{if(!activeRoute||activeRoute.link?.includes(":"))return;const entry={key:activeRoute.key,label:routeLabelOverrides[activeRoute.key]||activeRoute.label,href:location.pathname};setRecentRoutes(current=>{const next=[entry,...current.filter(item=>item.href!==entry.href)].slice(0,6);localStorage.setItem(RECENT_STORAGE_KEY,JSON.stringify(next));return next;});},[activeRoute,location.pathname]);
  const value=useMemo(()=>({navigation,activeRoute,activeNavigationKey,breadcrumbs,pageTitle:currentPageMeta.title||routeLabelOverrides[activeRoute?.key]||activeRoute?.label||"Dashboard",quickActions,searchableRoutes,recentRoutes,goTo,setPageMeta}),[navigation,activeRoute,activeNavigationKey,breadcrumbs,currentPageMeta.title,quickActions,searchableRoutes,recentRoutes,goTo,setPageMeta]);
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

export const useAdminNavigation=()=>{const value=useContext(NavigationContext);if(!value)throw new Error("useAdminNavigation must be used inside NavigationProvider");return value;};
export const usePageMeta=({title,breadcrumb}={})=>{const {setPageMeta}=useAdminNavigation();useEffect(()=>{setPageMeta({title,breadcrumb});},[title,breadcrumb,setPageMeta]);};
