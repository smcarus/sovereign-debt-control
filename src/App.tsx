import React, { useState } from 'react';
import {
  INITIAL_SOVEREIGNS,
  INITIAL_DEBT_INSTRUMENTS,
  INITIAL_SWAPS,
} from './data/mockDatabase';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { YieldCurvesTab } from './components/YieldCurvesTab';
import { CorrelationMatrixTab } from './components/CorrelationMatrixTab';
import { DSASandboxTab } from './components/DSASandboxTab';
import { RefundingSwapsTab } from './components/RefundingSwapsTab';
import { AgentConsoleTab } from './components/AgentConsoleTab';
import { SQLStudioTab } from './components/SQLStudioTab';
import { LegalCovenantsTab } from './components/LegalCovenantsTab';
import { DockerApiGatewayTab } from './components/DockerApiGatewayTab';
import { ExportModal } from './components/ExportModal';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [sovereigns, setSovereigns] = useState(INITIAL_SOVEREIGNS);
  const [selectedIso, setSelectedIso] = useState<string>('ALP');
  const [baseInflation, setBaseInflation] = useState<number>(4.8);
  const [baseTaxRate, setBaseTaxRate] = useState<number>(22.5);
  const [activeTab, setActiveTab] = useState<string>('yield-curves');
  const [debtInstruments, setDebtInstruments] = useState(INITIAL_DEBT_INSTRUMENTS);
  const [swapPositions, setSwapPositions] = useState(INITIAL_SWAPS);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [showSyncBanner, setShowSyncBanner] = useState<boolean>(false);

  const currentSovereign = sovereigns.find(s => s.country_iso_alpha3 === selectedIso) || sovereigns[0];

  // Update inflation/tax rate when sovereign changes
  const handleSelectIso = (iso: string) => {
    setSelectedIso(iso);
    const target = sovereigns.find(s => s.country_iso_alpha3 === iso);
    if (target) {
      setBaseInflation(target.baseline_inflation);
      setBaseTaxRate(target.effective_tax_rate);
    }
  };

  const handleRefreshData = () => {
    setShowSyncBanner(true);
    setTimeout(() => {
      setShowSyncBanner(false);
    }, 2800);
  };

  // Aggregated totals for sidebar metrics
  const currentBonds = debtInstruments.filter(b => b.issuing_country === selectedIso);
  const totalBondDebtUsdM = currentBonds.reduce((acc, b) => acc + b.par_value_amount, 0);

  const currentSwaps = swapPositions.filter(s => s.sovereign_country === selectedIso);
  const totalSwapNotionalUsdM = currentSwaps.reduce((acc, s) => acc + s.notional_amount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Bar Contract Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        targetCountryName={currentSovereign.country_name}
        onExportReport={() => setIsExportOpen(true)}
        onRefreshData={handleRefreshData}
      />

      {/* Sync Success Notification Toast */}
      {showSyncBanner && (
        <div className="fixed top-16 right-6 z-40 bg-emerald-950/90 border border-emerald-800 text-emerald-300 text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>TimescaleDB hypertables & FRED/IMF ingestion partitions resynchronized.</span>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Institutional Left Sidebar */}
        <Sidebar
          sovereigns={sovereigns}
          selectedIso={selectedIso}
          onSelectIso={handleSelectIso}
          baseInflation={baseInflation}
          setBaseInflation={setBaseInflation}
          baseTaxRate={baseTaxRate}
          setBaseTaxRate={setBaseTaxRate}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          totalBondDebtUsdM={totalBondDebtUsdM}
          totalSwapNotionalUsdM={totalSwapNotionalUsdM}
        />

        {/* Dynamic Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'yield-curves' && (
              <YieldCurvesTab
                sovereign={currentSovereign}
                onSelectCountry={handleSelectIso}
              />
            )}

            {activeTab === 'correlation-matrix' && (
              <CorrelationMatrixTab sovereign={currentSovereign} />
            )}

            {activeTab === 'dsa-sandbox' && (
              <DSASandboxTab sovereign={currentSovereign} />
            )}

            {activeTab === 'refunding-swaps' && (
              <RefundingSwapsTab
                sovereign={currentSovereign}
                debtInstruments={debtInstruments}
                swapPositions={swapPositions}
              />
            )}

            {activeTab === 'agent-console' && (
              <AgentConsoleTab sovereign={currentSovereign} />
            )}

            {activeTab === 'sql-studio' && (
              <SQLStudioTab />
            )}

            {activeTab === 'legal-covenants' && (
              <LegalCovenantsTab sovereign={currentSovereign} />
            )}

            {activeTab === 'docker-api' && (
              <DockerApiGatewayTab />
            )}
          </div>
        </main>
      </div>

      {/* Export Report Dossier Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        sovereign={currentSovereign}
        debtInstruments={debtInstruments}
        swapPositions={swapPositions}
      />
    </div>
  );
}
