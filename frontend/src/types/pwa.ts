export type PwaConnectionStatus = 'ACTIVE' | 'NOT_CONFIGURED' | 'VAPID_MISSING' | 'PERMISSION_DENIED';

export interface PwaStatusResponse {
  status: PwaConnectionStatus;
  activeSubscribersCount: number;
  vapidPublicKey?: string;
  browserSubscribed?: boolean;
  permission?: NotificationPermission;
  error?: string;
}

export type PwaTestAudience =
  | 'CURRENT_DEVICE'
  | 'SPECIFIC_USER'
  | 'ALL_USERS'
  | 'SPECIFIC_ROLE'
  | 'SPECIFIC_STAND'
  | 'USER_DIRECT'
  | 'VOLUNTEERS'
  | 'COORDINATORS'
  | 'ADMINS';

export type PwaRecipientType =
  | 'SPECIFIC_USER'
  | 'ALL_USERS'
  | 'SPECIFIC_ROLE'
  | 'SPECIFIC_STAND'
  | 'TASK_ASSIGNEES';

export interface PwaActiveStandOption {
  id: string;
  locationName: string;
  eventName: string;
  eventDate: string;
  status: string;
  volunteersCount?: number;
}

export interface PwaRoleOption {
  id: string;
  label: string;
}

export interface PwaSendTestRequest {
  targetAudience: PwaTestAudience;
  userId?: string;
  userEmail?: string;
  targetValue?: string;
  title: string;
  body: string;
  actionUrl?: string;
}


export interface PwaSendTestResponse {
  success: boolean;
  message: string;
  sentCount?: number;
  error?: string;
}

export type PwaCategory = 'HR' | 'LOGISTICS' | 'FINANCE' | 'GENERAL';

export interface PwaPlaceholder {
  key: string;
  description: string;
}

export interface PwaTriggerDefinition {
  ruleType: string;
  category: PwaCategory;
  name: string;
  description: string;
  placeholders: PwaPlaceholder[];
  supportsTiming: boolean;
  supportsMinCapacity: boolean;
  defaultRecipientType: string;
  allowedRecipientTypes?: PwaRecipientType[];
  defaultActionUrl: string;
  defaultTitle: string;
  defaultTemplates: string[];
  defaultTimingMinutes?: number;
  defaultMinCapacity?: number;
  defaultCooldownMinutes?: number;
}

