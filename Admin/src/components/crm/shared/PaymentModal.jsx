import React from "react";
import {DateInput,Field,Modal,NotesInput,NumberInput,PrimaryButton,SecondaryButton,SelectInput,TextInput} from "../../../admin/design-system";
export default function PaymentModal({open,title="Record payment",payment,setPayment,methods=[],error,onClose,onSubmit,submitLabel="Record payment"}){
 if(!payment)return null;
 const change=(key,value)=>setPayment({...payment,[key]:value});
 return <Modal open={open} onClose={onClose} title={title} footer={<><SecondaryButton onClick={onClose}>Cancel</SecondaryButton><PrimaryButton onClick={onSubmit}>{submitLabel}</PrimaryButton></>}>
  {error&&<div className="crm-error" role="alert">{error}</div>}
  <Field label="Amount received" required><NumberInput min="0" step="0.01" value={payment.amount||""} onChange={event=>change("amount",event.target.value)}/></Field>
  <Field label="Payment method" required><SelectInput value={payment.payment_method||""} onChange={event=>change("payment_method",event.target.value)}><option value="">Select payment method</option>{methods.map(method=><option key={method} value={method}>{method}</option>)}</SelectInput></Field>
  <Field label="Payment date" required><DateInput value={payment.payment_date||""} onChange={event=>change("payment_date",event.target.value)}/></Field>
  <Field label="Transaction reference"><TextInput value={payment.transaction_reference||""} onChange={event=>change("transaction_reference",event.target.value)}/></Field>
  <Field label="Payment proof"><input type="file" accept="image/*,.pdf" onChange={event=>change("proof",event.target.files[0])}/></Field>
  <Field label="Notes"><NotesInput rows={3} value={payment.customer_remarks||""} onChange={event=>change("customer_remarks",event.target.value)}/></Field>
 </Modal>;
}
