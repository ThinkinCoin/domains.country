import { useMemo, useState } from "react";
import {
  ArrowLeft, ArrowRight, ArrowsLeftRight, Bell, CalendarBlank, CaretDown, Check,
  CheckCircle, CircleNotch, Clock, ClockCounterClockwise, CloudCheck, Copy,
  DotsThreeVertical, Eye, Gear, GlobeHemisphereWest, Info, Key, List, LockKey,
  MagnifyingGlass, PencilSimple, Plus, Pulse, Question, Scroll, ShieldCheck,
  User, Users, Wallet, WarningCircle, X, XCircle,
} from "@phosphor-icons/react";

const domains = [
  { name: "cafe.country", expires: "Mar 26, 2028", renewal: "82 ONE", health: "healthy" },
  { name: "studio.country", expires: "Nov 14, 2027", renewal: "82 ONE", health: "pending" },
  { name: "origem.country", expires: "Sep 08, 2027", renewal: "82 ONE", health: "chain" },
];

const initialRecords = [
  { id: 1, type: "A", name: "@", content: "203.0.113.10", ttl: "300", state: "published" },
  { id: 2, type: "CNAME", name: "www", content: "cafe.country.", ttl: "300", state: "edited" },
  { id: 3, type: "NS", name: "@", content: "ns1.cafe.country.", ttl: "86400", state: "published" },
  { id: 4, type: "TXT", name: "@", content: '"v=spf1 include:_spf.cafe.country ~all"', ttl: "3600", state: "edited" },
  { id: 5, type: "SOA", name: "@", content: "ns1.cafe.country. hostmaster.cafe.country. 2025083101", ttl: "86400", state: "published" },
  { id: 6, type: "SRV", name: "_sip._tcp", content: "10 5 5060 sip.cafe.country.", ttl: "300", state: "edited" },
  { id: 7, type: "DNAME", name: "shop", content: "cafe.country.", ttl: "300", state: "published" },
];

const statusMeta = {
  published: { label: "Published to DNS", tone: "success", Icon: CheckCircle },
  dnsPending: { label: "Waiting for DNS publication", tone: "warning", Icon: Clock },
  chainPending: { label: "Waiting for confirmations", tone: "info", Icon: CircleNotch },
  confirmed: { label: "Confirmed on Harmony", tone: "brand", Icon: ShieldCheck },
  failed: { label: "DNS publication failed", tone: "danger", Icon: XCircle },
};

function Brand({ inverse = false, onClick }) {
  return <button className={`brand ${inverse ? "brand--inverse" : ""}`} onClick={onClick} aria-label="Go to homepage"><span>domains.<strong>country</strong></span><small>on Harmony</small></button>;
}

function StatusBadge({ status = "published", compact = false }) {
  const item = statusMeta[status];
  const Icon = item.Icon;
  return <span className={`status-badge status-badge--${item.tone} ${compact ? "status-badge--compact" : ""}`}><Icon size={15} className={status === "chainPending" ? "spin" : ""} />{item.label}</span>;
}

function WalletControl({ connected, onToggle, inverse = false }) {
  return <button className={`wallet-control ${inverse ? "wallet-control--inverse" : ""}`} onClick={onToggle}><Wallet size={19} /><span>{connected ? "one1qz...4f5a" : "Connect wallet"}</span>{connected && <span className="online-dot" aria-label="Connected" />}<CaretDown size={14} /></button>;
}

