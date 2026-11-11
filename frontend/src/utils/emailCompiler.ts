import type { EmailBlock, EmailGlobalSettings, MergeTagContext } from '../types/email';

export interface MergeTagMeta {
  tag: string;
  label: string;
  description: string;
  example: string;
}

export const AVAILABLE_MERGE_TAGS: MergeTagMeta[] = [
  {
    tag: '{{contact_person}}',
    label: 'Nume Destinatar',
    description: 'Numele persoanei de contact căreia îi trimiți email-ul',
    example: 'Ion Popescu',
  },
  {
    tag: '{{sponsor_name}}',
    label: 'Companie / Organizație',
    description: 'Numele firmei sau organizației destinatare',
    example: 'Acme SRL',
  },
  {
    tag: '{{contact_email}}',
    label: 'Email Destinatar',
    description: 'Adresa de email a destinatarului',
    example: 'contact@acme.ro',
  },
  {
    tag: '{{tier}}',
    label: 'Pachet Parteneriat',
    description: 'Nivelul sau pachetul de sponsorizare',
    example: 'Gold Partner',
  },
  {
    tag: '{{tier_amount}}',
    label: 'Valoare Pachet',
    description: 'Suma standard sau propusă a pachetului',
    example: '10.000 RON',
  },
  {
    tag: '{{contract_amount}}',
    label: 'Valoare Contractuală',
    description: 'Suma convenită prin negociere',
    example: '15.000 RON',
  },
  {
    tag: '{{sender_name}}',
    label: 'Nume Expeditor (Tu)',
    description: 'Numele tău complet sau al reprezentantului',
    example: 'Maria Ionescu',
  },
  {
    tag: '{{sender_email}}',
    label: 'Email Expeditor (Tu)',
    description: 'Adresa ta de email de contact',
    example: 'contact@organizatie.ro',
  },
  {
    tag: '{{event_name}}',
    label: 'Nume Eveniment',
    description: 'Numele proiectului sau evenimentului',
    example: 'Campania Anuală 2026',
  },
  {
    tag: '{{event_year}}',
    label: 'An Curent',
    description: 'Anul evenimentului sau calendaristic',
    example: '2026',
  },
  {
    tag: '{{proposal_url}}',
    label: 'Link Prezentare Propunere',
    description: 'Link-ul direct către mapa sau dosarul de prezentare',
    example: 'https://organizatie.ro/sponsori/2026',
  },
  {
    tag: '{{assigned_lead}}',
    label: 'Responsabil Proiect',
    description: 'Numele coordonatorului de parteneriat',
    example: 'Andrei Pop',
  },
];

export function hydrateMergeTags(text: string, context: MergeTagContext): string {
  if (!text) return '';

  const contextMap: Record<string, any> = {};
  for (const [k, v] of Object.entries(context)) {
    if (v !== undefined && v !== '') {
      contextMap[k.toLowerCase()] = v;
      contextMap[k] = v;
    }
  }

  return text.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/gi, (match, rawTag) => {
    const tag = rawTag.toLowerCase();
    if (contextMap[tag] !== undefined) return String(contextMap[tag]);
    if (context[rawTag] !== undefined && context[rawTag] !== '') return String(context[rawTag]);

    // Aliases
    if ((tag === 'recipient_name' || tag === 'name') && contextMap.contact_person !== undefined) return String(contextMap.contact_person);
    if ((tag === 'company_name' || tag === 'company') && contextMap.sponsor_name !== undefined) return String(contextMap.sponsor_name);
    if ((tag === 'recipient_email' || tag === 'email') && contextMap.contact_email !== undefined) return String(contextMap.contact_email);
    if (tag === 'user_name' && contextMap.sender_name !== undefined) return String(contextMap.sender_name);
    if (tag === 'user_email' && contextMap.sender_email !== undefined) return String(contextMap.sender_email);
    if (tag === 'year' && contextMap.event_year !== undefined) return String(contextMap.event_year);
    return match;
  });
}

