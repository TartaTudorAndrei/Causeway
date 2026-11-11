import type { ContractFieldDefinition } from '../types/legal';

export interface StarterTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  fieldsSchema: ContractFieldDefinition[];
  identifierPattern?: string;
  content: string;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'starter_sponsorship',
    title: 'Contract de Sponsorizare',
    category: 'sponsorship',
    description: 'Contract standard de sponsorizare conform Legii 32/1994 cu diacritice românești și tabel de semnături.',
    identifierPattern: '{{DATA}}_{{NUME_SPONSOR}}_{{#}}',
    fieldsSchema: [
      { key: 'NUME_SPONSOR', label: 'Denumire Sponsor / Companie', type: 'text', required: true, placeholder: 'ex. SC Partener SRL' },
      { key: 'CUI_SPONSOR', label: 'CUI / CIF Sponsor', type: 'cnp_cui', required: true, placeholder: 'ex. RO12345678' },
      { key: 'REG_COM_SPONSOR', label: 'Nr. Înregistrare Reg. Comerțului', type: 'text', required: true, placeholder: 'ex. J12/1234/2020' },
      { key: 'SEDIU_SPONSOR', label: 'Sediu Sponsor (Adresă)', type: 'text', required: true, placeholder: 'ex. Cluj-Napoca, Str. Exemplu nr. 10' },
      { key: 'REPREZENTANT_SPONSOR', label: 'Reprezentant Legal Sponsor', type: 'text', required: true, placeholder: 'ex. Ion Popescu - Administrator' },
      { key: 'IBAN_SPONSOR', label: 'Cont IBAN Sponsor', type: 'text', required: false, placeholder: 'ex. RO00AAAA1234567890123456' },
      { key: 'BANCA_SPONSOR', label: 'Banca Sponsorului', type: 'text', required: false, placeholder: 'ex. Banca Transilvania' },
      { key: 'SUMA_SPONSORIZARE', label: 'Suma Sponsorizării (RON / EUR)', type: 'currency', required: true, defaultValue: '5.000 RON', placeholder: 'ex. 5.000 RON' },
      { key: 'SUMA_LITERE', label: 'Suma în litere', type: 'text', required: true, defaultValue: 'cinci mii lei', placeholder: 'ex. cinci mii lei' },
      { key: 'SCOP_SPONSORIZARE', label: 'Scopul / Proiectul Susținut', type: 'textarea', required: true, defaultValue: 'Susținerea proiectelor caritabile și a beneficiarilor asociației.', placeholder: 'Descrierea proiectului' },
      { key: 'TERMEN_PLATA', label: 'Termen de Plată (Zile)', type: 'text', required: true, defaultValue: '15 zile de la data semnării', placeholder: 'ex. 15 zile de la semnare' },
    ],
    content: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px;">
    <h1 style="font-size: 20px; font-weight: bold; margin: 0 0 6px 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
      CONTRACT DE SPONSORIZARE
    </h1>
    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #64748b;">
      Nr. {{CONTRACT_NUMBER}} din data de {{DATA_CONTRACT}}
    </p>
  </div>

  <h3 style="font-size: 14px; font-weight: bold; color: #334155; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase;">
    I. PĂRȚILE CONTRACTANTE
  </h3>
  
  <p style="margin-bottom: 12px; text-align: justify; font-size: 13px;">
    <strong>1. {{BENEFICIAR_NAME}}</strong>, cu sediul în {{BENEFICIAR_SEDIU}}, CIF: {{BENEFICIAR_CIF}}, cont IBAN: {{BENEFICIAR_IBAN}} deschis la {{BENEFICIAR_BANCA}}, reprezentată legal de {{BENEFICIAR_REPREZENTANT}} în calitate de {{BENEFICIAR_FUNCTIE}}, denumită în continuare <strong>BENEFICIAR</strong>,
  </p>
  
  <p style="margin-bottom: 16px; text-align: justify; font-size: 13px;">
    și
  </p>

  <p style="margin-bottom: 16px; text-align: justify; font-size: 13px;">
    <strong>2. {{PARTY_B}}</strong>, cu sediul în {{SEDIU_SPONSOR}}, înregistrată la Registrul Comerțului sub nr. {{REG_COM_SPONSOR}}, CUI/CIF: {{CUI_SPONSOR}}, cont bancar IBAN: {{IBAN_SPONSOR}} deschis la {{BANCA_SPONSOR}}, reprezentată legal prin {{REPREZENTANT_SPONSOR}}, denumită în continuare <strong>SPONSOR</strong>,
  </p>

  <p style="margin-bottom: 16px; font-size: 13px;">
    au convenit încheierea prezentului contract de sponsorizare, în conformitate cu prevederile Legii nr. 32/1994 privind sponsorizarea, cu modificările și completările ulterioare.
  </p>

  <h3 style="font-size: 14px; font-weight: bold; color: #334155; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase;">
    II. OBIECTUL CONTRACTULUI
  </h3>
  <p style="margin-bottom: 12px; text-align: justify; font-size: 13px;">
    2.1. Obiectul prezentului contract îl constituie acordarea de către SPONSOR a unei sponsorizări financiare nerambursabile în valoare totală de <strong>{{SUMA_SPONSORIZARE}}</strong> (în litere: <em>{{SUMA_LITERE}}</em>).
  </p>
  <p style="margin-bottom: 16px; text-align: justify; font-size: 13px;">
    2.2. Sponsorizarea se acordă în scopul: <strong>{{SCOP_SPONSORIZARE}}</strong>.
  </p>

  <h3 style="font-size: 14px; font-weight: bold; color: #334155; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase;">
    III. TERMENE ȘI MODALITĂȚI DE PLATĂ
  </h3>
  <p style="margin-bottom: 12px; text-align: justify; font-size: 13px;">
    3.1. Suma prevăzută la art. 2.1 va fi transferată prin ordin de plată în contul bancar al Beneficiarului în termen de <strong>{{TERMEN_PLATA}}</strong>.
  </p>
  <p style="margin-bottom: 16px; text-align: justify; font-size: 13px;">
    3.2. Beneficiarul se obligă să utilizeze fondurile primite exclusiv pentru realizarea scopului specificat la art. 2.2.
  </p>

  <h3 style="font-size: 14px; font-weight: bold; color: #334155; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase;">
    IV. DREPTURILE ȘI OBLIGAȚIILE PĂRȚILOR
  </h3>
  <p style="margin-bottom: 8px; text-align: justify; font-size: 13px;">
    4.1. <strong>Beneficiarul</strong> are dreptul și obligația de a promova numele și identitatea vizuală a Sponsorului în cadrul activităților și materialelor publice asociate proiectului, cu acordul prealabil al acestuia.
  </p>
  <p style="margin-bottom: 8px; text-align: justify; font-size: 13px;">
    4.2. <strong>Sponsorul</strong> are dreptul de a solicita Beneficiarului un raport sintetic privind modul de utilizare a fondurilor acordate.
  </p>
  <p style="margin-bottom: 16px; text-align: justify; font-size: 13px;">
    4.3. Părțile se obligă să respecte confidențialitatea clauzelor contractuale și a datelor cu caracter personal, în conformitate cu Regulamentul (UE) 2016/679 (GDPR).
  </p>

  <h3 style="font-size: 14px; font-weight: bold; color: #334155; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase;">
    V. DISPOZIȚII FINALE
  </h3>
  <p style="margin-bottom: 24px; text-align: justify; font-size: 13px;">
    5.1. Prezentul contract intră în vigoare la data semnării de către ambele părți și a fost încheiat în 2 (două) exemplare originale, câte unul pentru fiecare parte contractantă.
  </p>

  <table style="width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 13px;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #cbd5e1; background-color: #f8fafc;">
        <p style="margin: 0 0 6px 0; font-weight: bold; color: #0f172a;">BENEFICIAR:</p>
        <p style="margin: 0 0 4px 0; font-weight: 600;">{{BENEFICIAR_NAME}}</p>
        <p style="margin: 0 0 20px 0; font-size: 12px; color: #64748b;">Reprezentant Legal: {{BENEFICIAR_FUNCTIE}}</p>
        <p style="margin: 30px 0 0 0; font-size: 12px; color: #94a3b8;">Semnătura și Ștampila: ____________________</p>
      </td>
      <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #cbd5e1; background-color: #f8fafc;">
        <p style="margin: 0 0 6px 0; font-weight: bold; color: #0f172a;">SPONSOR:</p>
        <p style="margin: 0 0 4px 0; font-weight: 600;">{{PARTY_B}}</p>
        <p style="margin: 0 0 20px 0; font-size: 12px; color: #64748b;">Reprezentant: {{REPREZENTANT_SPONSOR}}</p>
        <p style="margin: 30px 0 0 0; font-size: 12px; color: #94a3b8;">Semnătura și Ștampila: ____________________</p>
      </td>
    </tr>
  </table>

