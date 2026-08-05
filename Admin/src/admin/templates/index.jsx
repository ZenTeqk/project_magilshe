import React, { useEffect, useState } from "react";
import { AdminThemeProvider,PageContainer,PageHeader,SectionCard,StickyFooter,WorkflowStepper } from "../design-system";
import "./templates.scss";

const Boundary=({children})=><AdminThemeProvider><div className="mads-template-stack">{children}</div></AdminThemeProvider>;
const Header=props=><PageHeader title={props.title} subtitle={props.subtitle} breadcrumbs={props.breadcrumbs} status={props.status} statistics={props.statistics} primaryAction={props.primaryAction} secondaryActions={props.secondaryActions}/>;

const GroupedSettingsNav=({groups,activeKey,onSectionChange,storageKey="mads-settings-nav-expanded"})=>{
  const [expanded,setExpanded]=useState(()=>{try{return JSON.parse(localStorage.getItem(storageKey)||"{}");}catch{return {};}});
  useEffect(()=>{try{localStorage.setItem(storageKey,JSON.stringify(expanded));}catch{}},[expanded,storageKey]);
  const isGroupOpen=group=>expanded[group.key]??group.items.some(item=>item.key===activeKey);
  const toggle=group=>setExpanded(current=>({...current,[group.key]:!isGroupOpen(group)}));
  return <nav className="mads-settings-groups" aria-label="Settings sections">
    {groups.map(group=>{
      const isOpen=isGroupOpen(group);
      return <div className="mads-settings-group" key={group.key}>
        <button type="button" className="mads-settings-group__toggle" aria-expanded={isOpen} onClick={()=>toggle(group)}>
          {group.icon&&<span className="mads-settings-group__icon">{group.icon}</span>}
          <span className="mads-settings-group__label">{group.label}</span>
          <span className="mads-settings-group__chevron" aria-hidden="true">{isOpen?"−":"+"}</span>
        </button>
        {isOpen&&<div className="mads-settings-group__items">
          {group.items.map(item=><button type="button" key={item.key} className={`mads-settings-group__item ${item.key===activeKey?"active":""}`} aria-current={item.key===activeKey?"page":undefined} onClick={()=>onSectionChange(item.key)}>{item.label}</button>)}
        </div>}
      </div>;
    })}
  </nav>;
};
export const DashboardPageTemplate=({title,subtitle,breadcrumbs,status,statistics,primaryAction,secondaryActions,kpis,filters,children})=><Boundary><PageContainer variant="table"><Header {...{title,subtitle,breadcrumbs,status,statistics,primaryAction,secondaryActions}}/><div className="mads-template-stack">{kpis&&<section className="mads-template-kpis" aria-label="Key performance indicators">{kpis}</section>}{filters}{children}</div></PageContainer></Boundary>;
export const ListPageTemplate=({title,subtitle,breadcrumbs,status,statistics,primaryAction,secondaryActions,filters,banner,table})=><Boundary><PageContainer variant="table"><Header {...{title,subtitle,breadcrumbs,status,statistics,primaryAction,secondaryActions}}/><div className="mads-template-stack">{banner}{filters}{table}</div></PageContainer></Boundary>;
export const DetailPageTemplate=({title,subtitle,breadcrumbs,status,statistics,primaryAction,secondaryActions,workflow,children,aside,footer})=><Boundary><PageContainer variant="detail"><Header {...{title,subtitle,breadcrumbs,status,statistics,primaryAction,secondaryActions}}/>{workflow}<div className={`mads-detail-layout ${aside?"":"mads-detail-layout--single"}`}><div className="mads-template-stack">{children}</div>{aside&&<aside className="mads-template-stack">{aside}</aside>}</div>{footer&&<StickyFooter>{footer}</StickyFooter>}</PageContainer></Boundary>;
export const SettingsPageTemplate=({title,subtitle,breadcrumbs,status,primaryAction,secondaryActions,sections=[],groups,activeSection,onSectionChange,navStorageKey,children,footer})=><Boundary><PageContainer variant="detail"><Header {...{title,subtitle,breadcrumbs,status,primaryAction,secondaryActions}}/><div className="mads-settings-layout">{groups?<GroupedSettingsNav groups={groups} activeKey={activeSection} onSectionChange={onSectionChange} storageKey={navStorageKey}/>:<nav className="mads-settings-nav" aria-label="Settings sections">{sections.map(section=><button type="button" key={section.key} aria-current={activeSection===section.key?"page":undefined} onClick={()=>onSectionChange?.(section.key)}>{section.label}</button>)}</nav>}<SectionCard>{children}</SectionCard></div>{footer&&<StickyFooter>{footer}</StickyFooter>}</PageContainer></Boundary>;
export const WizardPageTemplate=({title,subtitle,breadcrumbs,status,primaryAction,secondaryActions,steps,currentStep,children,footer})=><Boundary><PageContainer variant="form"><Header {...{title,subtitle,breadcrumbs,status,primaryAction,secondaryActions}}/><div className="mads-wizard-content"><WorkflowStepper steps={steps} currentIndex={currentStep}/><SectionCard className="mads-wizard-body">{children}</SectionCard></div>{footer&&<StickyFooter>{footer}</StickyFooter>}</PageContainer></Boundary>;
