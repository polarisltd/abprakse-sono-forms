import { FormDef } from './types';

export const PRACTICE = {
  name: 'L. Berģītes ārsta prakse',
  address: 'Rīga, F. Sadovņikova iela 20, 407. kab.',
  phone: '67205077',
  mobile: '28641848',
};

const COMMON_HEADER_ROWS = [
  { fields: [{ id: 'patient_name', label: 'Vārds, uzvārds', type: 'text' as const, common: true }] },
  { fields: [{ id: 'patient_birth_year', label: 'Dzimšanas gads (dz. g.)', type: 'year' as const, common: true }] },
  { fields: [{ id: 'visit_date', label: 'Datums', type: 'date' as const, common: true }] },
];

const PREGNANCY_HEADER_ROWS = [
  { fields: [{ id: 'patient_name', label: 'Vārds, uzvārds', type: 'text' as const, common: true }] },
  { fields: [{ id: 'patient_birth_year', label: 'Dzimšanas gads (dz. g.)', type: 'year' as const, common: true }] },
  { fields: [{ id: 'visit_date', label: 'Datums', type: 'date' as const, common: true }] },
  { fields: [{ id: 'pm', label: 'P.M. (pēdējās menstruācijas)', type: 'text' as const }] },
  { fields: [{ id: 'grutn_atbilst', label: 'Grūtn. atbilst', type: 'text' as const }] },
  { fields: [{ id: 'dzemdibas', label: 'Dzemdības', type: 'text' as const }] },
];

