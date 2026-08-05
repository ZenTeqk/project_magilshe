import React,{useContext,useEffect,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEdit,faPlus,faRefresh} from "@fortawesome/free-solid-svg-icons";
import {useDispatch,useSelector} from "react-redux";
import {GetApi} from "../../../hooks/Get/GetApi";
import MainContext from "../../../context/MainContext";
import {GetSubCategoryUrl} from "../../../Constant/urls/urls";
import {setSubCategoryReducerData} from "../../../redux/reducer/ChildReducer/SubCategoryReducer";
import {setIsSubCategoryLoadingReducerData} from "../../../redux/reducer/ChildReducer/CommonLoaderReducer";
import {IconButton,ManagementPage,ManagementTable,PrimaryButton,SecondaryButton} from "../../../admin/design-system";
import EditSubCategory from "./EditSubCategory";

export default function SubCategory(){const dispatch=useDispatch(),{ShowNotification}=useContext(MainContext),{sub_category_reducer_data}=useSelector(state=>state.SubCategoryReducer),{is_sub_category_loading}=useSelector(state=>state.CommonLoaderReducer),[show,setShow]=useState(false),[editableData,setEditableData]=useState({});
 const load=async()=>{try{const result=await GetApi(GetSubCategoryUrl);if(!result||typeof result.status==="undefined")ShowNotification("error","Network Error");else if(result.status!==200)ShowNotification("error",result.data?.message||"An error occurred");else dispatch(setSubCategoryReducerData(result.data.data));}catch(error){ShowNotification("error","An unexpected error occurred");}finally{dispatch(setIsSubCategoryLoadingReducerData(false));}};
 useEffect(()=>{load();},[]);const edit=row=>{setEditableData(row);setShow(true);};
 const columns=[{name:"ID",selector:row=>row?.id,sortable:true},{name:"Subcategory",selector:row=>row?.name,sortable:true},{name:"Main category",selector:row=>row?.main_category?.name,sortable:true},{name:"Image",cell:row=>row.image_url?<img className="mads-management-thumbnail" src={row.image_url} alt={`${row.name||"Subcategory"} preview`}/>:"—"},{name:"Actions",cell:row=><IconButton label={`Edit ${row.name||"subcategory"}`} onClick={()=>edit(row)}><FontAwesomeIcon icon={faEdit}/></IconButton>}];
 return <ManagementPage title="Cake Subcategories" description="Maintain the second level of the website product catalogue." primaryAction={<PrimaryButton icon={<FontAwesomeIcon icon={faPlus}/>} onClick={()=>setShow(true)}>Add subcategory</PrimaryButton>} secondaryActions={<SecondaryButton icon={<FontAwesomeIcon icon={faRefresh}/>} onClick={load}>Refresh</SecondaryButton>}><ManagementTable title="Subcategory directory" columns={columns} rows={sub_category_reducer_data||[]} loading={is_sub_category_loading}/><EditSubCategory show={show} setShow={setShow} editableData={editableData} setEditableData={setEditableData}/></ManagementPage>;
}
