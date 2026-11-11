import React, { useState, useEffect, useRef } from 'react';
import type { HrStand, AttendanceCheckinResult } from '../../types/hr';
import { hrService } from '../../services/hrService';
import { useLanguage } from '../../context/LanguageContext';
import { Modal } from '../common';
export interface StandAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    stands: HrStand[];
    initialStandId?: string | null;
    initialShiftId?: string | null;
    initialQrToken?: string | null;
    isDarkMode?: boolean;
    onSuccessCheckin?: (result: AttendanceCheckinResult) => void;
    showToast?: (msg: string, type?: 'success' | 'error') => void;
}
export const StandAttendanceModal: React.FC<StandAttendanceModalProps> = ({ isOpen, onClose, stands, initialStandId, initialShiftId, initialQrToken, isDarkMode = true, onSuccessCheckin, showToast, }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'GPS' | 'QR'>('GPS');
    const [selectedStandId, setSelectedStandId] = useState<string>('');
    const [selectedShiftId, setSelectedShiftId] = useState<string>('');
    // GPS state
    const [isGpsLoading, setIsGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [gpsDistance, setGpsDistance] = useState<number | null>(null);
    const [gpsSuccessResult, setGpsSuccessResult] = useState<AttendanceCheckinResult | null>(null);
    // QR state
    const [qrTokenInput, setQrTokenInput] = useState<string>('');
    const [isQrLoading, setIsQrLoading] = useState(false);
    const [qrError, setQrError] = useState<string | null>(null);
    const [qrSuccessResult, setQrSuccessResult] = useState<AttendanceCheckinResult | null>(null);
    // Camera scanner state
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scanIntervalRef = useRef<any>(null);
    useEffect(() => {
        if (isOpen) {
            const defaultStand = initialStandId
                ? stands.find(s => s.id === initialStandId || s.id.startsWith(initialStandId))
                : stands[0];
            setSelectedStandId(defaultStand?.id || '');
            setSelectedShiftId(initialShiftId || defaultStand?.shifts?.[0]?.id || '');
            setGpsError(null);
            setGpsDistance(null);
            setGpsSuccessResult(null);
            setQrError(null);
            setQrSuccessResult(null);
            if (initialQrToken) {
                setQrTokenInput(initialQrToken);
                setActiveTab('QR');
            }
            else {
                setActiveTab('GPS');
            }
        }
    }, [isOpen, initialStandId, initialShiftId, initialQrToken, stands]);
    // Update selected shift when selected stand changes
    const handleStandChange = (standId: string) => {
        setSelectedStandId(standId);
        const found = stands.find(s => s.id === standId);
        setSelectedShiftId(found?.shifts?.[0]?.id || '');
        setGpsError(null);
        setGpsDistance(null);
        setQrError(null);
    };
    const selectedStand = stands.find(s => s.id === selectedStandId) || null;
    // Cleanup camera scanner on close
    const stopCameraScanner = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsScannerOpen(false);
    };
    useEffect(() => {
        return () => {
            stopCameraScanner();
        };
    }, []);
    // GPS Checkin handler
    const handleGpsCheckin = () => {
        if (!navigator.geolocation) {
            setGpsError(t('hr.geolocationNotSupported', 'Geolocația nu este suportată de browserul dumneavoastră.'));
            return;
        }
        setIsGpsLoading(true);
        setGpsError(null);
        setGpsDistance(null);
        const geoOptions: PositionOptions = {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 0,
        };
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const { latitude, longitude } = pos.coords;
                const result = await hrService.gpsCheckin({
                    standId: selectedStandId || undefined,
                    shiftId: selectedShiftId || undefined,
                    latitude,
                    longitude,
                });
                setGpsSuccessResult(result);
                if (showToast)
                    showToast(result.message || t('hr.attendanceSuccessGps', 'Prezența a fost confirmată cu succes!'), 'success');
                if (onSuccessCheckin)
                    onSuccessCheckin(result);
            }
            catch (err: any) {
                setGpsError(err.message || t('hr.gpsCheckinFailed', 'Nu s-a putut confirma prezența prin GPS.'));
                if (err.distanceMeters) {
                    setGpsDistance(err.distanceMeters);
                }
            }
            finally {
                setIsGpsLoading(false);
            }
        }, (err) => {
            setIsGpsLoading(false);
            let errorMsg = t('hr.gpsPermissionDenied', 'Accesul la locație a fost refuzat. Permiteți accesul la locație în browser.');
            if (err.code === err.TIMEOUT) {
                errorMsg = t('hr.gpsTimeout', 'Timpul de așteptare pentru semnalul GPS a expirat. Reîncercați.');
            }
            else if (err.code === err.POSITION_UNAVAILABLE) {
                errorMsg = t('hr.gpsUnavailable', 'Semnalul GPS nu este disponibil în acest moment. Reîncercați.');
            }
            setGpsError(errorMsg);
        }, geoOptions);
    };
    // QR Checkin handler
    const handleQrCheckin = async (tokenOverride?: string) => {
        const token = tokenOverride || qrTokenInput.trim();
        if (!token) {
            setQrError(t('hr.qrTokenRequired', 'Introduceți sau scanați codul QR al standului.'));
            return;
        }
        setIsQrLoading(true);
        setQrError(null);
        try {
            const result = await hrService.qrCheckin({
                qrToken: token,
                standId: selectedStandId || undefined,
                shiftId: selectedShiftId || undefined,
            });
            setQrSuccessResult(result);
            if (showToast)
                showToast(result.message || t('hr.attendanceSuccessQr', 'Prezența a fost confirmată cu succes prin QR!'), 'success');
            if (onSuccessCheckin)
                onSuccessCheckin(result);
            stopCameraScanner();
        }
        catch (err: any) {
            setQrError(err.message || t('hr.qrCheckinFailed', 'Codul QR este invalid sau verificarea a eșuat.'));
        }
        finally {
            setIsQrLoading(false);
        }
    };
    // Start Camera QR Scanner
    const startCameraScanner = async () => {
        setIsScannerOpen(true);
        setQrError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            // Check if native BarcodeDetector API is supported
            if ('BarcodeDetector' in window) {
                const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                scanIntervalRef.current = setInterval(async () => {
                    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                        try {
                            const barcodes = await barcodeDetector.detect(videoRef.current);
                            if (barcodes && barcodes.length > 0) {
                                const rawValue = barcodes[0].rawValue;
                                if (rawValue) {
                                    // Extract token from URL or raw text
                                    let extractedToken = rawValue;
                                    try {
                                        const parsedUrl = new URL(rawValue);
                                        const tokenParam = parsedUrl.searchParams.get('token') || parsedUrl.searchParams.get('qrCheckin');
                                        if (tokenParam)
                                            extractedToken = tokenParam;
                                    }
                                    catch { }
                                    setQrTokenInput(extractedToken);
                                    handleQrCheckin(extractedToken);
                                }
                            }
                        }
                        catch { }
                    }
                }, 400);
            }
        }
        catch {
            setQrError(t('hr.cameraPermissionDenied', 'Nu s-a putut accesa camera. Verificați permisiunile camerei.'));
            setIsScannerOpen(false);
        }
    };
    const cardBg = isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200';
    const inputBg = isDarkMode ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-zinc-300 text-zinc-900';
    return (<Modal isOpen={isOpen} onClose={() => {
            stopCameraScanner();
            onClose();
        }} title={<div className="flex items-center space-x-2.5"><span>{t('hr.attendanceModalTitle', 'Confirmare Prezență Stand')}</span>
        </div>} maxWidth="md" isDarkMode={isDarkMode}>
      <div className="space-y-4">
        {/* Method Switcher Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          <button type="button" onClick={() => {
            stopCameraScanner();
            setActiveTab('GPS');
        }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${activeTab === 'GPS'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-zinc-400 hover:text-white'}`}><span>{t('hr.gpsCheckinTab', '1. GPS Locație')}</span>
          </button>
          <button type="button" onClick={() => setActiveTab('QR')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center space-x-1.5 ${activeTab === 'QR'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-zinc-400 hover:text-white'}`}><span>{t('hr.qrCheckinTab', '2. Cod QR Stand')}</span>
          </button>
        </div>

        {/* Stand & Shift Selector */}
        <div className={`p-3.5 rounded-xl border space-y-3 ${cardBg}`}>
          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              {t('hr.selectStandLabel', 'Stand Eveniment')}
            </label>
            <select value={selectedStandId} onChange={(e) => handleStandChange(e.target.value)} className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden focus:ring-2 focus:ring-blue-500 ${inputBg}`}>
              {stands.map(s => (<option key={s.id} value={s.id}>
                  {s.locationName} ({s.eventDate}) {s.eventName ? `- ${s.eventName}` : ''}
                </option>))}
            </select>
          </div>

          {selectedStand && selectedStand.shifts && selectedStand.shifts.length > 0 && (<div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {t('hr.selectShiftLabel', 'Schimb Orar')}
              </label>
              <select value={selectedShiftId} onChange={(e) => setSelectedShiftId(e.target.value)} className={`w-full px-3 py-2 text-xs rounded-xl border outline-hidden focus:ring-2 focus:ring-blue-500 ${inputBg}`}>
                {selectedStand.shifts.map(sh => (<option key={sh.id} value={sh.id}>
                    {sh.shiftName} ({sh.startTime} - {sh.endTime})
                  </option>))}
              </select>
            </div>)}
        </div>

        {/* --- TAB 1: GPS CHECK-IN --- */}
        {activeTab === 'GPS' && (<div className="space-y-4">
            {gpsSuccessResult ? (<div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2"><h4 className="font-bold text-sm text-emerald-400">
                  {t('hr.attendanceConfirmed', 'Prezență Confirmată!')}
                </h4>
                <p className="text-xs text-zinc-300">
                  {gpsSuccessResult.message}
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                    PREZENT
                  </span>
                </div>
              </div>) : (<>
                <div className={`p-4 rounded-xl border space-y-2 text-center ${cardBg}`}><div className="space-y-1">
                    <h4 className="font-bold text-xs sm:text-sm text-white">
                      {t('hr.gpsCheckinTitle', 'Verificare Locație în Perimetru')}
                    </h4>
                    <p className="text-[11px] text-zinc-400 max-w-sm mx-auto leading-relaxed">
                      {t('hr.gpsCheckinDesc', 'Aplicația solicită locația dispozitivului timp de câteva secunde pentru a verifica apropierea de stand.')}
                    </p>
                  </div>
                </div>

                {gpsError && (<div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2.5"><div className="space-y-1 flex-1">
                      <p className="font-semibold">{gpsError}</p>
                      {gpsDistance !== null && (<p className="text-[11px] font-mono text-amber-400">
                          Distanță detectată: ~{gpsDistance} m
                        </p>)}
                      <p className="text-[11px] text-rose-400/80">
                        {t('hr.gpsRetryAllowed', 'Puteți reîncerca oricând dacă v-ați apropiat de stand.')}
                      </p>
                    </div>
                  </div>)}

                <button type="button" disabled={isGpsLoading} onClick={handleGpsCheckin} className="w-full py-3 text-xs sm:text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50">
                  {isGpsLoading ? (<><span>{t('hr.checkingGps', 'Se verifică poziția GPS...')}</span>
                    </>) : (<><span>{t('hr.markPresentGpsBtn', 'Confirmă Prezența prin GPS')}</span>
                    </>)}
                </button>
              </>)}
          </div>)}

        {/* --- TAB 2: QR CODE CHECK-IN --- */}
        {activeTab === 'QR' && (<div className="space-y-4">
            {qrSuccessResult ? (<div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2"><h4 className="font-bold text-sm text-emerald-400">
                  {t('hr.attendanceConfirmed', 'Prezență Confirmată!')}
                </h4>
                <p className="text-xs text-zinc-300">
                  {qrSuccessResult.message}
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                    PREZENT
                  </span>
                </div>
              </div>) : (<>
                {/* Live Camera Scanner View */}
                {isScannerOpen ? (<div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black aspect-square max-h-64 flex items-center justify-center">
                    <video ref={videoRef} className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 border-2 border-blue-500/60 rounded-xl m-8 pointer-events-none animate-pulse flex items-center justify-center">
                      <span className="text-[10px] bg-black/70 text-white px-2 py-0.5 rounded-md font-mono">
                        Încadrați Codul QR
                      </span>
                    </div>
                    <button type="button" onClick={stopCameraScanner} className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-zinc-900/80 text-zinc-300 text-[11px] font-bold hover:bg-zinc-800">
                      {t('common.cancel', 'Închide Camera')}
                    </button>
                  </div>) : (<div className={`p-4 rounded-xl border text-center space-y-2.5 ${cardBg}`}><p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                      {t('hr.qrScanPrompt', 'Scanați codul QR afișat la stand sau introduceți manual codul pentru confirmare.')}
                    </p>
                    <button type="button" onClick={startCameraScanner} className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition cursor-pointer inline-flex items-center space-x-1.5"><span>{t('hr.openScannerCamera', 'Deschide Scanner Cameră')}</span>
                    </button>
                  </div>)}

                {/* Manual Token / Checkin Input */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    {t('hr.qrTokenLabel', 'Cod Stand / Token Check-in')}
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="text" value={qrTokenInput} onChange={(e) => setQrTokenInput(e.target.value)} placeholder={t('hr.qrTokenPlaceholder', 'ex. b4a98f12...')} className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border outline-hidden focus:ring-2 focus:ring-blue-500 ${inputBg}`}/>
                    <button type="button" disabled={isQrLoading || !qrTokenInput.trim()} onClick={() => handleQrCheckin()} className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition cursor-pointer shrink-0 disabled:opacity-50 flex items-center space-x-1">
                      {isQrLoading ? (null) : (<>
                          <span>{t('hr.validateCheckin', 'Confirmă')}</span></>)}
                    </button>
                  </div>
                </div>

                {qrError && (<div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2.5"><p className="font-semibold">{qrError}</p>
                  </div>)}
              </>)}
          </div>)}
      </div>
    </Modal>);
};
