import React,{useMemo,useState} from "react";
import {ListPageTemplate} from "../../../templates";
import {UniversalFilterBar} from "../common";
import {SectionCard} from "../layout";
import {DataTable} from "../tables";
import {SkeletonTable} from "../feedback";
import "./management.scss";

const valueFor=(column,row,index)=>column.cell?column.cell(row,index):column.selector?column.selector(row,index):row[column.key];

export const ManagementPage=({title,description,subtitle,breadcrumbs,status,statistics,primaryAction,secondaryActions,filters,banner,children,loading=false})=><ListPageTemplate title={title} subtitle={description||subtitle} breadcrumbs={breadcrumbs} status={status} statistics={statistics} primaryAction={primaryAction} secondaryActions={secondaryActions} filters={filters} banner={banner} table={loading?<SkeletonTable/>:children}/>;

export const ManagementTable=({columns=[],rows,data,loading=false,title,description,rowKey="id",emptyTitle="No records found",emptyDescription="Create a record or refresh this page.",onRowClick,searchable=true,pageSize=10,serverTotal,onServerPageChange})=>{
 rows=rows||data||[];
 const [query,setQuery]=useState(""),[page,setPage]=useState(1),[sort,setSort]=useState();
 const normalized=useMemo(()=>columns.map((column,index)=>({key:column.key||String(column.name||`column-${index}`).toLowerCase().replace(/\W+/g,"-"),header:column.name||column.header||"",sortable:Boolean(column.sortable),align:column.right||column.align==="right"?"right":undefined,render:(row,rowIndex)=>valueFor(column,row,rowIndex)})),[columns]);
 const filtered=useMemo(()=>{const term=query.trim().toLowerCase();return term?(rows||[]).filter(row=>Object.values(row||{}).some(value=>typeof value!=="object"&&String(value??"").toLowerCase().includes(term))):(rows||[]);},[query,rows]);
 const sorted=useMemo(()=>{if(!sort)return filtered;const source=columns.find((column,index)=>(column.key||String(column.name||`column-${index}`).toLowerCase().replace(/\W+/g,"-"))===sort.key);if(!source?.selector)return filtered;return [...filtered].sort((left,right)=>String(source.selector(left)??"").localeCompare(String(source.selector(right)??""),undefined,{numeric:true})*(sort.direction==="asc"?1:-1));},[columns,filtered,sort]);
 const pageCount=Math.max(1,Math.ceil((serverTotal??sorted.length)/pageSize)),visible=serverTotal===undefined?sorted.slice((page-1)*pageSize,page*pageSize):sorted;
 const changeSort=key=>{setPage(1);setSort(current=>({key,direction:current?.key===key&&current.direction==="asc"?"desc":"asc"}));};
 const filter=searchable?<UniversalFilterBar searchValue={query} onSearchChange={value=>{setQuery(value);setPage(1);}} onClear={()=>{setQuery("");setPage(1);}} activeCount={query?1:0}/>:null;
 const changePage=value=>{setPage(value);onServerPageChange?.(value);};
 return <SectionCard title={title} description={description} actions={filter}><DataTable ariaLabel={title||"Management records"} columns={normalized} rows={visible} rowKey={rowKey} loading={loading} sort={sort} onSort={changeSort} page={page} pageCount={pageCount} onPageChange={changePage} onRowClick={onRowClick} emptyTitle={emptyTitle} emptyDescription={emptyDescription}/></SectionCard>;
};
