import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { Db } from "./index.js";
import { documentAssignees, documents, documentTags, memberships, milestones, settings, subteamMembers, subteams, tags, users } from "./schema.js";
import { hashPassword } from "./password.js";

export const DEMO_PASSWORD = "teamroom";

const at = (daysFromNow: number, h = 9, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
};
const day = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const abstractOf = (html: string) => text(html).slice(0, 200);
const p = (...paras: string[]) => paras.map((x) => `<p>${x}</p>`).join("");
const ul = (...items: string[]) => `<ul>${items.map((x) => `<li>${x}</li>`).join("")}</ul>`;

/** Idempotent: does nothing when the users table already has rows. */
export function seed(db: Db) {
  const n = db.select({ n: sql<number>`count(*)` }).from(users).get()?.n ?? 0;
  if (n > 0) return;

  const now = at(0);
  const pw = hashPassword(DEMO_PASSWORD);
  const U = { maya: "u-maya", daniel: "u-daniel", priya: "u-priya", tom: "u-tom", lena: "u-lena", omar: "u-omar", sofia: "u-sofia", jonas: "u-jonas", rita: "u-rita" };

  db.insert(users)
    .values([
      { id: U.maya, email: "maya.chen@atlas.example", displayName: "Maya Chen", passwordHash: pw, jobTitle: "Program Manager", department: "PMO", location: "Boston, US", phone: "+1 617 555 0142", bio: "Runs the Atlas programme. Likes a tidy backlog and a short meeting.", avatarColor: "#2563eb", timezone: "America/New_York", createdAt: at(-120), updatedAt: now },
      { id: U.daniel, email: "daniel.okafor@atlas.example", displayName: "Daniel Okafor", passwordHash: pw, jobTitle: "Lead Architect", department: "Engineering", location: "London, UK", phone: "+44 20 7946 0958", bio: "Owns the platform architecture and the API gateway.", avatarColor: "#7c3aed", timezone: "Europe/London", createdAt: at(-120), updatedAt: now },
      { id: U.priya, email: "priya.raman@atlas.example", displayName: "Priya Raman", passwordHash: pw, jobTitle: "Product Designer", department: "Design", location: "Bengaluru, IN", phone: "+91 80 4567 8910", bio: "Design system, research and the portal UX.", avatarColor: "#db2777", timezone: "Asia/Kolkata", createdAt: at(-110), updatedAt: now },
      { id: U.tom, email: "tom.becker@atlas.example", displayName: "Tom Becker", passwordHash: pw, jobTitle: "Backend Engineer", department: "Engineering", location: "Berlin, DE", phone: "+49 30 901820", bio: "Billing services. SQL whisperer.", avatarColor: "#059669", timezone: "Europe/Berlin", createdAt: at(-100), updatedAt: now },
      { id: U.lena, email: "lena.fischer@atlas.example", displayName: "Lena Fischer", passwordHash: pw, jobTitle: "Scrum Master", department: "PMO", location: "Hamburg, DE", phone: "+49 40 2288 110", bio: "Keeps the ceremonies honest and the board green.", avatarColor: "#d97706", timezone: "Europe/Berlin", createdAt: at(-100), updatedAt: now },
      { id: U.omar, email: "omar.haddad@atlas.example", displayName: "Omar Haddad", passwordHash: pw, jobTitle: "Security Engineer", department: "Security", location: "Dubai, AE", phone: "+971 4 123 4567", bio: "Threat models, pen-tests and the occasional CTF.", avatarColor: "#dc2626", timezone: "Asia/Dubai", createdAt: at(-90), updatedAt: now },
      { id: U.sofia, email: "sofia.alvarez@atlas.example", displayName: "Sofia Alvarez", passwordHash: pw, jobTitle: "QA Lead", department: "Quality", location: "Madrid, ES", phone: "+34 91 123 4567", bio: "Automation first, exploratory testing second.", avatarColor: "#0891b2", timezone: "Europe/Madrid", createdAt: at(-90), updatedAt: now },
      { id: U.jonas, email: "jonas.lindqvist@atlas.example", displayName: "Jonas Lindqvist", passwordHash: pw, jobTitle: "Frontend Engineer", department: "Engineering", location: "Stockholm, SE", phone: "+46 8 123 456", bio: "React, accessibility, and very strong coffee.", avatarColor: "#4f46e5", timezone: "Europe/Stockholm", createdAt: at(-14), updatedAt: now },
      { id: U.rita, email: "rita.novak@atlas.example", displayName: "Rita Novak", passwordHash: pw, jobTitle: "Account Executive", department: "Sales", location: "Prague, CZ", phone: null, bio: "Read-only stakeholder from the customer side.", avatarColor: "#65a30d", timezone: "Europe/Prague", createdAt: at(-30), updatedAt: now },
    ])
    .run();

  db.insert(memberships)
    .values([
      { userId: U.maya, role: "owner" },
      { userId: U.lena, role: "facilitator" },
      { userId: U.daniel, role: "member" },
      { userId: U.priya, role: "member" },
      { userId: U.tom, role: "member" },
      { userId: U.omar, role: "member" },
      { userId: U.sofia, role: "member" },
      { userId: U.jonas, role: "member" },
      { userId: U.rita, role: "reader" },
    ])
    .run();

  db.insert(settings)
    .values({
      id: 1,
      name: "Project Atlas",
      purpose: "Coordination space for the Atlas customer-portal launch: discussions, action items, meeting notes, references, milestones and team status in one place.",
      leaderId: U.maya,
      facilitatorId: U.lena,
      labelDiscussion: "Discussion",
      labelAction: "Action Item",
      labelMeeting: "Meeting",
      labelReference: "Reference",
      defaultRole: "member",
    })
    .run();

  const S = { platform: "st-platform", experience: "st-experience", quality: "st-quality", golive: "st-golive" };
  db.insert(subteams)
    .values([
      { id: S.platform, name: "Platform & APIs", description: "Backend services, gateway, data model and integrations." },
      { id: S.experience, name: "Customer Experience", description: "Portal UX, design system and accessibility." },
      { id: S.quality, name: "Quality & Security", description: "Test automation, performance, pen-testing and compliance." },
      { id: S.golive, name: "Go-Live Readiness", description: "Launch checklist, comms, training and support hand-over." },
    ])
    .run();
  db.insert(subteamMembers)
    .values([
      { subteamId: S.platform, userId: U.daniel, isLeader: true },
      { subteamId: S.platform, userId: U.tom },
      { subteamId: S.platform, userId: U.omar },
      { subteamId: S.experience, userId: U.priya, isLeader: true },
      { subteamId: S.experience, userId: U.jonas },
      { subteamId: S.experience, userId: U.maya },
      { subteamId: S.quality, userId: U.sofia, isLeader: true },
      { subteamId: S.quality, userId: U.omar },
      { subteamId: S.quality, userId: U.lena },
      { subteamId: S.golive, userId: U.maya, isLeader: true },
      { subteamId: S.golive, userId: U.lena },
      { subteamId: S.golive, userId: U.sofia },
    ])
    .run();

  const TAGS = ["Architecture", "Design", "Launch", "Security", "Customer Feedback", "Infrastructure", "Process", "QA"];
  const tagId = new Map(TAGS.map((t) => [t, `tag-${t.toLowerCase().replace(/\W+/g, "-")}`]));
  db.insert(tags).values(TAGS.map((t) => ({ id: tagId.get(t)!, name: t }))).run();

  type DocInsert = typeof documents.$inferInsert;
  const rows: DocInsert[] = [];
  const tagRows: { documentId: string; tagId: string }[] = [];
  const assigneeRows: { documentId: string; userId: string }[] = [];

  const root = (d: Partial<DocInsert> & { kind: string; subject: string; bodyHtml: string; authorId: string; createdAt: string }, tagNames: string[] = [], assignees: string[] = []) => {
    const id = randomUUID();
    rows.push({ threadRootId: id, parentId: null, abstract: abstractOf(d.bodyHtml), bodyText: text(d.bodyHtml), updatedAt: d.createdAt, ...d, id });
    for (const t of tagNames) tagRows.push({ documentId: id, tagId: tagId.get(t)! });
    for (const u of assignees) assigneeRows.push({ documentId: id, userId: u });
    return id;
  };
  const comment = (parentId: string, bodyHtml: string, authorId: string, daysAgo: number, hour = 10) => {
    const parent = rows.find((r) => r.id === parentId)!;
    const id = randomUUID();
    const createdAt = at(-daysAgo, hour);
    rows.push({ id, kind: parent.kind, parentId, threadRootId: parent.threadRootId!, authorId, subject: `Re: ${parent.subject.replace(/^Re: /, "")}`, abstract: abstractOf(bodyHtml), bodyHtml, bodyText: text(bodyHtml), subteamId: parent.subteamId, createdAt, updatedAt: createdAt });
    const r = rows.find((x) => x.id === parent.threadRootId)!;
    if (r.updatedAt! < createdAt) r.updatedAt = createdAt;
    return id;
  };

  // --- discussions / actions / meetings / references ---
  const gateway = root(
    { kind: "discussion", status: "open", subject: "Should the portal use the new API gateway or go direct to services?", authorId: U.daniel, subteamId: S.platform, createdAt: at(-9, 9),
      bodyHtml: p("We need to decide before the sprint starts. Going through the gateway gives us rate limiting, auth and observability for free, but adds about <strong>40ms p95</strong> latency in staging. Going direct is faster but every service re-implements auth.", "My recommendation is the gateway, with a caching layer for the account summary call that dominates the home screen.") },
    ["Architecture", "Infrastructure"],
  );
  const c1 = comment(gateway, p("Agree on the gateway. 40ms is real but the account summary is the only hot path; we can cache that for 30 seconds without anyone noticing."), U.tom, 9, 11);
  comment(c1, p("30s is fine for balances but not for payment status. Customers refresh right after paying. Can we invalidate on the payment webhook?"), U.priya, 8, 9);
  const c2 = comment(gateway, p("From a security perspective the gateway is non-negotiable. Centralised token validation and WAF rules are the whole point."), U.omar, 8, 14);
  comment(c2, p("Noted. Let's make it the decision; I'll write up the ADR as a reference document."), U.daniel, 7, 8);

  const threat = root(
    { kind: "action", status: "open", priority: 1, dueOn: day(4), subject: "Complete threat model for the self-service password reset flow", authorId: U.omar, subteamId: S.quality, createdAt: at(-6, 10),
      bodyHtml: p("Walk through STRIDE for the reset flow (email link plus SMS fallback). Output: a list of mitigations with owners.", "Blocks the <em>security sign-off</em> milestone.") },
    ["Security"], [U.omar, U.tom],
  );
  comment(threat, p("Draft is in the shared folder. Two open items: SMS rate limiting and link expiry (currently 24h, proposing 15 minutes)."), U.omar, 2, 16);

  const planning = root(
    { kind: "meeting", startsAt: at(-7, 10), endsAt: at(-7, 11, 30), timezone: "Europe/Berlin", location: "Room Orion / Teams", subject: "Sprint 14 planning", authorId: U.lena, createdAt: at(-7, 12),
      bodyHtml: p("Attendees: whole team.", "Goals for the sprint:") + ul("Gateway integration (Daniel, Tom)", "Dashboard redesign hi-fi (Priya)", "Regression suite on the new CI runners (Sofia)") + p("Risks: Omar is out Thursday/Friday; threat model may slip.") },
    ["Process"],
  );
  comment(planning, p("Adding one more: the accessibility audit findings need triage this sprint, not next."), U.jonas, 7, 13);

  const feedback = root(
    { kind: "discussion", status: "open", subject: "Customer feedback round 2: top themes", authorId: U.priya, subteamId: S.experience, createdAt: at(-5, 15),
      bodyHtml: p("We interviewed 11 customers on the beta portal. Top themes:") + `<ol><li>Statement download is hard to find (7/11)</li><li>Nobody understood the <strong>pending</strong> badge (6/11)</li><li>People loved the new activity timeline (9/11)</li></ol>` + p("Proposing we fix 1 and 2 before launch.") },
    ["Customer Feedback", "Design"],
  );
  const c4 = comment(feedback, p("For #2, can we just rename it to <em>Processing</em> and add a tooltip with the expected time?"), U.maya, 5, 16);
  comment(c4, p("Tested that wording with 3 people this morning; it works. Will update the design system token."), U.priya, 4, 10);
  comment(feedback, p("Statement download: I'll move it into the account card header. Small change, big win."), U.jonas, 4, 11);

  root(
    { kind: "reference", subject: "ADR-007: Portal traffic flows through the API gateway", authorId: U.daniel, subteamId: S.platform, createdAt: at(-6, 9),
      bodyHtml: p("<strong>Status:</strong> Accepted", "<strong>Context:</strong> see the gateway discussion thread.", "<strong>Decision:</strong> All portal traffic is routed via the API gateway. Account summary responses are cached for 30 seconds and invalidated by the payments webhook.") + `<table><thead><tr><th>Option</th><th>p95</th><th>Auth</th></tr></thead><tbody><tr><td>Gateway</td><td>+40ms</td><td>Central</td></tr><tr><td>Direct</td><td>+0ms</td><td>Per service</td></tr></tbody></table>` },
    ["Architecture"],
  );

  const ci = root(
    { kind: "action", status: "open", priority: 2, dueOn: day(-1), subject: "Move regression suite to the new CI runners", authorId: U.sofia, subteamId: S.quality, createdAt: at(-10, 9),
      bodyHtml: p("The old runners time out on the full suite (48 min). New runners have 4x the cores. Target: full suite under 15 minutes, nightly plus on every merge to main.") },
    ["QA", "Infrastructure"], [U.sofia],
  );
  comment(ci, p("Down to 19 minutes. The remaining time is the Safari matrix; proposing we run it nightly only."), U.sofia, 1, 17);

  root(
    { kind: "discussion", status: "open", subject: "Dark mode for the portal: in scope for launch?", authorId: U.jonas, subteamId: S.experience, createdAt: at(-2, 14),
      bodyHtml: p("Several beta users asked for it. The design system already has the tokens. Effort is mostly QA across the component library. Thoughts?") },
    ["Design", "Launch"],
  );

  root(
    { kind: "meeting", startsAt: at(-3, 15), endsAt: at(-3, 16), timezone: "Europe/Berlin", location: "Teams", subject: "Go-live readiness checkpoint #1", authorId: U.maya, subteamId: S.golive, createdAt: at(-3, 16),
      bodyHtml: p("Reviewed the launch checklist: 31 of 48 items done. Open: support runbook, customer comms plan, rollback drill.", "Decisions: rollback drill scheduled; comms owned by Maya.") },
    ["Launch", "Process"],
  );

  root(
    { kind: "discussion", status: "complete", inactiveAt: at(-20), subject: "Legacy portal retirement: what do we archive?", authorId: U.tom, subteamId: S.platform, createdAt: at(-45, 9),
      bodyHtml: p("Once Atlas launches the old portal goes read-only for 90 days. Which reports do we need to keep after that? Legal wants 7 years on statements.") },
    ["Process", "Infrastructure"],
  );

  root(
    { kind: "action", status: "open", priority: 2, dueOn: day(7), subject: "Write the customer comms plan for launch week", authorId: U.maya, subteamId: S.golive, createdAt: at(-1, 11),
      bodyHtml: p("Email sequence (T-7, T-1, launch day), in-app banner copy, and a support FAQ. Review with Legal before T-7.") },
    ["Launch"], [U.maya, U.lena],
  );

  root(
    { kind: "action", status: "complete", priority: 3, dueOn: day(-8), subject: "Set up the staging gateway environment", authorId: U.tom, subteamId: S.platform, createdAt: at(-15, 9),
      bodyHtml: p("Provision the gateway in staging with the same WAF rule set as production.") },
    ["Infrastructure"], [U.tom],
  );

  // upcoming meetings (calendar reads kind=meeting by starts_at)
  root({ kind: "meeting", startsAt: at(1, 9, 30), endsAt: at(1, 9, 45), timezone: "Europe/Berlin", location: "Teams", subject: "Daily stand-up", authorId: U.lena, createdAt: at(-30), bodyHtml: p("Blockers first, then the board.") }, ["Process"]);
  root({ kind: "meeting", startsAt: at(2, 14), endsAt: at(2, 15), timezone: "Asia/Dubai", location: "Room Orion", subject: "Threat model review", authorId: U.omar, subteamId: S.quality, createdAt: at(-5), bodyHtml: p("Walk through the password reset STRIDE analysis. Decision needed on link expiry.") }, ["Security"]);
  root({ kind: "meeting", startsAt: at(3, 11), endsAt: at(3, 12), timezone: "Asia/Kolkata", location: "Teams", subject: "Design review: dashboard hi-fi", authorId: U.priya, subteamId: S.experience, createdAt: at(-4), bodyHtml: p("Priya presents the redesigned account dashboard. Feedback in Figma before the session if possible.") }, ["Design"]);
  root({ kind: "meeting", startsAt: at(6, 13), endsAt: at(6, 16), timezone: "America/New_York", location: "War room", subject: "Rollback drill", authorId: U.maya, subteamId: S.golive, createdAt: at(-3), bodyHtml: p("Full rehearsal of the production rollback runbook. Staging only.") }, ["Launch", "Infrastructure"]);
  root({ kind: "meeting", startsAt: at(4, 12, 30), endsAt: at(4, 14), timezone: "Europe/Madrid", location: "TBD", subject: "Team lunch", authorId: U.sofia, createdAt: at(-1), bodyHtml: p("Celebrating the CI migration. Sofia picks the place.") });
  root({ kind: "meeting", startsAt: at(14, 15), endsAt: at(14, 17), timezone: "Europe/Berlin", location: "Room Orion / Teams", subject: "Sprint 15 review & retro", authorId: U.lena, createdAt: at(-10), bodyHtml: p("Demo order: Platform, Experience, Quality, Go-Live.") }, ["Process"]);

  // --- announcements ---
  root({ kind: "announcement", subject: "Launch date confirmed: three weeks from today", authorId: U.maya, createdAt: at(-2, 9), bodyHtml: p("Steering committee approved the go-live date. Freeze on non-launch work starts next Monday.", "Please tag anything launch-critical with <strong>Launch</strong> so it shows up on the home page.") });
  root({ kind: "announcement", subject: "New CI runners are live", authorId: U.sofia, createdAt: at(-1, 15), bodyHtml: p("The quality subteam has moved the regression suite to the new runners. Expect merge checks to finish in under 20 minutes. Flaky tests go in the #atlas-ci channel.") });
  root({ kind: "announcement", subject: "Welcome Jonas to the team", authorId: U.priya, createdAt: at(-12, 10), bodyHtml: p("Jonas joins the Customer Experience subteam as a frontend engineer, starting with the accessibility audit findings. Say hi!") });
  root({ kind: "announcement", subject: "Staging maintenance Friday 18:00-20:00 CET", authorId: U.daniel, createdAt: at(-4, 12), bodyHtml: p("Gateway upgrade. Staging will be unavailable. Production is not affected.") });

  // --- status reports ---
  root({ kind: "status_team", reportOn: day(-3), subject: "Atlas programme status: week 41", authorId: U.maya, createdAt: at(-3, 17), summaryHtml: p("On track for launch. Security sign-off is the critical path."), bodyHtml: p("<strong>Highlights</strong>") + ul("Gateway decision made and ADR published", "Regression suite on new runners") + p("<strong>Risks</strong>") + ul("Threat model slipping by 2 days", "Comms plan not started") + p("<strong>Next week:</strong> rollback drill, comms plan, dashboard redesign hand-off.") });
  root({ kind: "status_subteam", subteamId: S.platform, reportOn: day(-4), subject: "Platform & APIs: sprint 14", authorId: U.daniel, createdAt: at(-4, 16), summaryHtml: p("Gateway integration 80% complete; caching layer in review."), bodyHtml: p("Done: routing, auth passthrough, tracing headers.", "In progress: cache invalidation via payments webhook.", "Blocked: none.") });
  root({ kind: "status_subteam", subteamId: S.quality, reportOn: day(-4), subject: "Quality & Security: sprint 14", authorId: U.sofia, createdAt: at(-4, 16), summaryHtml: p("CI migration done. Threat model at risk."), bodyHtml: p("The regression suite is now under 20 minutes. The password reset threat model is behind by two days because of PTO; recovery plan is to pair Omar with Tom.") });
  root({ kind: "status_subteam", subteamId: S.experience, reportOn: day(-4), subject: "Customer Experience: sprint 14", authorId: U.priya, createdAt: at(-4, 15), summaryHtml: p("Research synthesised; two launch-blocking UX fixes identified."), bodyHtml: p("Statement download and the pending badge are being fixed this sprint. Dashboard hi-fi review scheduled.") });
  root({ kind: "status_subteam", subteamId: S.golive, reportOn: day(-3), subject: "Go-Live Readiness: sprint 14", authorId: U.lena, createdAt: at(-3, 15), summaryHtml: p("31/48 checklist items complete; comms plan is late."), bodyHtml: p("Rollback drill scheduled. Support runbook in draft. Comms plan now an action item with a due date.") });
  root({ kind: "status_individual", subteamId: S.quality, reportOn: day(-2), subject: "Omar: weekly", authorId: U.omar, createdAt: at(-2, 18), summaryHtml: p("Threat model draft complete, two open items."), bodyHtml: "", thisWeek: p("Finished the STRIDE walkthrough for the reset flow."), goals: p("Close SMS rate limiting and link expiry with Tom."), issues: p("Out Thursday and Friday.") });
  root({ kind: "status_individual", subteamId: S.experience, reportOn: day(-2), subject: "Jonas: weekly", authorId: U.jonas, createdAt: at(-2, 17), summaryHtml: p("Accessibility audit: 14 of 22 findings fixed."), bodyHtml: "", thisWeek: p("Fixed focus order and labels across the account pages."), goals: p("Remaining findings are all in the date picker; proposing we replace it rather than patch it."), issues: p("None.") });

  db.insert(documents).values(rows).run();
  db.insert(documentTags).values(tagRows).run();
  db.insert(documentAssignees).values(assigneeRows).run();

  db.insert(milestones)
    .values([
      { id: randomUUID(), title: "Code freeze", summary: "Only launch-critical fixes after this point.", detailHtml: p("Branch protection switches to release approvals."), occursOn: day(8), authorId: U.maya, createdAt: at(-10) },
      { id: randomUUID(), title: "Security sign-off", summary: "Pen-test and threat models closed, WAF rules in production.", detailHtml: p("Owner: Omar. Required before go/no-go."), occursOn: day(12), authorId: U.omar, createdAt: at(-20) },
      { id: randomUUID(), title: "Atlas portal go-live", summary: "Production launch.", detailHtml: p("Launch day war room from 06:00 CET."), occursOn: day(21), authorId: U.maya, createdAt: at(-30) },
      { id: randomUUID(), title: "Beta programme closed", summary: "Round 2 interviews complete.", detailHtml: p("11 sessions over two days."), occursOn: day(-5), authorId: U.priya, createdAt: at(-15) },
    ])
    .run();
}