</div>
`.trim(),
  },
  {
    id: 'starter_volunteer',
    title: 'Contract de Voluntariat',
    category: 'volunteer',
    description: 'Contract oficial de voluntariat conform Legii 78/2014 privind reglementarea activității de voluntariat.',
    identifierPattern: '{{DATA}}_{{NUME_VOLUNTAR}}_{{#}}',
    fieldsSchema: [
      { key: 'NUME_VOLUNTAR', label: 'Nume și Prenume Voluntar', type: 'text', required: true, placeholder: 'ex. Maria Ionescu' },
      { key: 'CNP_VOLUNTAR', label: 'CNP Voluntar', type: 'cnp_cui', required: true, placeholder: 'ex. 2950101123456' },
      { key: 'CI_SERIE_NR', label: 'Serie și Nr. Carte de Identitate', type: 'text', required: true, placeholder: 'ex. KX 123456' },
      { key: 'DOMICILIU_VOLUNTAR', label: 'Adresă Domiciliu', type: 'text', required: true, placeholder: 'ex. Str. Florilor nr. 5' },
      { key: 'TELEFON_VOLUNTAR', label: 'Număr Telefon', type: 'phone', required: true, placeholder: 'ex. 0740 123 456' },
      { key: 'EMAIL_VOLUNTAR', label: 'Email Voluntar', type: 'email', required: true, placeholder: 'ex. voluntar@email.ro' },
      { key: 'ROL_VOLUNTAR', label: 'Rol / Activități de Voluntariat', type: 'textarea', required: true, defaultValue: 'Coordonare activități evenimente caritabile, sprijin logistic și distribuție pachete beneficiari.', placeholder: 'Descrierea atribuțiilor' },
      { key: 'ORE_SAPTAMANA', label: 'Număr mediu ore / săptămână', type: 'number', required: false, defaultValue: '4', placeholder: 'ex. 4' },
    ],
    content: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px;">
    <h1 style="font-size: 20px; font-weight: bold; margin: 0 0 6px 0; color: #0f172a; text-transform: uppercase;">
      CONTRACT DE VOLUNTARIAT
    </h1>
    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #64748b;">
      Nr. {{CONTRACT_NUMBER}} din data de {{DATA_CONTRACT}}
    </p>
  </div>

  <h3 style="font-size: 14px; font-weight: bold; color: #334155; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase;">
    I. PĂRȚILE CONTRACTANTE
  </h3>
  
  <p style="margin-bottom: 12px; text-align: justify; font-size: 13px;">
    <strong>1. {{BENEFICIAR_NAME}}</strong>, cu sediul în {{BENEFICIAR_SEDIU}}, CIF: {{BENEFICIAR_CIF}}, reprezentată legal prin {{BENEFICIAR_FUNCTIE}}, denumită în continuare <strong>ORGANIZAȚIE-GAZDĂ</strong>,
  </p>
  
  <p style="margin-bottom: 16px; text-align: justify; font-size: 13px;">
    și
  </p>

  <p style="margin-bottom: 16px; text-align: justify; font-size: 13px;">
    <strong>2. {{PARTY_B}}</strong>, domiciliat(ă) în {{DOMICILIU_VOLUNTAR}}, posesor al C.I. seria/nr. {{CI_SERIE_NR}}, CNP {{CNP_VOLUNTAR}}, telefon: {{TELEFON_VOLUNTAR}}, email: {{EMAIL_VOLUNTAR}}, denumit(ă) în continuare <strong>VOLUNTAR</strong>,
  </p>

  <p style="margin-bottom: 16px; font-size: 13px;">
    au convenit încheierea prezentului contract de voluntariat în conformitate cu Legea nr. 78/2014 privind reglementarea activității de voluntariat în România.
  </p>

  <h3 style="font-size: 14px; font-weight: bold; color: #334155; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase;">
    II. OBIECTUL CONTRACTULUI
  </h3>
  <p style="margin-bottom: 12px; text-align: justify; font-size: 13px;">
    2.1. Obiectul prezentului contract îl reprezintă desfășurarea de către voluntar a următoarelor activități în folosul comunității: <strong>{{ROL_VOLUNTAR}}</strong>.
  </p>
  <p style="margin-bottom: 16px; text-align: justify; font-size: 13px;">
    2.2. Voluntarul va dedica o medie estimată de <strong>{{ORE_SAPTAMANA}} ore pe săptămână</strong>, desfășurate în regim flexibil, de comun acord cu coordonatorul de voluntari.
  </p>

  <h3 style="font-size: 14px; font-weight: bold; color: #334155; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase;">
    III. DREPTURI ȘI OBLIGAȚII
  </h3>
  <p style="margin-bottom: 8px; text-align: justify; font-size: 13px;">
    3.1. Voluntarul beneficiază de îndrumare, instruire și eliberarea la cerere a unui <em>Certificat de Voluntariat</em> ce atestă competențele dobândite.
  </p>
  <p style="margin-bottom: 16px; text-align: justify; font-size: 13px;">
    3.2. Voluntarul se angajează să îndeplinească sarcinile cu diligență, să protejeze bunurile organizației și să păstreze confidențialitatea informațiilor legate de beneficiari.
  </p>

  <table style="width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 13px;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #cbd5e1; background-color: #f8fafc;">
        <p style="margin: 0 0 6px 0; font-weight: bold; color: #0f172a;">ORGANIZAȚIA-GAZDĂ:</p>
        <p style="margin: 0 0 4px 0; font-weight: 600;">{{BENEFICIAR_NAME}}</p>
        <p style="margin: 30px 0 0 0; font-size: 12px; color: #94a3b8;">Semnătura: ____________________</p>
      </td>
      <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #cbd5e1; background-color: #f8fafc;">
        <p style="margin: 0 0 6px 0; font-weight: bold; color: #0f172a;">VOLUNTAR:</p>
        <p style="margin: 0 0 4px 0; font-weight: 600;">{{PARTY_B}}</p>
        <p style="margin: 30px 0 0 0; font-size: 12px; color: #94a3b8;">Semnătura: ____________________</p>
      </td>
    </tr>
  </table>

</div>
`.trim(),
  },
  {
    id: 'starter_partnership',
    title: 'Acord de Parteneriat',
    category: 'partnership',
    description: 'Acord de parteneriat inter-instituțional sau cu entități juridice pentru organizare evenimente și campanii caritabile.',
    identifierPattern: '{{DATA}}_{{NUME_PARTENER}}_{{#}}',
    fieldsSchema: [
      { key: 'NUME_PARTENER', label: 'Denumire Instituție / Partener', type: 'text', required: true, placeholder: 'ex. Asociația Prietenii Copiilor' },
      { key: 'REPREZENTANT_PARTENER', label: 'Reprezentant Partener', type: 'text', required: true, placeholder: 'ex. Alexandru Popa - Director' },
      { key: 'SCOP_PARTENERIAT', label: 'Obiectivul & Descrierea Parteneriatului', type: 'textarea', required: true, defaultValue: 'Colaborare în vederea organizării și promovării campaniei umanitare anuale.', placeholder: 'Obiectivele comune' },
      { key: 'DURATA_ACORD', label: 'Durata Acordului', type: 'text', required: true, defaultValue: '12 luni de la data semnării', placeholder: 'ex. 12 luni' },
    ],
    content: `
<div style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px;">
    <h1 style="font-size: 20px; font-weight: bold; margin: 0 0 6px 0; color: #0f172a; text-transform: uppercase;">
      ACORD DE PARTENERIAT & COLABORARE
    </h1>
    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #64748b;">
      Nr. {{CONTRACT_NUMBER}} din data de {{DATA_CONTRACT}}
    </p>
  </div>

  <h3 style="font-size: 14px; font-weight: bold; color: #334155; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase;">
    I. PĂRȚILE ACORDULUI
  </h3>
  <p style="margin-bottom: 12px; text-align: justify; font-size: 13px;">
    <strong>1. {{BENEFICIAR_NAME}}</strong>, reprezentată legal prin {{BENEFICIAR_FUNCTIE}},
  </p>
  <p style="margin-bottom: 16px; text-align: justify; font-size: 13px;">
    și
  </p>
  <p style="margin-bottom: 16px; text-align: justify; font-size: 13px;">
    <strong>2. {{PARTY_B}}</strong>, reprezentată legal prin {{REPREZENTANT_PARTENER}}, denumită în continuare <strong>PARTENER</strong>.
  </p>

  <h3 style="font-size: 14px; font-weight: bold; color: #334155; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase;">
    II. OBIECTUL ȘI SCOPUL PARTENERIATULUI
  </h3>
  <p style="margin-bottom: 12px; text-align: justify; font-size: 13px;">
    Părțile convin să colaboreze pentru realizarea următorului obiectiv comun: <strong>{{SCOP_PARTENERIAT}}</strong>.
  </p>
  <p style="margin-bottom: 16px; text-align: justify; font-size: 13px;">
    Prezentul acord este valabil pentru o perioadă de <strong>{{DURATA_ACORD}}</strong>.
  </p>

  <table style="width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 13px;">
    <tr>
      <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #cbd5e1; background-color: #f8fafc;">
        <p style="margin: 0 0 6px 0; font-weight: bold; color: #0f172a;">Pentru {{BENEFICIAR_NAME}}:</p>
        <p style="margin: 30px 0 0 0; font-size: 12px; color: #94a3b8;">Semnătura: ____________________</p>
      </td>
      <td style="width: 50%; vertical-align: top; padding: 12px; border: 1px solid #cbd5e1; background-color: #f8fafc;">
        <p style="margin: 0 0 6px 0; font-weight: bold; color: #0f172a;">Pentru PARTENER:</p>
        <p style="margin: 30px 0 0 0; font-size: 12px; color: #94a3b8;">Semnătura: ____________________</p>
      </td>
    </tr>
  </table>

</div>
`.trim(),
  }
];

