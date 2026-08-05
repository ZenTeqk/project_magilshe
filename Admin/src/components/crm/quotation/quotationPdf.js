import {jsPDF} from "jspdf";

const text=value=>value===null||value===undefined||value===""?"—":String(value);
const amount=value=>`INR ${Number(value||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const date=value=>value?new Date(value).toLocaleDateString("en-IN"):"—";

export function buildQuotationPdf({quotation:q,company={},logoData}){
 const doc=new jsPDF({unit:"mm",format:"a4",orientation:"portrait"});
 const width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
 const left=16,right=width-16,content=right-left,bottom=height-18;
 let y=16;
 const lineHeight=4.8;
 const items=q.items?.length?q.items:[{item_name:q.cake_type||"Custom cake",flavour:q.flavour,quantity:q.quantity||1,rate:q.rate,gst_percentage:q.gst_percentage,amount:q.total_amount}];
 // A normal quotation stays on one A4 page. Multiple-item quotations may flow
 // naturally to an additional page rather than shrinking or overlapping rows.
 const allowAdditionalPages=items.length>1;
 const ensure=needed=>{if(allowAdditionalPages&&y+needed>bottom){doc.addPage();y=18;}};
 const wrapped=(value,maxWidth)=>doc.splitTextToSize(text(value),maxWidth).slice(0,4);
 const section=title=>{ensure(13);doc.setFillColor(245,247,250);doc.roundedRect(left,y,content,9,1.5,1.5,"F");doc.setTextColor(52,64,84);doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text(title,left+4,y+6);y+=14;};
 const paragraph=(title,value)=>{const lines=wrapped(value,content).slice(0,3);ensure(8+lines.length*lineHeight);doc.setTextColor(52,64,84);doc.setFont("helvetica","bold");doc.setFontSize(8);doc.text(title,left,y);y+=4;doc.setFont("helvetica","normal");doc.setFontSize(8);doc.text(lines,left,y);y+=lines.length*4+4;};

 // Header
 doc.setFillColor(25,35,54);doc.rect(0,0,width,42,"F");
 if(logoData){try{doc.addImage(logoData,logoData.startsWith("data:image/png")?"PNG":"JPEG",left,8,26,25);}catch{/* retain a clean text header if the configured logo is unsupported */}}
 const brand=company.name||"Magilshe Bakery";
 doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(17);doc.text(brand,logoData?48:left,15);
 doc.setFont("helvetica","normal");doc.setFontSize(8);
 const companyLines=wrapped([company.company_address,company.mobile,company.email,company.gst_number?`GSTIN: ${company.gst_number}`:""].filter(Boolean).join("  |  "),96);
 doc.text(companyLines,logoData?48:left,21);
 doc.setFont("helvetica","bold");doc.setFontSize(22);doc.text("QUOTATION",right,15,{align:"right"});
 doc.setFont("helvetica","normal");doc.setFontSize(8);doc.text(`Quote Number: ${text(q.quotation_no)}`,right,23,{align:"right"});doc.text(`Date: ${date(q.created_on)}`,right,28,{align:"right"});
 y=50;

 // Customer block dynamically grows with address/name content.
 section("QUOTATION TO");
 const nameLines=wrapped(q.customer_name,110),billingLines=wrapped(q.billing_address||q.address,82),shippingLines=wrapped(q.address,82);
 const customerHeight=(nameLines.length+Math.max(billingLines.length,shippingLines.length))*lineHeight+40;ensure(customerHeight);
 doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text(nameLines,left,y);let cy=y+nameLines.length*lineHeight;
 doc.setFont("helvetica","normal");doc.setFontSize(9);doc.text(`Phone: ${text(q.phone)}`,left,cy);cy+=lineHeight;
 if(q.email){doc.text(`Email: ${q.email}`,left,cy);cy+=lineHeight;}
 cy=Math.max(cy,y+25);
 doc.setFont("helvetica","bold");doc.setFontSize(8);doc.text("Billing Address",left,cy);doc.text("Shipping Address",left+88,cy);cy+=4;
 doc.setFont("helvetica","normal");doc.text(billingLines,left,cy);doc.text(shippingLines,left+88,cy);
 doc.setFont("helvetica","bold");doc.text("Event Date",right-48,y);doc.setFont("helvetica","normal");doc.text(date(q.event_date),right-48,y+5);
 if(q.valid_until){doc.setFont("helvetica","bold");doc.text("Valid Until",right-48,y+13);doc.setFont("helvetica","normal");doc.text(date(q.valid_until),right-48,y+18);}
 y+=customerHeight;

 // Items table with a row height based on wrapped description.
 section("ITEMS");
 const columns={item:left+3,description:left+26,qty:left+104,rate:left+123,gst:left+148,amount:right-3};
 doc.setFillColor(43,55,76);doc.rect(left,y,content,10,"F");doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(8);
 [["ITEM",columns.item],["DESCRIPTION",columns.description],["QTY",columns.qty],["RATE",columns.rate],["GST",columns.gst]].forEach(([label,x])=>doc.text(label,x,y+6));doc.text("AMOUNT",columns.amount,y+6,{align:"right"});y+=10;
 items.forEach((item,index)=>{const description=wrapped([item.item_name,item.flavour,item.weight?`${item.weight} kg`:"",item.description].filter(Boolean).join(" - "),72),rowHeight=Math.max(14,description.length*lineHeight+6);ensure(rowHeight);doc.setDrawColor(218,223,231);doc.rect(left,y,content,rowHeight);doc.setTextColor(52,64,84);doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.text(String(index+1),columns.item,y+7);doc.text(description,columns.description,y+7);doc.text(text(item.quantity||1),columns.qty,y+7);doc.text(amount(item.rate),columns.rate,y+7);doc.text(`${item.gst_percentage||0}%`,columns.gst,y+7);doc.text(amount(item.amount??Number(item.quantity||0)*Number(item.rate||0)*(1+Number(item.gst_percentage||0)/100)),columns.amount,y+7,{align:"right"});y+=rowHeight;});y+=8;

 // A single protected totals box; labels left, all money right, no wrapping.
 ensure(58);const boxWidth=82,boxX=right-boxWidth,totals=[["Subtotal",q.subtotal||q.total_amount],["GST",q.gst_amount],["Grand Total",q.total_amount],["Advance Received",q.advance_amount],["Balance",q.balance_amount]];
 doc.setDrawColor(205,211,220);doc.roundedRect(boxX,y,boxWidth,48,2,2);
 totals.forEach(([label,value],index)=>{const rowY=y+8+index*9;if(index===2||index===4){doc.setFillColor(index===2?238:236,index===2?242:253,index===2?255:243);doc.rect(boxX+1,rowY-6.5,boxWidth-2,9,"F");doc.setFont("helvetica","bold");}else doc.setFont("helvetica","normal");doc.setTextColor(52,64,84);doc.setFontSize(9);doc.text(label,boxX+4,rowY);doc.text(amount(value),right-4,rowY,{align:"right"});});y+=56;

 section("COMMERCIAL DETAILS");
 paragraph("Payment Terms",q.payment_terms||"Payment as agreed with the customer.");
 paragraph("Notes",q.notes||"Thank you for choosing us for your celebration.");
 paragraph("Terms & Conditions",company.meta?.quotation_terms||company.return_policy||"This quotation is subject to confirmation and availability. Changes after approval may affect pricing and delivery timelines.");

 ensure(38);doc.setDrawColor(120,130,145);doc.line(left,y+20,left+58,y+20);doc.line(right-58,y+20,right,y+20);doc.setTextColor(52,64,84);doc.setFont("helvetica","normal");doc.setFontSize(8);doc.text("Authorised Signature",left+29,y+26,{align:"center"});doc.text("Company Seal",right-29,y+26,{align:"center"});y+=35;
 ensure(18);doc.setFillColor(245,247,250);doc.roundedRect(left,y,content,14,2,2,"F");doc.setTextColor(52,64,84);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text(company.greeting_text||"Thank you for your business!",width/2,y+6,{align:"center"});doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.text([brand,company.website||company.email||company.mobile].filter(Boolean).join("  |  "),width/2,y+11,{align:"center"});
 return doc;
}
