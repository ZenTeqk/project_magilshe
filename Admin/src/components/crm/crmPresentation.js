const toneByStatus={
 "open":"info","follow-up":"warning","won":"success","lost":"danger",
 "draft":"neutral","sent":"info","accepted":"success","advance received":"success","order confirmed":"success",
 "confirmed":"info","processing":"warning","production":"warning","ready":"success","invoice pending":"warning","invoice generated":"info",
 "generated":"info","issued":"info","paid":"success","pending":"warning","in progress":"warning",
 "delivery":"info","out for delivery":"warning","delivered":"success","delivered successfully":"success","completed":"success","closed":"neutral","active":"success","inactive":"neutral",
 "cancelled":"danger","canceled":"danger","rejected":"danger","expired":"danger","overdue":"danger",
 "damaged during delivery":"danger","delivery failed":"danger",
};

export const crmStatusTone=status=>toneByStatus[String(status||"").trim().toLowerCase()]||"info";
