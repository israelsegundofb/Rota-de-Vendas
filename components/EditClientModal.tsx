import React, { useState } from 'react';
import { X, Save, User, Store, Phone, MapPin, Tag, Globe } from 'lucide-react';
import { EnrichedClient, REGIONS, CATEGORIES } from '../types';

interface EditClientModalProps {
    client: EnrichedClient;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedClient: EnrichedClient) => void;
}

const EditClientModal: React.FC<EditClientModalProps> = ({ client, isOpen, onClose, onSave }) => {
    const [formData, setFormData] = useState<EnrichedClient>({ ...client });

    React.useEffect(() => {
        setFormData({ ...client });
    }, [client]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="bg-slate-800 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Store className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Editar Cliente</h2>
                            <p className="text-xs text-slate-400">ID: {client.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Razão Social */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <Store className="w-3 h-3" /> Razão Social
                            </label>
                            <input
                                type="text"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                required
                            />
                        </div>

                        {/* Proprietário */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <User className="w-3 h-3" /> Proprietário
                            </label>
                            <input
                                type="text"
                                name="ownerName"
                                value={formData.ownerName}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                required
                            />
                        </div>

                        {/* Contato */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <Phone className="w-3 h-3" /> Contato
                            </label>
                            <input
                                type="text"
                                name="contact"
                                value={formData.contact}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            />
                        </div>

                        {/* Categoria/Segmento */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <Tag className="w-3 h-3" /> Segmento
                            </label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Região */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <Globe className="w-3 h-3" /> Região
                            </label>
                            <select
                                name="region"
                                value={formData.region}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            >
                                <option value="Indefinido">Indefinido</option>
                                {REGIONS.map(reg => (
                                    <option key={reg} value={reg}>{reg}</option>
                                ))}
                            </select>
                        </div>

                        {/* Município */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> Município
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            />
                        </div>

                        {/* UF */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> UF
                            </label>
                            <input
                                type="text"
                                name="state"
                                maxLength={2}
                                value={formData.state}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all uppercase"
                            />
                        </div>
                    </div>

                    <div className="space-y-1 pt-2">
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Endereço Completo
                        </label>
                        <input
                            type="text"
                            name="cleanAddress"
                            value={formData.cleanAddress}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="bg-gray-50 p-6 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2 shadow-md shadow-slate-200"
                    >
                        <Save className="w-4 h-4" /> Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditClientModal;
