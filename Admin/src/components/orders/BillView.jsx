import {useEffect,useRef,useState} from "react";
import ReactToPrint from "react-to-print";
import {useSelector} from "react-redux";
import theChennaiCakeryLogo from "../../assets/img/tcc-logo.png";
import {convertDateFormat2} from "../../commonFunctions";
import {Drawer,PrimaryButton,SecondaryButton} from "../../admin/design-system";
import "./Invoice.scss";

const BillView=({show,setShow,setShowBill,billData})=>{
 const {config_reducer_data}=useSelector(state=>state.ConfigReducer),[billTotal,setBillTotal]=useState(0),invoiceRef=useRef();
 useEffect(()=>{if(show)setBillTotal((billData?.cart_details||[]).reduce((sum,item)=>sum+(Number(item.price)||0)*(Number(item.qty)||0),0));},[show,billData]);
 const close=()=>setShow(false),back=()=>{setShow(false);setShowBill(true);};
 return <Drawer open={show} onClose={close} title={`Invoice #${billData?.id||""}`} footer={<><SecondaryButton onClick={back}>Back to order</SecondaryButton><ReactToPrint trigger={()=><PrimaryButton>Print bill</PrimaryButton>} content={()=>invoiceRef.current}/></>}>
  <article className="mads-invoice" ref={invoiceRef}>
   <header className="mads-invoice__header"><img src={theChennaiCakeryLogo} alt="MagilShe"/><div><h2>{config_reducer_data?.name||"MagilShe"}</h2><p>{config_reducer_data?.company_address}</p><p>{config_reducer_data?.mobile} · {config_reducer_data?.email}</p></div></header>
   <div className="mads-invoice__meta"><div><strong>Invoice #{billData?.id}</strong><p>Order #{billData?.id}</p></div><div><p>Order date: {convertDateFormat2(billData?.order_time)}</p><p>Bill date: {convertDateFormat2(billData?.delivery_time)}</p></div></div>
   <section><h3>Customer</h3><p><strong>{billData?.customer?.name||"—"}</strong></p><p>{billData?.delivery_address?.address||"—"}</p><p>{billData?.customer?.phone||"—"} · {billData?.customer?.email||"—"}</p></section>
   <div className="mads-table-scroll"><table className="mads-invoice__table"><thead><tr><th>No.</th><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{billData?.cart_details?.map((item,index)=><tr key={item.id||index}><td>{index+1}</td><td>{item?.cake?.name||"Cake"} {item?.cake?.price_list?.kg&&`(${item.cake.price_list.kg} kg)`}</td><td>{item?.qty}</td><td>₹{item?.price||0}</td><td>₹{(Number(item?.qty)||0)*(Number(item?.price)||0)}</td></tr>)}</tbody><tfoot><tr><th colSpan="4">Grand total</th><th>₹{billTotal}</th></tr></tfoot></table></div>
   <p className="mads-invoice__thanks">Thank you for your business.</p>
  </article>
 </Drawer>;
};
export default BillView;
