import React, { useContext, useEffect, useMemo, useState } from "react";
import { Sidebar, Menu, MenuItem, SubMenu } from "react-pro-sidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine,faCircleChevronLeft,faCircleQuestion,faGlobe,faGears,faIndustry,faLayerGroup,faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import Typography from "@mui/material/Typography";
import "./SideBarComponent.scss";
import { Link,matchPath,useLocation } from "react-router-dom";
import theChennaiCakeryLogo from "../../assets/img/tcc-logo.png";
import MainContext from "../../context/MainContext";
import DataContext from "../../context/DataContext";

const SideBarComponent = ({ collapsed, toggled, setToggled, setBroken }) => {
  const { activeLink, setActiveLink, userRole } = useContext(MainContext);
  const { RoutesList } = useContext(DataContext);

  const location = useLocation();
  const [navSearch,setNavSearch]=useState("");
  const [openMenus,setOpenMenus]=useState({});

  const allRoutes=useMemo(()=>RoutesList.flatMap(item=>item.subMenu?[item,...item.subMenu]:[item]),[RoutesList]);
  const navigation=useMemo(()=>{
    const route=key=>allRoutes.find(item=>item.key===key);
    const child=(key,label)=>{const item=route(key);return item?{...item,label:label||item.label,isNoSubNav:false}:null;};
    const crm=route("crm");
    return [
      route("home"),
      crm&&{...crm,subMenu:crm.subMenu.map(item=>item.key==="crm-overview"?{...item,label:"Dashboard"}:item)},
      {label:"Website",heading_name:"Website",key:"website",icon:faGlobe,subMenu:[
        {label:"Master",key:"website-master",icon:faLayerGroup,subMenu:[child("categories"),child("sub_categories"),child("item"),child("unit"),child("sub-unit"),child("tags")].filter(Boolean)},
        child("gallery"),child("offers"),child("banner"),child("events"),child("event_orders"),child("feedback")
      ].filter(Boolean)},
      child("products"),
      {label:"Operations",heading_name:"Operations",key:"operations",icon:faIndustry,subMenu:[child("orders","Online Orders"),child("manual-order","Manual Orders"),child("purchase","Purchases"),child("delivery_person","Delivery Persons")].filter(Boolean)},
      route("reports")&&{...route("reports"),label:"Reports & Analytics",heading_name:"Reports & Analytics",icon:faChartLine},
      {label:"Configuration",heading_name:"Configuration",key:"admin-configuration",icon:faGears,subMenu:[child("configuration","General Configuration"),child("terms_conditions","Terms & Conditions")].filter(Boolean)},
      {label:"Help",heading_name:"Help",key:"help",icon:faCircleQuestion,subMenu:[child("admin-manual","Instruction Manual")].filter(Boolean)},
    ].filter(Boolean);
  },[allRoutes]);
  const visibleNavigation=useMemo(()=>{
    const term=navSearch.trim().toLowerCase();
    if(!term)return navigation;
    const filterTree=(item)=>{
      const children=item.subMenu?.map(filterTree).filter(Boolean);
      return item.label.toLowerCase().includes(term)||children?.length?{...item,subMenu:children}:null;
    };
    return navigation.map(filterTree).filter(Boolean);
  },[navigation,navSearch]);

  useEffect(() => {const matches=allRoutes.filter(item=>item.link&&matchPath({path:item.link,end:item.link==="/"},location.pathname)).sort((a,b)=>b.link.length-a.link.length);setActiveLink(matches[0]?.key||"");}, [allRoutes,location.pathname,setActiveLink]);

  useEffect(()=>{
    const containsActive=(item)=>item.key===activeLink||item.subMenu?.some(containsActive);
    const next={};
    navigation.forEach(item=>{
      if(item.subMenu?.some(containsActive)){
        next[item.key]=true;
        item.subMenu.forEach(child=>{if(child.subMenu?.some(containsActive))next[child.key]=true;});
      }
    });
    if(Object.keys(next).length)setOpenMenus(current=>({...current,...next}));
  },[activeLink,navigation]);

  return (
    <div>
      <Sidebar
        collapsed={collapsed}
        className={`dashboard-sidebar`}
        onBackdropClick={() => setToggled(!toggled)}
        toggled={toggled}
        onBreakPoint={setBroken}
        breakPoint="md"
      >
        <Menu className="sideBarHeader">
          <MenuItem
            icon={
              <img
                src={theChennaiCakeryLogo}
                alt=""
                className="dashboard-icon"
              />
            }
            component={<Link to={"/"} />}
            onClick={() => setActiveLink("")}
          >
            <span className="dashboard-title">Magilshe</span>
            <span
              className="toggle-icon-mobile"
              onClick={() => setToggled(!toggled)}
            >
              <FontAwesomeIcon icon={faCircleChevronLeft} />
            </span>
          </MenuItem>
        </Menu>
        <div className="asideBar-nav-section">
          {!collapsed&&<label className="sidebar-search"><FontAwesomeIcon icon={faMagnifyingGlass}/><input value={navSearch} onChange={event=>setNavSearch(event.target.value)} placeholder="Search navigation"/></label>}
          {visibleNavigation.map((item) => (
            <RenderNavItem
              key={item.key}
              item={item}
              activeLink={activeLink}
              setActiveLink={setActiveLink}
              collapsed={collapsed}
              userRole={userRole}
              openMenus={openMenus}
              setOpenMenus={setOpenMenus}
            />
          ))}
        </div>
      </Sidebar>
    </div>
  );
};