function Home({ query, setQuery, onSearch, connected, onWallet }) {
  const submit = (event) => { event.preventDefault(); if (query.trim()) onSearch(); };
  return <main className="home-screen">
    <img className="home-background" src="/assets/domains-hero.png" alt="Person holding a phone showing a natural landscape" />
    <div className="home-shade" />
    <header className="home-header"><Brand inverse onClick={() => setQuery("")} /><div className="home-actions"><WalletControl connected={connected} onToggle={onWallet} inverse /><button className="icon-button icon-button--inverse" aria-label="Open menu"><List size={27} /></button></div></header>
    <section className="home-content" aria-labelledby="home-title"><p className="eyebrow eyebrow--inverse">YOUR NAME. YOUR PROPERTY.</p><h1 id="home-title">Find your place<br />on the internet.</h1><p className="home-subtitle">Register a <strong>.country</strong> domain with your Harmony wallet. Non-custodial, with verifiable control.</p>
      <form className="domain-search" onSubmit={submit}><MagnifyingGlass size={24} /><label className="sr-only" htmlFor="domain-search">Search domain</label><input id="domain-search" value={query} onChange={(e) => setQuery(e.target.value.replace(/\.country$/i, ""))} placeholder="Search for your domain" autoComplete="off" /><span className="domain-suffix">.country</span><button type="submit" aria-label="Search domain"><ArrowRight size={25} /></button></form>
      <p className="home-note"><ShieldCheck size={17} /> You confirm every action in your own wallet.</p></section>
    <footer className="home-footer"><span>Harmony Mainnet</span><span>Non-custodial registration</span></footer>
  </main>;
}

function PublicHeader({ onBack }) {
  return <header className="public-header"><Brand onClick={onBack} /><div className="network-pill"><GlobeHemisphereWest size={18} /><span>Harmony Mainnet</span><span className="online-dot" /></div></header>;
}

function SearchResult({ query, onBack, onRegister }) {
  const [years, setYears] = useState(1);
  return <main className="public-page"><PublicHeader onBack={onBack} /><section className="result-shell"><button className="text-button" onClick={onBack}><ArrowLeft size={17} /> New search</button>
    <div className="result-heading"><div><p className="eyebrow">SEARCH RESULT</p><h1>{query || "cafe"}.country</h1></div><span className="availability"><CheckCircle size={19} weight="fill" /> Available</span></div>
    <div className="result-grid"><section className="card purchase-card"><div className="card-header"><div><h2>Choose your term</h2><p>You can renew whenever you want.</p></div></div><div className="duration-control"><button onClick={() => setYears(Math.max(1, years - 1))}>−</button><div><strong>{years}</strong><span>{years === 1 ? "year" : "years"}</span></div><button onClick={() => setYears(Math.min(10, years + 1))}>+</button></div><div className="assurance-list"><span><Check size={18} /> Ownership recorded on Harmony</span><span><Check size={18} /> Full management of supported DNS records</span><span><Check size={18} /> Non-custodial renewal and transfer</span></div></section>
      <aside className="card order-card"><p className="eyebrow">SUMMARY</p><div className="order-domain"><strong>{query || "cafe"}.country</strong><span>{years} {years === 1 ? "year" : "years"}</span></div><div className="price-row"><span>Registration</span><strong>{82 * years} ONE</strong></div><div className="price-row muted"><span>Estimated network fee</span><span>~0.01 ONE</span></div><div className="order-total"><span>Total</span><strong>{82 * years} ONE</strong></div><button className="button button--primary button--full" onClick={() => onRegister(years)}>Continue to registration <ArrowRight size={18} /></button><p className="fine-print"><LockKey size={14} /> Funds leave your wallet only after you confirm.</p></aside></div>
  </section></main>;
}

