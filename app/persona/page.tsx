'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Sliders, Save, Check, Eye, RotateCw } from 'lucide-react';
import { IPersonaConfig } from '@/types';
import { buildSystemPrompt } from '@/lib/prompts/personaPrompt';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function PersonaStudioPage() {
  const { strings, language } = useLanguage();
  const [persona, setPersona] = useState<IPersonaConfig>({
    identityName: 'Alex',
    tagline: 'Curious tech enthusiast & minimalist desk builder',
    humorLevel: 7,
    sarcasmLevel: 4,
    warmth: 7,
    slangFrequency: 5,
    emojiFrequency: 2,
    salesiness: 2,
    opinionatedness: 7,
    postLength: 'varied',
    nicheTopics: ['desk setup', 'work from home', 'everyday tech', 'productivity hacks', 'minimalism'],
    topicsToAvoid: ['politics', 'crypto spam', 'hard-sell affiliate jargon', 'get-rich-quick'],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [newNicheInput, setNewNicheInput] = useState('');
  const [newAvoidInput, setNewAvoidInput] = useState('');

  useEffect(() => {
    fetch('/api/state')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.state?.persona) {
          setPersona(data.state.persona);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      } else {
        alert('Failed to save persona: ' + data.error);
      }
    } catch (err: any) {
      alert('Save error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const addNicheTopic = () => {
    if (!newNicheInput.trim()) return;
    if (!persona.nicheTopics.includes(newNicheInput.trim())) {
      setPersona({ ...persona, nicheTopics: [...persona.nicheTopics, newNicheInput.trim()] });
    }
    setNewNicheInput('');
  };

  const removeNicheTopic = (topic: string) => {
    setPersona({ ...persona, nicheTopics: persona.nicheTopics.filter((t) => t !== topic) });
  };

  const addAvoidTopic = () => {
    if (!newAvoidInput.trim()) return;
    if (!persona.topicsToAvoid.includes(newAvoidInput.trim())) {
      setPersona({ ...persona, topicsToAvoid: [...persona.topicsToAvoid, newAvoidInput.trim()] });
    }
    setNewAvoidInput('');
  };

  const removeAvoidTopic = (topic: string) => {
    setPersona({ ...persona, topicsToAvoid: persona.topicsToAvoid.filter((t) => t !== topic) });
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
        <RotateCw className="w-5 h-5 animate-spin" />
        Loading Persona Studio...
      </div>
    );
  }

  const livePromptPreview = buildSystemPrompt(persona, 'CURIOUS');

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-zinc-300" />
            {strings.personaTitle}
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            {strings.personaSubtitle}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 transition shadow disabled:opacity-50"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              {strings.personaSavedSuccess}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {saving ? strings.savingPersona : strings.savePersona}
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Sliders & Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Identity Section */}
          <div className="glass-card rounded-xl p-5 border border-zinc-800/80 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              {language === 'id' ? 'Identitas & Karakter' : 'Identity & Vibe'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">{strings.agentIdentityName}</label>
                <input
                  type="text"
                  value={persona.identityName}
                  onChange={(e) => setPersona({ ...persona, identityName: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">{strings.postLength}</label>
                <select
                  value={persona.postLength}
                  onChange={(e: any) => setPersona({ ...persona, postLength: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                >
                  <option value="short">{strings.lengthShort}</option>
                  <option value="medium">{strings.lengthMedium}</option>
                  <option value="varied">{strings.lengthVaried}</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-zinc-400 block mb-1">{strings.agentTagline}</label>
                <input
                  type="text"
                  value={persona.tagline}
                  onChange={(e) => setPersona({ ...persona, tagline: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>
          </div>

          {/* Nuance Sliders */}
          <div className="glass-card rounded-xl p-5 border border-zinc-800/80 space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              {strings.personalitySliders}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 text-xs">
              {/* Humor Level */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span className="text-zinc-300">{strings.sliderHumor}</span>
                  <span className="font-mono text-zinc-400">{persona.humorLevel}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={persona.humorLevel}
                  onChange={(e) => setPersona({ ...persona, humorLevel: parseInt(e.target.value, 10) })}
                  className="w-full accent-white bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-zinc-500 block">
                  {persona.humorLevel > 7 ? (language === 'id' ? 'Lelucon cerdas observasional' : 'Witty observational jokes') : (language === 'id' ? 'Faktual dan lugas' : 'Factual and composed')}
                </span>
              </div>

              {/* Sarcasm Level */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span className="text-zinc-300">{strings.sliderSarcasm}</span>
                  <span className="font-mono text-zinc-400">{persona.sarcasmLevel}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={persona.sarcasmLevel}
                  onChange={(e) => setPersona({ ...persona, sarcasmLevel: parseInt(e.target.value, 10) })}
                  className="w-full accent-white bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-zinc-500 block">
                  {persona.sarcasmLevel > 5 ? (language === 'id' ? 'Sarkasme kering santai' : 'Playful dry sarcasm') : (language === 'id' ? 'Tulus dan ramah' : 'Gentle and sincere')}
                </span>
              </div>

              {/* Warmth */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span className="text-zinc-300">{strings.sliderWarmth}</span>
                  <span className="font-mono text-zinc-400">{persona.warmth}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={persona.warmth}
                  onChange={(e) => setPersona({ ...persona, warmth: parseInt(e.target.value, 10) })}
                  className="w-full accent-white bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-zinc-500 block">
                  {persona.warmth > 6 ? (language === 'id' ? 'Mendukung, vibe teman akrab' : 'Supportive, friendly friend vibe') : (language === 'id' ? 'Langsung, tenang' : 'Direct, aloof')}
                </span>
              </div>

              {/* Slang Frequency */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span className="text-zinc-300">{strings.sliderSlang}</span>
                  <span className="font-mono text-zinc-400">{persona.slangFrequency}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={persona.slangFrequency}
                  onChange={(e) => setPersona({ ...persona, slangFrequency: parseInt(e.target.value, 10) })}
                  className="w-full accent-white bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-zinc-500 block">
                  {persona.slangFrequency > 5 ? 'Kasual ("ngl", "tbh", "lowkey")' : 'Formal baku standar'}
                </span>
              </div>

              {/* Emoji Frequency */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span className="text-zinc-300">{strings.sliderEmoji}</span>
                  <span className="font-mono text-zinc-400">{persona.emojiFrequency}/5</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={persona.emojiFrequency}
                  onChange={(e) => setPersona({ ...persona, emojiFrequency: parseInt(e.target.value, 10) })}
                  className="w-full accent-white bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-zinc-500 block">
                  {persona.emojiFrequency === 0 ? (language === 'id' ? 'Tanpa emoji sama sekali' : 'No emojis at all') : `Maks ${persona.emojiFrequency} per post`}
                </span>
              </div>

              {/* Commercial Salesiness */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-medium">
                  <span className="text-zinc-300">{strings.sliderSalesiness}</span>
                  <span className="font-mono text-zinc-400">{persona.salesiness}/5</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={persona.salesiness}
                  onChange={(e) => setPersona({ ...persona, salesiness: parseInt(e.target.value, 10) })}
                  className="w-full accent-white bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-zinc-500 block">
                  {persona.salesiness <= 2 ? (language === 'id' ? 'Penyebutan produk halus (Disarankan)' : 'Subtle product knowledge (Recommended)') : (language === 'id' ? 'Penyebutan sering' : 'Frequent mentions')}
                </span>
              </div>
            </div>
          </div>

          {/* Topics Configuration */}
          <div className="glass-card rounded-xl p-5 border border-zinc-800/80 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              {language === 'id' ? 'Batasan Topik Pembahasan' : 'Topical Boundary'}
            </h2>

            {/* Allowed Niche Topics */}
            <div className="space-y-2">
              <label className="text-xs text-zinc-400 block">{strings.nicheTopicsTitle}</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {persona.nicheTopics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-zinc-800 text-zinc-200 border border-zinc-700"
                  >
                    #{topic}
                    <button onClick={() => removeNicheTopic(topic)} className="text-zinc-400 hover:text-white">
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNicheInput}
                  onChange={(e) => setNewNicheInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addNicheTopic())}
                  placeholder={strings.addTopicPlaceholder}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
                <button
                  type="button"
                  onClick={addNicheTopic}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition border border-zinc-700"
                >
                  {language === 'id' ? 'Tambah' : 'Add'}
                </button>
              </div>
            </div>

            {/* Topics to Avoid */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/60">
              <label className="text-xs text-zinc-400 block">{strings.topicsToAvoidTitle}</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {persona.topicsToAvoid.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-red-950/30 text-red-300 border border-red-900/40"
                  >
                    🚫 {topic}
                    <button onClick={() => removeAvoidTopic(topic)} className="text-red-400 hover:text-white">
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAvoidInput}
                  onChange={(e) => setNewAvoidInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAvoidTopic())}
                  placeholder={language === 'id' ? 'Tambah topik tabu (misal: debat politik, drama)' : 'Add topic to avoid (e.g. political arguments, drama)'}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-600"
                />
                <button
                  type="button"
                  onClick={addAvoidTopic}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition border border-zinc-700"
                >
                  {language === 'id' ? 'Blokir' : 'Block'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Prompt Preview */}
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-5 border border-zinc-800/80 sticky top-24 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
              <Eye className="w-4 h-4 text-blue-400" />
              {strings.promptPreview}
            </div>
            <p className="text-[11px] text-zinc-400">
              {language === 'id'
                ? 'Kumpulan instruksi ini dikirimkan langsung ke mesin AI/LLM setiap kali memproduksi postingan atau balasan:'
                : 'This exact instruction set is delivered to the Groq/LLM engine whenever generating posts or replies:'}
            </p>
            <pre className="text-[11px] font-mono text-zinc-300 bg-black/60 p-3 rounded-lg border border-zinc-800/80 overflow-y-auto max-h-[520px] whitespace-pre-wrap leading-relaxed">
              {livePromptPreview}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
