import React,{useContext,useEffect,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEdit,faPlus,faRefresh,faTrash} from "@fortawesome/free-solid-svg-icons";
import {useDispatch,useSelector} from "react-redux";
import MainContext from "../../context/MainContext";
import {DeleteOfferUrl,GetCakeUrl,GetOfferUrl} from "../../Constant/urls/urls";
import {GetApi} from "../../hooks/Get/GetApi";
import {DeleteApi} from "../../hooks/Delete/DeleteApi";
import {setOffersReducerData} from "../../redux/reducer/ChildReducer/OffersReducer";
import {setIsOffersLoadingReducerData} from "../../redux/reducer/ChildReducer/CommonLoaderReducer";
import {setCakeListReducerData} from "../../redux/reducer/ChildReducer/CakeListReducer";
import {convertDateFormat} from "../../commonFunctions";
import {IconButton,ManagementPage,ManagementTable,PrimaryButton,SecondaryButton,StatusBadge} from "../../admin/design-system";
import EditOffers from "./EditOffers";

export default function Offers(){const {ShowNotification,ShowConfirmation}=useContext(MainContext),dispatch=useDispatch(),{offers_reducer_data}=useSelector(state=>state.OffersReducer),{is_offers_loading}=useSelector(state=>state.CommonLoaderReducer),[show,setShow]=useState(false),[editableData,setEditableData]=useState({});
 const loadProducts=async()=>{const result=await GetApi(GetCakeUrl);if(result?.status===200)dispatch(setCakeListReducerData(result.data.data));else ShowNotification("error",result?.data?.message||"Products could not be loaded");};
 const load=async()=>{try{const result=await GetApi(GetOfferUrl);if(!result||typeof result.status==="undefined")ShowNotification("error","Network Error");else if(result.status!==200)ShowNotification("error",result.data?.message||"An error occurred");else dispatch(setOffersReducerData(result.data?.data));}catch(error){ShowNotification("error","An unexpected error occurred");}finally{dispatch(setIsOffersLoadingReducerData(false));}};
 useEffect(()=>{loadProducts();load();},[]);const edit=row=>{setEditableData(row);setShow(true);};const remove=async row=>{if(await ShowConfirmation("Are you sure do you want to delete?","yes","no")!=="yes")return;const result=await DeleteApi(`${DeleteOfferUrl}${row.id}/`);if(result.status!==200)ShowNotification("error",result.data.message);else{ShowNotification("success",result.data.message);dispatch(setOffersReducerData(offers_reducer_data.filter(item=>item.id!==row.id)));}};
 const columns=[{name:"ID",selector:row=>row?.id,sortable:true},{name:"Offer",selector:row=>row?.name,sortable:true},{name:"Discount",selector:row=>`${row?.offer_per} %`},{name:"Starts",selector:row=>convertDateFormat(row?.offer_from),sortable:true},{name:"Ends",selector:row=>convertDateFormat(row?.offer_to),sortable:true},{name:"Status",cell:row=>{const now=new Date(),active=now>=new Date(row.offer_from)&&now<=new Date(row.offer_to);return <StatusBadge tone={active?"success":"neutral"}>{active?"Active":"Inactive"}</StatusBadge>;}},{name:"Actions",cell:row=><><IconButton label={`Edit ${row.name||"offer"}`} onClick={()=>edit(row)}><FontAwesomeIcon icon={faEdit}/></IconButton><IconButton label={`Delete ${row.name||"offer"}`} onClick={()=>remove(row)}><FontAwesomeIcon icon={faTrash}/></IconButton></>}];
 return <ManagementPage title="Offers" description="Schedule promotional offers for selected bakery products." primaryAction={<PrimaryButton icon={<FontAwesomeIcon icon={faPlus}/>} onClick={()=>setShow(true)}>Add offer</PrimaryButton>} secondaryActions={<SecondaryButton icon={<FontAwesomeIcon icon={faRefresh}/>} onClick={load}>Refresh</SecondaryButton>}><ManagementTable title="Offer schedule" columns={columns} rows={offers_reducer_data||[]} loading={is_offers_loading}/><EditOffers show={show} setShow={setShow} editableData={editableData} setEditableData={setEditableData}/></ManagementPage>;
}
