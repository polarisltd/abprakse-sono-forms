# I trimestra skrīninga protokols (FMF) — L. Berģītes ārsta prakse

**Veidlapas nr.:** F010
**Pamatā:** Fetal Medicine Foundation (FMF) *First Trimester Screening Report*, 11+0–13+6 gr. nedēļas
**Adrese:** Rīga, F. Sadovņikova iela 20, 407. kab.
**Tālrunis:** 67205077 | **Mobilais:** 28641848

-----

## Veidlapas dati

| Lauks (LV)                 | Vērtība                                  |
|----------------------------|------------------------------------------|
| **Veidlapas nr.**          | integer / 6 cipari, autoģenerēts         |
| **Vārds, uzvārds**         | text *(common)*                          |
| **Dzimšanas gads (dz. g.)**| year / 4 cipari *(common)*               |
| **Izmeklēšanas datums**    | date *(common — `visit_date`)*           |

> Oriģinālajā FMF veidlapā ir pilns dzimšanas datums. Aplikācijas `statements`
> tabulā glabājas tikai `patient_birth_year`, tāpēc šeit lietots dzimšanas gads.
> Pilnam datumam būtu vajadzīga jauna kolonna vai atsevišķs lauks `form_data`.

-----

## Mātes un grūtniecības raksturlielumi

| Parametrs                              | Vērtība                                                                                                       |
|----------------------------------------|---------------------------------------------------------------------------------------------------------------|
| **Etniskā izcelsme**                   | option: Baltā (Eiropas, Tuvo Austrumu, Ziemeļāfrikas, Hispanic) / Melnādainā (Āfrikas–Karību) / Dienvidāzijas / Austrumāzijas / Jaukta |
| **Paritāte (iepriekšējās dzemdības)**  | integer, min 0                                                                                                  |
| **Mātes svars, kg**                    | decimal                                                                                                         |
| **Augums, cm**                         | decimal                                                                                                         |
| **Cukura diabēts**                     | option: nav / 1. tipa / 2. tipa / gestācijas                                                                    |
| **Smēķēšana šajā grūtniecībā**         | boolean                                                                                                         |
| **Hroniska hipertensija**              | boolean                                                                                                         |
| **Sistēmas sarkanā vilkēde (SLE)**     | boolean                                                                                                         |
| **Antifosfolipīdu sindroms (APS)**     | boolean                                                                                                         |
| **Pacientes mātei bijusi preeklampsija**| boolean                                                                                                        |
| **Ieņemšanas veids**                   | option: Spontāna / Ovulācijas indukcija / IVF / ICSI                                                            |
| **P.M. (pēdējās menstruācijas)**       | date                                                                                                            |
| **Paredzamais dzemdību termiņš (pēc P.M.)** | date                                                                                                       |

-----

## I trimestra ultrasonogrāfija

| Parametrs                                    | Vērtība                                                                                         |
|----------------------------------------------|-------------------------------------------------------------------------------------------------|
| **Vizualizācija**                            | option: apmierinoša / ierobežo augļa kustības / ierobežo mātes ķermeņa uzbūve / apgrūtināta       |
| **Gestācijas vecums pēc CRL — ned.**         | integer (10–14)                                                                                   |
| **Gestācijas vecums pēc CRL — d.**           | integer (0–6)                                                                                     |
| **Paredzamais dzemdību termiņš (pēc US)**    | date                                                                                              |
| **Atrade**                                   | option: Dzīvs auglis / Dzīvs auglis — dvīņi / Sirdsdarbība nav konstatēta                         |
| **Augļa sirdsdarbība**                       | option: vizualizēta / nav vizualizēta                                                             |
| **Frekvence, x/min**                         | integer                                                                                           |
| **CRL, mm**                                  | decimal                                                                                           |
| **Skausta kroka NT, mm**                     | decimal                                                                                           |
| **Ductus venosus PI**                        | decimal                                                                                           |
| **Placenta**                                 | option: mugurējā sienā, augstu / mugurējā sienā, zemu / priekšējā sienā, augstu / priekšējā sienā, zemu / fundus |
| **Augļa ūdens**                              | option: norma / oligohidramnijs / polihidramnijs                                                  |
| **Nabas saite**                              | option: 3 asinsvadi / 2 asinsvadi                                                                 |

-----

## Hromosomu marķieri

| Parametrs                    | Vērtība                                   |
|------------------------------|-------------------------------------------|
| **Deguna kauls**             | option: ir / nav / nav novērtēts          |
| **Trikuspidālais Doplers**   | option: norma / regurgitācija / nav novērtēts |

