import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, ArrowUp, ArrowDown, Download, FileText, Quote, Share2, BarChart2 } from 'lucide-react';
import type { EmailBlock, MergeTagContext } from '../../types/email';
import { hydrateMergeTags } from '../../utils/emailCompiler';

interface SortableBlockItemProps {
  id: string;
  block: EmailBlock;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  mergeContext?: MergeTagContext;
  isDarkMode?: boolean;
}

export const SortableBlockItem: React.FC<SortableBlockItemProps> = ({
  id,
  block,
  index: _index,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  mergeContext = {},
  isDarkMode: _isDarkMode = true,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const blockRadius = block.borderRadius ? `${block.borderRadius}px` : undefined;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : isSelected ? 20 : 1,
    opacity: isDragging ? 0.5 : 1,
    borderRadius: blockRadius,
  };

  const blockBorder: React.CSSProperties = {
    borderWidth: block.borderWidth ? `${block.borderWidth}px` : undefined,
    borderStyle: block.borderStyle && block.borderStyle !== 'none' ? block.borderStyle : undefined,
    borderColor: block.borderColor || undefined,
    borderRadius: blockRadius,
    paddingTop: block.paddingTop !== undefined ? `${block.paddingTop}px` : undefined,
    paddingBottom: block.paddingBottom !== undefined ? `${block.paddingBottom}px` : undefined,
    paddingLeft: block.paddingLeft !== undefined ? `${block.paddingLeft}px` : undefined,
    paddingRight: block.paddingRight !== undefined ? `${block.paddingRight}px` : undefined,
  };

  const renderBlockPreview = () => {
    switch (block.type) {
      case 'header': {
        const title = hydrateMergeTags(block.title || 'Lorem Ipsum', mergeContext);
        const sub = block.subtitle ? hydrateMergeTags(block.subtitle, mergeContext) : '';
        const align = block.align || 'center';
        const bg = block.backgroundColor || '#ffffff';
        const titleColor = block.textColor || '#09090b';
        const accent = block.accentColor || '#d97706';
        const logoText = block.logoText ? hydrateMergeTags(block.logoText, mergeContext) : '';
        const logoImg = block.logoImageUrl ? hydrateMergeTags(block.logoImageUrl, mergeContext) : '';

        return (
          <div
            style={{ textAlign: align, backgroundColor: bg, ...blockBorder }}
            className="py-6 px-6"
          >
            {block.showLogo && (
              logoImg ? (
                <div style={{ textAlign: align }} className="mb-2">
                  <img src={logoImg} alt="Logo" className="max-h-10 max-w-[160px] inline-block object-contain" />
                </div>
              ) : (
                <div style={{ color: accent }} className="text-sm font-extrabold tracking-widest mb-1.5 uppercase">
                  {logoText || 'LOREM'}
                </div>
              )
            )}
            <h2 style={{ color: titleColor }} className="text-lg sm:text-xl font-bold leading-tight">
              {title}
            </h2>
            {sub && <p className="text-xs sm:text-sm text-zinc-500 mt-1.5">{sub}</p>}
          </div>
        );
      }

      case 'text': {
        const text = hydrateMergeTags(block.content || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...', mergeContext);
        const bg = block.backgroundColor || '#ffffff';
        const textColor = block.textColor || '#27272a';
        const align = block.align || 'left';
        const fontSizeClass = block.fontSize === 'sm' ? 'text-xs' : block.fontSize === 'lg' ? 'text-base' : 'text-xs sm:text-sm';
        return (
          <div
            style={{ backgroundColor: bg, color: textColor, textAlign: align, ...blockBorder }}
            className={`py-5 px-6 leading-relaxed whitespace-pre-wrap ${fontSizeClass}`}
          >
            {text}
          </div>
        );
      }

      case 'button': {
        const label = hydrateMergeTags(block.label || 'Lorem Ipsum', mergeContext);
        const align = block.align || 'center';
        const bgBlock = block.backgroundColor || '#ffffff';

        let btnBg = '#d97706';
        let btnText = '#ffffff';
        let btnBorder = 'none';

        if (block.variant === 'secondary') {
          btnBg = '#f4f4f5';
          btnText = '#18181b';
          btnBorder = '1px solid #e4e4e7';
        } else if (block.variant === 'custom') {
          btnBg = block.buttonColor || '#d97706';
          btnText = block.buttonTextColor || '#ffffff';
          btnBorder = 'none';
        } else if (block.buttonColor || block.buttonTextColor) {
          btnBg = block.buttonColor || '#d97706';
          btnText = block.buttonTextColor || '#ffffff';
        }

        const radiusClass = block.borderRadiusType === 'none'
          ? 'rounded-none'
          : block.borderRadiusType === 'sm'
          ? 'rounded-sm'
          : block.borderRadiusType === 'lg'
          ? 'rounded-2xl'
          : block.borderRadiusType === 'full'
          ? 'rounded-full'
          : 'rounded-xl';

        return (
          <div
            style={{ backgroundColor: bgBlock, ...blockBorder }}
            className={`py-4 px-6 flex ${
              align === 'center'
                ? 'justify-center'
                : align === 'right'
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            <span
              style={{ backgroundColor: btnBg, color: btnText, border: btnBorder, borderRadius: block.borderRadius !== undefined ? `${block.borderRadius}px` : undefined }}
              className={`px-6 py-2.5 text-xs sm:text-sm font-bold transition shadow-xs ${radiusClass}`}
            >
              {label}
            </span>
          </div>
        );
      }

      case 'spacer': {
        const h = block.height || 24;
        const bg = block.backgroundColor || 'transparent';
        return (
          <div
            style={{ height: `${h}px`, backgroundColor: bg, ...blockBorder }}
            className="w-full flex items-center justify-center text-[10px] text-zinc-400/50 border border-dashed border-zinc-700/30 rounded-lg select-none"
          >
            {h}px
          </div>
        );
      }

      case 'list': {
        const items = block.items || [];
        const bg = block.backgroundColor || '#ffffff';
        const textColor = block.textColor || '#27272a';
        const accent = block.accentColor || '#d97706';
        const align = block.align || 'left';
        const styleType = block.listStyle || 'bullet';

        return (
          <div
            style={{ backgroundColor: bg, textAlign: align, ...blockBorder }}
            className="py-4 px-6"
          >
            {styleType === 'number' ? (
              <ol className="list-decimal pl-5 text-xs sm:text-sm space-y-1" style={{ color: textColor }}>
                {items.map((item, idx) => (
                  <li key={idx}>{hydrateMergeTags(item, mergeContext)}</li>
                ))}
              </ol>
            ) : styleType === 'check' ? (
              <ul className="space-y-1.5 text-xs sm:text-sm" style={{ color: textColor }}>
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-center space-x-2">
                    <span style={{ color: accent }} className="font-bold shrink-0">✓</span>
                    <span>{hydrateMergeTags(item, mergeContext)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="list-disc pl-5 text-xs sm:text-sm space-y-1" style={{ color: textColor }}>
                {items.map((item, idx) => (
                  <li key={idx}>{hydrateMergeTags(item, mergeContext)}</li>
                ))}
              </ul>
            )}
          </div>
        );
      }

      case 'quote': {
        const quote = hydrateMergeTags(block.quote || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...', mergeContext);
        const author = block.author ? hydrateMergeTags(block.author, mergeContext) : '';
        const caption = block.caption ? hydrateMergeTags(block.caption, mergeContext) : '';
        const bgBlock = block.backgroundColor || '#ffffff';
        const accent = block.accentColor || '#d97706';
        const textColor = block.textColor || '#27272a';
        const align = block.align || 'left';

        return (
          <div style={{ backgroundColor: bgBlock, ...blockBorder }} className="py-4 px-6">
            <div
              style={{ borderLeftColor: accent, borderLeftWidth: '4px', textAlign: align }}
              className="pl-4 py-1 space-y-1"
            >
              <Quote style={{ color: accent }} className="w-4 h-4 opacity-70 mb-1" />
              <p style={{ color: textColor }} className="text-xs sm:text-sm italic leading-relaxed">
                &ldquo;{quote}&rdquo;
              </p>
              {(author || caption) && (
                <div className="text-xs font-bold text-zinc-900 pt-0.5">
                  {author} {caption && <span className="text-zinc-500 font-normal">&bull; {caption}</span>}
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'card': {
        const title = block.title ? hydrateMergeTags(block.title, mergeContext) : '';
        const content = hydrateMergeTags(block.content || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...', mergeContext);
        const btnLabel = block.buttonLabel ? hydrateMergeTags(block.buttonLabel, mergeContext) : '';
        const bgBlock = block.backgroundColor || '#ffffff';
        const cardBg = block.cardBgColor || '#f8fafc';
        const cardBorderColor = block.cardBorderColor || '#e2e8f0';
        const accent = block.accentColor || '#d97706';
        const textColor = block.textColor || '#09090b';
        const align = block.align || 'left';

        return (
          <div style={{ backgroundColor: bgBlock, ...blockBorder }} className="py-4 px-6">
            <div
              style={{ backgroundColor: cardBg, borderColor: cardBorderColor, textAlign: align }}
              className="p-5 rounded-2xl border space-y-2 shadow-2xs"
            >
              {title && <div style={{ color: textColor }} className="text-sm sm:text-base font-bold">{title}</div>}
              <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed">{content}</div>
              {btnLabel && (
                <div className="pt-1">
                  <span
                    style={{ backgroundColor: accent }}
                    className="inline-block px-4 py-1.5 rounded-lg text-white text-xs font-bold shadow-xs"
                  >
                    {btnLabel} &rarr;
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'badge': {
        const text = hydrateMergeTags(block.text || 'LOREM IPSUM', mergeContext);
        const bgBlock = block.backgroundColor || '#ffffff';
        const badgeBg = block.badgeColor || '#d97706';
        const badgeTextColor = block.badgeTextColor || '#ffffff';
        const align = block.align || 'center';

        return (
          <div
            style={{ backgroundColor: bgBlock, ...blockBorder }}
            className={`py-3 px-6 flex ${
              align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
            }`}
          >
            <span
              style={{ backgroundColor: badgeBg, color: badgeTextColor }}
              className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider shadow-2xs"
            >
              {text}
            </span>
          </div>
        );
      }

      case 'stat_card': {
        const val = hydrateMergeTags(block.value || '99+', mergeContext);
        const lbl = hydrateMergeTags(block.label || 'Lorem Ipsum', mergeContext);
        const desc = block.description ? hydrateMergeTags(block.description, mergeContext) : '';
        const bgBlock = block.backgroundColor || '#ffffff';
        const cardBg = block.cardBgColor || '#f8fafc';
        const cardBorderColor = block.cardBorderColor || '#e2e8f0';
        const accent = block.accentColor || '#d97706';
        const textColor = block.textColor || '#09090b';
        const align = block.align || 'center';

        return (
          <div style={{ backgroundColor: bgBlock, ...blockBorder }} className="py-4 px-6">
            <div
              style={{ backgroundColor: cardBg, borderColor: cardBorderColor, textAlign: align }}
              className="p-5 rounded-2xl border space-y-1.5 shadow-2xs"
            >
              <div className="flex items-center justify-center space-x-2">
                <BarChart2 style={{ color: accent }} className="w-5 h-5" />
                <span style={{ color: accent }} className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {val}
                </span>
              </div>
              <div style={{ color: textColor }} className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                {lbl}
              </div>
              {desc && <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>}
            </div>
          </div>
        );
      }

      case 'multi_column': {
        const cols = block.columns || [];
        const bgBlock = block.backgroundColor || '#ffffff';
        const cardBg = block.cardBgColor || '#f8fafc';
        const cardBorderColor = block.cardBorderColor || '#e2e8f0';

        return (
          <div style={{ backgroundColor: bgBlock, ...blockBorder }} className="py-4 px-6">
            <div className={`grid ${block.columnCount === 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
              {cols.map((col, idx) => (
                <div
                  key={idx}
                  style={{ backgroundColor: cardBg, borderColor: cardBorderColor }}
                  className="p-3.5 rounded-xl border space-y-1.5 flex flex-col justify-between"
                >
                  {col.imageUrl && (
                    <img src={col.imageUrl} alt="" className="w-full h-20 object-cover rounded-lg mb-1" />
                  )}
                  <div>
                    {col.title && <div className="text-xs font-bold text-zinc-900">{col.title}</div>}
                    <div className="text-[11px] text-zinc-600 leading-relaxed line-clamp-3">{col.content}</div>
                  </div>
                  {col.buttonLabel && (
                    <span style={{ color: col.accentColor || '#d97706' }} className="text-[11px] font-bold mt-1 inline-block">
                      {col.buttonLabel} &rarr;
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'social_links': {
        const links = block.links || [];
        const align = block.align || 'center';
        const bgBlock = block.backgroundColor || '#ffffff';
        const accent = block.accentColor || '#d97706';

        return (
          <div
            style={{ backgroundColor: bgBlock, ...blockBorder }}
            className={`py-4 px-6 flex flex-wrap gap-2 ${
              align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
            }`}
          >
            {links.map((link, idx) => (
              <span
                key={idx}
                style={{ backgroundColor: accent }}
                className="px-3 py-1 rounded-lg text-white text-xs font-semibold flex items-center space-x-1"
              >
                <Share2 className="w-3 h-3" />
                <span>{link.label || link.platform}</span>
              </span>
            ))}
          </div>
        );
      }

      case 'image': {
        const imgUrl = hydrateMergeTags(block.imageUrl || '', mergeContext);
        const alt = block.altText ? hydrateMergeTags(block.altText, mergeContext) : 'Lorem ipsum';
        const align = block.align || 'center';
        const bg = block.backgroundColor || '#ffffff';
        const maxH = block.maxHeight || '300px';

        return (
          <div
            style={{
              backgroundColor: bg,
              textAlign: align,
              ...blockBorder,
            }}
            className={`py-4 px-6 flex ${
              align === 'center'
                ? 'justify-center'
                : align === 'right'
                ? 'justify-end'
                : 'justify-start'
            }`}
          >
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={alt}
                style={{ maxHeight: maxH }}
                className="max-w-full rounded-xl object-contain"
              />
            ) : (
              <div className="w-full py-8 border-2 border-dashed border-zinc-300 rounded-xl flex items-center justify-center text-xs text-zinc-400">
                URL ...
              </div>
            )}
          </div>
        );
      }

      case 'divider': {
        const bg = block.backgroundColor || '#ffffff';
        const lineColor = block.lineColor || '#e4e4e7';
        const lineStyle = block.lineStyle || 'solid';
        return (
          <div
            style={{ backgroundColor: bg, ...blockBorder }}
            className={`px-6 ${block.spacing === 'sm' ? 'py-2' : block.spacing === 'lg' ? 'py-6' : 'py-3.5'}`}
          >
            <hr style={{ borderColor: lineColor, borderTopStyle: lineStyle }} className="border-t" />
          </div>
        );
      }

      case 'signature': {
        const name = hydrateMergeTags(block.senderName || 'Lorem Ipsum', mergeContext);
        const role = block.senderRole ? hydrateMergeTags(block.senderRole, mergeContext) : '';
        const org = block.organization ? hydrateMergeTags(block.organization, mergeContext) : '';
        const bg = block.backgroundColor || '#ffffff';
        const textColor = block.textColor || '#09090b';
        const accent = block.accentColor || '#d97706';

        return (
          <div style={{ backgroundColor: bg, ...blockBorder }} className="py-5 px-6 text-xs">
            <div style={{ color: textColor }} className="font-bold text-sm">{name}</div>
            {(role || org) && (
              <div className="text-zinc-500 text-xs mt-0.5">
                {role} {role && org ? '•' : ''} {org}
              </div>
            )}
            {block.phone && (
              <div className="text-zinc-500 text-xs mt-1">
                {hydrateMergeTags(block.phone, mergeContext)}
              </div>
            )}
            {block.email && (
              <div style={{ color: accent }} className="text-xs mt-0.5 font-mono">
                {hydrateMergeTags(block.email, mergeContext)}
              </div>
            )}
            {block.websiteUrl && (
              <div className="text-zinc-500 text-xs mt-0.5">
                {hydrateMergeTags(block.websiteUrl, mergeContext)}
              </div>
            )}
          </div>
        );
      }

      case 'sponsor_tier': {
        const tier = hydrateMergeTags(block.tierName || 'Lorem Ipsum', mergeContext);
        const amount = hydrateMergeTags(block.amount || '0', mergeContext);
        const curr = hydrateMergeTags(block.currency || 'RON', mergeContext);
        const bgBlock = block.backgroundColor || '#ffffff';
        const cardBg = block.cardBgColor || '#f4f4f5';
        const cardBorderColor = block.cardBorderColor || '#e4e4e7';
        const accent = block.accentColor || '#d97706';
        const textColor = block.textColor || '#09090b';

        return (
          <div style={{ backgroundColor: bgBlock, ...blockBorder }} className="py-4 px-6">
            <div
              style={{ backgroundColor: cardBg, borderColor: cardBorderColor, borderRadius: block.cardBorderRadius !== undefined ? `${block.cardBorderRadius}px` : '14px' }}
              className="p-5 border space-y-2"
            >
              <div style={{ color: accent }} className="text-xs font-bold uppercase tracking-wider">
                {tier}
              </div>
              <div style={{ color: textColor }} className="text-xl sm:text-2xl font-extrabold">
                {amount} <span className="text-xs sm:text-sm font-semibold text-zinc-500">{curr}</span>
              </div>
              {block.perks && block.perks.length > 0 && (
                <ul className="list-disc pl-4 text-xs sm:text-sm text-zinc-700 space-y-1 pt-1">
                  {block.perks.map((p, idx) => (
                    <li key={idx}>{hydrateMergeTags(p, mergeContext)}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      }

      case 'proposal_deck': {
        const title = hydrateMergeTags(block.title || 'Lorem Ipsum', mergeContext);
        const size = hydrateMergeTags(block.fileSize || 'PDF • 4.2 MB', mergeContext);
        const desc = block.description ? hydrateMergeTags(block.description, mergeContext) : 'Lorem ipsum dolor sit amet...';
        const btnText = hydrateMergeTags(block.buttonText || 'Lorem Ipsum', mergeContext);
        const bgBlock = block.backgroundColor || '#ffffff';
        const cardBg = block.cardBgColor || '#fafafa';
        const cardBorderColor = block.cardBorderColor || '#e4e4e7';
        const accent = block.accentColor || '#d97706';

        return (
          <div style={{ backgroundColor: bgBlock, ...blockBorder }} className="py-4 px-6">
            <div
              style={{ backgroundColor: cardBg, borderColor: cardBorderColor }}
              className="p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-start space-x-3 min-w-0">
                <div style={{ backgroundColor: accent }} className="p-2.5 rounded-xl text-white shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span style={{ backgroundColor: `${accent}20`, color: accent }} className="text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase">
                    {size}
                  </span>
                  <div className="text-sm font-bold text-zinc-900 truncate mt-0.5">{title}</div>
                  <div className="text-xs text-zinc-500 line-clamp-1">{desc}</div>
                </div>
              </div>
              <button
                type="button"
                style={{ backgroundColor: accent }}
                className="px-3.5 py-1.5 rounded-xl text-white font-bold text-xs shrink-0 flex items-center space-x-1.5 shadow-xs"
              >
                <span>{btnText}</span>
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      }

      case 'testimonial': {
        const quote = hydrateMergeTags(block.quote || 'Lorem ipsum dolor sit amet...', mergeContext);
        const author = hydrateMergeTags(block.authorName || 'Lorem Ipsum', mergeContext);
        const role = block.authorRole ? hydrateMergeTags(block.authorRole, mergeContext) : '';
        const company = block.company ? hydrateMergeTags(block.company, mergeContext) : '';
        const bgBlock = block.backgroundColor || '#ffffff';
        const cardBg = block.cardBgColor || '#fafafa';
        const cardBorderColor = block.cardBorderColor || '#e4e4e7';
        const accent = block.accentColor || '#d97706';

        return (
          <div style={{ backgroundColor: bgBlock, ...blockBorder }} className="py-4 px-6">
            <div
              style={{ backgroundColor: cardBg, borderColor: cardBorderColor, borderLeftColor: accent, borderLeftWidth: '4px' }}
              className="p-4 rounded-xl border space-y-2 shadow-2xs"
            >
              <Quote style={{ color: accent }} className="w-4 h-4 opacity-70" />
              <p className="text-xs sm:text-sm italic text-zinc-800 leading-relaxed">
                &ldquo;{quote}&rdquo;
              </p>
              <div className="pt-1">
                <div className="text-xs font-bold text-zinc-900">{author}</div>
                {(role || company) && (
                  <div className="text-[11px] text-zinc-500">{role}{role && company ? ', ' : ''}{company}</div>
                )}
              </div>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`relative group transition-all cursor-pointer select-none ${
        isSelected
          ? 'ring-2 ring-blue-500 shadow-lg'
          : 'hover:ring-1 hover:ring-zinc-700'
      }`}
    >
      {/* Floating Toolbar when selected or hovered */}
      <div
        className={`absolute -top-3.5 right-3 z-30 items-center space-x-1 px-2 py-0.5 rounded-lg border shadow-lg bg-zinc-900 border-zinc-700 text-zinc-300 ${
          isSelected ? 'flex' : 'hidden group-hover:flex'
        }`}
      >
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mr-1.5">
          {block.type}
        </span>

        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-1 rounded hover:text-white hover:bg-zinc-800 cursor-grab active:cursor-grabbing text-zinc-400"
          title="Trage pentru reordonare"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Move Up */}
        <button
          type="button"
          disabled={!canMoveUp}
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp();
          }}
          className="p-1 rounded hover:text-white hover:bg-zinc-800 disabled:opacity-30 cursor-pointer text-zinc-400"
          title="Mută mai sus"
        >
          <ArrowUp className="w-3 h-3" />
        </button>

        {/* Move Down */}
        <button
          type="button"
          disabled={!canMoveDown}
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown();
          }}
          className="p-1 rounded hover:text-white hover:bg-zinc-800 disabled:opacity-30 cursor-pointer text-zinc-400"
          title="Mută mai jos"
        >
          <ArrowDown className="w-3 h-3" />
        </button>

        {/* Duplicate */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1 rounded hover:text-white hover:bg-zinc-800 cursor-pointer text-zinc-400"
          title="Duplică bloc"
        >
          <Copy className="w-3 h-3" />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 cursor-pointer ml-0.5"
          title="Șterge bloc"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Render block */}
      {renderBlockPreview()}
    </div>
  );
};
