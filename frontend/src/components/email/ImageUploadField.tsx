import React, { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { emailService } from '../../services/emailService';
import { Loader2 } from 'lucide-react';

interface ImageUploadFieldProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  isDarkMode: boolean;
  maxSizeBytes?: number;
  placeholder?: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  isDarkMode,
  maxSizeBytes = 5 * 1024 * 1024,
  placeholder = 'https://...',
}) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const labelClass = `block text-xs font-semibold mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`;
  const inputClass = `w-full h-[38px] px-3 py-2 text-xs rounded-xl border outline-hidden transition ${
    isDarkMode
      ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 focus:border-zinc-700'
      : 'bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-400'
  }`;

  const handleFile = async (file: File) => {
    setErrorMessage(null);
    if (!file) return;

    // Validate size
    if (file.size > maxSizeBytes) {
      setErrorMessage(t('email.maxSizeExceeded', 'Fișierul depășește limita maximă de 5MB.'));
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage(t('email.invalidFormat', 'Format neacceptat. Formate permise: JPG, PNG, WEBP, GIF, SVG.'));
      return;
    }

    // Convert uploaded image to Data URL for instant clipboard & Gmail embed persistence
    const dataUrlPromise = new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
    const dataUrl = await dataUrlPromise;
    if (dataUrl) {
      onChange(dataUrl);
    }

    setIsUploading(true);
    try {
      const res = await emailService.uploadImage(file);
      if (!dataUrl) {
        onChange(res.url);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || t('email.uploadError', 'Eroare la încărcarea imaginii.'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        {label && <label className={labelClass}>{label}</label>}
        <div className="flex items-center space-x-1 text-[11px]">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
              mode === 'upload'
                ? isDarkMode
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-200 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t('email.modeUpload', 'Fișier')}
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
              mode === 'url'
                ? isDarkMode
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-200 text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t('email.modeUrl', 'URL')}
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <div>
          <input
            type="text"
            value={value || ''}
            placeholder={placeholder}
            onChange={(e) => {
              setErrorMessage(null);
              onChange(e.target.value);
            }}
            className={inputClass}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          {value ? (
            <div
              className={`p-2 rounded-xl border flex items-center justify-between gap-2.5 ${
                isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-300'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <img
                  src={value}
                  alt="Preview"
                  className="w-10 h-10 object-cover rounded-lg border border-zinc-800 shrink-0 bg-zinc-950"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span className="text-xs text-zinc-400 truncate font-mono">{value}</span>
              </div>
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer disabled:opacity-50"
                >
                  {t('email.changeImage', 'Schimbă')}
                </button>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  disabled={isUploading}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
                >
                  {t('email.removeImage', 'Șterge')}
                </button>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`p-3.5 rounded-xl border border-dashed transition text-center cursor-pointer ${
                isDragging
                  ? 'border-blue-500 bg-blue-500/10'
                  : isDarkMode
                  ? 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                  : 'border-zinc-300 bg-zinc-100 hover:border-zinc-400'
              }`}
            >
              {isUploading ? (
                <div className="flex items-center justify-center space-x-2 py-1 text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-semibold">{t('email.uploading', 'Se încarcă imaginea...')}</span>
                </div>
              ) : (
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-zinc-300 block">
                    {t('email.uploadImage', 'Încarcă Imagine')}
                  </span>
                  <span className="text-[11px] text-zinc-500 block">
                    {t('email.uploadImageHint', 'Trage imaginea aici sau apasă pentru a alege (max 5MB)')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <p className="text-[11px] text-rose-400 font-medium">{errorMessage}</p>
      )}
    </div>
  );
};