function RegistrationFlow({ query, years, onDone, onCancel }) {
  const [step, setStep] = useState(0);
  const steps = [
    { title: "Protect your request", description: "Your wallet will submit a private commitment to prevent someone else from front-running your registration.", action: "Sign commitment", note: "No payment is made at this step." },
    { title: "Wait for the minimum period", description: "Harmony needs a moment before accepting the registration. This protects the commitment process.", action: "Minimum period complete", note: "The estimated wait is 60 seconds." },
    { title: "Register the domain", description: `Confirm the registration of ${query}.country for ${years} ${years === 1 ? "year" : "years"} in your wallet.`, action: "Sign registration", note: `${82 * years} ONE + estimated network fee.` },
    { title: "Registration confirmed", description: `${query}.country now belongs to your wallet. DNS publication starts once records are configured.`, action: "Manage domain", note: "Transaction 0x7f2a...9c10 confirmed on Harmony." },
  ];
  const current = steps[step];
  return <main className="flow-page"><PublicHeader onBack={onCancel} /><section className="flow-shell"><button className="text-button" onClick={onCancel}><ArrowLeft size={17} /> Cancel registration</button><div className="stepper">{["Commitment", "Minimum wait", "Registration", "Confirmation"].map((label, index) => <div className={`step ${index <= step ? "step--active" : ""}`} key={label}><span>{index < step ? <Check size={15} /> : index + 1}</span><small>{label}</small></div>)}</div>
    <div className="flow-card card"><div className={`flow-icon ${step === 3 ? "flow-icon--success" : ""}`}>{step === 3 ? <CheckCircle size={33} weight="fill" /> : step === 1 ? <Clock size={33} /> : <Wallet size={33} />}</div><p className="eyebrow">STEP {step + 1} OF 4</p><h1>{current.title}</h1><p className="flow-description">{current.description}</p>{step === 1 && <div className="wait-meter"><span /><strong>Ready to continue</strong></div>}<div className="transaction-summary"><span><GlobeHemisphereWest size={18} /> Network</span><strong>Harmony Mainnet</strong><span><ShieldCheck size={18} /> Owner</span><strong>one1qz...4f5a</strong></div><button className="button button--primary button--full" onClick={() => step < 3 ? setStep(step + 1) : onDone()}>{current.action} <ArrowRight size={18} /></button><p className="fine-print">{current.note}</p></div>
  </section></main>;
}

function AppShell({ view, setView, children, connected, onWallet }) {
  const [mobileNav, setMobileNav] = useState(false);
  const nav = [["dashboard", "My domains", GlobeHemisphereWest], ["transfers", "Transfers", ArrowsLeftRight], ["activity", "Activity", ClockCounterClockwise], ["admin", "Administration", ShieldCheck], ["kit", "Visual system", Eye]];
  return <div className="app-shell"><aside className={`sidebar ${mobileNav ? "sidebar--open" : ""}`}><div className="sidebar-brand"><Brand onClick={() => setView("home")} /><button className="icon-button mobile-close" onClick={() => setMobileNav(false)}><X size={21} /></button></div><nav>{nav.map(([id, label, Icon]) => <button key={id} className={view === id ? "active" : ""} onClick={() => { setView(id); setMobileNav(false); }}><Icon size={21} /><span>{label}</span></button>)}</nav><div className="sidebar-bottom"><button><Question size={21} />Help</button><button><Gear size={21} />Settings</button></div></aside>
    <div className="app-main"><header className="app-header"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)}><List size={23} /></button><div className="app-header-spacer" /><button className="network-control"><GlobeHemisphereWest size={18} /><span>Harmony Mainnet</span><CaretDown size={14} /></button><button className="icon-button"><Bell size={20} /><span className="notification-dot" /></button><WalletControl connected={connected} onToggle={onWallet} /></header>{children}</div></div>;
}

function Dashboard({ onDomain, onSearch }) {
  return <main className="content-page"><div className="page-heading"><div><p className="eyebrow">PORTFOLIO</p><h1>My domains</h1><p>Manage ownership, renewal, and DNS in one place.</p></div><button className="button button--primary" onClick={onSearch}><Plus size={18} /> Register domain</button></div><div className="metrics-row"><div className="metric-card"><span>Active domains</span><strong>3</strong><small>All under your control</small></div><div className="metric-card"><span>Published to DNS</span><strong>1</strong><small>2 still processing</small></div><div className="metric-card"><span>Next expiry</span><strong>Sep 08</strong><small>In 373 days</small></div></div>
    <section className="card domain-list-card"><div className="list-toolbar"><div className="inline-search"><MagnifyingGlass size={18} /><input aria-label="Filter domains" placeholder="Filter domains" /></div><button className="button button--secondary">All statuses <CaretDown size={14} /></button></div><div className="domain-table table-head"><span>Domain</span><span>Public status</span><span>Expires</span><span>Renewal</span><span /></div>{domains.map((domain) => <button className="domain-table domain-row" key={domain.name} onClick={onDomain}><span className="domain-name"><GlobeHemisphereWest size={22} /><strong>{domain.name}</strong></span><span>{domain.health === "healthy" ? <StatusBadge status="published" compact /> : domain.health === "pending" ? <StatusBadge status="dnsPending" compact /> : <StatusBadge status="chainPending" compact />}</span><span>{domain.expires}</span><span>{domain.renewal}</span><span><ArrowRight size={18} /></span></button>)}</section>
  </main>;
}

