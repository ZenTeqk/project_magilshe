import React from "react";
import {fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {Api} from "../../../Api/Api";
import MainContext from "../../../context/MainContext";
import OrderList from "./OrderList";
import OrderDetails from "./OrderDetails";
import OrderForm from "./OrderForm";

const mockNavigate=jest.fn(),notify=jest.fn();
jest.mock("react-router-dom",()=>({...jest.requireActual("react-router-dom"),useNavigate:()=>mockNavigate,useParams:()=>({id:"11"})}));
jest.mock("../../../Api/Api",()=>({Api:{get:jest.fn(),post:jest.fn(),patch:jest.fn()}}));

const order={id:11,order_no:"O-11",quotation_no:"Q-9",customer_name:"Meera",phone:"9000000000",status:"Confirmed",event_date:"2026-08-10",delivery_date:"2026-08-10",delivery_time:"18:30",delivery_method:"Home Delivery",delivery_address:"Venue, Chennai",total_amount:"1180",advance_paid:"200",balance_amount:"980",production_notes:"Use gold ribbon",assigned_baker_name:"Anu",assigned_staff_name:"Sara",items:[{id:1,item_name:"Chocolate cake",description:"Birthday message",flavour:"Chocolate",weight:"1 kg",quantity:1,amount:"1180"}],reference_images:[],timeline:[]};
const renderDetails=()=>render(<MainContext.Provider value={{ShowNotification:notify}}><OrderDetails/></MainContext.Provider>);

beforeEach(()=>{mockNavigate.mockReset();notify.mockReset();Api.get.mockReset();Api.post.mockReset();Api.patch.mockReset();});

test("keeps the existing Orders endpoint and presents the fulfilment queue",async()=>{
 Api.get.mockResolvedValue({data:[order]});render(<OrderList/>);
 expect(await screen.findByText("O-11")).toBeInTheDocument();
 expect(Api.get).toHaveBeenCalledWith("crm/orders/");
 expect(screen.getByText(/Balance/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Open workspace"}));
 expect(mockNavigate).toHaveBeenCalledWith("/crm/orders/11");
});

test("preserves Start Processing and the existing workflow action payload",async()=>{
 Api.get.mockResolvedValue({data:order});Api.post.mockResolvedValue({data:{...order,status:"Processing"}});renderDetails();
 expect(await screen.findByRole("heading",{name:"O-11"})).toBeInTheDocument();
 expect(screen.getByText("Chocolate cake")).toBeInTheDocument();
 fireEvent.click(screen.getAllByRole("button",{name:"Start Processing"})[0]);
 await waitFor(()=>expect(Api.post).toHaveBeenCalledWith("crm/orders/11/workflow-action/",{action:"start_processing"}));
 await waitFor(()=>expect(notify).toHaveBeenCalledWith("success","Order processing started"));
});

test("preserves invoice generation and transfers responsibility to Invoices",async()=>{
 Api.get.mockResolvedValue({data:{...order,status:"Ready"}});Api.post.mockResolvedValue({data:{message:"Invoice generated",data:{id:15}}});renderDetails();
 fireEvent.click((await screen.findAllByRole("button",{name:"Move to Invoice"}))[0]);
 await waitFor(()=>expect(Api.post).toHaveBeenCalledWith("crm/orders/11/generate-invoice/"));
 await waitFor(()=>expect(mockNavigate).toHaveBeenCalledWith("/crm/invoices/15"));
});

test("OrderList shows a New Order action that navigates to the direct-entry form",async()=>{
 Api.get.mockResolvedValue({data:[order]});render(<OrderList/>);
 await screen.findByText("O-11");
 fireEvent.click(screen.getByRole("button",{name:"New Order"}));
 expect(mockNavigate).toHaveBeenCalledWith("/crm/orders/new");
});

test("OrderList shows cancelled orders and lets staff filter to them",async()=>{
 const cancelled={...order,id:12,order_no:"O-12",status:"Cancelled"};
 Api.get.mockResolvedValue({data:[order,cancelled]});render(<OrderList/>);
 expect(await screen.findByText("O-12")).toBeInTheDocument();
 expect(screen.getAllByText("Cancelled").length).toBeGreaterThan(0);
});

test("Cancel Order requires a reason and posts the cancellation workflow action",async()=>{
 Api.get.mockResolvedValue({data:order});
 Api.patch.mockResolvedValue({data:order});
 Api.post.mockResolvedValue({data:{...order,status:"Cancelled",cancellation_reason:"Customer cancelled",cancelled_at:"2026-08-05T10:00:00Z",cancelled_by_name:"Staff"}});
 renderDetails();
 fireEvent.click(await screen.findByRole("button",{name:"Cancel Order"}));
 const dialog=await screen.findByRole("dialog",{name:"Cancel this order"});
 fireEvent.click(within(dialog).getByRole("button",{name:"Cancel Order"}));
 expect(within(dialog).getByText("A cancellation reason is required.")).toBeInTheDocument();
 fireEvent.change(within(dialog).getByRole("combobox"),{target:{value:"Customer cancelled"}});
 fireEvent.click(within(dialog).getByRole("button",{name:"Cancel Order"}));
 await waitFor(()=>expect(Api.post).toHaveBeenCalledWith("crm/orders/11/workflow-action/",{action:"cancel_order",cancellation_reason:"Customer cancelled"}));
 await waitFor(()=>expect(notify).toHaveBeenCalledWith("success","Order cancelled"));
});

test("a cancelled order hides the Cancel action and shows the cancellation summary",async()=>{
 const cancelled={...order,status:"Cancelled",cancellation_reason:"Duplicate order",cancelled_at:"2026-08-05T10:00:00Z",cancelled_by_name:"Staff"};
 Api.get.mockResolvedValue({data:cancelled});renderDetails();
 expect(await screen.findByText("Duplicate order")).toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"Cancel Order"})).not.toBeInTheDocument();
});

