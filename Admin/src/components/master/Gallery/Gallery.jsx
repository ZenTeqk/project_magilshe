import React,{useContext,useEffect,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPlus,faRefresh,faTrash} from "@fortawesome/free-solid-svg-icons";
import {useDispatch,useSelector} from "react-redux";
import MainContext from "../../../context/MainContext";
import {GetApi} from "../../../hooks/Get/GetApi";
import {DeleteApi} from "../../../hooks/Delete/DeleteApi";
import {DeleteGalleryUrl,GetGalleryUrl} from "../../../Constant/urls/urls";
import {setGalleryListReducerData} from "../../../redux/reducer/ChildReducer/GalleryListReducer";
import {setIsGalleryLoadingReducerData} from "../../../redux/reducer/ChildReducer/CommonLoaderReducer";
import {IconButton,ManagementPage,ManagementTable,PrimaryButton,SecondaryButton} from "../../../admin/design-system";
import EditGallery from "./EditGallery";

export default function GalleryComponent(){const {ShowConfirmation,ShowNotification}=useContext(MainContext),dispatch=useDispatch(),{gallery_list_reducer_data}=useSelector(state=>state.GalleryListReducer),{is_gallery_loading}=useSelector(state=>state.CommonLoaderReducer),[show,setShow]=useState(false),[editableData,setEditableData]=useState({});
 const load=async()=>{try{const result=await GetApi(GetGalleryUrl);if(!result||typeof result.status==="undefined")ShowNotification("error","Network Error");else if(result.status!==200)ShowNotification("error",result.data?.message||"An error occurred");else dispatch(setGalleryListReducerData(result.data?.data));}catch(error){ShowNotification("error","An unexpected error occurred");}finally{dispatch(setIsGalleryLoadingReducerData(false));}};
 useEffect(()=>{load();},[]);const remove=async row=>{if(await ShowConfirmation("Are you sure do you want to delete?","yes","no")!=="yes")return;const result=await DeleteApi(`${DeleteGalleryUrl}${row.id}`);if(result.status!==200)ShowNotification("error",result.data.message);else{ShowNotification("success",result.data.message);dispatch(setGalleryListReducerData(gallery_list_reducer_data.filter(item=>item.id!==row.id)));}};
 const columns=[{name:"ID",selector:row=>row?.id,sortable:true},{name:"Image",cell:row=><img className="mads-management-thumbnail" src={row.image_url} alt="Gallery"/>},{name:"Actions",cell:row=><IconButton label="Delete gallery image" onClick={()=>remove(row)}><FontAwesomeIcon icon={faTrash}/></IconButton>}];
 return <ManagementPage title="Gallery" description="Manage images displayed in the bakery website gallery." primaryAction={<PrimaryButton icon={<FontAwesomeIcon icon={faPlus}/>} onClick={()=>setShow(true)}>Add images</PrimaryButton>} secondaryActions={<SecondaryButton icon={<FontAwesomeIcon icon={faRefresh}/>} onClick={load}>Refresh</SecondaryButton>}><ManagementTable title="Gallery images" columns={columns} rows={gallery_list_reducer_data||[]} loading={is_gallery_loading}/><EditGallery show={show} setShow={setShow} editableData={editableData} setEditableData={setEditableData}/></ManagementPage>;
}
