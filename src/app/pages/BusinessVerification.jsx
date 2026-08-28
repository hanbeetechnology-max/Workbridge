import { useState } from "react";
import {
  Zap, Building2, FileText, CreditCard, Upload, Shield,
  CheckCircle2, ArrowRight, ChevronRight, X, Lock, Eye, EyeOff,
} from "lucide-react";

// ── Step definitions ──────────────────────────────────────────────────────
const STEPS = [
  {
    id: 1,
    title: "Company Details",
    desc: "Basic business information",
    Icon: Building2,
  },
  {
    id: 2,
    title: "Legal Documents",
    desc: "GST, PAN & Incorporation",
    Icon: FileText,
  },
  {
    id: 3,
    title: "Identity & Banking",
    desc: "Director ID & bank details",
    Icon: CreditCard,
  },
];

// ── Shared input / label styles ───────────────────────────────────────────
const LABEL = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";
const INPUT =
  "w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]/20 focus:border-[#FF6B2C] transition-all";
const SELECT =
  "w-full px-4 py-3 bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]/20 focus:border-[#FF6B2C] transition-all appearance-none cursor-pointer";

// ════════════════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════════════════

// Per-business-type document requirements — a sole proprietor was never
// incorporated with the MCA and has no "Company PAN"; most partnership
// firms are legally unregistered (a Partnership Deed, not a Registrar of
// Firms certificate); GST is turnover-threshold-based for every type, not
// something every business has. Driving Step 2/Step 3's field labels and
// which upload blocks even appear off ONE lookup here keeps the "what does
// this business type actually have" logic in one place instead of
// scattered conditionals.
const BUSINESS_TYPE_DOCS = {
  "Private Limited (Pvt. Ltd.)": {
    panLabel: "Company PAN",
    incorporation: { label: "Certificate of Incorporation", hint: "MCA-issued document · PDF preferred · Max 10 MB", required: true },
    ownerRole: "Director",
  },
  // Same document profile as Pvt Ltd — both are MCA-incorporated
  // companies with a real Certificate of Incorporation and Director-based
  // ownership. What actually differs (min. 3 directors vs. 2, min. 7
  // shareholders vs. 2, stock-exchange listing eligibility) doesn't change
  // what documents this form needs to collect.
  "Public Limited (Ltd.)": {
    panLabel: "Company PAN",
    incorporation: { label: "Certificate of Incorporation", hint: "MCA-issued document · PDF preferred · Max 10 MB", required: true },
    ownerRole: "Director",
  },
  "One Person Company (OPC)": {
    panLabel: "Company PAN",
    incorporation: { label: "Certificate of Incorporation", hint: "MCA-issued document · PDF preferred · Max 10 MB", required: true },
    ownerRole: "Director",
  },
  "Limited Liability Partnership (LLP)": {
    panLabel: "LLP PAN",
    incorporation: { label: "LLP Incorporation Certificate", hint: "MCA-issued document · PDF preferred · Max 10 MB", required: true },
    ownerRole: "Designated Partner",
  },
  "Partnership Firm": {
    panLabel: "Firm PAN",
    // Most partnerships in India are legally unregistered — a Partnership
    // Deed is the real, near-universal document; a Registrar of Firms
    // certificate only exists for the minority that registered.
    incorporation: { label: "Partnership Deed", hint: "Registration Certificate instead, if your firm is registered · PDF preferred · Max 10 MB", required: false },
    ownerRole: "Partner",
  },
  "Sole Proprietorship": {
    panLabel: "Your PAN",
    // Not incorporated at all — nothing MCA-issued to ask for. Udyam/MSME
    // registration or a Shop & Establishment licence is the real
    // alternative proof most solo businesses actually hold, and it's
    // optional, not a blocker, since plenty operate with neither.
    incorporation: { label: "Udyam Registration or Shop & Establishment Certificate", hint: "Optional — upload if you have either · PDF preferred · Max 10 MB", required: false },
    ownerRole: "Proprietor",
  },
};
const DEFAULT_TYPE_DOCS = BUSINESS_TYPE_DOCS["Private Limited (Pvt. Ltd.)"];

