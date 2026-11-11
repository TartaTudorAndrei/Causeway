export type WhatsAppConnectionStatus = 'CONNECTED' | 'PAIRING_REQUIRED' | 'DISCONNECTED';

export interface WhatsAppStatusResponse {
  status: WhatsAppConnectionStatus;
  queueLength?: number;
  error?: string;
}

export interface WhatsAppQrResponse {
  status: WhatsAppConnectionStatus;
  qr: string | null;
  error?: string;
}

export type WhatsAppManualAudience =
  | 'DIRECT'
  | 'SPECIFIC_USER'
  | 'WHATSAPP_GROUP'
  | 'ALL_USERS'
  | 'SPECIFIC_ROLE'
  | 'SPECIFIC_STAND';

export interface WhatsAppSendManualRequest {
  targetAudience?: WhatsAppManualAudience | string;
  targetValue?: string;
  userId?: string;
  phone?: string;
  to?: string;
  message: string;
}

export interface WhatsAppSendManualResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface WhatsAppSendTestRequest {
  to?: string;
  targetAudience?: string;
  targetValue?: string;
  userId?: string;
  phone?: string;
  message: string;
}

export interface WhatsAppSendTestResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface WhatsAppGroupInfo {
  id: string;
  subject: string;
  participantsCount?: number;
}

export type NotificationCategory = 'HR' | 'LOGISTICS' | 'FINANCE' | 'GENERAL';

export interface TriggerPlaceholder {
  key: string;
  description: string;
}

export interface TriggerDefinition {
  ruleType: string;
  category: NotificationCategory;
  name: string;
  description: string;
  placeholders: TriggerPlaceholder[];
  supportsTiming: boolean;
  supportsMinCapacity: boolean;
  defaultRecipientType: string;
  allowedRecipientTypes?: ('DIRECT' | 'GROUP' | 'TASK_ASSIGNEES')[];
  defaultTemplates: string[];
  defaultTimingMinutes?: number;
  defaultMinCapacity?: number;
  defaultCooldownMinutes?: number;
}

