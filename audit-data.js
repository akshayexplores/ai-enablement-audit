/* Audit content, benchmarks and answer scales. Shared by the audit and the admin page. */
const DEPTS = {
  mk:{name:"Marketing",acts:[
    ["Drafting content: blogs, social posts, email copy",.85,"AI drafts in your brand voice from a brief, using a saved skill that holds tone, examples and banned phrases. A person edits and approves."],
    ["Repurposing one piece of content across channels",.9,"One long-form asset goes in; channel-ready posts, newsletter sections and scripts come out in a fixed format, ready for review."],
    ["Campaign and channel performance reporting",.85,"AI pulls numbers from your ad, analytics and email tools, writes the weekly summary, and flags what moved and why."],
    ["SEO research and content briefs",.8,"AI researches keywords and competing pages, then writes briefs with structure, questions to answer and internal links."],
    ["Competitor and market research",.8,"A scheduled run checks competitor sites, pricing and launches, and sends a short digest of what changed."],
    ["Building and personalising email sequences",.75,"AI reads CRM segments and drafts sequences per segment; your email tool sends after approval."],
    ["Producing design assets: creatives, decks, thumbnails",.55,"AI produces first-pass layouts and variants from templates in your design tool; a designer finishes the hero pieces."],
    ["Campaign strategy and brand positioning",.35,"AI is a research and sparring partner here. The calls stay with people."],
    ["Events, partnerships and influencer relationships",.25,"AI handles the logistics and follow-ups around the relationship, not the relationship."]]},
  fi:{name:"Finance",acts:[
    ["Creating and sending customer invoices",.9,"AI reads the contract and the month's delivered work, creates the invoice in your accounting system and queues it for one-click approval."],
    ["Capturing bills and expenses from email and receipts",.9,"AI watches the inbox, reads each bill or receipt and records it against the right vendor and category in the books."],
    ["Bank and ledger reconciliation",.75,"AI matches transactions, clears the obvious ones and hands you a short list of exceptions."],
    ["Chasing overdue payments",.85,"AI ranks overdue invoices and drafts reminders that match each customer's history. You approve the send."],
    ["Month-end close and management reports",.7,"AI runs the close checklist, builds the MIS pack from the ledger and writes the commentary."],
    ["Budget versus actual and variance analysis",.75,"AI compares actuals to budget, breaks variances into drivers and drafts the explanation for leadership."],
    ["Payroll preparation and statutory filings",.55,"AI assembles inputs, checks for anomalies and prepares filing data. Submission and sign-off stay with a person."],
    ["Cash-flow forecasting",.65,"AI rebuilds the 30/60/90-day forecast from receivables, payables and recurring costs whenever you ask."],
    ["Audit, tax strategy and banking relationships",.3,"AI prepares documents and answers auditor requests faster. Judgement and relationships stay human."]]},
  hr:{name:"HR",acts:[
    ["Writing job descriptions and posting roles",.9,"AI writes the JD, scorecard and interview questions from a short hiring brief, in your house format."],
    ["Screening resumes and shortlisting",.75,"AI scores each application against the stated rubric only and explains each score. A person makes the shortlist decision."],
    ["Scheduling interviews and candidate communication",.85,"AI proposes times from real calendars, sends invites and drafts every candidate reply."],
    ["Onboarding: documents, checklists, account setup",.75,"A new-hire record triggers the offer letter, checklist, welcome plan and access requests."],
    ["Answering policy questions from employees",.85,"An assistant answers from your actual handbook, quotes the clause and escalates anything sensitive."],
    ["Leave, attendance and payroll inputs",.7,"AI reconciles leave and attendance records and prepares the payroll input sheet with anomalies flagged."],
    ["Preparing and synthesising performance reviews",.6,"AI gathers goals, feedback and work evidence into a draft for the manager to rewrite."],
    ["Training content and learning plans",.7,"AI turns SOPs and recordings into training modules, quizzes and role-based learning paths."],
    ["Employee relations, grievances and culture",.2,"Human work. AI helps with documentation and preparation only."]]},
  op:{name:"Operations",acts:[
    ["Recurring status reports and dashboards",.85,"AI reads the project tracker and produces the weekly report with risks and decisions needed."],
    ["Writing and updating SOPs and process docs",.85,"Someone explains or records the process once; AI writes the SOP and keeps it current as the process changes."],
    ["Tracking projects, updating tasks, chasing owners",.8,"AI updates the tracker from messages and meetings and nudges owners on overdue items."],
    ["Tracking client deliverables against contract scope",.75,"AI reads each contract and the month's work log, then flags what is due, what is out of scope and what to bill."],
    ["Procurement: comparing quotes, raising POs",.7,"AI compares vendor quotes on a like-for-like basis and drafts the PO for approval."],
    ["Meeting notes into action items into the tracker",.9,"Transcripts become decisions and tasks with owners and dates, written straight into your tracker."],
    ["Inventory, demand and capacity planning",.6,"AI projects demand from history and proposes reorder or staffing plans for a planner to adjust."],
    ["Quality checks and exception handling",.5,"AI runs the routine checks and routes exceptions with context attached."],
    ["Physical or on-site execution",.1,"Not addressable by language models. AI supports the paperwork around it."]]},
  tr:{name:"Travel",acts:[
    ["Researching itineraries and comparing options",.85,"AI searches options against the traveller's calendar and your policy, and returns three ranked choices."],
    ["Booking flights, hotels and ground transport",.6,"AI prepares the booking up to the payment step. A person confirms and pays."],
    ["Checking policy compliance and routing approvals",.8,"Each request is checked against the travel policy and sent to the right approver with the reasoning."],
    ["Expense claims: receipts into reports",.9,"Receipts from email and photos are read, categorised and assembled into the claim."],
    ["Visas and travel documentation",.65,"AI builds the requirement checklist per destination, pre-fills forms and tracks expiry dates."],
    ["Handling changes, cancellations and disruptions",.55,"AI finds alternatives and drafts the rebooking. Urgent calls with airlines stay with a person."],
    ["Travel spend reporting",.85,"AI reports spend by team, route and vendor, and points to where policy or negotiated rates are being missed."],
    ["Negotiating vendor and corporate rates",.3,"AI prepares the volume data and benchmarks. People negotiate."]]},
  ad:{name:"Administration",acts:[
    ["Inbox triage and drafting replies",.85,"AI sorts mail into needs-you, drafted and handled, and writes replies in the sender's own voice."],
    ["Calendar management and scheduling",.85,"AI finds times across calendars, sends invites and handles reschedules."],
    ["Drafting, formatting and filing documents",.85,"Letters, minutes and forms are produced from templates and filed in the right folder with the right name."],
    ["Re-keying data from one system into another",.9,"With both systems connected, AI moves and validates the data. This category largely disappears."],
    ["Meeting minutes and follow-ups",.9,"Minutes, action items and follow-up emails are ready when the meeting ends."],
    ["Tracking contract, renewal and compliance dates",.8,"AI reads agreements, extracts key dates and reminds the owner ahead of each one."],
    ["Office vendors, facilities and asset tracking",.5,"AI keeps the registers and vendor follow-ups current. Physical coordination stays human."],
    ["Front desk and in-person support",.1,"Not addressable by language models."]]},
  sa:{name:"Sales",acts:[
    ["Researching leads and building prospect lists",.85,"AI builds lists of look-alike accounts from your best customers, with a reason attached to each."],
    ["Personalised outreach and follow-ups",.8,"AI drafts each message from real account research in the rep's voice and queues it for approval."],
    ["Updating the CRM and logging calls",.9,"Calls, emails and meetings are logged and deal fields updated without the rep opening the CRM."],
    ["Preparing for meetings and writing account briefs",.9,"Before every call: attendees, history, open deals and suggested questions in one page."],
    ["Proposals, quotes and statements of work",.8,"Discovery notes become a costed proposal on your template, using your past pricing."],
    ["Pipeline reviews and forecasting",.75,"AI flags stale deals and slipped dates, and drafts the forecast narrative."],
    ["Answering RFPs and security questionnaires",.8,"AI answers from your library of past responses and marks what needs a fresh answer."],
    ["Discovery calls, negotiation and closing",.25,"Human work. AI prepares the rep and handles the follow-up."],
    ["Ongoing account relationships",.3,"AI watches for signals and prepares reviews. People hold the relationship."]]},
  dv:{name:"Development",acts:[
    ["Writing feature code",.8,"Coding agents implement scoped tickets in your repo and open pull requests for review."],
    ["Code review",.75,"AI does the first review pass for bugs, security and style so people focus on design."],
    ["Writing and maintaining tests",.85,"AI writes unit and integration tests and keeps them passing as code changes."],
    ["Debugging and incident triage",.7,"AI reads logs and traces, reproduces the issue and proposes a fix."],
    ["Documentation: READMEs, API docs, runbooks",.9,"Docs are generated from the code and refreshed on each merge."],
    ["Refactoring, migrations and tech debt",.75,"Agents run repetitive changes across the codebase with tests as the guardrail."],
    ["CI/CD, infrastructure scripts and deployments",.7,"AI writes pipeline and infra config and runs pre-deploy checks. People approve production changes."],
    ["Grooming tickets, writing specs, estimating",.7,"Vague requests become specs with acceptance criteria and a task breakdown."],
    ["Architecture and product decisions",.35,"AI lays out options and trade-offs. The decision stays with the team."]]}
};
const ORDER = ["mk","fi","hr","op","tr","ad","sa","dv"];

