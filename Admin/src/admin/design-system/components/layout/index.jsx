import React from "react";
import { Breadcrumb } from "../navigation";
import "./layout.scss";

export const AppShell = ({ sidebar, topBar, children }) => <div className="mads-shell">{sidebar}<div className="mads-shell__content">{topBar}<main className="mads-shell__main">{children}</main></div></div>;
export const PageContainer = ({ variant="detail", className="", children }) => <div className={`mads-page mads-page--${variant} ${className}`.trim()}>{children}</div>;
export const PageHeader = ({ title, subtitle, breadcrumbs, status, statistics, primaryAction, secondaryActions, actions }) => <header className="mads-page-header">
  <div className="mads-page-header__content">
    {breadcrumbs&&<div className="mads-page-header__breadcrumbs">{Array.isArray(breadcrumbs)?<Breadcrumb items={breadcrumbs}/>:breadcrumbs}</div>}
    <div className="mads-page-header__title-row"><h1>{title}</h1>{status&&<div className="mads-page-header__status">{status}</div>}</div>
    {subtitle&&<p>{subtitle}</p>}
    {statistics&&<div className="mads-page-header__statistics" aria-label="Page statistics">{statistics}</div>}
  </div>
  {(primaryAction||secondaryActions||actions)&&<div className="mads-page-header__actions">{secondaryActions}{actions}{primaryAction}</div>}
</header>;
export const SectionCard = ({ title, description, actions, children, className="", id, sectionRef }) => <section id={id} ref={sectionRef} className={`mads-section ${className}`.trim()}>{(title||description||actions)&&<header className="mads-section__header"><div>{title&&<h2>{title}</h2>}{description&&<p>{description}</p>}</div>{actions}</header>}<div className="mads-section__body">{children}</div></section>;
export const ResponsiveGrid = ({ columns=12, gap=16, equalHeight=false, children, className="" }) => <div className={`mads-grid ${equalHeight?"mads-grid--equal-height":""} ${className}`.trim()} style={{"--mads-grid-cols":columns,"--mads-grid-gap":`${gap}px`}}>{children}</div>;
export const GridItem = ({ span=12, children, className="" }) => <div className={`mads-grid__item ${className}`.trim()} style={{"--mads-grid-span":span}}>{children}</div>;
export const StickyFooter = ({ message, children }) => <footer className="mads-sticky-footer"><div>{message}</div><div className="mads-sticky-footer__actions">{children}</div></footer>;
