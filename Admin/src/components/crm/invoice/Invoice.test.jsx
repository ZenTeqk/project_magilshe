import React from "react";
import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {Api} from "../../../Api/Api";
import MainContext from "../../../context/MainContext";
import InvoiceList from "./InvoiceList";
import InvoiceDetails from "./InvoiceDetails";

const mockNavigate=jest.fn(),notify=jest.fn();
jest.mock("react-router-dom",()=>({...jest.requireActual("react-router-dom"),useNavigate:()=>mockNavigate,useParams:()=>({id:"15"})}));
jest.mock("../../../Api/Api",()=>({Api:{get:jest.fn(),post:jest.fn()}}));
jest.mock("./invoicePdf",()=>({buildInvoicePdf:jest.fn()}));

const invoice={id:15,invoice_no:"I-15",order_no:"O-11",customer_name:"Meera",phone:"9000000000",email:"meera@example.com",address:"Venue, Chennai",status:"Generated",event_date:"2026-08-10",delivery_date:"2026-08-10",generated_on:"2026-08-01",subtotal:"1000",gst_amount:"180",total_amount:"1180",amount_paid:"200",balance_amount:"980",items:[{id:1,item_name:"Chocolate cake",description:"Birthday message",quantity:1,rate:"1000",gst_percentage:"18",amount:"1180"}],payments:[],timeline:[]};
const renderDetails=()=>render(<MainContext.Provider value={{ShowNotification:notify}}><InvoiceDetails/></MainContext.Provider>);

beforeEach(()=>{mockNavigate.mockReset();notify.mockReset();Api.get.mockReset();Api.post.mockReset();});

test("keeps the existing Invoice endpoint and presents the settlement queue",async()=>{
 Api.get.mockResolvedValue({data:[invoice]});render(<InvoiceList/>);
 expect(await screen.findByText("I-15")).toBeInTheDocument();
 expect(Api.get).toHaveBeenCalledWith("crm/invoices/");
 expect(screen.getByText(/Balance/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Open workspace"}));
 expect(mockNavigate).toHaveBeenCalledWith("/crm/invoices/15");
});

test("preserves balance collection through the existing multipart endpoint",async()=>{
 Api.get.mockResolvedValue({data:invoice});Api.post.mockResolvedValue({data:{...invoice,balance_amount:"0",amount_paid:"1180"}});renderDetails();
 expect(await screen.findByRole("heading",{name:"I-15"})).toBeInTheDocument();
 fireEvent.click(screen.getAllByRole("button",{name:"Collect Balance"})[0]);
 fireEvent.click(screen.getByRole("button",{name:"Record payment"}));
 await waitFor(()=>expect(Api.post).toHaveBeenCalledWith("crm/invoices/15/record-payment/",expect.any(FormData)));
 await waitFor(()=>expect(notify).toHaveBeenCalledWith("success","Balance payment recorded"));
});

test("preserves the explicit Payment Completed transition",async()=>{
 Api.get.mockResolvedValue({data:{...invoice,balance_amount:"0",amount_paid:"1180"}});Api.post.mockResolvedValue({data:{...invoice,status:"Paid",balance_amount:"0",amount_paid:"1180"}});renderDetails();
 fireEvent.click((await screen.findAllByRole("button",{name:"Payment Completed"}))[0]);
 await waitFor(()=>expect(Api.post).toHaveBeenCalledWith("crm/invoices/15/payment-completed/"));
 await waitFor(()=>expect(notify).toHaveBeenCalledWith("success","Payment completed"));
});

test("preserves paid Invoice handoff and redirects to Delivery",async()=>{
 Api.get.mockResolvedValue({data:{...invoice,status:"Paid",balance_amount:"0",amount_paid:"1180"}});Api.post.mockResolvedValue({data:{message:"Moved to Delivery",data:{id:21}}});renderDetails();
 fireEvent.click((await screen.findAllByRole("button",{name:"Move to Delivery"}))[0]);
 await waitFor(()=>expect(Api.post).toHaveBeenCalledWith("crm/invoices/15/move-to-delivery/"));
 await waitFor(()=>expect(mockNavigate).toHaveBeenCalledWith("/crm/delivery/21"));
});

test("does not offer a financial transition after the invoice has moved forward",async()=>{
 Api.get.mockResolvedValue({data:{...invoice,status:"Closed",balance_amount:"0",amount_paid:"1180"}});renderDetails();
 expect(await screen.findByRole("heading",{name:"I-15"})).toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"Payment Completed"})).not.toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"Move to Delivery"})).not.toBeInTheDocument();
 expect(screen.getByText("Financial settlement is complete and responsibility has moved to Delivery.")).toBeInTheDocument();
});
