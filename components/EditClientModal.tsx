import React, { useState, useEffect } from 'react';
import { User, CATEGORIES, EnrichedClient } from '../types';
import { X, Save, User as UserIcon, Building, Phone, MapPin, Tag } from 'lucide-react';

interface EditClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedClient: EnrichedClient) => void;
    client: EnrichedClient | null;
    users: User[];
    currentUser: User;
}

const EditClientModal: React.FC<EditClientModalProps> = ({ isOpen, onClose, onSave, client, users, currentUser }) => {
    const [formData, setFormData] = useState({
        businessName: '',
        ownerName: '',
        contact: '',
        address: '',
        category: '',
        salespersonId: ''
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (client) {
            setFormData({
                businessName: client.companyName || '',
                ownerName: client.ownerName || '',
                contact: client.contact || '',
                address: client.cleanAddress || client.originalAddress || '',
                category: client.category || CATEGORIES[1],
                salespersonId: client.salespersonId || ''
            });
        }
    }, [client]);

    if (!isOpen || !client) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.businessName || !formData.address) return;

        setLoading(true);

        const updatedClient: EnrichedClient = {
            ...client,
            companyName: formData.businessName,
            ownerName: formData.ownerName,
            contact: formData.contact,
            cleanAddress: formData.address, // For now, we update the display address. Re-geocoding would require async logic similar to Add.
            category: formData.category,
            salespersonId: formData.salespersonId
        };

        onSave(updatedClient);
        setLoading(false);
        onClose();
    };

    const isAdmin = currentUser.role === 'admin';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-up">

                <div className="bg-blue-600 p-4 px-6 flex justify-between items-center">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <UserIcon className="w-5 h-5" /> Editar Cliente
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
                                value={formData.salespersonId}
                                onChange={(e) => setFormData({ ...formData, salespersonId: e.target.value })}
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
                            placeholder="Nome da Empresa"
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                                placeholder="Nome do Proprietário"
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                                placeholder="(00) 00000-0000"
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                value={formData.contact}
                                onChange={e => setFormData({ ...formData, contact: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                            <Tag className="w-4 h-4 text-gray-400" /> Categorias / Segmentos
                        </label>
                        <div className="border border-gray-300 rounded-lg p-2.5 bg-white min-h-[42px] flex flex-wrap gap-2 transition-all">
                            {formData.categories.map(cat => (
                                <span key={cat} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded flex items-center gap-1">
                                    {cat}
                                    <button
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            categories: formData.categories.filter(c => c !== cat)
                                        })}
                                        className="hover:text-blue-600 focus:outline-none"
                                        title={`Remover ${cat}`}
                                        aria-label={`Remover categoria ${cat}`}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            <select
                                className="text-sm outline-none bg-transparent flex-1 min-w-[120px]"
                                value=""
                                onChange={(e) => {
                                    if (e.target.value && !formData.categories.includes(e.target.value)) {
                                        setFormData({
                                            ...formData,
                                            categories: [...formData.categories, e.target.value]
                                        });
                                    }
                                }}
                                aria-label="Adicionar Categoria"
                            >
                                <option value="" disabled>+ Adicionar</option>
                                {CATEGORIES.filter(c => c !== 'Todos' && !formData.categories.includes(c)).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Selecione múltiplos segmentos.</p>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                            <MapPin className="w-4 h-4 text-gray-400" /> Endereço *
                        </label>
                        <textarea
                            required
                            rows={3}
                            aria-label="Endereço Completo"
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                        <p className="text-xs text-gray-400 mt-1 italic">
                            Nota: Alterar o endereço aqui apenas atualiza o texto. A localização no mapa (ícone) não será movida automaticamente nesta versão.
                        </p>
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
                            {loading ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar Alterações</>}
                        </button>
                    </div>

                </form>
            </div >
        </div >
    );
};

export default EditClientModal;
