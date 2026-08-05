const toneMap={draft:"neutral",new:"info",sent:"info",accepted:"success",confirmed:"success",completed:"success",ready:"success",overdue:"danger",lost:"danger",cancelled:"danger",pending:"warning",due:"warning"};
export const statusTone=status=>toneMap[String(status||"").trim().toLowerCase()]||"neutral";
