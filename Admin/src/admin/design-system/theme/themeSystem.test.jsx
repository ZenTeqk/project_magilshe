import React from "react";
import {fireEvent,render,screen} from "@testing-library/react";
import {AdminThemeController,AdminThemeProvider,ADMIN_THEME_STORAGE_KEY,useAdminTheme} from "./AdminThemeProvider";
import {darkColors,lightColors} from "./colors";
import {DataTable,Field,Modal,PrimaryButton,SectionCard,StatusBadge,TextInput,WorkflowStepper} from "../components";

const ThemeHarness=()=>{const {resolvedTheme,toggleTheme}=useAdminTheme();return <><button onClick={toggleTheme}>Toggle theme</button><AdminThemeProvider><div data-testid="theme-boundary">{resolvedTheme}</div></AdminThemeProvider></>};
const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(value=>{const channel=parseInt(value,16)/255;return channel<=.03928?channel/12.92:((channel+.055)/1.055)**2.4;});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);};

beforeEach(()=>localStorage.removeItem(ADMIN_THEME_STORAGE_KEY));
test("switches and persists theme without remounting the page",()=>{render(<AdminThemeController><ThemeHarness/></AdminThemeController>);const boundary=screen.getByTestId("theme-boundary");expect(boundary.closest(".magilshe-admin-ds")).toHaveAttribute("data-theme","light");fireEvent.click(screen.getByText("Toggle theme"));expect(boundary.closest(".magilshe-admin-ds")).toHaveAttribute("data-theme","dark");expect(localStorage.getItem(ADMIN_THEME_STORAGE_KEY)).toBe("dark");});
test("representative reusable components render inside dark theme",()=>{render(<AdminThemeController defaultPreference="dark"><AdminThemeProvider><SectionCard title="Order"><StatusBadge tone="success">Ready</StatusBadge><Field label="Customer"><TextInput/></Field><DataTable ariaLabel="Items" columns={[{key:"name",header:"Item"}]} rows={[{id:1,name:"Cake"}]}/><WorkflowStepper steps={[{key:"a",label:"Confirmed"},{key:"b",label:"Ready"}]} currentIndex={1}/><PrimaryButton>Continue</PrimaryButton><Modal open title="Details" onClose={()=>{}}>Modal content</Modal></SectionCard></AdminThemeProvider></AdminThemeController>);expect(screen.getByText("Cake")).toBeInTheDocument();expect(screen.getByRole("dialog").closest(".magilshe-admin-ds")).toHaveAttribute("data-theme","dark");});
test("primary text contrast meets WCAG AA in both palettes",()=>{expect(contrast(lightColors.textPrimary,lightColors.background)).toBeGreaterThanOrEqual(4.5);expect(contrast(darkColors.textPrimary,darkColors.background)).toBeGreaterThanOrEqual(4.5);});
