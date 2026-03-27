import React from 'react';
import { MapPin, ShoppingBag, ExternalLink, Edit2, AlertCircle } from 'lucide-react';
import { EnrichedClient, Product, AppUser } from '../types';
import { getFilteredPurchases } from '../utils/purchaseUtils';

interface ClientCardProps {
    client: EnrichedClient;
    onEdit: (client: EnrichedClient) => void;
    onAssignProducts: (client: EnrichedClient) => void;
    style?: React.CSSProperties;
    filterSalespersonId?: string;
    startDate?: string | null;
    endDate?: string | null;
}

const ClientCard: React.FC<ClientCardProps> = ({
    client,
    onEdit,
    onAssignProducts,
    style,
    filterSalespersonId,
    startDate,
    endDate
}) => {
    // Determine if we have valid purchases for the current UI context
    const activePurchases = getFilteredPurchases(
        client.purchasedProducts,
        filterSalespersonId,
        startDate || undefined,
        endDate || undefined
    );
    const hasPurchases = activePurchases.length > 0;

    // Helper to get initials
    const getInitials = (name: string) => name.charAt(0).toUpperCase();

    // Determine region color
    const getRegionClass = (region: string) => {
        switch (region) {
            case 'Sul': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Norte': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Nordeste': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Sudeste': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Centro-Oeste': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const regionClass = getRegionClass(client.region);

    // Check if coordinates exist
    const hasCoordinates = client.lat && client.lng && Number(client.lat) !== 0 && Number(client.lng) !== 0;

    return (
        <div className="h-full" style={style}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full group">
                {/* Header with Avatar and Region */}
                <div className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg shadow-sm border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                {getInitials(client.companyName)}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-1" title={client.companyName}>
                                    {client.companyName}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${regionClass}`}>
                                        {client.region}
                                    </span>
                                    {client.state && (
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                                            {client.state}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm text-gray-600">
                        {hasCoordinates ? (
                            <div title="Endereço Geolocalizado"><MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /></div>
                        ) : (
                            <div title="Aguardando Coordenadas (Pendente)"><AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /></div>
                        )}
                        <span className="line-clamp-2 text-xs" title={client.cleanAddress}>{client.cleanAddress || 'Endereço não cadastrado'}</span>
                    </div>

                    {/* Purchase Stats (If any) */}
                    {hasPurchases && (
                        <div className="mt-2 pt-2 border-t border-dashed border-gray-100">
                            <div className="flex items-center gap-3 text-xs text-gray-600">
                                <span className="flex items-center font-medium bg-green-50 px-2 py-0.5 rounded-md text-green-700 border border-green-100" title="Itens que atendem aos filtros atuais">
                                    <ShoppingBag className="w-3 h-3 mr-1" />
                                    {activePurchases.length} itens {filterSalespersonId !== 'Todos' || startDate || endDate ? '(Filtrado)' : ''}
                                </span>
                                <span className="text-gray-400">|</span>
                                <span className="text-gray-500">
                                    Última: {activePurchases[0]?.purchaseDate ? new Date(activePurchases[0].purchaseDate).toLocaleDateString('pt-BR') : 'N/A'}
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
                        
                        {hasCoordinates && (
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
                        )}
                    </div>

                    <button
                        onClick={() => onEdit(client)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(ClientCard);
