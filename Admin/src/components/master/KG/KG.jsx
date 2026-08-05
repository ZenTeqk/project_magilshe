import React,{useContext,useEffect,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEdit,faPlus,faRefresh} from "@fortawesome/free-solid-svg-icons";
import {useDispatch,useSelector} from "react-redux";
import MainContext from "../../../context/MainContext";
import {GetApi} from "../../../hooks/Get/GetApi";
import {subUnitUrl} from "../../../Constant/urls/urls";
import {setKgReducerData} from "../../../redux/reducer/ChildReducer/KgReducer";
import {setIsKgLoadingReducerData} from "../../../redux/reducer/ChildReducer/CommonLoaderReducer";
import {IconButton,ManagementPage,ManagementTable,PrimaryButton,SecondaryButton} from "../../../admin/design-system";
import EditKG from "./EditKG";

export default function KGComponent(){const {ShowNotification}=useContext(MainContext),dispatch=useDispatch(),{kg_reducer_data}=useSelector(state=>state.KgReducer),{unit_reducer_data}=useSelector(state=>state.UnitReducer),{is_kg_loading}=useSelector(state=>state.CommonLoaderReducer),[show,setShow]=useState(false),[editableData,setEditableData]=useState({});
 const load=async()=>{try{const result=await GetApi(subUnitUrl);if(!result||typeof result.status==="undefined")ShowNotification("error","Network Error");else if(result.status!==200)ShowNotification("error",result.data?.message||"An error occurred");else dispatch(setKgReducerData(result.data?.data));}catch(error){ShowNotification("error","An unexpected error occurred");}finally{dispatch(setIsKgLoadingReducerData(false));}};
 useEffect(()=>{load();},[]);const edit=row=>{setEditableData(row);setShow(true);};
 const columns=[{name:"ID",selector:row=>row?.id,sortable:true},{name:"Sub unit",selector:row=>row?.kg,sortable:true},{name:"Unit",selector:row=>row?.unit?.name,sortable:true},{name:"Description",selector:row=>row?.description},{name:"Actions",cell:row=><IconButton label={`Edit ${row.kg||"sub unit"}`} onClick={()=>edit(row)}><FontAwesomeIcon icon={faEdit}/></IconButton>}];
 return <ManagementPage title="Sub-units" description="Manage sellable weights and measurements within each unit." primaryAction={<PrimaryButton icon={<FontAwesomeIcon icon={faPlus}/>} onClick={()=>setShow(true)}>Add sub-unit</PrimaryButton>} secondaryActions={<SecondaryButton icon={<FontAwesomeIcon icon={faRefresh}/>} onClick={load}>Refresh</SecondaryButton>}><ManagementTable title="Sub-unit directory" columns={columns} rows={kg_reducer_data||[]} loading={is_kg_loading}/><EditKG show={show} setShow={setShow} editableData={editableData} setEditableData={setEditableData} unitData={unit_reducer_data}/></ManagementPage>;
}
