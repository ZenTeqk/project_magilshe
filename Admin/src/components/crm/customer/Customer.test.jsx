import React from "react";
import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {Api} from "../../../Api/Api";
import CustomerList from "./CustomerList";
import CustomerDetails from "./CustomerDetails";

const mockNavigate=jest.fn();
jest.mock("react-router-dom",()=>({...jest.requireActual("react-router-dom"),useNavigate:()=>mockNavigate,useParams:()=>({id:"7"})}));
jest.mock("../../../Api/Api",()=>({Api:{get:jest.fn()}}));

const summary={id:7,username:"meera",name:"Meera Das",phone:"9000000000",email:"meera@example.com",is_active:true,date_joined:"2026-01-02",addresses:[{id:1,title:"Home",address:"12 Lake Road",city:"Chennai",pincode:"600001",is_primary:true,updated_on:"2026-07-31"}],counts:{leads:2,quotations:1,orders:1,invoices:1,deliveries:1}};
const detail={...summary,last_login:"2026-07-30",phone_verified_at:"2026-01-02",email_verified_at:null,history:{leads:[{id:2,lead_no:"L-2",status:"Won",occasion:"Birthday",created_on:"2026-07-01"}],quotations:[{id:3,quotation_no:"Q-3",status:"Accepted",total_amount:"1500",created_on:"2026-07-02"}],orders:[{id:4,order_no:"O-4",status:"Confirmed",total_amount:"1500",confirmed_on:"2026-07-03"}],invoices:[{id:5,invoice_no:"I-5",status:"Paid",total_amount:"1500",generated_on:"2026-07-04"}],deliveries:[{id:6,delivery_no:"D-6",status:"Delivered",method:"Delivery",created_on:"2026-07-05"}],payments:[{id:8,quotation_id:3,amount:"500",payment_method:"UPI",payment_date:"2026-07-03",created_on:"2026-07-03"}]}};

beforeEach(()=>{mockNavigate.mockReset();Api.get.mockReset();});

test("keeps the existing customer list API and opens the 360 profile",async()=>{
 Api.get.mockResolvedValue({data:[summary]});render(<CustomerList/>);
 expect(await screen.findByText("Meera Das")).toBeInTheDocument();
 expect(Api.get).toHaveBeenCalledWith("crm/customers/");
 expect(screen.getByText(/2 Leads/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"View profile"}));
 expect(mockNavigate).toHaveBeenCalledWith("/crm/customers/7");
});

test("groups existing customer histories, addresses, payments, notes and activity",async()=>{
 Api.get.mockResolvedValue({data:detail});render(<CustomerDetails/>);
 expect(await screen.findByRole("heading",{name:"Meera Das"})).toBeInTheDocument();
 expect(Api.get).toHaveBeenCalledWith("crm/customers/7/");
 expect(screen.getAllByText("12 Lake Road, Chennai, 600001")).toHaveLength(2);
 expect(screen.getByRole("button",{name:/Quotation Generated.*Q-3/})).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:/Payments/}));
 expect(screen.getByText("UPI")).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:/Quotations/}));
 fireEvent.click(screen.getByRole("button",{name:"Open"}));
 await waitFor(()=>expect(mockNavigate).toHaveBeenCalledWith("/crm/quotations/3"));
 fireEvent.click(screen.getByRole("button",{name:/Notes/}));
 expect(screen.getByText("No customer notes available")).toBeInTheDocument();
});
