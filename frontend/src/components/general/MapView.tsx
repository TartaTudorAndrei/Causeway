import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { LocationItem } from '../../types/general';
import type { HrStand, HrMember } from '../../types/hr';
import type { Club } from '../../types/adminAuth';
import { buildGeneralDeepSearchIndex } from '../../utils/generalDeepSearch';
import { loadGoogleMaps } from '../../utils/googleMapsLoader';
import { MapPin, Pencil, Trash2, Navigation } from 'lucide-react';
import { ConfirmationModal, Modal } from '../common';
import { LocationModal } from './LocationModal';

interface MapViewProps {
  locations: LocationItem[];
  stands?: HrStand[];
  members?: HrMember[];
  clubs?: Club[];
  isLoading: boolean;
  canWrite: boolean;
  isDarkMode: boolean;
  searchQuery: string;
  typeFilter: string; // 'ALL' | 'STAND' | 'DEPOSIT'
  onSaveLocation: (location: Partial<LocationItem>, id?: string) => Promise<void>;
  onDeleteLocation: (id: string) => Promise<void>;
  isAddLocationModalOpen: boolean;
  setIsAddLocationModalOpen: (open: boolean) => void;
  isLocationsModalOpen: boolean;
  setIsLocationsModalOpen: (open: boolean) => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

const DEFAULT_MAP_CENTER = { lat: 46.7712, lng: 23.6236 };

const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#18181b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#18181b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a1a1aa' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#f4f4f5' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.stroke', stylers: [{ color: '#18181b' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#27272a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#18181b' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#71717a' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3f3f46' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#09090b' }] },
];

const LIGHT_MAP_STYLES = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

