import React, { useState } from 'react';
import { SovereignEntity, LegalCovenantDocument } from '../types/sovereign';
import { INITIAL_LEGAL_DOCUMENTS } from '../data/mockDatabase';
import { Search, FileText, Scale, ShieldAlert, CheckCircle2, Bookmark } from 'lucide-react';

interface LegalCovenantsTabProps {
  sovereign: SovereignEntity;
}

export const LegalCovenantsTab: React.FC<LegalCovenantsTabProps> = ({ sovereign }) => {
  const [searchTerm, setSearchTerm] = useState<string>('single limb');
  const [selectedDocId, setSelectedDocId] = useState<string>('DOC-ALP-BOND-2024');

  const filteredDocs = INITIAL_LEGAL_DOCUMENTS;
  const activeDoc = filteredDocs.find(d => d.id === selectedDocId) || filteredDocs[0];

  // Semantic search matches
  const searchResults = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();

    const matches: {
      docTitle: string;
      section: string;
      clauseTitle: string;
      text: string;
      implication: string;
      similarityScore: number;
    }[] = [];

    INITIAL_LEGAL_DOCUMENTS.forEach(doc => {
      doc.clauses.forEach(cl => {
        const fullContent = (cl.clause_title + ' ' + cl.text + ' ' + cl.restructuring_implication).toLowerCase();
        if (fullContent.includes(term)) {
          matches.push({
            docTitle: doc.title,
            section: cl.section,
            clauseTitle: cl.clause_title,
            text: cl.text,
            implication: cl.restructuring_implication,
            similarityScore: 0.94,
          });
        }
      });
    });

    return matches;
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header and Semantic Search Input */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                Sovereign Legal Covenants, ISDA Master Agreements & CAC Matrix
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Local vector embeddings search over bond prospectuses, voting thresholds, and credit support annexes
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800">
            bge-large-en-v1.5 Local Vector DB
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clauses: 'single limb', 'cross default', 'margin call', 'pari passu', 'negative pledge'..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* Semantic Search Highlights if search entered */}
      {searchResults.length > 0 && (
        <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Semantic Embedding Query Results ({searchResults.length} matches)
            </span>
            <span className="text-[11px] font-mono text-slate-400">Cosine Similarity &ge; 0.90</span>
          </div>

          <div className="space-y-2.5">
            {searchResults.map((res, idx) => (
              <div key={idx} className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                    {res.clauseTitle} <span className="text-slate-400 font-mono font-normal">({res.section})</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    Similarity: {(res.similarityScore * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 italic font-mono bg-slate-900/60 p-2 rounded">
                  "{res.text}"
                </div>

                <div className="text-[11px] text-amber-300/90 pt-1">
                  <span className="font-semibold">Restructuring Legal Impact: </span>
                  {res.implication}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Browser Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Document Selector Column */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Indexed Legal Repositories
          </span>
          <div className="space-y-2">
            {filteredDocs.map((doc) => {
              const isSelected = doc.id === activeDoc.id;
              return (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-indigo-500/60 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-semibold text-indigo-400">{doc.country_iso}</span>
                    <span className="text-[10px] font-mono text-slate-400">{doc.governing_law}</span>
                  </div>
                  <div className="text-xs font-medium leading-snug">{doc.title}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    Effective: {doc.effective_date} · {doc.document_type}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Document Clause Viewer */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">{activeDoc.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Governing Law: {activeDoc.governing_law} | Sovereign Alpha/Benchmark Schedule
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {activeDoc.document_type}
            </span>
          </div>

          <div className="space-y-4">
            {activeDoc.clauses.map((clause, cIdx) => (
              <div key={cIdx} className="p-4 bg-slate-950/70 border border-slate-800/90 rounded-xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-sm">
                    Section {clause.section}: {clause.clause_title}
                  </div>
                  {clause.cac_threshold && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      Voting Rule: {clause.cac_threshold}
                    </span>
                  )}
                </div>

                <div className="p-3 bg-slate-900/70 rounded-lg text-slate-300 font-mono text-[11px] leading-relaxed border border-slate-800">
                  {clause.text}
                </div>

                <div className="p-2.5 bg-indigo-950/40 rounded-lg border border-indigo-900/40 text-[11px] text-indigo-200 leading-relaxed">
                  <span className="font-semibold text-indigo-300">Policy Analysis & Restructuring Risk: </span>
                  {clause.restructuring_implication}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
