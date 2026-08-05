import {useContext,useEffect,useState} from "react";
import {useDispatch,useSelector} from "react-redux";
import MainContext from "../../context/MainContext";
import {convertDateFormat2} from "../../commonFunctions";
import {GetDeliveryPersonUrl,UpdateOrderStatusUrl} from "../../Constant/urls/urls";
import {GetApi} from "../../hooks/Get/GetApi";
import {PostApi} from "../../hooks/Post/PostApi";
import {setDeliveryPersonReducerData} from "../../redux/reducer/ChildReducer/DeliveryPersonReducer";
import {Drawer,Field,FormSection,PrimaryButton,SecondaryButton,SelectInput,StatusBadge,TextInput} from "../../admin/design-system";
import {CustomerSummaryPanel} from "../../admin/workflow";

const EditOrders=({show,setShow,editableData,setEditableData,statusArray,setShowBill})=>{
 const {ShowNotification}=useContext(MainContext),dispatch=useDispatch();
 const {delivery_person_reducer_data}=useSelector(state=>state.DeliveryPersonReducer);
 const [orderDetails,setOrderDetails]=useState({cake_order_id:0,delivery_status:0,tracking_link:"",delivery_partner_id:1});
 const close=()=>{setShow(false);setEditableData({});};
 useEffect(()=>{if(!show)return;setOrderDetails({cake_order_id:editableData?.id||0,delivery_status:editableData?.delivery_status??0,tracking_link:editableData?.tracking_link||"",delivery_partner_id:editableData?.delivery_partner_id||editableData?.delivery_partner?.id||""});(async()=>{try{const result=await GetApi(GetDeliveryPersonUrl);if(result?.status===200)dispatch(setDeliveryPersonReducerData(result.data.data));else ShowNotification("error",result?.data?.message||"Unable to load delivery staff");}catch(error){ShowNotification("error","An unexpected error occurred");}})();},[show,editableData,dispatch,ShowNotification]);
 const update=async()=>{try{const result=await PostApi(UpdateOrderStatusUrl,orderDetails);if(result?.status!==200)ShowNotification("error",result?.data?.message||"Unable to update order");else{ShowNotification("success","Order status updated");window.getOrders?.();close();}}catch(error){ShowNotification("error","An unexpected error occurred");}};
 const openBill=()=>{setShow(false);setShowBill(true);};
 return <Drawer open={show} onClose={close} title={`Order #${editableData?.id||""}`} footer={<><SecondaryButton onClick={close}>Close</SecondaryButton>{statusArray[editableData?.delivery_status]==="Delivered"&&<SecondaryButton onClick={openBill}>View bill</SecondaryButton>}<PrimaryButton onClick={update}>Update order status</PrimaryButton></>}>
  <CustomerSummaryPanel customer={{name:editableData?.customer?.name,phone:editableData?.customer?.phone,email:editableData?.customer?.email,order_time:convertDateFormat2(editableData?.order_time)||"—",delivery_time:convertDateFormat2(editableData?.delivery_time)||"—",address:[editableData?.delivery_address?.address_title,editableData?.delivery_address?.address,editableData?.delivery_address?.city,editableData?.delivery_address?.pincode].filter(Boolean).join(", ")}} fields={[{key:"phone",label:"Phone"},{key:"email",label:"Email"},{key:"order_time",label:"Order time"},{key:"delivery_time",label:"Delivery time"},{key:"address",label:"Delivery address",wide:true}]} actions={<StatusBadge>{statusArray[editableData?.delivery_status]||"Unknown"}</StatusBadge>}/>
  <FormSection title="Fulfilment update" description="Assign delivery and record the current order state.">
   <Field label="Tracking link"><TextInput value={orderDetails.tracking_link} onChange={event=>setOrderDetails(old=>({...old,tracking_link:event.target.value}))}/></Field>
   <Field label="Delivery partner"><SelectInput value={orderDetails.delivery_partner_id} onChange={event=>setOrderDetails(old=>({...old,delivery_partner_id:event.target.value}))}><option value="">Select delivery partner</option>{delivery_person_reducer_data?.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</SelectInput></Field>
   <Field label="Order status"><SelectInput value={orderDetails.delivery_status} onChange={event=>setOrderDetails(old=>({...old,delivery_status:event.target.value}))}>{statusArray.map((status,index)=><option key={`${status}-${index}`} value={index}>{status||"Select status"}</option>)}</SelectInput></Field>
  </FormSection>
  <FormSection title="Order items">{editableData?.cart_details?.length?editableData.cart_details.map((item,index)=><div className="mads-order-line" key={item.id||index}>{item?.cake?.images?.[0]?.url&&<img className="mads-thumbnail" src={item.cake.images[0].url} alt={`${item?.cake?.name||"Cake"} preview`}/>}<div><strong>{item?.cake?.name||"Cake item"}</strong><div className="mads-muted">{item?.cake?.sub_category?.name||""} · {item?.cake?.price_list?.kg} {item?.cake?.unit?.name||"Pc"} × {item?.qty}</div>{item?.greeting_text&&<StatusBadge tone="success">{item.greeting_text}</StatusBadge>}</div><strong>₹{item?.price||0}</strong></div>):<p className="mads-muted">No items are attached to this order.</p>}</FormSection>
 </Drawer>;
};
export default EditOrders;
