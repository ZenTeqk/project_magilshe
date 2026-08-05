import React, { useContext, useEffect, useState } from "react";
import { Api } from "../../../Api/Api";
import MainContext from "../../../context/MainContext";
import { customerProfileFields, lookupExistingCustomer } from "./customerLookup";
import { DateInput, Field, NumberInput, PhoneInput, PrimaryButton, SecondaryButton, SelectInput, TextInput, extractErrorMessage, extractFieldErrors, focusFirstInvalidField } from "../../../admin/design-system";

export const emptyQuickLead={customer_name:"",phone:"",occasion:"Birthday",cake_type:"Custom Cake",flavour:"",quantity:1,event_date:""};

export default function QuickEntry({initialData,onCancel,onSaved,onFullForm}){
  const {ShowNotification}=useContext(MainContext)||{};
  const [form,setForm]=useState({...emptyQuickLead,...initialData});
  const [errors,setErrors]=useState({}),[saving,setSaving]=useState(false);
  const [options,setOptions]=useState({occasion:["Birthday"],cake_flavour:[]});
  const [matchedCustomer,setMatchedCustomer]=useState(null);
  useEffect(()=>setForm({...emptyQuickLead,...initialData}),[initialData]);
  useEffect(()=>{Promise.all(["occasion","cake_flavour"].map(type=>Api.get("crm/options/",{params:{type,active:true}}).then(({data})=>[type,(data.results||data).map(x=>x.name)]))).then(values=>setOptions(Object.fromEntries(values)));},[]);
  useEffect(()=>{const phone=String(form.phone||"").replace(/\D/g,"");const name=String(form.customer_name||"").trim();setMatchedCustomer(null);const term=phone.length===10?phone:name.length>=3?name:"";if(!term)return undefined;let active=true;const timer=setTimeout(()=>lookupExistingCustomer(term).then(customer=>{if(!active)return;setMatchedCustomer(customer);if(customer)setForm(current=>({...current,...customerProfileFields(customer),phone:customer.phone?String(customer.phone).replace(/\D/g,"").slice(-10)||current.phone:current.phone}));}).catch(()=>{}),300);return()=>{active=false;clearTimeout(timer);};},[form.phone,form.customer_name]);
  const change=e=>setForm({...form,[e.target.name]:e.target.value});
  const submit=async e=>{
    e.preventDefault(); if(saving)return; setErrors({});
    const clientErrors={};
    const phoneDigits=String(form.phone||"").replace(/\D/g,"");
    if(!phoneDigits||phoneDigits.length!==10)clientErrors.phone="Phone number must contain exactly 10 digits.";
    if(!form.customer_name?.trim())clientErrors.customer_name="Customer name is required.";
    if(!form.event_date)clientErrors.event_date="Event date is required.";
    if(Object.keys(clientErrors).length){setErrors(clientErrors);ShowNotification?.("error","Please check the highlighted fields.");focusFirstInvalidField(clientErrors,".crm-quick-lead");return;}
    setSaving(true);
    try { const {data}=await Api.post("crm/leads/",form); ShowNotification?.("success","Lead created successfully"); onSaved(data); }
    catch(err){ const fieldErrors=extractFieldErrors(err); setErrors(fieldErrors); ShowNotification?.("error",extractErrorMessage(err,"Unable to create lead.")); focusFirstInvalidField(fieldErrors,".crm-quick-lead"); }
    finally{setSaving(false);}
  };
  return <form className="crm-quick-lead" onSubmit={submit}>
    <div className="crm-modal-body">
      {Object.keys(errors).length>0&&<div className="crm-error" role="alert"><strong>Please check the highlighted field{Object.keys(errors).length>1?"s":""} below</strong></div>}
      <p className="crm-quick-lead__intro">Capture the essentials now. You can continue with the complete enquiry form without losing these details.</p>
      <section className="crm-quick-group" aria-labelledby="quick-customer-heading">
        <header><span>1</span><div><h3 id="quick-customer-heading">Customer</h3><p>Primary contact used for customer matching.</p></div></header>
        <div className="crm-fields crm-quick-fields">
          <Field label="Customer name" required span={1} error={errors.customer_name}><TextInput name="customer_name" value={form.customer_name} onChange={change}/></Field>
          <Field label="Phone number" required span={1} error={errors.phone}><PhoneInput name="phone" maxLength={10} value={form.phone} onChange={change}/></Field>
        </div>
        {matchedCustomer&&<div className="crm-customer-match" role="status"><strong>Existing customer found</strong><span>{matchedCustomer.name||matchedCustomer.phone}</span></div>}
      </section>
      <section className="crm-quick-group" aria-labelledby="quick-requirement-heading">
        <header><span>2</span><div><h3 id="quick-requirement-heading">Order requirement</h3><p>Occasion, flavour, quantity and event date.</p></div></header>
        <div className="crm-fields crm-quick-fields">
          <Field label="Occasion" required span={1} error={errors.occasion}>
            <SelectInput name="occasion" value={form.occasion} onChange={change}>{options.occasion.map(x=><option value={x} key={x}>{x}</option>)}</SelectInput>
          </Field>
          <Field label="Cake flavour" required span={1} error={errors.flavour}>
            <SelectInput name="flavour" value={form.flavour} onChange={change}>{options.cake_flavour.map(x=><option value={x} key={x}>{x}</option>)}</SelectInput>
          </Field>
          <Field label="Quantity" required span={1} error={errors.quantity}><NumberInput name="quantity" min={1} value={form.quantity} onChange={change}/></Field>
          <Field label="Event date" required span={1} error={errors.event_date}><DateInput name="event_date" min={new Date().toISOString().slice(0,10)} value={form.event_date} onChange={change}/></Field>
        </div>
      </section>
    </div>
    <div className="crm-modal-footer">
      <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
      <SecondaryButton onClick={()=>onFullForm(form)}>Open full form</SecondaryButton>
      <PrimaryButton type="submit" disabled={saving}>{saving?"Saving…":"Save lead"}</PrimaryButton>
    </div>
  </form>;
}
