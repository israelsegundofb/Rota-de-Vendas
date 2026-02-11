import React, { useState } from 'react';
import { X, Save, User, Store, Phone, MapPin, Tag, Globe, Briefcase, FileText, Search, Loader2 } from 'lucide-react';
import { pesquisarEmpresaPorEndereco, consultarCNPJ } from '../services/cnpjService';
import { EnrichedClient, AppUser, UploadedFile } from '../types';
import { REGIONS, CATEGORIES, getRegionByUF } from '../utils/constants';

interface EditClientModalProps {
    client: EnrichedClient;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedClient: EnrichedClient) => void;
    users?: AppUser[];
    uploadedFiles?: UploadedFile[];
}

const EditClientModal: React.FC<EditClientModalProps> = ({ client, isOpen, onClose, onSave, users = [], uploadedFiles = [] }) => {
    const [formData, setFormData] = useState<EnrichedClient>(() => ({
        ...client,
        cnpj: client.cnpj || '',
        category: Array.isArray(client.category)
            ? client.category
            : (typeof client.category === 'string' ? [client.category] : ['Outros'])
    }));

    const [isSearching, setIsSearching] = useState(false);
    const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'success' | 'error'>('idle');

    React.useEffect(() => {
        setFormData({
            ...client,
            category: Array.isArray(client.category)
                ? client.category
                : (typeof client.category === 'string' ? [client.category] : ['Outros'])
        });
    }, [client]);

    if (!isOpen) return null;

    // Derive salesperson info
    const salesperson = users.find(u => u.id === client.salespersonId);
    const salespersonName = salesperson?.name || 'Não atribuído';
    const salespersonType = salesperson?.role === 'sales_internal' ? 'Interno' :
        salesperson?.role === 'sales_external' || salesperson?.role === 'salesperson' ? 'Externo' :
            salesperson?.role ? 'Equipe' : '';
    const salespersonCategory = salesperson?.salesCategory || '';
    const sourceFile = uploadedFiles.find(f => f.id === client.sourceFileId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    const handleCNPJSearch = async () => {
        if (!formData.cleanAddress || formData.cleanAddress.length < 10) {
            alert('Por favor, verifique o endereço antes de buscar.');
            return;
        }

        setIsSearching(true);
        setSearchStatus('searching');

        try {
            // 1. Pesquisa básica pelo endereço + Nome (se houver) para maior precisão
            const searchTerms = [formData.companyName, formData.cleanAddress].filter(Boolean).join(', ');
            const results = await pesquisarEmpresaPorEndereco({
                filtros: searchTerms,
                uf: formData.state
            });

            if (results && results.length > 0) {
                // Pega o primeiro resultado (mais provável)
                const candidate = results[0];
                const fullData = await consultarCNPJ(candidate.taxId);

                if (fullData) {
                    setFormData(prev => ({
                        ...prev,
                        cnpj: fullData.cnpj,
                        companyName: fullData.nome_fantasia || fullData.razao_social || prev.companyName,
                        lat: fullData.latitude || prev.lat,
                        lng: fullData.longitude || prev.lng,
                        mainCnae: fullData.cnae_fiscal,
                        secondaryCnaes: fullData.cnaes_secundarios?.map((s: any) => `${s.codigo} - ${s.texto}`) || []
                    }));
                    setSearchStatus('success');
                }
            } else {
                setSearchStatus('error');
                alert('Nhum CNPJ encontrado para este endereço exato na base comercial.');
            }
        } catch (err) {
            console.error(err);
            setSearchStatus('error');
        } finally {
            setIsSearching(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updates: any = { [name]: value };
            if (name === 'state') {
                updates.region = getRegionByUF(value);
            }
            return { ...prev, ...updates };
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-[28px] shadow-elevation-3 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">

                {/* Header (MD3) */}
                <div className="p-6 pb-2 flex justify-between items-start shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Store className="w-5 h-5 text-primary" />
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">Editando</span>
                        </div>
                        <h2 className="text-2xl font-normal text-on-surface">Dados do Cliente</h2>
                        <p className="text-xs text-on-surface-variant mt-1 font-mono">{client.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-variant/30 rounded-full transition-colors" title="Fechar modal">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Vendor Info Banner */}
                <div className="mx-6 mb-2 flex flex-wrap items-center gap-3 px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-xl">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-bold text-purple-800">Vendedor Responsável:</span>
                        <span className="text-sm font-semibold text-purple-900">{salespersonName}</span>
                    </div>
                    {salespersonType && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${salespersonType === 'Interno' ? 'bg-blue-100 text-blue-700' :
                            salespersonType === 'Externo' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-600'
                            }`}>
                            {salespersonType}
                        </span>
                    )}
                    {salespersonCategory && salespersonCategory !== 'N/A' && (
                        <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            <Briefcase className="w-3 h-3 inline mr-1" />{salespersonCategory}
                        </span>
                    )}
                    {sourceFile && (
                        <div className="flex items-center gap-1.5 ml-auto">
                            <FileText className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-[10px] text-gray-600 font-medium">Origem: <span className="font-bold">{sourceFile.fileName}</span></span>
                        </div>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Razão Social */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-on-surface-variant ml-1">
                                Razão Social
                            </label>
                            <input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-all"
                                required
                                title="Razão Social"
                                placeholder="Razão Social"
                            />
                        </div>

                        {/* Proprietário */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-on-surface-variant ml-1">
                                Proprietário
                            </label>
                            <input
                                type="text"
                                name="ownerName"
                                value={formData.ownerName}
                                onChange={handleChange}
                                className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-all"
                                required
                                title="Responsável / Proprietário"
                                placeholder="Responsável / Proprietário"
                            />
                        </div>

                        {/* Contato */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-on-surface-variant ml-1">
                                Contato
                            </label>
                            <input
                                type="text"
                                name="contact"
                                value={formData.contact}
                                onChange={handleChange}
                                className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-all"
                                title="Contato (Telefone/WhatsApp)"
                                placeholder="Contato (Telefone/WhatsApp)"
                            />
                        </div>

                        {/* Categoria/Segmento - MULTI SELECT */}
                        <div className="md:col-span-1">
                            <label className="text-xs font-medium text-on-surface-variant ml-1 mb-2 block">
                                Segmento(s)
                            </label>
                            <div className="flex flex-wrap gap-2 p-3 border border-outline-variant rounded-xl bg-surface-container-low max-h-32 overflow-y-auto custom-scrollbar">
                                {CATEGORIES.filter(c => c !== 'Todos').map(cat => {
                                    const isSelected = formData.category.includes(cat);
                                    return (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => {
                                                setFormData(prev => {
                                                    const current = prev.category || [];
                                                    if (current.includes(cat)) {
                                                        if (current.length === 1) return prev; // Prevent empty
                                                        return { ...prev, category: current.filter(c => c !== cat) };
                                                    } else {
                                                        return { ...prev, category: [...current, cat] };
                                                    }
                                                });
                                            }}
                                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all border ${isSelected
                                                ? 'bg-secondary-container text-on-secondary-container border-secondary-container'
                                                : 'bg-surface text-on-surface-variant border-outline-variant hover:border-outline'
                                                }`}
                                            title={`Selecionar/desselecionar segmento: ${cat}`}
                                        >
                                            {cat}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Região */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-on-surface-variant ml-1">
                                Região
                            </label>
                            <div className="relative">
                                <select
                                    name="region"
                                    value={formData.region}
                                    onChange={handleChange}
                                    className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-all appearance-none"
                                    title="Região"
                                >
                                    <option value="Indefinido">Indefinido</option>
                                    {REGIONS.map(reg => (
                                        <option key={reg} value={reg}>{reg}</option>
                                    ))}
                                </select>
                                <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                            </div>
                        </div>

                        {/* Município */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-on-surface-variant ml-1">
                                Município
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-all"
                                title="Município"
                                placeholder="Município"
                            />
                        </div>

                        {/* UF */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-on-surface-variant ml-1">
                                UF
                            </label>
                            <input
                                type="text"
                                name="state"
                                maxLength={2}
                                value={formData.state}
                                onChange={handleChange}
                                className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-all uppercase"
                                title="UF"
                                placeholder="UF"
                            />
                        </div>
                    </div>

                    <div className="space-y-1 pt-2">
                        <label className="text-xs font-medium text-on-surface-variant ml-1">
                            Endereço Completo
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                name="cleanAddress"
                                value={formData.cleanAddress}
                                onChange={handleChange}
                                className="flex-1 bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-all"
                                title="Endereço Limpo"
                            />
                            <button
                                type="button"
                                onClick={handleCNPJSearch}
                                disabled={isSearching}
                                className={`px-4 flex items-center gap-2 rounded-xl text-xs font-bold transition-all ${searchStatus === 'success'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                                    }`}
                                title="Tentar descobrir o CNPJ a partir deste endereço"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                {searchStatus === 'success' ? 'CNPJ Encontrado!' : 'Descobrir CNPJ'}
                            </button>
                        </div>
                    </div>

                    {/* CNPJ Field (NEW) */}
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-on-surface-variant ml-1">
                            CNPJ
                        </label>
                        <input
                            type="text"
                            name="cnpj"
                            value={formData.cnpj || ''}
                            onChange={handleChange}
                            className={`w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-all ${searchStatus === 'success' ? 'border-green-500' : ''}`}
                            placeholder="00.000.000/0000-00"
                        />
                    </div>

                    {/* CNAE Info (NEW) */}
                    {(formData.mainCnae || (formData.secondaryCnaes && formData.secondaryCnaes.length > 0)) && (
                        <div className="bg-surface-container-highest/50 p-4 rounded-2xl border border-outline-variant space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">
                                    Atividade Econômica Principal (CNAE)
                                </label>
                                <p className="text-sm text-on-surface flex items-start gap-2">
                                    <Briefcase className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                                    {formData.mainCnae || 'Não informado'}
                                </p>
                            </div>

                            {formData.secondaryCnaes && formData.secondaryCnaes.length > 0 && (
                                <div>
                                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
                                        Atividades Secundárias
                                    </label>
                                    <ul className="space-y-1">
                                        {formData.secondaryCnaes.map((cnae, idx) => (
                                            <li key={idx} className="text-xs text-on-surface-variant flex items-start gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-outline-variant mt-1.5 shrink-0" />
                                                {cnae}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Plus Code */}
                    <div className="space-y-1 pt-2">
                        <label className="text-xs font-medium text-on-surface-variant ml-1 flex items-center gap-1">
                            Plus Code (Google Maps)
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 rounded-full">Localização Exata</span>
                        </label>
                        <input
                            type="text"
                            name="plusCode"
                            value={formData.plusCode || ''}
                            onChange={handleChange}
                            className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-all"
                            placeholder="Ex: C6PH+9J Fortaleza, CE"
                            title="Google Plus Code"
                        />
                        <p className="text-[10px] text-on-surface-variant mt-1 ml-1">
                            Use para locais sem endereço formal ou para maior precisão nos pinos.
                        </p>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-6 pt-2 flex justify-end gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-primary font-medium hover:bg-primary-container/30 rounded-full transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="px-6 py-2.5 bg-primary text-on-primary font-medium rounded-full hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-elevation-1 hover:shadow-elevation-2 text-sm"
                    >
                        <Save className="w-4 h-4" /> Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditClientModal;
