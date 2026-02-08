import React, { useState } from 'react';
import { EnrichedClient, REGIONS, CATEGORIES } from '../types';
import { X, Save, MapPin, Store, User, Phone, Tag, AlertCircle, Globe } from 'lucide-react';

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (newClient: Omit<EnrichedClient, 'id' | 'lat' | 'lng' | 'cleanAddress'>) => void;
    salespersonId: string;
    ownerName: string;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onAdd, salespersonId, ownerName }) => {
    const [formData, setFormData] = useState({
        companyName: '',
        ownerName: '',
        contact: '',
        category: 'Outros',
        region: 'Nordeste',
        state: 'CE',
        city: 'Fortaleza',
        // We ask for the full address to help geocoding
        originalAddress: ''
    });

    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (error) setError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.companyName || !formData.originalAddress || !formData.city || !formData.state) {
            setError('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        onAdd({
            companyName: formData.companyName,
            ownerName: formData.ownerName || 'Não Informado',
            contact: formData.contact || 'Não Informado',
            category: formData.category,
            region: formData.region as any,
            state: formData.state,
            city: formData.city,
            originalAddress: formData.originalAddress,
            salespersonId: salespersonId,
            // Default values that will be overwritten by geocoding or logic in App.tsx
            googleMapsUri: ''
        });

        // Reset and close
        setFormData({
            companyName: '',
            ownerName: '',
            contact: '',
            category: 'Outros',
            region: 'Nordeste',
            state: 'CE',
            city: 'Fortaleza',
            originalAddress: ''
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-slate-800 p-4 flex justify-between items-center text-white shrink-0">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Store className="w-5 h-5 text-green-400" />
                        Adicionar Novo Cliente
                    </h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors" title="Fechar">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form id="add-client-form" onSubmit={handleSubmit} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Company Name */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                    <Store className="w-3 h-3" /> Razão Social *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.companyName}
                                    onChange={e => handleChange('companyName', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Nome do estabelecimento"
                                />
                            </div>

                            {/* Owner Name */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                    <User className="w-3 h-3" /> Proprietário
                                </label>
                                <input
                                    type="text"
                                    value={formData.ownerName}
                                    onChange={e => handleChange('ownerName', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Nome do responsável"
                                />
                            </div>

                            {/* Contact */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Contato
                                </label>
                                <input
                                    type="text"
                                    value={formData.contact}
                                    onChange={e => handleChange('contact', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                    <Tag className="w-3 h-3" /> Segmento
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={e => handleChange('category', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    title="Selecione o segmento"
                                >
                                    {CATEGORIES.filter(c => c !== 'Todos').map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Region */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                    <Globe className="w-3 h-3" /> Região
                                </label>
                                <select
                                    value={formData.region}
                                    onChange={e => handleChange('region', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    title="Selecione a região"
                                >
                                    {REGIONS.map(reg => (
                                        <option key={reg} value={reg}>{reg}</option>
                                    ))}
                                </select>
                            </div>

                            {/* City */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Município *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.city}
                                    onChange={e => handleChange('city', e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ex: Fortaleza"
                                />
                            </div>

                            {/* State */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> UF *
                                </label>
                                <input
                                    type="text"
                                    required
                                    maxLength={2}
                                    value={formData.state}
                                    onChange={e => handleChange('state', e.target.value.toUpperCase())}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ex: CE"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Endereço Completo *
                            </label>
                            <textarea
                                rows={2}
                                required
                                value={formData.originalAddress}
                                onChange={e => handleChange('originalAddress', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                placeholder="Rua, Número, Bairro, CEP"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">
                                * Importante para localizarmos no mapa.
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div className="bg-blue-50 p-4 rounded-lg">
                            <p className="text-xs text-blue-700">
                                <strong>Nota:</strong> Ao salvar, o sistema tentará localizar automaticamente as coordenadas deste cliente para exibir no mapa.
                            </p>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="add-client-form"
                        className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-md"
                    >
                        <Save className="w-4 h-4" />
                        Cadastrar Cliente
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AddClientModal;
