import React from "react";
import {EmptyState,SkeletonTable} from "../feedback";
import {SecondaryButton} from "../common";
import "./tables.scss";

const columnTrack=column=>column.align==="right"?"max-content":(column.width||"minmax(140px,1fr)");

export const DataTable=({columns=[],rows=[],rowKey="id",loading=false,emptyTitle="No records found",emptyDescription="Try changing the search or filters.",emptyAction,sort,onSort,page=1,pageCount=1,onPageChange,onRowClick,ariaLabel="Records"})=>{
  if(loading)return <SkeletonTable columns={Math.max(columns.length,1)} ariaLabel={`Loading ${ariaLabel.toLowerCase()}`}/>;
  if(!rows.length)return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction}/>;
  const gridTemplateColumns=columns.map(columnTrack).join(" ");
  return <div className="mads-table-wrap"><div className="mads-table-scroll">
    <div className="mads-table" role="table" aria-label={ariaLabel} style={{gridTemplateColumns}}>
      <div className="mads-table__row mads-table__row--head" role="row">
        {columns.map(column=><div key={column.key} role="columnheader" className={`mads-table__cell${column.align==="right"?" mads-table__cell--action":""}`}>{column.sortable?<button className="mads-table__sort" type="button" onClick={()=>onSort?.(column.key)}>{column.header}{sort?.key===column.key?(sort.direction==="asc"?" ↑":" ↓"):""}</button>:column.header}</div>)}
      </div>
      <div className="mads-table__body" role="rowgroup">
        {rows.map(row=>{
          const clickable=Boolean(onRowClick);
          return <div key={typeof rowKey==="function"?rowKey(row):row[rowKey]} role="row" className={`mads-table__row${clickable?" mads-table__row--clickable":""}`} onClick={()=>onRowClick?.(row)}>
            {columns.map((column,columnIndex)=><div key={column.key} role="cell" className={`mads-table__cell${column.align==="right"?" mads-table__cell--action":""}`} tabIndex={clickable&&columnIndex===0?0:undefined} onKeyDown={clickable&&columnIndex===0?event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onRowClick(row);}}:undefined}>{column.render?column.render(row):row[column.key]}</div>)}
          </div>;
        })}
      </div>
    </div>
  </div>{pageCount>1&&<div className="mads-table__pagination"><span>Page {page} of {pageCount}</span><div className="mads-table__pagination-actions"><SecondaryButton disabled={page<=1} onClick={()=>onPageChange?.(page-1)}>Previous</SecondaryButton><SecondaryButton disabled={page>=pageCount} onClick={()=>onPageChange?.(page+1)}>Next</SecondaryButton></div></div>}</div>;
};
