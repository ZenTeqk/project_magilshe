import React from "react";
import {fireEvent,render,screen} from "@testing-library/react";
import CRMHome from "./CRMHome";
import {Api} from "../../Api/Api";
import {AdminThemeController,ToastProvider} from "../../admin/design-system";

const mockNavigate=jest.fn();
jest.mock("react-router-dom",()=>({...jest.requireActual("react-router-dom"),useNavigate:()=>mockNavigate}));
jest.mock("../../Api/Api",()=>({Api:{get:jest.fn()}}));
const renderPage=()=>render(<AdminThemeController><ToastProvider><CRMHome/></ToastProvider></AdminThemeController>);

beforeEach(()=>{mockNavigate.mockReset();Api.get.mockReset();});
const emptyLists=url=>url.includes("crm/orders/")||url.includes("crm/invoices/")||url.includes("crm/deliveries/")?Promise.resolve({data:[]}):null;
test("turns existing CRM snapshots into an operational CRM Home",async()=>{Api.get.mockImplementation(url=>emptyLists(url)||Promise.resolve({data:url.includes("follow-ups")?{summary:{today:2,overdue:1,completed_today:3},results:[{id:4,customer_name:"Meera",phone:"9000000000",occasion:"Birthday",follow_up_date:"2000-01-01",follow_up_time:"18:00",assigned_to_name:"Staff"}]}:{leads:{total:5,Open:2,"Follow-up":1,Won:2},documents:{quotations:3,orders:2,invoices:1,deliveries:1},funnel:{won_not_quoted:1,moved_to_quotation:3,moved_to_order:2,moved_to_invoice:1,moved_to_delivery:1},workflows:[{customer_name:"Anu",quotation_no:"Q-1",stage:"Invoice",status:"Pending",target_id:8,updated_on:"2026-08-01"}]}}));renderPage();expect(await screen.findByText("Meera")).toBeInTheDocument();expect(screen.getByRole("heading",{name:"CRM Home"})).toBeInTheDocument();expect(screen.getByText("Anu")).toBeInTheDocument();expect(Api.get).toHaveBeenCalledWith("crm/leads/crm-dashboard/");expect(Api.get).toHaveBeenCalledWith("crm/leads/follow-ups/");fireEvent.click(screen.getByRole("button",{name:"Continue"}));expect(mockNavigate).toHaveBeenCalledWith("/crm/invoices/8");});
test("keeps quick actions and available CRM information usable after a partial failure",async()=>{Api.get.mockImplementation(url=>emptyLists(url)||(url.includes("follow-ups")?Promise.reject(new Error("offline")):Promise.resolve({data:{leads:{Open:1},documents:{},funnel:{},workflows:[]}})));renderPage();expect(await screen.findByText(/Some CRM information is temporarily unavailable/)).toBeInTheDocument();expect(screen.getAllByRole("button",{name:"New lead"}).length).toBeGreaterThan(0);fireEvent.click(screen.getAllByRole("button",{name:"New lead"})[0]);expect(mockNavigate).toHaveBeenCalledWith("/crm/leads/new");expect(screen.getByText("No CRM workflow activity")).toBeInTheDocument();});
