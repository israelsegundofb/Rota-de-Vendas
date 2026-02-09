import React, { useState, useEffect } from 'react';
import { EnrichedClient } from '../types';
import { REGIONS, CATEGORIES, getRegionByUF } from '../utils/constants';
import { consultarCNPJ } from '../services/cnpjService';
import { X, Save, MapPin, Store, AlertCircle, Globe, Search, Loader2 } from 'lucide-react';

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (newClient: Omit<EnrichedClient, 'id' | 'lat' | 'lng' | 'cleanAddress' | 'lastPurchaseDate' | 'purchaseCount' | 'totalSpent' | 'averageTicket' | 'productCount' | 'skuCount' | 'purchasedProducts'>) => void;
    salespersonId: string;
    ownerName: string;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onAdd, salespersonId, ownerName }) => {
    // State for form
    const [cnpj, setCnpj] = useState('');
    const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
    const [formData, setFormData] = useState({
        companyName: '',
        ownerName: '',
        contact: '',
        category: ['Outros'],
        region: 'Nordeste',
        state: 'CE',
        city: 'Fortaleza',
        originalAddress: '',
        cleanAddress: ''
    });

    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial load logic to get location
    useEffect(() => {
        if (isOpen) {
            // Reset form
            setFormData({
                companyName: '',
                ownerName: '',
                contact: '',
                category: ['Outros'],
                region: 'Nordeste',
                state: 'CE',
                city: 'Fortaleza',
                originalAddress: '',
                cleanAddress: ''
            });
            setCnpj('');
            setError('');

            // Try to get current location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        // We could reverse geocode here, but for now we just log
                        // console.log("User location:", position.coords);
                    },
                    (error) => {
                        console.warn("Location access denied or error:", error);
                    }
                );
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (field: string, value: any) => {
        setFormData(prev => {
            const updates: any = { [field]: value };
            if (field === 'state') {
                updates.region = getRegionByUF(value);
            }
            return { ...prev, ...updates };
        });
        if (error) setError('');
    };

    const toggleCategory = (cat: string) => {
        setFormData(prev => {
            const current = prev.category;
            if (current.includes(cat)) {
                // Prevent empty list
                if (current.length === 1) return prev;
                return { ...prev, category: current.filter(c => c !== cat) };
            } else {
                return { ...prev, category: [...current, cat] };
            }
        });
    };

    const handleSearchCNPJ = async () => {
        if (!cnpj || cnpj.length < 14) {
            setError('Digite um CNPJ válido para buscar.');
            return;
        }

        setIsLoadingCNPJ(true);
        setError('');

        try {
            const data = await consultarCNPJ(cnpj);
            if (data) {
                setFormData(prev => ({
                    ...prev,
                    companyName: data.nome_fantasia || data.razao_social,
                    ownerName: data.razao_social, // Often used as official name
                    contact: data.ddd_telefone_1,
                    state: data.uf,
                    city: data.municipio,
                    originalAddress: `${data.logradouro}, ${data.numero} ${data.complemento} - ${data.bairro}, ${data.cep}`,
                    region: getRegionByUF(data.uf) as any
                }));
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao buscar CNPJ.');
        } finally {
            setIsLoadingCNPJ(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.companyName || !formData.originalAddress || !formData.city || !formData.state || !formData.contact) {
            setError('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        setIsSubmitting(true);

        const fullAddress = `${formData.originalAddress}, ${formData.city} - ${formData.state}`;

        onAdd({
            companyName: formData.companyName,
            ownerName: formData.ownerName || 'Não Informado',
            contact: formData.contact,
            category: formData.category,
            region: formData.region as any,
            state: formData.state,
            city: formData.city,
            originalAddress: fullAddress,
            salespersonId: salespersonId,
            googleMapsUri: '',
            cnpj: cnpj || undefined // Pass CNPJ if available
        });

        setIsSubmitting(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-[28px] shadow-elevation-3 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header (MD3 Style) */}
                <div className="p-6 pb-2 flex justify-between items-start shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Store className="w-5 h-5 text-primary" />
                            <span className="text-xs font-bold text-primary uppercase tracking-wider">Novo Cliente</span>
                        </div>
                        <h2 className="text-2xl font-normal text-on-surface">Adicionar Cliente</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-on-surface-variant hover:bg-surface-variant/30 rounded-full transition-colors"
                        title="Fechar"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4 overflow-y-auto custom-scrollbar flex-1">
                    <form id="add-client-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* CNPJ Search Section */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                            <label className="block text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">
                                Preenchimento Automático
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        value={cnpj}
                                        onChange={e => setCnpj(e.target.value.replace(/\D/g, ''))}
                                        placeholder="Digite o CNPJ (somente números)..."
                                        className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm font-mono"
                                        maxLength={14}
                                    />
                                    {cnpj && (
                                        <button
                                            type="button"
                                            onClick={() => setCnpj('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSearchCNPJ}
                                    disabled={isLoadingCNPJ || cnpj.length < 14}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium text-sm"
                                >
                                    {isLoadingCNPJ ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    Buscar
                                </button>
                            </div>
                            <p className="text-[10px] text-blue-600 mt-2">
                                * A busca preenche Razão Social, Endereço e Contato automaticamente.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Company Name */}
                            <div>
                                <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">
                                    Razão Social *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.companyName}
                                    onChange={e => handleChange('companyName', e.target.value)}
                                    className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-colors"
                                    placeholder="Nome do estabelecimento"
                                />
                            </div>

                            {/* Owner Name */}
                            <div>
                                <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">
                                    Proprietário
                                </label>
                                <input
                                    type="text"
                                    value={formData.ownerName}
                                    onChange={e => handleChange('ownerName', e.target.value)}
                                    className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-colors"
                                    placeholder="Nome do responsável"
                                />
                            </div>

                            {/* Contact */}
                            <div>
                                <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">
                                    Contato *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.contact}
                                    onChange={e => handleChange('contact', e.target.value)}
                                    className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-colors"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>

                            {/* Category - MULTI SELECT */}
                            <div>
                                <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">
                                    Segmento(s)
                                </label>
                                <div className="flex flex-wrap gap-2 p-3 border border-outline-variant rounded-xl bg-surface-container-low max-h-32 overflow-y-auto custom-scrollbar">
                                    {CATEGORIES.filter(c => c !== 'Todos').map(cat => {
                                        const isSelected = formData.category.includes(cat);
                                        return (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => toggleCategory(cat)}
                                                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all border ${isSelected
                                                    ? 'bg-secondary-container text-on-secondary-container border-secondary-container'
                                                    : 'bg-surface text-on-surface-variant border-outline-variant hover:border-outline'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Region */}
                            <div>
                                <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">
                                    Região
                                </label>
                                <div className="relative">
                                    <select
                                        value={formData.region}
                                        onChange={e => handleChange('region', e.target.value)}
                                        className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none appearance-none"
                                    >
                                        {REGIONS.map(reg => (
                                            <option key={reg} value={reg}>{reg}</option>
                                        ))}
                                    </select>
                                    <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                                </div>
                            </div>

                            {/* City */}
                            <div>
                                <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">
                                    Município *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.city}
                                    onChange={e => handleChange('city', e.target.value)}
                                    className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-colors"
                                    placeholder="Ex: Fortaleza"
                                />
                            </div>

                            {/* State */}
                            <div>
                                <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">
                                    UF *
                                </label>
                                <div className="relative">
                                    <select
                                        required
                                        value={formData.state}
                                        onChange={e => handleChange('state', e.target.value)}
                                        className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none appearance-none"
                                    >
                                        {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                            <option key={uf} value={uf}>{uf}</option>
                                        ))}
                                    </select>
                                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-xs font-medium text-on-surface-variant mb-1 ml-1">
                                Endereço Completo *
                            </label>
                            <textarea
                                rows={2}
                                required
                                value={formData.originalAddress}
                                onChange={e => handleChange('originalAddress', e.target.value)}
                                className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none resize-none transition-colors"
                                placeholder="Rua, Número, Bairro, CEP"
                            />
                            <p className="text-[10px] text-on-surface-variant mt-1 ml-1">
                                * Importante para localizarmos no mapa.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-error-container text-on-error-container p-4 rounded-xl text-sm flex items-center gap-3">
                                <AlertCircle className="w-5 h-5" />
                                {error}
                            </div>
                        )}

                        <div className="bg-secondary-container/50 p-4 rounded-xl border border-secondary-container">
                            <p className="text-xs text-on-secondary-container flex gap-2">
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span>Ao salvar, o sistema tentará localizar automaticamente as coordenadas deste cliente para exibir no mapa e na lista.</span>
                            </p>
                        </div>

                    </form>
                </div>

                {/* Footer (MD3 Actions) */}
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
                        disabled={isSubmitting}
                        form="add-client-form"
                        className="px-6 py-2.5 bg-primary text-on-primary font-medium rounded-full hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-elevation-1 hover:shadow-elevation-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        {isSubmitting ? 'Salvando...' : (
                            <>
                                <Save className="w-4 h-4" />
                                Salvar
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AddClientModal;
