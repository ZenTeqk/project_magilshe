import React,{useContext,useEffect,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEdit,faPlus,faRefresh} from "@fortawesome/free-solid-svg-icons";
import {useDispatch,useSelector} from "react-redux";
import {GetApi} from "../../hooks/Get/GetApi";
import MainContext from "../../context/MainContext";
import {GetDeliveryPersonUrl} from "../../Constant/urls/urls";
import {setDeliveryPersonReducerData} from "../../redux/reducer/ChildReducer/DeliveryPersonReducer";
import {setIsDeliveryPersonLoadingReducerData} from "../../redux/reducer/ChildReducer/CommonLoaderReducer";
import {IconButton,ManagementPage,ManagementTable,PrimaryButton,SecondaryButton,formatDate} from "../../admin/design-system";
import EditDeliveryPerson from "./EditDeliveryPerson";

export default function DeliveryPerson(){const {ShowNotification}=useContext(MainContext),dispatch=useDispatch(),{delivery_person_reducer_data}=useSelector(state=>state.DeliveryPersonReducer),{is_delivery_person_loading}=useSelector(state=>state.CommonLoaderReducer),[show,setShow]=useState(false),[editableData,setEditableData]=useState({});
 const load=async()=>{try{const result=await GetApi(GetDeliveryPersonUrl);if(!result||typeof result.status==="undefined")ShowNotification("error","Network Error");else if(result.status!==200)ShowNotification("error",result.data?.message||"An error occurred");else dispatch(setDeliveryPersonReducerData(result.data.data));}catch(error){ShowNotification("error","An unexpected error occurred");}finally{dispatch(setIsDeliveryPersonLoadingReducerData(false));}};
 useEffect(()=>{load();},[]);const edit=row=>{setEditableData(row);setShow(true);};const columns=[{name:"ID",selector:row=>row?.id,sortable:true},{name:"Delivery person",selector:row=>row?.name,sortable:true},{name:"Mobile",selector:row=>row?.phone},{name:"Email",selector:row=>row?.email},{name:"Date of birth",selector:row=>formatDate(row?.dob)},{name:"Address",selector:row=>row?.address},{name:"Actions",cell:row=><IconButton label={`Edit ${row.name||"delivery person"}`} onClick={()=>edit(row)}><FontAwesomeIcon icon={faEdit}/></IconButton>}];
 return <ManagementPage title="Delivery Persons" description="Maintain staff available to the existing bakery delivery workflow." primaryAction={<PrimaryButton icon={<FontAwesomeIcon icon={faPlus}/>} onClick={()=>setShow(true)}>Add delivery person</PrimaryButton>} secondaryActions={<SecondaryButton icon={<FontAwesomeIcon icon={faRefresh}/>} onClick={load}>Refresh</SecondaryButton>}><ManagementTable title="Delivery staff directory" columns={columns} rows={delivery_person_reducer_data||[]} loading={is_delivery_person_loading}/><EditDeliveryPerson show={show} setShow={setShow} editableData={editableData} setEditableData={setEditableData}/></ManagementPage>;
}
