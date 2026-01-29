# Conference Room Booking App
Tässä projektissa rakennetaan kokoushuoneiden varausjärjestelmä, joka koostuu backend-API:sta ja frontend-web-sovelluksesta. Käyttöliittymä on tukemassa rajapintaa visuaalisesti. Backend toteutetaan Node.js:llä, TypeScriptillä sekä Fastifylla ja frontend Angularilla.

## Tech Stack
- **AI**: ChatGPT
- **Backend**: Node.js + TypeScript + Fastify + Zod
- **Frontend**: Angular + TypeScript + Angular Material 
- **Testaus**: VSCode Rest Client

## Toiminnot
- **Huoneen varaus** tietylle aikavälille.
- **Huoneen varausten tarkastelu** yksi huone kerrallaan.
- Tietyn **varauksen poistaminen/peruutus.**

## Toimintalogiikka (business rules)
- Varaus koskee **yhtä kokoushuonetta** ja **yhtä aikaväliä**.
- **Huoneita on kolme**: "Room A", "Room B" ja "Room C".
- Käyttäjä **ei voi luoda, muokata tai poistaa huoneita**.
- Varaukset **eivät saa mennä päällekkäin** saman huoneen sisällä.
- Varaukset **eivät voi sijoittua menneisyyteen**.
- Varauksen **aloitusajan täytyy olla ennen lopetusaikaa**.

### Aikavälien käsittely
- Backend käyttää ja odottaa **ISO 8601 -aikaleimoja**, esim. `2026-01-26T10:00:00Z`.
- Frontend lähettää ajat ISO-muodossa API:in.
- Frontend vastaa aikojen näyttämisestä käyttäjälle luettavassa muodossa (esim. paikallinen aika, kellonajat ja päivämäärät).

### Päällekkäisyyksien estäminen
- Päällekkäisten varausten syntyminen pyritään estämään jo varausvaiheessa käyttöliittymän visuaalisilla ja ohjaavilla ratkaisuilla (esim. käytettävissä olevien aloitusaikojen rajaaminen).
- Backend toimii lopullisena varmistuksena ja estää virheelliset varaukset riippumatta frontendin tilasta.

---

## Data- ja domain-malli
Perusmallit:

- **Room**
  - `id` (esim. `room-a`, `room-b`, `room-c`)
  - `name` (esim. "Room A")
- **Reservation**
  - `id`
  - `roomId`
  - `durationMinutes` (number, sallitut arvot: 30, 60, 120, 180)
  - `start` (ISO datetime)
  - `end` (ISO datetime)
  - `title` (vapaa string tekstikenttä, kokouksen nimi/aihe)
  - `host` (vapaa string tekstikenttä, kokouksen järjestäjä esim. henkilö tai tiimi, ei liity käyttäjähallintaan)

Huoneet ovat **kovakoodattuja** tai konfiguraatiossa määriteltyjä; niihin ei ole API-toiminnallisuutta (ei CRUDia huoneille).

Tietovarasto on **in-memory**: kaikki häviää palvelimen uudelleenkäynnistyksessä.

---

## API (luonnos)
Tämä osio toimii ohjeena sekä toteutukselle että käytölle. Toteutus voi tarkentua, mutta pääidea on:

### Listaa huoneen varaukset
`GET /rooms/:roomId/reservations`

- Palauttaa kaikki tietyn huoneen varaukset.

### Luo uusi varaus
`POST /rooms/:roomId/reservations`

Body (esimerkki):

```json
{
  "start": "2026-01-26T10:00:00Z",
  "durationMinutes": 60,
  "title": "Tiimipalaveri",
  "host": "Dev Team"
}
```

- `durationMinutes` lähetetään frontendistä varauksen luonnin yhteydessä.
- Backend laskee `end`-ajan `start`- ja `durationMinutes`-kenttien perusteella.

### Poista varaus
`DELETE /rooms/:roomId/reservations/:reservationId`

