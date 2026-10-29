import { parseEther } from "ethers";
import type { GovernanceSnapshot } from "./governance";
import type { ProtocolRequest } from "./protocolTransactions";
import type { GovernanceMetrics } from "./governanceMetrics";
const date=(seconds:number)=>new Date(seconds*1000).toLocaleString();
export function governanceAvailability(request:ProtocolRequest,s:GovernanceSnapshot|null,metrics:GovernanceMetrics|null=null,now=Date.now()/1000):string{
  if(!s)return "Loading the current requirements…";
  if(now-s.blockTimestamp>120)return "Previously loaded values are shown. Review checks current eligibility again.";
  const {action,args,module}=request;
  try{
    if(module==="ordinary"){
      const row=s.history.find(p=>p.family===args.family&&p.key===args.family+"-"+args.id);
      if(action!=="create"&&!row)return "There are no open proposals to select in this category.";
      if(row&&!row.valid)return "This proposal is closed.";
      if(row&&["support","oppose"].includes(action)&&now>=row.votingDeadline)return "Credit voting has ended for this proposal.";
      if(row&&action==="execute"&&(now<=row.votingDeadline))return "Execution opens after "+date(row.votingDeadline)+".";
      if(row&&action==="execute"&&parseEther(row.support)<parseEther(row.opposition))return "Opposition exceeds support; this proposal cannot be executed.";
      if(row&&action==="veto"){
        const begins=row.votingDeadline-s.settings.delaySeconds;
        if(now<=begins)return "The initial voting window ends at "+date(begins)+".";
        if(parseEther(row.opposition)<=parseEther(row.support))return "Veto requires more opposition credit than support.";
      }
      if(["create","support","oppose"].includes(action)){
        const minimum=action==="create"?parseEther(s.settings.votingCost)*(args.family==="New pool"?500n:1n):1n;
        if(!args.credit)return action==="create"?`Minimum commitment: ${Number(s.settings.votingCost)*(args.family==="New pool"?500:1)} OINK credit.`:"Enter the voting credit you want to spend.";
        const amount=parseEther(args.credit);
        if(amount<minimum)return "The credit commitment is below the required minimum.";
        if(s.walletCredit!==null&&amount>parseEther(s.walletCredit))return "Insufficient voting credit. Deposit credit before reviewing this action.";
      }
    }
    if(module==="reward-maintenance"){
      if(!metrics)return "Loading Reward Boost status…";
      if(!metrics.active)return "There is no active Reward Boost event.";
      if(action==="end"&&metrics.endBlock!==null&&metrics.block<metrics.endBlock)return `The event ends at block ${metrics.endBlock.toLocaleString()} · approximately ${Math.ceil((metrics.endBlock-metrics.block)*metrics.secondsPerBlock/60)} minutes remaining.`;
    }
    if(module==="advanced-governance"){
      if(["senate-vote","senate-membership-vote","senate-remove-vote","senate-replace"].includes(action)&&s.senate.walletIsMember===false)return "Only a registered Senate member can perform this action.";
      if(action.startsWith("senate-")&&s.senate.count===0)return "The protocol currently has no registered Senate members.";
      const row=s.treasury.find(row=>String(row.id)===args.id);
      if(row&&["treasury-support","treasury-oppose"].includes(action)&&now>=row.votingDeadline)return "Credit voting has ended for this treasury request.";
      if(row&&["treasury-approve","treasury-close"].includes(action)&&now<row.finalizationAfter)return "Finalization opens at "+date(row.finalizationAfter)+".";
      if(["treasury-create","treasury-support","treasury-oppose","governor-propose"].includes(action)){
        const cost=parseEther(s.settings.votingCost),spend=action==="governor-propose"?cost*100n:args.credit?parseEther(args.credit):null;
        if(spend===null)return "Enter your voting-credit commitment"+(action==="treasury-create"?` (minimum ${Number(s.settings.votingCost)*100} OINK).`:".");
        if(s.walletCredit!==null&&spend>parseEther(s.walletCredit))return "Insufficient voting credit. Deposit credit before reviewing this action.";
      }
    }
  }catch{return "Enter a valid amount to check the requirements.";}
  return "Review checks current votes, waiting periods, balances and permissions before wallet confirmation.";
}
