import React from "react";
import {fireEvent,render,screen} from "@testing-library/react";
import ReportsAnalytics from "./ReportsAnalytics";
import {Api} from "../../../Api/Api";

const mockNavigate=jest.fn();
jest.mock("react-router-dom",()=>({...jest.requireActual("react-router-dom"),useNavigate:()=>mockNavigate}));
jest.mock("../../../Api/Api",()=>({Api:{get:jest.fn()}}));
jest.mock("xlsx",()=>({utils:{book_new:jest.fn(),json_to_sheet:jest.fn(),book_append_sheet:jest.fn()},writeFile:jest.fn()}));
jest.mock("jspdf",()=>({jsPDF:jest.fn(()=>({setFontSize:jest.fn(),text:jest.fn(),save:jest.fn()}))}));

const snapshot={overview:{leads:{Open:2,Won:1},quotations:{Draft:1},orders:{Ready:1},invoices:{Paid:1},deliveries:{Completed:1}},totals:{leads:3,quotations:1,orders:1,invoices:1,deliveries:1,new_customers:1},revenue:{collected:500,outstanding:100,advance_collected:200,balance_collected:300,average_order:600,trend:[{day:"2026-08-01",value:500}]},funnel:[{key:"leads",label:"Leads",value:3,conversion:100,drop_off:0},{key:"quotations",label:"Quotations",value:1,conversion:33.3,drop_off:2}],customers:[{phone:"9000000001",customer_name:"Meera",total_orders:2,total_spend:1200,last_order:"2026-08-01"}],products:[{item_name:"Chocolate Cake",flavour:"Chocolate",weight:1,orders:2,quantity:2,revenue:1200}],occasions:[],lead_sources:[],delivery_methods:[],timeline:[]};

beforeEach(()=>{mockNavigate.mockReset();Api.get.mockResolvedValue({data:snapshot});});

test("renders read-only executive analytics and drills into CRM modules",async()=>{
 render(<ReportsAnalytics/>);
 expect(await screen.findByText("Reports & Analytics")).toBeInTheDocument();
 expect((await screen.findAllByText("₹500.00")).length).toBeGreaterThan(0);
 fireEvent.click(screen.getByRole("button",{name:/Total leads/}));
 expect(mockNavigate).toHaveBeenCalledWith("/crm/leads");
 expect(Api.get).toHaveBeenCalledWith("reports/crm-analytics",expect.objectContaining({params:expect.any(Object)}));
});

test("switches to customer analysis without changing operational data",async()=>{
 render(<ReportsAnalytics/>);
 await screen.findByText("Conversion funnel");
 fireEvent.click(screen.getByRole("button",{name:"Customers"}));
 expect(await screen.findByText("Meera")).toBeInTheDocument();
 expect(await screen.findByRole("table",{name:"Customer analytics"})).toBeInTheDocument();
});