const RenderNavItem = ({
  item,
  activeLink,
  setActiveLink,
  collapsed,
  userRole,
  openMenus,
  setOpenMenus,
}) => {
  const canAccess=(entry)=>entry.accessRoles === "all" || entry?.accessRoles?.includes(parseInt(userRole));
  const containsActive=(entry)=>entry.key===activeLink||entry.subMenu?.some(containsActive);
  if (
    !item ||
    (item.subMenu &&
      !item.subMenu.some((subItem)=>subItem.subMenu?.some(canAccess)||canAccess(subItem)))
  ) {
    return null;
  }

  return (
    <>
      {item.heading_name && !item.isNoSubNav && (
        <div className="my-2 mx-4">
          <Typography
            variant="body2"
            fontWeight={600}
            style={{ opacity: collapsed ? 0 : 0.7, letterSpacing: "0.5px" }}
            className="section-head"
          >
            {item.heading_name}
          </Typography>
        </div>
      )}

      <Menu key={item.key}>
        {item.subMenu ? (
          <SubMenu
            icon={<FontAwesomeIcon icon={item.icon} />}
            label={item.label}
            open={Boolean(openMenus[item.key])}
            onOpenChange={(open)=>setOpenMenus(current=>({...current,[item.key]:open}))}
          >
            {item.subMenu.map(
              (subItem) => subItem.subMenu ? (
                <SubMenu
                  key={subItem.key}
                  className={containsActive(subItem)?"nested-menu-active":""}
                  icon={<FontAwesomeIcon icon={subItem.icon}/>} label={subItem.label}
                  open={Boolean(openMenus[subItem.key])}
                  onOpenChange={(open)=>setOpenMenus(current=>({...current,[subItem.key]:open}))}
                >
                  {subItem.subMenu.filter(canAccess).map(child=><MenuItem className="nav-menu-item" key={child.key} active={activeLink===child.key} component={<Link to={child.link}/>} icon={<FontAwesomeIcon icon={child.icon}/>} onClick={()=>setActiveLink(child.key)}>{child.label}</MenuItem>)}
                </SubMenu>
              ) : canAccess(subItem) && !item.isNoSubNav && (
                  <MenuItem
                    className="nav-menu-item"
                    key={subItem.key}
                    active={activeLink === subItem.key}
                    component={<Link to={subItem.link} />}
                    icon={<FontAwesomeIcon icon={subItem.icon} />}
                    onClick={() => setActiveLink(subItem.key)}
                  >
                    {subItem.label}
                  </MenuItem>
                )
            )}
          </SubMenu>
        ) : (
          canAccess(item) &&
          !item.isNoSubNav && (
            <MenuItem
              className="nav-menu-item"
              icon={<FontAwesomeIcon icon={item.icon} />}
              component={<Link to={item.link} />}
              active={activeLink === item.key}
              onClick={() => setActiveLink(item.key)}
            >
              {item.label}
            </MenuItem>
          )
        )}
      </Menu>
    </>
  );
};

export default SideBarComponent;
