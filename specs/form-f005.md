# Augļa Ehokardigrāfija — L. Berģītes ārsta prakse

**Adrese:** Rīga, F. Sadovņikova iela 20, 407. kab.  
**Tālrunis:** 67205077 | **Mobilais:** 28641848

-----

## Pacienta dati

| Lauks (LV)                      | Vērtība               |
|---------------------------------|-----------------------|
| **Paciente (vārds, uzvārds)**   | text                  |
| **Personas kods**               | text                  |
| **Datums**                      | default: current date |
| **Gestācijas nedēļas pēc p.m.** | text                  |

-----

## Izmeklējuma parametri

| Parametrs                 | Vērtība                             |
|---------------------------|-------------------------------------|
| **Vizualizācija**         | option: laba / apmierinošā / slikta |
| **Sirdsdarbība**          | text                                |
| **Ritmiska**              | text                                |
| **Sirdsdarbība (x/min.)** | integer                             |
-----

## Sirds anatomija

*4 kameras, AV un VA vārstuļi, starpsiena, plaušu un sistēmas vēnas, maģistrālie asinsvadi un aortas loks:*

| Struktūra                                | Atrade  |
|------------------------------------------|---------|
| **4 kameras**                            | boolean |
| **AV un VA vārstuļi**                    | boolean |
| **Starpsiena**                           | boolean |
| **Plaušu un sistēmas vēnas**             | boolean |
| **Maģistrālie asinsvadi un aortas loks** | boolean |
| ** sirds anatomija, komentārs**          | text    |

-----

## Doplerogrāfija

|Parametrs        |Vērtība           |
|-----------------|------------------|
|**PW Doplers**   |*(nav aizpildīts)*|
|**CW Doplers**   |*(nav aizpildīts)*|
|**Krāsu Doplers**|*(nav aizpildīts)*|

-----

## Slēdziens un norādījumi

|Lauks         | Vērtība |
|--------------|---------|
|**Slēdziens** | 3 lines |
|**Norādījumi**| 3 lines |

-----

## Paraksts

|Lauks                         | Vērtība         |
|------------------------------|-----------------|
|**Ārsts (paraksts, spiedogs)**| keep mempty     |
|**Datums**                    | copy from above |

-----

## ⚠️ Svarīga piezīme (priekšdrukāta)

> *NB! Grūtniecības laikā ar šo izmeklēšanas metodi pilnībā nav iespējams izslēgt visas iespējamās sirds patoloģijas, piemēram, ātriju starpsienas defektus, nelielus ventrikulu starpsienas defektus, progresējošas vārstuļu patoloģijas un aortas koarktāciju.*