-----

## Augļa anatomija

| Struktūra                    | Vērtība                                              |
|------------------------------|------------------------------------------------------|
| **Galvaskauss / smadzenes**  | option: izskatās normāli / novirze / nav novērtēts    |
| **Mugurkauls**               | option: izskatās normāls / novirze / nav novērtēts    |
| **Vēdera priekšējā siena**   | option: izskatās normāla / novirze / nav novērtēta    |
| **Kuņģis**                   | option: vizualizējas / nevizualizējas / nav novērtēts |
| **Urīnpūslis / nieres**      | option: vizualizējas / nevizualizējas / nav novērtēts |
| **Rokas**                    | option: abas vizualizējas / nevizualizējas / nav novērtēts |
| **Kājas**                    | option: abas vizualizējas / nevizualizējas / nav novērtēts |
| **Anatomijas piezīmes**      | text, 2 lines                                         |

-----

## Mātes seruma bioķīmija

| Parametrs                     | Vērtība                                   |
|-------------------------------|-------------------------------------------|
| **Parauga datums**            | date                                      |
| **Iekārta**                   | option: Roche / Delfia / Kryptor / Beckman|
| **Brīvais β-hCG, IU/l**       | decimal                                   |
| **β-hCG MoM**                 | decimal                                   |
| **PAPP-A, IU/l**              | decimal                                   |
| **PAPP-A MoM**                | decimal                                   |
| **A. uterina PI**             | decimal                                   |
| **A. uterina PI MoM**         | decimal                                   |
| **Endocervikālais garums, mm**| decimal                                   |

-----

## Riski un konsultēšana

> Risku pieraksta formā `1: 771` vai `<1: 20000` — tāpēc tie ir `text`, nevis skaitliski lauki.

| Lauks                                                  | Vērtība       |
|--------------------------------------------------------|---------------|
| **Paciente konsultēta, piekrišana saņemta**            | boolean       |
| **Operators**                                          | text          |
| **FMF ID**                                             | text          |
| **Trisomija 21 — fona risks**                          | text          |
| **Trisomija 21 — koriģētais risks**                    | text          |
| **Trisomija 18 — fona risks**                          | text          |
| **Trisomija 18 — koriģētais risks**                    | text          |
| **Trisomija 13 — fona risks**                          | text          |
| **Trisomija 13 — koriģētais risks**                    | text          |
| **Preeklampsija līdz 34. ned. — koriģētais risks**     | text          |
| **Augļa augšanas aizture līdz 37. ned. — koriģētais risks** | text     |
| **Slēdziens un norādījumi**                            | text, 4 lines |
| **Ārsta paraksts**                                     | keep blank    |

-----

> ⚠️ *Skrīnings nosaka riska pakāpi, nevis diagnozi. Ultrasonogrāfijas izmeklējums
> neatspoguļo visas iespējamās augļa anatomiskās un ģenētiskās patoloģijas.*

-----

## Terminoloģijas atbilsme (EN → LV)

| FMF report (EN)                   | Veidlapā (LV)                          |
|-----------------------------------|----------------------------------------|
| Racial origin                     | Etniskā izcelsme                       |
| Parity                            | Paritāte                               |
| Chronic hypertension              | Hroniska hipertensija                  |
| Systemic lupus erythematosus      | Sistēmas sarkanā vilkēde (SLE)         |
| Antiphospholipid syndrome         | Antifosfolipīdu sindroms (APS)         |
| Method of conception              | Ieņemšanas veids                       |
| EDD by dates / by scan            | Paredzamais dzemdību termiņš (pēc P.M. / pēc US) |
| Crown–rump length (CRL)           | CRL                                    |
| Nuchal translucency (NT)          | Skausta kroka (NT)                     |
| Ductus venosus PI                 | Ductus venosus PI                      |
| Nasal bone                        | Deguna kauls                           |
| Tricuspid Doppler                 | Trikuspidālais Doplers                 |
| Cord: 3 vessels                   | Nabas saite: 3 asinsvadi               |
| Maternal serum biochemistry       | Mātes seruma bioķīmija                 |
| Free β-hCG / PAPP-A               | Brīvais β-hCG / PAPP-A                 |
| MoM (multiple of the median)      | MoM                                    |
| Endocervical length               | Endocervikālais garums                 |
| Background risk / Adjusted risk   | Fona risks / Koriģētais risks          |
| Fetal growth restriction (FGR)    | Augļa augšanas aizture                 |