export function extractMergeTagsFromBlocksAndSubject(
  blocks: EmailBlock[] = [],
  subject: string = ''
): string[] {
  const seenLower = new Set<string>();
  const foundTags: string[] = [];
  const tagRegex = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;

  const scanString = (str: string) => {
    if (!str || typeof str !== 'string') return;
    let match: RegExpExecArray | null;
    tagRegex.lastIndex = 0;
    while ((match = tagRegex.exec(str)) !== null) {
      if (match[1]) {
        const lower = match[1].toLowerCase();
        if (!seenLower.has(lower)) {
          seenLower.add(lower);
          foundTags.push(match[1]);
        }
      }
    }
  };

  const scanObject = (obj: any) => {
    if (!obj) return;
    if (typeof obj === 'string') {
      scanString(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(scanObject);
    } else if (typeof obj === 'object') {
      Object.values(obj).forEach(scanObject);
    }
  };

  if (subject) scanString(subject);
  blocks.forEach(scanObject);

  return foundTags;
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderMarkdownText(content: string, textColor: string = '#27272a', fontSize: string = '15px', align: string = 'left'): string {
  if (!content) return '';
  const paragraphs = content.split(/\n\s*\n/);
  return paragraphs
    .map((p) => {
      let formatted = p.trim();
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong style="color: inherit;">$1</strong>');
      formatted = formatted.replace(/\*(.*?)\*/g, '<em style="color: inherit;">$1</em>');
      formatted = formatted.replace(/\n/g, '<br/>');
      return `<p style="margin: 0 0 16px; font-size: ${fontSize}; line-height: 1.6; color: ${textColor}; text-align: ${align};">${formatted}</p>`;
    })
    .join('');
}

function getBlockPaddingStyle(block: EmailBlock, defaultPad: { top: number; bottom: number; left: number; right: number }): string {
  const top = block.paddingTop !== undefined ? `${block.paddingTop}px` : `${defaultPad.top}px`;
  const bottom = block.paddingBottom !== undefined ? `${block.paddingBottom}px` : `${defaultPad.bottom}px`;
  const left = block.paddingLeft !== undefined ? `${block.paddingLeft}px` : `${defaultPad.left}px`;
  const right = block.paddingRight !== undefined ? `${block.paddingRight}px` : `${defaultPad.right}px`;
  return `padding: ${top} ${right} ${bottom} ${left};`;
}

function getBlockBorderStyle(block: EmailBlock): string {
  if (!block.borderWidth || block.borderWidth <= 0 || block.borderStyle === 'none') {
    return '';
  }
  const width = `${block.borderWidth}px`;
  const style = block.borderStyle || 'solid';
  const color = block.borderColor || '#e4e4e7';
  const radius = block.borderRadius ? ` border-radius: ${block.borderRadius}px;` : '';
  return `border: ${width} ${style} ${color};${radius}`;
}

export function compileBlockToHtml(block: EmailBlock, context: MergeTagContext): string {
  switch (block.type) {
    case 'header': {
      const title = escapeHtml(hydrateMergeTags(block.title || '', context));
      const subtitle = block.subtitle ? escapeHtml(hydrateMergeTags(block.subtitle, context)) : '';
      const align = block.align || 'center';
      const bg = block.backgroundColor || '#ffffff';
      const titleColor = block.textColor || '#09090b';
      const accent = block.accentColor || '#d97706';
      const logoText = block.logoText ? escapeHtml(hydrateMergeTags(block.logoText, context)) : '';
      const logoImg = block.logoImageUrl ? escapeHtml(hydrateMergeTags(block.logoImageUrl, context)) : '';
      const padding = getBlockPaddingStyle(block, { top: 32, bottom: 20, left: 32, right: 32 });
      const border = getBlockBorderStyle(block);

      return `
        <tr>
          <td align="${align}" style="${padding} background-color: ${bg}; ${border}">
            ${
              block.showLogo
                ? logoImg
                  ? `<div style="margin-bottom: 12px; text-align: ${align};"><img src="${logoImg}" alt="Logo" width="180" style="max-height: 48px; max-width: 180px; width: auto; height: auto; display: inline-block; border: 0;" /></div>`
                  : `<div style="font-size: 20px; font-weight: 800; letter-spacing: 2px; color: ${accent}; margin-bottom: 12px; text-transform: uppercase;">${logoText || 'ORGANIZATION'}</div>`
                : ''
            }
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: ${titleColor}; text-align: ${align}; line-height: 1.3;">
              ${title}
            </h1>
            ${
              subtitle
                ? `<p style="margin: 8px 0 0; font-size: 14px; color: #71717a; text-align: ${align}; line-height: 1.5;">${subtitle}</p>`
                : ''
            }
          </td>
        </tr>
      `;
    }

    case 'text': {
      const hydrated = hydrateMergeTags(block.content || '', context);
      const bg = block.backgroundColor || '#ffffff';
      const textColor = block.textColor || '#27272a';
      const align = block.align || 'left';
      const fontSizeMap = { sm: '13px', base: '15px', lg: '17px' };
      const fontSize = fontSizeMap[block.fontSize || 'base'];
      const rendered = renderMarkdownText(hydrated, textColor, fontSize, align);
      const padding = getBlockPaddingStyle(block, { top: 24, bottom: 24, left: 32, right: 32 });
      const border = getBlockBorderStyle(block);

      return `
        <tr>
          <td style="${padding} background-color: ${bg}; font-size: ${fontSize}; line-height: 1.6; color: ${textColor}; text-align: ${align}; ${border}">
            ${rendered}
          </td>
        </tr>
      `;
    }

    case 'button': {
      const label = escapeHtml(hydrateMergeTags(block.label || 'Click Here', context));
      const url = escapeHtml(hydrateMergeTags(block.url || '#', context));
      const align = block.align || 'center';
      const bgBlock = block.backgroundColor || '#ffffff';

      let bgColor = '#d97706';
      let textColor = '#ffffff';
      let borderStyle = 'none';

      if (block.variant === 'secondary') {
        bgColor = '#f4f4f5';
        textColor = '#18181b';
        borderStyle = '1px solid #e4e4e7';
      } else if (block.variant === 'custom') {
        bgColor = block.buttonColor || '#d97706';
        textColor = block.buttonTextColor || '#ffffff';
        borderStyle = 'none';
      } else if (block.buttonColor || block.buttonTextColor) {
        bgColor = block.buttonColor || '#d97706';
        textColor = block.buttonTextColor || '#ffffff';
      }

      const radiusMap: Record<string, string> = { none: '0px', sm: '6px', md: '12px', lg: '18px', full: '9999px' };
      let borderRadius = radiusMap[block.borderRadiusType || 'md'];
      if (block.borderRadius !== undefined) {
        borderRadius = `${block.borderRadius}px`;
      }

      const padding = getBlockPaddingStyle(block, { top: 16, bottom: 24, left: 32, right: 32 });

      return `
        <tr>
          <td align="${align}" style="${padding} background-color: ${bgBlock};">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="10%" stroke="f" fillcolor="${bgColor}">
            <w:anchorlock/>
            <center style="color:${textColor};font-family:sans-serif;font-size:14px;font-weight:bold;">${label}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-- -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin: ${align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0'};">
              <tr>
                <td align="center" style="border-radius: ${borderRadius}; background-color: ${bgColor}; border: ${borderStyle};">
                  <a href="${url}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 700; color: ${textColor}; text-decoration: none; border-radius: ${borderRadius}; letter-spacing: 0.2px;">
                    ${label}
                  </a>
                </td>
              </tr>
            </table>
            <!--<![endif]-->
          </td>
        </tr>
      `;
    }

    case 'sponsor_tier': {
      const tierName = escapeHtml(hydrateMergeTags(block.tierName || '', context));
      const amount = escapeHtml(hydrateMergeTags(block.amount || '', context));
      const currency = escapeHtml(hydrateMergeTags(block.currency || 'RON', context));
      const perks = block.perks || [];
      const bgBlock = block.backgroundColor || '#ffffff';
      const cardBg = block.cardBgColor || '#f4f4f5';
      const cardBorder = block.cardBorderColor || '#e4e4e7';
      const accent = block.accentColor || '#d97706';
      const textColor = block.textColor || '#09090b';
      const cardRadius = block.cardBorderRadius !== undefined ? block.cardBorderRadius : 14;
      const padding = getBlockPaddingStyle(block, { top: 16, bottom: 24, left: 32, right: 32 });

      return `
        <tr>
          <td style="${padding} background-color: ${bgBlock};">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: ${cardRadius}px; overflow: hidden;">
              <tr>
                <td style="padding: 24px;">
                  <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: ${accent}; margin-bottom: 4px;">
                    ${tierName}
                  </div>
                  <div style="font-size: 26px; font-weight: 800; color: ${textColor}; margin-bottom: 16px;">
                    ${amount} <span style="font-size: 16px; font-weight: 600; color: #71717a;">${currency}</span>
                  </div>
                  ${
                    perks.length > 0
                      ? `<ul style="margin: 0; padding-left: 20px; color: #3f3f46; font-size: 14px; line-height: 1.6;">
                          ${perks.map((p) => `<li style="margin-bottom: 6px;">${escapeHtml(hydrateMergeTags(p, context))}</li>`).join('')}
                        </ul>`
                      : ''
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }

    case 'stat_card': {
      const value = escapeHtml(hydrateMergeTags(block.value || '100+', context));
      const label = escapeHtml(hydrateMergeTags(block.label || 'Lorem Ipsum', context));
      const description = block.description ? escapeHtml(hydrateMergeTags(block.description, context)) : '';
      const bgBlock = block.backgroundColor || '#ffffff';
      const cardBg = block.cardBgColor || '#f8fafc';
      const cardBorder = block.cardBorderColor || '#e2e8f0';
      const accent = block.accentColor || '#d97706';
      const textColor = block.textColor || '#09090b';
      const align = block.align || 'center';
      const padding = getBlockPaddingStyle(block, { top: 16, bottom: 20, left: 32, right: 32 });

      return `
        <tr>
          <td style="${padding} background-color: ${bgBlock}; text-align: ${align};">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 14px; overflow: hidden;">
              <tr>
                <td style="padding: 20px 24px; text-align: ${align};">
                  <div style="font-size: 32px; font-weight: 900; color: ${accent}; line-height: 1.1; margin-bottom: 6px;">
                    ${value}
                  </div>
                  <div style="font-size: 14px; font-weight: 700; color: ${textColor}; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${label}
                  </div>
                  ${
                    description
                      ? `<div style="font-size: 13px; color: #64748b; margin-top: 6px; line-height: 1.4;">${description}</div>`
                      : ''
                  }
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }

    case 'proposal_deck': {
      const title = escapeHtml(hydrateMergeTags(block.title || 'Lorem Ipsum', context));
      const fileSize = escapeHtml(hydrateMergeTags(block.fileSize || '... MB', context));
      const desc = block.description ? escapeHtml(hydrateMergeTags(block.description, context)) : '';
      const downloadUrl = escapeHtml(hydrateMergeTags(block.downloadUrl || '#', context));
      const btnText = escapeHtml(hydrateMergeTags(block.buttonText || 'Lorem Ipsum', context));
      const bgBlock = block.backgroundColor || '#ffffff';
      const cardBg = block.cardBgColor || '#fafafa';
      const cardBorder = block.cardBorderColor || '#e4e4e7';
      const accent = block.accentColor || '#d97706';
      const padding = getBlockPaddingStyle(block, { top: 16, bottom: 24, left: 32, right: 32 });

      return `
        <tr>
          <td style="${padding} background-color: ${bgBlock};">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 14px; overflow: hidden;">
              <tr>
                <td style="padding: 20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align: middle;">
                        <span style="display: inline-block; font-size: 11px; font-weight: 800; background-color: ${accent}; color: #ffffff; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; margin-bottom: 8px;">
                          ${fileSize}
                        </span>
                        <div style="font-size: 16px; font-weight: 700; color: #09090b; margin-bottom: 4px;">
                          ${title}
                        </div>
                        ${desc ? `<div style="font-size: 13px; color: #71717a; line-height: 1.4;">${desc}</div>` : ''}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top: 14px;">
                        <a href="${downloadUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; font-size: 13px; font-weight: 700; color: #ffffff; background-color: ${accent}; text-decoration: none; border-radius: 10px;">
                          ${btnText} &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }

    case 'multi_column': {
      const columns = block.columns || [];
      const count = block.columnCount || 2;
      const bgBlock = block.backgroundColor || '#ffffff';
      const cardBg = block.cardBgColor || '#f8fafc';
      const cardBorder = block.cardBorderColor || '#e2e8f0';
      const padding = getBlockPaddingStyle(block, { top: 16, bottom: 24, left: 32, right: 32 });

      const colWidth = count === 3 ? '33.33%' : '50%';

      return `
        <tr>
          <td style="${padding} background-color: ${bgBlock};">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${columns.map((col, idx) => {
                  const title = col.title ? escapeHtml(hydrateMergeTags(col.title, context)) : '';
                  const content = escapeHtml(hydrateMergeTags(col.content || '', context));
                  const btnLabel = col.buttonLabel ? escapeHtml(hydrateMergeTags(col.buttonLabel, context)) : '';
                  const btnUrl = col.buttonUrl ? escapeHtml(hydrateMergeTags(col.buttonUrl, context)) : '#';
                  const img = col.imageUrl ? escapeHtml(hydrateMergeTags(col.imageUrl, context)) : '';
                  const accent = col.accentColor || '#d97706';

                  return `
                    <td width="${colWidth}" style="vertical-align: top; padding: ${idx === 0 ? '0 8px 0 0' : idx === columns.length - 1 ? '0 0 0 8px' : '0 8px'};">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 12px; height: 100%;">
                        <tr>
                          <td style="padding: 16px;">
                            ${img ? `<div style="margin-bottom: 10px;"><img src="${img}" alt="" width="240" style="max-width: 100%; height: auto; border-radius: 8px; border: 0;" /></div>` : ''}
                            ${title ? `<div style="font-size: 15px; font-weight: 700; color: #09090b; margin-bottom: 6px;">${title}</div>` : ''}
                            <div style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 12px;">${content}</div>
                            ${btnLabel ? `<a href="${btnUrl}" target="_blank" style="display: inline-block; font-size: 12px; font-weight: 700; color: ${accent}; text-decoration: none;">${btnLabel} &rarr;</a>` : ''}
                          </td>
                        </tr>
                      </table>
                    </td>
                  `;
                }).join('')}
              </tr>
            </table>
          </td>
        </tr>
      `;
    }

    case 'testimonial': {
      const quote = escapeHtml(hydrateMergeTags(block.quote || 'Lorem ipsum dolor sit amet...', context));
      const author = escapeHtml(hydrateMergeTags(block.authorName || 'Lorem Ipsum', context));
      const role = block.authorRole ? escapeHtml(hydrateMergeTags(block.authorRole, context)) : '';
      const company = block.company ? escapeHtml(hydrateMergeTags(block.company, context)) : '';
      const avatar = block.avatarUrl ? escapeHtml(hydrateMergeTags(block.avatarUrl, context)) : '';
      const bgBlock = block.backgroundColor || '#ffffff';
      const cardBg = block.cardBgColor || '#fafafa';
      const cardBorder = block.cardBorderColor || '#e4e4e7';
      const accent = block.accentColor || '#d97706';
      const padding = getBlockPaddingStyle(block, { top: 16, bottom: 24, left: 32, right: 32 });

      return `
        <tr>
          <td style="${padding} background-color: ${bgBlock};">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${cardBg}; border: 1px solid ${cardBorder}; border-left: 4px solid ${accent}; border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="padding: 20px 24px;">
                  <p style="margin: 0 0 12px; font-size: 14px; font-style: italic; line-height: 1.6; color: #27272a;">
                    &ldquo;${quote}&rdquo;
                  </p>
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      ${avatar ? `<td style="padding-right: 10px;"><img src="${avatar}" alt="${author}" width="36" height="36" style="border-radius: 50%; border: 0; width: 36px; height: 36px; object-fit: cover;" /></td>` : ''}
                      <td style="vertical-align: middle;">
                        <div style="font-size: 13px; font-weight: 700; color: #09090b;">${author}</div>
                        ${role || company ? `<div style="font-size: 12px; color: #71717a;">${role}${role && company ? ', ' : ''}${company}</div>` : ''}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }

    case 'spacer': {
      const height = block.height || 24;
      const bg = block.backgroundColor || 'transparent';
      return `
        <tr>
          <td height="${height}" style="height: ${height}px; line-height: ${height}px; font-size: 1px; background-color: ${bg}; mso-line-height-rule: exactly;">
            &nbsp;
          </td>
        </tr>
      `;
    }

    case 'list': {
      const items = block.items || [];
      const bg = block.backgroundColor || '#ffffff';
      const textColor = block.textColor || '#27272a';
      const accent = block.accentColor || '#d97706';
      const align = block.align || 'left';
      const style = block.listStyle || 'bullet';
      const padding = getBlockPaddingStyle(block, { top: 16, bottom: 20, left: 32, right: 32 });
      const border = getBlockBorderStyle(block);

      const listTag = style === 'number' ? 'ol' : 'ul';
      const listStyleType = style === 'number' ? 'decimal' : style === 'check' ? 'none' : 'disc';

      return `
        <tr>
          <td align="${align}" style="${padding} background-color: ${bg}; text-align: ${align}; ${border}">
            <${listTag} style="margin: 0; padding-left: ${style === 'check' ? '0' : '24px'}; color: ${textColor}; font-size: 15px; line-height: 1.7; list-style-type: ${listStyleType};">
              ${items.map((item) => {
                const text = escapeHtml(hydrateMergeTags(item || '', context));
                if (style === 'check') {
                  return `<li style="margin-bottom: 8px; list-style: none;"><span style="color: ${accent}; font-weight: bold; margin-right: 8px;">&#10003;</span>${text}</li>`;
                }
                return `<li style="margin-bottom: 6px;">${text}</li>`;
              }).join('')}
            </${listTag}>
          </td>
        </tr>
      `;
    }

    case 'quote': {
      const quote = escapeHtml(hydrateMergeTags(block.quote || 'Lorem ipsum dolor sit amet...', context));
      const author = block.author ? escapeHtml(hydrateMergeTags(block.author, context)) : '';
      const caption = block.caption ? escapeHtml(hydrateMergeTags(block.caption, context)) : '';
      const bgBlock = block.backgroundColor || '#ffffff';
      const accent = block.accentColor || '#d97706';
      const textColor = block.textColor || '#27272a';
      const align = block.align || 'left';
      const padding = getBlockPaddingStyle(block, { top: 16, bottom: 24, left: 32, right: 32 });
      const border = getBlockBorderStyle(block);

      return `
        <tr>
          <td style="${padding} background-color: ${bgBlock}; ${border}">
            <div style="border-left: 4px solid ${accent}; padding-left: 18px; margin: 0; text-align: ${align};">
              <p style="margin: 0 0 8px; font-size: 15px; font-style: italic; line-height: 1.6; color: ${textColor};">
                &ldquo;${quote}&rdquo;
              </p>
              ${author || caption ? `
                <div style="font-size: 13px; font-weight: 700; color: #09090b;">
                  ${author}
                  ${caption ? `<span style="font-weight: 400; color: #71717a;"> &bull; ${caption}</span>` : ''}
                </div>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }

    case 'card': {
      const title = block.title ? escapeHtml(hydrateMergeTags(block.title, context)) : '';
      const content = escapeHtml(hydrateMergeTags(block.content || '', context));
      const btnLabel = block.buttonLabel ? escapeHtml(hydrateMergeTags(block.buttonLabel, context)) : '';
      const btnUrl = block.buttonUrl ? escapeHtml(hydrateMergeTags(block.buttonUrl, context)) : '#';
      const bgBlock = block.backgroundColor || '#ffffff';
      const cardBg = block.cardBgColor || '#f8fafc';
      const cardBorder = block.cardBorderColor || '#e2e8f0';
      const accent = block.accentColor || '#d97706';
      const textColor = block.textColor || '#09090b';
      const align = block.align || 'left';
      const padding = getBlockPaddingStyle(block, { top: 16, bottom: 24, left: 32, right: 32 });

      return `
        <tr>
          <td style="${padding} background-color: ${bgBlock};">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${cardBg}; border: 1px solid ${cardBorder}; border-radius: 12px; overflow: hidden;">
              <tr>
                <td style="padding: 20px 24px; text-align: ${align};">
                  ${title ? `<div style="font-size: 17px; font-weight: 700; color: ${textColor}; margin-bottom: 8px;">${title}</div>` : ''}
                  <div style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: ${btnLabel ? '14px' : '0'};">${content}</div>
                  ${btnLabel ? `
                    <a href="${btnUrl}" target="_blank" style="display: inline-block; padding: 8px 18px; font-size: 13px; font-weight: 700; color: #ffffff; background-color: ${accent}; border-radius: 8px; text-decoration: none;">
                      ${btnLabel} &rarr;
                    </a>
                  ` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    }

    case 'badge': {
      const text = escapeHtml(hydrateMergeTags(block.text || 'LOREM IPSUM', context));
      const bgBlock = block.backgroundColor || '#ffffff';
      const badgeBg = block.badgeColor || '#d97706';
      const textColor = block.badgeTextColor || '#ffffff';
      const align = block.align || 'center';
      const padding = getBlockPaddingStyle(block, { top: 12, bottom: 12, left: 32, right: 32 });

      return `
        <tr>
          <td align="${align}" style="${padding} background-color: ${bgBlock}; text-align: ${align};">
            <span style="display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; border-radius: 9999px; background-color: ${badgeBg}; color: ${textColor};">
              ${text}
            </span>
          </td>
        </tr>
      `;
    }

    case 'social_links': {
      const links = block.links || [];
      const align = block.align || 'center';
      const bgBlock = block.backgroundColor || '#ffffff';
      const accent = block.accentColor || '#d97706';
      const padding = getBlockPaddingStyle(block, { top: 16, bottom: 24, left: 32, right: 32 });

      return `
        <tr>
          <td align="${align}" style="${padding} background-color: ${bgBlock}; text-align: ${align};">
            <div style="display: inline-block;">
              ${links.map((link) => {
                const label = escapeHtml(hydrateMergeTags(link.label || link.platform, context));
                const url = escapeHtml(hydrateMergeTags(link.url || '#', context));
                return `
                  <a href="${url}" target="_blank" style="display: inline-block; margin: 0 6px 6px 0; padding: 6px 12px; font-size: 12px; font-weight: 600; color: #ffffff; background-color: ${accent}; border-radius: 8px; text-decoration: none;">
                    ${label}
                  </a>
                `;
              }).join('')}
            </div>
          </td>
        </tr>
      `;
    }

    case 'image': {
      const imgUrl = escapeHtml(hydrateMergeTags(block.imageUrl || '', context));
      const alt = block.altText ? escapeHtml(hydrateMergeTags(block.altText, context)) : 'Image';
      const link = block.linkUrl ? escapeHtml(hydrateMergeTags(block.linkUrl, context)) : '';
      const align = block.align || 'center';
      const bg = block.backgroundColor || '#ffffff';
      const maxH = block.maxHeight || '300px';
      const padding = getBlockPaddingStyle(block, { top: 16, bottom: 24, left: 32, right: 32 });

      if (!imgUrl) return '';

      const imageTag = `<img src="${imgUrl}" alt="${alt}" width="536" style="max-width: 100%; max-height: ${maxH}; width: auto; height: auto; border-radius: 12px; display: inline-block; border: 0;" />`;

      return `
        <tr>
          <td align="${align}" style="${padding} background-color: ${bg}; text-align: ${align};">
            ${link ? `<a href="${link}" target="_blank" style="text-decoration: none;">${imageTag}</a>` : imageTag}
          </td>
        </tr>
      `;
    }

    case 'divider': {
      const spacingMap: Record<string, string> = {
        sm: '12px',
        md: '20px',
        lg: '32px',
      };
      const pad = spacingMap[block.spacing] || '20px';
      const bg = block.backgroundColor || '#ffffff';
      const lineColor = block.lineColor || '#e4e4e7';
      const lineStyle = block.lineStyle || 'solid';

      return `
        <tr>
          <td style="padding: ${pad} 32px; background-color: ${bg};">
            <hr style="border: none; border-top: 1px ${lineStyle} ${lineColor}; margin: 0;" />
          </td>
        </tr>
      `;
    }

    case 'signature': {
      const senderName = escapeHtml(hydrateMergeTags(block.senderName || '', context));
      const senderRole = block.senderRole ? escapeHtml(hydrateMergeTags(block.senderRole, context)) : '';
      const organization = block.organization ? escapeHtml(hydrateMergeTags(block.organization, context)) : '';
      const phone = block.phone ? escapeHtml(hydrateMergeTags(block.phone, context)) : '';
      const email = block.email ? escapeHtml(hydrateMergeTags(block.email, context)) : '';
      const websiteUrl = block.websiteUrl ? escapeHtml(hydrateMergeTags(block.websiteUrl, context)) : '';
      const bg = block.backgroundColor || '#ffffff';
      const textColor = block.textColor || '#09090b';
      const accent = block.accentColor || '#d97706';
      const padding = getBlockPaddingStyle(block, { top: 20, bottom: 32, left: 32, right: 32 });
      const border = getBlockBorderStyle(block);

      return `
        <tr>
          <td style="${padding} background-color: ${bg}; ${border}">
            <div style="font-size: 15px; font-weight: 700; color: ${textColor};">${senderName}</div>
            ${
              senderRole || organization
                ? `<div style="font-size: 13px; color: #71717a; margin-top: 2px;">
                    ${senderRole}${senderRole && organization ? ' • ' : ''}${organization}
                  </div>`
                : ''
            }
            ${
              phone || email || websiteUrl
                ? `<div style="font-size: 13px; color: #71717a; margin-top: 8px; line-height: 1.5;">
                    ${phone ? `<span>${phone}</span><br/>` : ''}
                    ${email ? `<a href="mailto:${email}" style="color: ${accent}; text-decoration: none;">${email}</a><br/>` : ''}
                    ${websiteUrl ? `<a href="${websiteUrl}" target="_blank" style="color: #71717a; text-decoration: none;">${websiteUrl}</a>` : ''}
                  </div>`
                : ''
            }
          </td>
        </tr>
      `;
    }

    default:
      return '';
  }
}

