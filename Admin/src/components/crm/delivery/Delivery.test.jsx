import React from "react";
import {fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {Api} from "../../../Api/Api";
import MainContext from "../../../context/MainContext";
import DeliveryList from "./DeliveryList";
import DeliveryDetails from "./DeliveryDetails";

const mockNavigate=jest.fn(),notify=jest.fn();
jest.mock("react-router-dom",()=>({...jest.requireActual("react-router-dom"),useNavigate:()=>mockNavigate,useParams:()=>({id:"21"})}));
jest.mock("../../../Api/Api",()=>({Api:{get:jest.fn(),post:jest.fn(),patch:jest.fn()}}));

const baseDelivery={
 id:21,delivery_no:"D-21",order_no:"O-11",invoice_no:"I-15",customer_name:"Meera",phone:"9000000000",
 delivery_type:"Magilshe Delivery",delivery_status:"Pending",recipient_name:"Meera",recipient_phone:"9000000000",
 delivery_location:"12 Lake Road, Chennai",delivery_time:"2026-08-10T18:30:00+05:30",delivery_notes:"Call on arrival",
 delivery_person:1,delivery_person_name:"Ravi",scheduled_at:"2026-08-10T18:30:00+05:30",completed_at:null,
 pickup_time:null,porter_time:null,damage_images:[],
 total_amount:"1180",advance_paid:"1180",balance_amount:"0",
 items:[{id:1,item_name:"Chocolate cake",description:"Birthday message",flavour:"Chocolate",weight:"1 kg",quantity:1,amount:"1180"}],
 timeline:[{id:1,action:"Moved to Delivery",description:"D-21",staff_name:"Sara",created_on:"2026-08-01T10:00:00Z"}],
};
const renderDetails=()=>render(<MainContext.Provider value={{ShowNotification:notify}}><DeliveryDetails/></MainContext.Provider>);
const mockApiFor=delivery=>{
 Api.get.mockImplementation(url=>{
  if(url.startsWith("crm/deliveries/"))return Promise.resolve({data:delivery});
  if(url==="delivery-person/get/")return Promise.resolve({data:{data:[{id:1,name:"Ravi",phone:"9000011111",status:true}]}});
  if(url==="crm/options/")return Promise.resolve({data:[]});
  return Promise.resolve({data:[]});
 });
};

beforeEach(()=>{mockNavigate.mockReset();notify.mockReset();Api.get.mockReset();Api.post.mockReset();Api.patch.mockReset();});

test("keeps the existing Delivery endpoint and presents the fulfilment queue",async()=>{
 Api.get.mockResolvedValue({data:[baseDelivery]});render(<DeliveryList/>);
 expect(await screen.findByText("D-21")).toBeInTheDocument();
 expect(Api.get).toHaveBeenCalledWith("crm/deliveries/");
 expect(screen.getByText("Paid")).toBeInTheDocument();
 fireEvent.click(screen.getByRole("button",{name:"Open workspace"}));
 expect(mockNavigate).toHaveBeenCalledWith("/crm/delivery/21");
});

test("Magilshe Delivery: saves details then starts delivery",async()=>{
 mockApiFor(baseDelivery);
 Api.patch.mockResolvedValue({data:baseDelivery});
 Api.post.mockResolvedValue({data:{...baseDelivery,delivery_status:"Out for Delivery"}});
 renderDetails();
 expect(await screen.findByRole("heading",{name:"D-21"})).toBeInTheDocument();
 expect(screen.getAllByText("Magilshe Delivery").length).toBeGreaterThan(0);
 fireEvent.click(screen.getAllByRole("button",{name:"Start Delivery"})[0]);
 await waitFor(()=>expect(Api.patch).toHaveBeenCalledWith("crm/deliveries/21/",expect.objectContaining({delivery_type:"Magilshe Delivery",delivery_location:"12 Lake Road, Chennai"})));
 await waitFor(()=>expect(Api.post).toHaveBeenCalledWith("crm/deliveries/21/workflow-action/",{action:"start"}));
});

test("Customer Pickup shows a pickup-specific workflow and action label",async()=>{
 const pickup={...baseDelivery,delivery_type:"Customer Pickup",pickup_person_type:"Customer",pickup_person_name:"Meera",pickup_contact:"9000000000",pickup_time:"2026-08-10T18:30:00+05:30",pickup_location:"Bakery"};
 mockApiFor(pickup);
 Api.patch.mockResolvedValue({data:pickup});
 Api.post.mockResolvedValue({data:{...pickup,delivery_status:"Out for Delivery"}});
 renderDetails();
 expect(await screen.findByText("Ready for Pickup")).toBeInTheDocument();
 fireEvent.click(screen.getAllByRole("button",{name:"Mark Picked Up"})[0]);
 await waitFor(()=>expect(Api.post).toHaveBeenCalledWith("crm/deliveries/21/workflow-action/",{action:"start"}));
});

test("marks a delivery as delivered and closes the linked workflow",async()=>{
 const active={...baseDelivery,delivery_status:"Out for Delivery"};
 mockApiFor(active);
 Api.patch.mockResolvedValue({data:active});
 Api.post.mockResolvedValue({data:{...active,delivery_status:"Delivered Successfully",completed_at:"2026-08-10T19:00:00+05:30"}});
 renderDetails();
 fireEvent.click((await screen.findAllByRole("button",{name:"Mark Delivered"}))[0]);
 await waitFor(()=>expect(Api.post).toHaveBeenCalledWith("crm/deliveries/21/workflow-action/",{action:"deliver"}));
 await waitFor(()=>expect(notify).toHaveBeenCalledWith("success",expect.stringContaining("Delivery completed")));
});

test("marking a delivery as failed requires a reason before submitting",async()=>{
 const active={...baseDelivery,delivery_status:"Out for Delivery"};
 mockApiFor(active);
 Api.patch.mockResolvedValue({data:active});
 Api.post.mockResolvedValue({data:{...active,delivery_status:"Delivery Failed",failure_reason:"Customer unavailable"}});
 renderDetails();
 fireEvent.click((await screen.findAllByRole("button",{name:"Mark Failed"}))[0]);
 const dialog=await screen.findByRole("dialog",{name:"Mark delivery as failed"});
 fireEvent.click(within(dialog).getByRole("button",{name:"Mark Failed"}));
 expect(within(dialog).getByText("Failure reason is required.")).toBeInTheDocument();
 fireEvent.change(within(dialog).getByRole("combobox"),{target:{value:"Customer unavailable"}});
 fireEvent.click(within(dialog).getByRole("button",{name:"Mark Failed"}));
 await waitFor(()=>expect(Api.post).toHaveBeenCalledWith("crm/deliveries/21/workflow-action/",{action:"mark_failed",failure_reason:"Customer unavailable"}));
});
