import React from 'react';
import { MapPin, Store, Briefcase, ShoppingBag, ExternalLink, Edit2, Phone, Calendar } from 'lucide-react';
import { EnrichedClient } from '../types';

import { motion } from 'framer-motion';

interface ClientCardProps {
    client: EnrichedClient;
    onEdit: (client: EnrichedClient) => void;
    onAssignProducts: (client: EnrichedClient) => void;
    style?: React.CSSProperties;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, onEdit, onAssignProducts, style }) => {
    // Helper to get initials
    const getInitials = (name: string) => name.charAt(0).toUpperCase();

    // Helper for region colors (Consistent with ClientList)
    const getRegionColor = (region: string) => {
        switch (region) {
            case 'Nordeste': return 'bg-orange-100 text-orange-800';
            case 'Sudeste': return 'bg-blue-100 text-blue-800';
            case 'Sul': return 'bg-purple-100 text-purple-800';
            case 'Norte': return 'bg-green-100 text-green-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const hasPurchases = client.purchasedProducts && client.purchasedProducts.length > 0;
    const regionClass = getRegionColor(client.region);

    return (
        <motion.div
            style={style}
            className="p-2 h-full"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div
                className="h-full bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow duration-200 group relative flex flex-col overflow-hidden"
                whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
            >

                {/* Header / Banner */}
                <div className="flex justify-between items-start p-4 pb-2">
                    <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-lg shrink-0 border border-gray-200">
                            {getInitials(client.companyName)}
                        </div>

                        {/* Info */}
                        <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 truncate leading-tight mb-0.5" title={client.companyName}>
                                {client.companyName}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-gray-500 font-medium">{client.category.join(', ')}</span>
                                {client.mainCnae && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100" title={`CNAE: ${client.mainCnae}`}>
                                        <Briefcase className="w-2.5 h-2.5 mr-1" />
                                        {client.mainCnae}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Region Badge */}
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${regionClass}`}>
                        {client.region}
                    </span>
                </div>

                {/* Content Body */}
                <div className="px-4 py-2 space-y-2 flex-grow">
                    {/* Owner & Address */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Store className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate" title={client.ownerName}>{client.ownerName}</span>
                    </div>

                    <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 text-xs" title={client.cleanAddress}>{client.cleanAddress}</span>
                    </div>

                    {/* Purchase Stats (If any) */}
                    {hasPurchases && client.purchasedProducts && (
                        <div className="mt-2 pt-2 border-t border-dashed border-gray-100">
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                                <span className="flex items-center font-medium bg-green-50 px-2 py-0.5 rounded-md text-green-700 border border-green-100">
                                    <ShoppingBag className="w-3 h-3 mr-1" />
                                    {client.purchasedProducts.length} itens
                                </span>
                                <span className="text-gray-400">|</span>
                                <span className="text-gray-500">
                                    Última: {client.purchasedProducts[0]?.purchaseDate ? new Date(client.purchasedProducts[0].purchaseDate).toLocaleDateString('pt-BR') : 'N/A'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                        <button
                            onClick={() => onAssignProducts(client)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Atribuir/Ver Produtos"
                        >
                            <ShoppingBag className="w-4 h-4" />
                        </button>
                        <a
                            href={client.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(client.companyName + " " + client.cleanAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-900 rounded-lg transition-colors"
                            title="Ver no Google Maps"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>

                    <button
                        onClick={() => onEdit(client)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default React.memo(ClientCard);
