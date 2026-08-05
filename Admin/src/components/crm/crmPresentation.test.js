import {crmStatusTone} from "./crmPresentation";

describe("CRM status presentation",()=>{
 it.each([
  ["Open","info"],["Follow-up","warning"],["Won","success"],["Lost","danger"],
  ["Draft","neutral"],["Accepted","success"],["Confirmed","info"],["Processing","warning"],
  ["Ready","success"],["Paid","success"],["Overdue","danger"],["Completed","success"],
 ])("uses one tone for %s everywhere",(status,tone)=>expect(crmStatusTone(status)).toBe(tone));

 it("uses a safe information tone for an unknown backend status",()=>{
  expect(crmStatusTone("Future Stage")).toBe("info");
 });
});