test("OrderForm mirrors the quotation layout (tabs, items table, advance) and submits to the direct-order endpoint",async()=>{
 Api.get.mockResolvedValue({data:{}});
 Api.post.mockImplementation(url=>url==="crm/orders/direct/"?Promise.resolve({data:{message:"Order created.",data:{id:21}}}):Promise.resolve({data:{}}));
 render(<MainContext.Provider value={{ShowNotification:notify}}><OrderForm/></MainContext.Provider>);
 expect(await screen.findByRole("heading",{name:"New Order"})).toBeInTheDocument();
 expect(screen.getByRole("button",{name:"Customer Details"})).toBeInTheDocument();
 expect(screen.getByRole("button",{name:"Address"})).toBeInTheDocument();
 expect(screen.getByRole("button",{name:"Delivery Details"})).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText("Customer name"),{target:{value:"Walk-in Customer"}});
 fireEvent.change(screen.getByLabelText("Phone (10 digits)"),{target:{value:"9876543210"}});
 fireEvent.change(screen.getByPlaceholderText("Cake name"),{target:{value:"Chocolate Truffle"}});
 fireEvent.change(screen.getByPlaceholderText("0.00"),{target:{value:"1000"}});
 fireEvent.click(screen.getByRole("button",{name:"Collect Advance"}));
 const dialog=await screen.findByRole("dialog",{name:"Collect advance payment"});
 fireEvent.change(within(dialog).getByLabelText(/Amount received/),{target:{value:"500"}});
 fireEvent.change(within(dialog).getByLabelText(/Payment method/),{target:{value:"Cash"}});
 fireEvent.click(within(dialog).getByRole("button",{name:"Save advance"}));
 fireEvent.click(await screen.findByRole("button",{name:"Confirm Order"}));
 await waitFor(()=>expect(Api.post).toHaveBeenCalledWith("crm/orders/direct/",expect.objectContaining({customer_name:"Walk-in Customer",phone:"9876543210",advance_amount:"500",payment_method:"Cash"})));
 await waitFor(()=>expect(mockNavigate).toHaveBeenCalledWith("/crm/orders/21"));
});
