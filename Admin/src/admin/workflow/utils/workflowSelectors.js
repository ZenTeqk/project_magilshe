import { crmWorkflowV1,metaForStatus } from "../config/v1";

export const getWorkflowDefinition=entity=>crmWorkflowV1.entities[entity]||null;
export const getStatusMetadata=status=>metaForStatus(status);

export const evaluateCondition=(condition,values={})=>{
  if(!condition)return true;
  if(condition.all)return condition.all.every(item=>evaluateCondition(item,values));
  if(condition.any)return condition.any.some(item=>evaluateCondition(item,values));
  if(condition.action)return values.action===condition.action;
  const value=values[condition.field];
  if(condition.empty)return value===null||value===undefined||value==="";
  if(Object.prototype.hasOwnProperty.call(condition,"equals"))return value===condition.equals;
  if(Object.prototype.hasOwnProperty.call(condition,"equalsNumber"))return Number(value)===condition.equalsNumber;
  if(Object.prototype.hasOwnProperty.call(condition,"greaterThan"))return Number(value)>condition.greaterThan;
  if(condition.in)return condition.in.includes(value);
  return true;
};

export const getAvailableActions=(definition,record={},options={})=>definition?.transitions?.filter(item=>(options.includeHidden||item.exposed!==false)&&item.from.includes(record[definition.statusField])&&(!item.exposedFrom||item.exposedFrom.includes(record[definition.statusField]))&&evaluateCondition(item.guard,record))||[];
export const getPrimaryAction=(definition,record={})=>getAvailableActions(definition,record).find(item=>item.primary)||null;

export const resolveStageIndex=(definition,record={})=>{
  if(!definition?.stages?.length)return 0;
  const status=record[definition.statusField];let resolved=-1;
  definition.stages.forEach((stage,index)=>{if(stage.statuses?.includes(status)||stage.derivedFrom&&Boolean(record[stage.derivedFrom])||stage.derivedWhen&&evaluateCondition(stage.derivedWhen,record))resolved=Math.max(resolved,index);});
  return Math.max(0,resolved);
};

export const validateRules=(rules=[],values={},context={})=>{
  const errors={};
  rules.forEach(rule=>{
    if(rule.when&&!evaluateCondition(rule.when,{...values,...context}))return;
    if(rule.type==="required")rule.fields.forEach(field=>{if(values[field]===null||values[field]===undefined||String(values[field]).trim()==="")errors[field]="This field is required.";});
    if(rule.type==="positive"&&!(Number(values[rule.field])>0))errors[rule.field]="Enter an amount greater than zero.";
    if(rule.type==="positiveBalanceAmount"){const amount=Number(values[rule.field]),balance=Number(context[rule.balanceField]??values[rule.balanceField]);if(!(amount>0&&amount<=balance))errors[rule.field]="Enter an amount greater than zero and no more than the balance due.";}
    if(rule.type==="maxRemaining"){const amount=Number(values[rule.field]),remaining=Number(context[rule.totalField]??values[rule.totalField])-Number((context[rule.paidField]??values[rule.paidField])||0);if(amount>remaining)errors[rule.field]="Payment cannot exceed the remaining balance.";}
  });
  return errors;
};

export const validateWorkflowAction=(action,record={},payload={})=>validateRules(action?.validation||[],payload,record);
