import React from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { EmailBlock, EmailGlobalSettings } from '../../types/email';
import { useLanguage } from '../../context/LanguageContext';
import { ImageUploadField } from './ImageUploadField';

interface BlockInspectorProps {
  block: EmailBlock | null;
  onUpdate: (updated: EmailBlock) => void;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const EmailSettingsInspector: React.FC<{
  settings: EmailGlobalSettings;
  onUpdate: (settings: EmailGlobalSettings) => void;
  onClose: () => void;
  isDarkMode?: boolean;
}> = ({ settings, onUpdate, onClose, isDarkMode = true }) => {
  const { t } = useLanguage();

  const inputClass = isDarkMode
    ? 'w-full h-[36px] px-3 py-1.5 text-xs rounded-xl border outline-hidden transition bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
    : 'w-full h-[36px] px-3 py-1.5 text-xs rounded-xl border outline-hidden transition bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';

  const labelClass = `block text-xs font-semibold mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`;
  const subLabelClass = `block text-[11px] font-semibold mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`;

  const renderColorInput = (
    label: string,
    value: string | undefined,
    defaultValue: string,
    onChange: (val: string) => void
  ) => (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={value || defaultValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-lg border border-zinc-700 cursor-pointer bg-transparent p-0.5 shrink-0"
        />
        <input
          type="text"
          value={value || ''}
          placeholder={defaultValue}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} flex-1 font-mono text-[11px]`}
        />
      </div>
    </div>
  );

  return (
    <div className={`w-full flex flex-col h-full border-t md:border-t-0 md:border-l p-4 space-y-4 overflow-y-auto custom-scrollbar ${
      isDarkMode ? 'bg-zinc-950 border-zinc-850 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between shrink-0 pb-2 border-b ${
        isDarkMode ? 'border-zinc-800' : 'border-zinc-200'
      }`}>
        <span className={`text-xs font-bold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>
          {t('email.globalSettings', 'Aspect & Fundal Email')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className={`p-1 rounded-lg transition cursor-pointer ${
            isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sheet Dimensions & Typography */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={subLabelClass}>{t('email.canvasWidth', 'Lățime')}</label>
            <input
              type="number"
              min={320}
              max={1200}
              step={10}
              value={settings.canvasWidth || 600}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const clean = e.target.value.replace(/^0+(?=\d)/, '');
                onUpdate({ ...settings, canvasWidth: Number(clean) || 600 });
              }}
              className={inputClass}
            />
          </div>

          <div>
            <label className={subLabelClass}>{t('email.fontFamily', 'Font')}</label>
            <select
              value={settings.fontFamily || 'sans'}
              onChange={(e) => onUpdate({ ...settings, fontFamily: e.target.value as any })}
              className={inputClass}
            >
              <option value="sans">Sans-Serif</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={subLabelClass}>{t('email.sheetCorners', 'Rotunjire')}</label>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.sheetBorderRadius !== undefined ? settings.sheetBorderRadius : 16}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const clean = e.target.value.replace(/^0+(?=\d)/, '');
                onUpdate({ ...settings, sheetBorderRadius: Number(clean) || 0 });
              }}
              className={inputClass}
            />
          </div>

          <div>
            <label className={subLabelClass}>{t('email.sheetBorder', 'Grosime Bordură')}</label>
            <input
              type="number"
              min={0}
              max={20}
              value={settings.sheetBorderWidth !== undefined ? settings.sheetBorderWidth : 1}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const clean = e.target.value.replace(/^0+(?=\d)/, '');
                onUpdate({ ...settings, sheetBorderWidth: Number(clean) || 0 });
              }}
              className={inputClass}
            />
          </div>
        </div>

        {renderColorInput(
          t('email.sheetBorderColor', 'Culoare Bordură'),
          settings.sheetBorderColor,
          '#e4e4e7',
          (sheetBorderColor) => onUpdate({ ...settings, sheetBorderColor })
        )}
      </div>

      {/* Background Colors */}
      <div className="pt-2 border-t border-zinc-800/60 space-y-4">
        {renderColorInput(
          t('email.emailBgColor', 'Fundal Email'),
          settings.emailBgColor,
          '#ffffff',
          (emailBgColor) => onUpdate({ ...settings, emailBgColor })
        )}

        {renderColorInput(
          t('email.backdropColor', 'Fundal Exterior'),
          settings.backdropColor,
          '#f4f4f5',
          (backdropColor) => onUpdate({ ...settings, backdropColor })
        )}

        {/* Quick Presets */}
        <div className="pt-2 border-t border-zinc-800/60 space-y-2">
          <label className={labelClass}>
            {t('email.colorPresets', 'Presetări')}
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'Alb', emailBg: '#ffffff', backdrop: '#f4f4f5' },
              { label: 'Crem', emailBg: '#fdfbf7', backdrop: '#f4ece1' },
              { label: 'Gri', emailBg: '#ffffff', backdrop: '#e2e8f0' },
              { label: 'Dark', emailBg: '#18181b', backdrop: '#09090b' },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onUpdate({ ...settings, emailBgColor: p.emailBg, backdropColor: p.backdrop })}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border text-left transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
                    : 'bg-white border-zinc-300 text-zinc-700 hover:text-zinc-900 hover:border-zinc-400 shadow-2xs'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const BlockInspector: React.FC<BlockInspectorProps> = ({
  block,
  onUpdate,
  onClose,
  isDarkMode = true,
}) => {
  const { t } = useLanguage();

  if (!block) return null;

  const inputClass = isDarkMode
    ? 'w-full h-[36px] px-3 py-1.5 text-xs rounded-xl border outline-hidden transition bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700'
    : 'w-full h-[36px] px-3 py-1.5 text-xs rounded-xl border outline-hidden transition bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400';

  const labelClass = `block text-xs font-semibold mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`;
  const subLabelClass = `block text-[11px] font-semibold mb-1 ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`;
  const textareaClass = isDarkMode
    ? 'w-full px-3 py-2 text-xs rounded-xl border outline-hidden transition bg-zinc-900 border-zinc-800 text-white placeholder-zinc-500 hover:border-zinc-700 focus:border-zinc-700 resize-none font-mono'
    : 'w-full px-3 py-2 text-xs rounded-xl border outline-hidden transition bg-zinc-100 border-zinc-300 text-zinc-900 placeholder-zinc-400 hover:border-zinc-400 focus:border-zinc-400 resize-none font-mono';

  const renderColorInput = (
    label: string,
    value: string | undefined,
    defaultValue: string,
    onChange: (val: string) => void
  ) => (
    <div>
      <label className={subLabelClass}>{label}</label>
      <div className="flex items-center space-x-2">
        <input
          type="color"
          value={value || defaultValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded-lg border border-zinc-700 cursor-pointer bg-transparent p-0.5 shrink-0"
        />
        <input
          type="text"
          value={value || ''}
          placeholder={defaultValue}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} flex-1 font-mono text-[11px]`}
        />
      </div>
    </div>
  );

  return (
    <div className={`w-full flex flex-col h-full border-t md:border-t-0 md:border-l p-4 space-y-4 overflow-y-auto custom-scrollbar ${
      isDarkMode ? 'bg-zinc-950 border-zinc-850 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900'
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between shrink-0 pb-2 border-b ${
        isDarkMode ? 'border-zinc-800' : 'border-zinc-200'
      }`}>
        <div className="flex items-center space-x-2">
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
            isDarkMode ? 'bg-zinc-800/60 border border-zinc-700/50 text-zinc-300' : 'bg-zinc-200 border border-zinc-300 text-zinc-700'
          }`}>
            {block.type}
          </span>
          <span className={`text-xs font-semibold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-800'}`}>
            {t('email.blockSettings', 'Setări Bloc')}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`p-1 rounded-lg transition cursor-pointer ${
            isDarkMode ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Block Specific Forms */}
      {block.type === 'header' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('email.headerTitle', 'Titlu')}</label>
            <input
              type="text"
              value={block.title}
              placeholder="Lorem Ipsum"
              onChange={(e) => onUpdate({ ...block, title: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t('email.headerSubtitle', 'Subtitlu')}</label>
            <input
              type="text"
              value={block.subtitle || ''}
              placeholder="Lorem ipsum dolor sit amet..."
              onChange={(e) => onUpdate({ ...block, subtitle: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="space-y-2 pt-1 border-t border-zinc-800/60">
            <div className="flex items-center justify-between">
              <label className={`flex items-center space-x-2 text-xs cursor-pointer ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                <input
                  type="checkbox"
                  checked={block.showLogo}
                  onChange={(e) => onUpdate({ ...block, showLogo: e.target.checked })}
                  className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                />
                <span>{t('email.showLogo', 'Logo')}</span>
              </label>

              <select
                value={block.align || 'center'}
                onChange={(e) => onUpdate({ ...block, align: e.target.value as any })}
                className={`px-2 py-1 text-xs rounded-lg border ${
                  isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-300 text-zinc-800'
                }`}
              >
                <option value="center">{t('email.alignCenter', 'Centru')}</option>
                <option value="left">{t('email.alignLeft', 'Stânga')}</option>
                <option value="right">{t('email.alignRight', 'Dreapta')}</option>
              </select>
            </div>

            {block.showLogo && (
              <div className="space-y-2 pt-1">
                <div>
                  <label className={subLabelClass}>{t('email.logoText', 'Text Logo')}</label>
                  <input
                    type="text"
                    value={block.logoText || ''}
                    placeholder="LOREM"
                    onChange={(e) => onUpdate({ ...block, logoText: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <ImageUploadField
                    label={t('email.logoImageUrl', 'URL Logo')}
                    value={block.logoImageUrl || ''}
                    onChange={(logoImageUrl) => onUpdate({ ...block, logoImageUrl })}
                    isDarkMode={isDarkMode}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2">
            {renderColorInput(t('email.textColor', 'Culoare Titlu'), block.textColor, '#09090b', (textColor) => onUpdate({ ...block, textColor }))}
            {renderColorInput(t('email.accentColor', 'Culoare Accent'), block.accentColor, '#d97706', (accentColor) => onUpdate({ ...block, accentColor }))}
          </div>
        </div>
      )}

      {block.type === 'text' && (
        <div className="space-y-3">
          <label className={labelClass}>{t('email.blockText', 'Text')}</label>
          <textarea
            value={block.content}
            rows={8}
            onChange={(e) => onUpdate({ ...block, content: e.target.value })}
            className={`${textareaClass} leading-relaxed`}
            placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit..."
          />

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className={subLabelClass}>{t('email.fontSize', 'Mărime Font')}</label>
              <select
                value={block.fontSize || 'base'}
                onChange={(e) => onUpdate({ ...block, fontSize: e.target.value as any })}
                className={inputClass}
              >
                <option value="sm">{t('email.fontSmall', 'Mic')}</option>
                <option value="base">{t('email.fontNormal', 'Normal')}</option>
                <option value="lg">{t('email.fontLarge', 'Mare')}</option>
              </select>
            </div>

            <div>
              <label className={subLabelClass}>{t('email.align', 'Aliniere')}</label>
              <select
                value={block.align || 'left'}
                onChange={(e) => onUpdate({ ...block, align: e.target.value as any })}
                className={inputClass}
              >
                <option value="left">{t('email.alignLeft', 'Stânga')}</option>
                <option value="center">{t('email.alignCenter', 'Centru')}</option>
                <option value="right">{t('email.alignRight', 'Dreapta')}</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60">
            {renderColorInput(t('email.textColor', 'Culoare Text'), block.textColor, '#27272a', (textColor) => onUpdate({ ...block, textColor }))}
          </div>
        </div>
      )}

      {block.type === 'button' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('email.buttonText', 'Text Buton')}</label>
            <input
              type="text"
              value={block.label}
              onChange={(e) => onUpdate({ ...block, label: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t('email.buttonUrl', 'URL')}</label>
            <input
              type="text"
              value={block.url}
              onChange={(e) => onUpdate({ ...block, url: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={subLabelClass}>{t('email.buttonVariant', 'Stil')}</label>
              <select
                value={block.variant || 'primary'}
                onChange={(e) => onUpdate({ ...block, variant: e.target.value as any })}
                className={inputClass}
              >
                <option value="primary">{t('email.primary', 'Principal')}</option>
                <option value="secondary">{t('email.secondary', 'Secundar')}</option>
                <option value="custom">{t('email.customColor', 'Personalizat')}</option>
              </select>
            </div>

            <div>
              <label className={subLabelClass}>{t('email.buttonAlign', 'Aliniere')}</label>
              <select
                value={block.align || 'center'}
                onChange={(e) => onUpdate({ ...block, align: e.target.value as any })}
                className={inputClass}
              >
                <option value="center">{t('email.alignCenter', 'Centru')}</option>
                <option value="left">{t('email.alignLeft', 'Stânga')}</option>
                <option value="right">{t('email.alignRight', 'Dreapta')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className={subLabelClass}>{t('email.borderRadius', 'Rotunjire')}</label>
            <input
              type="number"
              min={0}
              max={100}
              value={block.borderRadius !== undefined ? block.borderRadius : (block.borderRadiusType === 'none' ? 0 : block.borderRadiusType === 'sm' ? 6 : block.borderRadiusType === 'lg' ? 18 : block.borderRadiusType === 'full' ? 9999 : 12)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const clean = e.target.value.replace(/^0+(?=\d)/, '');
                onUpdate({ ...block, borderRadius: Number(clean) || 0 });
              }}
              className={inputClass}
            />
          </div>

          <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2">
            {renderColorInput(t('email.buttonBgColor', 'Culoare Buton'), block.buttonColor, '#d97706', (buttonColor) => onUpdate({ ...block, buttonColor, variant: 'custom' }))}
            {renderColorInput(t('email.buttonTextColor', 'Text Buton'), block.buttonTextColor, '#ffffff', (buttonTextColor) => onUpdate({ ...block, buttonTextColor, variant: 'custom' }))}
          </div>
        </div>
      )}

      {block.type === 'spacer' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('email.spacerHeight', 'Înălțime (px)')}</label>
            <div className="flex items-center space-x-3 pt-2">
              <input
                type="number"
                min={0}
                max={200}
                value={block.height || 24}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const clean = e.target.value.replace(/^0+(?=\d)/, '');
                  onUpdate({ ...block, height: Number(clean) || 0 });
                }}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {block.type === 'list' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('email.listItems', 'Elemente Listă')}</label>
            <textarea
              value={(block.items || []).join('\n')}
              rows={6}
              onChange={(e) =>
                onUpdate({
                  ...block,
                  items: e.target.value.split('\n'),
                })
              }
              className={textareaClass}
              placeholder="Lorem ipsum..."
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={subLabelClass}>{t('email.listStyle', 'Stil')}</label>
              <select
                value={block.listStyle || 'bullet'}
                onChange={(e) => onUpdate({ ...block, listStyle: e.target.value as any })}
                className={inputClass}
              >
                <option value="bullet">{t('email.listBullet', 'Buline')}</option>
                <option value="number">{t('email.listNumber', 'Numere')}</option>
                <option value="check">{t('email.listCheck', 'Bife')}</option>
              </select>
            </div>

            <div>
              <label className={subLabelClass}>{t('email.align', 'Aliniere')}</label>
              <select
                value={block.align || 'left'}
                onChange={(e) => onUpdate({ ...block, align: e.target.value as any })}
                className={inputClass}
              >
                <option value="left">{t('email.alignLeft', 'Stânga')}</option>
                <option value="center">{t('email.alignCenter', 'Centru')}</option>
                <option value="right">{t('email.alignRight', 'Dreapta')}</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2">
            {renderColorInput(t('email.textColor', 'Culoare Text'), block.textColor, '#27272a', (textColor) => onUpdate({ ...block, textColor }))}
            {renderColorInput(t('email.accentColor', 'Culoare Accent'), block.accentColor, '#d97706', (accentColor) => onUpdate({ ...block, accentColor }))}
          </div>
        </div>
      )}

      {block.type === 'quote' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('email.quote', 'Citat')}</label>
            <textarea
              value={block.quote}
              rows={4}
              onChange={(e) => onUpdate({ ...block, quote: e.target.value })}
              className={textareaClass}
              placeholder="Lorem ipsum dolor sit amet..."
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>{t('email.quoteAuthor', 'Autor')}</label>
              <input
                type="text"
                value={block.author || ''}
                placeholder="Lorem Ipsum"
                onChange={(e) => onUpdate({ ...block, author: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('email.quoteCaption', 'Rol')}</label>
              <input
                type="text"
                value={block.caption || ''}
                placeholder="Lorem Ipsum"
                onChange={(e) => onUpdate({ ...block, caption: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2">
            {renderColorInput(t('email.accentColor', 'Culoare Accent'), block.accentColor, '#d97706', (accentColor) => onUpdate({ ...block, accentColor }))}
            {renderColorInput(t('email.textColor', 'Culoare Text'), block.textColor, '#27272a', (textColor) => onUpdate({ ...block, textColor }))}
          </div>
        </div>
      )}

      {block.type === 'card' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('email.cardTitle', 'Titlu')}</label>
            <input
              type="text"
              value={block.title || ''}
              placeholder="Lorem Ipsum"
              onChange={(e) => onUpdate({ ...block, title: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t('email.cardContent', 'Conținut')}</label>
            <textarea
              value={block.content}
              rows={4}
              onChange={(e) => onUpdate({ ...block, content: e.target.value })}
              className={textareaClass}
              placeholder="Lorem ipsum dolor sit amet..."
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>{t('email.buttonText', 'Text Buton')}</label>
              <input
                type="text"
                value={block.buttonLabel || ''}
                placeholder="Lorem Ipsum"
                onChange={(e) => onUpdate({ ...block, buttonLabel: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('email.buttonUrl', 'URL Buton')}</label>
              <input
                type="text"
                value={block.buttonUrl || ''}
                placeholder="https://..."
                onChange={(e) => onUpdate({ ...block, buttonUrl: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {renderColorInput(t('email.cardBgColor', 'Fundal Card'), block.cardBgColor, '#f8fafc', (cardBgColor) => onUpdate({ ...block, cardBgColor }))}
              {renderColorInput(t('email.cardBorderColor', 'Bordură Card'), block.cardBorderColor, '#e2e8f0', (cardBorderColor) => onUpdate({ ...block, cardBorderColor }))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {renderColorInput(t('email.accentColor', 'Culoare Buton'), block.accentColor, '#d97706', (accentColor) => onUpdate({ ...block, accentColor }))}
              {renderColorInput(t('email.textColor', 'Culoare Titlu'), block.textColor, '#09090b', (textColor) => onUpdate({ ...block, textColor }))}
            </div>
          </div>
        </div>
      )}

      {block.type === 'badge' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('email.badgeText', 'Text Badge')}</label>
            <input
              type="text"
              value={block.text}
              placeholder="LOREM IPSUM"
              onChange={(e) => onUpdate({ ...block, text: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={subLabelClass}>{t('email.align', 'Aliniere')}</label>
            <select
              value={block.align || 'center'}
              onChange={(e) => onUpdate({ ...block, align: e.target.value as any })}
              className={inputClass}
            >
              <option value="center">{t('email.alignCenter', 'Centru')}</option>
              <option value="left">{t('email.alignLeft', 'Stânga')}</option>
              <option value="right">{t('email.alignRight', 'Dreapta')}</option>
            </select>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2">
            {renderColorInput(t('email.badgeColor', 'Culoare Fundal Badge'), block.badgeColor, '#d97706', (badgeColor) => onUpdate({ ...block, badgeColor }))}
            {renderColorInput(t('email.badgeTextColor', 'Culoare Text Badge'), block.badgeTextColor, '#ffffff', (badgeTextColor) => onUpdate({ ...block, badgeTextColor }))}
          </div>
        </div>
      )}

      {block.type === 'sponsor_tier' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('email.tierName', 'Nume Pachet')}</label>
            <input
              type="text"
              value={block.tierName}
              onChange={(e) => onUpdate({ ...block, tierName: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>{t('email.amount', 'Valoare')}</label>
              <input
                type="text"
                value={block.amount}
                onChange={(e) => onUpdate({ ...block, amount: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('email.currency', 'Monedă')}</label>
              <input
                type="text"
                value={block.currency}
                onChange={(e) => onUpdate({ ...block, currency: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('email.perks', 'Beneficii')}</label>
            <textarea
              value={(block.perks || []).join('\n')}
              rows={4}
              onChange={(e) =>
                onUpdate({
                  ...block,
                  perks: e.target.value.split('\n').filter((p) => p.trim().length > 0),
                })
              }
              className={textareaClass}
            />
          </div>

          <div className="pt-2 border-t border-zinc-800/60 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {renderColorInput(t('email.accentColor', 'Culoare Pachet'), block.accentColor, '#d97706', (accentColor) => onUpdate({ ...block, accentColor }))}
              {renderColorInput(t('email.cardBgColor', 'Fundal Card'), block.cardBgColor, '#f4f4f5', (cardBgColor) => onUpdate({ ...block, cardBgColor }))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {renderColorInput(t('email.cardBorderColor', 'Bordură Card'), block.cardBorderColor, '#e4e4e7', (cardBorderColor) => onUpdate({ ...block, cardBorderColor }))}
              {renderColorInput(t('email.textColor', 'Culoare Sumă'), block.textColor, '#09090b', (textColor) => onUpdate({ ...block, textColor }))}
            </div>
          </div>
        </div>
      )}

      {block.type === 'stat_card' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('email.statValue', 'Valoare')}</label>
            <input
              type="text"
              value={block.value}
              onChange={(e) => onUpdate({ ...block, value: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t('email.statLabel', 'Titlu')}</label>
            <input
              type="text"
              value={block.label}
              onChange={(e) => onUpdate({ ...block, label: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t('email.statDesc', 'Descriere')}</label>
            <input
              type="text"
              value={block.description || ''}
              onChange={(e) => onUpdate({ ...block, description: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2">
            {renderColorInput(t('email.accentColor', 'Culoare Valoare'), block.accentColor, '#d97706', (accentColor) => onUpdate({ ...block, accentColor }))}
            {renderColorInput(t('email.cardBgColor', 'Fundal Card'), block.cardBgColor, '#f8fafc', (cardBgColor) => onUpdate({ ...block, cardBgColor }))}
          </div>
        </div>
      )}

      {block.type === 'proposal_deck' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('email.deckTitle', 'Titlu')}</label>
            <input
              type="text"
              value={block.title}
              onChange={(e) => onUpdate({ ...block, title: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>{t('email.fileSize', 'Format / Mărime')}</label>
              <input
                type="text"
                value={block.fileSize || 'PDF • 4.2 MB'}
                onChange={(e) => onUpdate({ ...block, fileSize: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('email.buttonText', 'Text Buton')}</label>
              <input
                type="text"
                value={block.buttonText || 'Descarcă'}
                onChange={(e) => onUpdate({ ...block, buttonText: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('email.downloadUrl', 'URL Descărcare')}</label>
            <input
              type="text"
              value={block.downloadUrl}
              onChange={(e) => onUpdate({ ...block, downloadUrl: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2">
            {renderColorInput(t('email.accentColor', 'Culoare Accent'), block.accentColor, '#d97706', (accentColor) => onUpdate({ ...block, accentColor }))}
            {renderColorInput(t('email.cardBgColor', 'Fundal Card'), block.cardBgColor, '#fafafa', (cardBgColor) => onUpdate({ ...block, cardBgColor }))}
          </div>
        </div>
      )}

      {block.type === 'multi_column' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('email.columnCount', 'Număr Coloane')}</label>
            <input
              type="number"
              min={1}
              max={6}
              value={block.columnCount || (block.columns?.length || 2)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const clean = e.target.value.replace(/^0+(?=\d)/, '');
                const count = Math.max(1, Math.min(6, Number(clean) || 1));
                let cols = [...(block.columns || [])];
                while (cols.length < count) {
                  cols.push({ title: `Coloana ${cols.length + 1}`, content: '' });
                }
                onUpdate({ ...block, columnCount: count as any, columns: cols.slice(0, count) });
              }}
              className={inputClass}
            />
          </div>

          {(block.columns || []).map((col, idx) => (
            <div key={idx} className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
              <span className="text-[11px] font-bold text-amber-500 uppercase">Coloana {idx + 1}</span>
              <input
                type="text"
                value={col.title || ''}
                placeholder="Titlu coloană"
                onChange={(e) => {
                  const cols = [...block.columns];
                  cols[idx] = { ...cols[idx], title: e.target.value };
                  onUpdate({ ...block, columns: cols });
                }}
                className={inputClass}
              />
              <textarea
                value={col.content || ''}
                rows={2}
                placeholder="Conținut coloană..."
                onChange={(e) => {
                  const cols = [...block.columns];
                  cols[idx] = { ...cols[idx], content: e.target.value };
                  onUpdate({ ...block, columns: cols });
                }}
                className={textareaClass}
              />
            </div>
          ))}
        </div>
      )}

      {block.type === 'testimonial' && (
        <div className="space-y-3">
          <div>
            <label className={labelClass}>{t('email.quote', 'Testimonial')}</label>
            <textarea
              value={block.quote}
              rows={4}
              onChange={(e) => onUpdate({ ...block, quote: e.target.value })}
              className={textareaClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>{t('email.author', 'Nume')}</label>
              <input
                type="text"
                value={block.authorName}
                onChange={(e) => onUpdate({ ...block, authorName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('email.company', 'Companie / Rol')}</label>
              <input
                type="text"
                value={block.company || ''}
                onChange={(e) => onUpdate({ ...block, company: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2">
            {renderColorInput(t('email.accentColor', 'Culoare Accent'), block.accentColor, '#d97706', (accentColor) => onUpdate({ ...block, accentColor }))}
            {renderColorInput(t('email.cardBgColor', 'Fundal Card'), block.cardBgColor, '#fafafa', (cardBgColor) => onUpdate({ ...block, cardBgColor }))}
          </div>
        </div>
      )}

      {block.type === 'social_links' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={labelClass}>{t('email.socialLinks', 'Link-uri Social')}</label>
            <button
              type="button"
              onClick={() => {
                const links = [...(block.links || [])];
                links.push({ platform: 'website', url: 'https://...', label: 'Website' });
                onUpdate({ ...block, links });
              }}
              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>Adaugă Link</span>
            </button>
          </div>

          {(block.links || []).map((link, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <select
                value={link.platform}
                onChange={(e) => {
                  const links = [...block.links];
                  links[idx] = { ...links[idx], platform: e.target.value as any };
                  onUpdate({ ...block, links });
                }}
                className={`w-28 ${inputClass}`}
              >
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="website">Website</option>
                <option value="youtube">YouTube</option>
                <option value="twitter">X / Twitter</option>
              </select>
              <input
                type="text"
                value={link.url}
                onChange={(e) => {
                  const links = [...block.links];
                  links[idx] = { ...links[idx], url: e.target.value };
                  onUpdate({ ...block, links });
                }}
                placeholder="https://..."
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => {
                  const links = block.links.filter((_, i) => i !== idx);
                  onUpdate({ ...block, links });
                }}
                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="pt-2 border-t border-zinc-800/60">
            {renderColorInput(t('email.accentColor', 'Culoare Butoane'), block.accentColor, '#d97706', (accentColor) => onUpdate({ ...block, accentColor }))}
          </div>
        </div>
      )}

      {block.type === 'image' && (
        <div className="space-y-3">
          <ImageUploadField
            label={t('email.imageUrl', 'Imagine')}
            value={block.imageUrl || ''}
            onChange={(imageUrl) => onUpdate({ ...block, imageUrl })}
            isDarkMode={isDarkMode}
          />

          <div>
            <label className={labelClass}>{t('email.altText', 'Text Alternativ')}</label>
            <input
              type="text"
              value={block.altText || ''}
              onChange={(e) => onUpdate({ ...block, altText: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t('email.linkUrl', 'URL Link')}</label>
            <input
              type="text"
              value={block.linkUrl || ''}
              placeholder="https://..."
              onChange={(e) => onUpdate({ ...block, linkUrl: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={subLabelClass}>{t('email.align', 'Aliniere')}</label>
              <select
                value={block.align || 'center'}
                onChange={(e) => onUpdate({ ...block, align: e.target.value as any })}
                className={inputClass}
              >
                <option value="center">{t('email.alignCenter', 'Centru')}</option>
                <option value="left">{t('email.alignLeft', 'Stânga')}</option>
                <option value="right">{t('email.alignRight', 'Dreapta')}</option>
              </select>
            </div>

            <div>
              <label className={subLabelClass}>{t('email.maxHeight', 'Înălțime Maximă')}</label>
              <input
                type="text"
                value={block.maxHeight || '300px'}
                placeholder="300px"
                onChange={(e) => onUpdate({ ...block, maxHeight: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      )}

      {block.type === 'divider' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>{t('email.spacing', 'Spațiere')}</label>
              <select
                value={block.spacing}
                onChange={(e) => onUpdate({ ...block, spacing: e.target.value as any })}
                className={inputClass}
              >
                <option value="sm">{t('email.spacingSmall', 'Mică')}</option>
                <option value="md">{t('email.spacingMedium', 'Medie')}</option>
                <option value="lg">{t('email.spacingLarge', 'Mare')}</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>{t('email.lineStyle', 'Stil Linie')}</label>
              <select
                value={block.lineStyle || 'solid'}
                onChange={(e) => onUpdate({ ...block, lineStyle: e.target.value as any })}
                className={inputClass}
              >
                <option value="solid">{t('email.styleSolid', 'Solid')}</option>
                <option value="dashed">{t('email.styleDashed', 'Dashed')}</option>
                <option value="dotted">{t('email.styleDotted', 'Dotted')}</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60">
            {renderColorInput(t('email.lineColor', 'Culoare Linie'), block.lineColor, '#e4e4e7', (lineColor) => onUpdate({ ...block, lineColor }))}
          </div>
        </div>
      )}

      {block.type === 'signature' && (
        <div className="space-y-2.5">
          <div>
            <label className={labelClass}>{t('email.senderName', 'Nume Expeditor')}</label>
            <input
              type="text"
              value={block.senderName}
              onChange={(e) => onUpdate({ ...block, senderName: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>{t('email.senderRole', 'Rol')}</label>
              <input
                type="text"
                value={block.senderRole || ''}
                placeholder="Ex: Coordonator"
                onChange={(e) => onUpdate({ ...block, senderRole: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('email.organization', 'Organizație')}</label>
              <input
                type="text"
                value={block.organization || ''}
                placeholder="Ex: Organizație"
                onChange={(e) => onUpdate({ ...block, organization: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>{t('email.phone', 'Telefon')}</label>
              <input
                type="text"
                value={block.phone || ''}
                onChange={(e) => onUpdate({ ...block, phone: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('email.emailAddress', 'Email')}</label>
              <input
                type="text"
                value={block.email || ''}
                onChange={(e) => onUpdate({ ...block, email: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2">
            {renderColorInput(t('email.textColor', 'Culoare Nume'), block.textColor, '#09090b', (textColor) => onUpdate({ ...block, textColor }))}
            {renderColorInput(t('email.accentColor', 'Culoare Accent'), block.accentColor, '#d97706', (accentColor) => onUpdate({ ...block, accentColor }))}
          </div>
        </div>
      )}

      {/* Universal Border, Corner & Padding Controls for ALL Blocks */}
      <div className="pt-3 border-t border-zinc-800 space-y-3">
        <div className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {t('email.borderAndPadding', 'Bordură, Colțuri & Spațiere')}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={subLabelClass}>{t('email.borderWidth', 'Grosime Bordură')}</label>
            <input
              type="number"
              min={0}
              max={50}
              value={block.borderWidth || 0}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const clean = e.target.value.replace(/^0+(?=\d)/, '');
                onUpdate({ ...block, borderWidth: Number(clean) || 0 });
              }}
              className={inputClass}
            />
          </div>

          <div>
            <label className={subLabelClass}>{t('email.borderStyle', 'Stil Bordură')}</label>
            <select
              value={block.borderStyle || 'solid'}
              onChange={(e) => onUpdate({ ...block, borderStyle: e.target.value as any })}
              className={inputClass}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={subLabelClass}>{t('email.borderRadius', 'Rotunjire')}</label>
            <input
              type="number"
              min={0}
              max={100}
              value={block.borderRadius !== undefined ? block.borderRadius : 0}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const clean = e.target.value.replace(/^0+(?=\d)/, '');
                onUpdate({ ...block, borderRadius: Number(clean) || 0 });
              }}
              className={inputClass}
            />
          </div>

          <div>
            <label className={subLabelClass}>{t('email.paddingVertical', 'Spațiere Verticală')}</label>
            <input
              type="number"
              min={0}
              max={200}
              value={block.paddingTop !== undefined ? block.paddingTop : 20}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const clean = e.target.value.replace(/^0+(?=\d)/, '');
                const val = Number(clean) || 0;
                onUpdate({ ...block, paddingTop: val, paddingBottom: val });
              }}
              className={inputClass}
            />
          </div>
        </div>

        {renderColorInput(
          t('email.borderColor', 'Culoare Bordură'),
          block.borderColor,
          '#e4e4e7',
          (borderColor) => onUpdate({ ...block, borderColor })
        )}

        {renderColorInput(
          t('email.backgroundColor', 'Fundal'),
          block.backgroundColor,
          '#ffffff',
          (backgroundColor) => onUpdate({ ...block, backgroundColor })
        )}
      </div>
    </div>
  );
};
