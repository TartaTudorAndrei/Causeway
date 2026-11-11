export type NotificationChannel = 'WHATSAPP' | 'PWA';

export type NotificationCategory = 'HR' | 'LOGISTICS' | 'FINANCE' | 'GENERAL';

export interface TriggerPlaceholder {
  key: string;
  description: string;
}

export interface UnifiedTriggerDefinition {
  ruleType: string;
  category: NotificationCategory;
  name: string;
  description: string;
  placeholders: TriggerPlaceholder[];
  supportsTiming: boolean;
  supportsMinCapacity: boolean;
  supportsSourceGroup?: boolean;
  defaultRecipientType: string;
  allowedRecipientTypes?: string[];
  supportedChannels?: NotificationChannel[];
  defaultTitle?: string;
  defaultActionUrl?: string;
  defaultTemplates: string[];
  defaultTimingMinutes?: number;
  defaultMinCapacity?: number;
  defaultCooldownMinutes?: number;
}

export interface UnifiedNotificationRule {
  id: string;
  channel: NotificationChannel;
  ruleType: string;
  name: string;
  category: NotificationCategory;
  active: boolean;
  triggerTimingMinutes: number;
  minCapacityThreshold?: number;
  targetRecipientType: string;
  customRecipientJid?: string;
  customRecipient?: string;
  sourceGroupJid?: string;
  titleTemplate?: string;
  actionUrl?: string;
  templates: string[];
  cooldownMinutes: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationStatusSummary {
  whatsappStatus: 'CONNECTED' | 'PAIRING_REQUIRED' | 'DISCONNECTED';
  pwaStatus: 'ACTIVE' | 'NOT_CONFIGURED' | 'VAPID_MISSING' | 'PERMISSION_DENIED';
  pwaSubscribersCount: number;
}

export const UNIFIED_TRIGGERS: UnifiedTriggerDefinition[] = [
  // HR Triggers
  {
    ruleType: 'HR_SHIFT_REMINDER',
    category: 'HR',
    name: 'Reminder Automat Tură Voluntar',
    description: 'Trimite reminder automat voluntarilor programați pe o tură cu un anumit interval înainte de start.',
    placeholders: [
      { key: '{firstName}', description: 'Prenumele voluntarului' },
      { key: '{fullName}', description: 'Numele complet al voluntarului' },
      { key: '{shiftName}', description: 'Numele/descrierea turei' },
      { key: '{startTime}', description: 'Ora de început a turei' },
      { key: '{endTime}', description: 'Ora de final a turei' },
      { key: '{standName}', description: 'Locația sau standul turei' },
      { key: '{roleName}', description: 'Rolul atribuit' },
      { key: '{standUrl}', description: 'Link-ul public al standului' },
      { key: '{date}', description: 'Data calendaristică a turei' },
    ],
    supportsTiming: true,
    supportsMinCapacity: false,
    defaultRecipientType: 'VOLUNTEER_DIRECT',
    allowedRecipientTypes: ['DIRECT', 'VOLUNTEER_DIRECT', 'GROUP', 'SPECIFIC_USER', 'ALL_USERS'],
    supportedChannels: ['WHATSAPP', 'PWA'],
    defaultTitle: 'Reminder Tură: {shiftName}',
    defaultActionUrl: '/dashboard/general',
    defaultTemplates: [
      'Salut {firstName}! Îți reamintim că tura ta de {roleName} la standul *{standName}* începe la ora {startTime} ({date}). Îți mulțumim pentru implicare! 💛',
      'Bună {firstName}! Nu uita de tura ta programată astăzi ({date}) de la ora {startTime} la *{standName}*. Te așteptăm cu drag!',
    ],
    defaultTimingMinutes: 120,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 120,
  },
  {
    ruleType: 'HR_VOLUNTEER_DEFICIT',
    category: 'HR',
    name: 'Alertă Deficit Voluntari Stand',
    description: 'Alertează echipa și coordonatorii când o tură viitoare are un deficit de voluntari peste pragul setat.',
    placeholders: [
      { key: '{shiftName}', description: 'Numele turei' },
      { key: '{date}', description: 'Data turei' },
      { key: '{startTime}', description: 'Ora de început' },
      { key: '{endTime}', description: 'Ora de final' },
      { key: '{confirmedCount}', description: 'Număr voluntari confirmați' },
      { key: '{requiredCount}', description: 'Număr voluntari necesari' },
      { key: '{standName}', description: 'Nume stand / Locație' },
      { key: '{deficit}', description: 'Număr de voluntari lipsă' },
    ],
    supportsTiming: true,
    supportsMinCapacity: true,
    defaultRecipientType: 'COORDINATOR_GROUP',
    allowedRecipientTypes: ['GROUP', 'COORDINATOR_GROUP', 'ALL_USERS', 'SPECIFIC_ROLE'],
    supportedChannels: ['WHATSAPP', 'PWA'],
    defaultTitle: 'Alertă Deficit Voluntari: {standName}',
    defaultActionUrl: '/dashboard/hr',
    defaultTemplates: [
      '⚠️ *Atenție Deficit Voluntari!*\nStand: {standName}\nData: {date} ({startTime} - {endTime})\nNecesar: {requiredCount} | Confirmați: {confirmedCount} (Lipsesc {deficit} voluntari)',
    ],
    defaultTimingMinutes: 1440,
    defaultMinCapacity: 1,
    defaultCooldownMinutes: 60,
  },
  {
    ruleType: 'VOLUNTEER_APPROVAL',
    category: 'HR',
    name: 'Notificare Aprobare Cont Voluntar',
    description: 'Trimisă automat când contul de voluntar al unui utilizator este validat și aprobat de admin.',
    placeholders: [
      { key: '{firstName}', description: 'Prenumele utilizatorului' },
      { key: '{fullName}', description: 'Numele complet' },
      { key: '{loginUrl}', description: 'Link-ul de autentificare în platformă' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'VOLUNTEER_DIRECT',
    allowedRecipientTypes: ['DIRECT', 'VOLUNTEER_DIRECT', 'SPECIFIC_USER'],
    supportedChannels: ['WHATSAPP', 'PWA'],
    defaultTitle: 'Cont Aprobat!',
    defaultActionUrl: '/dashboard/general',
    defaultTemplates: [
      'Salut {firstName}! Contul tău de voluntar a fost aprobat. Te poți autentifica aici: {loginUrl}',
    ],
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 0,
  },
  {
    ruleType: 'VOLUNTEER_WELCOME',
    category: 'HR',
    name: 'Mesaj de Bun Venit Voluntar',
    description: 'Mesaj informativ de bun venit expediat după înregistrarea pe platformă.',
    placeholders: [
      { key: '{firstName}', description: 'Prenumele utilizatorului' },
      { key: '{fullName}', description: 'Numele complet' },
      { key: '{loginUrl}', description: 'Link platformă' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'VOLUNTEER_DIRECT',
    allowedRecipientTypes: ['DIRECT', 'VOLUNTEER_DIRECT', 'SPECIFIC_USER'],
    supportedChannels: ['WHATSAPP', 'PWA'],
    defaultTitle: 'Bine ai venit în echipă!',
    defaultActionUrl: '/dashboard/general',
    defaultTemplates: [
      'Bun venit în echipă, {firstName}! Ne bucurăm enorm să te avem alături. ✨',
    ],
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 0,
  },

  // Logistics Triggers
  {
    ruleType: 'LOGISTICS_LOW_STOCK',
    category: 'LOGISTICS',
    name: 'Alertă Stoc Redus Logistică',
    description: 'Notifică responsabilii când stocul unui articol atinge sau scade sub pragul de alertă minim.',
    placeholders: [
      { key: '{itemName}', description: 'Numele articolului' },
      { key: '{currentQuantity}', description: 'Cantitatea curentă rămasă' },
      { key: '{minThreshold}', description: 'Pragul minim configurat' },
      { key: '{unit}', description: 'Unitatea de măsură (ex: buc, kg)' },
      { key: '{location}', description: 'Depozitul sau standul' },
    ],
    supportsTiming: false,
    supportsMinCapacity: true,
    defaultRecipientType: 'COORDINATOR_GROUP',
    allowedRecipientTypes: ['GROUP', 'COORDINATOR_GROUP', 'SPECIFIC_ROLE', 'ALL_USERS'],
    supportedChannels: ['WHATSAPP', 'PWA'],
    defaultTitle: 'Alertă Stoc Redus: {itemName}',
    defaultActionUrl: '/dashboard/logistics',
    defaultTemplates: [
      '📦 *Alertă Stoc Redus!*\nArticol: {itemName}\nCantitate rămasă: {currentQuantity} {unit} (Prag minim: {minThreshold} {unit})\nLocație: {location}',
    ],
    defaultTimingMinutes: 0,
    defaultMinCapacity: 1,
    defaultCooldownMinutes: 60,
  },
  {
    ruleType: 'LOGISTICS_EOD_COMPLETION',
    category: 'LOGISTICS',
    name: 'Notificare Formular EoD Logistică Stand',
    description: 'Alertează coordonatorii logistici la transmiterea formularului zilnic de încheiere zi și inventar articole.',
    placeholders: [
      { key: '{standName}', description: 'Numele standului' },
      { key: '{closingPersonName}', description: 'Numele persoanei responsabile de încheiere' },
      { key: '{date}', description: 'Data raportării' },
      { key: '{notes}', description: 'Note și observații' },
      { key: '{mugsCount}', description: 'Numărul total de articole rămase' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'COORDINATOR_GROUP',
    allowedRecipientTypes: ['GROUP', 'COORDINATOR_GROUP', 'SPECIFIC_ROLE'],
    supportedChannels: ['WHATSAPP', 'PWA'],
    defaultTitle: 'Raport EoD Logistică: {standName}',
    defaultActionUrl: '/dashboard/logistics',
    defaultTemplates: [
      '📋 *Încheiere Zi Stand Logistică*\nStand: {standName}\nData: {date}\nResponsabil: {closingPersonName}\nArticole rămase: {mugsCount}\nObservații: {notes}',
    ],
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 30,
  },

  // Finance Triggers
  {
    ruleType: 'FINANCE_EOD_COMPLETION',
    category: 'FINANCE',
    name: 'Notificare Formular EoD Încasări',
    description: 'Alertează coordonatorii la finalizarea cu succes a formularului de încheiere zi (EoD) pentru un stand.',
    placeholders: [
      { key: '{standName}', description: 'Numele standului' },
      { key: '{date}', description: 'Data raportării' },
      { key: '{cashTotal}', description: 'Total numerar colectat (RON)' },
      { key: '{posTotal}', description: 'Total POS colectat (RON)' },
      { key: '{grandTotal}', description: 'Total general colectat (RON)' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'COORDINATOR_GROUP',
    allowedRecipientTypes: ['GROUP', 'COORDINATOR_GROUP', 'SPECIFIC_ROLE'],
    supportedChannels: ['WHATSAPP', 'PWA'],
    defaultTitle: 'Raport EoD Încasări: {standName}',
    defaultActionUrl: '/dashboard/finance',
    defaultTemplates: [
      '💰 *Raport Încasări Stand Finalizat*\nStand: {standName}\nData: {date}\nNumerar: {cashTotal} RON | POS: {posTotal} RON\n*Total General: {grandTotal} RON*',
    ],
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 30,
  },

  // General Triggers
  {
    ruleType: 'TASK_ASSIGNED',
    category: 'GENERAL',
    name: 'Notificări Sarcini',
    description: 'Trimite notificări la crearea sarcinii și memento-uri programate în funcție de prioritate către membrii asignați.',
    placeholders: [
      { key: '{title}', description: 'Titlul sarcinii' },
      { key: '{priority}', description: 'Prioritatea sarcinii' },
      { key: '{deadline}', description: 'Termenul limită' },
      { key: '{description}', description: 'Descrierea sarcinii' },
      { key: '{assignee}', description: 'Numele persoanei asignate' },
      { key: '{department}', description: 'Departamentul' },
      { key: '{reminderIndex}', description: 'Număr memento curent' },
      { key: '{totalReminders}', description: 'Total memento-uri programate' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    defaultRecipientType: 'TASK_ASSIGNEES',
    allowedRecipientTypes: ['TASK_ASSIGNEES', 'GROUP', 'DIRECT', 'SPECIFIC_USER'],
    supportedChannels: ['WHATSAPP', 'PWA'],
    defaultTitle: 'Sarcină Nouă / Memento: {title}',
    defaultActionUrl: '/dashboard/general',
    defaultTemplates: [
      '📌 *Sarcină Asignată: {title}*\nDepartament: {department}\nPrioritate: {priority}\nTermen limită: {deadline}\nDescriere: {description}',
    ],
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 0,
  },
  {
    ruleType: 'GROUP_MEMBER_JOIN',
    category: 'GENERAL',
    name: 'Membru Nou Înscris în Grup',
    description: 'Trimite automat un mesaj de întâmpinare când un membru nou intră într-un grup WhatsApp specificat.',
    placeholders: [
      { key: '{groupName}', description: 'Numele grupului' },
      { key: '{participantPhone}', description: 'Numărul de telefon al membrului' },
      { key: '{userName}', description: 'Numele complet al utilizatorului (dacă există)' },
      { key: '{firstName}', description: 'Prenumele utilizatorului' },
      { key: '{date}', description: 'Data alăturării' },
      { key: '{time}', description: 'Ora alăturării' },
    ],
    supportsTiming: false,
    supportsMinCapacity: false,
    supportsSourceGroup: true,
    defaultRecipientType: 'TRIGGER_GROUP',
    allowedRecipientTypes: ['TRIGGER_GROUP', 'JOINED_USER_DIRECT', 'COORDINATOR_GROUP', 'SPECIFIC_PHONE'],
    supportedChannels: ['WHATSAPP', 'PWA'],
    defaultTitle: 'Membru nou în grup: {groupName}',
    defaultActionUrl: '/dashboard/admin?subtab=notifications',
    defaultTemplates: [
      'Bun venit în grup, {userName}! Ne bucurăm să te avem alături în {groupName}! 🎉',
      'Salut {firstName}! Bine ai venit în comunitate ({groupName}). Dacă ai întrebări, suntem aici să te ajutăm! ✨',
    ],
    defaultTimingMinutes: 0,
    defaultMinCapacity: 0,
    defaultCooldownMinutes: 0,
  },
];