/* Department ceilings and typical-company adoption.
   Development, Finance, Administration and Sales are anchored to Anthropic's "Labour Market Impacts of AI" (Mar 2026) occupational figures;
   Marketing, HR, Travel and Operations are blended estimates. Edit here to recalibrate. */
const THEO={mk:.85,fi:.90,hr:.82,op:.75,tr:.80,ad:.90,sa:.70,dv:.95};
const TYP ={mk:.25,fi:.30,hr:.22,op:.25,tr:.20,ad:.30,sa:.28,dv:.40};
/* scale each department's activity benchmarks so their average meets the department ceiling */
ORDER.forEach(k=>{const a=DEPTS[k].acts;for(let n=0;n<4;n++){const m=a.reduce((s,x)=>s+x[1],0)/a.length,f=THEO[k]/m;a.forEach(x=>x[1]=Math.min(.98,x[1]*f));}});
const HITL={fi:[6,8],hr:[1,6,8],sa:[7],tr:[1]};
const PROOF={
  dv:"85% of developers already use AI tools regularly. JetBrains, 2025",
  fi:"42% of finance activities can be fully automated. McKinsey",
  ad:"Office and admin work is 90% addressable, 34% observed. Anthropic, 2026",
  mk:"Arts and media work is 84% addressable, 19% observed. Anthropic, 2026",
  hr:"Hiring is where HR gains most from AI. McKinsey",
  tr:"Booking, policy checks and claims are rule-based and already digital.",
  op:"Procurement can run 25 to 40% more efficiently. McKinsey",
  sa:"Sales work is 62% addressable, 27% observed. Anthropic, 2026"};
