import {
  hydrateMergeTags,
  extractMergeTagsFromBlocksAndSubject,
  compileEmailHtml,
  compileEmailPlainText,
  generateEmlContent,
} from '../../utils/emailCompiler';
import type { EmailBlock } from '../../types/email';

describe('emailCompiler', () => {
  it('hydrates merge tags properly', () => {
    const text = 'Hello {{contact_person}} from {{sponsor_name}}! Package: {{tier_amount}}';
    const hydrated = hydrateMergeTags(text, {
      contact_person: 'Ion',
      sponsor_name: 'Acme SRL',
      tier_amount: '10.000 RON',
    });
    expect(hydrated).toBe('Hello Ion from Acme SRL! Package: 10.000 RON');
  });

  it('leaves unprovided merge tags as is', () => {
    const text = 'Hello {{unknown_tag}}!';
    const hydrated = hydrateMergeTags(text, {});
    expect(hydrated).toBe('Hello {{unknown_tag}}!');
  });

  it('extracts all unique merge tags from blocks and subject', () => {
    const blocks: EmailBlock[] = [
      {
        id: '1',
        type: 'header',
        title: 'Bună {{contact_person}}',
        subtitle: 'Invitație {{event_name}}',
      },
      {
        id: '2',
        type: 'text',
        content: 'Compania {{sponsor_name}} este eligibilă pentru pachetul {{tier}} în valoare de {{tier_amount}}.',
      },
      {
        id: '3',
        type: 'signature',
        senderName: '{{sender_name}}',
        email: '{{sender_email}}',
      },
    ];
    const tags = extractMergeTagsFromBlocksAndSubject(blocks, 'Ofertă {{event_year}} pentru {{sponsor_name}}');
    expect(tags).toContain('event_year');
    expect(tags).toContain('sponsor_name');
    expect(tags).toContain('contact_person');
    expect(tags).toContain('event_name');
    expect(tags).toContain('tier');
    expect(tags).toContain('tier_amount');
    expect(tags).toContain('sender_name');
    expect(tags).toContain('sender_email');
    expect(tags.length).toBe(8);
  });

  it('deduplicates duplicate tags and hydrates case-insensitively', () => {
    const blocks: EmailBlock[] = [
      {
        id: '1',
        type: 'header',
        title: 'Salut {{NAME}},',
        subtitle: 'Propunere pentru {{name}}',
      },
      {
        id: '2',
        type: 'text',
        content: 'Dragă {{NAME}}, pachetul {{TIER}} este confirmat pentru {{Name}}.',
      },
    ];
    const tags = extractMergeTagsFromBlocksAndSubject(blocks, 'Subiect pentru {{NAME}}');
    expect(tags).toEqual(['NAME', 'TIER']);

    const hydratedHeader = hydrateMergeTags('Salut {{NAME}} și {{name}}!', { NAME: 'Tudor' });
    expect(hydratedHeader).toBe('Salut Tudor și Tudor!');
  });

  it('compiles header, text, button, sponsor tier, divider, and signature blocks into table HTML', () => {
    const blocks: EmailBlock[] = [
      {
        id: '1',
        type: 'header',
        title: 'Campanie Charity {{event_year}}',
        subtitle: 'Invitație',
        showLogo: true,
        align: 'center',
      },
      {
        id: '2',
        type: 'text',
        content: 'Stimate **{{contact_person}}**,\n\nMulțumim pentru sprijin.',
      },
      {
        id: '3',
        type: 'button',
        label: 'Vezi Propunerea',
        url: 'https://example.org/pachete',
        variant: 'primary',
        align: 'center',
      },
      {
        id: '4',
        type: 'sponsor_tier',
        tierName: 'Gold',
        amount: '10.000',
        currency: 'RON',
        perks: ['Logo', 'Stand'],
      },
      {
        id: '5',
        type: 'divider',
        spacing: 'md',
      },
      {
        id: '6',
        type: 'signature',
        senderName: 'Tudor',
        senderRole: 'Lead',
        organization: 'Charity',
        email: 'tudor@example.org',
      },
    ];

    const context = {
      event_year: '2026',
      contact_person: 'Maria',
    };

    const html = compileEmailHtml(blocks, 'Subiect Test', context);

    expect(html).toContain('Campanie Charity 2026');
    expect(html).toContain('Maria');
    expect(html).toContain('Vezi Propunerea');
    expect(html).toContain('10.000');
    expect(html).toContain('tudor@example.org');
    expect(html).toContain('<table');
  });

  it('generates compliant EML content with RFC 822 headers', () => {
    const eml = generateEmlContent(
      'Subiect Test',
      'partener@acme.ro',
      'Ion Popescu',
      '<html><body>Test</body></html>'
    );

    expect(eml).toContain('To: Ion Popescu <partener@acme.ro>');
    expect(eml).toContain('X-Unsent: 1');
    expect(eml).toContain('Content-Type: text/html; charset=UTF-8');
    expect(eml).toContain('<html><body>Test</body></html>');
  });

  it('compiles plain text fallback', () => {
    const blocks: EmailBlock[] = [
      {
        id: '1',
        type: 'header',
        title: 'Antet',
        showLogo: false,
        align: 'left',
      },
      {
        id: '2',
        type: 'text',
        content: 'Continut mesaj',
      },
      {
        id: '3',
        type: 'button',
        label: 'Deschide',
        url: 'https://example.org',
        variant: 'primary',
        align: 'left',
      },
      {
        id: '4',
        type: 'image',
        imageUrl: 'https://example.com/banner.png',
        altText: 'Banner Event',
        align: 'center',
      },
    ];

    const plain = compileEmailPlainText(blocks);
    expect(plain).toContain('Antet');
    expect(plain).toContain('Continut mesaj');
    expect(plain).toContain('[Deschide] (https://example.org)');
    expect(plain).toContain('[Image: Banner Event] (https://example.com/banner.png)');
  });

  it('compiles custom colors, white-label logo text, and image blocks to HTML', () => {
    const blocks: EmailBlock[] = [
      {
        id: '1',
        type: 'header',
        title: 'Custom Header',
        showLogo: true,
        logoText: 'ACME CORP',
        align: 'left',
        backgroundColor: '#111827',
        textColor: '#38bdf8',
        accentColor: '#ec4899',
      },
      {
        id: '2',
        type: 'image',
        imageUrl: 'https://example.com/pic.jpg',
        altText: 'Logo Partner',
        linkUrl: 'https://example.com',
        align: 'center',
        maxHeight: '250px',
      },
      {
        id: '3',
        type: 'button',
        label: 'Custom CTA',
        url: 'https://acme.org',
        variant: 'custom',
        buttonColor: '#10b981',
        buttonTextColor: '#ffffff',
        borderRadiusType: 'full',
        align: 'center',
      },
    ];
    const html = compileEmailHtml(blocks, 'Custom Styling Test');
    expect(html).toContain('ACME CORP');
    expect(html).toContain('background-color: #111827');
    expect(html).toContain('color: #38bdf8');
    expect(html).toContain('src="https://example.com/pic.jpg"');
    expect(html).toContain('background-color: #10b981');
  });

  it('compiles with custom email background and backdrop settings', () => {
    const blocks: EmailBlock[] = [
      {
        id: '1',
        type: 'text',
        content: 'Hello {{recipient_name}} from {{company_name}}!',
      },
    ];

    const context = {
      contact_person: 'Elena',
      sponsor_name: 'Tech Inc',
    };

    const settings = {
      emailBgColor: '#fdfbf7',
      backdropColor: '#18181b',
    };

    const html = compileEmailHtml(blocks, 'Background Test', context, settings);
    expect(html).toContain('Hello Elena from Tech Inc!');
    expect(html).toContain('background-color: #18181b');
    expect(html).toContain('background-color: #fdfbf7');
  });

  it('compiles new sponsorship blocks: stat_card, proposal_deck, multi_column, testimonial, social_links', () => {
    const blocks: EmailBlock[] = [
      {
        id: 'stat1',
        type: 'stat_card',
        value: '20.000+',
        label: 'Participanți Reali',
        description: 'Tineri și studenți din toată regiunea',
      },
      {
        id: 'deck1',
        type: 'proposal_deck',
        title: 'Mapă Prezentare 2026',
        fileSize: 'PDF • 5 MB',
        downloadUrl: 'https://example.org/deck.pdf',
        buttonText: 'Descarcă PDF',
      },
      {
        id: 'col1',
        type: 'multi_column',
        columnCount: 2,
        columns: [
          { title: 'Pilon 1', content: 'Prezență media' },
          { title: 'Pilon 2', content: 'Stand campanie' },
        ],
      },
      {
        id: 'test1',
        type: 'testimonial',
        quote: 'O colaborare exemplară cu echipa noastră.',
        authorName: 'Dan Ionescu',
        authorRole: 'CEO',
        company: 'Partner Tech',
      },
      {
        id: 'soc1',
        type: 'social_links',
        links: [
          { platform: 'website', url: 'https://example.org', label: 'Website' },
          { platform: 'instagram', url: 'https://instagram.com/charity', label: 'Instagram' },
        ],
      },
    ];

    const html = compileEmailHtml(blocks, 'Sponsorship Blocks Test');
    expect(html).toContain('20.000+');
    expect(html).toContain('Participanți Reali');
    expect(html).toContain('Mapă Prezentare 2026');
    expect(html).toContain('https://example.org/deck.pdf');
    expect(html).toContain('Pilon 1');
    expect(html).toContain('Pilon 2');
    expect(html).toContain('O colaborare exemplară cu echipa noastră.');
    expect(html).toContain('Dan Ionescu');
    expect(html).toContain('Website');

    const plain = compileEmailPlainText(blocks);
    expect(plain).toContain('[STAT] 20.000+ - Participanți Reali');
    expect(plain).toContain('[DOCUMENT] Mapă Prezentare 2026 (https://example.org/deck.pdf)');
    expect(plain).toContain('Pilon 1: Prezență media');
    expect(plain).toContain('"O colaborare exemplară cu echipa noastră." - Dan Ionescu');
    expect(plain).toContain('website: https://example.org');
  });

  it('compiles granular borders and corner radiuses', () => {
    const blocks: EmailBlock[] = [
      {
        id: 'b1',
        type: 'text',
        content: 'Card delimitat cu bordură',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#3b82f6',
        borderRadius: 12,
        paddingTop: 30,
        paddingBottom: 30,
      },
    ];

    const html = compileEmailHtml(blocks, 'Border Test', {}, {
      canvasWidth: 680,
      sheetBorderRadius: 24,
      sheetBorderWidth: 2,
      sheetBorderColor: '#cbd5e1',
      fontFamily: 'serif',
    });

    expect(html).toContain('border: 2px dashed #3b82f6;');
    expect(html).toContain('border-radius: 12px;');
    expect(html).toContain('padding: 30px 32px 30px 32px;');
    expect(html).toContain('max-width: 680px;');
    expect(html).toContain('border-radius: 24px;');
    expect(html).toContain('Georgia');
  });

  it('compiles basic building blocks: spacer, list, quote, card, badge', () => {
    const blocks: EmailBlock[] = [
      {
        id: 'sp1',
        type: 'spacer',
        height: 32,
      },
      {
        id: 'li1',
        type: 'list',
        items: ['Item A', 'Item B'],
        listStyle: 'check',
      },
      {
        id: 'qu1',
        type: 'quote',
        quote: 'Basic quote block test',
        author: 'Jane Doe',
        caption: 'Designer',
      },
      {
        id: 'cd1',
        type: 'card',
        title: 'Card Header',
        content: 'Card text paragraph',
        buttonLabel: 'Click Me',
        buttonUrl: 'https://example.com',
      },
      {
        id: 'bd1',
        type: 'badge',
        text: 'PROMOTIONAL',
        badgeColor: '#10b981',
      },
    ];

    const html = compileEmailHtml(blocks, 'Basic Building Blocks Test');
    expect(html).toContain('height: 32px;');
    expect(html).toContain('Item A');
    expect(html).toContain('Item B');
    expect(html).toContain('Basic quote block test');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('Designer');
    expect(html).toContain('Card Header');
    expect(html).toContain('Card text paragraph');
    expect(html).toContain('Click Me');
    expect(html).toContain('PROMOTIONAL');
    expect(html).toContain('background-color: #10b981;');

    const plain = compileEmailPlainText(blocks);
    expect(plain).toContain('[✓] Item A');
    expect(plain).toContain('[✓] Item B');
    expect(plain).toContain('"Basic quote block test" - Jane Doe (Designer)');
    expect(plain).toContain('[Card Header]\nCard text paragraph\n[Click Me] (https://example.com)');
    expect(plain).toContain('[PROMOTIONAL]');
  });

  it('compiles clean header without persistent border and flush outer layout', () => {
    const blocks: EmailBlock[] = [
      {
        id: 'h1',
        type: 'header',
        title: 'Borderless Header',
        align: 'center',
      },
    ];

    const html = compileEmailHtml(blocks, 'Flush Header Test');
    expect(html).not.toContain('border-bottom: 1px solid #e4e4e7;');
    expect(html).toContain('padding: 0;');
  });
});
