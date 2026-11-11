# Configuration Guide

Causeway is designed to be fully white-labelable, allowing non-profit organizations, charity foundations, and community campaigns to deploy the platform under their own brand without modifying application code.

---

## 1. Configuration Resolution

System and branding settings are resolved hierarchically:
1. Environment variables set in `.env` or container manifests take precedence during container bootstrap.
2. Administrative configurations stored in `general.system_configurations` can override operational settings at runtime via the IT Settings interface (`/dashboard?tab=it&subtab=config`).
3. The frontend retrieves effective settings via `GET /api/public/config` and dynamically updates CSS custom properties (`--brand-*`), logos, entity metadata, and UI terminology.

---

## 2. Environment Variables Reference

### 2.1 Brand Identity
| Variable | Default Value | Description |
|---|---|---|
| APP_TENANT_ID | causeway | Unique identifier for the organization tenant |
| APP_TENANT_NAME | Causeway | Organization name displayed in headers, emails, and page titles |
| APP_TENANT_SHORTHAND | CW | Short acronym for compact badges, reports, and prefixes |
| APP_TENANT_TAGLINE | Operations Platform for Non-Profits | Organization tagline shown in headers and metadata |
| APP_TENANT_DESCRIPTION | Operations platform for charity campaigns | Meta description for search indexing and sharing |
| APP_TENANT_MISSION | Empowering communities through collective action. | Mission statement displayed in footers and public pages |

### 2.2 Brand Colors and Palette Tokens
Injected dynamically into CSS root variables (`--brand-primary`, etc.):
| Variable | Default Hex | Palette Role |
|---|---|---|
| APP_BRAND_COLOR_PRIMARY | #0b3323 | Primary brand color (headers, primary buttons) |
| APP_BRAND_COLOR_SECONDARY | #59101c | Secondary brand color (cards, accents) |
| APP_BRAND_COLOR_ACCENT | #c3984e | Highlight color (focus rings, callout elements) |
| APP_BRAND_COLOR_CREAM | #f6efe2 | Surface background tone |
| APP_BRAND_COLOR_CREAM_DARK | #ebdcb9 | Muted surface tone |
| APP_BRAND_COLOR_RED | #a32222 | Destructive actions and prominent callouts |
| APP_BRAND_COLOR_CHARCOAL | #1e1e1e | High-contrast dark surface tone |

### 2.3 Location and Timezone
| Variable | Default Value | Description |
|---|---|---|
| APP_LOCATION_CITY | Cluj-Napoca | Primary operational city |
| APP_LOCATION_COUNTY | Cluj | State or county |
| APP_LOCATION_COUNTRY | România | Operational country |
| APP_LOCATION_TIMEZONE | Europe/Bucharest | IANA timezone used for shift calendars and reports |
| APP_LOCATION_LATITUDE | 46.7712 | Geographic latitude for map widgets |
| APP_LOCATION_LONGITUDE | 23.6236 | Geographic longitude for map widgets |
| APP_WEATHER_ENABLED | true | Enable or disable weather widgets on dashboards |

### 2.4 Legal Entity and Signatory
Used for dynamic contract rendering, volunteer agreements, and payment documentation:
| Variable | Default Value | Description |
|---|---|---|
| APP_LEGAL_ENTITY_NAME | Organizația Caritabilă | Registered legal entity name |
| APP_LEGAL_TAX_ID | RO12345678 | Tax identification code |
| APP_LEGAL_REG_NUM | J12/1234/2020 | Non-profit registry number |
| APP_LEGAL_ADDRESS | Strada Exemplu 1, Cluj-Napoca | Registered headquarters address |
| APP_LEGAL_IBAN | RO00AAAA0000000000000000 | Organization bank account IBAN |
| APP_LEGAL_BANK_NAME | Banca Transilvania | Bank institution name |
| APP_LEGAL_REP_NAME | Reprezentant Legal | Authorized representative full name |
| APP_LEGAL_REP_ROLE | Președinte | Official legal title of representative |

### 2.5 Terminology and Affiliations
Adapts user-facing terminology to match the operational context of the organization:
| Variable | Default Value | Description |
|---|---|---|
| APP_MERCH_ITEM_SINGULAR | Cană | Singular merchandise unit label |
| APP_MERCH_ITEM_PLURAL | Căni | Plural merchandise unit label |
| APP_SEASON_NAME | Campania 2026 | Active campaign period label |
| APP_STAND_LABEL_SINGULAR | Stand | Operational stand label |
| APP_STAND_LABEL_PLURAL | Standuri | Operational stand plural label |
| APP_AFFILIATIONS_LABEL | Club | Label for volunteer organization affiliation |
| APP_AFFILIATIONS_CATEGORIES | Interact,Rotaract,Rotary,Other | Comma-separated list of affiliation categories |

### 2.6 Integrations and Communications
| Variable | Default Value | Description |
|---|---|---|
| APP_PICKUP_CODE_PREFIX | APP- | Prefix used for donation pickup redemption codes |
| APP_STRIPE_DESCRIPTOR | CAUSEWAY DONATION | Bank descriptor for credit card donations |
| APP_TOTP_ISSUER | Causeway | Issuer name shown in 2FA authenticator applications |
| CHARITY_EMAIL_FROM | contact@example.org | Default outgoing email address |
| APP_EMAIL_SENDER_NAME | Causeway | Display name for system notification emails |
| APP_WHATSAPP_CLIENT_NAME | Causeway | Display name for WhatsApp automated alerts |
| APP_GOOGLE_DRIVE_FOLDER | Causeway Workspace | Root folder name in Google Drive integration |
| APP_GOOGLE_SHEETS_PREFIX | CAUSEWAY | Prefix applied to synchronized Google Sheets |

---

## 3. Minimal Configuration Example

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/charity_app
JWT_SECRET=replace_with_a_secure_random_string_of_at_least_32_characters
WHATSAPP_INTERNAL_SECRET=replace_with_a_secure_token

APP_TENANT_NAME="Community Action Network"
APP_TENANT_SHORTHAND="CAN"
APP_BRAND_COLOR_PRIMARY=#1a365d
APP_BRAND_COLOR_ACCENT=#d69e2e
APP_CONTACT_EMAIL="contact@communityaction.org"
APP_LEGAL_ENTITY_NAME="Community Action Network NGO"
```
