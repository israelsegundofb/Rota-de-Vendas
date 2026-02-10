import React, { useState } from 'react';
import { X, Save, User, Store, Phone, MapPin, Tag, Globe, Briefcase, FileText } from 'lucide-react';
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
        category: Array.isArray(client.category)
            ? client.category
            : (typeof client.category === 'string' ? [client.category] : ['Outros'])
    }));

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
                    <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-variant/30 rounded-full transition-colors">
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
                            />
                        </div>
                    </div>

                    <div className="space-y-1 pt-2">
                        <label className="text-xs font-medium text-on-surface-variant ml-1">
                            Endereço Completo
                        </label>
                        <input
                            type="text"
                            name="cleanAddress"
                            value={formData.cleanAddress}
                            onChange={handleChange}
                            className="w-full bg-surface-container-highest border-b border-outline-variant rounded-t-lg px-4 py-2.5 text-on-surface focus:border-primary focus:bg-surface-container-highest outline-none transition-all"
                        />
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
