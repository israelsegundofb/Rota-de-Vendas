import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  APIProvider,
  Map,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
import { EnrichedClient } from '../types';
import { Store, User, Phone, MapPin, Tag, AlertCircle, Key, Globe, Plus, Minus, ShoppingBag } from 'lucide-react';

declare var google: any;

interface ClientMapProps {
  clients: EnrichedClient[];
  apiKey: string;
  onInvalidKey: () => void;
  productFilterActive?: boolean;
  highlightProductTerm?: string;
  activeProductCategory?: string;
}

const MapBoundsUpdater: React.FC<{ clients: EnrichedClient[] }> = ({ clients }) => {
  const map = useMap();
  const prevClientsLength = useRef(0);

  useEffect(() => {
    // Safety check for google object availability
    if (!map || !window.google || clients.length === 0) return;

    // Only refit bounds if the number of clients changed significantly or it's the first load
    const shouldUpdate = Math.abs(clients.length - prevClientsLength.current) > 0;

    if (shouldUpdate) {
      const bounds = new google.maps.LatLngBounds();
      let hasValidCoords = false;

      clients.forEach(client => {
        if (client.lat && client.lng) {
          bounds.extend({ lat: client.lat, lng: client.lng });
          hasValidCoords = true;
        }
      });

      if (hasValidCoords) {
        map.fitBounds(bounds);
        const listener = google.maps.event.addListenerOnce(map, "idle", () => {
          if (map.getZoom()! > 16) map.setZoom(16);
        });
        prevClientsLength.current = clients.length;
        return () => google.maps.event.removeListener(listener);
      }
    }
  }, [map, clients]);

  return null;
};

const MapZoomControls: React.FC = () => {
  const map = useMap();

  if (!map) return null;

  return (
    <div className="absolute bottom-6 right-4 flex flex-col gap-2 z-10 shadow-lg bg-transparent">
      <button
        onClick={() => map.setZoom((map.getZoom() || 0) + 1)}
        className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm focus:outline-none"
        title="Zoom In"
      >
        <Plus className="w-5 h-5" />
      </button>
      <button
        onClick={() => map.setZoom((map.getZoom() || 0) - 1)}
        className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm focus:outline-none"
        title="Zoom Out"
      >
        <Minus className="w-5 h-5" />
      </button>
    </div>
  );
};

// Colors by Region (Brazil)
const getRegionColor = (region: string) => {
  switch (region) {
    case 'Norte': return { bg: '#10B981', border: '#047857', glyph: '#fff' }; // Green
    case 'Nordeste': return { bg: '#F97316', border: '#C2410C', glyph: '#fff' }; // Orange (Sun)
    case 'Centro-Oeste': return { bg: '#EAB308', border: '#A16207', glyph: '#fff' }; // Yellow (Agro)
    case 'Sudeste': return { bg: '#3B82F6', border: '#1D4ED8', glyph: '#fff' }; // Blue (Industrial)
    case 'Sul': return { bg: '#8B5CF6', border: '#5B21B6', glyph: '#fff' }; // Purple (Cold)
    default: return { bg: '#6B7280', border: '#374151', glyph: '#fff' }; // Gray
  }
};

const shoppingBagSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
  <path d="M3 6h18"/>
  <path d="M16 10a4 4 0 0 1-8 0"/>
