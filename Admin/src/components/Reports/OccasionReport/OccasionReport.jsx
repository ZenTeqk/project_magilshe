import React,{useContext,useEffect,useState} from "react";
import {useDispatch,useSelector} from "react-redux";
import MainContext from "../../../context/MainContext";
import {GetApi} from "../../../hooks/Get/GetApi";
import {GetOccasionReportUrl} from "../../../Constant/urls/urls";
import {setOccasionReportReducerData} from "../../../redux/reducer/ChildReducer/OccasionReportReducer";
import {ConvertDateStrFunction,convertDateFormat} from "../../../commonFunctions";
import {DateInput,Field,FormSection,ManagementPage,ManagementTable,PrimaryButton} from "../../../admin/design-system";

export default function OccasionReport(){const {ShowNotification}=useContext(MainContext),dispatch=useDispatch(),rows=useSelector(state=>state.OccasionReportReducer.occasion_report_reducer_data),[dates,setDates]=useState({from_date:"",to_date:""}),[loading,setLoading]=useState(false);
 const load=async(from=dates.from_date,to=dates.to_date)=>{if(!from||!to){ShowNotification("error","Please select both dates");return;}setLoading(true);try{const result=await GetApi(`${GetOccasionReportUrl}from_date=${ConvertDateStrFunction(from)}&to_date=${ConvertDateStrFunction(to)}`);if(!result||typeof result.status==="undefined")ShowNotification("error","Network Error");else if(result.status!==200)ShowNotification("error",result.data?.message||"An error occurred");else dispatch(setOccasionReportReducerData(result.data?.data||[]));}catch(error){ShowNotification("error","An unexpected error occurred");}finally{setLoading(false);}};
 useEffect(()=>{const end=new Date(),start=new Date();start.setDate(end.getDate()-30);const from=start.toISOString().slice(0,10),to=end.toISOString().slice(0,10);setDates({from_date:from,to_date:to});load(from,to);},[]);const columns=[{name:"ID",selector:row=>row?.id,sortable:true},{name:"Type",selector:row=>row?.type,sortable:true},{name:"Date",selector:row=>convertDateFormat(row?.date),sortable:true},{name:"Name",selector:row=>row?.person_name,sortable:true}];
 return <ManagementPage title="Occasion Report" description="Review recorded customer occasions for a selected period."><FormSection title="Report filters"><div className="mads-form-grid"><Field label="Start date" span={4}><DateInput value={dates.from_date} onChange={event=>setDates({...dates,from_date:event.target.value})}/></Field><Field label="End date" span={4}><DateInput value={dates.to_date} onChange={event=>setDates({...dates,to_date:event.target.value})}/></Field><div><PrimaryButton onClick={()=>load()}>Get data</PrimaryButton></div></div></FormSection><ManagementTable title="Occasions" columns={columns} rows={rows||[]} loading={loading} emptyTitle="No occasions found" emptyDescription="No customer occasions were recorded in the selected period."/></ManagementPage>;
}
