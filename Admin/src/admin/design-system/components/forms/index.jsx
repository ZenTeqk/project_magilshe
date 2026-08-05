import React, { useId, useRef, useState } from "react";
import "./forms.scss";

export const FormSection = ({ title, description, children }) => <fieldset className="mads-form-section"><legend>{title}</legend>{description&&<p className="mads-form-section__description">{description}</p>}<div className="mads-form-section__content">{children}</div></fieldset>;
export const Field = ({ label, required=false, error, helperText, children, id:providedId, span=12 })=>{const generatedId=useId(),id=providedId||generatedId;return <div className={`mads-field ${error?"mads-field--error":""}`} style={{"--mads-field-span":span}}><label className="mads-field__label" htmlFor={id}>{label}{required&&<span className="mads-field__required" aria-hidden="true"> *</span>}</label>{React.isValidElement(children)?React.cloneElement(children,{id,"aria-invalid":Boolean(error),"aria-describedby":error?`${id}-error`:helperText?`${id}-help`:undefined,required}):children}{error?<span id={`${id}-error`} className="mads-field__error" role="alert">{error}</span>:helperText&&<span id={`${id}-help`} className="mads-field__help">{helperText}</span>}</div>};
export const TextInput = props => <input type="text" {...props}/>;
export const PhoneInput = props => <input type="tel" inputMode="tel" {...props}/>;
export const NumberInput = props => <input type="number" inputMode="decimal" {...props}/>;
export const DateInput = props => <input type="date" {...props}/>;
export const SelectInput = ({ children, ...props }) => <select {...props}>{children}</select>;
export const NotesInput = props => <textarea {...props}/>;

export function parseLiteMarkdown(text){
 const lines=String(text||"").split(/\r?\n/);
 const blocks=[];
 let currentList=null;
 const flushList=()=>{if(currentList){blocks.push(currentList);currentList=null;}};
 lines.forEach(line=>{
  const trimmed=line.trim();
  if(!trimmed){flushList();return;}
  const headingMatch=trimmed.match(/^(#{1,3})\s+(.*)$/);
  if(headingMatch){flushList();blocks.push({type:`h${headingMatch[1].length}`,text:headingMatch[2]});return;}
  const olMatch=line.match(/^(\s*)\d+\.\s+(.*)$/);
  const ulMatch=line.match(/^(\s*)[-*]\s+(.*)$/);
  if(olMatch||ulMatch){
   const [,indent,content]=olMatch||ulMatch,depth=Math.floor(indent.length/2),type=olMatch?"ol":"ul";
   if(!currentList||currentList.type!==type){flushList();currentList={type,items:[]};}
   currentList.items.push({text:content,depth});
   return;
  }
  flushList();
  blocks.push({type:"p",text:trimmed});
 });
 flushList();
 return blocks;
}

const renderInline=text=>String(text||"").split(/(\*\*[^*]+\*\*)/g).map((chunk,index)=>chunk.startsWith("**")&&chunk.endsWith("**")?<strong key={index}>{chunk.slice(2,-2)}</strong>:<React.Fragment key={index}>{chunk}</React.Fragment>);

export const LiteMarkdown=({text,emptyMessage="Nothing has been written yet."})=>{
 const blocks=parseLiteMarkdown(text);
 if(!blocks.length)return <p className="mads-lite-markdown__empty">{emptyMessage}</p>;
 return <div className="mads-lite-markdown">{blocks.map((block,index)=>{
  if(block.type==="h1")return <h3 key={index}>{renderInline(block.text)}</h3>;
  if(block.type==="h2")return <h4 key={index}>{renderInline(block.text)}</h4>;
  if(block.type==="h3")return <h5 key={index}>{renderInline(block.text)}</h5>;
  if(block.type==="ul")return <ul key={index}>{block.items.map((item,itemIndex)=><li key={itemIndex} style={{marginLeft:item.depth*18}}>{renderInline(item.text)}</li>)}</ul>;
  if(block.type==="ol")return <ol key={index}>{block.items.map((item,itemIndex)=><li key={itemIndex} style={{marginLeft:item.depth*18}}>{renderInline(item.text)}</li>)}</ol>;
  return <p key={index}>{renderInline(block.text)}</p>;
 })}</div>;
};

export const RichTextEditor=({value,onChange,rows=16,placeholder,ariaLabel="Formatted content"})=>{
 const textareaRef=useRef(null),[tab,setTab]=useState("write");
 const applyLinePrefix=prefix=>{
  const el=textareaRef.current;
  if(!el)return;
  const start=el.selectionStart,text=value||"",lineStart=text.lastIndexOf("\n",start-1)+1,next=`${text.slice(0,lineStart)}${prefix}${text.slice(lineStart)}`;
  onChange(next);
  requestAnimationFrame(()=>{el.focus();el.selectionStart=el.selectionEnd=start+prefix.length;});
 };
 const wrapSelection=marker=>{
  const el=textareaRef.current;
  if(!el)return;
  const start=el.selectionStart,end=el.selectionEnd,text=value||"",selected=text.slice(start,end)||"text",next=`${text.slice(0,start)}${marker}${selected}${marker}${text.slice(end)}`;
  onChange(next);
  requestAnimationFrame(()=>{el.focus();el.selectionStart=start+marker.length;el.selectionEnd=start+marker.length+selected.length;});
 };
 const indentLine=()=>{
  const el=textareaRef.current;
  if(!el)return;
  const start=el.selectionStart,text=value||"",lineStart=text.lastIndexOf("\n",start-1)+1,next=`${text.slice(0,lineStart)}  ${text.slice(lineStart)}`;
  onChange(next);
  requestAnimationFrame(()=>{el.focus();el.selectionStart=el.selectionEnd=start+2;});
 };
 return <div className="mads-rich-editor">
  <div className="mads-rich-editor__toolbar" role="toolbar" aria-label="Formatting">
   <button type="button" onClick={()=>applyLinePrefix("# ")}>Heading</button>
   <button type="button" onClick={()=>wrapSelection("**")}><strong>B</strong></button>
   <button type="button" onClick={()=>applyLinePrefix("- ")}>• List</button>
   <button type="button" onClick={()=>applyLinePrefix("1. ")}>1. List</button>
   <button type="button" onClick={indentLine}>Indent →</button>
   <div className="mads-rich-editor__tabs" role="group" aria-label="View mode">
    <button type="button" aria-pressed={tab==="write"} onClick={()=>setTab("write")}>Write</button>
    <button type="button" aria-pressed={tab==="preview"} onClick={()=>setTab("preview")}>Preview</button>
   </div>
  </div>
  {tab==="write"
   ?<textarea ref={textareaRef} className="mads-rich-editor__textarea" rows={rows} value={value||""} onChange={event=>onChange(event.target.value)} placeholder={placeholder} aria-label={ariaLabel}/>
   :<div className="mads-rich-editor__preview"><LiteMarkdown text={value}/></div>}
 </div>;
};
