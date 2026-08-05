import React,{useContext,useEffect,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faRefresh} from "@fortawesome/free-solid-svg-icons";
import {useDispatch,useSelector} from "react-redux";
import {GetApi} from "../../hooks/Get/GetApi";
import {GetCustomersUrl} from "../../Constant/urls/urls";
import {setCustomersReducerData} from "../../redux/reducer/ChildReducer/CustomersReducer";
import {setIsCustomersLoadingReducerData} from "../../redux/reducer/ChildReducer/CommonLoaderReducer";
import MainContext from "../../context/MainContext";
import {ManagementPage,ManagementTable,SecondaryButton,StatusBadge} from "../../admin/design-system";
import ViewCustomers from "./ViewCustomers";

export default function Customers(){const {ShowNotification}=useContext(MainContext),dispatch=useDispatch(),{customers_reducer_data}=useSelector(state=>state.CustomersReducer),{is_customers_loading}=useSelector(state=>state.CommonLoaderReducer),[show,setShow]=useState(false),[customerData,setCustomerData]=useState({});
 const load=async()=>{try{const result=await GetApi(GetCustomersUrl);if(!result||typeof result.status==="undefined")ShowNotification("error","Network Error");else if(result.status!==200)ShowNotification("error",result.data?.message||"An error occurred");else dispatch(setCustomersReducerData(result.data?.data));}catch(error){ShowNotification("error","An unexpected error occurred");}finally{dispatch(setIsCustomersLoadingReducerData(false));}};
 useEffect(()=>{load();},[]);const open=row=>{setCustomerData(row);setShow(true);};const columns=[{name:"ID",selector:row=>row?.id,sortable:true},{name:"Customer",selector:row=>row?.name,sortable:true},{name:"Status",cell:row=><StatusBadge tone={row.is_active?"success":"neutral"}>{row.is_active?"Active":"Inactive"}</StatusBadge>},{name:"Email",selector:row=>row?.email},{name:"Mobile",selector:row=>row?.phone??"—"}];
 return <ManagementPage title="Customer Database" description="Read-only authentication customer records retained for backward compatibility." secondaryActions={<SecondaryButton icon={<FontAwesomeIcon icon={faRefresh}/>} onClick={load}>Refresh</SecondaryButton>}><ManagementTable title="Authentication customers" description="For unified CRM history, use the standalone Customers workspace." columns={columns} rows={customers_reducer_data||[]} loading={is_customers_loading} onRowClick={open}/><ViewCustomers show={show} setShow={setShow} customerData={customerData}/></ManagementPage>;
}
