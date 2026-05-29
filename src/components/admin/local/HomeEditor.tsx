import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Plus, Trash2, Save, Eye, EyeOff } from 'lucide-react';
import { triggerToast } from '../CmsToaster';
import { githubApi } from '../../../lib/adminApi';
import type { LocalHome, HomeStep, SectionLabel } from '../../../lib/localTypes';

const FIELD = 'w-full bg-elev border border-border rounded-md px-4 py-3 text-sm focus:ring-2 focus:ring-primary/30 outline-none';
const LABEL = 'block text-[10px] font-bold text-ink-muted uppercase tracking-widest mb-2';

type ShowKey = keyof NonNullable<LocalHome['show']>;
type SectionKey = keyof NonNullable<LocalHome['sections']>;

export default function HomeEditor() {
    const [home, setHome] = useState<LocalHome>({});
    const [fileSha, setFileSha] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        githubApi('read', 'src/data/localHome.json')
            .then(d => { setHome(JSON.parse(d?.content || '{}')); setFileSha(d.sha); })
            .catch(err => { if (err.message.includes('404')) setHome({}); else setError(err.message); })
            .finally(() => setLoading(false));
    }, []);

    const patch = (p: Partial<LocalHome>) => setHome(prev => ({ ...prev, ...p }));
    const isOn = (k: ShowKey) => home.show?.[k] !== false;
    const toggle = (k: ShowKey) => patch({ show: { ...home.show, [k]: !isOn(k) } });
    const setSection = (k: SectionKey, v: SectionLabel) => patch({ sections: { ...home.sections, [k]: { ...home.sections?.[k], ...v } } });

    // Provas de confiança (string[])
    const trust = home.trust || [];
    const setTrust = (i: number, v: string) => patch({ trust: trust.map((t, k) => k === i ? v : t) });
    const addTrust = () => patch({ trust: [...trust, ''] });
    const rmTrust = (i: number) => patch({ trust: trust.filter((_, k) => k !== i) });

    // Passos ({title, description}[])
    const steps = home.steps || [];
    const setStep = (i: number, p: Partial<HomeStep>) => patch({ steps: steps.map((s, k) => k === i ? { ...s, ...p } : s) });
    const addStep = () => patch({ steps: [...steps, { title: '', description: '' }] });
    const rmStep = (i: number) => patch({ steps: steps.filter((_, k) => k !== i) });

    const save = async () => {
        setSaving(true); setError('');
        triggerToast('Salvando página inicial...', 'progress', 20);
        try {
            const clean: LocalHome = {
                ...home,
                trust: trust.map(t => t.trim()).filter(Boolean),
                steps: steps.map(s => ({ title: s.title.trim(), description: s.description.trim() })).filter(s => s.title || s.description),
            };
            const data = await githubApi('write', 'src/data/localHome.json', {
                content: JSON.stringify(clean, null, 2), sha: fileSha || undefined, message: 'CMS: atualiza página inicial',
            });
            setFileSha(data.sha);
            triggerToast('Página inicial salva!', 'success', 100);
        } catch {
            setError('Não foi possível salvar. Verifique sua conexão.');
            triggerToast('Não foi possível salvar a página inicial.', 'error');
        } finally { setSaving(false); }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 text-ink-faint bg-surface rounded-lg border border-border">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p className="font-medium animate-pulse">Lendo a página inicial...</p>
        </div>
    );

    const ToggleBtn = ({ k }: { k: ShowKey }) => (
        <button type="button" onClick={() => toggle(k)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded transition-colors ${isOn(k) ? 'bg-primary-soft text-primary' : 'bg-elev text-ink-faint'}`}
            aria-pressed={isOn(k)}>
            {isOn(k) ? <Eye className="w-3.5 h-3.5" aria-hidden="true" /> : <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />}
            {isOn(k) ? 'Visível' : 'Oculta'}
        </button>
    );

    const SectionLabelFields = ({ k }: { k: SectionKey }) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label className={LABEL}>Rótulo pequeno</label>
                <input type="text" value={home.sections?.[k]?.eyebrow || ''} onChange={e => setSection(k, { eyebrow: e.target.value })} className={FIELD} placeholder="o que fazemos" />
            </div>
            <div>
                <label className={LABEL}>Título da seção</label>
                <input type="text" value={home.sections?.[k]?.title || ''} onChange={e => setSection(k, { title: e.target.value })} className={FIELD} placeholder="Nossos serviços" />
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-32">
            {error && <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm"><AlertCircle className="w-4 h-4 inline mr-2 -mt-0.5" />{error}</div>}

            <div className="p-4 bg-elev rounded-md border border-border text-sm text-ink-muted">
                O <strong className="text-ink font-semibold">título do topo</strong> e o texto de <strong className="text-ink font-semibold">"Quem somos"</strong> ficam em <a href="/admin/local/template" className="text-primary underline">Modelo de página</a>. Aqui você edita as seções e liga/desliga cada uma. Use variáveis como <code className="bg-surface px-1 rounded">{'{cidade}'}</code> e <code className="bg-surface px-1 rounded">{'{empresa}'}</code> nos textos.
            </div>

            {/* Provas de confiança */}
            <section className="bg-surface border border-border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div><h2 className="font-bold text-ink">Provas de confiança</h2><p className="text-sm text-ink-muted">Frases curtas abaixo do botão principal.</p></div>
                    <ToggleBtn k="trust" />
                </div>
                {trust.length === 0 ? (
                    <p className="text-xs text-ink-faint bg-elev rounded-md px-4 py-3">Nenhuma. Adicione frases como "Orçamento sem compromisso".</p>
                ) : (
                    <div className="space-y-2">
                        {trust.map((t, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <input type="text" value={t} onChange={e => setTrust(i, e.target.value)} className={FIELD} placeholder="Atendemos {cidade} e região" aria-label={`Prova ${i + 1}`} />
                                <button type="button" onClick={() => rmTrust(i)} className="p-2 text-ink-faint hover:text-red-600 shrink-0" aria-label={`Remover prova ${i + 1}`}><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
                            </div>
                        ))}
                    </div>
                )}
                <button type="button" onClick={addTrust} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" aria-hidden="true" /> Adicionar prova</button>
            </section>

            {/* Benefícios (toggle só) */}
            <section className="bg-surface border border-border rounded-lg p-6">
                <div className="flex items-center justify-between gap-3">
                    <div><h2 className="font-bold text-ink">Benefícios</h2><p className="text-sm text-ink-muted">As frases vêm de <a href="/admin/local/template" className="text-primary underline">Modelo de página</a>. Aqui você só liga/desliga a seção.</p></div>
                    <ToggleBtn k="benefits" />
                </div>
            </section>

            {/* Serviços (rótulos) */}
            <section className="bg-surface border border-border rounded-lg p-6 space-y-4">
                <div><h2 className="font-bold text-ink">Serviços</h2><p className="text-sm text-ink-muted">Os cards vêm de <a href="/admin/local/services" className="text-primary underline">Serviços</a>. Aqui você edita os títulos da seção.</p></div>
                <SectionLabelFields k="servicos" />
            </section>

            {/* Como funciona */}
            <section className="bg-surface border border-border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div><h2 className="font-bold text-ink">Como funciona</h2><p className="text-sm text-ink-muted">Os passos do seu atendimento.</p></div>
                    <ToggleBtn k="comoFunciona" />
                </div>
                <SectionLabelFields k="comoFunciona" />
                {steps.length === 0 ? (
                    <p className="text-xs text-ink-faint bg-elev rounded-md px-4 py-3">Nenhum passo. Adicione 2 a 4 passos.</p>
                ) : (
                    <div className="space-y-3">
                        {steps.map((s, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <span className="mono text-ink-faint pt-3 w-6 shrink-0 text-center">{i + 1}</span>
                                <div className="flex-1 space-y-2">
                                    <input type="text" value={s.title} onChange={e => setStep(i, { title: e.target.value })} className={FIELD} placeholder="Título do passo" aria-label={`Título do passo ${i + 1}`} />
                                    <textarea rows={2} value={s.description} onChange={e => setStep(i, { description: e.target.value })} className={FIELD + ' resize-y'} placeholder="Descrição do passo" aria-label={`Descrição do passo ${i + 1}`} />
                                </div>
                                <button type="button" onClick={() => rmStep(i)} className="p-2 text-ink-faint hover:text-red-600 shrink-0" aria-label={`Remover passo ${i + 1}`}><Trash2 className="w-4 h-4" aria-hidden="true" /></button>
                            </div>
                        ))}
                    </div>
                )}
                <button type="button" onClick={addStep} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"><Plus className="w-3 h-3" aria-hidden="true" /> Adicionar passo</button>
            </section>

            {/* Quem somos (toggle) */}
            <section className="bg-surface border border-border rounded-lg p-6">
                <div className="flex items-center justify-between gap-3">
                    <div><h2 className="font-bold text-ink">Quem somos</h2><p className="text-sm text-ink-muted">O texto fica em <a href="/admin/local/template" className="text-primary underline">Modelo de página</a>. Aqui você liga/desliga a seção.</p></div>
                    <ToggleBtn k="quemSomos" />
                </div>
            </section>

            {/* Onde atendemos */}
            <section className="bg-surface border border-border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div><h2 className="font-bold text-ink">Onde atendemos</h2><p className="text-sm text-ink-muted">Lista das cidades atendidas (vem de Localidades).</p></div>
                    <ToggleBtn k="ondeAtendemos" />
                </div>
                <SectionLabelFields k="ondeAtendemos" />
            </section>

            {/* Contato */}
            <section className="bg-surface border border-border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div><h2 className="font-bold text-ink">Contato e mapa</h2><p className="text-sm text-ink-muted">Endereço, horário e mapa vêm de <a href="/admin/local/template" className="text-primary underline">Modelo de página</a>.</p></div>
                    <ToggleBtn k="contato" />
                </div>
                <SectionLabelFields k="contato" />
            </section>

            {/* CTA final */}
            <section className="bg-surface border border-border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div><h2 className="font-bold text-ink">Faixa de chamada final</h2><p className="text-sm text-ink-muted">A faixa colorida no fim da página.</p></div>
                    <ToggleBtn k="ctaFinal" />
                </div>
                <div>
                    <label htmlFor="cta-title" className={LABEL}>Título</label>
                    <input id="cta-title" type="text" value={home.ctaTitle || ''} onChange={e => patch({ ctaTitle: e.target.value })} className={FIELD} placeholder="Precisa de um orçamento?" />
                </div>
                <div>
                    <label htmlFor="cta-sub" className={LABEL}>Subtítulo</label>
                    <input id="cta-sub" type="text" value={home.ctaSubtitle || ''} onChange={e => patch({ ctaSubtitle: e.target.value })} className={FIELD} placeholder="Fale agora e receba um orçamento sem compromisso." />
                </div>
            </section>

            {/* Barra de salvar */}
            <div className="fixed bottom-0 left-64 right-0 bg-surface/90 backdrop-blur border-t border-border px-8 py-4 flex justify-end z-40">
                <button onClick={save} disabled={saving} className="bg-primary hover:brightness-90 disabled:opacity-50 text-surface px-6 py-2.5 min-h-[44px] rounded font-semibold flex items-center gap-2 transition-all">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
                    {saving ? 'Salvando…' : 'Salvar página inicial'}
                </button>
            </div>
        </div>
    );
}
