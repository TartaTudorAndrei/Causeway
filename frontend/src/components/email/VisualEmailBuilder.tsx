import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Smartphone,
  Monitor,
} from 'lucide-react';
import type { EmailBlock, EmailBlockType, EmailGlobalSettings, MergeTagContext } from '../../types/email';
import { useLanguage } from '../../context/LanguageContext';
import { SortableBlockItem } from './SortableBlockItem';
import { BlockInspector, EmailSettingsInspector } from './BlockInspector';

interface VisualEmailBuilderProps {
  blocks: EmailBlock[];
  onChange: (blocks: EmailBlock[]) => void;
  settings?: EmailGlobalSettings;
  onSettingsChange?: (settings: EmailGlobalSettings) => void;
  mergeContext?: MergeTagContext;
  isDarkMode?: boolean;
}

function createBlock(type: EmailBlockType): EmailBlock {
  const id = 'block_' + Math.random().toString(36).substring(2, 9);
  switch (type) {
    case 'header':
      return {
        id,
        type: 'header',
        title: 'Lorem Ipsum',
        subtitle: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
        showLogo: true,
        logoText: 'LOREM',
        align: 'center',
        backgroundColor: '#ffffff',
        textColor: '#09090b',
        accentColor: '#d97706',
        paddingTop: 32,
        paddingBottom: 20,
      };
    case 'text':
      return {
        id,
        type: 'text',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        fontSize: 'base',
        align: 'left',
        backgroundColor: '#ffffff',
        textColor: '#27272a',
        paddingTop: 24,
        paddingBottom: 24,
      };
    case 'button':
      return {
        id,
        type: 'button',
        label: 'Lorem Ipsum',
        url: 'https://...',
        variant: 'primary',
        align: 'center',
        buttonColor: '#d97706',
        buttonTextColor: '#ffffff',
        borderRadiusType: 'md',
        backgroundColor: '#ffffff',
        paddingTop: 16,
        paddingBottom: 24,
      };
    case 'spacer':
      return {
        id,
        type: 'spacer',
        height: 24,
        backgroundColor: 'transparent',
      };
    case 'list':
      return {
        id,
        type: 'list',
        items: [
          'Lorem ipsum dolor sit amet',
          'Consectetur adipiscing elit',
          'Integer nec odio praesent libero',
        ],
        listStyle: 'bullet',
        align: 'left',
        backgroundColor: '#ffffff',
        textColor: '#27272a',
        accentColor: '#d97706',
        paddingTop: 16,
        paddingBottom: 20,
      };
    case 'quote':
      return {
        id,
        type: 'quote',
        quote: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.',
        author: 'Lorem Ipsum',
        caption: 'Dolor sit amet',
        align: 'left',
        backgroundColor: '#ffffff',
        textColor: '#27272a',
        accentColor: '#d97706',
        paddingTop: 16,
        paddingBottom: 24,
      };
    case 'stat_card':
      return {
        id,
        type: 'stat_card',
        value: '99+',
        label: 'Lorem Ipsum',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        cardBgColor: '#f8fafc',
        cardBorderColor: '#e2e8f0',
        accentColor: '#d97706',
        textColor: '#09090b',
        backgroundColor: '#ffffff',
        align: 'center',
        paddingTop: 16,
        paddingBottom: 20,
      };
    case 'card':
      return {
        id,
        type: 'card',
        title: 'Lorem Ipsum',
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        buttonLabel: 'Lorem Ipsum',
        buttonUrl: 'https://...',
        cardBgColor: '#f8fafc',
        cardBorderColor: '#e2e8f0',
        accentColor: '#d97706',
        textColor: '#09090b',
        backgroundColor: '#ffffff',
        align: 'left',
        paddingTop: 16,
        paddingBottom: 24,
      };
    case 'badge':
      return {
        id,
        type: 'badge',
        text: 'LOREM IPSUM',
        align: 'center',
        badgeColor: '#d97706',
        badgeTextColor: '#ffffff',
        backgroundColor: '#ffffff',
        paddingTop: 12,
        paddingBottom: 12,
      };
    case 'multi_column':
      return {
        id,
        type: 'multi_column',
        columnCount: 2,
        columns: [
          {
            title: 'Lorem Ipsum',
            content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            buttonLabel: 'Lorem Ipsum',
            buttonUrl: 'https://...',
            accentColor: '#d97706',
          },
          {
            title: 'Lorem Ipsum',
            content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            buttonLabel: 'Lorem Ipsum',
            buttonUrl: 'https://...',
            accentColor: '#d97706',
          },
        ],
        cardBgColor: '#f8fafc',
        cardBorderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        paddingTop: 16,
        paddingBottom: 24,
      };
    case 'image':
      return {
        id,
        type: 'image',
        imageUrl: '',
        altText: 'Lorem ipsum',
        align: 'center',
        maxHeight: '300px',
        backgroundColor: '#ffffff',
        paddingTop: 16,
        paddingBottom: 24,
      };
    case 'divider':
      return {
        id,
        type: 'divider',
        spacing: 'md',
        lineColor: '#e4e4e7',
        lineStyle: 'solid',
        backgroundColor: '#ffffff',
      };
    case 'social_links':
      return {
        id,
        type: 'social_links',
        links: [
          { platform: 'website', url: 'https://...', label: 'Website' },
          { platform: 'instagram', url: 'https://...', label: 'Instagram' },
          { platform: 'linkedin', url: 'https://...', label: 'LinkedIn' },
        ],
        align: 'center',
        accentColor: '#d97706',
        backgroundColor: '#ffffff',
        paddingTop: 16,
        paddingBottom: 24,
      };
    case 'signature':
      return {
        id,
        type: 'signature',
        senderName: '{{sender_name}}',
        senderRole: 'Lorem Ipsum',
        organization: 'Lorem Ipsum',
        email: '{{sender_email}}',
        phone: '+00 000 000 000',
        backgroundColor: '#ffffff',
        textColor: '#09090b',
        accentColor: '#d97706',
        paddingTop: 20,
        paddingBottom: 32,
      };
    case 'sponsor_tier':
      return {
        id,
        type: 'sponsor_tier',
        tierName: 'Lorem Ipsum',
        amount: '10.000',
        currency: 'RON',
        perks: [
          'Lorem ipsum dolor sit amet',
          'Consectetur adipiscing elit',
        ],
        accentColor: '#d97706',
        cardBgColor: '#f4f4f5',
        cardBorderColor: '#e4e4e7',
        textColor: '#09090b',
        backgroundColor: '#ffffff',
        paddingTop: 16,
        paddingBottom: 24,
      };
    case 'proposal_deck':
      return {
        id,
        type: 'proposal_deck',
        title: 'Lorem Ipsum',
        fileSize: 'PDF • 4.2 MB',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        downloadUrl: 'https://...',
        buttonText: 'Lorem Ipsum',
        cardBgColor: '#fafafa',
        cardBorderColor: '#e4e4e7',
        accentColor: '#d97706',
        backgroundColor: '#ffffff',
        paddingTop: 16,
        paddingBottom: 24,
      };
    case 'testimonial':
      return {
        id,
        type: 'testimonial',
        quote: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        authorName: 'Lorem Ipsum',
        authorRole: 'Lorem Ipsum',
        company: 'Lorem Ipsum',
        cardBgColor: '#fafafa',
        cardBorderColor: '#e4e4e7',
        accentColor: '#d97706',
        backgroundColor: '#ffffff',
        paddingTop: 16,
        paddingBottom: 24,
      };
  }
}

