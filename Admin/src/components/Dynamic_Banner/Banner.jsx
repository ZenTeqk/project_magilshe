import React,{useContext,useEffect,useState} from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPlus} from "@fortawesome/free-solid-svg-icons";
import MainContext from "../../context/MainContext";
import {GetApi} from "../../hooks/Get/GetApi";
import {GetBannerImageUrl} from "../../Constant/urls/urls";
import {EmptyState,GridItem,ManagementPage,PrimaryButton,ResponsiveGrid,SectionCard,SecondaryButton,SkeletonCards,StatusBadge} from "../../admin/design-system";
import AddBanner from "./AddBanner";

const empty={id:0,main_text:"",sub_text:"",status:true,image:{}};
export default function Banner(){const {ShowNotification}=useContext(MainContext),[banners,setBanners]=useState([]),[selectedFileName,setSelectedFileName]=useState(""),[formData,setFormData]=useState(empty),[show,setShow]=useState(false),[loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);try{const result=await GetApi(GetBannerImageUrl);if(!result||typeof result.status==="undefined")ShowNotification("error","Network Error");else if(result.status!==200)ShowNotification("error",result.data?.message||"An error occurred");else setBanners(result.data?.data||[]);}catch(error){ShowNotification("error","An unexpected error occurred");}finally{setLoading(false);}};
 useEffect(()=>{load();},[]);const edit=banner=>{setFormData({id:banner.id,main_text:banner.main_text,sub_text:banner.sub_text,status:banner.status,image:banner.url,image_preview:banner.url});setSelectedFileName("");setShow(true);};
 return <ManagementPage title="Website Banners" description="Manage promotional images displayed in the website banner area." primaryAction={<PrimaryButton icon={<FontAwesomeIcon icon={faPlus}/>} onClick={()=>{setFormData(empty);setShow(true);}}>Add banner</PrimaryButton>} secondaryActions={<SecondaryButton onClick={load}>Refresh</SecondaryButton>}>{loading?<SkeletonCards count={3}/>:!banners.length?<EmptyState title="No banners available" description="Add the first website banner." action={<PrimaryButton onClick={()=>setShow(true)}>Add banner</PrimaryButton>}/>:<ResponsiveGrid>{banners.map(banner=><GridItem span={4} key={banner.id}><SectionCard title={banner.main_text||"Website banner"} description={banner.sub_text} actions={<StatusBadge tone={banner.status?"success":"neutral"}>{banner.status?"Active":"Inactive"}</StatusBadge>}><img className="mads-banner-preview" src={banner.url} alt={banner.main_text||"Website banner"}/><SecondaryButton onClick={()=>edit(banner)}>Edit banner</SecondaryButton></SectionCard></GridItem>)}</ResponsiveGrid>}<AddBanner show={show} setShow={setShow} formData={formData} setFormData={setFormData} selectedFileName={selectedFileName} setSelectedFileName={setSelectedFileName} GetBannerImage={load}/></ManagementPage>;
}