const CONNECT={fi:"Zoho Books, Xero, Stripe",sa:"HubSpot, Salesforce, Zoho CRM",dv:"GitHub, Jira, Linear",ad:"Gmail, Outlook, Google Drive, Notion, Coda, Slack",mk:"Canva, Figma, HubSpot",hr:"Zoho People, Keka, Darwinbox (API or export)",tr:"Navan, Concur (API)",op:"NetSuite, SAP (API)"};
const SHORT = {
  mk:["Content drafting","Repurposing","Reporting","SEO briefs","Market research","Email sequences","Design assets","Strategy","Events & partners"],
  fi:["Invoicing","Bills & expenses","Reconciliation","Collections","Month-end & MIS","Variance analysis","Payroll & filings","Cash forecasting","Audit & tax"],
  hr:["Job descriptions","Screening","Scheduling","Onboarding","Policy questions","Leave & attendance","Reviews","Training","Employee relations"],
  op:["Status reports","SOPs","Task tracking","Scope tracking","Procurement","Meeting actions","Planning","Quality checks","On-site work"],
  tr:["Itineraries","Bookings","Policy checks","Expense claims","Visas","Disruptions","Spend reports","Rate negotiation"],
  ad:["Inbox","Calendar","Documents","Data re-keying","Minutes","Date tracking","Facilities","Front desk"],
  sa:["Lead research","Outreach","CRM updates","Meeting prep","Proposals","Forecasting","RFPs","Closing","Accounts"],
  dv:["Feature code","Code review","Tests","Debugging","Docs","Refactoring","CI/CD","Specs","Architecture"]};
const ICON={
  mk:"M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12",
  fi:"M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  hr:"M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.87M15.5 3.13a3.5 3.5 0 0 1 0 6.75",
  op:"M3 3h6v6H3zM15 15h6v6h-6zM9 6h6a3 3 0 0 1 3 3v6",
  tr:"M4 8h16v12H4zM9 8V5h6v3M4 13h16",
  ad:"M4 5h16v16H4zM4 10h16M8 3v4M16 3v4",
  sa:"M3 17l6-6 4 4 8-8M15 7h6v6",
  dv:"M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16",
  ok:"M5 12l5 5L20 7", user:"M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1", plug:"M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4", quote:"M4 5h16v11H9l-5 4z"};