export const VisualEmailBuilder: React.FC<VisualEmailBuilderProps> = ({
  blocks,
  onChange,
  settings,
  onSettingsChange,
  mergeContext = {},
  isDarkMode = true,
}) => {
  const { t } = useLanguage();

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showSettingsInspector, setShowSettingsInspector] = useState<boolean>(false);
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'canvas' | 'palette' | 'inspector'>('canvas');

  const [internalSettings, setInternalSettings] = useState<EmailGlobalSettings>(
    settings || {
      emailBgColor: '#ffffff',
      backdropColor: '#f4f4f5',
      canvasWidth: 600,
      sheetBorderRadius: 16,
      sheetBorderWidth: 1,
      sheetBorderColor: '#e4e4e7',
      fontFamily: 'sans',
    }
  );

  useEffect(() => {
    if (settings) {
      setInternalSettings(settings);
    }
  }, [settings]);

  const handleUpdateSettings = (newSettings: EmailGlobalSettings) => {
    setInternalSettings(newSettings);
    if (onSettingsChange) onSettingsChange(newSettings);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((item) => item.id === active.id);
      const newIndex = blocks.findIndex((item) => item.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(blocks, oldIndex, newIndex));
      }
    }
  };

  const handleAddBlock = (type: EmailBlockType) => {
    const newBlock = createBlock(type);
    onChange([...blocks, newBlock]);
    setSelectedBlockId(newBlock.id);
    setShowSettingsInspector(false);
    setMobileTab('canvas');
  };

  const handleDeleteBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const handleDuplicateBlock = (index: number) => {
    const original = blocks[index];
    const copy: EmailBlock = {
      ...JSON.parse(JSON.stringify(original)),
      id: 'block_' + Math.random().toString(36).substring(2, 9),
    };
    const next = [...blocks];
    next.splice(index + 1, 0, copy);
    onChange(next);
    setSelectedBlockId(copy.id);
    setShowSettingsInspector(false);
    setMobileTab('canvas');
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    onChange(arrayMove(blocks, index, targetIndex));
  };

  const handleUpdateSelectedBlock = (updated: EmailBlock) => {
    onChange(blocks.map((b) => (b.id === updated.id ? updated : b)));
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  const targetWidth = internalSettings.canvasWidth || 600;

  return (
    <div className={`flex-1 flex flex-col md:flex-row h-full min-h-0 overflow-hidden border rounded-2xl relative ${
      isDarkMode ? 'bg-zinc-950 border-zinc-850' : 'bg-zinc-50 border-zinc-200 shadow-xs'
    }`}>
      {/* Mobile Segmented Tab Switcher */}
      <div className={`md:hidden flex items-center justify-around p-1.5 border-b shrink-0 text-xs font-semibold ${
        isDarkMode ? 'bg-zinc-900 border-zinc-850' : 'bg-zinc-100 border-zinc-200'
      }`}>
        <button
          type="button"
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
            mobileTab === 'canvas'
              ? isDarkMode ? 'bg-zinc-800 text-white font-bold' : 'bg-white text-zinc-900 font-bold shadow-2xs'
              : isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        >
          {t('email.canvasTab', 'Canvas')}
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('palette')}
          className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
            mobileTab === 'palette'
              ? isDarkMode ? 'bg-zinc-800 text-white font-bold' : 'bg-white text-zinc-900 font-bold shadow-2xs'
              : isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        >
          {t('email.blocksTab', 'Blocuri')}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!selectedBlockId && !showSettingsInspector) {
              setShowSettingsInspector(true);
            }
            setMobileTab('inspector');
          }}
          className={`flex-1 py-1.5 rounded-lg text-center transition cursor-pointer ${
            mobileTab === 'inspector'
              ? isDarkMode ? 'bg-zinc-800 text-white font-bold' : 'bg-white text-zinc-900 font-bold shadow-2xs'
              : isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
          }`}
        >
          {selectedBlock ? t('email.blockTab', 'Setări Bloc') : t('email.aspectTab', 'Aspect')}
        </button>
      </div>

      {/* 1. Left Sidebar: Block Palette */}
      <div className={`w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r p-3 space-y-3 flex flex-col ${
        mobileTab === 'palette' ? 'flex flex-1 min-h-0' : 'hidden md:flex'
      } ${isDarkMode ? 'bg-zinc-900/60 border-zinc-850' : 'bg-zinc-100/80 border-zinc-200'}`}>
        <div className={`pb-1 border-b flex items-center justify-between ${isDarkMode ? 'border-zinc-850/60' : 'border-zinc-200'}`}>
          <span className={`text-[11px] font-bold uppercase tracking-wider ${
            isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            {t('email.addBlock', 'Blocuri Disponibile')}
          </span>
          <span className="text-[10px] text-zinc-500 md:hidden">
            {t('email.tapToAdd', 'Apasă pentru adăugare')}
          </span>
        </div>

        {/* Palette Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5 overflow-y-auto no-scrollbar">
          {[
            { type: 'header' as const, label: t('email.blockHeader', 'Antet') },
            { type: 'text' as const, label: t('email.blockText', 'Text') },
            { type: 'button' as const, label: t('email.blockButton', 'Buton') },
            { type: 'image' as const, label: t('email.blockImage', 'Imagine') },
            { type: 'multi_column' as const, label: t('email.blockMultiColumn', 'Coloane') },
            { type: 'list' as const, label: t('email.blockList', 'Listă') },
            { type: 'quote' as const, label: t('email.blockQuote', 'Citat') },
            { type: 'stat_card' as const, label: t('email.blockStatCard', 'Metrică') },
            { type: 'card' as const, label: t('email.blockCard', 'Card') },
            { type: 'badge' as const, label: t('email.blockBadge', 'Badge') },
            { type: 'divider' as const, label: t('email.blockDivider', 'Separator') },
            { type: 'spacer' as const, label: t('email.blockSpacer', 'Spațiu') },
            { type: 'social_links' as const, label: t('email.blockSocialLinks', 'Social') },
            { type: 'signature' as const, label: t('email.blockSignature', 'Semnătură') },
          ].map(({ type, label }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleAddBlock(type)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer text-left border ${
                isDarkMode
                  ? 'text-zinc-300 bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:text-white'
                  : 'text-zinc-700 bg-white border-zinc-300 hover:border-zinc-400 hover:text-zinc-900 shadow-2xs'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Middle Area: Drag-and-Drop Visual Canvas */}
      <div className={`flex-1 min-h-0 overflow-hidden ${
        mobileTab === 'canvas' ? 'flex flex-col' : 'hidden md:flex md:flex-col'
      } ${isDarkMode ? 'bg-[#09090b]' : 'bg-zinc-200/70'}`}>
        {/* Top Control Bar */}
        <div className={`px-4 py-2 border-b flex items-center justify-between shrink-0 ${
          isDarkMode ? 'bg-zinc-900/80 border-zinc-850' : 'bg-zinc-100/90 border-zinc-200'
        }`}>
          <div className={`flex items-center space-x-1.5 p-1 rounded-xl border ${
            isDarkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-200/80 border-zinc-300'
          }`}>
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewport === 'desktop'
                  ? isDarkMode
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'bg-white text-zinc-900 font-bold shadow-2xs'
                  : isDarkMode
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
              title={t('email.viewDesktop', 'Desktop')}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewport === 'mobile'
                  ? isDarkMode
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'bg-white text-zinc-900 font-bold shadow-2xs'
                  : isDarkMode
                  ? 'text-zinc-400 hover:text-white'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
              title={t('email.viewMobile', 'Mobil')}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                const nextState = !showSettingsInspector || selectedBlockId !== null;
                setShowSettingsInspector(nextState);
                setSelectedBlockId(null);
                if (nextState && typeof window !== 'undefined' && window.innerWidth < 768) {
                  setMobileTab('inspector');
                }
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                showSettingsInspector && !selectedBlockId
                  ? isDarkMode
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-zinc-300 text-zinc-900 border-zinc-400 font-bold'
                  : isDarkMode
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                  : 'bg-white border-zinc-300 text-zinc-700 hover:text-zinc-900 shadow-2xs'
              }`}
            >
              <span>{t('email.emailBackground', 'Fundal & Aspect')}</span>
            </button>

            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                previewMode
                  ? isDarkMode
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-zinc-300 text-zinc-900 border-zinc-400 font-bold'
                  : isDarkMode
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white'
                  : 'bg-white border-zinc-300 text-zinc-700 hover:text-zinc-900 shadow-2xs'
              }`}
            >
              <span>{previewMode ? t('email.editMode', 'Mod Editare') : t('email.preview', 'Previzualizare')}</span>
            </button>
          </div>
        </div>

        {/* Visual Canvas Workspace */}
        <div
          onClick={() => {
            setSelectedBlockId(null);
            setShowSettingsInspector(true);
          }}
          className="flex-1 min-h-0 p-3 sm:p-5 flex justify-center items-stretch overflow-hidden"
        >
          <div
            style={{
              width: viewport === 'desktop' ? `${targetWidth}px` : '375px',
              maxWidth: '100%',
            }}
            className="transition-all duration-200 flex flex-col h-full max-h-full"
          >
            {/* The Email Sheet Container */}
            <div
              style={{
                backgroundColor: internalSettings.emailBgColor || '#ffffff',
                borderRadius: internalSettings.sheetBorderRadius !== undefined ? `${internalSettings.sheetBorderRadius}px` : '16px',
                borderWidth: internalSettings.sheetBorderWidth !== undefined ? `${internalSettings.sheetBorderWidth}px` : '1px',
                borderColor: internalSettings.sheetBorderColor || '#e4e4e7',
                borderStyle: internalSettings.sheetBorderWidth === 0 ? 'none' : 'solid',
              }}
              className="flex-1 min-h-0 shadow-xl flex flex-col overflow-hidden transition-colors"
            >
              <div
                style={{ backgroundColor: internalSettings.emailBgColor || '#ffffff' }}
                className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-0"
              >
                {blocks.length === 0 ? (
                  <div className="py-16 text-center text-zinc-500 space-y-3">
                    <p className="text-xs">{t('email.emptyCanvas', 'Canvas gol. Adaugă blocuri din stânga.')}</p>
                    <button
                      type="button"
                      onClick={() => handleAddBlock('header')}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      <span>{t('email.addHeader', 'Adaugă Antet')}</span>
                    </button>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={blocks.map((b) => b.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {blocks.map((block, index) => (
                        <SortableBlockItem
                          key={block.id}
                          id={block.id}
                          block={block}
                          index={index}
                          isSelected={selectedBlockId === block.id && !previewMode}
                          onSelect={() => {
                            setSelectedBlockId(block.id);
                            setShowSettingsInspector(false);
                            if (typeof window !== 'undefined' && window.innerWidth < 768) {
                              setMobileTab('inspector');
                            }
                          }}
                          onDelete={() => handleDeleteBlock(block.id)}
                          onDuplicate={() => handleDuplicateBlock(index)}
                          onMoveUp={() => handleMoveBlock(index, 'up')}
                          onMoveDown={() => handleMoveBlock(index, 'down')}
                          canMoveUp={index > 0}
                          canMoveDown={index < blocks.length - 1}
                          mergeContext={mergeContext}
                          isDarkMode={isDarkMode}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Right Sidebar: Inspector */}
      {selectedBlock && !previewMode ? (
        <div className={`w-full md:w-80 shrink-0 md:h-full min-h-0 flex flex-col overflow-hidden ${
          mobileTab === 'inspector' ? 'flex-1' : 'hidden md:flex'
        }`}>
          <BlockInspector
            block={selectedBlock}
            onUpdate={handleUpdateSelectedBlock}
            onClose={() => {
              setSelectedBlockId(null);
              setMobileTab('canvas');
            }}
            isDarkMode={isDarkMode}
          />
        </div>
      ) : showSettingsInspector && !previewMode ? (
        <div className={`w-full md:w-80 shrink-0 md:h-full min-h-0 flex flex-col overflow-hidden ${
          mobileTab === 'inspector' ? 'flex-1' : 'hidden md:flex'
        }`}>
          <EmailSettingsInspector
            settings={internalSettings}
            onUpdate={handleUpdateSettings}
            onClose={() => {
              setShowSettingsInspector(false);
              setMobileTab('canvas');
            }}
            isDarkMode={isDarkMode}
          />
        </div>
      ) : mobileTab === 'inspector' ? (
        <div className="flex-1 md:hidden flex flex-col items-center justify-center p-6 text-center text-zinc-500 space-y-2">
          <p className="text-xs font-semibold">
            {t('email.noBlockSelected', 'Selectează un bloc din Canvas sau configurează Aspectul.')}
          </p>
          <button
            type="button"
            onClick={() => setShowSettingsInspector(true)}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
          >
            {t('email.emailBackground', 'Fundal & Aspect')}
          </button>
        </div>
      ) : null}
    </div>
  );
};
