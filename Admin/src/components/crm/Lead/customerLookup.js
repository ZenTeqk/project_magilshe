import {Api} from "../../../Api/Api";

const searchCache=new Map();
const CACHE_TTL=5*60*1000;

// Reuses the Quotation module's customer-search endpoint (name, phone or email,
// partial match) instead of the old lead-only exact-phone lookup, so both
// modules share one backend implementation.
export async function searchCustomers(term){
 const normalized=String(term||"").trim();
 if(normalized.length<2)return [];
 const key=normalized.toLowerCase();
 const cached=searchCache.get(key);
 if(cached&&Date.now()-cached.savedAt<CACHE_TTL)return cached.results;
 const {data}=await Api.get("crm/quotations/customer-search/",{params:{q:normalized}});
 const results=data||[];
 searchCache.set(key,{results,savedAt:Date.now()});
 return results;
}

export async function lookupExistingCustomer(term){
 const results=await searchCustomers(term);
 const digits=String(term||"").replace(/\D/g,"");
 const normalized=String(term||"").trim().toLowerCase();
 const exact=results.find(customer=>
  (digits.length===10&&String(customer.phone||"").replace(/\D/g,"")===digits)||
  String(customer.name||"").toLowerCase()===normalized
 );
 return results.length===1?results[0]:exact||null;
}

export function customerProfileFields(customer){
 if(!customer)return {};
 const addresses=customer.addresses||[];
 const address=addresses.find(item=>item.is_primary)||addresses[0]||{};
 return Object.fromEntries(Object.entries({
  customer_name:customer.name,
  email:customer.email,
  address:address.address,
  city:address.city,
  pincode:address.pincode,
 }).filter(([,value])=>value!==null&&value!==undefined&&value!==""));
}
