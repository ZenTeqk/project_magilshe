let buildQuotationPdf;

beforeAll(()=>{
 HTMLCanvasElement.prototype.getContext=()=>({});
 ({buildQuotationPdf}=require("./quotationPdf"));
});

test("renders long quotation content as a valid flowing A4 document",()=>{
 const quotation={
  quotation_no:"Q/26/07/31/00001",created_on:"2026-07-31",customer_name:"A very long customer name that must wrap safely without touching the event details column",
  phone:"9876543210",email:"customer@example.com",address:"Apartment 42, A deliberately long delivery and billing address extending across several words, Chennai, Tamil Nadu 600001",
  event_date:"2026-08-20",valid_until:"2026-08-05",cake_type:"Large multi-tier celebration cake",flavour:"Chocolate truffle with detailed handmade decorations",
  quantity:2,rate:2500,gst_enabled:true,gst_percentage:18,subtotal:5000,gst_amount:900,total_amount:5900,advance_amount:2000,balance_amount:3900,
  payment_terms:"An intentionally long payment term that wraps over multiple lines while preserving spacing between every commercial section. ".repeat(3),
  notes:"Detailed customer notes and preparation instructions. ".repeat(8),
 };
 const company={name:"Magilshe Bakery",company_address:"A long registered company address, Chennai, Tamil Nadu",mobile:"9999999999",email:"hello@example.com",gst_number:"33ABCDE1234F1Z5",return_policy:"Terms and conditions. ".repeat(20)};
 const pdf=buildQuotationPdf({quotation,company});
 expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(210,0);
 expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(297,0);
 expect(pdf.internal.getNumberOfPages()).toBeGreaterThanOrEqual(1);
 expect(pdf.output("arraybuffer").byteLength).toBeGreaterThan(1000);
});