export interface PwaNotificationRule {
  id: string;
  ruleType: string;
  name: string;
  category: PwaCategory;
  active: boolean;
  triggerTimingMinutes: number;
  minCapacityThreshold?: number;
  targetRecipientType: string; // 'SPECIFIC_USER' | 'ALL_USERS' | 'SPECIFIC_ROLE' | 'SPECIFIC_STAND'
  customRecipient?: string; // target value: userId or role name or standId
  customRecipientJid?: string;
  titleTemplate?: string;
  templates: string[];
  actionUrl: string;
  cooldownMinutes: number;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_PWA_TRIGGERS: PwaTriggerDefinition[] = [
  // HR Triggers
  {
    ruleType: 'PWA_SHIFT_REMINDER',
    category: 'HR',
    name: 'Reminder Automat Tură Voluntar',
    description: 'Trimite push notification voluntarilor înainte de începerea turei programate.',
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
    defaultRecipientType: 'SPECIFIC_USER',
    allowedRecipientTypes: ['SPECIFIC_USER', 'SPECIFIC_STAND'],
    defaultActionUrl: '/dashboard/hr',
    defaultTitle: '',
    defaultTimingMinutes: 120,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 120,
    defaultTemplates: [],
  },
  {
    ruleType: 'PWA_VOLUNTEER_DEFICIT',
    category: 'HR',
    name: 'Alertă Deficit Voluntari Stand',
    description: 'Alertează coordonatorii când o tură are un deficit critic de voluntari.',
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
    defaultRecipientType: 'SPECIFIC_ROLE',
    allowedRecipientTypes: ['SPECIFIC_ROLE', 'SPECIFIC_STAND', 'ALL_USERS'],
    defaultActionUrl: '/dashboard/hr',
    defaultTitle: '',
    defaultTimingMinutes: 1440,
    defaultMinCapacity: 1,
    defaultCooldownMinutes: 60,
    defaultTemplates: [],
  },

  // Volunteer Triggers (Merged under HR)
  {
    ruleType: 'PWA_VOLUNTEER_APPROVAL',
    category: 'HR',
    name: 'Notificare Aprobare Cont Voluntar',
    description: 'Notificare trimisă când contul este validat și activat de un administrator.',
    placeholders: [
      { key: '{firstName}', description: 'Prenume voluntar' },
      { key: '{fullName}', description: 'Nume complet' },
      { key: '{loginUrl}', description: 'Link de autentificare' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'SPECIFIC_USER',
    allowedRecipientTypes: ['SPECIFIC_USER'],
    defaultActionUrl: '/dashboard/general',
    defaultTitle: '',
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 0,
    defaultTemplates: [],
  },
  {
    ruleType: 'PWA_VOLUNTEER_WELCOME',
    category: 'HR',
    name: 'Mesaj de Bun Venit Voluntar',
    description: 'Push notification informativ de bun venit expediat după înregistrare.',
    placeholders: [
      { key: '{firstName}', description: 'Prenume utilizator' },
      { key: '{fullName}', description: 'Nume complet' },
      { key: '{loginUrl}', description: 'Link platformă' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'SPECIFIC_USER',
    allowedRecipientTypes: ['SPECIFIC_USER'],
    defaultActionUrl: '/dashboard/general',
    defaultTitle: '',
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 0,
    defaultTemplates: [],
  },

  // Logistics Triggers
  {
    ruleType: 'PWA_LOGISTICS_LOW_STOCK',
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
    defaultRecipientType: 'SPECIFIC_ROLE',
    allowedRecipientTypes: ['SPECIFIC_ROLE', 'SPECIFIC_STAND'],
    defaultActionUrl: '/dashboard/logistics',
    defaultTitle: '',
    defaultTimingMinutes: 0,
    defaultMinCapacity: 1,
    defaultCooldownMinutes: 60,
    defaultTemplates: [],
  },
  {
    ruleType: 'PWA_LOGISTICS_EOD',
    category: 'LOGISTICS',
    name: 'Notificare Formular EoD Logistică Stand',
    description: 'Alertează coordonatorii logistici la transmiterea raportului zilnic de inventar articole.',
    placeholders: [
      { key: '{standName}', description: 'Nume stand' },
      { key: '{closingPersonName}', description: 'Persoană predare' },
      { key: '{date}', description: 'Data raportării' },
      { key: '{notes}', description: 'Note încheiere' },
      { key: '{mugsCount}', description: 'Total articole rămase' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'SPECIFIC_ROLE',
    allowedRecipientTypes: ['SPECIFIC_ROLE', 'SPECIFIC_STAND'],
    defaultActionUrl: '/dashboard/logistics',
    defaultTitle: '',
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 30,
    defaultTemplates: [],
  },

  // Finance Triggers
  {
    ruleType: 'PWA_FINANCE_EOD',
    category: 'FINANCE',
    name: 'Notificare Formular EoD Încasări',
    description: 'Alertează coordonatorii financiari la transmiterea formularului de încheiere zi.',
    placeholders: [
      { key: '{standName}', description: 'Nume stand' },
      { key: '{date}', description: 'Data raportării' },
      { key: '{cashTotal}', description: 'Total numerar' },
      { key: '{posTotal}', description: 'Total POS' },
      { key: '{grandTotal}', description: 'Total încasat' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'SPECIFIC_ROLE',
    allowedRecipientTypes: ['SPECIFIC_ROLE', 'SPECIFIC_STAND'],
    defaultActionUrl: '/dashboard/finance',
    defaultTitle: '',
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 30,
    defaultTemplates: [],
  },
  {
    ruleType: 'PWA_DONATION_ALERT',
    category: 'FINANCE',
    name: 'Alertă Donație / Sponsorizare Mare',
    description: 'Notifică administratorii la înregistrarea unei donații sau sponsorizări mari.',
    placeholders: [
      { key: '{donorName}', description: 'Nume donator / Companie' },
      { key: '{amount}', description: 'Valoare' },
      { key: '{currency}', description: 'Monedă' },
      { key: '{campaignName}', description: 'Campanie' },
      { key: '{date}', description: 'Data donației' },
    ],
    supportsTiming: false,
    supportsMinCapacity: true,
    defaultRecipientType: 'SPECIFIC_ROLE',
    allowedRecipientTypes: ['SPECIFIC_ROLE'],
    defaultActionUrl: '/dashboard/finance',
    defaultTitle: '',
    defaultTimingMinutes: 0,
    defaultMinCapacity: 500,
    defaultCooldownMinutes: 10,
    defaultTemplates: [],
  },

  // General Triggers
  {
    ruleType: 'PWA_ANNOUNCEMENT_BROADCAST',
    category: 'GENERAL',
    name: 'Anunț Urgent / Broadcast Campanie',
    description: 'Transmite notificări de urgență sau anunțuri generale către toți utilizatorii.',
    placeholders: [
      { key: '{announcementTitle}', description: 'Titlu anunț' },
      { key: '{senderName}', description: 'Expeditor' },
      { key: '{messageText}', description: 'Conținut mesaj' },
      { key: '{date}', description: 'Data transmiterii' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'ALL_USERS',
    allowedRecipientTypes: ['ALL_USERS', 'SPECIFIC_ROLE', 'SPECIFIC_STAND', 'SPECIFIC_USER'],
    defaultActionUrl: '/dashboard/general',
    defaultTitle: '',
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 15,
    defaultTemplates: [],
  },
  {
    ruleType: 'PWA_TASK_ASSIGNED',
    category: 'GENERAL',
    name: 'Notificări Sarcini',
    description: 'Trimite notificări push PWA la crearea sarcinii și memento-uri programate în funcție de prioritate.',
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
    allowedRecipientTypes: ['TASK_ASSIGNEES', 'ALL_USERS', 'SPECIFIC_ROLE'],
    defaultActionUrl: '/dashboard/general?subtab=tasks',
    defaultTitle: '',
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 0,
    defaultTemplates: [],
  },
];