/**
 * Formats HTML or plain text for live preview inside contract-document container
 */
export function formatContractPreviewHtml(content: string): string {
  if (!content) return '';
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  if (isHtml) {
    return content;
  }
  // Convert plain text into clean paragraphs
  return content
    .split(/\n\n+/)
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

/**
 * Clean & render HTML safely with contract styling for Print / PDF export
 * Preserves Google Docs' exact internal stylesheet without overriding layout tables or alignments
 */
export function formatContractDocumentHtml(content: string, title?: string, contractNumber?: string): string {
  if (!content) return '';

  const hasFullHtml = /<html/i.test(content) || /<!DOCTYPE/i.test(content) || /<body/i.test(content);
  
  if (hasFullHtml) {
    let html = content;
    // Ensure UTF-8 meta charset exists in head
    if (!/<meta[^>]*charset/i.test(html)) {
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, '$&\n<meta charset="UTF-8">\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8">\n<style>@page { size: A4; margin: 20mm 15mm; } img { max-width: 100%; height: auto; }</style>');
      } else {
        html = `<meta charset="UTF-8">\n<style>@page { size: A4; margin: 20mm 15mm; } img { max-width: 100%; height: auto; }</style>\n` + html;
      }
    }
    return html;
  }

  const isSnippetHtml = /<[a-z][\s\S]*>/i.test(content);
  const formattedBody = isSnippetHtml ? content : formatContractPreviewHtml(content);
  
  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <title>${title || 'Contract'} ${contractNumber ? `- ${contractNumber}` : ''}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Arial, 'Times New Roman', sans-serif;
      line-height: 1.65;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
      margin: 0;
      font-size: 13px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    img {
      max-width: 100%;
      height: auto;
      object-fit: contain;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  ${formattedBody}
</body>
</html>
  `.trim();
}