export default function BusinessVerification({ onComplete, onExit }) {
  const [activeStep, setActiveStep]         = useState(1);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [businessType, setBusinessType]     = useState("");
  const typeDocs = BUSINESS_TYPE_DOCS[businessType] ?? DEFAULT_TYPE_DOCS;

  // Step 1 fields — previously uncontrolled inputs with nothing tracking
  // their value, which is exactly why "Continue" could never have checked
  // whether anything was filled in.
  const [companyName, setCompanyName]           = useState("");
  const [yearEstablished, setYearEstablished]   = useState("");
  const [gstNumber, setGstNumber]               = useState("");
  const [pan, setPan]                           = useState("");
  const [website, setWebsite]                   = useState("");
  const [address, setAddress]                   = useState("");

  // Step 2 file state
  const [gstFile, setGstFile]       = useState(null);
  const [incorpFile, setIncorpFile] = useState(null);
  const [drag1, setDrag1]           = useState(false);
  const [drag2, setDrag2]           = useState(false);

  // Step 3 fields
  const [showAccNum, setShowAccNum] = useState(false);
  const [idType, setIdType]                 = useState("Aadhaar Card");
  const [idNumber, setIdNumber]             = useState("");
  const [bankName, setBankName]             = useState("");
  const [accountNumber, setAccountNumber]   = useState("");
  const [ifscCode, setIfscCode]             = useState("");

  const goNext = () => {
    setCompletedSteps((prev) => new Set([...prev, activeStep]));
    if (activeStep < 3) setActiveStep((s) => s + 1);
    else onComplete?.();
  };

  const goBack = () => {
    if (activeStep > 1) setActiveStep((s) => s - 1);
  };

  const progressPct = ((completedSteps.size) / STEPS.length) * 100;

  return (
    <div
      className="min-h-screen flex bg-white dark:bg-slate-950"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* ══════════════════════════════════════════
          LEFT — Progress Sidebar — hidden below lg; at 30% width this
          becomes unreadably narrow on a phone/tablet, and the step tracker
          it shows is reinforced by the top bar's progress dots on mobile.
          ══════════════════════════════════════════ */}
      <aside className="hidden w-[30%] min-h-screen flex-col overflow-hidden bg-[#0A1128] px-10 py-12 relative flex-shrink-0 lg:flex">

        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-16">
          <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B2C] to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-[#FF6B2C]/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span
            className="text-white font-extrabold text-lg tracking-tight font-display"
          >
            WorkBridge
          </span>
        </div>

        {/* Heading */}
        <div className="mb-14">
          <p className="text-[10px] font-bold text-[#FF6B2C] uppercase tracking-[0.22em] mb-2">
            Business Verification
          </p>
          <h2
            className="text-xl font-extrabold text-white mb-2 leading-snug font-display"
          >
            Get your<br />Verified Badge.
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Complete all three steps and you're ready to post jobs, with payments held securely until you approve the work.
          </p>
        </div>

        {/* Step tracker — connector lines rendered BETWEEN items, no math needed */}
        <div className="flex-1">
          {STEPS.map((step, index) => {
            const done   = completedSteps.has(step.id);
            const active = step.id === activeStep;
            const Icon   = step.Icon;

            return (
              <div key={step.id}>
                {/* Step row */}
                <div
                  className="flex items-start gap-4"
                  onClick={() => done && setActiveStep(step.id)}
                  style={{ cursor: done ? "pointer" : "default" }}
                >
                  {/* Circle */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      done
                        ? "bg-emerald-500 shadow-lg shadow-emerald-500/30"
                        : active
                        ? "bg-[#FF6B2C] shadow-xl shadow-[#FF6B2C]/40 ring-4 ring-[#FF6B2C]/20"
                        : "bg-white/8 border border-white/15"
                    }`}
                  >
                    {done   && <CheckCircle2 className="w-4 h-4 text-white" />}
                    {active && !done && <Icon className="w-4 h-4 text-white" />}
                    {!done && !active && <span className="text-xs font-bold text-slate-500">{step.id}</span>}
                  </div>

                  {/* Label */}
                  <div className="pt-1.5 flex-1">
                    <div className={`text-sm font-bold transition-colors duration-300 ${
                      active ? "text-white" : done ? "text-emerald-400" : "text-slate-500"
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5">{step.desc}</div>
                  </div>

                  {active && <ChevronRight className="w-4 h-4 text-[#FF6B2C] mt-2 flex-shrink-0" />}
                </div>

                {/* Connector line between this step and the next */}
                {index < STEPS.length - 1 && (
                  <div
                    className="ml-[17px] w-0.5 rounded-full transition-colors duration-500"
                    style={{
                      height: "36px",
                      marginTop: "4px",
                      marginBottom: "4px",
                      backgroundColor: done ? "#FF6B2C" : "rgba(255,255,255,0.1)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom security note */}
        <div className="mt-12 flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/8">
          <Lock className="w-4 h-4 text-[#FF6B2C] flex-shrink-0 mt-0.5" />
          <p className="text-slate-400 text-xs leading-relaxed">
            All submitted data is encrypted and reviewed only by our compliance team. Never shared with Workers.
          </p>
        </div>

        {/* Decorative blobs */}
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#FF6B2C]/5 rounded-full pointer-events-none" />
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-[#1B3FAB]/8 rounded-full pointer-events-none" />
      </aside>

      {/* ══════════════════════════════════════════
          RIGHT — Form Area
          ══════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col min-h-screen bg-[#F8FAFC] dark:bg-slate-950">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-5 bg-white border-b border-slate-100 shadow-sm shadow-slate-100/50 flex-shrink-0 sm:px-10 dark:bg-slate-900 dark:border-slate-800 dark:shadow-none">
          {/* Step breadcrumb — hidden below sm; the progress dots next to it
              already carry step position on narrow screens */}
          <div className="hidden items-center gap-2 text-xs text-slate-400 dark:text-slate-500 sm:flex">
            <span>Business Verification</span>
            <ChevronRight className="w-3 h-3" />
            <span className="font-semibold text-slate-600 dark:text-slate-300">{STEPS[activeStep - 1].title}</span>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  completedSteps.has(s.id)
                    ? "w-6 bg-emerald-400"
                    : s.id === activeStep
                    ? "w-6 bg-[#FF6B2C]"
                    : "w-3 bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Exit */}
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors dark:text-slate-500 dark:hover:text-slate-300"
          >
            <X className="w-4 h-4" /> Exit
          </button>
        </div>

        {/* Orange progress line */}
        <div className="h-0.5 bg-slate-100 dark:bg-slate-800 flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-[#FF6B2C] to-rose-400 transition-all duration-700"
            style={{ width: `${(activeStep / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Scrollable form content */}
        <div className="wb-scroll-clean flex-1 overflow-auto px-5 py-6 sm:px-10 sm:py-10">
          <div className="max-w-2xl mx-auto">

            {/* ── STEP 1: Company Details ── */}
            {activeStep === 1 && (
              <Step1
                onNext={goNext} INPUT={INPUT} LABEL={LABEL} SELECT={SELECT}
                businessType={businessType} setBusinessType={setBusinessType}
                companyName={companyName} setCompanyName={setCompanyName}
                yearEstablished={yearEstablished} setYearEstablished={setYearEstablished}
                gstNumber={gstNumber} setGstNumber={setGstNumber}
                pan={pan} setPan={setPan}
                website={website} setWebsite={setWebsite}
                address={address} setAddress={setAddress}
              />
            )}

            {/* ── STEP 2: Legal Documents ── */}
            {activeStep === 2 && (
              <Step2
                typeDocs={typeDocs}
                gstFile={gstFile}     setGstFile={setGstFile}
                incorpFile={incorpFile} setIncorpFile={setIncorpFile}
                drag1={drag1} setDrag1={setDrag1}
                drag2={drag2} setDrag2={setDrag2}
                onBack={goBack} onNext={goNext}
              />
            )}

            {/* ── STEP 3: Identity & Banking ── */}
            {activeStep === 3 && (
              <Step3
                typeDocs={typeDocs}
                showAccNum={showAccNum} setShowAccNum={setShowAccNum}
                onBack={goBack} onComplete={goNext}
                INPUT={INPUT} LABEL={LABEL} SELECT={SELECT}
                idType={idType} setIdType={setIdType}
                idNumber={idNumber} setIdNumber={setIdNumber}
                bankName={bankName} setBankName={setBankName}
                accountNumber={accountNumber} setAccountNumber={setAccountNumber}
                ifscCode={ifscCode} setIfscCode={setIfscCode}
              />
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 1 — Company Details
// ════════════════════════════════════════════════════════════════════════════

function Step1({
  onNext, INPUT, LABEL, SELECT,
  businessType, setBusinessType,
  companyName, setCompanyName,
  yearEstablished, setYearEstablished,
  gstNumber, setGstNumber,
  pan, setPan,
  website, setWebsite,
  address, setAddress,
}) {
  const panLabel = BUSINESS_TYPE_DOCS[businessType]?.panLabel ?? "PAN";
  const [attempted, setAttempted] = useState(false);

  // GST and the website are the only two genuinely optional fields here —
  // GST because it's turnover-threshold-based (see BUSINESS_TYPE_DOCS),
  // website because plenty of legitimate small businesses don't have one.
  const missing = [];
  if (!companyName.trim()) missing.push("Registered Company Name");
  if (!businessType) missing.push("Business Type");
  if (!yearEstablished.trim()) missing.push("Year Established");
  if (!pan.trim()) missing.push(panLabel);
  if (!address.trim()) missing.push("Registered Business Address");

  const handleNext = () => {
    setAttempted(true);
    if (missing.length === 0) onNext();
  };

  const fieldClass = (isEmpty) =>
    attempted && isEmpty ? `${INPUT} border-red-300 focus:ring-red-100 focus:border-red-400` : INPUT;

  return (
    <div>
      <StepHeader
        step={1}
        title="Tell us about your company."
        sub="We'll use this to verify your business and fill out your company profile."
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5 sm:p-8 dark:bg-slate-900 dark:border-slate-800 dark:shadow-none">

        <div>
          <label className={LABEL}>Registered Company Name</label>
          <input
            type="text" placeholder="RetailX Pvt. Ltd." className={fieldClass(!companyName.trim())}
            value={companyName} onChange={(e) => setCompanyName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Business Type</label>
            <select
              className={fieldClass(!businessType)}
              value={businessType} onChange={(e) => setBusinessType(e.target.value)}
            >
              <option value="">Select type</option>
              <option>Private Limited (Pvt. Ltd.)</option>
              <option>Public Limited (Ltd.)</option>
              <option>Limited Liability Partnership (LLP)</option>
              <option>Sole Proprietorship</option>
              <option>Partnership Firm</option>
              <option>One Person Company (OPC)</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Year Established</label>
            <input
              type="text" placeholder="e.g. 2019" className={fieldClass(!yearEstablished.trim())}
              value={yearEstablished} onChange={(e) => setYearEstablished(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL}>GST Number (if registered)</label>
            <input
              type="text" placeholder="22AAAAA0000A1Z5" className={INPUT}
              value={gstNumber} onChange={(e) => setGstNumber(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>{panLabel}</label>
            <input
              type="text" placeholder="AAAAA0000A" className={fieldClass(!pan.trim())}
              value={pan} onChange={(e) => setPan(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>Company Website (optional)</label>
          <input
            type="url" placeholder="https://yourcompany.in" className={INPUT}
            value={website} onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        <div>
          <label className={LABEL}>Registered Business Address</label>
          <textarea
            rows={2}
            placeholder="Floor 4, Cyber Hub, Sector 24, Gurugram, Haryana 122002"
            className={`${fieldClass(!address.trim())} resize-none`}
            value={address} onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {attempted && missing.length > 0 && (
          <p className="text-xs font-semibold text-red-500">
            Please fill in: {missing.join(", ")}.
          </p>
        )}

        <ActionRow onBack={null} onNext={handleNext} nextLabel="Continue to Documents" />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 2 — Legal Documents
// ════════════════════════════════════════════════════════════════════════════

function Step2({ typeDocs, gstFile, setGstFile, incorpFile, setIncorpFile, drag1, setDrag1, drag2, setDrag2, onBack, onNext }) {
  const { label: incorpLabel, hint: incorpHint, required: incorpRequired } = typeDocs.incorporation;
  const [attempted, setAttempted] = useState(false);
  const missingIncorp = incorpRequired && !incorpFile;

  const handleNext = () => {
    setAttempted(true);
    if (!missingIncorp) onNext();
  };

  return (
    <div>
      <StepHeader
        step={2}
        title="Verify your business entity."
        sub="Upload your official documents to get the Business Verified badge and start hiring."
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-7 sm:p-8 dark:bg-slate-900 dark:border-slate-800 dark:shadow-none">

        {/* Upload Block 1: GST — always optional, every business type below
            the turnover threshold legitimately has none. Kept separate
            from PAN (previously bundled as one upload) so "optional"
            actually reads as optional instead of implying both are
            required together. */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-[#0A1128] dark:text-white text-sm">
                GST Certificate <span className="font-normal text-slate-400 dark:text-slate-500">(optional — only if registered)</span>
              </h3>
              <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5">PDF or image · Max 10 MB</p>
            </div>
            {gstFile && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
              </span>
            )}
          </div>

          <DropZone
            file={gstFile}
            setFile={setGstFile}
            dragging={drag1}
            setDragging={setDrag1}
            icon={<Upload className="w-6 h-6 text-slate-400" />}
            label="Drag and drop your GST Certificate"
            large
          />
        </div>

        {/* Upload Block 2: Incorporation proof — which document even
            applies, and whether it's optional, depends entirely on
            business type (see BUSINESS_TYPE_DOCS above): a Pvt Ltd/OPC/LLP
            was actually incorporated with the MCA, a Partnership has a
            Deed instead (most are legally unregistered), and a Sole
            Proprietorship has nothing MCA-issued at all — Udyam/Shop &
            Establishment is the closest optional alternative. */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-[#0A1128] dark:text-white text-sm">
                {incorpLabel}
                {!incorpRequired && <span className="font-normal text-slate-400 dark:text-slate-500"> (optional)</span>}
              </h3>
              <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5">{incorpHint}</p>
            </div>
            {incorpFile && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
              </span>
            )}
          </div>

          <DropZone
            file={incorpFile}
            setFile={setIncorpFile}
            dragging={drag2}
            setDragging={setDrag2}
            icon={<FileText className="w-5 h-5 text-slate-400" />}
            label={`Drop your ${incorpLabel} here`}
            large={false}
          />
          {attempted && missingIncorp && (
            <p className="mt-2 text-xs font-semibold text-red-500">
              Please upload your {incorpLabel.toLowerCase()} to continue.
            </p>
          )}
        </div>

        {/* Security note */}
        <SecurityNote />

        <ActionRow onBack={onBack} onNext={handleNext} nextLabel="Continue to Identity" />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// STEP 3 — Identity & Banking
// ════════════════════════════════════════════════════════════════════════════

function Step3({
  typeDocs, showAccNum, setShowAccNum, onBack, onComplete, INPUT, LABEL, SELECT,
  idType, setIdType, idNumber, setIdNumber,
  bankName, setBankName, accountNumber, setAccountNumber, ifscCode, setIfscCode,
}) {
  const [idFile, setIdFile] = useState(null);
  const [attempted, setAttempted] = useState(false);

  const missing = [];
  if (!idNumber.trim()) missing.push("ID Number");
  if (!idFile) missing.push(`${typeDocs.ownerRole} ID document`);
  if (!bankName.trim()) missing.push("Bank Name");
  if (!accountNumber.trim()) missing.push("Account Number");
  if (!ifscCode.trim()) missing.push("IFSC Code");

  const handleComplete = () => {
    setAttempted(true);
    if (missing.length === 0) onComplete();
  };

  const fieldClass = (isEmpty) =>
    attempted && isEmpty ? `${INPUT} border-red-300 focus:ring-red-100 focus:border-red-400` : INPUT;

  return (
    <div>
      <StepHeader
        step={3}
        title="Verify your identity & banking."
        sub="One final step — we need your banking details on file to stay compliant with RBI guidelines."
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-7 sm:p-8 dark:bg-slate-900 dark:border-slate-800 dark:shadow-none">

        {/* Owner ID — role label (Director / Designated Partner / Partner /
            Proprietor) follows the selected business type; the underlying
            requirement is the same natural person's ID either way. */}
        <div>
          <h3 className="font-bold text-[#0A1128] dark:text-white text-sm mb-4 flex items-center gap-2">
            <div className="w-5 h-5 bg-orange-50 border border-orange-100 rounded-full flex items-center justify-center flex-shrink-0 dark:bg-orange-500/10 dark:border-orange-900/40">
              <span className="text-[10px] font-bold text-[#FF6B2C]">1</span>
            </div>
            {typeDocs.ownerRole} Identity
          </h3>

          <div className="grid grid-cols-1 gap-4 mb-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>ID Type</label>
              <select className={SELECT} value={idType} onChange={(e) => setIdType(e.target.value)}>
                <option>Aadhaar Card</option>
                <option>Passport</option>
                <option>Driving Licence</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>ID Number</label>
              <input
                type="text" placeholder="XXXX XXXX XXXX" className={fieldClass(!idNumber.trim())}
                value={idNumber} onChange={(e) => setIdNumber(e.target.value)}
              />
            </div>
          </div>

          <DropZone
            file={idFile}
            setFile={setIdFile}
            dragging={false}
            setDragging={() => {}}
            icon={<Upload className="w-5 h-5 text-slate-400" />}
            label="Upload front & back of your ID document"
            large={false}
          />
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 dark:bg-slate-800" />

        {/* Bank Account */}
        <div>
          <h3 className="font-bold text-[#0A1128] dark:text-white text-sm mb-4 flex items-center gap-2">
            <div className="w-5 h-5 bg-orange-50 border border-orange-100 rounded-full flex items-center justify-center flex-shrink-0 dark:bg-orange-500/10 dark:border-orange-900/40">
              <span className="text-[10px] font-bold text-[#FF6B2C]">2</span>
            </div>
            Bank Account for Payouts
          </h3>

          <div className="space-y-4">
            <div>
              <label className={LABEL}>Bank Name</label>
              <input
                type="text" placeholder="HDFC Bank" className={fieldClass(!bankName.trim())}
                value={bankName} onChange={(e) => setBankName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>Account Number</label>
                <div className="relative">
                  {/* type="text" always, never "password" — a bank account
                      number isn't a login credential, but browsers can't
                      tell the difference and will offer to autofill/save it
                      as one the moment type="password" appears on any
                      field. Masked visually instead via -webkit-text-
                      security (Chrome/Edge/Safari; Firefox just shows plain
                      text as a graceful fallback, no functional loss). */}
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    name="business-bank-account-number"
                    placeholder="••••••••••4521"
                    className={fieldClass(!accountNumber.trim())}
                    style={showAccNum ? undefined : { WebkitTextSecurity: "disc", textSecurity: "disc" }}
                    value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccNum((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {showAccNum ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={LABEL}>IFSC Code</label>
                <input
                  type="text" placeholder="HDFC0001234" className={fieldClass(!ifscCode.trim())}
                  value={ifscCode} onChange={(e) => setIfscCode(e.target.value)}
                />
              </div>
            </div>
            {/* No cancelled-cheque/bank-statement upload here on purpose —
                account number + IFSC above already identify the account;
                a scanned cheque image adds friction without adding real
                verification value beyond those two fields. */}
          </div>
        </div>

        {/* Security note */}
        <SecurityNote />

        {/* Completion note */}
        <div className="flex items-start gap-3 p-4 bg-blue-50/60 border border-blue-100 rounded-xl dark:bg-blue-500/10 dark:border-blue-900/40">
          <CheckCircle2 className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
            After submission, our compliance team reviews your documents within <strong>24–48 hours</strong>.
            You'll be notified by email and can start posting jobs immediately.
          </p>
        </div>

        {attempted && missing.length > 0 && (
          <p className="text-xs font-semibold text-red-500">
            Please fill in: {missing.join(", ")}.
          </p>
        )}

        <ActionRow onBack={onBack} onNext={handleComplete} nextLabel="Submit for Verification" isComplete />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Shared sub-components
// ════════════════════════════════════════════════════════════════════════════

function StepHeader({ step, title, sub }) {
  return (
    <div className="mb-8">
      <span className="text-[10px] font-bold text-[#FF6B2C] uppercase tracking-[0.22em]">
        Step {step} of 3
      </span>
      <h1
        className="text-2xl font-extrabold text-[#0A1128] dark:text-white mt-1.5 mb-2 leading-snug font-display"
      >
        {title}
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{sub}</p>
    </div>
  );
}

function DropZone({ file, setFile, dragging, setDragging, icon, label, large }) {
  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
        large ? "p-10" : "p-6"
      } ${
        dragging
          ? "border-[#FF6B2C] bg-orange-50/40 dark:bg-orange-500/10 scale-[1.01]"
          : file
          ? "border-emerald-300 bg-emerald-50/30 dark:border-emerald-700 dark:bg-emerald-500/10"
          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/60"
      }`}
    >
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => setFile(e.target.files[0])}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />

      {file ? (
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center dark:bg-emerald-500/10 dark:border-emerald-900/40">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 truncate max-w-xs">{file.name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); setFile(null); }}
            className="text-xs text-slate-400 hover:text-red-500 underline-offset-2 hover:underline transition-colors dark:text-slate-500 dark:hover:text-red-400"
          >
            Remove file
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className={`${large ? "w-14 h-14" : "w-10 h-10"} bg-slate-100 rounded-2xl flex items-center justify-center dark:bg-slate-800`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              or{" "}
              <span className="text-[#FF6B2C] font-semibold hover:underline cursor-pointer underline-offset-2">
                Browse Files
              </span>
            </p>
            <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">PDF, JPG, PNG · Max 10 MB</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SecurityNote() {
  return (
    <div className="flex items-start gap-3 p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl dark:bg-emerald-500/10 dark:border-emerald-900/40">
      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 dark:bg-emerald-500/10">
        <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">
        Your documents are encrypted and reviewed only by our compliance team. They are never
        shared with Workers or third parties.
      </p>
    </div>
  );
}

function ActionRow({ onBack, onNext, nextLabel, isComplete }) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-800">
      {onBack ? (
        <button
          onClick={onBack}
          className="px-6 py-2.5 text-slate-500 hover:text-slate-700 font-semibold text-sm border border-slate-200 hover:border-slate-300 rounded-xl hover:bg-slate-50 transition-all dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800"
        >
          ← Back
        </button>
      ) : (
        <div />
      )}

      <button
        onClick={onNext}
        className={`flex items-center gap-2 px-7 py-3 text-white rounded-xl font-bold text-sm transition-all shadow-md group ${
          isComplete
            ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
            : "bg-[#FF6B2C] hover:bg-[#e55e1f] shadow-orange-200"
        }`}
      >
        {nextLabel}
        {isComplete ? (
          <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
        ) : (
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        )}
      </button>
    </div>
  );
}