export const FORMS: FormDef[] = [
  // ─── F001 TV/TA Ultrasonoskopija (Gynecology) ─────────────────────────────
  {
    id: 'F001',
    title: 'TV/TA Ultrasonoskopija',
    avatar: '🔬',
    sections: [
      {
        id: 'veidlapas_dati',
        title: 'Veidlapas dati',
        rows: COMMON_HEADER_ROWS,
      },
      {
        id: 'apraksts',
        title: 'Apraksts',
        rows: [
          { fields: [{ id: 'pm', label: 'P.m. (pēdējās menstruācijas)', type: 'text' }] },
          { fields: [{ id: 'mcd', label: 'm.c.d.', type: 'text' }] },
          { fields: [{ id: 'menopauze', label: 'Menopauze (gadi)', type: 'integer' }] },
          {
            fields: [
              { id: 'dzemde_retrofleksija', label: 'dzemde, Retrofleksijā', type: 'boolean' },
              { id: 'dzemde_antefleksija', label: 'dzemde, Antefleksijā', type: 'boolean' },
            ],
          },
          {
            fields: [
              { id: 'dzemde_inhomogena', label: 'dzemde, in/homogēna', type: 'boolean' },
              { id: 'dzemde_gluda', label: 'dzemde, gluda', type: 'boolean' },
              { id: 'dzemde_deformeta', label: 'dzemde, Deformēta', type: 'boolean' },
            ],
          },
          {
            fields: [
              { id: 'dzemde_garums', label: 'Garums (mm)', type: 'integer', unit: 'mm' },
              { id: 'dzemde_ap', label: 'AP (mm)', type: 'integer', unit: 'mm' },
              { id: 'dzemde_platums', label: 'Platums (mm)', type: 'integer', unit: 'mm' },
            ],
          },
          { fields: [{ id: 'miomas_mezgli', label: 'Miomas mezgli', type: 'text' }] },
          { fields: [{ id: 'dzemdes_kakls', label: 'Dzemdes kakls', type: 'text' }] },
          { fields: [{ id: 'dzemdes_dobums', label: 'Dzemdes dobums', type: 'text' }] },
          { fields: [{ id: 'endometrijs', label: 'Endometrijs', type: 'textarea', lines: 2 }] },
          {
            fields: [
              { id: 'laba_olnica', label: 'Labā olnīca (mm)', type: 'integer', unit: 'mm' },
              { id: 'kreisa_olnica', label: 'Kreisā olnīca (mm)', type: 'integer', unit: 'mm' },
            ],
          },
          { fields: [{ id: 'olnicas_komentars', label: 'olnīcas, komentārs', type: 'textarea', lines: 2 }] },
          { fields: [{ id: 'veidojumi', label: 'Veidojumi', type: 'textarea', lines: 2 }] },
          { fields: [{ id: 'brivs_skidrums', label: 'Brīvs šķidrums', type: 'text' }] },
          { fields: [{ id: 'sledziens', label: 'Slēdziens', type: 'textarea', lines: 4 }] },
        ],
      },
    ],
  },

  // ─── F002 Ultrasonoskopija (Hip joints) ───────────────────────────────────
  {
    id: 'F002',
    title: 'Ultrasonoskopija',
    subtitle: 'Gūžu locītavas',
    avatar: '🦴',
    sections: [
      {
        id: 'veidlapas_dati',
        title: 'Veidlapas dati',
        rows: COMMON_HEADER_ROWS,
      },
      {
        id: 'apraksts',
        title: 'Apraksts',
        rows: [
          { fields: [{ id: 'abas_guzas_centreatas', label: 'Abas gūžu locītavas centrētas', type: 'boolean' }] },
          { fields: [{ id: 'kaulu_jumti', label: 'Kaulu jumti labi diferencējas', type: 'boolean' }] },
          { fields: [{ id: 'jumta_skautnes', label: 'Jumta skautnes asi konturētas', type: 'boolean' }] },
          { fields: [{ id: 'skrimsla_jumti', label: 'Skrimsļa jumti sedz femur galviņas', type: 'boolean' }] },
          { fields: [{ id: 'parkaulosanas_kodoli', label: 'Pārkaulošanās kodoli iezīmējas labi', type: 'boolean' }] },
          {
            fields: [
              { id: 'sin_alfa', label: 'Sin alfa (grādi)', type: 'integer', unit: '°' },
              { id: 'beta', label: 'Beta (grādi)', type: 'integer', unit: '°' },
              { id: 'dx_alfa', label: 'Dx alfa (grādi)', type: 'integer', unit: '°' },
            ],
          },
          { fields: [{ id: 'sledziens', label: 'Slēdziens', type: 'textarea', lines: 3 }] },
        ],
      },
    ],
  },

  // ─── F003 Ultrasonoskopija Smadzeņu (Neonatal Brain) ──────────────────────
  {
    id: 'F003',
    title: 'Ultrasonoskopija',
    subtitle: 'Smadzeņu (Neirosonomgrāfija)',
    avatar: '🧠',
    sections: [
      {
        id: 'veidlapas_dati',
        title: 'Veidlapas dati',
        rows: COMMON_HEADER_ROWS,
      },
      {
        id: 'apraksts',
        title: 'Apraksts',
        rows: [
          { fields: [{ id: 'smadzenu_strukturas', label: 'Smadzeņu struktūras pareizi veidotas', type: 'boolean' }] },
          { fields: [{ id: 'corpus_callosum', label: 'Corpus callosum (mm)', type: 'integer', unit: 'mm' }] },
          {
            fields: [
              {
                id: 'periventrikularas_bez_izmainام',
                label: 'Periventrikulāras zonas un subependimālie rajoni — bez redzamām izmaiņām',
                type: 'boolean',
              },
            ],
          },
          { fields: [{ id: 'vi_percent_1', label: 'Ventrikulārā sistēma neizmainīta: VI (%)', type: 'integer', unit: '%' }] },
          { fields: [{ id: 'horoidalie_pinumi', label: 'Horoidālie pinumi homogēni', type: 'boolean' }] },
          { fields: [{ id: 'vi_percent_2', label: 'VI %', type: 'integer', unit: '%' }] },
          {
            fields: [
              { id: 'vla_sin_dx', label: 'VLA sin = dx (mm)', type: 'integer', unit: 'mm' },
              { id: 'vlp_simetriski', label: 'VLP simetriski', type: 'boolean' },
              { id: 'vt', label: 'VT (mm)', type: 'integer', unit: 'mm' },
            ],
          },
          { fields: [{ id: 'vo', label: 'VO — trissūtrveida formas, asi konturēts', type: 'boolean' }] },
          { fields: [{ id: 'starppuslozhu_sprauga', label: 'Starppusložu sprauga (mm)', type: 'integer', unit: 'mm' }] },
          { fields: [{ id: 'bazalas_cisternas', label: 'Bazālās cisternas nepaplašinātas', type: 'boolean' }] },
          { fields: [{ id: 'sledziens', label: 'Slēdziens', type: 'textarea', lines: 5 }] },
        ],
      },
    ],
  },

  // ─── F004 TV/TA Ultrasonoskopija (Pregnancy 1st trimester) ────────────────
  {
    id: 'F004',
    title: 'TV/TA Ultrasonoskopija',
    subtitle: 'Grūtniecība (I trimetris)',
    avatar: '🤰',
    sections: [
      {
        id: 'veidlapas_dati',
        title: 'Veidlapas dati',
        rows: COMMON_HEADER_ROWS,
      },
      {
        id: 'grutniecibas_dati',
        title: 'Grūtniecības dati',
        rows: [
          { fields: [{ id: 'pm', label: 'P.M. (pēdējās menstruācijas)', type: 'text' }] },
          { fields: [{ id: 'grutn_atbilst', label: 'Grūtn. atbilst', type: 'text' }] },
          { fields: [{ id: 'dzemdibas', label: 'Dzemdības', type: 'text' }] },
          { fields: [{ id: 'intrauterina', label: 'Intrauterīna grūtniecība', type: 'boolean' }] },
          {
            fields: [
              { id: 'augla_ola_viena', label: 'augļa ola: viena', type: 'boolean' },
              { id: 'augla_ola_divas', label: 'augļa ola: divas', type: 'boolean' },
            ],
          },
          {
            fields: [
              { id: 'gs', label: 'GS (gestācijas maiss, mm)', type: 'integer', unit: 'mm' },
              { id: 'gs_atbilst', label: 'GS atbilst', type: 'text' },
            ],
          },
          {
            fields: [
              { id: 'crl', label: 'CRL (crown-rump length, mm)', type: 'integer', unit: 'mm' },
              { id: 'crl_atbilst', label: 'CRL atbilst', type: 'text' },
            ],
          },
          {
            fields: [
              { id: 'dzeltenuma_maiss', label: 'Dzeltenuma maiss (mm)', type: 'integer', unit: 'mm' },
              { id: 'dzeltenuma_komentars', label: 'komentārs', type: 'text' },
            ],
          },
          {
            fields: [
              { id: 'skausta_kroka', label: 'Skausta kroka (mm)', type: 'integer', unit: 'mm' },
              { id: 'deguna_kauls', label: 'Deguna kauls (mm)', type: 'integer', unit: 'mm' },
            ],
          },
          {
            fields: [
              { id: 'sirdsdarbiba', label: 'Sirdsdarbība', type: 'select', options: ['ir', 'nav'] },
              { id: 'sirdsdarbiba_xmin', label: 'x/min', type: 'integer', unit: 'x/min' },
            ],
          },
          { fields: [{ id: 'kustibas', label: 'Kustības', type: 'select', options: ['ir', 'nav'] }] },
          {
            fields: [
              {
                id: 'horions_lokalizets',
                label: 'Horions lokalizēts',
                type: 'select',
                options: ['priekšējā', 'mugurējā', 'dzemdes sienā'],
              },
            ],
          },
          { fields: [{ id: 'horions_komentars', label: 'Horions, komentārs', type: 'textarea', lines: 2 }] },
          { fields: [{ id: 'veidojumi', label: 'Veidojumi', type: 'textarea', lines: 3 }] },
          { fields: [{ id: 'sledziens', label: 'Slēdziens', type: 'textarea', lines: 3 }] },
        ],
      },
    ],
  },

  // ─── F005 Augļa Ehokardigrāfija ───────────────────────────────────────────
  {
    id: 'F005',
    title: 'Augļa Ehokardigrāfija',
    avatar: '❤️',
    sections: [
      {
        id: 'pacienta_dati',
        title: 'Pacienta dati',
        rows: [
          { fields: [{ id: 'patient_name', label: 'Paciente (vārds, uzvārds)', type: 'text', common: true }] },
          { fields: [{ id: 'personas_kods', label: 'Personas kods', type: 'text' }] },
          { fields: [{ id: 'visit_date', label: 'Datums', type: 'date', common: true }] },
          { fields: [{ id: 'gestacijas_nedelas', label: 'Gestācijas nedēļas pēc p.m.', type: 'text' }] },
        ],
      },
      {
        id: 'parametri',
        title: 'Izmeklējuma parametri',
        rows: [
          {
            fields: [
              {
                id: 'vizualizacija',
                label: 'Vizualizācija',
                type: 'select',
                options: ['laba', 'apmierinošā', 'slikta'],
              },
            ],
          },
          { fields: [{ id: 'sirdsdarbiba', label: 'Sirdsdarbība', type: 'text' }] },
          { fields: [{ id: 'ritmiska', label: 'Ritmiska', type: 'text' }] },
          { fields: [{ id: 'sirdsdarbiba_xmin', label: 'x/min', type: 'integer', unit: 'x/min' }] },
        ],
      },
      {
        id: 'anatomija',
        title: 'Sirds anatomija',
        note: '4 kameras, AV un VA vārstuļi, starpsiena, plaušu un sistēmas vēnas, maģistrālie asinsvadi un aortas loks:',
        rows: [
          { fields: [{ id: 'anatomija_4_kameras', label: '4 kameras', type: 'boolean' }] },
          { fields: [{ id: 'anatomija_av_va', label: 'AV un VA vārstuļi', type: 'boolean' }] },
          { fields: [{ id: 'anatomija_starpsiena', label: 'Starpsiena', type: 'boolean' }] },
          { fields: [{ id: 'anatomija_plaushu_venas', label: 'Plaušu un sistēmas vēnas', type: 'boolean' }] },
          { fields: [{ id: 'anatomija_magistralie', label: 'Maģistrālie asinsvadi un aortas loks', type: 'boolean' }] },
          { fields: [{ id: 'anatomija_komentars', label: 'Komentārs', type: 'textarea', lines: 2 }] },
        ],
      },
      {
        id: 'doplerogrāfija',
        title: 'Doplerogrāfija',
        rows: [
          { fields: [{ id: 'pw_doplers', label: 'PW Doplers', type: 'text' }] },
          { fields: [{ id: 'cw_doplers', label: 'CW Doplers', type: 'text' }] },
          { fields: [{ id: 'krasu_doplers', label: 'Krāsu Doplers', type: 'text' }] },
        ],
      },
      {
        id: 'sledziens',
        title: 'Slēdziens un norādījumi',
        rows: [
          { fields: [{ id: 'sledziens', label: 'Slēdziens', type: 'textarea', lines: 3 }] },
          { fields: [{ id: 'noradijumi', label: 'Norādījumi', type: 'textarea', lines: 3 }] },
        ],
      },
      {
        id: 'piezime',
        note: 'NB! Grūtniecības laikā ar šo izmeklēšanas metodi pilnībā nav iespējams izslēgt visas iespējamās sirds patoloģijas, piemēram, ātriju starpsienas defektus, nelielus ventrikulu starpsienas defektus, progresējošas vārstuļu patoloģijas un aortas koarktāciju.',
        rows: [],
      },
    ],
  },

  // ─── F006 Ultrasonoskopija Vēdera dobums ──────────────────────────────────
  {
    id: 'F006',
    title: 'Ultrasonoskopija',
    subtitle: 'Vēdera dobums',
    avatar: '🩺',
    sections: [
      {
        id: 'pacienta_dati',
        title: 'Pacienta dati',
        rows: COMMON_HEADER_ROWS,
      },
      {
        id: 'izmeklejuma_parametri',
        title: 'Izmeklējuma parametri',
        rows: [
          { fields: [{ id: 'aknas', label: 'AKNAS — gludu kontūru, homogēnas, ehogenitāte', type: 'textarea', lines: 3 }] },
          { fields: [{ id: 'zhultspuslis', label: 'ŽULTSPŪSLIS — plānu gludu sieniņu', type: 'textarea', lines: 5 }] },
          {
            fields: [
              {
                id: 'aizkungzha_dziedzeris',
                label: 'AIZKUŅĢA DZIEDZERIS — homogēns, ehogenitāte',
                type: 'textarea',
                lines: 3,
              },
            ],
          },
          {
            fields: [
              {
                id: 'nieres',
                label: 'NIERES — parastas lokalizācijas, lieluma, kontūras',
                type: 'text',
              },
            ],
          },
          {
            fields: [
              {
                id: 'parenhimas_zona',
                label: 'Parenhīmas/centrālās zonas attiecības saglabātas',
                type: 'text',
              },
            ],
          },
          { fields: [{ id: 'laba_niere', label: 'Labā niere', type: 'textarea', lines: 2 }] },
          { fields: [{ id: 'kreisa_niere', label: 'Kreisā niere', type: 'textarea', lines: 2 }] },
          { fields: [{ id: 'liesa', label: 'LIESA', type: 'textarea', lines: 4 }] },
          { fields: [{ id: 'urinpuslis', label: 'URĪNPŪSLIS', type: 'textarea', lines: 4 }] },
          { fields: [{ id: 'sledziens', label: 'Slēdziens', type: 'textarea', lines: 4 }] },
        ],
      },
    ],
  },

  // ─── F007 Augļa Ultrasongrāfija (III Trimestris — version A) ──────────────
  {
    id: 'F007',
    title: 'Augļa Ultrasongrāfijas Protokols',
    subtitle: 'III Trimestris',
    avatar: '👶',
    sections: [
      {
        id: 'pacienta_dati',
        title: 'Pacienta dati',
        rows: PREGNANCY_HEADER_ROWS,
      },
      {
        id: 'parametri',
        title: 'Izmeklējuma parametri',
        rows: [
          {
            fields: [
              {
                id: 'vizualizacija',
                label: 'Vizualizācija',
                type: 'select',
                options: ['apmierinošā', 'apgrūtināta'],
              },
            ],
          },
          { fields: [{ id: 'augla_kustibas', label: 'Augļa kustības, vizualizē', type: 'boolean' }] },
          {
            fields: [
              {
                id: 'prieksguloshadala',
                label: 'Priekšguļošā daļa',
                type: 'select',
                options: ['galva', 'tūplis', 'šķērsguļa', 'mainīga'],
              },
            ],
          },
        ],
      },
      {
        id: 'biometrie',
        title: 'Biometriskie mērījumi',
        rows: [
          {
            fields: [
              { id: 'bpd', label: 'BPD (mm)', type: 'integer', unit: 'mm' },
              { id: 'bpd_atbilst', label: 'BPD atbilst', type: 'text' },
            ],
          },
          {
            fields: [
              { id: 'hc', label: 'HC (mm)', type: 'integer', unit: 'mm' },
              { id: 'hc_atbilst', label: 'HC atbilst', type: 'text' },
            ],
          },
          {
            fields: [
              { id: 'ac', label: 'AC (mm)', type: 'integer', unit: 'mm' },
              { id: 'ac_atbilst', label: 'AC atbilst', type: 'text' },
            ],
          },
          {
            fields: [
              { id: 'fl', label: 'FL (mm)', type: 'integer', unit: 'mm' },
              { id: 'fl_atbilst', label: 'FL atbilst', type: 'text' },
            ],
          },
          { fields: [{ id: 'sd_frekvence', label: 'SD frekvence (x/min)', type: 'integer', unit: 'x/min' }] },
          { fields: [{ id: 'papildu_atradne', label: 'Papildu atradne', type: 'textarea', lines: 2 }] },
          { fields: [{ id: 'augla_svars', label: 'Augļa svars (g)', type: 'integer', unit: 'g' }] },
        ],
      },
      {
        id: 'biofizikais',
        title: 'Biofizikālais profils',
        rows: [
          {
            fields: [
              { id: 'bio_kustibas', label: 'Augļa kustības', type: 'integer', min: 0, max: 2 },
            ],
          },
          {
            fields: [
              { id: 'bio_tonuss', label: 'Augļa muskulatūras tonuss', type: 'integer', min: 0, max: 2 },
            ],
          },
          {
            fields: [
              { id: 'bio_udens', label: 'Augļa ūdens', type: 'integer', min: 0, max: 2 },
            ],
          },
          {
            fields: [
              { id: 'bio_elposana', label: 'Augļa elpošanas kustības', type: 'integer', min: 0, max: 2 },
            ],
          },
          {
            fields: [
              {
                id: 'bio_kopa',
                label: 'Kopā (balles)',
                type: 'calculated',
                calcFrom: ['bio_kustibas', 'bio_tonuss', 'bio_udens', 'bio_elposana'],
                max: 8,
              },
            ],
          },
        ],
      },
      {
        id: 'placenta',
        title: 'Placenta',
        rows: [
          {
            fields: [
              {
                id: 'placenta_lokalizacija',
                label: 'Lokalizācija',
                type: 'select',
                options: ['priekšējā sienā', 'mugurējā sienā', 'fundus'],
              },
              { id: 'placenta_novietota', label: 'Novietota', type: 'select', options: ['augstu', 'zemu'] },
            ],
          },
          { fields: [{ id: 'placenta_ipatnibas', label: 'Īpatnības', type: 'text' }] },
          { fields: [{ id: 'apaksejais_segments', label: 'Apakšējais segments', type: 'text' }] },
          { fields: [{ id: 'nabas_saite', label: 'Nabas saite, 3 asinsvadi', type: 'boolean' }] },
        ],
      },
      {
        id: 'augla_udens',
        title: 'Augļa ūdens',
        rows: [
          {
            fields: [
              {
                id: 'augla_udens',
                label: 'Augļa ūdens',
                type: 'select',
                options: ['norma', 'oligo-', 'polyhydramnion'],
              },
            ],
          },
          {
            fields: [
              { id: 'afi', label: 'AFI (cm)', type: 'decimal', unit: 'cm' },
              { id: 'dzilaka_kabata', label: 'Dziļākā kabata (cm)', type: 'decimal', unit: 'cm' },
            ],
          },
        ],
      },
      {
        id: 'dzemdes_kakls',
        title: 'Dzemdes kakls',
        rows: [
          {
            fields: [
              { id: 'dzemdes_kakls', label: 'Dzemdes kakls (mm)', type: 'integer', unit: 'mm' },
              { id: 'metode', label: 'Metode', type: 'select', options: ['TA', 'TV'] },
            ],
          },
        ],
      },
      {
        id: 'doplers',
        title: 'Doplerizmeklēšana',
        rows: [
          { fields: [{ id: 'a_umbilicalis_pi', label: 'A. umbilicalis, PI', type: 'decimal' }] },
          { fields: [{ id: 'a_cerebri_media_pi', label: 'A. cerebri media, PI', type: 'decimal' }] },
          { fields: [{ id: 'mca_psv', label: 'MCA PSV (cm/s)', type: 'decimal', unit: 'cm/s' }] },
          { fields: [{ id: 'a_uterina_laba_pi', label: 'A. uterina labā, PI', type: 'decimal' }] },
          { fields: [{ id: 'a_uterina_kreisa_pi', label: 'A. uterina kreisā, PI', type: 'decimal' }] },
          { fields: [{ id: 'ductus_venosus', label: 'Ductus venosus', type: 'decimal' }] },
        ],
      },
      {
        id: 'sledziens',
        title: 'Slēdziens un norādījumi',
        rows: [
          { fields: [{ id: 'sledziens', label: 'Slēdziens', type: 'textarea', lines: 3 }] },
          { fields: [{ id: 'atkarota_us', label: 'Atkārtota augļa US', type: 'text' }] },
        ],
      },
      {
        id: 'piezime',
        note: 'Ultrasongrāfijas izmeklējums neatspoguļo visas iespējamās augļa anatomiskās un ģenētiskās patoloģijas.',
        rows: [],
      },
    ],
  },

  // ─── F008 Augļa Ultrasongrāfija (III Trimestris — version B) ──────────────
  {
    id: 'F008',
    title: 'Augļa Ultrasongrāfijas Protokols',
    subtitle: 'III Trimestris (B)',
    avatar: '🍼',
    sections: [
      {
        id: 'pacienta_dati',
        title: 'Pacienta dati',
        rows: PREGNANCY_HEADER_ROWS,
      },
      {
        id: 'parametri',
        title: 'Izmeklējuma parametri',
        rows: [
          {
            fields: [
              {
                id: 'vizualizacija',
                label: 'Vizualizācija',
                type: 'select',
                options: ['apmierinošā', 'apgrūtināta'],
              },
            ],
          },
          { fields: [{ id: 'augla_kustibas', label: 'Augļa kustības, vizualizē', type: 'boolean' }] },
          {
            fields: [
              {
                id: 'prieksguloshadala',
                label: 'Priekšguļošā daļa',
                type: 'select',
                options: ['galva', 'tūplis', 'šķērsguļa', 'mainīga'],
              },
            ],
          },
        ],
      },
      {
        id: 'biometrie',
        title: 'Biometriskie mērījumi',
        rows: [
          {
            fields: [
              { id: 'bpd', label: 'BPD (mm)', type: 'integer', unit: 'mm' },
              { id: 'bpd_atbilst', label: 'BPD atbilst', type: 'text' },
            ],
          },
          {
            fields: [
              { id: 'hc', label: 'HC (mm)', type: 'integer', unit: 'mm' },
              { id: 'hc_atbilst', label: 'HC atbilst', type: 'text' },
            ],
          },
          {
            fields: [
              { id: 'ac', label: 'AC (mm)', type: 'integer', unit: 'mm' },
              { id: 'ac_atbilst', label: 'AC atbilst', type: 'text' },
            ],
          },
          {
            fields: [
              { id: 'fl', label: 'FL (mm)', type: 'integer', unit: 'mm' },
              { id: 'fl_atbilst', label: 'FL atbilst', type: 'text' },
            ],
          },
          { fields: [{ id: 'sd_frekvence', label: 'SD frekvence (x/min)', type: 'integer', unit: 'x/min' }] },
          { fields: [{ id: 'papildu_atradne', label: 'Papildu atradne', type: 'text' }] },
          { fields: [{ id: 'augla_svars', label: 'Augļa svars', type: 'text' }] },
        ],
      },
      {
        id: 'biofizikais',
        title: 'Biofizikālais profils',
        rows: [
          { fields: [{ id: 'bio_kustibas', label: 'Augļa kustības', type: 'integer', min: 0, max: 2 }] },
          { fields: [{ id: 'bio_tonuss', label: 'Augļa muskulatūras tonuss', type: 'integer', min: 0, max: 2 }] },
          { fields: [{ id: 'bio_udens', label: 'Augļa ūdens', type: 'integer', min: 0, max: 2 }] },
          { fields: [{ id: 'bio_elposana', label: 'Augļa elpošanas kustības', type: 'integer', min: 0, max: 2 }] },
          {
            fields: [
              {
                id: 'bio_kopa',
                label: 'Kopā (balles)',
                type: 'calculated',
                calcFrom: ['bio_kustibas', 'bio_tonuss', 'bio_udens', 'bio_elposana'],
                max: 8,
              },
            ],
          },
        ],
      },
      {
        id: 'placenta',
        title: 'Placenta',
        rows: [
          {
            fields: [
              {
                id: 'placenta_lokalizacija',
                label: 'Lokalizācija',
                type: 'select',
                options: ['priekšējā sienā', 'mugurējā sienā', 'fundus'],
              },
              { id: 'placenta_novietota', label: 'Novietota', type: 'select', options: ['augstu', 'zemu'] },
            ],
          },
          { fields: [{ id: 'placenta_ipatnibas', label: 'Īpatnības', type: 'text' }] },
          { fields: [{ id: 'apaksejais_segments', label: 'Apakšējais segments (mm)', type: 'integer', unit: 'mm' }] },
          { fields: [{ id: 'nabas_saite', label: 'Nabas saite, 3 asinsvadi', type: 'boolean' }] },
        ],
      },
      {
        id: 'augla_udens',
        title: 'Augļa ūdens',
        rows: [
          {
            fields: [
              {
                id: 'augla_udens',
                label: 'Augļa ūdens',
                type: 'select',
                options: ['norma', 'oligo-', 'polyhydramnion'],
              },
            ],
          },
          {
            fields: [
              { id: 'afi', label: 'AFI (cm)', type: 'decimal', unit: 'cm' },
              { id: 'dzilaka_kabata', label: 'Dziļākā kabata (cm)', type: 'decimal', unit: 'cm' },
            ],
          },
        ],
      },
      {
        id: 'dzemdes_kakls',
        title: 'Dzemdes kakls',
        rows: [
          {
            fields: [
              { id: 'dzemdes_kakls', label: 'Dzemdes kakls (mm)', type: 'integer', unit: 'mm' },
              { id: 'metode', label: 'Metode', type: 'select', options: ['TA', 'TV'] },
            ],
          },
        ],
      },
      {
        id: 'doplers',
        title: 'Doplerizmeklēšana',
        rows: [
          { fields: [{ id: 'a_umbilicalis_pi', label: 'A. umbilicalis, PI', type: 'decimal' }] },
          { fields: [{ id: 'a_cerebri_media_pi', label: 'A. cerebri media, PI', type: 'decimal' }] },
          { fields: [{ id: 'mca_psv', label: 'MCA PSV (cm/s)', type: 'decimal', unit: 'cm/s' }] },
          { fields: [{ id: 'a_uterina_laba_pi', label: 'A. uterina labā, PI', type: 'decimal' }] },
          { fields: [{ id: 'a_uterina_kreisa_pi', label: 'A. uterina kreisā, PI', type: 'decimal' }] },
          { fields: [{ id: 'ductus_venosus', label: 'Ductus venosus', type: 'decimal' }] },
        ],
      },
      {
        id: 'sledziens',
        title: 'Slēdziens un norādījumi',
        rows: [
          { fields: [{ id: 'sledziens', label: 'Slēdziens', type: 'textarea', lines: 3 }] },
          { fields: [{ id: 'atkarota_us', label: 'Atkārtota augļa US', type: 'text' }] },
        ],
      },
      {
        id: 'piezime',
        note: 'Ultrasongrāfijas izmeklējums neatspoguļo visas iespējamās augļa anatomiskās un ģenētiskās patoloģijas.',
        rows: [],
      },
    ],
  },

  // ─── F009 Ultrasongrāfija 20+0–21+6 gr.nedēļās ───────────────────────────
  {
    id: 'F009',
    title: 'Ultrasongrāfijas Protokols',
    subtitle: '20+0 – 21+6 gr.nedēļās',
    avatar: '🤱',
    sections: [
      {
        id: 'pacienta_dati',
        title: 'Pacienta dati',
        rows: [
          { fields: [{ id: 'patient_name', label: 'Vārds, uzvārds', type: 'text', common: true }] },
          { fields: [{ id: 'patient_birth_year', label: 'Dzimšanas gads', type: 'year', common: true }] },
          { fields: [{ id: 'visit_date', label: 'Datums', type: 'date', common: true }] },
          { fields: [{ id: 'pm', label: 'P.M. (pēdējās menstruācijas)', type: 'text' }] },
          { fields: [{ id: 'grutn_atbilst', label: 'Grūtn. atbilst', type: 'text' }] },
          { fields: [{ id: 'dzemdibas', label: 'Dzemdības (pēc p.m. / pēc CRL)', type: 'text' }] },
          {
            fields: [
              {
                id: 'vizualizacija',
                label: 'Vizualizācija',
                type: 'select',
                options: ['apmierinošā', 'apgrūtināta'],
              },
            ],
          },
          {
            fields: [
              { id: 'svars', label: 'Svars (kg)', type: 'decimal', unit: 'kg' },
              { id: 'augums', label: 'Augums (cm)', type: 'integer', unit: 'cm' },
            ],
          },
        ],
      },
      {
        id: 'anamneze',
        title: 'Anamnēze',
        rows: [
          {
            fields: [
              { id: 'preeklampsija', label: 'Preeklampsija', type: 'boolean' },
              { id: 'diabets', label: 'Diabēts', type: 'boolean' },
            ],
          },
        ],
      },
      {
        id: 'augla_parametri',
        title: 'Augļa parametri',
        rows: [
          {
            fields: [
              { id: 'bpd', label: 'BPD (mm)', type: 'integer', unit: 'mm' },
              { id: 'bpd_ned', label: 'ned.', type: 'integer' },
              { id: 'bpd_d', label: 'd.', type: 'integer' },
            ],
          },
          {
            fields: [
              { id: 'hc', label: 'HC (mm)', type: 'integer', unit: 'mm' },
              { id: 'hc_ned', label: 'ned.', type: 'integer' },
              { id: 'hc_d', label: 'd.', type: 'integer' },
            ],
          },
          {
            fields: [
              { id: 'ac', label: 'AC (mm)', type: 'integer', unit: 'mm' },
              { id: 'ac_ned', label: 'ned.', type: 'integer' },
              { id: 'ac_d', label: 'd.', type: 'integer' },
            ],
          },
          {
            fields: [
              { id: 'fl', label: 'FL (mm)', type: 'integer', unit: 'mm' },
              { id: 'fl_ned', label: 'ned.', type: 'integer' },
              { id: 'fl_d', label: 'd.', type: 'integer' },
            ],
          },
          {
            fields: [
              { id: 'hl', label: 'HL (mm)', type: 'integer', unit: 'mm' },
              { id: 'hl_ned', label: 'ned.', type: 'integer' },
              { id: 'hl_d', label: 'd.', type: 'integer' },
            ],
          },
          { fields: [{ id: 'lateralie_ventrikuli', label: 'Laterālie ventrikuļi (mm)', type: 'integer', unit: 'mm' }] },
          { fields: [{ id: 'smadzenites', label: 'Smadzenītes (mm)', type: 'integer', unit: 'mm' }] },
          { fields: [{ id: 'cm', label: 'CM — cisterna magna (mm)', type: 'integer', unit: 'mm' }] },
          { fields: [{ id: 'skausta_kroka', label: 'Skausta kroka (mm)', type: 'integer', unit: 'mm' }] },
          { fields: [{ id: 'deguna_kauls', label: 'Deguna kauls (mm)', type: 'integer', unit: 'mm' }] },
          {
            fields: [
              {
                id: 'augla_kustibas',
                label: 'Augļa kustības',
                type: 'select',
                options: ['vizualizē', 'nevisualizē'],
              },
              {
                id: 'prieksguloshadala',
                label: 'Priekšguļošā daļa',
                type: 'select',
                options: ['galva', 'tūplis', 'šķērsguļa', 'guļa mainīga'],
              },
            ],
          },
        ],
      },
      {
        id: 'strukturu_atbilstiba',
        title: 'Augļa struktūru atbilstība grūtniecības laikam',
        rows: [
          { fields: [{ id: 'galvaskausas_forma', label: 'Galvaskausa forma', type: 'text' }] },
          { fields: [{ id: 'cns_struktura', label: 'CNS struktūra', type: 'text' }] },
          { fields: [{ id: 'mugurkauls_ada', label: 'Mugurkauls, āda', type: 'text' }] },
          { fields: [{ id: 'krushu_kurvis', label: 'Krūšu kurvis', type: 'text' }] },
          { fields: [{ id: 'sirds_4_kameru', label: 'Sirds: 4 kameru plakne', type: 'text' }] },
          { fields: [{ id: 'tris_asinsvadu', label: '3 asinsvadu plakne', type: 'text' }] },
          { fields: [{ id: 'sirdsdarbiba', label: 'Sirdsdarbība (x/min)', type: 'integer', unit: 'x/min' }] },
          { fields: [{ id: 'kundzis', label: 'Kuņģis', type: 'text' }] },
          { fields: [{ id: 'vedara_prieksheja_siena', label: 'Vēdera priekšējā siena', type: 'text' }] },
          { fields: [{ id: 'kzh_trakts', label: 'Kuņģa–zarnu trakts', type: 'text' }] },
          { fields: [{ id: 'nieres', label: 'Nieres', type: 'text' }] },
          {
            fields: [
              { id: 'nieru_blo_laba', label: 'Nieru bļodiņas — labā (mm)', type: 'integer', unit: 'mm' },
              { id: 'nieru_blo_kreisa', label: 'Nieru bļodiņas — kreisā (mm)', type: 'integer', unit: 'mm' },
            ],
          },
          { fields: [{ id: 'urinpuslis', label: 'Urīnpūslis', type: 'text' }] },
          { fields: [{ id: 'augsheja_ekstremitates', label: 'Augšējās ekstremitātes', type: 'text' }] },
          { fields: [{ id: 'apaksheja_ekstremitates', label: 'Apakšējās ekstremitātes', type: 'text' }] },
        ],
      },
      {
        id: 'placenta_udens',
        title: 'Placenta un augļa ūdens',
        rows: [
          {
            fields: [
              {
                id: 'placenta_lokalizacija',
                label: 'Placenta lokalizācija',
                type: 'select',
                options: ['priekšējā sienā', 'mugurējā sienā', 'fundus'],
              },
              { id: 'placenta_novietota', label: 'Novietota', type: 'select', options: ['augstu', 'zemu'] },
            ],
          },
          { fields: [{ id: 'placenta_ipatnibas', label: 'Īpatnības', type: 'text' }] },
          { fields: [{ id: 'apaksejais_segments', label: 'Apakšējais segments (mm)', type: 'integer', unit: 'mm' }] },
          { fields: [{ id: 'nabas_saite', label: 'Nabas saite: 3 asinsvadi', type: 'boolean' }] },
          {
            fields: [
              {
                id: 'augla_udens',
                label: 'Augļa ūdens',
                type: 'select',
                options: ['norma', 'oligo-', 'poly-hydramnion'],
              },
            ],
          },
          {
            fields: [
              { id: 'afi', label: 'AFI (cm)', type: 'decimal', unit: 'cm' },
              { id: 'dzilaka_kabata', label: 'Dziļākā kabata (cm)', type: 'decimal', unit: 'cm' },
            ],
          },
          {
            fields: [
              { id: 'dzemdes_kakls', label: 'Dzemdes kakls (mm)', type: 'integer', unit: 'mm' },
              { id: 'metode', label: 'Metode', type: 'select', options: ['TA', 'TV'] },
            ],
          },
        ],
      },
      {
        id: 'doplers',
        title: 'Doplerizmeklēšana',
        rows: [
          { fields: [{ id: 'a_uterina_laba_pi', label: 'A. uterina labā, PI', type: 'text' }] },
          { fields: [{ id: 'a_uterina_kreisa_pi', label: 'A. uterina kreisā, PI', type: 'text' }] },
        ],
      },
      {
        id: 'sledziens',
        title: 'Slēdziens un norādījumi',
        rows: [
          { fields: [{ id: 'sledziens', label: 'Slēdziens', type: 'textarea', lines: 2 }] },
          { fields: [{ id: 'atkarota_us_ned', label: 'Atkārtota augļa US (gr.nedēļās)', type: 'integer' }] },
        ],
      },
      {
        id: 'piezime',
        note: 'Ultrasongrāfijas izmeklējums neatspoguļo visas iespējamās augļa anatomiskās un ģenētiskās patoloģijas.',
        rows: [],
      },
    ],
  },
];

export const FORM_MAP = Object.fromEntries(FORMS.map((f) => [f.id, f]));
