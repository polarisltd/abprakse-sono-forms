# Augļa Ultrasongrāfijas Protokols — III Trimestris — L. Berģītes ārsta prakse

**Veidlapas nr.:** F007  
**Adrese:** Rīga, F. Sadovņikova iela 20, 407. kab.  
**Tālrunis:** 67205077 | **Mobilais:** 28641848

-----

## Pacienta dati

|Lauks (LV)                      | Vērtība               |
|--------------------------------|-----------------------|
|**Datums**                      | default: current date |
|**Vārds, uzvārds**              | text                  |
|**Dzimšanas gads (Dzimš. g.)**  | integer, 4 digits     |
|**P.M. (pēdējās menstruācijas)**| text                  |
|**Grūtn. atbilst**              | text                  |
|**Dzemdības**                   | text                  |

-----

## Izmeklējuma parametri

| Parametrs                       | Vērtība                                                       |
|---------------------------------|---------------------------------------------------------------|
| **Vizualizācija**               | option: apmierinošā / apgrūtināta *(nav atzīmēts)*            |
| **Augļa kustības, vizualizē  ** | boolean                                                       |
| **Priekšguļošā daļa**           | option: galva / tūplis / šķērsguļa / mainīga *(nav atzīmēts)* |

-----

## Biometriskie mērījumi

|Parametrs                       | mm      | Atbilst |
|--------------------------------|---------|---------|
|**BPD** (biparietālais diametrs)| integer | text    |
|**HC** (galvas apkārtmērs)      | integer | text    |
|**AC** (vēdera apkārtmērs)      | integer | text    |
|**FL** (augšstilba kaula garums)| integer | text    |

| Parametrs               | value         |
|-------------------------|---------------|
| **SD frekvence, x/min** | integer       |
| **Papildu atradne**     | text, 2 lines |
| **Augļa svars**         | integer       |

-----

## Biofizikālais profils

|Parametrs                    | value          | comment       |
|-----------------------------|----------------|---------------|
|**Augļa kustības**           | 1 digit        | range: 0 .. 2 |
|**Augļa muskulatūras tonuss**| 1 digit        | range: 0 .. 2 |
|**Augļa ūdens**              | 1 digit        | range: 0 .. 2 |
|**Augļa elpošanas kustības** | 1 digit        | range: 0 .. 2 |
|**Kopā (balles)**            | total of above | range: 0 .. 8 |

-----

## Placenta

| Parametrs                     | Vērtība                                     |
|-------------------------------|---------------------------------------------|
| **Lokalizācija**              | option: priekšējā / mugurējā sienā / fundus |
| **Novietota**                 | option: augstu / zemu                       |
| **Īpatnības**                 | text                                        |
| **Apakšējais segments**       | text                                        |
| **Nabas saite, 3 asinsvadi ** | boolean                                     |

-----

## Augļa ūdens

| Parametrs              | Vērtība                                 |
|------------------------|-----------------------------------------|
| **Augļa ūdens**        | option: norma / oligo- / polyhydramnion |
| **AFI, cm**            | integer                                 |
| **Dziļākā kabata, cm** | integer                                 |

-----

## Dzemdes kakls

| Parametrs             | Vērtība         |
|-----------------------|-----------------|
| **Dzemdes kakls, mm** | integer         |
| **Metode**            | option: TA / TV |

-----

## Doplerizmeklēšana

| Asinsvads                        | Vērtība   |
|----------------------------------|-----------|
| **Arteria umbilicalis, PI**      | decimal   |
| **Arteria cerebri media, PI**    | decimal   |
| **MCA PSV, cm/s**                | decimal   |
| **Arteria uterina — labā, PI**   | decimal   |
| **Arteria uterina — kreisā, PI** | decimal   |
| **Ductus venosus**               | decimal   |

-----

## Slēdziens un norādījumi

|Lauks                 | Vērtība      |
|----------------------|--------------|
|**Slēdziens**         | text 3 lines |
|**Atkārtota augļa US**| text         |
|**Ārsta paraksts**    | keep empty   |
|**Ārsta spiedogs**    | keep empty   |

-----

> ⚠️ *Ultrasongrāfijas izmeklējums neatspoguļo visas iespējamās augļa anatomiskās un ģenētiskās patoloģijas.*