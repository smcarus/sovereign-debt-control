import React, { useState } from 'react';
import { SovereignEntity, AgentActionLog, RestructuringPackage } from '../types/sovereign';
import { runAgentOrchestration } from '../engine/agentOrchestrator';
import {
  Bot,
  Play,
  RotateCcw,
  Cpu,
  Layers,
  FileText,
  ShieldCheck,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

interface AgentConsoleTabProps {
  sovereign: SovereignEntity;
}

export const AgentConsoleTab: React.FC<AgentConsoleTabProps> = ({ sovereign }) => {
  const [prompt, setPrompt] = useState<string>(
    `Evaluate debt trajectory under stagflation shock (+250 bps rate hike, -2.0% GDP slump). Audit cross-currency swap CSA collateral margin calls and generate restructuring terms under single-limb CAC covenants.`
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [logs, setLogs] = useState<AgentActionLog[]>([]);
  const [finalReport, setFinalReport] = useState<string | null>(null);
  const [restructuringPkg, setRestructuringPkg] = useState<RestructuringPackage | null>(null);
  const [tokensUsed, setTokensUsed] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const presetDirectives = [
    {
      title: 'Stagflation & Swap Margin Audit',
      text: `Evaluate debt trajectory under stagflation shock (+250 bps rate hike, -2.0% GDP slump). Audit cross-currency swap CSA collateral margin calls and generate restructuring terms under single-limb CAC covenants.`,
    },
    {
      title: 'Deficit Slippage & Holdout Defense',
      text: `Analyze debt law-of-motion under -2.0% primary deficit slippage. Check bondholder voting thresholds and Pari Passu risks for upcoming maturities.`,
    },
    {
      title: 'Aggressive Debt Reprofiling & Climate Swap',
      text: `Formulate a 25% nominal haircut and 5-year maturity extension package. Propose novation of out-of-the-money swap liabilities with multilateral guarantees.`,
    },
  ];

  const handleExecute = async () => {
    if (!prompt.trim() || isRunning) return;
    setIsRunning(true);
    setLogs([]);
    setFinalReport(null);
    setRestructuringPkg(null);

    try {
      const result = await runAgentOrchestration(prompt, sovereign, (newLog) => {
        setLogs(prev => [...prev, newLog]);
      });

      setFinalReport(result.finalReport);
      setRestructuringPkg(result.restructuringPackage || null);
      setTokensUsed(result.tokensConsumed);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    if (!finalReport) return;
    navigator.clipboard.writeText(finalReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Multi-Agent Architecture State Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Local Multi-Agent Sovereign Control Tower (ReAct Framework)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Operating in local air-gapped container via internal system socket · Llama-3.1-70B / Mistral-Large Reasoning Core
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">Target Entity:</span>
            <span className="font-semibold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
              {sovereign.country_iso_alpha3}
            </span>
            <span className="text-slate-400 ml-2">Inference Mode:</span>
            <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800">
              Air-Gapped Local
            </span>
          </div>
        </div>

        {/* 4 Agent Nodes Pipeline Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-indigo-300">Fiscal Supervisor</span>
              <span className="text-[10px] text-emerald-400 font-mono">Orchestrator</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Validates mandates, parses objectives, delegates tasks via ReAct cycle.
            </p>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-blue-300">Quantitative Analytics</span>
              <span className="text-[10px] text-emerald-400 font-mono">Math Engine</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Executes read-only SQL, DSA law-of-motion, and swap MtM valuation models.
            </p>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-amber-300">Legal & Compliance</span>
              <span className="text-[10px] text-emerald-400 font-mono">Vector RAG</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Scans ISDA master agreements, single-limb CAC thresholds & cross-default terms.
            </p>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-rose-300">Restructuring Strategy</span>
              <span className="text-[10px] text-emerald-400 font-mono">Synthesis</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Optimizes haircuts, maturity extensions, and sovereign debt-relief packages.
            </p>
          </div>
        </div>
      </div>

      {/* Main Console & Trace Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Directives Input & Quick Prompts */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Policy Directive Mandate
              </label>
              <span className="text-[11px] text-slate-500 font-mono">Interactive Shell</span>
            </div>

            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Input fiscal analysis mandate or restructuring prompt directive..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono leading-relaxed"
            />

            {/* Preset directives */}
            <div>
              <div className="text-[11px] text-slate-400 mb-2">Preset Policy Mandates:</div>
              <div className="space-y-1.5">
                {presetDirectives.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPrompt(preset.text)}
                    className="w-full text-left p-2 rounded bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 transition-colors text-xs text-slate-300 flex items-center justify-between cursor-pointer"
                  >
                    <span>{preset.title}</span>
                    <span className="text-[10px] text-indigo-400 font-mono">Apply</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleExecute}
                disabled={isRunning}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isRunning
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <Zap className="w-4 h-4 animate-spin text-indigo-300" />
                    <span>Executing ReAct Reasoning Loop...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Run Multi-Agent Analysis</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setLogs([]);
                  setFinalReport(null);
                  setRestructuringPkg(null);
                }}
                disabled={isRunning}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                title="Clear Session"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Restructuring Package Output Card (if generated) */}
          {restructuringPkg && (
            <div className="bg-slate-900 border border-indigo-500/40 rounded-xl p-5 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Restructuring Terms Formulated
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  CAC Approved
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Target Debt Relief</span>
                  <span className="text-sm font-bold text-emerald-400">-{restructuringPkg.target_debt_relief_pct}% GDP</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Nominal Face Haircut</span>
                  <span className="text-sm font-bold text-rose-400">{restructuringPkg.nominal_haircut_pct}%</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Maturity Extension</span>
                  <span className="text-sm font-bold text-indigo-300">+{restructuringPkg.maturity_extension_years} Years</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Annual Budget Savings</span>
                  <span className="text-sm font-bold text-amber-300">${restructuringPkg.annual_cash_flow_savings_usd_m}M / yr</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                {restructuringPkg.mechanics_summary}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Execution Thought Trace & Synthesized Dossier */}
        <div className="lg:col-span-7 space-y-4">
          {/* ReAct Execution Log Trace */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  ReAct Multi-Agent Execution Trace
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {logs.length > 0 ? `${logs.length} Steps Executed` : 'Standing By'}
              </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {logs.length === 0 && !isRunning && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Awaiting analysis directive. Click "Run Multi-Agent Analysis" to launch the deterministic reasoning loop.
                </div>
              )}

              {logs.map((log, index) => {
                const badgeColor =
                  log.agent_name === 'Fiscal Supervisor'
                    ? 'text-indigo-400 bg-indigo-950/80 border-indigo-800'
                    : log.agent_name === 'Quantitative Analytics'
                    ? 'text-blue-400 bg-blue-950/80 border-blue-800'
                    : log.agent_name === 'Legal & Compliance'
                    ? 'text-amber-400 bg-amber-950/80 border-amber-800'
                    : 'text-rose-400 bg-rose-950/80 border-rose-800';

                return (
                  <div key={index} className="p-3 bg-slate-950/70 border border-slate-800/90 rounded-lg space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                        {log.agent_name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {log.action_type} {log.tool_name ? `· ${log.tool_name}` : ''}
                      </span>
                    </div>

                    <p className="text-slate-300 text-[11px] leading-relaxed pt-1 font-sans">
                      {log.thought_process}
                    </p>

                    {log.tool_input && (
                      <div className="text-[10px] bg-slate-900 p-2 rounded text-slate-400 border border-slate-800/80 mt-1">
                        <span className="text-indigo-300 font-semibold">Tool Input: </span>
                        {JSON.stringify(log.tool_input)}
                      </div>
                    )}
                  </div>
                );
              })}

              {isRunning && (
                <div className="p-3 bg-slate-950/50 border border-indigo-500/30 rounded-lg flex items-center gap-3 text-xs text-indigo-300 font-mono">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  <span>Agent node querying TimescaleDB hypertable and executing QuantLib discount routines...</span>
                </div>
              )}
            </div>
          </div>

          {/* Final Synthesized Report */}
          {finalReport && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">
                    Synthesized Sovereign Policy & Debt Strategy Memorandum
                  </h3>
                </div>

                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>

              <div className="prose prose-invert prose-xs max-w-none text-slate-300 text-xs leading-relaxed space-y-3 font-sans">
                <div className="whitespace-pre-line p-3 bg-slate-950/70 rounded-lg border border-slate-800 text-[12px] leading-relaxed">
                  {finalReport}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
