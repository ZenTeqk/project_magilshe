import React from "react";
import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {Api} from "../../../Api/Api";
import MainContext from "../../../context/MainContext";
import QuotationList from "./QuotationList";
import QuotationDetails from "./QuotationDetails";

const mockNavigate=jest.fn(),notify=jest.fn();
jest.mock("react-router-dom",()=>({...jest.requireActual("react-router-dom"),useNavigate:()=>mockNavigate,useParams:()=>({id:"9"})}));
jest.mock("../../../Api/Api",()=>({Api:{get:jest.fn(),post:jest.fn()}}));
jest.mock("./quotationPdf",()=>({buildQuotationPdf:jest.fn()}));
jest.mock("jspdf",()=>({jsPDF:jest.fn()}));

const quotation={id:9,quotation_no:"Q-9",customer_name:"Meera",phone:"9000000000",email:"meera@example.com",billing_address:"Home, Chennai",address:"Venue, Chennai",status:"Draft",event_date:"2026-08-10",delivery_date:"2026-08-10",delivery_time:"18:30",delivery_type:"Delivery",occasion:"Birthday",subtotal:"1000",gst_amount:"180",total_amount:"1180",advance_amount:"0",balance_amount:"1180",advance_received:false,created_on:"2026-08-01",items:[{id:1,item_name:"Chocolate cake",flavour:"Chocolate",weight:"1",quantity:1,rate:"1000",gst_percentage:"18",amount:"1180"}],payments:[],quotation_activities:[]};
const renderDetails=()=>render(<MainContext.Provider value={{ShowNotification:notify}}><QuotationDetails/></MainContext.Provider>);

beforeEach(()=>{mockNavigate.mockReset();notify.mockReset();Api.get.mockReset();Api.post.mockReset();});

test("keeps existing quotation and pending-lead endpoints in the commercial directory",async()=>{
 Api.get.mockImplementation(url=>Promise.resolve({data:url==="crm/quotations/"?[quotation]:[{id:4,lead_no:"L-4",customer_name:"Anu",event_date:"2026-08-12",estimated_amount:"900"}]}));
 render(<QuotationList/>);
 expect(await screen.findByText("Q-9")).toBeInTheDocument();
 expect(screen.getByText("L-4")).toBeInTheDocument();
 expect(Api.get).toHaveBeenCalledWith("crm/quotations/");
 expect(Api.get).toHaveBeenCalledWith("crm/quotations/pending/");
 fireEvent.click(screen.getByRole("button",{name:"Open workspace"}));
 expect(mockNavigate).toHaveBeenCalledWith("/crm/quotations/9/edit");
});

test("preserves the approved send transition from the quotation workspace",async()=>{
 Api.get.mockImplementation(url=>Promise.resolve({data:url==="configuration/get/"?{data:{name:"Magilshe"}}:quotation}));
 Api.post.mockResolvedValue({data:{...quotation,status:"Sent"}});
 renderDetails();
 expect(await screen.findByRole("heading",{name:"Q-9"})).toBeInTheDocument();
 expect(screen.getByText("Chocolate cake")).toBeInTheDocument();
 fireEvent.click(screen.getAllByRole("button",{name:"Send / Mark Shared"})[0]);
 await waitFor(()=>expect(Api.post).toHaveBeenCalledWith("crm/quotations/9/workflow-action/",{action:"send"}));
 await waitFor(()=>expect(notify).toHaveBeenCalledWith("success","Quotation workflow updated"));
});

test("keeps confirm order transactional endpoint and redirects into Orders",async()=>{
 const ready={...quotation,status:"Advance Received",advance_received:true,advance_amount:"200",balance_amount:"980"};
 Api.get.mockImplementation(url=>Promise.resolve({data:url==="configuration/get/"?{data:{name:"Magilshe"}}:ready}));
 Api.post.mockResolvedValue({data:{message:"Order created",data:{id:12}}});
 renderDetails();
 fireEvent.click((await screen.findAllByRole("button",{name:"Confirm Order"}))[0]);
 await waitFor(()=>expect(Api.post).toHaveBeenCalledWith("crm/quotations/9/confirm-order/"));
 await waitFor(()=>expect(mockNavigate).toHaveBeenCalledWith("/crm/orders/12"));
});
