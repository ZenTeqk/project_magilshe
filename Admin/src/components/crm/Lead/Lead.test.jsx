import React from "react";
import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import Lead from "./Lead";
import {Api} from "../../../Api/Api";
import MainContext from "../../../context/MainContext";

const mockNavigate=jest.fn(),notify=jest.fn();
jest.mock("react-router-dom",()=>({...jest.requireActual("react-router-dom"),useNavigate:()=>mockNavigate}));
jest.mock("../../../Api/Api",()=>({Api:{get:jest.fn(),post:jest.fn(),patch:jest.fn(),delete:jest.fn()}}));
const row={id:4,lead_no:"L-4",customer_name:"Meera",phone:"9000000000",occasion:"Birthday",cake_type:"Custom Cake",event_date:"2026-08-10",quantity:1,status:"Open",assigned_to_name:"Staff",created_on:"2026-08-01"};
const renderPage=(entry="/crm/leads")=>render(<MemoryRouter initialEntries={[entry]} future={{v7_startTransition:true,v7_relativeSplatPath:true}}><MainContext.Provider value={{ShowNotification:notify}}><Lead/></MainContext.Provider></MemoryRouter>);

beforeEach(()=>{mockNavigate.mockReset();notify.mockReset();Api.get.mockReset();Api.get.mockResolvedValue({data:[row]});});
test("uses a URL status filter while preserving the existing Leads endpoint",async()=>{renderPage("/crm/leads?status=Won");expect(await screen.findByText("Meera")).toBeInTheDocument();await waitFor(()=>expect(Api.get).toHaveBeenCalledWith("crm/leads/",{params:{status:"Won"}}));expect(screen.getByRole("button",{name:/Won/})).toHaveAttribute("aria-pressed","true");fireEvent.click(screen.getByRole("button",{name:"Open lead"}));expect(mockNavigate).toHaveBeenCalledWith("/crm/leads/4/edit");});
test("keeps the approved status transition entry point",async()=>{renderPage();expect(await screen.findByText("Meera")).toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Lead status Open, change status"}));fireEvent.click(await screen.findByText("Schedule follow-up"));expect(await screen.findByRole("heading",{name:"Schedule follow-up"})).toBeInTheDocument();expect(screen.getByText("Next follow-up date")).toBeInTheDocument();expect(screen.getByText("Follow-up notes")).toBeInTheDocument();expect(screen.getByRole("button",{name:"Save status"})).toBeInTheDocument();});
