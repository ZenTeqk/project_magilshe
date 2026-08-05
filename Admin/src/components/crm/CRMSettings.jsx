import React,{useCallback,useContext,useEffect,useMemo,useState} from "react";
import {EditOutlined,DeleteOutline,CakeOutlined,DescriptionOutlined,Inventory2Outlined,ReceiptLongOutlined,LocalShippingOutlined,PeopleOutline,NotificationsNoneOutlined} from "@mui/icons-material";
import {Api} from "../../Api/Api";
import MainContext from "../../context/MainContext";
import {SettingsPageTemplate} from "../../admin/templates";
import {DataTable,EmptyState,Field,IconButton,Modal,NumberInput,PrimaryButton,SearchBar,SecondaryButton,StatusBadge,TextInput,extractErrorMessage,extractFieldErrors} from "../../admin/design-system";
import "./crm.scss";

const modules=[
 {key:"lead",label:"Lead Settings",icon:<CakeOutlined fontSize="small"/>,items:[
  {type:"cake_type",label:"Cake Types",description:"Cake product styles shown on lead forms."},{type:"cake_flavour",label:"Cake Flavours",description:"Flavours available to the sales team."},{type:"cake_product",label:"Cake Products",description:"Reusable cakes and product names used in commercial item tables."},{type:"product_rate",label:"Product Rates",description:"Standard product and cake rate references for staff."},{type:"occasion",label:"Occasions",description:"Events and occasions customers enquire about."},{type:"lead_source",label:"Lead Sources",description:"Where enquiries originate."},{type:"winning_reason",label:"Reasons for Won",description:"Why customers choose the bakery."},{type:"loss_reason",label:"Reasons for Lost",description:"Why opportunities do not convert."},
 ]},
 {key:"quotation",label:"Quotation Settings",icon:<DescriptionOutlined fontSize="small"/>,items:[
  {type:"quotation_status",label:"Quotation Statuses",description:"Statuses used in the quotation workflow."},{type:"payment_term",label:"Payment Terms",description:"Reusable commercial payment terms."},{type:"quotation_validity",label:"Validity Options",description:"Standard quotation validity periods."},{type:"tax_setting",label:"GST Rates",description:"Editable GST percentages used by quotation items, such as 0% and 18%."},
 ]},
 {key:"order",label:"Order Settings",icon:<Inventory2Outlined fontSize="small"/>,items:[
  {type:"order_status",label:"Order Statuses",description:"Customer order lifecycle options."},{type:"production_status",label:"Processing Statuses",description:"Operational preparation stages used by staff."},{type:"order_priority",label:"Order Priorities",description:"Priority labels for urgent and scheduled orders."},
 ]},
 {key:"invoice",label:"Invoice Settings",icon:<ReceiptLongOutlined fontSize="small"/>,items:[
  {type:"invoice_status",label:"Invoice Statuses",description:"Invoice lifecycle options."},{type:"payment_method",label:"Payment Methods",description:"Ways customers can make payment."},{type:"invoice_term",label:"Invoice Terms",description:"Reusable billing terms displayed on customer invoices."},
 ]},
 {key:"delivery",label:"Delivery Settings",icon:<LocalShippingOutlined fontSize="small"/>,items:[
  {type:"delivery_method",label:"Delivery Methods",description:"Fulfilment methods for confirmed orders."},{type:"delivery_time_slot",label:"Delivery Time Slots",description:"Reusable delivery and pickup time windows."},{type:"delivery_area",label:"Delivery Areas",description:"Areas serviced by the delivery team."},
 ]},
];

const placeholders=[
 {key:"customer-categories",group:"Customer Settings",label:"Customer Categories",icon:<PeopleOutline fontSize="small"/>,description:"Customer-level configuration (loyalty tiers, categories) is not yet available. It will appear here once approved."},
 {key:"customer-tags",group:"Customer Settings",label:"Tags",icon:<PeopleOutline fontSize="small"/>,description:"Customer tagging is not yet available. It will appear here once approved."},
 {key:"notification-email",group:"Notification Settings",label:"Email Templates",icon:<NotificationsNoneOutlined fontSize="small"/>,description:"Email sending is not yet connected to a messaging provider, so templates are not configurable yet. Reminders currently open a pre-filled message for staff to send manually."},
 {key:"notification-sms",group:"Notification Settings",label:"SMS Templates",icon:<NotificationsNoneOutlined fontSize="small"/>,description:"SMS sending is not yet connected to a messaging provider, so templates are not configurable yet. Reminders currently open a pre-filled message for staff to send manually."},
 {key:"notification-whatsapp",group:"Notification Settings",label:"WhatsApp Templates",icon:<NotificationsNoneOutlined fontSize="small"/>,description:"WhatsApp sending is not yet connected to a messaging provider, so templates are not configurable yet. Reminders currently open a pre-filled message for staff to send manually."},
];

const settings=modules.flatMap(module=>module.items.map(item=>({...item,module:module.label})));