export function compileEmailHtml(
  blocks: EmailBlock[],
  subject: string,
  context: MergeTagContext = {},
  settings?: EmailGlobalSettings
): string {
  const emailBg = settings?.emailBgColor || '#ffffff';
  const backdrop = settings?.backdropColor || '#f4f4f5';
  const canvasWidth = settings?.canvasWidth || 600;
  const sheetRadius = settings?.sheetBorderRadius !== undefined ? settings.sheetBorderRadius : 16;
  const sheetBorderW = settings?.sheetBorderWidth !== undefined ? settings.sheetBorderWidth : 1;
  const sheetBorderC = settings?.sheetBorderColor || '#e4e4e7';
  const fontStack = settings?.fontFamily === 'serif'
    ? "Georgia, Cambria, 'Times New Roman', Times, serif"
    : settings?.fontFamily === 'mono'
    ? "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const renderedBlocks = blocks.map((b) => compileBlockToHtml(b, context)).join('');
  const escapedSubject = escapeHtml(hydrateMergeTags(subject, context));

  return `<!DOCTYPE html>
<html lang="ro" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapedSubject}</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media (prefers-color-scheme: dark) {
      .email-bg-wrap { background-color: ${backdrop} !important; }
      .email-card-wrap { background-color: ${emailBg} !important; }
    }
  </style>
</head>
<body bgcolor="${backdrop}" style="margin: 0; padding: 0; background-color: ${backdrop}; font-family: ${fontStack}; -webkit-font-smoothing: antialiased; color: #18181b;">
  <table class="email-bg-wrap" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${backdrop}" style="background-color: ${backdrop}; margin: 0; padding: 0;">
    <tr>
      <td align="center" bgcolor="${backdrop}" style="padding: 0; margin: 0; background-color: ${backdrop};">
        <table class="email-card-wrap" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${emailBg}" style="max-width: ${canvasWidth}px; margin: 0 auto; background-color: ${emailBg}; border: ${sheetBorderW}px solid ${sheetBorderC}; border-radius: ${sheetRadius}px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          ${renderedBlocks}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function compileEmailPlainText(blocks: EmailBlock[], context: MergeTagContext = {}): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === 'header') {
      const title = hydrateMergeTags(block.title || '', context);
      const sub = block.subtitle ? hydrateMergeTags(block.subtitle, context) : '';
      parts.push(title);
      if (sub) parts.push(sub);
      parts.push('----------------------------------------');
    } else if (block.type === 'text') {
      parts.push(hydrateMergeTags(block.content || '', context));
    } else if (block.type === 'button') {
      const label = hydrateMergeTags(block.label || '', context);
      const url = hydrateMergeTags(block.url || '', context);
      parts.push(`[${label}] (${url})`);
    } else if (block.type === 'sponsor_tier') {
      const tier = hydrateMergeTags(block.tierName || '', context);
      const amt = hydrateMergeTags(block.amount || '', context);
      const curr = hydrateMergeTags(block.currency || '', context);
      parts.push(`=== ${tier}: ${amt} ${curr} ===`);
      if (block.perks?.length) {
        parts.push(block.perks.map((p) => `* ${hydrateMergeTags(p, context)}`).join('\n'));
      }
    } else if (block.type === 'stat_card') {
      const val = hydrateMergeTags(block.value || '', context);
      const lbl = hydrateMergeTags(block.label || '', context);
      parts.push(`[STAT] ${val} - ${lbl}`);
    } else if (block.type === 'proposal_deck') {
      const title = hydrateMergeTags(block.title || '', context);
      const url = hydrateMergeTags(block.downloadUrl || '', context);
      parts.push(`[DOCUMENT] ${title} (${url})`);
    } else if (block.type === 'multi_column') {
      for (const col of block.columns || []) {
        const title = hydrateMergeTags(col.title || '', context);
        const cnt = hydrateMergeTags(col.content || '', context);
        parts.push(`${title ? title + ': ' : ''}${cnt}`);
      }
    } else if (block.type === 'testimonial') {
      const q = hydrateMergeTags(block.quote || '', context);
      const a = hydrateMergeTags(block.authorName || '', context);
      parts.push(`"${q}" - ${a}`);
    } else if (block.type === 'spacer') {
      // blank line in plain text
      parts.push('');
    } else if (block.type === 'list') {
      const items = block.items || [];
      const isNum = block.listStyle === 'number';
      const isCheck = block.listStyle === 'check';
      parts.push(
        items
          .map((item, idx) => {
            const prefix = isNum ? `${idx + 1}. ` : isCheck ? '[✓] ' : '• ';
            return `${prefix}${hydrateMergeTags(item || '', context)}`;
          })
          .join('\n')
      );
    } else if (block.type === 'quote') {
      const q = hydrateMergeTags(block.quote || '', context);
      const auth = block.author ? hydrateMergeTags(block.author, context) : '';
      const cap = block.caption ? hydrateMergeTags(block.caption, context) : '';
      parts.push(`"${q}"${auth ? ` - ${auth}${cap ? ` (${cap})` : ''}` : ''}`);
    } else if (block.type === 'card') {
      const title = block.title ? hydrateMergeTags(block.title, context) : '';
      const cnt = hydrateMergeTags(block.content || '', context);
      const btn = block.buttonLabel ? hydrateMergeTags(block.buttonLabel, context) : '';
      const url = block.buttonUrl ? hydrateMergeTags(block.buttonUrl, context) : '';
      parts.push(`${title ? `[${title}]\n` : ''}${cnt}${btn ? `\n[${btn}] (${url})` : ''}`);
    } else if (block.type === 'badge') {
      const text = hydrateMergeTags(block.text || '', context);
      parts.push(`[${text.toUpperCase()}]`);
    } else if (block.type === 'social_links') {
      for (const link of block.links || []) {
        parts.push(`${link.platform}: ${hydrateMergeTags(link.url, context)}`);
      }
    } else if (block.type === 'image') {
      const alt = block.altText ? hydrateMergeTags(block.altText, context) : 'Image';
      const imgUrl = hydrateMergeTags(block.imageUrl || '', context);
      parts.push(`[Image: ${alt}] (${imgUrl})`);
    } else if (block.type === 'divider') {
      parts.push('----------------------------------------');
    } else if (block.type === 'signature') {
      const name = hydrateMergeTags(block.senderName || '', context);
      const role = block.senderRole ? hydrateMergeTags(block.senderRole, context) : '';
      const org = block.organization ? hydrateMergeTags(block.organization, context) : '';
      parts.push(`--\n${name}${role || org ? `\n${role}${role && org ? ' | ' : ''}${org}` : ''}`);
      if (block.phone) parts.push(hydrateMergeTags(block.phone, context));
      if (block.email) parts.push(hydrateMergeTags(block.email, context));
      if (block.websiteUrl) parts.push(hydrateMergeTags(block.websiteUrl, context));
    }
  }
  return parts.join('\n\n');
}

export function generateEmlContent(
  subject: string,
  recipientEmail: string,
  recipientName: string | undefined,
  html: string
): string {
  const toHeader = recipientName ? `${recipientName} <${recipientEmail}>` : recipientEmail;
  return [
    `To: ${toHeader}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'X-Unsent: 1',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
  ].join('\r\n');
}

