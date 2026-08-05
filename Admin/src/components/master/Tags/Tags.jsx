import React,{useContext,useEffect,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEdit,faPlus,faRefresh} from "@fortawesome/free-solid-svg-icons";
import {useDispatch,useSelector} from "react-redux";
import MainContext from "../../../context/MainContext";
import {GetApi} from "../../../hooks/Get/GetApi";
import {GetTagUrl} from "../../../Constant/urls/urls";
import {setTaglistReducerData} from "../../../redux/reducer/ChildReducer/TagListReducer";
import {setIsTagLoadingReducerData} from "../../../redux/reducer/ChildReducer/CommonLoaderReducer";
import {IconButton,ManagementPage,ManagementTable,PrimaryButton,SecondaryButton} from "../../../admin/design-system";
import EditTags from "./EditTags";

export default function TagsComponent(){const {ShowNotification}=useContext(MainContext),dispatch=useDispatch(),{tag_list_reducer_data}=useSelector(state=>state.TagListReducer),{is_tag_category_loading}=useSelector(state=>state.CommonLoaderReducer),[show,setShow]=useState(false),[editableData,setEditableData]=useState({});
 const load=async()=>{try{const result=await GetApi(GetTagUrl);if(!result||typeof result.status==="undefined")ShowNotification("error","Network Error");else if(result.status!==200)ShowNotification("error",result.data?.message||"An error occurred");else dispatch(setTaglistReducerData(result.data?.data));}catch(error){ShowNotification("error","An unexpected error occurred");}finally{dispatch(setIsTagLoadingReducerData(false));}};
 useEffect(()=>{load();},[]);const edit=row=>{setEditableData(row);setShow(true);};
 const columns=[{name:"ID",selector:row=>row?.id,sortable:true},{name:"Tag",selector:row=>row?.tag,sortable:true},{name:"Actions",cell:row=><IconButton label={`Edit ${row.tag||"tag"}`} onClick={()=>edit(row)}><FontAwesomeIcon icon={faEdit}/></IconButton>}];
 return <ManagementPage title="Tags" description="Manage catalogue labels used to classify products." primaryAction={<PrimaryButton icon={<FontAwesomeIcon icon={faPlus}/>} onClick={()=>setShow(true)}>Add tag</PrimaryButton>} secondaryActions={<SecondaryButton icon={<FontAwesomeIcon icon={faRefresh}/>} onClick={load}>Refresh</SecondaryButton>}><ManagementTable title="Tag directory" columns={columns} rows={tag_list_reducer_data||[]} loading={is_tag_category_loading}/><EditTags show={show} setShow={setShow} editableData={editableData} setEditableData={setEditableData}/></ManagementPage>;
}
