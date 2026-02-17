import * as React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { EnrichedClient, AppUser } from '../types';
import { Store, User, Phone, MapPin, Tag, AlertCircle, Key, Globe, Plus, Minus, ShoppingBag, Maximize2, Minimize2 } from 'lucide-react';

declare const google: any;

interface ClientMapProps {
  clients: EnrichedClient[];
  apiKey: string;
  onInvalidKey: () => void;
  productFilterActive?: boolean;
  highlightProductTerm?: string;
  activeProductCategory?: string;
  users?: AppUser[];
  filterContent?: React.ReactNode;
}

const MapBoundsUpdater: React.FC<{ clients: EnrichedClient[] }> = ({ clients }) => {
  const map = useMap();
  // Create a stable hash of coordinates to detect position changes
  const clientsHash = useMemo(() => {
    return clients.map(c => `${c.id}:${c.lat},${c.lng}`).join('|');
  }, [clients]);

  useEffect(() => {
    if (!map || !window.google || clients.length === 0) return;

    // Always update bounds if hash changes or initial load
    const bounds = new google.maps.LatLngBounds();
    let hasValidCoords = false;

    clients.forEach(client => {
      const lat = Number(client.lat);
      const lng = Number(client.lng);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        bounds.extend({ lat, lng });
        hasValidCoords = true;
      }
    });

    if (hasValidCoords) {
      map.fitBounds(bounds);

      // Optional: Prevent too much zoom on single point
      const listener = google.maps.event.addListenerOnce(map, "idle", () => {
        if (map.getZoom()! > 16) map.setZoom(16);
      });
      return () => google.maps.event.removeListener(listener);
    }
  }, [map, clientsHash]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

const MapZoomControls: React.FC = () => {
  const map = useMap();
  if (!map) return null;
  return (
    <div className="absolute bottom-[75px] right-4 flex flex-row gap-2 z-10">
      <button
        onClick={() => map.setZoom((map.getZoom() || 0) + 1)}
        className="bg-white p-2.5 rounded-xl border border-outline-variant shadow-elevation-2 text-on-surface hover:bg-primary-container hover:text-primary transition-all active:scale-95 focus:outline-none"
        title="Aproximar (Zoom In)"
        aria-label="Aproximar zoom"
      >
        <Plus className="w-5 h-5" />
      </button>
      <button
        onClick={() => map.setZoom((map.getZoom() || 0) - 1)}
        className="bg-white p-2.5 rounded-xl border border-outline-variant shadow-elevation-2 text-on-surface hover:bg-primary-container hover:text-primary transition-all active:scale-95 focus:outline-none"
        title="Afastar (Zoom Out)"
        aria-label="Afastar zoom"
      >
        <Minus className="w-5 h-5" />
      </button>
    </div>
  );
};

const getRegionColor = (region: string) => {
  switch (region) {
    case 'Norte': return { bg: '#10B981', border: '#047857', glyph: '#fff' };
    case 'Nordeste': return { bg: '#F97316', border: '#C2410C', glyph: '#fff' };
    case 'Centro-Oeste': return { bg: '#EAB308', border: '#A16207', glyph: '#fff' };
    case 'Sudeste': return { bg: '#3B82F6', border: '#1D4ED8', glyph: '#fff' };
    case 'Sul': return { bg: '#8B5CF6', border: '#5B21B6', glyph: '#fff' };
    default: return { bg: '#6B7280', border: '#374151', glyph: '#fff' };
  }
};

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
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
  productFilterActive?: boolean,
  users?: AppUser[],
  isClusteringEnabled: boolean
}> = ({ clients, onClientSelect, productFilterActive, users, isClusteringEnabled }) => {
  const map = useMap();
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<any[]>([]);

  const baseGlyphElement = useMemo(() => {
    const el = document.createElement('div');
    el.innerHTML = shoppingBagSvg;
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    return el;
  }, []);

  const userColorMap = useMemo(() => {
    const map = new Map<string, { bg: string, border: string, glyph: string }>();
    if (!users) return map;
    users.forEach(u => {
      let color = { bg: '#6B7280', border: '#374151', glyph: '#fff' };
      if (u.color) {
        color = { bg: u.color, border: 'black', glyph: '#fff' };
      } else {
        const genColor = stringToColor(u.id + u.name);
        color = { bg: genColor, border: 'black', glyph: '#fff' };
      }
      map.set(u.id, color);
    });
    return map;
  }, [users]);

  useEffect(() => {
    if (!map) return;
    if (!google.maps.marker) return;

    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      (clustererRef.current as any).setMap(null);
    }
    markersRef.current.forEach(m => {
      m.map = null;
      google.maps.event.clearInstanceListeners(m);
    });
    markersRef.current = [];

    if (isClusteringEnabled) {
      clustererRef.current = new (MarkerClusterer as any)({
        map,
        markers: [],
      }) as MarkerClusterer;
    } else {
      clustererRef.current = null;
    }

    let isActive = true;
    let index = 0;
    const BATCH_SIZE = 200;

    const processBatch = () => {
      if (!isActive) return;
      if (!google.maps.marker) return;

      const batch = clients.slice(index, index + BATCH_SIZE);
      if (batch.length === 0) return;

      const newMarkers = batch
        .filter(client => {
          const lat = Number(client.lat);
          const lng = Number(client.lng);
          return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        })
        .map(client => {
          let colors = { bg: '#6B7280', border: '#374151', glyph: '#fff' };
          if (productFilterActive) {
            colors = { bg: '#F43F5E', border: '#BE123C', glyph: '#fff' };
          } else {
            const userColor = userColorMap.get(client.salespersonId);
            if (userColor) {
              colors = userColor;
            } else if (client.ownerName) {
              const genColor = stringToColor(client.ownerName);
              colors = { bg: genColor, border: 'black', glyph: '#fff' };
            } else {
              colors = getRegionColor(client.region);
            }
          }

          let glyphElement: HTMLElement | null = null;
          if (productFilterActive) {
            glyphElement = baseGlyphElement.cloneNode(true) as HTMLElement;
            glyphElement.style.color = colors.glyph;
          }

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
            map: isClusteringEnabled ? null : map,
            title: client.companyName
          });

          marker.addListener('click', () => {
            onClientSelect(client.id);
          });
          return marker;
        });

      if (isActive) {
        if (isClusteringEnabled && clustererRef.current) {
          clustererRef.current.addMarkers(newMarkers);
        }
        markersRef.current.push(...newMarkers);
      }

      index += BATCH_SIZE;
      if (index < clients.length) {
        requestAnimationFrame(processBatch);
      }
    };

    processBatch();
    return () => {
      isActive = false;
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        (clustererRef.current as any).setMap(null);
      }
      markersRef.current.forEach(m => {
        m.map = null;
      });
    };
  }, [map, clients, productFilterActive, onClientSelect, baseGlyphElement, userColorMap, isClusteringEnabled]);

  return <MapBoundsUpdater clients={clients} />;
};