export function downloadEmlFile(
  subject: string,
  recipientEmail: string,
  recipientName: string | undefined,
  html: string
): void {
  const eml = generateEmlContent(subject, recipientEmail, recipientName, html);
  const blob = new Blob([eml], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeSubject = subject.replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_').substring(0, 40) || 'email';
  a.download = `${safeSubject}.eml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadHtmlFile(subject: string, html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeSubject = subject.replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_').substring(0, 40) || 'email';
  a.download = `${safeSubject}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyEmailToClipboard(html: string, plainText: string): Promise<boolean> {
  const clipboardHtml = html.includes('<!DOCTYPE html>')
    ? html
    : `<!DOCTYPE html><html><body style="margin:0;padding:0;">${html}</body></html>`;

  // 1. Modern Async Clipboard API with text/html blob
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      const htmlBlob = new Blob([clipboardHtml], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ]);
      return true;
    }
  } catch {
    // Fallback below
  }

  // 2. DOM Selection Range copy (critical for Gmail web paste formatting)
  try {
    const container = document.createElement('div');
    container.setAttribute('contenteditable', 'true');
    container.style.position = 'fixed';
    container.style.pointerEvents = 'none';
    container.style.opacity = '0';
    container.style.left = '-9999px';
    container.innerHTML = clipboardHtml;
    document.body.appendChild(container);

    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(container);
      selection.removeAllRanges();
      selection.addRange(range);
      const success = document.execCommand('copy');
      selection.removeAllRanges();
      document.body.removeChild(container);
      if (success) return true;
    } else {
      document.body.removeChild(container);
    }
  } catch {
    // Continue to writeText fallback
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(html);
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}
