import React,{useContext,useEffect,useMemo,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEdit,faPlus,faRefresh,faTrash} from "@fortawesome/free-solid-svg-icons";
import {useDispatch,useSelector} from "react-redux";
import MainContext from "../../../context/MainContext";
import {GetApi} from "../../../hooks/Get/GetApi";
import {DeleteApi} from "../../../hooks/Delete/DeleteApi";
import {DeleteCakeUrl,GetCakeUrl} from "../../../Constant/urls/urls";
import {setCakeListReducerData} from "../../../redux/reducer/ChildReducer/CakeListReducer";
import {setIsCakeLoadingReducerData} from "../../../redux/reducer/ChildReducer/CommonLoaderReducer";
import {IconButton,ManagementPage,ManagementTable,PrimaryButton,SecondaryButton,StatusBadge} from "../../../admin/design-system";
import EditCake from "./EditCake";

export default function CakeComponent(){const {ShowNotification,ShowConfirmation}=useContext(MainContext),dispatch=useDispatch(),{cake_list_reducer_data}=useSelector(state=>state.CakeListReducer),{is_cake_loading}=useSelector(state=>state.CommonLoaderReducer),[show,setShow]=useState(false),[editableData,setEditableData]=useState({});
 const load=async()=>{try{const result=await GetApi(GetCakeUrl);if(!result||typeof result.status==="undefined")ShowNotification("error","Network Error");else if(result.status!==200)ShowNotification("error",result.data?.message||"An error occurred");else dispatch(setCakeListReducerData(result.data.data));}catch(error){ShowNotification("error","An unexpected error occurred");}finally{dispatch(setIsCakeLoadingReducerData(false));}};
 useEffect(()=>{if(cake_list_reducer_data?.length)dispatch(setIsCakeLoadingReducerData(false));else load();},[]);
 const remove=async row=>{const answer=await ShowConfirmation("Are you sure do you want to delete?","yes","no");if(answer!=="yes")return;const result=await DeleteApi(`${DeleteCakeUrl}${row.id}/`);if(result.status!==200)ShowNotification("error",result.data.message);else{ShowNotification("success",result.data.message);dispatch(setCakeListReducerData(cake_list_reducer_data.filter(item=>item.id!==row.id)));}};
 const edit=row=>{setEditableData(row);setShow(true);};
 const columns=useMemo(()=>[{name:"ID",selector:row=>row?.id,sortable:true},{name:"Product",selector:row=>row?.name,sortable:true},{name:"Category",selector:row=>row?.sub_category?.name,sortable:true},{name:"Unit",selector:row=>row?.unit?.name},{name:"Tags",cell:row=><div className="mads-tag-list">{(row.tag_details||[]).slice(0,3).map(tag=><StatusBadge tone="info" key={tag.id}>{tag.tag}</StatusBadge>)}</div>},{name:"Images",cell:row=><div className="mads-image-stack">{(row.images||[]).slice(0,4).map(image=><img loading="lazy" key={image.id} src={image.url} alt=""/>)}</div>},{name:"Actions",cell:row=><><IconButton label={`Edit ${row.name||"product"}`} onClick={()=>edit(row)}><FontAwesomeIcon icon={faEdit}/></IconButton><IconButton label={`Delete ${row.name||"product"}`} onClick={()=>remove(row)}><FontAwesomeIcon icon={faTrash}/></IconButton></>}],[cake_list_reducer_data]);
 return <ManagementPage title="Products" description="Manage the bakery products displayed across the website and ordering flows." primaryAction={<PrimaryButton icon={<FontAwesomeIcon icon={faPlus}/>} onClick={()=>setShow(true)}>Add product</PrimaryButton>} secondaryActions={<SecondaryButton icon={<FontAwesomeIcon icon={faRefresh}/>} onClick={load}>Refresh</SecondaryButton>}><ManagementTable title="Product catalogue" columns={columns} rows={cake_list_reducer_data||[]} loading={is_cake_loading} emptyTitle="No products available"/><EditCake show={show} setShow={setShow} editableData={editableData} setEditableData={setEditableData}/></ManagementPage>;
}
