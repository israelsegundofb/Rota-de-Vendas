import React, { useState } from 'react';
import { User, SalesCategory, CATEGORIES } from '../types';
import { X, Save, User as UserIcon, Building, Phone, MapPin, Tag } from 'lucide-react';

interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (clientData: any, ownerId: string) => void;
    users: User[];
    currentUser: User;
    preSelectedOwnerId?: string;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onSave, users, currentUser, preSelectedOwnerId }) => {
    const [formData, setFormData] = useState({
        businessName: '',
        ownerName: '',
        contact: '',
        address: '',
        category: CATEGORIES[1], // Default to first actual category
    });

    const [selectedOwnerId, setSelectedOwnerId] = useState<string>(
        preSelectedOwnerId && preSelectedOwnerId !== 'Todos'
            ? preSelectedOwnerId
            : (currentUser.role === 'admin' ? '' : currentUser.id)
    );
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.businessName || !formData.address) return;

        // If admin hasn't selected a salesperson, force selection or default?
        // Let's enforce selection for Admin
        if (currentUser.role === 'admin' && !selectedOwnerId) {
            alert("Por favor, selecione um vendedor para este cliente.");
            return;
        }

        setLoading(true);

        // Prepare RawClient-like structure
        const rawData = {
            'Razão Social': formData.businessName,
            'Nome do Proprietário': formData.ownerName,
            'Contato': formData.contact,
            'Endereço': formData.address,
            'Categoria': formData.category // We might need to handle this in enrichment if not in RawClient, 
            // but geminiService usually detects it. 
            // For manual, we pass it explicitly if possible or let AI confirm.
            // Actually, enricher uses 'Categoria' column if present.
        };

        // Pass data back to App
        onSave(rawData, selectedOwnerId);
        setLoading(false);
        onClose();

        // Reset form
        setFormData({
            businessName: '',
            ownerName: '',
            contact: '',
            address: '',
            category: CATEGORIES[1],
        });
    };

    const isAdmin = currentUser.role === 'admin';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">

                <div className="bg-blue-600 p-4 px-6 flex justify-between items-center">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <UserIcon className="w-5 h-5" /> Adicionar Novo Cliente
                    </h2>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors" aria-label="Fechar Modal">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Salesperson Selection (Admin Only) */}
                    {isAdmin && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                            <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Vendedor Responsável</label>
                            <select
                                value={selectedOwnerId}
                                onChange={(e) => setSelectedOwnerId(e.target.value)}
                                className="w-full bg-white border border-blue-200 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                                aria-label="Selecionar Vendedor Responsável"
                            >
                                <option value="" disabled>Selecione um vendedor...</option>
                                {users.filter(u => u.role === 'salesperson').map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                            <Building className="w-4 h-4 text-gray-400" /> Razão Social / Nome da Empresa *
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Ex: Auto Peças Silva"
                            value={formData.businessName}
                            onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                <UserIcon className="w-4 h-4 text-gray-400" /> Nome do Proprietário
                            </label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="Ex: João da Silva"
                                value={formData.ownerName}
                                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                                <Phone className="w-4 h-4 text-gray-400" /> Contato / Telefone
                            </label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="(00) 00000-0000"
                                value={formData.contact}
                                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                            <Tag className="w-4 h-4 text-gray-400" /> Categoria Principal
                        </label>
                        <select
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            aria-label="Selecionar Categoria do Cliente"
                        >
                            {CATEGORIES.filter(c => c !== 'Todos').map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                            <MapPin className="w-4 h-4 text-gray-400" /> Endereço Completo *
                        </label>
                        <textarea
                            required
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                            placeholder="Rua, Número, Bairro, Cidade - Estado (quanto mais completo, melhor a localização no mapa)"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                        <p className="text-xs text-gray-500 mt-1">O endereço será processado pela IA para gerar a localização exata.</p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2"
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar Cliente</>}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default AddClientModal;