- Poistaa yksittäisen varauksen.
- Tässä projektissa ei ole käyttäjä- tai omistajuuslogiikkaa → kuka tahansa voi poistaa minkä tahansa varauksen.

---

## Frontend - UI ja käyttäjäkokemus
- Frontend on yksi sivu, jossa kalenterinäkymä, varauslomake ja huoneen vaihto ovat samalla ruudulla.

### Yleisrakenne
- Sivu jakautuu pääpiirteissään näin:
  - **Vasen puoli**: kuukausikalenteri
  - **Oikea puoli**: varauslomake

Käyttäjä:
1. Valitsee huoneen.
2. Valitsee päivämäärän.
3. Valitsee kokouksen keston.
4. Valitsee aloitusajan (vapaat slotit).
5. Antaa kokouksen nimen.
6. Tallentaa varauksen.

### Huoneiden valinta
- Huoneet valitaan tagi-/chippinapeilla (Angular Material chips / buttons) lomakkeen yläosassa.
- Aktiivinen huone korostetaan (valittu tila).
- Näkymä/kalenteri ei vaihda sivua, vaan sama komponentti näyttää aina valitun huoneen varaukset.

### Päivän valinta
Päivän valintaan on kaksi tapaa, jotka pidetään synkronissa:
1. Kuukausikalenteri (vasemmalla)
  - Näyttää koko kuukauden.
  - Päivän klikkaaminen asettaa valitun päivän lomakkeeseen, mutta ei tee muuta automaattista toimintaa.
  - Kuukausinäkymä on aina näkyvissä.
2. Viikkonapinäkymä (lomakkeen yhteydessä, oikealla)
  - Vaakasuuntainen lista nappuloita, jotka edustavat kuluvan viikon päiviä.
  - Jos ollaan esimerkiksi keskiviikossa:
    - kuluvan viikon ma–ti napit ovat disabloituja (ei voi klikata).
  - Käyttäjä voi siirtyä seuraavaan viikkoon oikealla olevasta nuolipainikkeesta.
  - Viikkonapit ja kuukausikalenteri peilataan samaan tilaan → valinta päivittyy molempiin.

### Varauksen keston valinta
Kesto valitaan chip-tyylisillä napeilla:
- 30min, 1h, 2h, 3h
- Vain yksi kesto voi olla valittuna kerrallaan.
- Kesto (ja muut varaukset) vaikuttavat siihen, mitkä aloitusajat ovat mahdollisia (backend + frontend -logiikka).

### Aloitusajan valinta
- Aloitusajaksi tarjotaan 30 minuutin välein slotteja valitulle päivälle ja huoneelle.
- Napit generoidaan toimistoaikojen perusteella (kuten 08:00–17:00).
- Käytettävissä olevat slotit ovat riippuvaisia:
    - jo varatuista ajoista
    - käyttäjän valitsemasta kokouksen kestosta
- Esimerkki:
    - Huoneessa on jo varaus ajalle 10.00-10.30.
    - Käyttäjä valitsee uuden kokouksen kestoksi 1h → aloitusajat 9.30 ja 10.00 eivät ole saatavilla, koska ne menisivät päällekkäin olemassa olevan varauksen kanssa.

### Kokouksen nimi
Tekstikenttä on pakollinen ja se tallennetaan varaukselle title-kenttään.

### Varauksen näyttäminen ja poistaminen
- Varaus näkyy kuukausikalenterissa kyseisen päivän sisällä muodossa: `10.00-11.30 Tiimipalaveri`
- Kun käyttäjä klikkaa varausta, avautuu vahvistusdialogi, joka varmistaa haluaako käyttäjä varmasti poistaa varauksen.
  - Vahvistuksen jälkeen järjestelmä kutsuu DELETE-endpointtia.
  - Tässä projektissa ei ole käyttäjähallintaa → kuka tahansa voi poistaa minkä tahansa varauksen.