import React,{useContext,useEffect,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEdit,faPlus,faRefresh} from "@fortawesome/free-solid-svg-icons";
import {useDispatch,useSelector} from "react-redux";
import MainContext from "../../context/MainContext";
import {GetApi} from "../../hooks/Get/GetApi";
import {ItemsUrl} from "../../Constant/urls/urls";
import {setItemReducerData} from "../../redux/reducer/ChildReducer/ItemReducer";
import {setIsItemLoadingReducerData} from "../../redux/reducer/ChildReducer/CommonLoaderReducer";
import {IconButton,ManagementPage,ManagementTable,PrimaryButton,SecondaryButton,formatMoney} from "../../admin/design-system";
import AddItem from "./AddItem";

export default function ItemComponent(){const {ShowNotification}=useContext(MainContext),dispatch=useDispatch(),{item_reducer_data}=useSelector(state=>state.ItemReducer),{is_item_loading}=useSelector(state=>state.CommonLoaderReducer),[show,setShow]=useState(false),[editableData,setEditableData]=useState({}),[totalLength,setTotalLength]=useState(null);
 const load=async(page,pageSize)=>{try{let url=ItemsUrl;if(page&&pageSize)url+=`?page=${page||1}&page_size=${pageSize||5}`;const result=await GetApi(url);if(!result||typeof result.status==="undefined")ShowNotification("error","Network Error");else if(result.status!==200)ShowNotification("error",result.data?.message||"An error occurred");else{dispatch(setItemReducerData(result.data?.results?.data));setTotalLength(result.data?.results?.total_length);}}catch(error){ShowNotification("error","An unexpected error occurred");}finally{dispatch(setIsItemLoadingReducerData(false));}};
 useEffect(()=>{load();},[]);const edit=row=>{setEditableData(row);setShow(true);};
 const columns=[{name:"ID",selector:row=>row?.id,sortable:true},{name:"Name",selector:row=>row?.name,sortable:true},{name:"Category",selector:row=>row?.category?.name,sortable:true},{name:"Tax",selector:row=>row?.tax_category?.tax_category},{name:"Retail price",selector:row=>row?.retail_price,right:true,cell:row=>formatMoney(row.retail_price)},{name:"Purchase price",selector:row=>row?.purchase_price,right:true,cell:row=>formatMoney(row.purchase_price)},{name:"Actions",cell:row=><IconButton label={`Edit ${row.name||"item"}`} onClick={()=>edit(row)}><FontAwesomeIcon icon={faEdit}/></IconButton>}];
 return <ManagementPage title="Items" description="Manage reusable stock and pricing items." primaryAction={<PrimaryButton icon={<FontAwesomeIcon icon={faPlus}/>} onClick={()=>setShow(true)}>Add item</PrimaryButton>} secondaryActions={<SecondaryButton icon={<FontAwesomeIcon icon={faRefresh}/>} onClick={()=>load()}>Refresh</SecondaryButton>}><ManagementTable title="Item directory" columns={columns} rows={item_reducer_data||[]} loading={is_item_loading} pageSize={5} serverTotal={totalLength??undefined} onServerPageChange={page=>load(page,5)}/><AddItem show={show} setShow={setShow} editableData={editableData} setEditableData={setEditableData}/></ManagementPage>;
}