</svg>
`;

const ClientMapContent: React.FC<{
  clients: EnrichedClient[],
  onClientSelect: (id: string | null) => void,
  productFilterActive?: boolean
}> = ({ clients, onClientSelect, productFilterActive }) => {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<any[]>([]);

  // Optimization: Create a base DOM element for the glyph once, then clone it.
  const baseGlyphElement = useMemo(() => {
    const el = document.createElement('div');
    el.innerHTML = shoppingBagSvg;
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    return el;
  }, []);

  useEffect(() => {
    if (!map) return;

    // DEFENSIVE CHECK: If the key is invalid, google.maps.marker might not be loaded.
    // This prevents "Cannot read properties of undefined (reading 'PinElement')" during auth failures.
    if (!google.maps.marker) {
      console.warn("Google Maps Marker library not loaded. Likely an invalid API Key.");
      return;
    }

    // 1. Cleanup
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      (clustererRef.current as any).setMap(null);
    }
    markersRef.current.forEach(m => google.maps.event.clearInstanceListeners(m));
    markersRef.current = [];

    // 2. Init Clusterer with Performance Optimizations
    clustererRef.current = new MarkerClusterer({
      map,
      markers: [],
      algorithm: new SuperClusterAlgorithm({
        maxZoom: 13,
        radius: 80,
      })
    });

    // 3. Async Batch Processing (Optimization)
    let isActive = true;
    let index = 0;
    const BATCH_SIZE = 500;

    const processBatch = () => {
      if (!isActive) return;

      // Double check marker lib inside the loop just in case
      if (!google.maps.marker) return;

      const batch = clients.slice(index, index + BATCH_SIZE);
      if (batch.length === 0) return;

      const newMarkers = batch.map(client => {
        const colors = productFilterActive
          ? { bg: '#F43F5E', border: '#BE123C', glyph: '#fff' }
          : getRegionColor(client.region);

        let glyphElement: HTMLElement | null = null;
        if (productFilterActive) {
          glyphElement = baseGlyphElement.cloneNode(true) as HTMLElement;
          glyphElement.style.color = colors.glyph;
        }

        // Construct options carefully to avoid passing null to glyph property
        // Passing null to glyph triggers 'parameter 1 is not of type Node' in PinElement
        const pinOptions: any = {
          background: colors.bg,
          borderColor: colors.border,
          glyphColor: colors.glyph,
          scale: 1
        };

        if (glyphElement) {
          pinOptions.glyph = glyphElement;
        }

        const pin = new google.maps.marker.PinElement(pinOptions);

        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: client.lat, lng: client.lng },
          content: pin.element,
        });

        marker.addListener('click', () => {
          onClientSelect(client.id);
        });

        return marker;
      });

      if (clustererRef.current && isActive) {
        clustererRef.current.addMarkers(newMarkers);
        markersRef.current.push(...newMarkers);
      }

      index += BATCH_SIZE;
      if (index < clients.length) {
        requestAnimationFrame(processBatch);
      }
    };

    // Start processing
    processBatch();

    return () => {
      isActive = false;
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        (clustererRef.current as any).setMap(null);
      }
    };
  }, [map, clients, productFilterActive, onClientSelect, baseGlyphElement]);

  return <MapBoundsUpdater clients={clients} />;
};

const ClientMap: React.FC<ClientMapProps> = ({ clients, apiKey, onInvalidKey, productFilterActive, highlightProductTerm, activeProductCategory }) => {
  const defaultCenter = { lat: -14.235, lng: -51.9253 };
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  useEffect(() => {
    // Reset error when key changes (optimistic)
    if (apiKey) setAuthError(false);

    // Explicitly define the handler on the window object for global auth failure interception
    (window as any).gm_authFailure = () => {
      console.error("Google Maps Auth Failure detected via gm_authFailure.");
      setAuthError(true);
    };

    return () => {
      (window as any).gm_authFailure = () => { };

      // CRITICAL FIX: Aggressively remove Google Maps scripts from DOM.
      // This ensures that when the key changes (and this component unmounts/remounts),
      // the APIProvider will fetch the script again with the NEW key.
      // Without this, the browser keeps the old script (with the invalid key state) loaded.
      const scripts = document.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i--) {
        const script = scripts[i];
        if (script.src && script.src.includes('maps.googleapis.com/maps/api/js')) {
          script.parentNode?.removeChild(script);
        }
      }

      // Also clear the global google maps object to force re-initialization
      // if (window.google && window.google.maps) {
      // @ts-ignore
      // window.google.maps = undefined;
      // }
    };
  }, [apiKey]);

  const displayedProducts = useMemo(() => {
    if (!selectedClient?.purchasedProducts) return [];

    const hasTerm = !!highlightProductTerm;
    const hasCat = activeProductCategory && activeProductCategory !== 'Todos';

    if (!hasTerm && !hasCat) return selectedClient.purchasedProducts;

    const term = highlightProductTerm ? highlightProductTerm.toLowerCase() : '';
    const cat = activeProductCategory || '';

    return [...selectedClient.purchasedProducts].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Category match logic
      if (hasCat && a.category === cat) scoreA += 2;
      if (hasCat && b.category === cat) scoreB += 2;

      // Search term match logic (Expanded for Brand, Code, SKU, Name)
      if (hasTerm) {
        const matchA = a.name.toLowerCase().includes(term) ||
          a.sku.toLowerCase().includes(term) ||
          a.brand.toLowerCase().includes(term) ||
          a.factoryCode.toLowerCase().includes(term);
        if (matchA) scoreA += 1;

        const matchB = b.name.toLowerCase().includes(term) ||
          b.sku.toLowerCase().includes(term) ||
          b.brand.toLowerCase().includes(term) ||
          b.factoryCode.toLowerCase().includes(term);
        if (matchB) scoreB += 1;
      }

      return scoreB - scoreA;
    });
  }, [selectedClient, highlightProductTerm, activeProductCategory]);

  if (!apiKey) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-blue-200 p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <Key className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Configurar API Key</h3>
        <button onClick={onInvalidKey} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
          <Key className="w-4 h-4" /> Selecionar API Key
        </button>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-red-200 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Erro de Autenticação do Mapa</h3>
        <p className="text-sm text-gray-600 mb-4 max-w-xs">
          A chave de API atual é inválida para o Google Maps. Certifique-se de que a API "Maps JavaScript" está habilitada no console do Google Cloud.
        </p>
        <button onClick={onInvalidKey} className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-md">
          <Key className="w-4 h-4" /> Trocar API Key
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-sm border border-gray-200 relative z-0">
      <APIProvider
        apiKey={apiKey}
        libraries={['marker']}
        onLoad={() => console.log('Maps API loaded')}
      >
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={4}
          mapId="DEMO_MAP_ID"
          style={{ width: '100%', height: '100%' }}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          reuseMaps={true}
        >
          <ClientMapContent
            clients={clients}
            onClientSelect={setSelectedClientId}
            productFilterActive={productFilterActive}
          />

          <MapZoomControls />

          {selectedClient && (
            <InfoWindow
              position={{ lat: selectedClient.lat, lng: selectedClient.lng }}
              onCloseClick={() => setSelectedClientId(null)}
              headerContent={
                <div className="font-bold text-gray-800 text-sm flex items-center gap-2 pr-4">
                  <Store className="w-4 h-4 text-blue-600" />
                  {selectedClient.companyName}
                </div>
              }
            >
              <div className="min-w-[200px] max-w-[280px] p-1">
                <div className="space-y-2 text-xs text-gray-600 mt-1">
                  <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400">
                    <Globe className="w-3 h-3" />
                    {selectedClient.city} - {selectedClient.state} ({selectedClient.region})
                  </div>
                  <p className="flex items-center gap-2">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="font-medium text-gray-700">{selectedClient.ownerName || "Não informado"}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="font-medium text-gray-700">{selectedClient.contact || "Sem contato"}</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span className="leading-tight">{selectedClient.cleanAddress}</span>
                  </p>

                  {productFilterActive && displayedProducts.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-[10px] uppercase font-bold text-rose-600 mb-1 flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" />
                        Produtos Vendidos (Filtro)
                      </p>
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {displayedProducts.slice(0, 3).map((prod, idx) => {
                          const term = highlightProductTerm?.toLowerCase() || '';
                          const isMatch = term && (
                            prod.name.toLowerCase().includes(term) ||
                            prod.sku.toLowerCase().includes(term) ||
                            prod.brand.toLowerCase().includes(term) ||
                            prod.factoryCode.toLowerCase().includes(term)
                          );

                          return (
                            <div key={idx} className={`${isMatch ? 'bg-rose-100 border-rose-300' : 'bg-rose-50 border-rose-100'} p-1.5 rounded border flex justify-between items-center transition-colors`}>
                              <div className="flex flex-col overflow-hidden max-w-[120px]">
                                <span className={`truncate font-medium ${isMatch ? 'text-rose-950 font-bold' : 'text-rose-900'}`} title={prod.name}>
                                  {prod.name}
                                </span>
                                <span className="text-[9px] text-gray-500 truncate">{prod.sku} • {prod.brand}</span>
                              </div>
                              <span className="text-rose-700 font-bold">{prod.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                          );
                        })}
                        {displayedProducts.length > 3 && (
                          <p className="text-[10px] text-center text-gray-400 italic">e mais {displayedProducts.length - 3} itens...</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                      <Tag className="w-3 h-3" />
                      {selectedClient.category}
                    </span>
                    <a
                      href={selectedClient.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${selectedClient.lat},${selectedClient.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Rota
                    </a>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
};

export default ClientMap;