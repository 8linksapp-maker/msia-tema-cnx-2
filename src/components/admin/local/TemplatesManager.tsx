import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2, Check, ArrowRight, Wand2 } from 'lucide-react';
import { triggerToast } from '../CmsToaster';
import { githubApi } from '../../../lib/adminApi';
import { slugify } from '../../../lib/slugify';
import type { Service, OutlineItem } from '../../../lib/localTypes';

interface TemplateService {
    title: string;
    icon?: string;
    shortDescription?: string;
    outline?: OutlineItem[];
}
interface NicheTemplate {
    slug: string;
    name: string;
    icon?: string;
    color: string;
    description?: string;
    services: TemplateService[];
}

export default function TemplatesManager() {
    const [templates, setTemplates] = useState<NicheTemplate[]>([]);
    const [currentCount, setCurrentCount] = useState(0);
    const [svcSha, setSvcSha] = useState('');
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState('');
    const [appliedTo, setAppliedTo] = useState<NicheTemplate | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            githubApi('read', 'src/data/templates.json').catch(() => ({ content: '[]' })),
            githubApi('read', 'src/data/services.json').catch(e => { if (e.message.includes('404')) return { content: '[]', sha: '' }; throw e; }),
        ])
            .then(([tpl, svc]) => {
                setTemplates(JSON.parse(tpl?.content || '[]'));
                const current = JSON.parse(svc?.content || '[]');
                setCurrentCount(Array.isArray(current) ? current.length : 0);
                setSvcSha(svc.sha || '');
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    const apply = async (tpl: NicheTemplate) => {
        if (currentCount > 0 && !confirm(`Isso substitui os ${currentCount} serviço(s) atuais pelos do modelo "${tpl.name}". Continuar?`)) return;
        setApplying(tpl.slug); setError('');
        triggerToast(`Aplicando o modelo ${tpl.name}...`, 'progress', 30);
        try {
            const newServices: Service[] = tpl.services.map((s) => ({
                title: s.title,
                slug: slugify(s.title),
                color: tpl.color,
                niche: tpl.slug,
                active: true,
                ...(s.icon ? { icon: s.icon } : {}),
                ...(s.shortDescription ? { shortDescription: s.shortDescription } : {}),
                ...(s.outline?.length ? { outline: s.outline } : {}),
            }));
            const data = await githubApi('write', 'src/data/services.json', {
                content: JSON.stringify(newServices, null, 2), sha: svcSha || undefined, message: `CMS: aplica modelo ${tpl.slug}`,
            });
            setSvcSha(data.sha);
            setCurrentCount(newServices.length);
            setAppliedTo(tpl);
            triggerToast(`Modelo ${tpl.name} aplicado! ${newServices.length} serviços criados.`, 'success', 100);
        } catch {
            setError('Não foi possível aplicar o modelo. Verifique sua conexão.');
            triggerToast('Não foi possível aplicar o modelo. Tente novamente.', 'error');
        } finally { setApplying(''); }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 text-ink-faint bg-surface rounded-lg border border-border">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p className="font-medium animate-pulse">Carregando modelos...</p>
        </div>
    );

    // Tela de sucesso com os próximos passos.
    if (appliedTo) return (
        <div className="max-w-xl mx-auto bg-surface border border-border rounded-lg p-8 text-center">
            <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: appliedTo.color, color: '#f8f8f6' }}>
                <Check className="w-7 h-7" aria-hidden="true" />
            </div>
            <h2 className="font-display text-2xl text-ink mb-1">Modelo "{appliedTo.name}" aplicado!</h2>
            <p className="text-ink-muted mb-6">{appliedTo.services.length} serviços criados. Agora faltam 3 passos pro seu site ir pro ar:</p>
            <ol className="text-left space-y-3 mb-8">
                <li className="flex items-start gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-primary-soft text-primary font-bold text-xs flex items-center justify-center">1</span><span className="text-sm text-ink"><a href="/admin/local/locations" className="font-semibold text-primary hover:underline">Escolha onde você atende</a> — cidades e bairros.</span></li>
                <li className="flex items-start gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-primary-soft text-primary font-bold text-xs flex items-center justify-center">2</span><span className="text-sm text-ink"><a href="/admin/local/services" className="font-semibold text-primary hover:underline">Gere os textos</a> de cada serviço com a IA.</span></li>
                <li className="flex items-start gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-primary-soft text-primary font-bold text-xs flex items-center justify-center">3</span><span className="text-sm text-ink"><a href="/admin/local/pages" className="font-semibold text-primary hover:underline">Publique</a> — e seu site entra no ar.</span></li>
            </ol>
            <div className="flex flex-wrap gap-3 justify-center">
                <a href="/admin/local/locations" className="inline-flex items-center gap-2 bg-primary text-surface px-6 py-3 min-h-[44px] rounded font-semibold no-underline hover:brightness-90 transition-all">
                    Escolher onde atendo <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
                <button onClick={() => setAppliedTo(null)} className="px-5 py-3 min-h-[44px] font-semibold text-ink-muted hover:bg-elev rounded transition-colors">Ver modelos</button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-12">
            {error && <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm"><AlertCircle className="w-4 h-4 inline mr-2 -mt-0.5" />{error}</div>}

            {currentCount > 0 && (
                <div className="p-4 bg-amber-50 text-amber-800 rounded-md border border-amber-200 text-sm">
                    Você já tem {currentCount} serviço(s). Aplicar um modelo <strong>substitui</strong> todos eles pelos do modelo escolhido.
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((tpl) => (
                    <div key={tpl.slug} className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
                        <div className="p-5 flex items-start gap-4" style={{ borderTop: `4px solid ${tpl.color}` }}>
                            <div className="w-12 h-12 rounded-md flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: tpl.color, color: '#f8f8f6' }} aria-hidden="true">{tpl.icon || '📦'}</div>
                            <div className="min-w-0">
                                <h3 className="font-display text-xl text-ink leading-tight">{tpl.name}</h3>
                                {tpl.description && <p className="text-sm text-ink-muted mt-1 leading-relaxed">{tpl.description}</p>}
                            </div>
                        </div>
                        <div className="px-5 pb-3">
                            <p className="text-[10px] font-bold text-ink-faint uppercase tracking-widest mb-2">{tpl.services.length} serviços inclusos</p>
                            <div className="flex flex-wrap gap-1.5">
                                {tpl.services.map((s) => (
                                    <span key={s.title} className="text-xs text-ink-muted bg-elev rounded px-2 py-1">{s.icon ? `${s.icon} ` : ''}{s.title}</span>
                                ))}
                            </div>
                        </div>
                        <div className="mt-auto p-5 pt-3">
                            <button onClick={() => apply(tpl)} disabled={!!applying}
                                className="w-full inline-flex items-center justify-center gap-2 text-surface px-5 py-3 min-h-[44px] rounded font-semibold disabled:opacity-50 transition-all hover:brightness-90"
                                style={{ backgroundColor: tpl.color }}>
                                {applying === tpl.slug ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Wand2 className="w-4 h-4" aria-hidden="true" />}
                                {applying === tpl.slug ? 'Aplicando…' : 'Usar este modelo'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {templates.length === 0 && <p className="text-sm text-ink-faint">Nenhum modelo disponível.</p>}
        </div>
    );
}