export default function CRMSettings(){
 const {ShowNotification}=useContext(MainContext)||{};
 const [group,setGroup]=useState(settings[0]),[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[editor,setEditor]=useState(null),[editorErrors,setEditorErrors]=useState({}),[saving,setSaving]=useState(false),[search,setSearch]=useState("");
 const isPlaceholder=typeof group==="object"&&!group.type;
 const load=useCallback(()=>{if(isPlaceholder)return;setLoading(true);setFailed(false);Api.get("crm/options/",{params:{type:group.type}}).then(({data})=>setRows(data.results||data)).catch(()=>setFailed(true)).finally(()=>setLoading(false));},[group,isPlaceholder]);
 useEffect(()=>{setSearch("");load();},[load]);
 const openEditor=row=>{setEditorErrors({});setEditor(row);};
 const save=async()=>{if(saving)return;setSaving(true);setEditorErrors({});const payload={option_type:group.type,name:editor.name.trim(),sort_order:Number(editor.sort_order||0),is_active:editor.is_active??true};
  try{editor.id?await Api.patch(`crm/options/${editor.id}/`,payload):await Api.post("crm/options/",payload);ShowNotification?.("success",editor.id?"Option updated successfully":"Option added successfully");setEditor(null);load();}
  catch(err){setEditorErrors(extractFieldErrors(err));ShowNotification?.("error",extractErrorMessage(err,"Unable to save this option."));}
  finally{setSaving(false);}
 };
 const toggle=async row=>{try{await Api.patch(`crm/options/${row.id}/`,{is_active:!row.is_active});load();}catch(err){ShowNotification?.("error",extractErrorMessage(err,"Unable to update availability."));}};
 const remove=async row=>{if(!window.confirm(`Delete "${row.name}"? Existing records will retain this text.`))return;try{await Api.delete(`crm/options/${row.id}/`);ShowNotification?.("success",`"${row.name}" deleted`);load();}catch(err){ShowNotification?.("error",extractErrorMessage(err,"Unable to delete this option."));}};
 const columns=[
  {key:"name",header:"Option",render:row=><strong>{row.name}</strong>},
  {key:"sort_order",header:"Sort order"},
  {key:"active",header:"Availability",render:row=><button type="button" className="mads-plain-action" onClick={()=>toggle(row)} aria-label={`${row.is_active?"Deactivate":"Activate"} ${row.name}`}><StatusBadge tone={row.is_active?"success":"neutral"}>{row.is_active?"Active":"Inactive"}</StatusBadge></button>},
  {key:"actions",header:"Actions",align:"right",render:row=><div className="mads-table-actions"><IconButton label={`Edit ${row.name}`} onClick={()=>openEditor(row)}><EditOutlined fontSize="small"/></IconButton><IconButton label={`Delete ${row.name}`} onClick={()=>remove(row)}><DeleteOutline fontSize="small"/></IconButton></div>},
 ];
 const visibleRows=useMemo(()=>{const term=search.trim().toLowerCase();return term?rows.filter(row=>row.name.toLowerCase().includes(term)):rows;},[rows,search]);
 const placeholderGroups=[...new Set(placeholders.map(item=>item.group))].map(groupLabel=>({key:groupLabel,label:groupLabel,icon:placeholders.find(item=>item.group===groupLabel).icon,items:placeholders.filter(item=>item.group===groupLabel).map(item=>({key:item.key,label:item.label}))}));
 const groups=[...modules.map(module=>({key:module.key,label:module.label,icon:module.icon,items:module.items.map(item=>({key:item.type,label:item.label}))})),...placeholderGroups];
 const onSectionChange=key=>setGroup(settings.find(item=>item.type===key)||placeholders.find(item=>item.key===key)||settings[0]);
 return <SettingsPageTemplate title="Configuration" subtitle="Every CRM-related setting, organised in one place inside CRM." breadcrumbs={[{label:"Dashboard",href:"/"},{label:"CRM",href:"/crm"},{label:"Configuration"}]} groups={groups} navStorageKey="crm-configuration-nav-expanded" activeSection={isPlaceholder?group.key:group.type} onSectionChange={onSectionChange} primaryAction={!isPlaceholder&&<PrimaryButton onClick={()=>openEditor({name:"",sort_order:rows.length,is_active:true})}>Add option</PrimaryButton>}>
  <header className="mads-settings-content-header"><span>{isPlaceholder?group.group:group.module}</span><h2>{group.label}</h2><p>{group.description}</p></header>
  {isPlaceholder?<EmptyState title="Not yet configurable" description={group.description}/>:failed?<div role="alert">Options could not be loaded. <SecondaryButton onClick={load}>Try again</SecondaryButton></div>:<>
   <SearchBar value={search} onChange={event=>setSearch(event.target.value)} onClear={()=>setSearch("")} placeholder={`Search ${group.label.toLowerCase()}…`} label={`Search ${group.label}`}/>
   <DataTable ariaLabel={`${group.label} options`} columns={columns} rows={visibleRows} loading={loading} emptyTitle={search?"No options match this search":`No ${group.label.toLowerCase()} configured`} emptyDescription={search?"Clear the search to see all options.":"Add the first reusable option for this workflow section."}/>
  </>}
  <Modal open={Boolean(editor)} onClose={()=>setEditor(null)} title={`${editor?.id?"Edit":"Add"} ${group.label}`} footer={<><SecondaryButton onClick={()=>setEditor(null)}>Cancel</SecondaryButton><PrimaryButton disabled={!editor?.name?.trim()||saving} onClick={save}>{saving?"Saving…":"Save option"}</PrimaryButton></>}><Field label="Name" required error={editorErrors.name}><TextInput autoFocus name="name" value={editor?.name||""} onChange={event=>setEditor({...editor,name:event.target.value})}/></Field><Field label="Sort order"><NumberInput value={editor?.sort_order??0} onChange={event=>setEditor({...editor,sort_order:event.target.value})}/></Field></Modal>
 </SettingsPageTemplate>;
}
