import React,{useContext,useEffect,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEdit,faPlus,faRefresh} from "@fortawesome/free-solid-svg-icons";
import {useDispatch,useSelector} from "react-redux";
import {GetUnitUrl} from "../../../Constant/urls/urls";
import {GetApi} from "../../../hooks/Get/GetApi";
import MainContext from "../../../context/MainContext";
import {setUnitReducerData} from "../../../redux/reducer/ChildReducer/UnitReducer";
import {setIsUnitLoadingReducerData} from "../../../redux/reducer/ChildReducer/CommonLoaderReducer";
import {IconButton,ManagementPage,ManagementTable,PrimaryButton,SecondaryButton} from "../../../admin/design-system";
import EditUnit from "./EditUnit";

export default function UnitComponent(){const {ShowNotification}=useContext(MainContext),dispatch=useDispatch(),{unit_reducer_data}=useSelector(state=>state.UnitReducer),{is_Unit_loading}=useSelector(state=>state.CommonLoaderReducer),[show,setShow]=useState(false),[editableData,setEditableData]=useState({});
 const load=async()=>{try{const result=await GetApi(GetUnitUrl);if(!result||typeof result.status==="undefined")ShowNotification("error","Network Error");else if(result.status!==200)ShowNotification("error",result.data?.message||"An error occurred");else dispatch(setUnitReducerData(result.data?.data));}catch(error){ShowNotification("error","An unexpected error occurred");}finally{dispatch(setIsUnitLoadingReducerData(false));}};
 useEffect(()=>{load();},[]);
 const edit=row=>{setEditableData(row);setShow(true);},columns=[{name:"ID",selector:row=>row?.id,sortable:true},{name:"Unit",selector:row=>row?.name,sortable:true},{name:"Description",selector:row=>row?.description},{name:"Actions",cell:row=><IconButton label={`Edit ${row.name||"unit"}`} onClick={()=>edit(row)}><FontAwesomeIcon icon={faEdit}/></IconButton>}];
 return <ManagementPage title="Units" description="Manage product measurement units." primaryAction={<PrimaryButton icon={<FontAwesomeIcon icon={faPlus}/>} onClick={()=>setShow(true)}>Add unit</PrimaryButton>} secondaryActions={<SecondaryButton icon={<FontAwesomeIcon icon={faRefresh}/>} onClick={load}>Refresh</SecondaryButton>}><ManagementTable title="Unit directory" columns={columns} rows={unit_reducer_data||[]} loading={is_Unit_loading}/><EditUnit show={show} setShow={setShow} editableData={editableData} setEditableData={setEditableData}/></ManagementPage>;
}
