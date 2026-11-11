export type EmailBlockType =
  | 'header'
  | 'text'
  | 'button'
  | 'image'
  | 'divider'
  | 'spacer'
  | 'multi_column'
  | 'list'
  | 'quote'
  | 'stat_card'
  | 'card'
  | 'badge'
  | 'social_links'
  | 'signature'
  | 'sponsor_tier'
  | 'proposal_deck'
  | 'testimonial';

export interface BaseBlock {
  id: string;
  type: EmailBlockType;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;

  // Granular Borders & Corners
  borderWidth?: number; // in px (0 - 8)
  borderColor?: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderRadius?: number; // in px (0 - 32)

  // Granular Spacing
  paddingTop?: number; // in px
  paddingBottom?: number; // in px
  paddingLeft?: number; // in px
  paddingRight?: number; // in px
}

export interface HeaderBlock extends BaseBlock {
  type: 'header';
  title: string;
  subtitle?: string;
  showLogo: boolean;
  logoText?: string;
  logoImageUrl?: string;
  align: 'left' | 'center' | 'right';
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string; // Markdown or sanitized HTML with {{merge_tags}}
  fontSize?: 'sm' | 'base' | 'lg';
  align?: 'left' | 'center' | 'right';
}

export interface ButtonBlock extends BaseBlock {
  type: 'button';
  label: string;
  url: string;
  variant: 'primary' | 'secondary' | 'custom';
  align: 'left' | 'center' | 'right';
  buttonColor?: string;
  buttonTextColor?: string;
  borderRadiusType?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer';
  height: number; // in px (8 to 120)
}

export interface ListBlock extends BaseBlock {
  type: 'list';
  items: string[];
  listStyle?: 'bullet' | 'number' | 'check';
  align?: 'left' | 'center' | 'right';
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote';
  quote: string;
  author?: string;
  caption?: string;
  align?: 'left' | 'center' | 'right';
}

export interface CardBlock extends BaseBlock {
  type: 'card';
  title?: string;
  content: string;
  buttonLabel?: string;
  buttonUrl?: string;
  cardBgColor?: string;
  cardBorderColor?: string;
  align?: 'left' | 'center' | 'right';
}

export interface BadgeBlock extends BaseBlock {
  type: 'badge';
  text: string;
  align?: 'left' | 'center' | 'right';
  badgeColor?: string;
  badgeTextColor?: string;
}

export interface SponsorTierBlock extends BaseBlock {
  type: 'sponsor_tier';
  tierName: string;
  amount: string;
  currency: string;
  perks: string[];
  cardBgColor?: string;
  cardBorderColor?: string;
  cardBorderRadius?: number;
}

export interface StatCardBlock extends BaseBlock {
  type: 'stat_card';
  value: string;
  label: string;
  description?: string;
  cardBgColor?: string;
  cardBorderColor?: string;
  align?: 'left' | 'center' | 'right';
}

export interface ProposalDeckBlock extends BaseBlock {
  type: 'proposal_deck';
  title: string;
  fileSize?: string;
  fileType?: string;
  description?: string;
  downloadUrl: string;
  buttonText?: string;
  cardBgColor?: string;
  cardBorderColor?: string;
}

export interface MultiColumnBlock extends BaseBlock {
  type: 'multi_column';
  columnCount?: number;
  columns: {
    title?: string;
    content: string;
    buttonLabel?: string;
    buttonUrl?: string;
    imageUrl?: string;
    accentColor?: string;
  }[];
  cardBgColor?: string;
  cardBorderColor?: string;
}

export interface TestimonialBlock extends BaseBlock {
  type: 'testimonial';
  quote: string;
  authorName: string;
  authorRole?: string;
  company?: string;
  avatarUrl?: string;
  cardBgColor?: string;
  cardBorderColor?: string;
}

export interface SocialLinksBlock extends BaseBlock {
  type: 'social_links';
  links: {
    platform: 'facebook' | 'instagram' | 'linkedin' | 'website' | 'youtube' | 'twitter';
    url: string;
    label?: string;
  }[];
  align?: 'left' | 'center' | 'right';
  iconStyle?: 'badge' | 'text' | 'minimal';
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  imageUrl: string;
  altText?: string;
  linkUrl?: string;
  align: 'left' | 'center' | 'right';
  maxHeight?: string;
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  spacing: 'sm' | 'md' | 'lg';
  lineColor?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
}

export interface SignatureBlock extends BaseBlock {
  type: 'signature';
  senderName: string;
  senderRole?: string;
  organization?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
}

export type EmailBlock =
  | HeaderBlock
  | TextBlock
  | ButtonBlock
  | SpacerBlock
  | ListBlock
  | QuoteBlock
  | CardBlock
  | BadgeBlock
  | SponsorTierBlock
  | StatCardBlock
  | ProposalDeckBlock
  | MultiColumnBlock
  | TestimonialBlock
  | SocialLinksBlock
  | ImageBlock
  | DividerBlock
  | SignatureBlock;

export interface EmailGlobalSettings {
  emailBgColor?: string; // Container sheet background (default: '#ffffff')
  backdropColor?: string; // Outer frame background (default: '#f4f4f5')
  canvasWidth?: number; // Default: 600
  sheetBorderRadius?: number; // default: 16
  sheetBorderWidth?: number; // default: 1
  sheetBorderColor?: string; // default: '#e4e4e7'
  fontFamily?: 'sans' | 'serif' | 'mono';
}

export type EmailTemplateStage =
  | 'cold_outreach'
  | 'deck_sent'
  | 'proposal_negotiation'
  | 'contract_invoicing'
  | 'event_prep'
  | 'impact_report'
  | 'general';

export interface EmailTemplate {
  id: string;
  name: string;
  department: 'fundraising' | 'pr' | 'legal' | 'general';
  stage?: EmailTemplateStage;
  subject: string;
  blocks: EmailBlock[];
  settings?: EmailGlobalSettings;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export type EmailDispatchMethod = 'API' | 'EML_DOWNLOAD' | 'CLIPBOARD_COPY' | 'HTML_DOWNLOAD';

export interface EmailLog {
  id: string;
  templateId?: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  dispatchMethod: EmailDispatchMethod;
  status: string;
  sentBy?: string;
  sentAt: string;
}

export interface MergeTagContext {
  sponsor_name?: string;
  contact_person?: string;
  contact_email?: string;
  tier?: string;
  tier_amount?: string;
  contract_amount?: string;
  sender_name?: string;
  sender_email?: string;
  event_name?: string;
  event_year?: string;
  proposal_url?: string;
  assigned_lead?: string;
  [key: string]: string | undefined;
}
