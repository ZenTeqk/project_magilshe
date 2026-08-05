import React,{useContext,useEffect,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEdit,faPlus,faRefresh} from "@fortawesome/free-solid-svg-icons";
import MainContext from "../../context/MainContext";
import {GetApi} from "../../hooks/Get/GetApi";
import {GetAllEventsUrl} from "../../Constant/urls/urls";
import {IconButton,ManagementPage,ManagementTable,PrimaryButton,SecondaryButton,StatusBadge} from "../../admin/design-system";
import AddEvents from "./AddEvents";

const blank={id:0,name:"",place:"",start:"",end:"",description:"",cake_id_list:[],cake_list:[],image:null,image_preview:"",status:true};
export default function Events(){const {ShowNotification}=useContext(MainContext),[events,setEvents]=useState([]),[show,setShow]=useState(false),[formData,setFormData]=useState(blank),[loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);try{const result=await GetApi(GetAllEventsUrl);if(!result||result.status!==200)ShowNotification("error","Failed to load events");else setEvents(result.data?.data||[]);}catch(error){ShowNotification("error","Unexpected error");}finally{setLoading(false);}};
 useEffect(()=>{load();},[]);const add=()=>{setFormData(blank);setShow(true);};const edit=event=>{setFormData({id:event.id,name:event.name,place:event.place,start:event.start,end:event.end,description:event.description,cake_id_list:Array.isArray(event.cake_id_list)?event.cake_id_list:[],image:null,image_preview:event.url||"",status:Boolean(event.status)});setShow(true);};
 const columns=[{name:"#",selector:row=>row?.id,sortable:true},{name:"Image",cell:row=>row.url?<img className="mads-management-thumbnail" src={row.url} alt={`${row.name||"Event"} preview`}/>:"—"},{name:"Event",selector:row=>row?.name,sortable:true},{name:"Place",selector:row=>row?.place,sortable:true},{name:"Status",cell:row=><StatusBadge tone={row.status?"success":"neutral"}>{row.status?"Active":"Inactive"}</StatusBadge>},{name:"Actions",cell:row=><IconButton label={`Edit ${row.name||"event"}`} onClick={()=>edit(row)}><FontAwesomeIcon icon={faEdit}/></IconButton>}];
 return <ManagementPage title="Events" description="Manage bakery events and their associated product selections." primaryAction={<PrimaryButton icon={<FontAwesomeIcon icon={faPlus}/>} onClick={add}>Add event</PrimaryButton>} secondaryActions={<SecondaryButton icon={<FontAwesomeIcon icon={faRefresh}/>} onClick={load}>Refresh</SecondaryButton>}><ManagementTable title="Website events" columns={columns} rows={events} loading={loading}/><AddEvents show={show} setShow={setShow} formData={formData} setFormData={setFormData} GetAllEvents={load}/></ManagementPage>;
}