function DomainDetail({ tab, setTab, onBack, onTransfer, records, setRecords, onToast }) {
  const tabs = ["Overview", "DNS", "History", "Settings"];
  return <main className="content-page domain-detail"><button className="text-button" onClick={onBack}><ArrowLeft size={17} /> Back to My domains</button><div className="domain-title-row"><div><h1>cafe.country</h1><div className="domain-facts"><span><CalendarBlank size={18} /> Expires Mar 26, 2028</span><span><User size={18} /> You are the owner</span><span><ShieldCheck size={18} /> Managed by you (non-custodial)</span></div></div><button className="button button--secondary" onClick={onTransfer}><ArrowsLeftRight size={18} /> Transfer</button></div><div className="tabs">{tabs.map((item) => <button className={tab === item ? "active" : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</div>{tab === "Overview" && <Overview onTransfer={onTransfer} />}{tab === "DNS" && <DnsEditor records={records} setRecords={setRecords} onToast={onToast} />}{tab === "History" && <History />}{tab === "Settings" && <Settings onTransfer={onTransfer} />}</main>;
}

function Overview({ onTransfer }) {
  return <div className="overview-grid"><section className="card status-story"><div className="card-header"><div><h2>Domain state</h2><p>Registration and DNS have independent lifecycles.</p></div><StatusBadge status="published" /></div><div className="status-timeline"><div><span><Check size={16} /></span><div><strong>Confirmed on Harmony</strong><small>Block #53,120,847 · Aug 31, 2026, 09:42</small></div></div><div><span><Check size={16} /></span><div><strong>Published to DNS</strong><small>Authoritative servers responding normally</small></div></div></div><div className="verification-box"><ShieldCheck size={20} /><div><strong>Verifiable ownership</strong><p>The current owner is <button>one1qz...4f5a</button>. Check the transaction on Harmony.</p></div><button className="icon-button"><Copy size={18} /></button></div></section>
    <aside className="card renewal-card"><p className="eyebrow">RENEWAL</p><h2>82 ONE <span>/ year</span></h2><p>You will receive alerts 60, 30, and 7 days before expiration.</p><button className="button button--primary button--full">Renew domain</button></aside>
    <section className="card info-grid-card"><div><span>Resolver</span><strong>Public DNS v1</strong><small>Compatible and active</small></div><div><span>Fuses</span><strong>No locks</strong><small>All actions available</small></div><div><span>Current owner</span><strong>one1qz...4f5a</strong><small>Connected wallet</small></div><div><span>Registered on</span><strong>Mar 26, 2026</strong><small>Harmony Mainnet</small></div></section><section className="card quick-actions"><h2>Actions</h2><button onClick={onTransfer}><ArrowsLeftRight size={20} /><span><strong>Transfer ownership</strong><small>Send the domain to another wallet</small></span><ArrowRight size={17} /></button><button><Key size={20} /><span><strong>Configure resolver</strong><small>Change the contract responsible for DNS</small></span><ArrowRight size={17} /></button></section></div>;
}

function DnsEditor({ records, setRecords, onToast }) {
  const [signing, setSigning] = useState(false);
  const pending = records.filter((record) => record.state === "edited");
  const edit = (id, field, value) => setRecords(records.map((record) => record.id === id ? { ...record, [field]: value, state: "edited" } : record));
  const addRecord = () => setRecords([...records, { id: Date.now(), type: "A", name: "@", content: "", ttl: "300", state: "edited" }]);
  const publish = () => { setSigning(true); window.setTimeout(() => { setSigning(false); setRecords(records.map((record) => record.state === "edited" ? { ...record, state: "published" } : record)); onToast("Changes confirmed on Harmony. DNS publication has started."); }, 900); };
  return <div className="dns-layout"><section className="dns-main"><div className="section-heading"><div><h2>DNS records</h2><p>Edit below. No change is published without your signature.</p></div><button className="button button--secondary">Reload</button></div><div className="status-strip"><div><StatusBadge status="published" /><small>Current production values</small></div><div><span className="proposal-icon"><PencilSimple size={17} /></span><strong>{pending.length ? `${pending.length} proposed changes` : "No pending changes"}</strong><small>{pending.length ? "Not signed yet" : "DNS synchronized"}</small></div><div><Clock size={22} /><strong>Publication after confirmation</strong><small>Track the state below</small></div></div>
    <div className="dns-table-wrap"><div className="dns-table dns-head"><span /><span>Type</span><span>Name</span><span>Content</span><span>TTL</span><span /></div>{records.map((record) => <div className={`dns-table dns-row ${record.state === "edited" ? "dns-row--edited" : ""}`} key={record.id}><span>{record.state === "edited" ? <PencilSimple size={16} /> : <CheckCircle size={18} />}</span><select value={record.type} onChange={(e) => edit(record.id, "type", e.target.value)}>{["A", "CNAME", "NS", "TXT", "SOA", "SRV", "DNAME"].map((type) => <option key={type}>{type}</option>)}</select><input value={record.name} onChange={(e) => edit(record.id, "name", e.target.value)} /><input value={record.content} onChange={(e) => edit(record.id, "content", e.target.value)} placeholder="Enter value" /><input value={record.ttl} onChange={(e) => edit(record.id, "ttl", e.target.value)} /><button className="icon-button"><DotsThreeVertical size={19} /></button></div>)}</div><button className="add-record" onClick={addRecord}><Plus size={18} /> Add record</button><div className="dns-help"><Info size={18} /><p><strong>Supported types:</strong> A, CNAME, NS, TXT, SOA, SRV, and DNAME. MX, AAAA, CAA, email, DNSSEC, and subdomains are not available yet.</p></div></section>
    <aside className="pending-drawer"><div className="drawer-heading"><div><h2>Pending changes</h2><span>{pending.length}</span></div><p>Review each value before signing with your wallet.</p></div><div className="change-list">{pending.length ? pending.map((record, index) => <div className="change-item" key={record.id}><span>{index + 1}</span><div><strong>{record.type} · {record.name}</strong><small>New</small><code>{record.content || "Value required"}</code></div></div>) : <div className="empty-small"><CloudCheck size={32} /><strong>Everything is synchronized</strong><p>There are no changes waiting for signature.</p></div>}</div><div className="drawer-footer"><div className="callout callout--info"><Clock size={18} /><p><strong>Publication starts after Harmony confirmation.</strong><br />You can track the state in History.</p></div><button className="button button--primary button--full" disabled={!pending.length || signing} onClick={publish}>{signing ? <><CircleNotch className="spin" size={18} /> Waiting for wallet...</> : <><LockKey size={18} /> Review and sign</>}</button><small>You will be asked to confirm in your wallet.</small></div></aside></div>;
}

function History() {
  const events = [[CloudCheck, "Published to DNS", "7 records available on authoritative servers", "Today, 09:46", "success"], [ShieldCheck, "Change confirmed on Harmony", "Transaction 0x7f2a...9c10 · Block #53,120,847", "Today, 09:42", "brand"], [PencilSimple, "DNS records updated", "CNAME, TXT, SRV, and TTL were changed", "Today, 09:40", "neutral"], [CalendarBlank, "Domain renewed", "Validity extended to Mar 26, 2028", "Mar 26, 2026", "neutral"]];
  return <section className="card history-card"><div className="card-header"><div><h2>Verifiable history</h2><p>On-chain operations and DNS publication events.</p></div><button className="button button--secondary">Export</button></div><div className="event-list">{events.map(([Icon, title, detail, date, tone]) => <div className="event-item" key={title}><span className={`event-icon event-icon--${tone}`}><Icon size={19} /></span><div><strong>{title}</strong><p>{detail}</p></div><time>{date}</time></div>)}</div></section>;
}

function Settings({ onTransfer }) {
  return <div className="settings-stack"><section className="card setting-row"><div><h2>Resolver</h2><p>Contract that answers for records associated with this domain.</p></div><div className="setting-action"><code>0x91b2...0Fa8</code><button className="button button--secondary">Change resolver</button></div></section><section className="card setting-row"><div><h2>Fuses</h2><p>Irreversible permissions applied to the name. No fuse is active.</p></div><button className="button button--secondary">View details</button></section><section className="card danger-zone"><div><h2>Transfer ownership</h2><p>This action removes the domain from your wallet. Carefully check the destination wallet.</p></div><button className="button button--danger" onClick={onTransfer}>Start transfer</button></section></div>;
}

function TransferModal({ onClose, onComplete }) {
  const [address, setAddress] = useState(""); const [confirmed, setConfirmed] = useState(false); const [stage, setStage] = useState(0); const valid = address.length > 20;
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal" role="dialog" aria-modal="true"><div className="modal-header"><div><p className="eyebrow">IRREVERSIBLE ACTION</p><h2>Transfer cafe.country</h2></div><button className="icon-button" onClick={onClose}><X size={21} /></button></div>{stage === 0 ? <><div className="danger-notice"><WarningCircle size={22} /><p>After confirmation, only the destination wallet can manage, renew, or transfer this domain.</p></div><label className="field-label" htmlFor="destination">Destination Harmony wallet</label><div className="address-field"><input id="destination" value={address} onChange={(e) => setAddress(e.target.value.trim())} placeholder="one1..." /><span>{valid && <CheckCircle size={19} weight="fill" />}</span></div><div className="address-preview"><span>Destination</span><strong>{valid ? `${address.slice(0, 10)}...${address.slice(-6)}` : "Enter a valid address"}</strong>{valid && <small>Valid Harmony format</small>}</div><label className="confirm-check"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>I checked the full address and understand that domains.country cannot reverse this transfer.</span></label><div className="modal-actions"><button className="button button--secondary" onClick={onClose}>Cancel</button><button className="button button--danger" disabled={!valid || !confirmed} onClick={() => setStage(1)}>Review in wallet</button></div></> : <div className="modal-success"><div className="flow-icon flow-icon--success"><CheckCircle size={34} weight="fill" /></div><h3>Transfer submitted</h3><p>The transaction was confirmed in your wallet and is waiting for Harmony confirmations.</p><StatusBadge status="chainPending" /><button className="button button--primary button--full" onClick={onComplete}>Track in history</button></div>}</div></div>;
}

function AdminPanel() {
  const [section, setSection] = useState("allowlist");
  return <main className="content-page"><div className="page-heading"><div><p className="eyebrow">OPERATIONS</p><h1>Administration</h1><p>Access control, auditing, and DNS publication health.</p></div><StatusBadge status="published" /></div><div className="admin-tabs">{[["allowlist", Users, "Allowlist"], ["audit", Scroll, "Audit"], ["health", Pulse, "DNS health"]].map(([id, Icon, label]) => <button className={section === id ? "active" : ""} onClick={() => setSection(id)} key={id}><Icon size={20} />{label}</button>)}</div>{section === "allowlist" && <Allowlist />}{section === "audit" && <Audit />}{section === "health" && <Health />}</main>;
}

function Allowlist() {
  return <section className="card admin-card"><div className="card-header"><div><h2>Authorized wallets</h2><p>Internal administrative permissions. The domain owner remains sovereign.</p></div><button className="button button--primary"><Plus size={17} /> Add wallet</button></div><div className="admin-table table-head"><span>Wallet</span><span>Role</span><span>Added on</span><span>Status</span><span /></div>{[["one1adm...42bc", "DNS operator", "Aug 20, 2026"], ["one1aud...98fa", "Auditor", "Jul 03, 2026"], ["one1ops...17de", "Administrator", "May 12, 2026"]].map(([wallet, role, date]) => <div className="admin-table admin-row" key={wallet}><span><span className="avatar-small">{wallet.slice(4, 6).toUpperCase()}</span><code>{wallet}</code></span><span>{role}</span><span>{date}</span><span className="status-badge status-badge--success status-badge--compact"><CheckCircle size={14} /> Active</span><button className="icon-button"><DotsThreeVertical size={18} /></button></div>)}</section>;
}

function Audit() {
  return <section className="card admin-card"><div className="card-header"><div><h2>Operations audit</h2><p>Administrative and publication events with verifiable context.</p></div><button className="button button--secondary">Export CSV</button></div><div className="audit-list">{[["DNS publication completed", "cafe.country", "dns-publisher automation", "09:46"], ["Transaction confirmed", "cafe.country", "one1qz...4f5a", "09:42"], ["Publication attempt failed", "studio.country", "dns-publisher automation", "08:18"], ["Wallet added to allowlist", "Administration", "one1adm...42bc", "Aug 20"]].map(([action, target, actor, time], index) => <div key={action}><span className={`audit-mark ${index === 2 ? "audit-mark--danger" : ""}`} /><div><strong>{action}</strong><p>{target} · {actor}</p></div><time>{time}</time><button className="button button--ghost">Details</button></div>)}</div></section>;
}

function Health() {
  return <div className="health-grid"><section className="card health-hero"><div className="health-score"><CloudCheck size={28} /><strong>Operational</strong></div><p>All authoritative servers are responding within expectations.</p><div className="uptime"><span /><small>99.98% over the last 30 days</small></div></section>{[["Publication queue", "2", "1 waiting for confirmation · 1 propagating", "info"], ["Average time", "18 s", "Confirmation to publication", "neutral"], ["Failures in the last 24h", "1", "studio.country retrying", "danger"]].map(([label, value, note, tone]) => <section className={`card health-metric health-metric--${tone}`} key={label}><span>{label}</span><strong>{value}</strong><p>{note}</p></section>)}<section className="card health-status-list"><h2>Authoritative servers</h2>{["ns1.domains.country", "ns2.domains.country", "ns3.domains.country"].map((server) => <div key={server}><span className="online-dot" /><strong>{server}</strong><small>Operational · 38 ms</small></div>)}</section></div>;
}

function Transfers() { return <main className="content-page"><div className="page-heading"><div><p className="eyebrow">MOVEMENTS</p><h1>Transfers</h1><p>Track incoming and outgoing transfers.</p></div></div><section className="card empty-state"><ArrowsLeftRight size={42} /><h2>No transfers in progress</h2><p>When a domain is sent to your wallet, it will appear here for tracking.</p><button className="button button--secondary">Learn about transfers</button></section></main>; }
function Activity() { return <main className="content-page"><div className="page-heading"><div><p className="eyebrow">ACCOUNT</p><h1>Activity</h1><p>Signatures, on-chain confirmations, and DNS publications.</p></div></div><History /></main>; }

function UiKit() {
  const swatches = [["brand-600", "#2555CC"], ["ink-950", "#10141C"], ["surface-0", "#FFFFFF"], ["success-600", "#198754"], ["warning-600", "#A96200"], ["danger-600", "#C23838"]];
  return <main className="content-page"><div className="page-heading"><div><p className="eyebrow">FOUNDATIONS</p><h1>Visual system</h1><p>Reusable tokens and components for Next.js and TypeScript.</p></div></div><section className="kit-section"><h2>Primary direction</h2><p>Editorial minimalism, clear surfaces, and controlled density. Instrument Serif for domain names and brand headings; Inter for operations and data. Blue indicates action or verification, never speculation.</p><div className="swatch-grid">{swatches.map(([name, color]) => <div className="swatch" key={name}><span style={{ background: color }} /><strong>{name}</strong><code>{color}</code></div>)}</div></section><section className="kit-section"><h2>Scales</h2><div className="token-grid"><div><span>Spacing</span><strong>4 · 8 · 12 · 16 · 24 · 32 · 48 · 64</strong></div><div><span>Radii</span><strong>6 · 10 · 14 · 20 · pill</strong></div><div><span>Shadows</span><strong>focus · raised · overlay</strong></div><div><span>Typography</span><strong>12 · 14 · 16 · 20 · 32 · 56 · 88</strong></div></div></section><section className="kit-section"><h2>Components and states</h2><div className="component-showcase"><div className="showcase-row"><button className="button button--primary">Primary</button><button className="button button--secondary">Secondary</button><button className="button button--danger">Irreversible</button><button className="button button--primary" disabled>Disabled</button></div><div className="showcase-row"><StatusBadge status="confirmed" /><StatusBadge status="chainPending" /><StatusBadge status="dnsPending" /><StatusBadge status="published" /><StatusBadge status="failed" /></div><div className="showcase-row"><input className="demo-input" placeholder="Default field" /><input className="demo-input demo-input--error" value="Invalid value" readOnly /><span className="skeleton skeleton--wide" /></div></div></section><section className="kit-section"><h2>Implementation rules</h2><div className="rules-grid"><div><strong>Accessibility</strong><p>Minimum AA contrast, visible 3 px focus, every status paired with text and an icon, and 44 px touch targets.</p></div><div><strong>Irreversible actions</strong><p>Reinforced confirmation, full address visible, and an acknowledgment checkbox before wallet signing.</p></div><div><strong>Asynchronous states</strong><p>Keep Harmony confirmation separate from DNS publication. Never use “completed” for both at the same time.</p></div><div><strong>Responsiveness</strong><p>The sidebar becomes a drawer; dense tables become cards; primary actions stay close to their context.</p></div></div></section></main>;
}

function Toast({ message, onClose }) { if (!message) return null; return <div className="toast" role="status"><CheckCircle size={21} weight="fill" /><span>{message}</span><button className="icon-button" onClick={onClose}><X size={17} /></button></div>; }

export function App() {
  const [view, setView] = useState("home"); const [query, setQuery] = useState("cafe"); const [connected, setConnected] = useState(true); const [years, setYears] = useState(1); const [tab, setTab] = useState("Overview"); const [transferOpen, setTransferOpen] = useState(false); const [records, setRecords] = useState(initialRecords); const [toast, setToast] = useState("");
  const shellViews = useMemo(() => ["dashboard", "detail", "transfers", "activity", "admin", "kit"], []);
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(""), 4200); };
  const content = view === "dashboard" ? <Dashboard onDomain={() => { setView("detail"); setTab("Overview"); }} onSearch={() => setView("home")} /> : view === "detail" ? <DomainDetail tab={tab} setTab={setTab} onBack={() => setView("dashboard")} onTransfer={() => setTransferOpen(true)} records={records} setRecords={setRecords} onToast={notify} /> : view === "transfers" ? <Transfers /> : view === "activity" ? <Activity /> : view === "admin" ? <AdminPanel /> : <UiKit />;
  return <>{view === "home" && <Home query={query} setQuery={setQuery} onSearch={() => setView("result")} connected={connected} onWallet={() => setConnected(!connected)} />}{view === "result" && <SearchResult query={query} onBack={() => setView("home")} onRegister={(value) => { setYears(value); setView("register"); }} />}{view === "register" && <RegistrationFlow query={query} years={years} onCancel={() => setView("result")} onDone={() => { setView("detail"); setTab("Overview"); notify(`${query}.country was registered successfully.`); }} />}{shellViews.includes(view) && <AppShell view={view} setView={setView} connected={connected} onWallet={() => setConnected(!connected)}>{content}</AppShell>}{transferOpen && <TransferModal onClose={() => setTransferOpen(false)} onComplete={() => { setTransferOpen(false); setTab("History"); notify("Transfer submitted and waiting for confirmations."); }} />}<Toast message={toast} onClose={() => setToast("")} /></>;
}