export interface NotificationRule {
  id: string;
  ruleType: string;
  name: string;
  category: NotificationCategory;
  active: boolean;
  triggerTimingMinutes: number;
  minCapacityThreshold?: number;
  targetRecipientType: string;
  customRecipientJid?: string;
  templates: string[];
  cooldownMinutes: number;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_TRIGGERS: TriggerDefinition[] = [
  // HR Triggers
  {
    ruleType: 'HR_SHIFT_REMINDER',
    category: 'HR',
    name: 'Reminder Automat Tură Voluntar',
    description: 'Trimite reminder automat voluntarilor cu un anumit interval înainte de începerea turei.',
    placeholders: [
      { key: '{firstName}', description: 'Prenume voluntar' },
      { key: '{fullName}', description: 'Nume complet voluntar' },
      { key: '{shiftName}', description: 'Nume tură' },
      { key: '{startTime}', description: 'Ora început tură' },
      { key: '{endTime}', description: 'Ora sfârșit tură' },
      { key: '{standName}', description: 'Locație / Stand' },
      { key: '{roleName}', description: 'Rol atribuit' },
      { key: '{standUrl}', description: 'Link public stand' },
      { key: '{date}', description: 'Data turei' },
    ],
    supportsTiming: true,
    supportsMinCapacity: false,
    defaultRecipientType: 'DIRECT',
    allowedRecipientTypes: ['DIRECT'],
    defaultTimingMinutes: 120,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 120,
    defaultTemplates: [],
  },
  {
    ruleType: 'HR_VOLUNTEER_DEFICIT',
    category: 'HR',
    name: 'Alertă Deficit Voluntari Stand',
    description: 'Alertează coordonatorii când o tură are un deficit de voluntari peste pragul setat.',
    placeholders: [
      { key: '{shiftName}', description: 'Nume tură' },
      { key: '{date}', description: 'Data turei' },
      { key: '{startTime}', description: 'Ora început' },
      { key: '{endTime}', description: 'Ora sfârșit' },
      { key: '{confirmedCount}', description: 'Voluntari confirmați' },
      { key: '{requiredCount}', description: 'Voluntari necesari' },
      { key: '{standName}', description: 'Nume stand' },
      { key: '{deficit}', description: 'Voluntari lipsă' },
    ],
    supportsTiming: true,
    supportsMinCapacity: true,
    defaultRecipientType: 'GROUP',
    allowedRecipientTypes: ['GROUP'],
    defaultTimingMinutes: 1440,
    defaultMinCapacity: 1,
    defaultCooldownMinutes: 60,
    defaultTemplates: [],
  },

  // Volunteer Triggers (Merged under HR)
  {
    ruleType: 'VOLUNTEER_APPROVAL',
    category: 'HR',
    name: 'Notificare Aprobare Cont Voluntar',
    description: 'Trimisă când contul de voluntar este aprobat și activat în platformă.',
    placeholders: [
      { key: '{firstName}', description: 'Prenume voluntar' },
      { key: '{fullName}', description: 'Nume complet' },
      { key: '{loginUrl}', description: 'Link de autentificare' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'DIRECT',
    allowedRecipientTypes: ['DIRECT'],
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 0,
    defaultTemplates: [],
  },
  {
    ruleType: 'VOLUNTEER_WELCOME',
    category: 'HR',
    name: 'Mesaj de Bun Venit Voluntar',
    description: 'Mesaj informativ de bun venit expediat imediat după înregistrare.',
    placeholders: [
      { key: '{firstName}', description: 'Prenume utilizator' },
      { key: '{fullName}', description: 'Nume complet' },
      { key: '{loginUrl}', description: 'Link platformă' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'DIRECT',
    allowedRecipientTypes: ['DIRECT'],
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 0,
    defaultTemplates: [],
  },

  // Logistics Triggers
  {
    ruleType: 'LOGISTICS_LOW_STOCK',
    category: 'LOGISTICS',
    name: 'Alertă Stoc Redus Logistică',
    description: 'Alertează când cantitatea disponibilă a unui articol scade sub pragul minim.',
    placeholders: [
      { key: '{itemName}', description: 'Nume articol' },
      { key: '{currentQuantity}', description: 'Cantitate rămasă' },
      { key: '{minThreshold}', description: 'Prag minim' },
      { key: '{unit}', description: 'Unitate de măsură' },
      { key: '{location}', description: 'Locație / Stand' },
    ],
    supportsTiming: false,
    supportsMinCapacity: true,
    defaultRecipientType: 'GROUP',
    allowedRecipientTypes: ['GROUP'],
    defaultTimingMinutes: 0,
    defaultMinCapacity: 1,
    defaultCooldownMinutes: 60,
    defaultTemplates: [],
  },
  {
    ruleType: 'LOGISTICS_EOD_COMPLETION',
    category: 'LOGISTICS',
    name: 'Notificare Formular EoD Logistică Stand',
    description: 'Alertează coordonatorii logistici la transmiterea formularului zilnic de încheiere zi și inventar articole.',
    placeholders: [
      { key: '{standName}', description: 'Nume stand' },
      { key: '{closingPersonName}', description: 'Persoană predare' },
      { key: '{date}', description: 'Data raportării' },
      { key: '{notes}', description: 'Note încheiere' },
      { key: '{mugsCount}', description: 'Total articole rămase' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'GROUP',
    allowedRecipientTypes: ['GROUP'],
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 30,
    defaultTemplates: [],
  },

  // Finance Triggers
  {
    ruleType: 'FINANCE_EOD_COMPLETION',
    category: 'FINANCE',
    name: 'Notificare Formular EoD Încasări',
    description: 'Alertează coordonatorii financiari la transmiterea formularului zilnic de încheiere zi.',
    placeholders: [
      { key: '{standName}', description: 'Nume stand' },
      { key: '{date}', description: 'Data raportării' },
      { key: '{cashTotal}', description: 'Total numerar' },
      { key: '{posTotal}', description: 'Total POS' },
      { key: '{grandTotal}', description: 'Total încasat' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'GROUP',
    allowedRecipientTypes: ['GROUP'],
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 30,
    defaultTemplates: [],
  },

  // General / Task Triggers
  {
    ruleType: 'TASK_ASSIGNED',
    category: 'GENERAL',
    name: 'Notificări Sarcini',
    description: 'Trimite notificări pe WhatsApp la crearea sarcinii și memento-uri programate în funcție de prioritate.',
    placeholders: [
      { key: '{title}', description: 'Titlu sarcină' },
      { key: '{priority}', description: 'Prioritate sarcină' },
      { key: '{deadline}', description: 'Termen limită (Deadline)' },
      { key: '{description}', description: 'Descriere sarcină' },
      { key: '{assignee}', description: 'Persoană asignată' },
      { key: '{department}', description: 'Departament' },
      { key: '{reminderIndex}', description: 'Număr memento curent' },
      { key: '{totalReminders}', description: 'Total memento-uri' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'TASK_ASSIGNEES',
    allowedRecipientTypes: ['TASK_ASSIGNEES', 'GROUP'],
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 0,
    defaultTemplates: [],
  },
];
