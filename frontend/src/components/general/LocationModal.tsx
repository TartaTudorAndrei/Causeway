import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import type { LocationItem, LocationType } from '../../types/general';
import { loadGoogleMaps } from '../../utils/googleMapsLoader';
import { X } from 'lucide-react';
interface LocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (location: Partial<LocationItem>, id?: string) => Promise<void>;
    initialData?: LocationItem | null;
    isDarkMode: boolean;
    defaultCenter?: {
        lat: number;
        lng: number;
    };
}
const DEFAULT_CENTER = { lat: 46.7712, lng: 23.6236 };
export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, onSave, initialData, isDarkMode, defaultCenter = DEFAULT_CENTER, }) => {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [type, setType] = useState<LocationType>('STAND');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [latitude, setLatitude] = useState<number | ''>('');
    const [longitude, setLongitude] = useState<number | ''>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Mini map refs
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const autocompleteInputRef = useRef<HTMLInputElement | null>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerInstanceRef = useRef<any>(null);
    const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(false);
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name || '');
                setType(initialData.type || 'STAND');
                setDescription(initialData.description || '');
                setAddress(initialData.address || '');
                setLatitude(initialData.latitude ?? '');
                setLongitude(initialData.longitude ?? '');
            }
            else {
                setName('');
                setType('STAND');
                setDescription('');
                setAddress('');
                setLatitude(defaultCenter.lat);
                setLongitude(defaultCenter.lng);
            }
            setError(null);
        }
    }, [isOpen, initialData, defaultCenter]);
    // Initialize interactive picker map
    useEffect(() => {
        if (!isOpen || !mapContainerRef.current)
            return;
        let isMounted = true;
        loadGoogleMaps()
            .then((googleMaps) => {
            if (!isMounted || !mapContainerRef.current)
                return;
            setIsGoogleMapsReady(true);
            const initialLat = initialData?.latitude ?? defaultCenter.lat;
            const initialLng = initialData?.longitude ?? defaultCenter.lng;
            const centerPos = { lat: initialLat, lng: initialLng };
            const map = new googleMaps.Map(mapContainerRef.current, {
                center: centerPos,
                zoom: 14,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                clickableIcons: false,
                styles: isDarkMode
                    ? [
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
                    ]
                    : [
                        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                        { featureType: 'transit', stylers: [{ visibility: 'off' }] },
                        { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
                    ],
            });
            mapInstanceRef.current = map;
            const marker = new googleMaps.Marker({
                position: centerPos,
                map,
                draggable: true,
                title: initialData?.name || 'Locație',
            });
            markerInstanceRef.current = marker;
            // On map click -> move marker & update coords
            map.addListener('click', (e: any) => {
                if (e.latLng) {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    marker.setPosition(e.latLng);
                    setLatitude(Number(lat.toFixed(7)));
                    setLongitude(Number(lng.toFixed(7)));
                }
            });
            // On marker drag end -> update coords
            marker.addListener('dragend', (e: any) => {
                if (e.latLng) {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    marker.setPosition(e.latLng);
                    setLatitude(Number(lat.toFixed(7)));
                    setLongitude(Number(lng.toFixed(7)));
                }
            });
            // Places autocomplete search
            if (autocompleteInputRef.current && (googleMaps as any).places) {
                const autocomplete = new (googleMaps as any).places.Autocomplete(autocompleteInputRef.current, {
                    fields: ['geometry', 'formatted_address', 'name'],
                });
                autocomplete.bindTo('bounds', map);
                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (!place.geometry || !place.geometry.location)
                        return;
                    map.setCenter(place.geometry.location);
                    map.setZoom(16);
                    marker.setPosition(place.geometry.location);
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();
                    setLatitude(Number(lat.toFixed(7)));
                    setLongitude(Number(lng.toFixed(7)));
                    if (place.formatted_address) {
                        setAddress(place.formatted_address);
                    }
                });
            }
        })
            .catch(() => {
            if (!isMounted)
                return;
            setIsGoogleMapsReady(false);
        });
        return () => {
            isMounted = false;
            if (markerInstanceRef.current && (window as any).google?.maps?.event) {
                (window as any).google.maps.event.clearInstanceListeners(markerInstanceRef.current);
                markerInstanceRef.current.setMap(null);
                markerInstanceRef.current = null;
            }
            if (mapInstanceRef.current && (window as any).google?.maps?.event) {
                (window as any).google.maps.event.clearInstanceListeners(mapInstanceRef.current);
                mapInstanceRef.current = null;
            }
            // Remove any lingering autocomplete dropdown containers from body
            document.querySelectorAll('.pac-container').forEach((el) => el.remove());
        };
    }, [isOpen, defaultCenter.lat, defaultCenter.lng, initialData, isDarkMode]);
    
    useEffect(() => {
        if (markerInstanceRef.current && name) {
            markerInstanceRef.current.setTitle(name);
        }
    }, [name]);
    
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setError(null);
        setFieldErrors({});
    }, [isOpen, initialData]);

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!name.trim()) {
            errors.name = t('general.locationNameRequired', 'Numele locației este obligatoriu.');
        }
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            setError(t('common.fillRequiredFields', 'Completați câmpurile obligatorii marcate.'));
            return false;
        }
        setError(null);
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await onSave({
                name: name.trim(),
                type,
                description: description.trim() || undefined,
                address: address.trim() || undefined,
                latitude: typeof latitude === 'number' ? latitude : undefined,
                longitude: typeof longitude === 'number' ? longitude : undefined,
            }, initialData?.id);
            onClose();
        }
        catch (err: any) {
            setError(err?.message || t('general.saveError', 'Eroare la salvarea locației.'));
        }
        finally {
            setIsSubmitting(false);
        }
    };

    const modalBorder = isDarkMode ? 'border-zinc-800' : 'border-zinc-200';
    const modalBg = isDarkMode ? 'bg-black text-white border-zinc-800 shadow-2xl' : 'bg-white text-zinc-900 border-zinc-200 shadow-xl';
    const inputBg = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
        : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';
    const inputErrorBorder = 'border-rose-500/80 focus:border-rose-500 ring-1 ring-rose-500/40';
    const textSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150" onClick={onClose}>
            <div className={`w-full h-full sm:h-auto sm:max-h-[90vh] max-w-2xl rounded-none sm:rounded-2xl border-0 sm:border shadow-2xl flex flex-col overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-3.5 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-base sm:text-lg tracking-tight">
                        {initialData ? t('general.editLocation', 'Editează Locație') : t('general.addLocation', 'Adaugă Locație')}
                    </h3>
                    <button onClick={onClose} aria-label={t('common.close', 'Închide')} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-900' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}>
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className={`mx-5 sm:mx-6 border-b ${modalBorder}`} />

                {/* Scrollable Form Body */}
                <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-sm">
                    <form id="location-form" noValidate onSubmit={handleSubmit} className="space-y-4 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Name */}
                            <div>
                                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                    {t('general.locationName', 'Nume Locație')}
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                                    }}
                                    placeholder={t('general.locationNamePlaceholder', 'ex. Piața Centrală - Stand Principal')}
                                    className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg} ${fieldErrors.name ? inputErrorBorder : ''}`}
                                    autoFocus
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                    {t('general.locationType', 'Tip Locație')}
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as LocationType)}
                                    className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                                >
                                    <option value="STAND">{t('general.typeStand', 'Stand (Punct Vânzare/Strângere)')}</option>
                                    <option value="DEPOSIT">{t('general.typeDeposit', 'Depozit (Stoc Central/Secundar)')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Address Search with Autocomplete */}
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('general.searchAddress', 'Caută adresă pe hartă')}
                            </label>
                            <input
                                ref={autocompleteInputRef}
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder={t('general.addressPlaceholder', 'Introdu o adresă sau caută pe Google Maps...')}
                                className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                            />
                        </div>

                        {/* Interactive Map Canvas for Pin Placement */}
                        <div className="space-y-1">
                            <div className={`flex items-center justify-between text-[11px] ${textSub}`}>
                                <span>{t('general.clickMapToPlacePin', 'Fă click pe hartă sau trage pinul pentru a fixa poziția')}</span>
                            </div>
                            <div className={`w-full h-52 rounded-xl border overflow-hidden relative ${isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-300 bg-zinc-100'}`}>
                                <div ref={mapContainerRef} className="w-full h-full"/>
                                {!isGoogleMapsReady && (
                                    <div className={`absolute inset-0 flex flex-col items-center justify-center text-center p-4 text-xs pointer-events-none ${isDarkMode ? 'text-zinc-500 bg-zinc-900/90' : 'text-zinc-600 bg-zinc-100/90'}`}>
                                        <p>{t('general.manualCoordsPrompt', 'Setează coordonatele manual sau configurează cheia Google Maps în .env')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Latitude & Longitude inputs */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={`block text-[11px] font-semibold mb-1 ${textSub}`}>
                                    {t('general.latitude', 'Latitudine (GPS)')}
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={latitude}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                                        setLatitude(clean === '' ? '' : Number(clean));
                                    }}
                                    placeholder="46.7712000"
                                    className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-[11px] font-semibold mb-1 ${textSub}`}>
                                    {t('general.longitude', 'Longitudine (GPS)')}
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={longitude}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => {
                                        const clean = e.target.value.replace(/^0+(?=\d)/, '');
                                        setLongitude(clean === '' ? '' : Number(clean));
                                    }}
                                    placeholder="23.6236000"
                                    className={`w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${inputBg}`}
                                />
                            </div>
                        </div>

                        {/* Description / Notes */}
                        <div>
                            <label className={`block text-xs font-semibold mb-1 ${textSub}`}>
                                {t('general.locationNotes', 'Note / Descriere')}
                            </label>
                            <textarea
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('general.locationNotesPlaceholder', 'Detalii adiționale despre acces, amplasare etc.')}
                                className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden transition resize-none ${inputBg}`}
                            />
                        </div>
                    </form>
                </div>

                <div className={`mx-5 sm:mx-6 border-t ${modalBorder}`} />

                {/* Footer */}
                <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
                    <div className="min-w-0 pr-3">
                        {error && (
                            <p className="text-xs text-rose-400 font-medium truncate">{error}</p>
                        )}
                    </div>
                    <button
                        form="location-form"
                        type="submit"
                        disabled={isSubmitting}
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center space-x-2 shrink-0"
                    >
                        {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                        <span>{t('common.save', 'Salvează')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
