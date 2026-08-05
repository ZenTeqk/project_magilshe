import React from "react";
import {fireEvent,render,screen} from "@testing-library/react";
import Home from "./Home";
import {Api} from "../../Api/Api";
import {AdminThemeController,ToastProvider} from "../../admin/design-system";

const mockNavigate=jest.fn();
jest.mock("react-router-dom",()=>({...jest.requireActual("react-router-dom"),useNavigate:()=>mockNavigate}));
jest.mock("../../Api/Api",()=>({Api:{get:jest.fn()}}));
const renderPage=()=>render(<AdminThemeController><ToastProvider><Home/></ToastProvider></AdminThemeController>);

beforeEach(()=>{mockNavigate.mockReset();Api.get.mockReset();});
test("loads existing dashboard and CRM snapshots into an operational home",async()=>{Api.get.mockImplementation(url=>Promise.resolve({data:url.includes("crm-dashboard")?{leads:{total:4,Open:1,"Follow-up":1,Won:2},documents:{orders:2,invoices:1},workflows:[{customer_name:"Anu",quotation_no:"Q-1",stage:"Order",status:"Confirmed",target_id:7,updated_on:"2026-08-01"}]}:{count:{today_order:3,total_pending:2,today_delivered:1},data:{recent_10_orders:[{id:9,customer_name:"Maya",delivery_status:1,order_time:"2026-08-01"}],upcoming_occasions:[]}}}));renderPage();expect(await screen.findByText("Customer workflow queue")).toBeInTheDocument();expect(screen.getByText("Anu")).toBeInTheDocument();expect(screen.getByText("Maya")).toBeInTheDocument();expect(screen.getByText("50%")).toBeInTheDocument();expect(Api.get).toHaveBeenCalledWith("dashboard/home/");expect(Api.get).toHaveBeenCalledWith("crm/leads/crm-dashboard/");fireEvent.click(screen.getByRole("button",{name:"Open"}));expect(mockNavigate).toHaveBeenCalledWith("/crm/orders/7");});
test("keeps available dashboard sections usable when one snapshot fails",async()=>{Api.get.mockImplementation(url=>url.includes("crm-dashboard")?Promise.reject(new Error("offline")):Promise.resolve({data:{count:{today_order:1},data:{recent_10_orders:[],upcoming_occasions:[]}}}));renderPage();expect(await screen.findByText(/Some information is temporarily unavailable/)).toBeInTheDocument();expect(screen.getByText("Recent online orders")).toBeInTheDocument();expect(screen.getByRole("button",{name:"Try again"})).toBeInTheDocument();expect(await screen.findByText("No active customer workflows")).toBeInTheDocument();});
