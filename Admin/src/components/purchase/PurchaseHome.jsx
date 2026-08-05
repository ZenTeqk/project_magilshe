import React,{useContext,useEffect,useState} from "react";
import {useDispatch,useSelector} from "react-redux";
import {useNavigate} from "react-router";
import {GetPurchase} from "../../Constant/urls/urls";
import {GetApi} from "../../hooks/Get/GetApi";
import {setPurchaseReducerData} from "../../redux/reducer/ChildReducer/PurchaseReducer";
import MainContext from "../../context/MainContext";
import {formatDate,formatLocalDate} from "../../utils/commonFunctions";
import Purchase from "./Purchase";
import {DateInput,Field,FormSection,IconButton,ManagementPage,ManagementTable,PrimaryButton,SecondaryButton} from "../../admin/design-system";

const PurchaseHome=()=>{
 const navigate=useNavigate(),dispatch=useDispatch(),{setIsPreLoading,ShowNotification}=useContext(MainContext),{purchase_reducer_data}=useSelector(state=>state.PurchaseReducer);
 const [show,setShow]=useState(false),[editableData,setEditableData]=useState(null),[totalLength,setTotalLength]=useState(null);
 const [range,setRange]=useState({startDate:new Date(new Date().setDate(new Date().getDate()-30)),endDate:new Date()});
 const load=async(page=1)=>{try{setIsPreLoading(true);const start=formatLocalDate(range.startDate),end=formatLocalDate(range.endDate),result=await GetApi(`${GetPurchase}?start_date=${start}&end_date=${end}&page=${page}&page_size=10`);if(result?.status===200){dispatch(setPurchaseReducerData(result.data?.results?.data));setTotalLength(result.data?.results?.total_length);}else ShowNotification("error",result?.data?.message||"Unable to load purchases");}catch(error){ShowNotification("error","An unexpected error occurred");}finally{setIsPreLoading(false);}};
 useEffect(()=>{load();},[]);
 const columns=[{name:"ID",selector:row=>row.id,sortable:true},{name:"Created",selector:row=>formatDate(row.created_at)},{name:"Invoice date",selector:row=>row.invoice_date||"—"},{name:"Invoice number",selector:row=>row.invoice_number||"—"},{name:"Supplier",selector:row=>row.supplier_name||"—"},{name:"Total",selector:row=>`₹${row.total_amount||0}`},{name:"Payment",selector:row=>row.payment_type||"—"},{name:"Actions",cell:row=><div className="mads-table-actions"><IconButton label="Edit purchase" onClick={event=>{event.stopPropagation();setEditableData(row);setShow(true);}}>✎</IconButton><IconButton label="View receipt" onClick={event=>{event.stopPropagation();navigate(`/purchase/${row.id}`);}}>→</IconButton></div>}];
 if(show)return <Purchase show={show} setShow={setShow} editableData={editableData} setEditableData={setEditableData}/>;
 const filters=<FormSection title="Purchase period"><Field label="From" span={4}><DateInput value={formatLocalDate(range.startDate)} onChange={event=>setRange(old=>({...old,startDate:new Date(`${event.target.value}T00:00:00`)}))}/></Field><Field label="To" span={4}><DateInput value={formatLocalDate(range.endDate)} onChange={event=>setRange(old=>({...old,endDate:new Date(`${event.target.value}T00:00:00`)}))}/></Field><div className="mads-field mads-field--actions"><SecondaryButton onClick={()=>load(1)}>Apply dates</SecondaryButton></div></FormSection>;
 return <ManagementPage title="Purchases" description="Record supplier invoices and stock purchases." breadcrumbs={[{label:"Operations"},{label:"Purchases"}]} primaryAction={<PrimaryButton onClick={()=>{setEditableData(null);setShow(true);}}>New purchase</PrimaryButton>} filters={filters}><ManagementTable columns={columns} rows={purchase_reducer_data||[]} serverTotal={totalLength} onServerPageChange={load} searchPlaceholder="Search purchases" emptyTitle="No purchases" emptyDescription="Create a purchase to record a supplier invoice." onRowClick={row=>navigate(`/purchase/${row.id}`)}/></ManagementPage>;
};
export default PurchaseHome;