const ClientMap: React.FC<ClientMapProps> = ({ clients, apiKey, onInvalidKey, productFilterActive, highlightProductTerm, users, filterContent }) => {
  const defaultCenter = { lat: -14.235, lng: -51.9253 };
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isClusteringEnabled, setIsClusteringEnabled] = useState(true);

  const selectedClient = clients.find(c => c.id === selectedClientId);

  useEffect(() => {
    if (apiKey) setAuthError(false);
    (window as any).gm_authFailure = () => {
      console.error("Google Maps Auth Failure detected via gm_authFailure.");
      setAuthError(true);
    };

    return () => {
      (window as any).gm_authFailure = () => { };
      const scripts = document.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i--) {
        const script = scripts[i];
        if (script.src && script.src.includes('maps.googleapis.com/maps/api/js')) {
          script.parentNode?.removeChild(script);
        }
      }
    };
  }, [apiKey]);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

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

  const containerClass = isFullScreen
    ? "fixed inset-0 z-50 bg-white h-screen w-screen"
    : "h-full w-full rounded-lg overflow-hidden shadow-sm border border-gray-200 relative z-0";

  return (
    <div className={containerClass}>
      <APIProvider
        apiKey={apiKey}
        libraries={['marker']}
        onLoad={() => console.log('Maps API loaded')}
      >
        <GoogleMap
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
            users={users}
            isClusteringEnabled={isClusteringEnabled}
          />

          <MapZoomControls />

          {isFullScreen && filterContent && (
            <div className="absolute top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm shadow-md border-b border-gray-200">
              {filterContent}
              <div className="flex justify-end gap-2 px-3 py-1.5 border-t border-gray-100 bg-gray-50/80">
                <button
                  onClick={() => setIsClusteringEnabled(!isClusteringEnabled)}
                  className={`p-1.5 px-3 rounded-lg border text-gray-600 transition-colors shadow-sm focus:outline-none flex items-center gap-2 text-xs font-bold ${isClusteringEnabled ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                  title={isClusteringEnabled ? "Desativar Agrupamento" : "Ativar Agrupamento"}
                >
                  {isClusteringEnabled ? (
                    <>
                      <div className="flex -space-x-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <div className="w-2 h-2 rounded-full bg-blue-500/50"></div>
                      </div>
                      Agrupado
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3 h-3" />
                      Solto
                    </>
                  )}
                </button>
                <button
                  onClick={toggleFullScreen}
                  className="bg-white p-1.5 px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm focus:outline-none flex items-center gap-2 text-xs font-bold"
                  title="Sair da Tela Cheia"
                >
                  <Minimize2 className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </div>
          )}

          {!isFullScreen && (
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <button
                onClick={() => setIsClusteringEnabled(!isClusteringEnabled)}
                className={`p-2 rounded-lg border text-gray-600 transition-colors shadow-sm focus:outline-none flex items-center gap-2 text-xs font-bold ${isClusteringEnabled ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                title={isClusteringEnabled ? "Desativar Agrupamento" : "Ativar Agrupamento"}
              >
                {isClusteringEnabled ? (
                  <>
                    <div className="flex -space-x-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <div className="w-2 h-2 rounded-full bg-blue-500/50"></div>
                    </div>
                    Agrupado
                  </>
                ) : (
                  <>
                    <MapPin className="w-3 h-3" />
                    Solto
                  </>
                )}
              </button>
              <button
                onClick={toggleFullScreen}
                className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm focus:outline-none"
                title="Tela Cheia"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          )}

          {isFullScreen && !filterContent && (
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <button
                onClick={() => setIsClusteringEnabled(!isClusteringEnabled)}
                className={`p-2 rounded-lg border text-gray-600 transition-colors shadow-sm focus:outline-none flex items-center gap-2 text-xs font-bold ${isClusteringEnabled ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                title={isClusteringEnabled ? "Desativar Agrupamento" : "Ativar Agrupamento"}
              >
                {isClusteringEnabled ? (
                  <>
                    <div className="flex -space-x-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <div className="w-2 h-2 rounded-full bg-blue-500/50"></div>
                    </div>
                    Agrupado
                  </>
                ) : (
                  <>
                    <MapPin className="w-3 h-3" />
                    Solto
                  </>
                )}
              </button>
              <button
                onClick={toggleFullScreen}
                className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm focus:outline-none"
                title="Sair da Tela Cheia"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>
          )}

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
              <div className="min-w-[240px] max-w-[320px] p-1">
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

                  <div className="flex items-center gap-2 mt-1 mb-1 text-[10px] font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100 w-fit">
                    <span className="flex items-center gap-1" title="Total de itens comprados">
                      <span className="font-bold text-gray-800">{selectedClient.purchasedProducts?.length || 0}</span> Prod.
                    </span>
                    <div className="h-3 w-px bg-gray-300"></div>
                    <span className="flex items-center gap-1" title="Quantidade de SKUs únicos">
                      <span className="font-bold text-gray-800">{new Set(selectedClient.purchasedProducts?.map(p => p.sku) || []).size}</span> SKUs
                    </span>
                  </div>

                  <p className="flex items-start gap-2">
                    <MapPin className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span className="leading-tight">{selectedClient.cleanAddress}</span>
                  </p>

                  {/* SCROLLABLE PRODUCT LIST */}
                  {selectedClient.purchasedProducts && selectedClient.purchasedProducts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[10px] uppercase font-bold text-blue-600 mb-1.5 flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        Produtos Adquiridos
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-2 custom-scrollbar">
                        {selectedClient.purchasedProducts.map((prod, idx) => {
                          const term = highlightProductTerm?.toLowerCase() || '';
                          const isMatch = term && (
                            (prod.name || '').toLowerCase().includes(term) ||
                            (prod.sku || '').toLowerCase().includes(term) ||
                            (prod.brand || '').toLowerCase().includes(term) ||
                            (prod.factoryCode || '').toLowerCase().includes(term)
                          );

                          return (
                            <div key={idx} className={`${isMatch ? 'bg-amber-50 border-amber-200 ring-1 ring-amber-100' : 'bg-gray-50 border-gray-100'} p-2 rounded-lg border flex flex-col gap-0.5 transition-all shadow-sm`}>
                              <div className="flex justify-between items-start gap-2">
                                <span className={`text-[10px] font-black leading-tight ${isMatch ? 'text-amber-900' : 'text-gray-800'} line-clamp-2`} title={prod.name}>
                                  {prod.name}
                                </span>
                                <span className="text-[10px] font-black text-blue-700 whitespace-nowrap">
                                  {prod.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase tracking-tighter mt-0.5">
                                <span className="flex items-center gap-0.5 bg-gray-200/50 px-1 rounded">SKU: {prod.sku}</span>
                                <span className="text-gray-300">•</span>
                                <span className="truncate">{prod.brand || 'Sem Marca'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                      <Tag className="w-3 h-3 mr-1" />
                      {selectedClient.category.join(', ')}
                    </span>
                    {selectedClient.mainCnae && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-50 text-purple-700 border border-purple-100 ml-1 truncate max-w-[120px]" title={selectedClient.mainCnae}>
                        {selectedClient.mainCnae}
                      </span>
                    )}
                    <a
                      href={selectedClient.googleMapsUri || `https://www.google.com/maps/dir/?api=1&destination=${selectedClient.lat},${selectedClient.lng}`}
                      target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium"
                    >
                      Rota
                    </a>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </APIProvider>
    </div>
  );
};

export default ClientMap;