export const MapView: React.FC<MapViewProps> = ({
  locations,
  stands = [],
  members = [],
  clubs = [],
  isLoading,
  canWrite,
  isDarkMode,
  searchQuery,
  typeFilter,
  onSaveLocation,
  onDeleteLocation,
  isAddLocationModalOpen,
  setIsAddLocationModalOpen,
  isLocationsModalOpen,
  setIsLocationsModalOpen,
  showToast,
}) => {
  const { t } = useLanguage();

  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [googleLoadError, setGoogleLoadError] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [viewingLocation, setViewingLocation] = useState<LocationItem | null>(null);
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);

  // Global bridge for InfoWindow HTML button clicks
  useEffect(() => {
    const handler = (id: string) => {
      const found = locations.find((l) => l.id === id);
      if (found) {
        setViewingLocation(found);
      }
    };
    (window as any).__app_viewLocation = handler;
    return () => {
      delete (window as any).__app_viewLocation;
    };
  }, [locations]);

  const searchIndex = useMemo(() => {
    return buildGeneralDeepSearchIndex({
      query: searchQuery,
      stands,
      tasks: [],
      events: [],
      locations,
      members,
      clubs,
    });
  }, [searchQuery, stands, locations, members, clubs]);

  // Filtered locations based on search and type
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchesType = typeFilter === 'ALL' || !typeFilter || loc.type === typeFilter;
      const matchesSearch = searchIndex.matchesLocation(loc);
      return matchesType && matchesSearch;
    });
  }, [locations, typeFilter, searchIndex]);

  // Initialize or re-render Google Maps
  const initMap = useCallback(() => {
    loadGoogleMaps()
      .then((googleMaps) => {
        const attachMap = () => {
          if (!mapElementRef.current) {
            requestAnimationFrame(attachMap);
            return;
          }
          setIsGoogleLoaded(true);
          setGoogleLoadError(false);

          if (!mapInstanceRef.current) {
            const map = new googleMaps.Map(mapElementRef.current, {
              center: DEFAULT_MAP_CENTER,
              zoom: 13,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
              clickableIcons: false,
              styles: isDarkMode ? DARK_MAP_STYLES : LIGHT_MAP_STYLES,
            });

            mapInstanceRef.current = map;
            infoWindowRef.current = new googleMaps.InfoWindow();
          } else {
            mapInstanceRef.current.setOptions({
              styles: isDarkMode ? DARK_MAP_STYLES : LIGHT_MAP_STYLES,
            });
            googleMaps.event.trigger(mapInstanceRef.current, 'resize');
          }
        };

        attachMap();
      })
      .catch(() => {
        setIsGoogleLoaded(false);
        setGoogleLoadError(true);
      });
  }, [isDarkMode]);

  useEffect(() => {
    initMap();
  }, [initMap]);

  useEffect(() => {
    if (!mapElementRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current && (window as any).google?.maps) {
        (window as any).google.maps.event.trigger(mapInstanceRef.current, 'resize');
      }
    });
    observer.observe(mapElementRef.current);
    return () => observer.disconnect();
  }, [isGoogleLoaded]);

  // Helper to build InfoWindow content with directions CTA and dark/light mode styling
  const getInfoWindowContent = useCallback((loc: LocationItem) => {
    const isStand = loc.type === 'STAND';
    const typeBadge = isStand
      ? `<span style="display:inline-flex;align-items:center;background-color:${isDarkMode ? 'rgba(59,130,246,0.15)' : '#eff6ff'};color:${isDarkMode ? '#60a5fa' : '#2563eb'};border:1px solid ${isDarkMode ? 'rgba(59,130,246,0.3)' : '#bfdbfe'};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;white-space:nowrap;flex-shrink:0;">${t('general.typeStand', 'Stand')}</span>`
      : `<span style="display:inline-flex;align-items:center;background-color:${isDarkMode ? 'rgba(245,158,11,0.15)' : '#fef3c7'};color:${isDarkMode ? '#f59e0b' : '#d97706'};border:1px solid ${isDarkMode ? 'rgba(245,158,11,0.3)' : '#fde68a'};padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;text-transform:uppercase;white-space:nowrap;flex-shrink:0;">${t('general.typeDeposit', 'Depozit')}</span>`;

    const destinationParam =
      loc.latitude != null && loc.longitude != null
        ? `${loc.latitude},${loc.longitude}`
        : encodeURIComponent(loc.name + (loc.address ? ` ${loc.address}` : ''));
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}`;

    const textColor = isDarkMode ? '#f4f4f5' : '#09090b';
    const btnBg = isDarkMode ? '#27272a' : '#f4f4f5';
    const btnBorder = isDarkMode ? '#3f3f46' : '#d4d4d8';
    const btnText = isDarkMode ? '#e4e4e7' : '#18181b';

    return `
      <div style="font-family:inherit;min-width:210px;max-width:260px;padding:2px 0;">
        <div style="display:flex;align-items:center;gap:6px;padding-right:24px;min-height:22px;margin-bottom:8px;">
          <strong style="font-size:13px;font-weight:700;line-height:1.2;color:${textColor};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;" title="${loc.name}">
            ${loc.name}
          </strong>
          ${typeBadge}
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button
            type="button"
            onclick="window.__app_viewLocation && window.__app_viewLocation('${loc.id}')"
            style="flex:1;height:28px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;padding:0 8px;border-radius:8px;background-color:${btnBg};border:1px solid ${btnBorder};color:${btnText};font-size:11px;font-weight:600;cursor:pointer;line-height:1;margin:0;transition:background-color 0.15s ease;"
          >
            ${t('general.viewDetails', 'Vezi detalii')}
          </button>
          <a
            href="${directionsUrl}"
            target="_blank"
            rel="noopener noreferrer"
            style="flex:1;height:28px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:0 8px;border-radius:8px;background-color:#2563eb;border:1px solid #2563eb;color:#ffffff;font-size:11px;font-weight:700;text-decoration:none;text-align:center;line-height:1;margin:0;transition:background-color 0.15s ease;"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
              <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
            <span>${t('general.getDirections', 'Direcții')}</span>
          </a>
        </div>
      </div>
    `;
  }, [t, isDarkMode]);

  // Update map markers when filteredLocations or google maps instance changes
  useEffect(() => {
    if (!isGoogleLoaded || !mapInstanceRef.current || typeof window === 'undefined' || !(window as any).google?.maps) {
      return;
    }

    const googleMaps = (window as any).google.maps;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new googleMaps.LatLngBounds();
    let hasValidCoords = false;

    filteredLocations.forEach((loc) => {
      if (loc.latitude == null || loc.longitude == null || isNaN(loc.latitude) || isNaN(loc.longitude)) {
        return;
      }

      hasValidCoords = true;
      const position = { lat: loc.latitude, lng: loc.longitude };
      bounds.extend(position);

      const isStand = loc.type === 'STAND';
      const pinColor = isStand ? '#3b82f6' : '#f59e0b'; // Blue for STAND, Amber for DEPOSIT

      // Marker SVG Icon
      const svgIcon = {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: pinColor,
        fillOpacity: 1,
        strokeWeight: 1.5,
        strokeColor: '#ffffff',
        scale: 1.6,
        anchor: new googleMaps.Point(12, 22),
      };

      const marker = new googleMaps.Marker({
        position,
        map: mapInstanceRef.current,
        title: loc.name,
        icon: svgIcon,
      });

      marker.addListener('click', () => {
        setSelectedLocation(loc);
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(getInfoWindowContent(loc));
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
      });

      markersRef.current.push(marker);
    });

    if (hasValidCoords && markersRef.current.length > 0) {
      if (markersRef.current.length === 1) {
        mapInstanceRef.current.setCenter(bounds.getCenter());
        mapInstanceRef.current.setZoom(15);
      } else {
        mapInstanceRef.current.fitBounds(bounds);
      }
    }

    googleMaps.event.trigger(mapInstanceRef.current, 'resize');
  }, [filteredLocations, isGoogleLoaded, getInfoWindowContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (mapInstanceRef.current && (window as any).google?.maps?.event) {
        (window as any).google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Pan to a specific location on map
  const handlePanToLocation = useCallback((loc: LocationItem) => {
    setSelectedLocation(loc);
    if (
      loc.latitude != null &&
      loc.longitude != null &&
      mapInstanceRef.current &&
      (window as any).google?.maps
    ) {
      mapInstanceRef.current.panTo({ lat: loc.latitude, lng: loc.longitude });
      mapInstanceRef.current.setZoom(16);

      // Find marker and open infoWindow
      const marker = markersRef.current.find(
        (m) =>
          Math.abs(m.getPosition().lat() - loc.latitude!) < 0.0001 &&
          Math.abs(m.getPosition().lng() - loc.longitude!) < 0.0001
      );
      if (marker && infoWindowRef.current) {
        infoWindowRef.current.setContent(getInfoWindowContent(loc));
        infoWindowRef.current.open(mapInstanceRef.current, marker);
      }
    }
  }, [getInfoWindowContent]);

  const cardBg = isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-white border-zinc-200 shadow-sm';
  const textPrimary = isDarkMode ? 'text-white' : 'text-zinc-900';
  const textSecondary = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      {/* Global styling overrides for Google Maps InfoWindow adhering to Dark / Light Mode */}
      <style>{`
        .gm-style-iw.gm-style-iw-c {
          background-color: ${isDarkMode ? '#18181b' : '#ffffff'} !important;
          border: 1px solid ${isDarkMode ? '#27272a' : '#e4e4e7'} !important;
          border-radius: 14px !important;
          padding: 8px 10px 8px 10px !important;
          box-shadow: 0 10px 25px -5px ${isDarkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.15)'} !important;
        }
        .gm-style-iw-d {
          overflow: hidden !important;
          padding: 0 !important;
          max-height: none !important;
        }
        .gm-style-iw-tc::after {
          background: ${isDarkMode ? '#18181b' : '#ffffff'} !important;
        }
        .gm-ui-hover-effect {
          position: absolute !important;
          top: 8px !important;
          right: 8px !important;
          width: 22px !important;
          height: 22px !important;
          padding: 0 !important;
          margin: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 6px !important;
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
          z-index: 10 !important;
          opacity: 0.8 !important;
          transition: background-color 0.15s ease, opacity 0.15s ease !important;
        }
        .gm-ui-hover-effect:hover {
          opacity: 1 !important;
          background-color: ${isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)'} !important;
        }
        .gm-ui-hover-effect > span {
          display: block !important;
          width: 12px !important;
          height: 12px !important;
          margin: 0 !important;
          pointer-events: none !important;
          background-color: ${isDarkMode ? '#ffffff' : '#374151'} !important;
          -webkit-mask-size: contain !important;
          mask-size: contain !important;
          -webkit-mask-repeat: no-repeat !important;
          mask-repeat: no-repeat !important;
          -webkit-mask-position: center !important;
          mask-position: center !important;
        }
        .gm-ui-hover-effect > img {
          display: block !important;
          width: 12px !important;
          height: 12px !important;
          margin: 0 !important;
          pointer-events: none !important;
          ${isDarkMode ? 'filter: invert(1) brightness(1.2) !important;' : ''}
        }
      `}</style>

      {/* Main Map Canvas */}
      <div className={`flex-1 w-full rounded-2xl border overflow-hidden relative flex flex-col min-h-0 ${cardBg}`}>
        <div className="relative w-full h-full flex-1 min-h-0 bg-zinc-900">
          {/* Dedicated Google Maps DOM container - no React children inside */}
          <div
            ref={mapElementRef}
            className="absolute inset-0 w-full h-full"
          />

          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/60 backdrop-blur-xs pointer-events-none">
              <span className="text-xs text-zinc-400 animate-pulse">
                {t('general.loadingMap', 'Se încarcă harta...')}
              </span>
            </div>
          )}

          {googleLoadError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/90 space-y-3">
              <MapPin className="w-10 h-10 text-amber-500 opacity-60" />
              <div className="max-w-md space-y-1">
                <h4 className="text-sm font-bold text-white">
                  {t('general.googleMapsNoticeTitle', 'Harta Google Maps')}
                </h4>
                <p className="text-xs text-zinc-400">
                  {t(
                    'general.googleMapsNoticeDesc',
                    'Pentru harta interactivă integrată, asigurați-vă că VITE_GOOGLE_MAPS_API_KEY este setat în .env.'
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={initMap}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  {t('common.retry', 'Reîncearcă')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Locations List Modal */}
      {isLocationsModalOpen && (
        <Modal
          isOpen={isLocationsModalOpen}
          onClose={() => setIsLocationsModalOpen(false)}
          title={`${t('general.locationsList', 'Listă Locații')} (${filteredLocations.length})`}
          icon={MapPin}
          iconColor="text-blue-400"
          maxWidth="lg"
          isDarkMode={isDarkMode}
        >
          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {filteredLocations.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                {t('general.noLocationsFound', 'Nicio locație găsită conform filtrelor.')}
              </div>
            ) : (
              filteredLocations.map((loc) => {
                const isSelected = selectedLocation?.id === loc.id;
                const isStand = loc.type === 'STAND';

                return (
                  <div
                    key={loc.id}
                    onClick={() => {
                      handlePanToLocation(loc);
                      setIsLocationsModalOpen(false);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-zinc-900 border-blue-500/50 ring-1 ring-blue-500/30'
                          : 'bg-blue-50/50 border-blue-400 ring-1 ring-blue-300'
                        : isDarkMode
                        ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                        : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border uppercase tracking-wider ${
                              isStand
                                ? isDarkMode
                                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                  : 'bg-blue-50 text-blue-600 border-blue-200'
                                : isDarkMode
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-amber-50 text-amber-600 border-amber-200'
                            }`}
                          >
                            {isStand ? t('general.typeStand', 'Stand') : t('general.typeDeposit', 'Depozit')}
                          </span>
                          <h4 className={`font-bold text-xs truncate ${textPrimary}`}>{loc.name}</h4>
                        </div>

                        {loc.address && (
                          <p className={`text-[11px] ${textSecondary} mt-1.5 truncate`}>
                            {loc.address}
                          </p>
                        )}

                        {loc.latitude != null && loc.longitude != null && (
                          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                            {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                          </p>
                        )}
                      </div>

                      {/* Card Action Controls */}
                      <div className="flex items-center space-x-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            const dest =
                              loc.latitude != null && loc.longitude != null
                                ? `${loc.latitude},${loc.longitude}`
                                : encodeURIComponent(loc.name + (loc.address ? ` ${loc.address}` : ''));
                            window.open(
                              `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
                              '_blank',
                              'noopener,noreferrer'
                            );
                          }}
                          title={t('general.getDirections', 'Direcții')}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            isDarkMode
                              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
                          }`}
                        >
                          <Navigation className="w-3.5 h-3.5" />
                        </button>

                        {canWrite && !loc.isSystem && (
                          <>
                            <button
                              onClick={() => {
                                setIsLocationsModalOpen(false);
                                setEditingLocation(loc);
                              }}
                              title={t('common.edit', 'Editează')}
                              className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setIsLocationsModalOpen(false);
                                setDeletingLocationId(loc.id);
                              }}
                              title={t('common.delete', 'Șterge')}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Modal>
      )}

      {/* Location Details Modal */}
      {viewingLocation && (
        <Modal
          isOpen={Boolean(viewingLocation)}
          onClose={() => setViewingLocation(null)}
          title={
            <div className="flex items-center space-x-2.5 min-w-0">
              <span className="truncate">{viewingLocation.name}</span>
              <span
                className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border uppercase tracking-wider shrink-0 ${
                  viewingLocation.type === 'STAND'
                    ? isDarkMode
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      : 'bg-blue-50 text-blue-600 border-blue-200'
                    : isDarkMode
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-amber-50 text-amber-600 border-amber-200'
                }`}
              >
                {viewingLocation.type === 'STAND' ? t('general.typeStand', 'Stand') : t('general.typeDeposit', 'Depozit')}
              </span>
            </div>
          }
          icon={MapPin}
          iconColor="text-blue-400"
          maxWidth="md"
          isDarkMode={isDarkMode}
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                {canWrite && !viewingLocation.isSystem && (
                  <>
                    <button
                      onClick={() => {
                        const loc = viewingLocation;
                        setViewingLocation(null);
                        setEditingLocation(loc);
                      }}
                      className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition cursor-pointer"
                      title={t('common.edit', 'Editează')}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const loc = viewingLocation;
                        setViewingLocation(null);
                        setDeletingLocationId(loc.id);
                      }}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                      title={t('common.delete', 'Șterge')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${
                    viewingLocation.latitude != null && viewingLocation.longitude != null
                      ? `${viewingLocation.latitude},${viewingLocation.longitude}`
                      : encodeURIComponent(viewingLocation.name + (viewingLocation.address ? ` ${viewingLocation.address}` : ''))
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{t('general.getDirections', 'Direcții')}</span>
                </a>
              </div>
            </div>
          }
        >
          <div className="space-y-3.5">
            {/* Description */}
            <div
              className={`p-3 rounded-xl border space-y-1 ${
                isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <span
                className={`block text-[10px] font-bold uppercase tracking-wider ${
                  isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {t('general.locationNotes', 'Note / Descriere')}
              </span>
              <p
                className={`text-xs whitespace-pre-wrap leading-relaxed ${
                  isDarkMode ? 'text-zinc-300' : 'text-zinc-800'
                }`}
              >
                {viewingLocation.description || t('general.noDescription', 'Fără descriere adițională.')}
              </p>
            </div>

            {/* Address */}
            <div
              className={`p-3 rounded-xl border space-y-1 ${
                isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}
            >
              <span
                className={`block text-[10px] font-bold uppercase tracking-wider ${
                  isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                }`}
              >
                {t('general.address', 'Adresă')}
              </span>
              <p
                className={`text-xs ${
                  isDarkMode ? 'text-zinc-300' : 'text-zinc-800'
                }`}
              >
                {viewingLocation.address || '-'}
              </p>
            </div>

            {/* GPS Coordinates */}
            {viewingLocation.latitude != null && viewingLocation.longitude != null && (
              <div
                className={`p-3 rounded-xl border space-y-1 ${
                  isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <span
                  className={`block text-[10px] font-bold uppercase tracking-wider ${
                    isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                  }`}
                >
                  {t('general.coordinates', 'Coordonate GPS')}
                </span>
                <p
                  className={`text-xs font-mono ${
                    isDarkMode ? 'text-zinc-300' : 'text-zinc-800'
                  }`}
                >
                  {viewingLocation.latitude.toFixed(6)}, {viewingLocation.longitude.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add / Edit Location Modal */}
      {(isAddLocationModalOpen || Boolean(editingLocation)) && (
        <LocationModal
          isOpen={isAddLocationModalOpen || Boolean(editingLocation)}
          onClose={() => {
            setIsAddLocationModalOpen(false);
            setEditingLocation(null);
          }}
          onSave={async (data, id) => {
            await onSaveLocation(data, id);
            showToast(
              id
                ? t('general.locationUpdated', 'Locația a fost actualizată.')
                : t('general.locationCreated', 'Locația a fost adăugată.'),
              'success'
            );
          }}
          initialData={editingLocation || null}
          isDarkMode={isDarkMode}
          defaultCenter={DEFAULT_MAP_CENTER}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingLocationId && (
        <ConfirmationModal
          isOpen={Boolean(deletingLocationId)}
          onClose={() => setDeletingLocationId(null)}
          onConfirm={async () => {
            if (deletingLocationId) {
              try {
                await onDeleteLocation(deletingLocationId);
              } catch {
                // error toast handled in parent onDeleteLocation
              } finally {
                setDeletingLocationId(null);
              }
            }
          }}
          title={t('general.deleteLocationTitle', 'Șterge Locație')}
          message={t(
            'general.deleteLocationMessage',
            'Sigur doriți să ștergeți această locație? Această acțiune nu poate fi anulată.'
          )}
          confirmText={t('common.delete', 'Șterge')}
          variant="danger"
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};
