import React,{useState} from "react";
import {Api} from "../../../Api/Api";
import {Field,Modal,PrimaryButton,SecondaryButton} from "../../../admin/design-system";

export default function LeadImport({open,onClose,onImported}){
 const [file,setFile]=useState(),[result,setResult]=useState(),[loading,setLoading]=useState(false);
 const upload=async()=>{const body=new FormData();body.append("file",file);setLoading(true);try{const {data}=await Api.post("crm/leads/import/",body,{headers:{"Content-Type":"multipart/form-data"}});setResult(data);onImported();}finally{setLoading(false);}};
 const close=()=>{setFile();setResult();onClose();};
 return <Modal open={open} onClose={close} title="Import leads" footer={<><SecondaryButton onClick={close}>Close</SecondaryButton><PrimaryButton disabled={!file||loading} onClick={upload}>{loading?"Validating…":"Import"}</PrimaryButton></>}><p>Upload CSV or XLSX with columns: Customer Name, Phone, Occasion, Event Date, Cake Type, Quantity.</p><Field label="Import file" required helperText="Accepted formats: CSV and XLSX"><input type="file" accept=".csv,.xlsx" onChange={event=>setFile(event.target.files[0])}/></Field>{result&&<div><strong>{result.success_count} imported · {result.failed_count} failed</strong>{Boolean(result.errors?.length)&&<div className="crm-import-errors">{result.errors.map(error=><div className="crm-error" key={error.row}>Row {error.row}: {error.reason}</div>)}</div>}</div>}</Modal>;
}