const ico=(k,s)=>`<svg class="ic" width="${s||22}" height="${s||22}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k]}"/></svg>`;
const meter=(n,max)=>n<0?`<svg class="mt" width="18" height="16" viewBox="0 0 18 16" aria-hidden="true"><text x="9" y="13" text-anchor="middle" font-size="14" font-weight="700" fill="currentColor">?</text></svg>`
  :`<svg class="mt" width="${max*5}" height="16" viewBox="0 0 ${max*5} 16" aria-hidden="true">${Array.from({length:max},(_,i)=>`<rect class="${i<n?"f":""}" x="${i*5}" y="${16-(4+i*12/max)}" width="3.4" height="${4+i*12/max}" rx="1"/>`).join("")}</svg>`;

const T=["None","Little","Some","Lots"];
const C=[["Manual",0],["ChatGPT copy-paste",.25],["Shared prompts",.5],["AI in our tools",.8],["Runs itself",1]];
const READY=[
  ["Where does the work live?",["Paper, local files","Spreadsheets, email","Cloud apps, unconnected","Cloud apps with APIs"]],
  ["How repeatable is it?",["Every case differs","Some patterns","Mostly the same","Same every time"]],
  ["How many cases need special handling?",["Most","About half","Some","Few"]],
  ["Are processes written down?",["No","A few notes","Outdated SOPs","Current SOPs"]],
  ["Is AI allowed with company data?",["No","Unclear","With guidelines","Encouraged"]]];
const X_SIZE=[["None",0],["1–5",3],["6–20",12],["21–50",35],["50+",75]];
const X_LVL=[["Not at all",0,0],["A few use ChatGPT personally",.15,1],["Most of the team chats with AI",.3,2],["AI is plugged into their tools",.7,3],["Parts of the work run themselves",.9,4],["Not sure",.1,-1]];
const X_ORG=[
  ["AI policy for company data?",["None, people avoid AI","None, people use it anyway","Informal","Written"]],
  ["Paid AI tools for staff?",["No","A few expense it","Some teams","Company-wide"]],
  ["Where do core systems live?",["Paper, local files","Desktop software","Cloud, unconnected","Cloud with APIs"]]];
const TYPICAL={
  mk:{head:5,tools:"Canva, Meta Ads, Google Analytics, Mailchimp",a:[[3,2],[2,2],[2,1],[1,1],[1,1],[2,1],[2,1],[1,1],[1,0]],r:[2,1,2,1,1]},
  fi:{head:4,tools:"Tally or Zoho Books, Excel, bank portals",a:[[2,2],[3,1],[3,1],[2,2],[3,1],[1,2],[2,1],[1,1],[1,0]],r:[2,3,2,2,1]},
  hr:{head:3,tools:"HRMS, LinkedIn, Naukri, Excel",a:[[1,2],[2,1],[2,1],[2,1],[2,1],[2,0],[1,1],[1,2],[2,0]],r:[1,2,2,1,1]},
  op:{head:8,tools:"Excel, WhatsApp, email, project tracker",a:[[2,1],[1,2],[3,1],[2,1],[2,1],[2,2],[1,1],[2,0],[2,0]],r:[1,2,1,1,1]},
  tr:{head:1,tools:"MakeMyTrip, travel agent, email",a:[[2,2],[3,0],[1,1],[2,1],[1,1],[2,0],[1,1],[0,0]],r:[1,2,2,0,1]},
  ad:{head:3,tools:"Outlook or Gmail, Word, Excel, shared drive",a:[[3,1],[2,1],[2,2],[3,1],[2,2],[1,1],[2,0],[2,0]],r:[1,2,2,0,1]},
  sa:{head:8,tools:"CRM, LinkedIn, email, PowerPoint",a:[[2,2],[3,2],[2,1],[1,2],[2,1],[1,1],[1,1],[3,0],[2,0]],r:[2,1,1,1,1]},
  dv:{head:10,tools:"GitHub, Cursor, Jira, Slack",a:[[3,3],[2,1],[2,3],[2,1],[1,2],[1,2],[1,1],[1,1],[1,0]],r:[3,1,2,2,2]}};
