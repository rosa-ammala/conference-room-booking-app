## Tekoälyn alustaminen ennen kehotuksia
- Uuden projektikansion luominen ChatGPT:ssä.
- Tiedostojen lisääminen projektiin, jotka ovat käytettävissä kaikissa projektin sisäisissä keskusteluissa.
  - **README**.md: Sisältäen teknologiat, tavoitteet, toiminnot, toimintalogiikan (business rules) ja muita tarkentavia ohjeita.
  - Backend ja Frontend **package.json** tiedostot: Sisältäen asennetut riippuvuudet ja projektin perusmääritykset.

---

## Backend-perustoteutuksen generointi

### Kehote
Sinun roolisi on toimia junior-tason parikoodaajana. Autat minua projektin suunnittelussa ja koodin tuottamisessa, mutta minä teen lopulliset päätökset ja refaktoroinnin tarvittaessa. 

Jakamani README.md sisältää projektin tavoitteet, tekniset päätökset, rajaukset ja business-säännöt. Noudata sitä ensisijaisena lähteenä. Jos jokin asia on epäselvä tai vaatii oletuksia, tuo ne esiin ennen koodin kirjoittamista. 

Ensimmäisessa vaiheessa tavoitteeni on aloittaa backendin toteutus hallitusti ja vaiheittain. Olen jo alustanut projektin ja jakanut api/ eli backend ja web/ eli frontend kansioiden package.json tiedostot sinulle. Ennen kuin kirjoitat koodin lue ja analysoi README.md ja package.json tiedostot.

Analyysisi perusteella tee seuraavat asiat:
- Kuvaa omin sanoin ja lyhyesti backendin vastuista tässä projektissa.
- Ehdota selkeää ja yksinkertaista kansiorakennetta 'api/' -kansion sisälle.
- Ehdota totetusaskelet: Mitä koodia kirjoitetaan ensimmäisenä ja mitä jätetään tarkoituksella myöhempiin vaiheisiin?

HUOM! Älä vielä kirjoita varsinaista koodia. Ensimmäisenä tavoitteena on saada sinut ymmärtämään projekti ja sen rakenne sekä tavoitteet. Pidä vastaukset selkeinä ja jäsenneltyinä sekä perustele lyhyesti tekemäsi ehdotukset. Listaa myös kaikki oletukset, joita jouduit tekemään README.md:n pohjalta.

### Vastaus
1. **Backendin vastuut (lyhyesti)**
   Backend vastaa tästä projektista mm.: 
* Tarjoaa HTTP-API:n huonevarausten käsittelyyn:
  * listaa yhden huoneen varaukset
  * luo uuden varauksen
  * poistaa varauksen
* Pakottaa business-säännöt:
  * vain kolme huonetta (Room A/B/C), ei CRUDia huoneille
  * ei päällekkäisiä varauksia samassa huoneessa
  * ei varauksia menneisyyteen
  * aloitusaika < lopetusaika
* Käsittelee ajat ISO 8601 -formaattina ja laskee `end`-ajan `start` + `durationMinutes` perusteella.
* Toimii ainoana totuuden lähteenä (frontend voi yrittää estää virheitä, mutta backend vahvistaa kaiken).
* Tallentaa varaukset **in-memory**-tietovarastoon (kaikki häviää käynnistyksen yhteydessä).

2. **Ehdotettu kansiorakenne `api/`-kansion sisään**
Peruslähtökohta: projekti on pieni, joten ei liikaa kerroksia, mutta kuitenkin selkeä jako **entry point / reitit / domain / palvelut / data**. Lähtökohta nykyisestä package.json:sta: Fastify, Zod, TypeScript + ts-node. 

```txt
api/
  src/
    server.ts             # Fastifyn bootstrap + konfiguraatio
    routes/
      reservations.routes.ts  # Kaikki API-reitit /rooms/... ympärillä
    domain/
      room.ts             # Room-tyypit ja kovakoodattu huonelista
      reservation.ts      # Reservation-tyypit, enumit, apumallit
    services/
      reservationService.ts   # Business-logiikka: validoinnit, päällekkäisyys jne.
    repositories/
      reservationRepository.ts     # Rajapinta/abstraktio varausdatalle
      inMemoryReservationRepository.ts # In-memory toteutus
    validation/
      reservationSchemas.ts   # Zod-skeemat requesteille/responseille
    utils/
      time.ts              # Aika-apurit (esim. overlap-check, now(), parse)
      errors.ts            # Domain- ja HTTP-virhetyypit, muunnos HTTP:ksi

  test/                    # (Mahdollinen myöhempi laajennus, ei heti pakollinen)
    reservationService.test.ts (tms.)

  package.json
  tsconfig.json
  .eslintrc / .prettierrc (jos otetaan käyttöön)
```

**Perustelut:**
* `server.ts` yksinkertaisena sisäänkäyntinä tekee käynnistyksestä selkeän.
* `routes/` eriyttää HTTP-maailman (statuskoodit, parametrit) domain-logiikasta.
* `domain/` sisältää puhtaat mallit, eikä riipu HTTP:stä tai Fastifystä.
* `services/` on paikka, jossa business-säännöt elävät – helppo testata myös ilman Fastifyä.
* `repositories/` mahdollistaa myöhemmin esim. tietokantasiirtymän ilman, että palvelulogiikkaa revitään auki.
* `validation/` eriyttää Zod-skeemat – helpottaa sekä reittien että testien kirjoittamista.
* `utils/` vähentää koodin toistoa (aika- ja virhelogiikka todennäköisesti toistuu).

Jos halutaan vielä yksinkertaisempi versio, nämä kansiot voisi yhdistää (esim. jättää `repositories/` ja `validation/` pois ja laittaa ne `services/` ja `routes/` -tiedostoihin). Tässä olen kuitenkin varautunut siihen, että projekti saattaa kasvaa vielä hiukan.

3. **Toteutusaskeleet – mitä tehdään ensin, mitä myöhemmin**
Tässä etenemissuunnitelma backendin toteutukseen ilman, että kirjoitetaan vielä koodia.

#### Vaihe 1: Perusprojektin konfigurointi
1. **TypeScript-peruskonffi**

   * `tsconfig.json` (target, module, rootDir=src, outDir=dist jne.).
   * Päivitetään `package.json` skriptit (esim. `dev`, `build`, `start`) hyödyntämään `ts-node`a tai build + node -flowta. 

2. **Serverin entry point**

   * Luodaan `src/server.ts` (mutta ei vielä liikaa logiikkaa):

     * Fastify-instanssit
     * perus health-check `GET /health` (voi olla myös myöhemmässä vaiheessa, mutta hyvä testata ympäristö).

**Miksi ensin:**
→ Saadaan kehitysympäristö pystyyn ja varmistetaan, että serveri käynnistyy ennen kuin panostetaan domain-logiikkaan.

#### Vaihe 2: Domain-mallit ja kovakoodatut huoneet
3. **Room & Reservation -mallit (`domain/`)**
   * Room: `id`, `name` + kovakoodattu lista kolmesta huoneesta (Room A/B/C) README:n mukaan. 
   * Reservation: TS-tyypit `id`, `roomId`, `durationMinutes`, `start`, `end`, `title`, `host`.

4. **Yksinkertainen in-memory storage (`repositories/`)**
   * `inMemoryReservationRepository.ts`:
     * Funktiot: listaa huoneen varaukset, lisää varaus, poista varaus id:llä.
   * Tarvittaessa abstrakti `reservationRepository.ts` (interface), jonka in-memory implementaatio toteuttaa.

**Miksi tässä järjestyksessä:**
→ Domain-malli ja tietovarasto luovat “selkärangan”, johon muu logiikka kiinnitetään.

#### Vaihe 3: Business-logiikka palvelukerrokseen

5. **ReservationService (`services/reservationService.ts`)**
   * Funktio varauksen luomiselle:
     * tarkistaa, että `roomId` on sallittujen joukossa
     * laskee `end` ajan `start` + `durationMinutes`
     * varmistaa:
       * ei menneisyyteen
       * aloitusaika < lopetusaika
       * ei päällekkäisyyttä saman huoneen varauksien kanssa
   * Funktio varauksien listaukselle huoneen perusteella.
   * Funktio varauksen poistolle.

6. **Aika- ja overlap-apurit (`utils/time.ts`)**
   * Funktiot, joilla:
     * muunnetaan string → Date (tai vastaava)
     * tarkistetaan päällekkäisyys kahden aikavälin välillä
     * haetaan “nykyhetki” (helpottaa testattavuutta, jos myöhemmin halutaan injektoida).

**Miksi tässä vaiheessa:**
→ Ennen HTTP-kerrosta halutaan business-logiikka valmiiksi, jotta reittien toteutus on ohut ja selkeä.

#### Vaihe 4: Zod-validoinnit ja HTTP-reitit

7. **Zod-skeemat (`validation/reservationSchemas.ts`)**
   * Request-bodylle `POST /rooms/:roomId/reservations`
   * Parametreille (`roomId`, `reservationId`)
   * Mahdollisesti response-objekteille (tai voidaan aloittaa kevyemmin ja lisätä myöhemmin).

8. **Reitit (`routes/reservations.routes.ts`)**
   * `GET /rooms/:roomId/reservations`
   * `POST /rooms/:roomId/reservations`
   * `DELETE /rooms/:roomId/reservations/:reservationId`
   * Jokainen reitti:
     * validoi parametrit ja body Zodilla
     * kutsuu `reservationServicea`
     * mapittaa domain-virheet HTTP-statuksiin (esim. 400, 404, 409).

9. **Reittien rekisteröinti `server.ts`:ssa**
   * Fastifyn plugini tai yksinkertainen `register()`-kutsu reittien kytkemiseksi.

**Miksi vasta nyt:**
→ Kun domain, repo ja palvelu ovat kasassa, HTTP-kerroksen toteutus on suorempi eikä sisältö vuoda reitteihin.

#### Vaihe 5: Virheenkäsittely, siistiminen ja manuaalinen testaus

10. **Virhetyypit ja -vastaukset (`utils/errors.ts` + Fastify error handler)**
    * Yhtenäinen tapa palauttaa business-virheet frontille.
    * Esim. custom error-luokat: `ValidationError`, `OverlapError`, `NotFoundError` jne.

11. **Manuaaliset testit VSCode Rest Clientillä**
    * .http-tiedosto, jossa esimerkkikutsut kaikkiin endpointteihin README:n mukaan. 

12. **Mahdolliset unit-testit (myöhempi vaihe)**
    * Jos halutaan, esim. reservationService-painotteiset testit (`test/`).
    * Tämän voi jättää myöhempään sprinttiin, koska README mainitsee nimenomaan VSCode Rest Clientin.

#### Tarkoituksella myöhempiin vaiheisiin jätettävää
* **Automaattinen testikattavuus (Jest/Vitest)** – voidaan lisätä, mutta ei pakko heti.
* **Konfiguroitava huonelista (esim. env-muuttujista)** – README:n mukaan huoneet voivat olla kovakoodattuja, joten konfigurointi voidaan tehdä myöhemmin. 
* **Tarkempi lokitus, request-id:t jne.** – nice-to-have.
* **Mahdollinen CORS/ratelimit-konffi** – kun frontend alkaa kutsua API:a “oikeasti”.

#### **Oletukset, joita jouduin tekemään README:n + package.json pohjalta**

5. **API juuripolku**
   * Oletan, että endpointit ovat suoraan `/rooms/...` eivätkä esimerkiksi `/api/rooms/...`, koska README käyttää suoria polkuja. 

6. **ID-formaatti**
   * Reservation `id`:n formaatti ei ole määritelty → oletan, että se voi olla mikä tahansa uniikki string (esim. UUID v4 tai lyhyt random-id).

7. **Aikavyöhykelogikka**
   * Oletan, että backend käsittelee kaikki ISO-aikaleimat sellaisenaan (esim. `Z` = UTC) ja vertaa “menneisyyteen” backendin nykyajan perusteella (todennäköisesti UTC). Frontend vastaa lokaalin ajan näyttämisestä. 

8. **Aukioloajat (office hours)**
   * README mainitsee esimerkin 08:00–17:00 sloteista UI:ssa. Oletan, että **backend ei pakota office hours -rajoja**, vaan hyväksyy minkä tahansa validin ajan (frontend rajoittaa), ellei toisin päätetä. 

9. **Error-response formaatti**
   * README ei määrittele tarkkaa virhevastausten JSON-rakennetta → oletan, että voimme määritellä yksinkertaisen vakioformaatin, esim. `{ "message": "...", "code": "..." }`.

10. **Node/TS runtime-tyyli**
    * package.json ei määrittele `"type": "module"`, joten oletan, että buildattu JS on CommonJS, mutta TypeScript-maailmassa käytämme moderneja import-syntakseja. 

11. **Host-kenttä varauksen luonnissa**
    * README:n POST-esimerkissä bodyssä on `start`, `durationMinutes`, `title`, mutta ei `host`-kenttää. Oletan, että `host` voi olla:
      * joko optional kenttä varauksen luonnissa
      * tai lisätään myöhemmin UI:hin ja API-esimerkki README:ssä yksinkertaisuuden vuoksi ei näytä sitä. 

12. **Sorttaus**
    * Oletan, että `GET /rooms/:roomId/reservations` palauttaa varaukset nousevassa `start`-järjestyksessä, vaikka tätä ei ole eksplisiittisesti vaadittu.


Jos jokin näistä oletuksista ei vastaa sun ajatusta, voidaan säätää suunnitelmaa ennen varsinaista koodausta. Seuraavassa vaiheessa voin esim. luonnostella tarkemman rakenteen `reservationService`:lle ja validointisäännöille ennen varsinaista implementointia.

---

### Kehote
Tässä selvennykset tekemiisi oletuksiin, joissa oli virheitä:
- Aukioloajat: Tee mielestäsi parempi valinta siitä, pakottaako backend office hours -rajat vai rajoittaako frontend ajan valitsemisen 8-17 ulkopuolelta.
- Host -kentän puuttuminen README:n POST -esimerkistä oli minun kirjoitusvirhe. Eli host on myös pakollinen kenttä, jonka käyttäjä täyttää lomakkeeseen.

Jatketaan seuraavaan vaiheeseen 1, jossa konfiguroidaan projekti valmiiksi, jotta saadaan kehitysympäristö pystyyn. Keksitytään alkuun backend puolen rakentamiseen. Tee vaiheessa 1 ehdottamasi asiat.

Tässä on 'api/' kansion tämänhetkinen tsconfig.json: 
```json
{
  // Visit https://aka.ms/tsconfig to read more about this file
  "compilerOptions": {
    // File Layout
    // "rootDir": "./src",
    // "outDir": "./dist",

    // Environment Settings
    // See also https://aka.ms/tsconfig/module
    "module": "nodenext",
    "target": "esnext",
    "types": [],
    // For nodejs:
    // "lib": ["esnext"],
    // "types": ["node"],
    // and npm install -D @types/node

    // Other Outputs
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,

    // Stricter Typechecking Options
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // Style Options
    // "noImplicitReturns": true,
    // "noImplicitOverride": true,
    // "noUnusedLocals": true,
    // "noUnusedParameters": true,
    // "noFallthroughCasesInSwitch": true,
    // "noPropertyAccessFromIndexSignature": true,

    // Recommended Options
    "strict": true,
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true,
  }
}
```

### Vastaus
Aloitan ihan ekaksi noista kahdesta korjauksesta, sitten teen vaiheen 1 jutut (tsconfig + package.json + server.ts).

#### 0. Päätös aukioloajoista (8–17)

Valitsen, että **backend EI pakota office hours -rajaa**, vaan:

* Backend validoi “kovat” säännöt:
  * menneisyyskielto
  * start < end
  * ei päällekkäisiä varauksia
* Frontend rajoittaa ajanvalintaa 8–17:een (UI/UX-sääntö, helpompi muuttaa myöhemmin).

**Perustelu:**
Office hours tuntuu enemmän käyttöliittymä- ja prosessisäännöltä kuin “kovalta” business-säännöltä. Jos yritys myöhemmin haluaakin varata huoneen esim. klo 7:30 tai 18:15, ei tarvitse muuttaa backendia – riittää että laajennetaan UI:n rajoja. Jos tästä myöhemmin halutaan “hard rule”, voidaan lisätä se erillisenä business-sääntönä palvelukerrokseen.

**Host:**
Host on jatkossa **pakollinen kenttä** varauksen luonnissa – huomioidaan myöhemmin Zod-skeemassa ja domain-tyypeissä.

#### 1. tsconfig.json – päivitysehdotus
Tavoite:
* Selkeä build-step: `src` → `dist`
* Yksinkertainen dev-käynnistys `ts-node`lla
* CommonJS backendiä varten (helpottaa ts-node-käyttöä ja Fastifyn importteja)

Ehdotan, että päivitetään `api/tsconfig.json` tähän suuntaan:

```json
{
  "compilerOptions": {
    // File Layout
    "rootDir": "./src",
    "outDir": "./dist",

    // Environment Settings
    "module": "commonjs",
    "target": "es2020",
    "lib": ["es2020"],
    "types": ["node"],

    // Helpottaa CommonJS-kirjastojen (Fastify) importointia default-importilla
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,

    // Other Outputs
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,

    // Stricter Typechecking Options
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // Recommended Options
    "strict": true,
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  }
}
```

> Huom: Pidin suurimman osan sun olemassa olevista asetuksista, lisäsin vain:
>
> * `rootDir`, `outDir`
> * `lib`, `types`
> * `module: "commonjs"`, `target: "es2020"`
> * `esModuleInterop` & `allowSyntheticDefaultImports`

Jos haluat pitää NodeNext-ESM-lähestymisen, voidaan myöhemmin säätää scriptit sen mukaan, mutta tämä on dev-mielessä yksinkertaisin.

#### 2. package.json – skriptit ja entry point
Nykyinen `api/package.json` on hyvin minimaalinen. Ehdotan, että päivitetään se täydeksi näin:

```json
{
  "name": "api",
  "version": "1.0.0",
  "description": "Conference Room Booking App backend",
  "main": "dist/server.js",
  "scripts": {
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "fastify": "^5.7.1",
    "zod": "^4.3.5"
  },
  "devDependencies": {
    "@types/node": "^25.0.9",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  }
}
```

**Käyttö jatkossa:**
* Kehitys:
  * `npm run dev` → käynnistää Fastify-serverin `ts-node`lla suoraan TypeScriptistä.
* Build:
  * `npm run build` → kääntää `src` → `dist`.
* Production-tyyppinen ajo:
  * `npm start` → ajaa buildatun `dist/server.js`:n.

#### 3. `src/server.ts` – perusentry Fastifylle
Lisätään `api/src/server.ts` (ja samalla luodaan `src/`-kansio, jos sitä ei ole):

```ts
import fastify from "fastify";

const app = fastify({
  logger: true,
});

app.get("/health", async () => {
  return { status: "ok" };
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```

**Mitä tällä saavutetaan:**
* Yksi selkeä sisäänkäyntipiste (`src/server.ts`).
* Fastifyllä on logger päällä → helpompi debugata jatkossa.
* Yksinkertainen health-check endpoint (`GET /health`), jolla voidaan testata:
  * että projekti buildaa
  * että serveri käynnistyy
  * että routing toimii edes minimillä

#### 4. Seuraava konkreettinen askel

Kun nämä kolme asiaa on tehty (tsconfig, package.json, server.ts), voit:
1. Aja juuresta `cd api`.
2. Asentaa riippuvuudet: `npm install`.
3. Ajaa dev-serverin: `npm run dev`.
4. Testata selaimella tai curlilla: `GET http://localhost:3000/health` → pitäisi palauttaa `{"status":"ok"}`.

Kun tämä on kunnossa, seuraavassa vaiheessa voidaan siirtyä:
* domain-malleihin (`Room`, `Reservation`, in-memory repo)
* sekä business-logiikkaan (päällekkäisyystarkistukset jne.).

Jos haluat, seuraava steppi voi olla, että luonnostelen `domain/` + `repositories/` rakenteen ja tyyppidefinitiot ennen varsinaista business-logiikkaa.

---

### Kehote
Olit oikeassa, että buildattu JS on CommonJS. Haluan korjata "ECMAScript imports and exports cannot be written in a CommonJS file under 'verbatimModuleSyntax'. Adjust the 'type' field in the nearest 'package.json' to make this file an ECMAScript module, or adjust your 'verbatimModuleSyntax', 'module', and 'moduleResolution' settings in TypeScript.ts(1295)" errorin niin, että kaikki tiedostot ovat ESM tiedostoja. Korjaa vastauksesi tsconfig.json ja package.json muutoksista.

### Vastaus
Hyvä täsmennys – vaihdetaan koko backend selkeästi ESM-maailmaan.

Alla korjatut **tsconfig.json** ja **api/package.json** -ehdotukset niin, että:

* kaikki tiedostot ovat ESM:ää
* `verbatimModuleSyntax` saa olla päällä
* TypeScript käyttää NodeNext-resoluutiota
* ajaminen onnistuu sekä devissä (ts-node/esm) että buildattuna

#### 1. tsconfig.json (ESM + NodeNext)
Päivitetty ehdotus `api/tsconfig.json`ille:

```jsonc
{
  "compilerOptions": {
    // File Layout
    "rootDir": "./src",
    "outDir": "./dist",

    // Environment Settings (ESM + NodeNext)
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2020",
    "lib": ["ES2020"],
    "types": ["node"],

    // ESM-yhteensopivat importit sellaisenaan ulos
    "verbatimModuleSyntax": true,
    "isolatedModules": true,

    // Muut asetukset
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,

    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    "strict": true,
    "jsx": "react-jsx",
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  }
}
```

**Mitä tämä ratkaisee?**
* `module: "NodeNext"` + `moduleResolution: "NodeNext"` + `type: "module"` (alla package.jsonissa) kertovat TS:lle ja Nodelle, että kyseessä on ESM-projekti.
* `verbatimModuleSyntax: true` tarkoittaa, että TS ei yritä muuntaa `import`/`export` -syntaksia CommonJS:ksi → ei enää sitä virheilmoitusta “ECMAScript imports and exports cannot be written in a CommonJS file…”.

#### 2. api/package.json (ESM-tyyppi + skriptit)
Päivitetty `api/package.json`:

```json
{
  "name": "api",
  "version": "1.0.0",
  "description": "Conference Room Booking App backend",
  "type": "module",
  "main": "dist/server.js",
  "scripts": {
    "dev": "node --loader ts-node/esm src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "fastify": "^5.7.1",
    "zod": "^4.3.5"
  },
  "devDependencies": {
    "@types/node": "^25.0.9",
    "ts-node": "^10.9.2",
    "typescript": "^5.9.3"
  }
}
```

**Tärkeät kohdat:**
* `"type": "module"` → Node tulkitsee kaikki `.js`/`.ts`-tiedostot ESM:nä.
* `dev`-skripti:
  * `"dev": "node --loader ts-node/esm src/server.ts"`
  * Tämä käyttää ts-nodea ESM-loaderina, jolloin voit ajaa TS:ää suoraan ilman buildia.
* `build` + `start`:
  * `build` kääntää TS:n ESM-JS:ksi `dist/`-kansioon.
  * `start` ajaa buildatun ESM-serverin Nodella.

#### Pieni huomio jatkoon
Kun alat luomaan lisää tiedostoja ja teet **suhteellisia importteja**, ESM + `NodeNext` -maailmassa:

* TS sallii importit **ilman** `.js`-päätettä TS-lähteissä, esim.:

  ```ts
  import fastify from "fastify";
  import { something } from "./domain/reservation";
  ```

* Buildatussa koodissa NodeNext hoitaa resoluution oikein (TS generoi tarvittaessa `.js`-päätteen).

Mutta tässä vaiheessa riittää, että:
1. Päivität tsconfigin ja package.jsonin yllä olevien mukaan.
2. Asennat riippuvuudet `cd api && npm install`.
3. Testaat: `npm run dev` → `GET http://localhost:3000/health` (kun server.ts on olemassa).

Jos haluat, voin seuraavaksi tarkistaa, että nykyinen `server.ts` on ESM-yhteensopiva (import-syntaksi jne.) ja ehdottaa tarvittaessa pieniä korjauksia.

---

### Kehote
Nykyinen server.ts:

```ts
import fastify from "fastify";

const app = fastify({
  logger: true,
});

app.get("/health", async () => {
  return { status: "ok" };
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```
Tee tarvittavat korjaukset, jos niitä on.

### Vastaus
Tuo `server.ts` toimii ESM-maailmassa jo käytännössä sellaisenaan, eli mitään pakollista syntaksikorjausta ei tarvita.

Tekisin kuitenkin pienen tyylikorjauksen Fastifyn ESM-esimerkkien mukaiseksi, jotta koodi on helpommin luettavissa (ja erottaa “tehtaan” funktiosta instanssin):

```ts
import Fastify from "fastify";

const app = Fastify({
  logger: true,
});

app.get("/health", async () => {
  return { status: "ok" };
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```

Yhteenveto:
* ESM-yhteensopivuuden kannalta mitään pakollista ei tarvinnut muuttaa.
* Vaihdoin importin nimen `fastify` → `Fastify`, jotta se noudattaa Fastifyn ESM-esimerkkejä ja tekee koodista vähän selkeämmän.

---

### Kehote
Ensimmäinen vaihe on nyt suoritettu valmiiksi: http://localhost:3000/health -> {"status":"ok"}. 

Siirrytään seuraavaan ehdottamaasi vaiheeseen 2., jossa luodaan Room & Reservation -mallit ja yksinkertainen in-memory storage.

### Vastaus
Nice, health-check elossa ✅ Siirrytään domainiin.

Teen nyt vaiheen 2 valmiiksi:
* Room & Reservation -mallit
* in-memory reservation storage (repo + toteutus)

Kaikki koodi on ESM-ystävällistä (NodeNext + `type: "module"`), eli käytän `.js`-päätteitä import-polkuissa.

#### 1. `src/domain/room.ts`
**Tarkoitus:**
Kovakoodatut huoneet ja niihin liittyvät tyypit + apurifunktio.

```ts
// src/domain/room.ts
export type RoomId = "room-a" | "room-b" | "room-c";

export interface Room {
  id: RoomId;
  name: string;
}

export const ROOMS: Room[] = [
  { id: "room-a", name: "Room A" },
  { id: "room-b", name: "Room B" },
  { id: "room-c", name: "Room C" },
];

export const isValidRoomId = (roomId: string): roomId is RoomId => {
  return ROOMS.some((room) => room.id === roomId);
};

export const getRoomById = (roomId: RoomId): Room | undefined => {
  return ROOMS.find((room) => room.id === roomId);
};
```

**Miksi näin:**
* `RoomId` on string-unioni, jolloin huoneiden tunnukset ovat hyvin tyypitettyjä.
* `ROOMS` pitää oikeat nimet ja id:t yhdessä paikassa.
* `isValidRoomId` on kätevä sekä palvelukerroksessa että reiteissä.

#### 2. `src/domain/reservation.ts`

**Tarkoitus:**
Domain-tyypit varaukselle ja sallitut kestot.

```ts
// src/domain/reservation.ts
import type { RoomId } from "./room.js";

export type ReservationId = string;

// Sallitut kestot minuutteina
export type DurationMinutes = 30 | 60 | 120 | 180;

export interface Reservation {
  id: ReservationId;
  roomId: RoomId;
  durationMinutes: DurationMinutes;
  start: string; // ISO 8601 datetime
  end: string;   // ISO 8601 datetime
  title: string;
  host: string;
}

export type NewReservation = Omit<Reservation, "id">;

export const ALLOWED_DURATIONS: DurationMinutes[] = [30, 60, 120, 180];

export const isAllowedDuration = (
  duration: number,
): duration is DurationMinutes => {
  return ALLOWED_DURATIONS.includes(duration as DurationMinutes);
};
```

**Huomioita:**
* `start` ja `end` pidetään stringeinä (ISO 8601) domain-tasolla, koska API toimii niillä. Varsinainen Date-käsittely tehdään myöhemmin util-/service-kerroksessa.
* `NewReservation` helpottaa sitä, että repo generoi id:n itse.
* `isAllowedDuration` on kätevä check baundary-vaiheessa (service/validation).

#### 3. `src/repositories/reservationRepository.ts`
**Tarkoitus:**
Abstraktio varausdatalle – in-memory-toteutus on vain yksi versio. Myöhemmin voit vaihtaa vaikka tietokantaan ilman, että service-kerros muuttuu radikaalisti.

```ts
// src/repositories/reservationRepository.ts
import type {
  Reservation,
  NewReservation,
  ReservationId,
} from "../domain/reservation.js";
import type { RoomId } from "../domain/room.js";

export interface ReservationRepository {
  listByRoom(roomId: RoomId): Promise<Reservation[]>;
  findById(id: ReservationId): Promise<Reservation | null>;
  create(data: NewReservation): Promise<Reservation>;
  delete(id: ReservationId): Promise<boolean>;
  listAll(): Promise<Reservation[]>;
}
```

**Miksi näin:**
* `listByRoom` vastaa suoraan `GET /rooms/:roomId/reservations` -tarpeeseen.
* `create` ottaa sisään `NewReservation` (ilman id:tä) → id:n generointi on repossa.
* `delete` palauttaa `true/false`, mikä helpottaa 404 vs 204 -päätöstä reitissä.
* `listAll` ei ole pakollinen endpointille, mutta on hyödyllinen debug/testi-käytössä.


#### 4. `src/repositories/inMemoryReservationRepository.ts`

**Tarkoitus:**
Yksinkertainen in-memory toteutus – yksi prosessi, ei pysyvyyttä, id:t generoidaan `crypto.randomUUID`:lla.

```ts
// src/repositories/inMemoryReservationRepository.ts
import { randomUUID } from "node:crypto";
import type {
  ReservationRepository,
} from "./reservationRepository.js";
import type {
  Reservation,
  NewReservation,
  ReservationId,
} from "../domain/reservation.js";
import type { RoomId } from "../domain/room.js";

export class InMemoryReservationRepository
  implements ReservationRepository
{
  private reservations: Reservation[] = [];

  async listByRoom(roomId: RoomId): Promise<Reservation[]> {
    return this.reservations
      .filter((reservation) => reservation.roomId === roomId)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  async listAll(): Promise<Reservation[]> {
    return [...this.reservations].sort((a, b) =>
      a.start.localeCompare(b.start),
    );
  }

  async findById(id: ReservationId): Promise<Reservation | null> {
    const reservation = this.reservations.find(
      (r) => r.id === id,
    );
    return reservation ?? null;
  }

  async create(data: NewReservation): Promise<Reservation> {
    const reservation: Reservation = {
      id: randomUUID(),
      ...data,
    };

    this.reservations.push(reservation);
    return reservation;
  }

  async delete(id: ReservationId): Promise<boolean> {
    const index = this.reservations.findIndex(
      (r) => r.id === id,
    );

    if (index === -1) {
      return false;
    }

    this.reservations.splice(index, 1);
    return true;
  }
}

// Yksinkertainen singleton-instanssi, jonka voi ottaa käyttöön serviceissä
export const inMemoryReservationRepository =
  new InMemoryReservationRepository();
```

**Huomioita:**
* Käytän `node:crypto`/`randomUUID`, jolloin id:t ovat siistejä ja uniikkeja.
* `listByRoom` ja `listAll` sorttaavat varaukset `start`-kentän mukaan nousevasti – tämä on hyvä oletus vastausten järjestykseen.
* Exporttaan sekä luokan että valmiin instanssin:
  * jos myöhemmin haluat dependency injection -tyyliä, voit luoda instanssin itse serviceissä
  * nykyinen `inMemoryReservationRepository` on helppo ottaa käyttöön nopeasti.

#### Seuraava vaihe?

Kun tämä on ok, luonteva jatko on:
* Vaihe 3: **ReservationService** + aika-apurit (`utils/time.ts`)
  * business-säännöt (päällekkäisyys, menneisyys, start < end)
  * `end`-ajan laskeminen `start` + `durationMinutes`
  * käyttää `ReservationRepository`-rajapintaa ja `inMemoryReservationRepository`a

Sano vain, jos haluat seuraavaksi:
* tarkentaa repo-API:a ennen service-logiikkaa
  tai
* mennä suoraan `reservationService`-tason suunnitteluun + koodiin.

---

### Kehote
Älä tee muutoksia koodiin, mutta kerro millaisia asioita voimme harkita tässä vaiheessa lisättäväksi ennen seuraavaan vaiheeseen siirtymistä.

### Vastaus
Hyvä kysymyskohta pysähtyä hetkeksi 👍 Ei kosketa koodia, vaan katsotaan mitä *voisi* olla fiksua harkita ennen kuin hypätään seuraavaan vaiheeseen (service + time-utils).

Jaan tämän kolmeen lohkoon: domain-mallit, repository & data, ja “ylätason” päätökset.

#### 1. Domain-mallit (Room & Reservation) – mitä voisi vielä miettiä

**1.1. Aikojen mallinnus**
Nyt (suunnitelmana) `start` ja `end` ovat `string` (ISO).

Voidaan harkita:

* Tarvitaanko erillistä “brändäystä” tyyppitasolla, esim.
  * `type IsoDateTimeString = string;`
  * auttaa erottamaan nämä muista stringeistä ja tekee koodista luettavampaa.
* Päätetäänkö jo nyt:
  * *“Kaikki ajat ovat UTC:ssa”*
  * vai *“Käsittelemme niitä vain ‘stringeinä’, emmekä domain-tasolla ota kantaa timezoneen”*
    Tämä vaikuttaa myöhemmin time-utils-toteutukseen.

**1.2. Reservationin vastuukentät**
Host on nyt pakollinen (korjaus tehty ajattelussa). Voidaan miettiä:

* Tarvitaanko tässä vaiheessa muita kenttiä, vaikka ei vielä käytettäisi UI:ssa? Esim.
  * `description` (string)
  * `createdAt`, `updatedAt` (ISO string) – hyödyllisiä tulevaisuutta varten, mutta eivät pakollisia MVP:lle.
* Haluammeko “nyt heti” rajata `title`/`host` pituuksia domain-tasolla (esim. max 100 merkkiä), vai annetaanko sen olla vain API/validation-kerroksen asia?

**1.3. Huoneiden nimeäminen ja RoomId**
Nyt meillä on jotain tyyliin `"room-a" | "room-b" | "room-c"`.

Voidaan miettiä:
* Tarvitaanko “display name” (esim. `Room A`) erikseen domainissa vai annetaanko frontendin päättää nimet ja backend käyttää vain ID:tä?
* Pidetäänkö huoneiden ID:t “ikuisesti stabileina” (ei loogista uudelleennimeämistä), vai varaudutaanko joskus myöhemmin muuttamaan niitä?

#### 2. Repository & in-memory storage – pohdittavia juttuja

**2.1. Missä repo-instanssi elää?**
Nyt ajatus on singleton-instanssi `inMemoryReservationRepository`.

Ennen jatkoa voisi päättää:
* Käytetäänkö projektissa kautta linjan DI-tyylistä ajattelua (parametrina palveluihin) vai
* mennäänkö tällä projektilla “yksi singleton backendiä kohden” -tyyliin.

Molemmat ok, mutta jos haluat jälkikäteen esim. helppoa testausta, DI hieman auttaa.

**2.2. Alkuperäisdata / seed**
Voidaan jo nyt miettiä:
* Haluammeko, että backend käynnistyessään luo 1–2 “demo varausta” (seed-data), jotka näkyvät heti UI:ssa?
  * Helpottaa kehitystä ja manuaalitestausta.
* Vai pidetäänkö storage täysin tyhjänä ja tehdään varaukset Rest Clientillä tai UI:sta käsin?

**2.3. Järjestys & indeksointi**
Nyt suunnitelmana `listByRoom` sorttaa `start`in perusteella.

Lisäkysymyksiä:
* Haluammeko, että repo **aina** palauttaa järjestyksessä (domain-sääntö), vai jätetäänkö sorttaus service- tai route-tasolle?
* Tarvitaanko jotain tehokkaampaa kuin pelkkä `Array.filter + sort`?
  * Todennäköisesti ei tässä MVP:ssä, mutta tämä päätös voi olla eksplisiittinen:
    *“Emme optimoi in-memory-repoa, koska data on pientä.”*

**2.4. Koon ja muistin hallinta**
Ei ehkä tärkeää nyt, mutta voi miettiä:
* Haluammeko maksimi-varausmäärän (esim. 1000) ja sen jälkeen “vanhimpien pudotuksen”?
  * Todennäköisesti overkill tässä, mutta tietoista on hyvä olla.

#### 3. Ylätason päätökset ennen service-vaihetta

**3.1. Kuka vastaa business-säännöistä?**
Hyvä pysähtyä ja sanoa ääneen:
* **Repository**:
  * ei tarkista päällekkäisyyksiä
  * ei tarkista roomId:tä
  * ei tarkista aikojen validiutta
  * ainoastaan *tallentaa ja palauttaa* sitä mitä annetaan
* **Service** (seuraava vaihe):
  * tekee kaikki business-säännöt:
    * allowed durations
    * ei menneisyyteen
    * start < end
    * ei overlap
    * roomId pitää olla sallittu

Jos tämä kuulostaa sulle hyvältä, voidaan service-vaiheessa kirjoittaa logiikka puhtaasti tämän oletuksen varaan.

**3.2. Virheiden malli (domain vs HTTP)**
Ennen seuraavaa vaihetta voi olla hyödyllistä päättää:
* Tehdäänkö **domain/virheluokat** (esim. `ReservationOverlapError`, `InvalidDurationError`) vai:
  * Palautetaanko service-tasolla domain-tyylinen `Result`-tyyppi (`{ ok: true, value } | { ok: false, error }`)?
* Route-kerros joka tapauksessa mapittaa nämä HTTP-statuksiin, mutta on hyvä päättää
  * “heitetäänkö virheitä” vai “palautetaanko result-objekteja”.
Tämä vaikuttaa suoraan siihen, miltä `reservationService`-API näyttää.

**3.3. Aikavyöhyke- ja “now”-päätös**
Ennen time-utils-vaihetta olisi hyvä olla yhteinen ymmärrys:
* Miten määritellään “menneisyys”?
  * Käytetäänkö `new Date()` suoraan (backendin oma timezone/UTC) vai halutaanko erillinen `now()`-funktio, joka voidaan tarvittaessa mockata testeissä?
* Pidetäänkö kaikki sisäinen logiikka oletuksena UTC:ssä?
  * Frontend voi kuitenkin näyttää lokaalia aikaa.

**3.4. Testausstrategia tämän kerroksen osalta**
Ennen siirtymistä serviceen voidaan päättää:
* Haluammeko tehdä tälle tasolle kevyet unit-testit (esim. pelkälle repo-toteutukselle) jo nyt?
  * Esim. että `create` luo id:n, `delete` toimii, `listByRoom` toimii jne.
* Vai keskitytäänkö ensin business-sääntöihin ja lisätään testejä isommalle palalle kerralla?

#### 4. “Pieniä, mutta hyödyllisiä” harkintoja
Lyhyesti vielä muutama mini-juttu, joita voi pohtia:

* **Logging:**
  * Haluatko, että esim. `create`/`delete`-kutsut logitetaan (myöhemmin) debuggausta varten?
* **Dev-only endpoint:**
  * Haluatko myöhemmin jonkin `GET /debug/reservations` -tyyppisen reitin, joka palauttaa `listAll()` (vain dev-käyttöön)? Tämä voi vaikuttaa siihen, haluatko `listAll`-metodin repo-interfaceen nyt vai myöhemmin.
* **Future changes:**
  * Mietitäänkö jo nyt, että varaukset voivat tulevaisuudessa muuttua (PUT/PATCH), vai pysyykö scope “luo & poista” -tasolla?
  * Tämä voi vaikuttaa domain-tyyppien laajentamisen helppouteen.

Jos haluat, voin seuraavaksi luonnostella *ensin* `reservationService`-API:n (pelkkä TypeScript-tyyppi/rajapinta + kuvaus, ei vielä implementation-koodia), jotta nähdään miltä hyvä palvelukerros näyttäisi näiden päätösten pohjalta.

---

### Kehote
1.1. Voimme päättää/olettaa, että timezone on aina UTC:ssä, eikä käyttäjän sijainnilla ole vaikutusta. Emme tarvitse erillistä “brändäystä” tyyppitasolla.
1.2. Emme tarvitse muita kenttiä. Tehdään merkki rajaus myöhemmin API/validation -kerroksessa.
1.3. Huoneiden nimeäminen domainissa on ok. Pidetään se sellaisena kuin se on.

2.1. Valitsen kevyen DI-tyylisen ajattelun.
2.2. Ei luoda taustadataa eli pidetään tausta tyhjänä. 
2.3. Array.filter + sort on tarpeeksi tämän koon projektille.
2.4. Ei tarvett huolehtia maksimi-varausmääristä.

3.1. Kyllä, tämä on oikein.
3.2. Palautetaan service-tasolla domain-tyylinen Result-tyyppi
3.3. Projektissa oletetaan, että käyttäjä toimii aina Suomen ajassa (Europe/Helsinki). API:ssa ajat välitetään ISO8601-muodossa, ja backend tulkitsee ne Europe/Helsinki-ajasta käsin. Sisäisesti kaikki ajankohdat käsitellään kuitenkin Date-olioina, eli UTC-hetkinä, jolloin vertailut ovat yksiselitteisiä. Menneisyys määritellään vertaamalla varauksen aloitusaikaa nykyhetkeen(startsAt < now())
3.4. Testataan ennen seuraavaa vaihetta, että tähän astinen toteutus toimii.

4.1 Logituksia on hyvä olla. Lisätään reitti, jolla saadaan kaikki varaukset huoneesta riippumatta. Projekti tulee kuitenkin pysymään vain luo ja poista -tasolla. 

Tee nyt tarvittavat muutokset aikaisemmin luotuihin tiedostoihin. Ja kerro myös miten voimme testata projektia tässä vaiheessa ennen kuin siirrymme seuraavaan vaiheeseen.

### Vastaus
Hyvä, päätökset on nyt selkeitä – tehdään niihin sopivat muutokset ja sitten mietitään, miten tätä voi kevyesti “smoke-testata” ennen seuraavaa vaihetta.

Alla on **päivitetyt versiot samoista tiedostoista** (vain muutokset, ei uutta logiikkaa) sekä testausohjeet.

#### 1. `src/domain/room.ts`
Tähän ei tarvitse tehdä muutoksia, mutta laitan sen tähän kokonaisena referenssiksi:

```ts
// src/domain/room.ts
export type RoomId = "room-a" | "room-b" | "room-c";

export interface Room {
  id: RoomId;
  name: string;
}

export const ROOMS: Room[] = [
  { id: "room-a", name: "Room A" },
  { id: "room-b", name: "Room B" },
  { id: "room-c", name: "Room C" },
];

export const isValidRoomId = (roomId: string): roomId is RoomId => {
  return ROOMS.some((room) => room.id === roomId);
};

export const getRoomById = (roomId: RoomId): Room | undefined => {
  return ROOMS.find((room) => room.id === roomId);
};
```

#### 2. `src/domain/reservation.ts` – `start`/`end` → `Date`

Päivitetään reservation-domain vastaamaan päätöstä:
> API:ssa stringit, sisäisesti Date-oliot (UTC-hetket, johon Europe/Helsinki-mapataan myöhemmin service/utils -tasolla).

```ts
// src/domain/reservation.ts
import type { RoomId } from "./room.js";

export type ReservationId = string;

// Sallitut kestot minuutteina
export type DurationMinutes = 30 | 60 | 120 | 180;

export interface Reservation {
  id: ReservationId;
  roomId: RoomId;
  durationMinutes: DurationMinutes;

  // Sisäisesti käsitellään Date-olioina (UTC-hetkinä)
  start: Date;
  end: Date;

  title: string;
  host: string;
}

export type NewReservation = Omit<Reservation, "id">;

export const ALLOWED_DURATIONS: DurationMinutes[] = [30, 60, 120, 180];

export const isAllowedDuration = (
  duration: number,
): duration is DurationMinutes => {
  return ALLOWED_DURATIONS.includes(duration as DurationMinutes);
};
```

*API-kerros* myöhemmin:
* ottaa vastaan ISO8601-stringit (Europe/Helsinki),
* muuntaa ne `Date`-olioiksi,
* välittää nämä `ReservationService`:lle ja repoille.

#### 3. `src/repositories/reservationRepository.ts`
Tämä pysyy käytännössä samana – vain kommentoin hieman DI:n näkökulmasta (interface on kunnossa):

```ts
// src/repositories/reservationRepository.ts
import type {
  Reservation,
  NewReservation,
  ReservationId,
} from "../domain/reservation.js";
import type { RoomId } from "../domain/room.js";

export interface ReservationRepository {
  listByRoom(roomId: RoomId): Promise<Reservation[]>;
  listAll(): Promise<Reservation[]>;

  findById(id: ReservationId): Promise<Reservation | null>;
  create(data: NewReservation): Promise<Reservation>;
  delete(id: ReservationId): Promise<boolean>;
}
```

Tämä interface on se, mitä `ReservationService` tulee jatkossa käyttämään injektoituna.

#### 4. `src/repositories/inMemoryReservationRepository.ts` – Date-sorttaus + ei singletonia
Tässä tehdään kaksi konkreettista muutosta:
1. Sorttaus `Date`-olioiden perusteella (`getTime()`).
2. Poistetaan singleton-instanssi → käytetään kevyttä DI:tä (palvelu tai serveri luo instanssin).

```ts
// src/repositories/inMemoryReservationRepository.ts
import { randomUUID } from "node:crypto";
import type { ReservationRepository } from "./reservationRepository.js";
import type {
  Reservation,
  NewReservation,
  ReservationId,
} from "../domain/reservation.js";
import type { RoomId } from "../domain/room.js";

export class InMemoryReservationRepository
  implements ReservationRepository
{
  private reservations: Reservation[] = [];

  async listByRoom(roomId: RoomId): Promise<Reservation[]> {
    return this.reservations
      .filter((reservation) => reservation.roomId === roomId)
      .sort(
        (a, b) =>
          a.start.getTime() - b.start.getTime(),
      );
  }

  async listAll(): Promise<Reservation[]> {
    return [...this.reservations].sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime(),
    );
  }

  async findById(id: ReservationId): Promise<Reservation | null> {
    const reservation = this.reservations.find(
      (r) => r.id === id,
    );
    return reservation ?? null;
  }

  async create(data: NewReservation): Promise<Reservation> {
    const reservation: Reservation = {
      id: randomUUID(),
      ...data,
    };

    this.reservations.push(reservation);
    return reservation;
  }

  async delete(id: ReservationId): Promise<boolean> {
    const index = this.reservations.findIndex(
      (r) => r.id === id,
    );

    if (index === -1) {
      return false;
    }

    this.reservations.splice(index, 1);
    return true;
  }
}
```

> Huom:
>
> * Ei enää `export const inMemoryReservationRepository = ...` → instanssi luodaan myöhemmin service-/server-tasolla ja injektoidaan.
> * `listAll` pysyy mukana, jotta voidaan myöhemmin tehdä debug-/admin-reitti, joka palauttaa kaikki varaukset.

#### 5. Miten testataan tässä vaiheessa?
Tässä vaiheessa domain + repo eivät ole vielä kytkettynä HTTP-API:iin, joten testaus on:
1. **Käännös** (perus sanity check)
2. **Pieni “smoke test” repolle** (valinnainen mutta hyödyllinen)

##### 5.1. TypeScript-build
Projektin juuresta (tai `cd api` jos et ole siellä):

```bash
cd api
npm run build
```

Jos tämä menee läpi ilman virheitä, TS-tyypit ja importit ovat kunnossa.

##### 5.2. Kevyt repository-smoke-test (valinnainen mutta suositeltava)

Jos haluat varmistaa, että in-memory-repo **käyttäytyy järkevästi**, voit:
1. Luoda *tilapäisen* testitiedoston, esim.
   `api/src/repoSmokeTest.ts`
2. Laittaa sinne vaikka tämän:

```ts
// src/repoSmokeTest.ts
import { InMemoryReservationRepository } from "./repositories/inMemoryReservationRepository.js";
import type { RoomId } from "./domain/room.js";

const run = async () => {
  const repo = new InMemoryReservationRepository();
  const roomId: RoomId = "room-a";

  const now = new Date();
  const start = now;
  const end = new Date(now.getTime() + 30 * 60 * 1000); // +30min

  const created = await repo.create({
    roomId,
    durationMinutes: 30,
    start,
    end,
    title: "Test meeting",
    host: "Tester",
  });

  console.log("Created:", created);
  console.log("List by room:", await repo.listByRoom(roomId));
  console.log("List all:", await repo.listAll());

  const deleted = await repo.delete(created.id);
  console.log("Deleted:", deleted);
  console.log("List all after delete:", await repo.listAll());
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

3. Aja se:
```bash
cd api
node --loader ts-node/esm src/repoSmokeTest.ts
```

**Mitä tällä varmistetaan:**
* `InMemoryReservationRepository` voidaan luoda ilman ongelmia.
* `create` generoi id:n ja tallentaa varauksen.
* `listByRoom` ja `listAll` palauttavat järkevän listan ja sorttaus Datejen perusteella toimii.
* `delete` poistaa varauksen ja palauttaa `true`, ja myöhemmin lista on tyhjä.

Tämän jälkeen voit halutessasi poistaa `repoSmokeTest.ts`-tiedoston tai jättää sen dev-smoke-testiksi, mutta se ei ole osa varsinaista API:a.

Kun nämä ovat kunnossa, meillä on:
* **Domain-mallit** (Room, Reservation) linjassa päätösten kanssa,
* **In-memory repo**, joka tukee tulevaa palvelukerrosta ja debug-reittiä,
* Perustason testi, jolla nähdään, että pohja toimii.

Seuraava luonnollinen askel on sitten **ReservationService + time-utils**, jossa:
* tehdään Europe/Helsinki → Date (UTC) -logiikka,
* lisätään business-säännöt,
* ja muotoillaan Result-tyyppinen API service-tasolle.

---

### Kehote
- 'npm run build' meni läpi onnistuneesti.
- repoSmokeTest:n ajo oli onnistunut.

Siirry seuraavaan vaiheeseen.

### Vastaus
Tehdään nyt vaihe 3: **Result-tyyppi**, **time-utils** ja **ReservationService** business-säännöillä. En koske olemassa oleviin tiedostoihin, vaan lisään uudet.

#### 1. Result-tyyppi (domain-tyylinen virheenkäsittely)
Lisätään pieni utili generistä Resultiä varten:
**`src/utils/result.ts`**
```ts
// src/utils/result.ts

export type Ok<T> = {
  ok: true;
  value: T;
};

export type Err<E> = {
  ok: false;
  error: E;
};

export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });
```

Tätä käytetään service-tasolla:
* `ok(value)` onnistuneeseen palautukseen
* `err(error)` domain-virheisiin

#### 2. Time-utils: perusoperaatiot Date-olioille
Sisäinen logiikka käyttää `Date`-olioita (UTC-hetkiä). Tänne laitetaan **lisäys minuutteina**, **menneisyys-check** ja **päällekkäisyystarkistus**.
**`src/utils/time.ts`**

```ts
// src/utils/time.ts

/**
 * Lisää annettuun aikaan minuutteja ja palauttaa uuden Date-olion.
 */
export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60_000);
};

/**
 * Palauttaa nykyhetken Date-oliona.
 * Abstrahoitu omaan funktioon, jotta sen voi myöhemmin tarvittaessa mockata testeissä.
 */
export const now = (): Date => {
  return new Date();
};

/**
 * Tarkistaa onko `a` ennen `b`.
 */
export const isBefore = (a: Date, b: Date): boolean => {
  return a.getTime() < b.getTime();
};

/**
 * Tarkistaa onko annettu aika menneisyydessä suhteessa `now`-hetkeen.
 */
export const isInPast = (date: Date, reference: Date = now()): boolean => {
  return isBefore(date, reference);
};

/**
 * Tarkistaa, menevätkö kaksi aikaväliä päällekkäin.
 *
 * Huom: päätepisteet käsitellään "puoliavoimina" [start, end),
 * eli jos yhden varauksen end == toisen start, niitä EI pidetä päällekkäisinä.
 */
export const intervalsOverlap = (
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean => {
  return aStart < bEnd && aEnd > bStart;
};
```

Tässä ei tehdä vielä mitään timezone-spesiaalia – oletetaan, että kun `Date`-oliot luodaan (myöhemmin reiteissä/validaatiossa), ISO-stringeissä on aikavyöhyketieto mukana ja `Date` edustaa oikeaa UTC-hetkeä. Kaikki vertailut ovat silloin yksiselitteisiä.

#### 3. ReservationService: business-säännöt + Result-tyyppi

##### 3.1. Virhetyypit
Kuvataan ensin domain-virhekoodit ja virheobjekti.
**`src/services/reservationService.ts`**
```ts
// src/services/reservationService.ts

import type { ReservationRepository } from "../repositories/reservationRepository.js";
import type {
  Reservation,
  ReservationId,
} from "../domain/reservation.js";
import {
  isAllowedDuration,
} from "../domain/reservation.js";
import { isValidRoomId, type RoomId } from "../domain/room.js";
import {
  addMinutes,
  intervalsOverlap,
  isInPast,
} from "../utils/time.js";
import type { Result } from "../utils/result.js";
import { ok, err } from "../utils/result.js";

export type ReservationErrorCode =
  | "INVALID_ROOM"
  | "INVALID_DURATION"
  | "START_IN_PAST"
  | "END_BEFORE_START"
  | "OVERLAPPING_RESERVATION"
  | "RESERVATION_NOT_FOUND";

export interface ReservationError {
  code: ReservationErrorCode;
  message: string;
}
```

##### 3.2. Input-tyypit servicelle
Service toimii rajapintana domainin ja muun backendin välillä. Se ottaa sisään **Date**-oliot, ei stringejä – string → Date -muunnos tehdään myöhemmin API/validation-kerroksessa.

```ts
export interface CreateReservationInput {
  roomId: string;          // validoidaan isValidRoomId:llä
  start: Date;             // tulkittu Europe/Helsinki-ajasta Date-olioksi aiemmassa kerroksessa
  durationMinutes: number; // validoidaan isAllowedDuration:llä
  title: string;
  host: string;
}

export interface DeleteReservationInput {
  reservationId: ReservationId;
}

export interface ListReservationsForRoomInput {
  roomId: string;
}
```

Huomio: `roomId` on **string**, koska service on boundary jossa tehdään “hard validation” (ts. se ei luota siihen, että kutsuja aina antaisi oikeaa union-tyyppiä).

##### 3.3. ReservationService-luokka
```ts
export class ReservationService {
  constructor(
    private readonly repository: ReservationRepository,
  ) {}

  /**
   * Listaa kaikki varaukset yhdelle huoneelle.
   */
  async listReservationsForRoom(
    input: ListReservationsForRoomInput,
  ): Promise<Result<Reservation[], ReservationError>> {
    const { roomId } = input;

    if (!isValidRoomId(roomId)) {
      return err({
        code: "INVALID_ROOM",
        message: `Unknown room id: ${roomId}`,
      });
    }

    const typedRoomId: RoomId = roomId;
    const reservations = await this.repository.listByRoom(
      typedRoomId,
    );

    return ok(reservations);
  }

  /**
   * Listaa kaikki varaukset riippumatta huoneesta.
   * Tälle ei ole käytännössä virhetilaa, joten palautetaan suoraan lista.
   */
  async listAllReservations(): Promise<Reservation[]> {
    return this.repository.listAll();
  }

  /**
   * Luo uuden varauksen business-sääntöjä noudattaen.
   */
  async createReservation(
    input: CreateReservationInput,
  ): Promise<Result<Reservation, ReservationError>> {
    const {
      roomId,
      start,
      durationMinutes,
      title,
      host,
    } = input;

    // 1) Tarkista huone
    if (!isValidRoomId(roomId)) {
      return err({
        code: "INVALID_ROOM",
        message: `Unknown room id: ${roomId}`,
      });
    }
    const typedRoomId: RoomId = roomId;

    // 2) Tarkista kesto
    if (!isAllowedDuration(durationMinutes)) {
      return err({
        code: "INVALID_DURATION",
        message: `Invalid durationMinutes: ${durationMinutes}`,
      });
    }

    // 3) Laske end-aika
    const end = addMinutes(start, durationMinutes);

    // 4) Varmista, että start < end
    if (end.getTime() <= start.getTime()) {
      return err({
        code: "END_BEFORE_START",
        message:
          "Reservation end time must be after start time.",
      });
    }

    // 5) Ei menneisyyteen (start < now)
    if (isInPast(start)) {
      return err({
        code: "START_IN_PAST",
        message:
          "Reservation start time cannot be in the past.",
      });
    }

    // 6) Päällekkäisten varausten tarkistus
    const existingReservations =
      await this.repository.listByRoom(typedRoomId);

    const hasOverlap = existingReservations.some((r) =>
      intervalsOverlap(start, end, r.start, r.end),
    );

    if (hasOverlap) {
      return err({
        code: "OVERLAPPING_RESERVATION",
        message:
          "Reservation overlaps with an existing reservation.",
      });
    }

    // 7) Kaikki ok → luodaan varaus
    const created = await this.repository.create({
      roomId: typedRoomId,
      durationMinutes,
      start,
      end,
      title,
      host,
    });

    return ok(created);
  }

  /**
   * Poistaa varauksen id:n perusteella.
   */
  async deleteReservation(
    input: DeleteReservationInput,
  ): Promise<Result<void, ReservationError>> {
    const { reservationId } = input;

    const deleted = await this.repository.delete(
      reservationId,
    );

    if (!deleted) {
      return err({
        code: "RESERVATION_NOT_FOUND",
        message: `Reservation not found: ${reservationId}`,
      });
    }

    return ok(undefined);
  }
}
```

**Mitä tässä toteutuu:**
* **Huonevalidointi**: `isValidRoomId` → `INVALID_ROOM`.
* **Keston validointi**: `isAllowedDuration` → `INVALID_DURATION`.
* **end-laskenta**: `addMinutes(start, durationMinutes)`.
* **start < end** check → `END_BEFORE_START`.
* **Menneisyyskielto**: `isInPast(start)` → `START_IN_PAST`.
* **Päällekkäisyyksien esto**: `intervalsOverlap` nykyisten varausten kanssa → `OVERLAPPING_RESERVATION`.
* **Poisto**: jos repo `delete` palauttaa `false` → `RESERVATION_NOT_FOUND`.

Kaikki business-säännöt, joista puhuttiin, ovat nyt servicen sisällä.

#### 4. Miten testataan tässä vaiheessa?
Taaskaan ei vielä kosketa HTTP-reitteihin. Testataan samaan tapaan kuin repossa – pienellä smoke-testillä.

##### 4.1. Build
Varmistetaan ensin, että TS ja importit ovat kunnossa:

```bash
cd api
npm run build
```

Jos tämä menee läpi, typet ja ESM-importit toimivat.

##### 4.2. ReservationService-smoke test
Voit luoda tilapäisen testitiedoston, esim.:
**`src/serviceSmokeTest.ts`**

```ts
// src/serviceSmokeTest.ts

import { InMemoryReservationRepository } from "./repositories/inMemoryReservationRepository.js";
import { ReservationService } from "./services/reservationService.js";

const run = async () => {
  const repository = new InMemoryReservationRepository();
  const service = new ReservationService(repository);

  const roomId = "room-a";
  const now = new Date();

  // Tulevaisuuden aloitus (esim. +1h)
  const start = new Date(now.getTime() + 60 * 60 * 1000);

  console.log("=== Create first reservation ===");
  const result1 = await service.createReservation({
    roomId,
    start,
    durationMinutes: 60,
    title: "First meeting",
    host: "Tester",
  });
  console.log("result1:", result1);

  console.log("\n=== Try overlapping reservation ===");
  const overlappingStart = new Date(
    start.getTime() + 30 * 60 * 1000,
  ); // 30min päällekkäin
  const result2 = await service.createReservation({
    roomId,
    start: overlappingStart,
    durationMinutes: 60,
    title: "Overlapping meeting",
    host: "Tester 2",
  });
  console.log("result2:", result2);

  console.log("\n=== List reservations for room ===");
  const listResult = await service.listReservationsForRoom({
    roomId,
  });
  console.log("listResult:", listResult);

  console.log("\n=== Delete reservation ===");
  if (result1.ok) {
    const deleteResult = await service.deleteReservation({
      reservationId: result1.value.id,
    });
    console.log("deleteResult:", deleteResult);
  }

  console.log("\n=== List all reservations after delete ===");
  const allAfterDelete =
    await service.listAllReservations();
  console.log("allAfterDelete:", allAfterDelete);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Ajo:
```bash
cd api
node --loader ts-node/esm src/serviceSmokeTest.ts
```

**Mitä pitäisi nähdä:**
* `result1` → `{ ok: true, value: { ...reservation } }`
* `result2` → `{ ok: false, error: { code: "OVERLAPPING_RESERVATION", ... } }`
* `listResult` → `{ ok: true, value: [ { first reservation } ] }`
* `deleteResult` → `{ ok: true, value: undefined }`
* `allAfterDelete` → tyhjä taulukko `[]`

Jos tämä toimii, domain + repo + service + time-utils -paketti on kasassa ja valmis kytkettäväksi HTTP-kerrokseen seuraavassa vaiheessa (reitit + Zod-validointi + virheiden mapitus HTTP-statuksiin + debug “kaikki varaukset” -reitti).

---

### Kehote
Testit menivät läpi. Voit siirtyä seuraavaan vaiheeseen.

### Vastaus
Nice, mennään sitten HTTP-kerrokseen 🚀
Nyt lisätään:
* Zod-validoinnit
* reitit Fastifylle
* DI: server.ts → repo + service
* debug-reitti `/reservations`
* peruslogit create/delete-operaatioille
Kerron lopuksi, miten tätä testataan.

#### 1. ISO-aikojen parsiminen (helper)
Pidetään aikaparsointi yhdessä paikassa.
**`src/utils/dateParsing.ts`**
```ts
// src/utils/dateParsing.ts

/**
 * Parsii ISO8601-merkkijonon Date-olioksi.
 *
 * Oletus:
 * - Frontend lähettää ISO8601-aikoja, joissa on mukana aikavyöhyketieto
 *   (esim. 2026-01-27T10:00:00+02:00 tai 2026-01-27T08:00:00Z).
 * - Käyttäjä toimii Europe/Helsinki-ajassa, mutta ISO-stringi sisältää
 *   offsetin, joten new Date(value) tuottaa oikean UTC-hetken.
 */
export const parseIsoDateTime = (value: string): Date | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};
```

#### 2. Zod-skeemat HTTP-kerrokselle
Validointi bodylle ja parametreille.
**`src/validation/reservationSchemas.ts`**
```ts
// src/validation/reservationSchemas.ts
import { z } from "zod";
import { ALLOWED_DURATIONS } from "../domain/reservation.js";

export const roomIdParamsSchema = z.object({
  roomId: z.string().min(1, "roomId is required"),
});

export const deleteReservationParamsSchema = z.object({
  roomId: z.string().min(1, "roomId is required"),
  reservationId: z.string().min(1, "reservationId is required"),
});

export const createReservationBodySchema = z.object({
  start: z
    .string()
    .min(1, "start is required"), // tarkempi ISO-check tehdään parsimalla
  durationMinutes: z
    .number()
    .int("durationMinutes must be an integer")
    .refine(
      (value) => ALLOWED_DURATIONS.includes(value as any),
      {
        message: `durationMinutes must be one of [${ALLOWED_DURATIONS.join(
          ", ",
        )}]`,
      },
    ),
  title: z.string().min(1, "title is required"),
  host: z.string().min(1, "host is required"),
});

export type RoomIdParams = z.infer<typeof roomIdParamsSchema>;
export type DeleteReservationParams = z.infer<
  typeof deleteReservationParamsSchema
>;
export type CreateReservationBody = z.infer<
  typeof createReservationBodySchema
>;
```

#### 3. Reitit Fastifylle
Tehdään reitit ja virhemapitus yhteen tiedostoon.
**`src/routes/reservations.routes.ts`**
```ts
// src/routes/reservations.routes.ts
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import type { ReservationService } from "../services/reservationService.js";
import type {
  ReservationError,
} from "../services/reservationService.js";
import type { Reservation } from "../domain/reservation.js";
import {
  roomIdParamsSchema,
  deleteReservationParamsSchema,
  createReservationBodySchema,
  type RoomIdParams,
  type DeleteReservationParams,
  type CreateReservationBody,
} from "../validation/reservationSchemas.js";
import { parseIsoDateTime } from "../utils/dateParsing.js";
import type { RoomId } from "../domain/room.js";

/**
 * HTTP DTO varaukselle – Date → ISO string.
 */
interface ReservationDto {
  id: string;
  roomId: RoomId;
  durationMinutes: number;
  start: string;
  end: string;
  title: string;
  host: string;
}

const toReservationDto = (reservation: Reservation): ReservationDto => {
  return {
    id: reservation.id,
    roomId: reservation.roomId,
    durationMinutes: reservation.durationMinutes,
    start: reservation.start.toISOString(),
    end: reservation.end.toISOString(),
    title: reservation.title,
    host: reservation.host,
  };
};

const mapReservationErrorToStatus = (error: ReservationError): number => {
  switch (error.code) {
    case "INVALID_ROOM":
      return 404;
    case "RESERVATION_NOT_FOUND":
      return 404;
    case "OVERLAPPING_RESERVATION":
      return 409;
    case "INVALID_DURATION":
    case "START_IN_PAST":
    case "END_BEFORE_START":
      return 400;
    default:
      return 400;
  }
};

const sendReservationError = (
  reply: FastifyReply,
  error: ReservationError,
) => {
  const status = mapReservationErrorToStatus(error);
  return reply.status(status).send({
    code: error.code,
    message: error.message,
  });
};

export const registerReservationRoutes = (
  app: FastifyInstance,
  service: ReservationService,
) => {
  /**
   * GET /rooms/:roomId/reservations
   * Palauttaa huoneen kaikki varaukset.
   */
  app.get(
    "/rooms/:roomId/reservations",
    async (
      request: FastifyRequest<{ Params: RoomIdParams }>,
      reply: FastifyReply,
    ) => {
      const parseResult = roomIdParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          message: "Invalid params",
          issues: parseResult.error.issues,
        });
      }

      const { roomId } = parseResult.data;

      const result = await service.listReservationsForRoom({
        roomId,
      });

      if (!result.ok) {
        return sendReservationError(reply, result.error);
      }

      const dtos = result.value.map(toReservationDto);
      return reply.status(200).send(dtos);
    },
  );

  /**
   * GET /reservations
   * Palauttaa kaikki varaukset huoneesta riippumatta.
   * (debug / admin -henkinen reitti)
   */
  app.get("/reservations", async (_request, reply) => {
    const reservations = await service.listAllReservations();
    const dtos = reservations.map(toReservationDto);
    return reply.status(200).send(dtos);
  });

  /**
   * POST /rooms/:roomId/reservations
   * Luo uuden varauksen.
   */
  app.post(
    "/rooms/:roomId/reservations",
    async (
      request: FastifyRequest<{
        Params: RoomIdParams;
        Body: CreateReservationBody;
      }>,
      reply: FastifyReply,
    ) => {
      // Params-validointi
      const paramsParse = roomIdParamsSchema.safeParse(
        request.params,
      );
      if (!paramsParse.success) {
        return reply.status(400).send({
          message: "Invalid params",
          issues: paramsParse.error.issues,
        });
      }

      // Body-validointi
      const bodyParse = createReservationBodySchema.safeParse(
        request.body,
      );
      if (!bodyParse.success) {
        return reply.status(400).send({
          message: "Invalid body",
          issues: bodyParse.error.issues,
        });
      }

      const { roomId } = paramsParse.data;
      const { start, durationMinutes, title, host } =
        bodyParse.data;

      const startDate = parseIsoDateTime(start);
      if (!startDate) {
        return reply.status(400).send({
          message: "Invalid start datetime format",
        });
      }

      const result = await service.createReservation({
        roomId,
        start: startDate,
        durationMinutes,
        title,
        host,
      });

      if (!result.ok) {
        return sendReservationError(reply, result.error);
      }

      const dto = toReservationDto(result.value);

      // Peruslogitus
      request.log.info(
        { reservationId: dto.id, roomId: dto.roomId },
        "Reservation created",
      );

      return reply.status(201).send(dto);
    },
  );

  /**
   * DELETE /rooms/:roomId/reservations/:reservationId
   * Poistaa varauksen id:n perusteella.
   *
   * Huom: roomId on mukana URL:ssa REST-tyylisesti, mutta
   * poistologikka perustuu reservationId:hen.
   */
  app.delete(
    "/rooms/:roomId/reservations/:reservationId",
    async (
      request: FastifyRequest<{
        Params: DeleteReservationParams;
      }>,
      reply: FastifyReply,
    ) => {
      const paramsParse =
        deleteReservationParamsSchema.safeParse(request.params);
      if (!paramsParse.success) {
        return reply.status(400).send({
          message: "Invalid params",
          issues: paramsParse.error.issues,
        });
      }

      const { reservationId } = paramsParse.data;

      const result = await service.deleteReservation({
        reservationId,
      });

      if (!result.ok) {
        return sendReservationError(reply, result.error);
      }

      // Logita onnistunut poisto
      request.log.info(
        { reservationId },
        "Reservation deleted",
      );

      return reply.status(204).send();
    },
  );
};
```

#### 4. server.ts – DI + reittien rekisteröinti
Päivitetään `server.ts` luomaan repo + service ja rekisteröimään reitit.

**`src/server.ts`**

```ts
import Fastify from "fastify";
import { InMemoryReservationRepository } from "./repositories/inMemoryReservationRepository.js";
import { ReservationService } from "./services/reservationService.js";
import { registerReservationRoutes } from "./routes/reservations.routes.js";

const app = Fastify({
  logger: true,
});

// DI: repo → service → reitit
const reservationRepository = new InMemoryReservationRepository();
const reservationService = new ReservationService(
  reservationRepository,
);

// Rekisteröidään varausreitit
registerReservationRoutes(app, reservationService);

app.get("/health", async () => {
  return { status: "ok" };
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```

#### 5. Miten testataan tässä vaiheessa?
##### 5.1. Build
Vielä kerran varmistus, että kaikki kääntyy:
```bash
cd api
npm run build
```
Jos tämä menee läpi, TS-puoli on kunnossa.


##### 5.2. Käynnistä dev-serveri
```bash
cd api
npm run dev
```
Fastifyn loggerin pitäisi näyttää jotain tyyliin “Server listening on [http://0.0.0.0:3000”](http://0.0.0.0:3000”).

##### 5.3. Testikutsut (curl-esimerkit)
Voit käyttää VSCode REST Clientiä tai curlia. Tässä curlit.

**1) Health-check**
```bash
curl http://localhost:3000/health
# -> {"status":"ok"}
```

**2) Hae kaikki varaukset (alussa tyhjä lista)**
```bash
curl http://localhost:3000/reservations
# -> []
```

**3) Hae tietyn huoneen varaukset (tyhjä lista)**
```bash
curl http://localhost:3000/rooms/room-a/reservations
# -> []
```

**4) Luo uusi varaus tulevaisuuteen**
Valitse jokin tulevaisuuden aika Europe/Helsinki-ajassa, esim. seuraava päivä klo 10, offsetilla:
```bash
curl -X POST http://localhost:3000/rooms/room-a/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "start": "2026-01-28T10:00:00+02:00",
    "durationMinutes": 60,
    "title": "Planning meeting",
    "host": "Alice"
  }'
```
Odotettu vastaus: `201 Created` ja varausobjekti, jossa `start` ja `end` ovat ISO8601 UTC-muodossa (`...Z`).

**5) Hae huoneen varaukset**
```bash
curl http://localhost:3000/rooms/room-a/reservations
```
Saat listan, jossa on edellinen varaus (Date → ISO string).

**6) Testaa päällekkäinen varaus (pitäisi epäonnistua, 409)**
```bash
curl -X POST http://localhost:3000/rooms/room-a/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "start": "2026-01-28T10:30:00+02:00",
    "durationMinutes": 60,
    "title": "Overlapping meeting",
    "host": "Bob"
  }'
```
Odotus:
`409 Conflict` ja body:
```json
{
  "code": "OVERLAPPING_RESERVATION",
  "message": "Reservation overlaps with an existing reservation."
}
```

**7) Hae kaikki varaukset**
```bash
curl http://localhost:3000/reservations
```
Näet luodun varauksen listassa.

**8) Poista varaus**

Käytä aiemmin saadusta vastauksesta varauksen `id`:tä:
```bash
curl -X DELETE http://localhost:3000/rooms/room-a/reservations/<RESERVATION_ID>
# -> 204 No Content
```

**9) Varmista että varaus poistui**
```bash
curl http://localhost:3000/reservations
# -> [] tai vain muut varaukset
```

Fastifyn logista näet myös luonti- ja poistologit (`Reservation created`, `Reservation deleted`).

Jos nämä kaikki toimivat, backendin domain + service + HTTP-API ovat perusmuodossaan valmiit, ja seuraava vaihe voisi olla:
* virheformaatin hiominen (jos haluat),
* tai siirtyminen frontin puolelle / README:n lisävaatimusten kattamiseen.

---

## Frontend-perustoteutuksen generointi
> Uusi keskustelu, saman projektin alla.

### Kehote
Backendin domain, service ja HTTP-API ovat perustoiminnaltaan valmiita ja voimme siirtyä frontend puolen toteutukseen. Ehdota minulle vaiheet sen toteutukseen ja integrointiin backendin kanssa.

Vaiheiden kirjoittamisen lisäksi kerro minulle oletukset, joita olemme tehneet backendin toteutusvaiheessa sekä oletuksista mistä emme ole päättäneet ja tarvitsevat vielä selvennystä ennen toteutusta.

HUOM! Älä vielä kirjoita varsinaista koodia. 

### Vastaus
Aloitan suoraan suunnitelmasta ja oletuksista, ettei homma rönsyile liikaa. 😊

#### 1. Ehdotettu etenemismalli frontendille + integraatio

##### Vaihe 1: Nykyisen skeletonin tsekkaus ja peruskonfiguraatio
Peruslähtökohta:
* Frontti on Angular 21 + Angular Material -projekti (`web`-kansio). 
* Backend on Fastify + TypeScript + Zod -API.

Tässä vaiheessa:
1. Varmista, että Angular-projekti buildaa ja käynnistyy (`npm install`, `npm start`). 
2. Lisää/ennaa `environment`-konfiguraatio backendin base-urlille (esim. `http://localhost:3000`), mutta **ilman kovakoodausta komponentteihin**.
3. Ota Angular Materialin perus-teema ja typografia käyttöön (jos ei jo ole).

**Output tästä vaiheesta:**
Toimiva Angular skeletoni, josta on yhteys backend-URL:iin konfiguraatiotasolla (mutta ei vielä oikeita kutsuja).

##### Vaihe 2: Domain- ja API-tyyppien mallintaminen frontendissä
Kopioi backendin domain-ajattelu fronttiin “ohueksi peiliksi”:
* `Room` (id, name)
* `Reservation` (id, roomId, durationMinutes, start, end, title, host) 

Tee erillinen **domain-kerros** (esim. `app/domain` tai `app/core/models`):
* Tyypit (interface/tyypit) jotka vastaavat backendin vastauksia.
* Yksinkertaiset apufunktiot:
  * päivämäärävertaus / saman päivän tarkistus
  * slotin pituuden tarkistus (30 min stepit)
  * UTC <-> “näytettävä aika” -aput (suhteessa tekemäämme timezone-päätökseen, ks. oletukset alla).

**Output:**
Yhteinen domain-kieli frontin sisällä, joka vastaa backendin sopimusta.

##### Vaihe 3: API-kerros (service luokka, ei vielä UI:ta)
Tee erillinen `ReservationsApiService` tms. `app/core/services` -kansioon, joka vastaa näistä: 
* `GET /rooms/:roomId/reservations`
* `POST /rooms/:roomId/reservations`
* `DELETE /rooms/:roomId/reservations/:reservationId`

Periaatteet:
* Palautukset tyypitettyinä domain-tyypeillä.
* Virheenkäsittely: selkeä erotus
  * validointivirhe (409/400 tms. → esim. päällekkäinen varaus)
  * tekninen virhe (verkko poikki, 500).
* Ei vielä mitään UI-riippuvuuksia (ei MatDialogia tai snackbareja tässä kerroksessa).

**Output:**
Testattava, yksikkötestattavissa oleva API-service, jota UI voi käyttää.

##### Vaihe 4: Sovelluksen tila ja tilanhallinta (huone, päivä, kesto, slotti)
Määrittele, missä nämä asuvat:
* valittu huone (`selectedRoomId`)
* valittu päivä (`selectedDate`)
* valittu viikko (tai viikon offset nykyhetkestä)
* valittu kesto (`durationMinutes`)
* valittu aloitusaika
* ladatut varaukset (`reservationsByRoom` tms.)

Pieni projekti → kevyt ratkaisu riittää:
* joko:
  * “container”-komponentti, joka pitää statea ja antaa sen alikomponenteille `@Input`/`@Output`, **tai**
  * ohut `BookingStateService`, jossa BehaviorSubjectit (RxJS), ja komponentit subscribaavat.

Suosittelen todennäköisesti `BookingStateService`-tyyppistä ratkaisua, jotta:
* viikkonapit + kuukausikalenteri + varauslomake voivat pysyä synkronissa helposti
* sama state on saatavilla myös esim. dialogeissa.

**Output:**
Selkeä state-malli, jolla UI-komponentit voivat toimia yhdessä.

##### Vaihe 5: Päälayout ja peruskomponentit
Rakenna sivu README:n UX-kuvauksen mukaan: 
1. **Pääkomponentti** – esim. `BookingPageComponent`
   * layout (vasen: kalenteri, oikea: lomake).
2. **Huonevalitsija** (chips / button group)
   * näyttää Room A/B/C, valinta päivittää `selectedRoomId`.
3. **Kuukausikalenteri-komponentti**
   * näyttää kuukauden päivät
   * klikkaus päivään → päivittää `selectedDate`
   * näyttää varauksia päivän sisällä tekstinä (esim. `10:00–11:30 Tiimipalaveri`).
4. **Viikkonapinäkymä**
   * näyttää kuluvan viikon päivät vaakasuunnassa
   * “ennen nykyhetkeä” -päivät disabloituina (tarkempi logiikka päätettävä, ks. alempana).
   * nuolinapit viikkosiirtymille.
5. **Varauslomake-komponentti**
   * keston valintachipit (30, 60, 120, 180 min)
   * aloitusajan napit 30 min stepillä toimistoajalta (esim. 08:00–17:00)
   * tekstikenttä kokouksen nimelle (ja tarvittaessa hostille)
   * “Tallenna varaus” -nappi.

**Output:**
Visuaalinen skeleton UI:sta ilman syvää logiikkaa (vielä ei tarvitse laskea vapaita slotteja tarkkaan).

##### Vaihe 6: Slottilogiikka ja päällekkäisyyksien estäminen UI:ssa

Tässä vaiheessa kytket UI:n ja API:n kunnolla toisiinsa:
* Kun huone tai päivä muuttuu:
  * hae huoneen varaukset (kerran) ja filtteröi valitun päivän varaukset frontissa.
* Rakennetaan funktio, joka laskee vapaat aloitusajat:
  * käytössä olevat varaukset (valitulle päivälle)
  * käyttäjän valitsema kesto
  * toimistoajat
  * 30 min step
* `disabled`-tila nappuloille:
  * slot, joka ei mahdu väliin (törmää varaukseen) → disabloidaan
  * slot menneisyydessä (klo- ja päivätasolla) → disabloidaan

Backend toimii edelleen “viimeisenä portinvartijana” päällekkäisyyksille ja menneisyyden varauksille – UI vain parantaa käyttökokemusta. 

**Output:**
Käyttöliittymä, joka käytännössä estää käyttäjää edes yrittämästä invalidia varausta.

##### Vaihe 7: Varauksen luonti ja poistaminen (täysi integraatio)
1. **Luonti**
   * submit → kutsu `POST /rooms/:roomId/reservations`
   * onnistuminen:
     * päivitä varauslista (esim. refetch tai lisää uusi varaus local-stateen)
     * tyhjennä vain ne kentät, jotka halutaan resetata (esim. aika + title, mutta pidä huone ja päivä).
   * epäonnistuminen:
     * näytä selkeä virheilmoitus (snackbar / alert) – erityisesti päällekkäisestä varauksesta.

2. **Poisto**
   * kalenterin päivän sisällä olevan varauksen klikkaus → MatDialog-vahvistus
   * “Kyllä” → `DELETE /rooms/:roomId/reservations/:id`
   * onnistuminen → poista varaus local-state:sta.
   * epäonnistuminen → näytä virhe.

**Output:**
Koko perusflow toimii päästä päähän: huoneen valinta → päivä → kesto → aika → title → varaus luodaan ja näkyy kalenterissa → varauksen voi poistaa.

##### Vaihe 8: Validointi, virheviestit ja UX-viimeistely
* Pakolliset kentät: vähintään `roomId`, `selectedDate`, `durationMinutes`, `start`, `title`.
* Kenttäkohtaiset virheviestit (Angular reactive forms).
* Loading-indikaatiot API-kutsujen ympärille.
* Tyhjien tilojen käsittely:
  * “Ei varauksia tälle päivälle” -tyyppiset viestit.
* Kieliasu (oletus: suomi koko UI:ssa).
**Output:**
Politettu käyttöliittymä, jossa käyttäjä ymmärtää mitä tapahtuu ja miksi jokin ei onnistu.

##### Vaihe 9: Testaus (manuaalinen + yksikkötestit)
* Yksikkötestejä domain-logiikalle (slottilaskenta, päivän sisäiset overlap-tarkistukset).
* Yksikkötestejä API-servicelle (mockatut HTTP-kutsut).
* Manuaaliset e2e-smoketestit:
  * perusvaraus
  * päällekkäisen varauksen yritys
  * varauksen poisto
  * sivun reload → varaukset tulevat backista oikein.

#### 2. Oletukset, jotka olemme jo tehneet backend-vaiheessa
Tässä koonti sekä README:stä että aiemmista päätöksistämme.
##### 2.1 Selkeät backend/oikeat business-säännöt
Näistä on jo käytännössä päätetty: 
* **Huoneet**
  * Kolme huonetta: “Room A”, “Room B”, “Room C”.
  * Huoneet ovat konfiguroitu/kovakoodattu lista – ei CRUD-toiminnallisuutta huoneille.
* **Varaukset**
  * Varaus koskee aina **yhtä huonetta** ja **yhtä aikaväliä**.
  * Varauksilla on kentät: `id`, `roomId`, `durationMinutes`, `start`, `end`, `title`, `host`.
  * Sallitut kestot (durationMinutes): 30, 60, 120, 180.
  * Backend laskee `end`-ajan `start` + `durationMinutes`.
* **Business-rajat**
  * Ei päällekkäisiä varauksia saman huoneen sisällä.
  * Varaus ei saa sijoittua menneisyyteen.
  * `start` < `end`.
* **Data**
  * Tietovarasto on in-memory: kaikki katoaa palvelimen restartissa.
  * Ei taustadataa/seed-dataa (päätös 2.2).
* **Auth / omistajuus**
  * Ei käyttäjä- tai omistajuuslogiikkaa → kuka tahansa voi poistaa minkä tahansa varauksen.
* **Performanssi & yksinkertaisuus**
  * `Array.filter + sort` on riittävä tähän projektiin (2.3).
  * Ei maksimi-varausmäärärajoja per huone (2.4).

##### 2.2 Tekniset oletukset, jotka vaikuttavat fronttiin
* **Aikavyöhyke**
  * Sovittu, että *timezone on aina UTC* ja käyttäjän sijainti ei vaikuta logiikkaan (1.1).
  * Backend odottaa ISO 8601 -aikaleimoja `Z`-suffiksella, esim. `2026-01-26T10:00:00Z`. 
* **Domain-nimeäminen**
  * Huoneiden nimeäminen domainissa (“Room A” jne.) on hyväksytty sellaisenaan (1.3).
* **Kentät**
  * “Emme tarvitse muita kenttiä. Tehdään merkkirajaus myöhemmin API/validation-kerroksessa.” (1.2)
    * Tämä tarkoittaa käytännössä, että pysymme README:n kentissä, emmekä lisää ekstraa ilman selkeää tarvetta.

#### 3. Oletukset, joita emme ole vielä lyöneet lukkoon (ja olisi hyvä päättää ennen koodausta)
Näistä ei ole mielestäni vielä eksplisiittistä päätöstä, ja ne vaikuttavat suoraan frontin toteutukseen.

##### 3.1 Toimistoajat ja slot-ala/yläraja

README antaa esimerkin “kuten 08:00–17:00”, mutta ei lukitse sitä. 
Päätettävä:
* Onko slot-aikaväli **täsmälleen** 08:00–17:00 (tai jokin muu), vai
* onko se konfiguroitava arvo (esim. frontin `WORKDAY_START = 8`, `WORKDAY_END = 17`)?

**Ehdotus (jollet halua miettiä enempää):**
* Käytetään kiinteää aikaväliä 08:00–17:00 UTC ja näytetään se sellaisenaan UI:ssa.

##### 3.2 Ajan näyttäminen UI:ssa (UTC vs. “paikallinen toimistoaika”)

Meillä on kaksi hieman eri signaalia:
* README sanoo, että frontend “vastaa aikojen näyttämisestä käyttäjälle luettavassa muodossa (esim. paikallinen aika)”. 
* Oma päätöksemme: timezone on aina UTC, käyttäjän sijainti ei vaikuta (1.1).

Päätettävä:
* Näytetäänkö ajat:
  * **suoraan UTC-aikana**, ja merkitään UI:ssa (esim. “10:00 (UTC)”), vai
  * tulkitaanko “paikallinen” = “organisaation oletus-aikavyöhyke”, joka on käytännössä myös UTC (eli käyttäjä ei näe eroa)?

**Ehdotus:**
Käytetään frontissa UTC:ta **ikään kuin se olisi toimiston paikallisaika**, eikä konvertoida käyttäjän selaimen timezoneen. Voidaan tarvittaessa lisätä maininta “ajat ovat UTC-ajassa”.

##### 3.3 “Menneisyys” – missä kohtaa UI disabloi päivät/slotit?
Backend estää menneisyyteen sijoittuvat varaukset. 
UI:ssa pitää päättää:
* Kuinka aggressiivisesti disabloimme nappeja:
  * disabloidaanko **kaikki menneet päivät** (OK),
  * entä kuluvan päivän “ennen nykyhetkeä” olevat slotit?
    * Esim. nyt klo 13:00 → voiko käyttäjä varata klo 09:00–10:00 (takautuvasti) vai ei?
* Synkronoidaanko UI:n “nykyhetki” backendin UTC-now:iin vai käytetäänkö selaimen aikaa (joka voi periaatteessa erota vähän, mutta logiikkapäätös on tehtävä).

**Ehdotus:**
* Koko logiikka menee UTC:n mukaan.
* Kuluvan päivän menneet slotit disabloidaan UI:ssa (ja backend estää joka tapauksessa, jos UI-logiikka jostain syystä pettää).

##### 3.4 `host`-kentän käyttö frontissa
README:n mukaan Reservationilla on myös `host` (kokouksen järjestäjä). 
Epämääräisyys:
* Onko `host`:
  * pakollinen kenttä UI:ssa, vai
  * vapaaehtoinen lisätieto?

Ja samalla:
* Halutaanko näytettävän tekstin muodossa kalenterissa `10.00–11.30 Tiimipalaveri (Tiimi X)` vai pelkkä title?

**Ehdotus:**
* Tehdään `host` vapaaehtoiseksi UI-kentäksi.
* Kalenterisoluissa näytetään lähtökohtaisesti vain `title`, mutta yksityiskohtaisemmat tiedot esim. tooltipissä tai dialogissa.

##### 3.5 Tekstikenttien validointi (pituus ja sallittu sisältö)
Tiedämme, että merkkirajauksia ei ole vielä päätetty (1.2). Päätettävä:
* Maksimipituus `title`-kentälle (esim. 100 merkkiä).
* Maksimipituus `host`-kentälle (esim. 100–150 merkkiä).
* Sallitaanko kaikki merkit (myös emojit jne.) vai rajoitetaanko?

**Ehdotus:**
* `title`: 100 merkkiä, pakollinen.
* `host`: 100 merkkiä, vapaaehtoinen.
* Sallitaan periaatteessa kaikki Unicode-merkit.

##### 3.6 API:n base URL ja CORS-tilanne
Frontendin integrointi edellyttää käytännön oletusta:
* Ajetaanko devissä:
  * backend: `http://localhost:3000`
  * frontend: `http://localhost:4200`
* Onko CORS konffattu näin valmiiksi backendissä, vai pitääkö se säätää nyt?
Tämä on enemmän dev/infra-kysymys, mutta frontin `environment`-asetukset riippuvat tästä.

**Ehdotus:**
* Otetaan oletus: `http://localhost:3000` on API:n base URL dev-ympäristössä.
* Frontin environmentiin `apiBaseUrl` → kaikki API-servicen kutsut rakentuvat sen päälle.

##### 3.7 Varausten listaaminen – haetaanko aina koko huoneen historia?
Nykyinen API-luonnos: `GET /rooms/:roomId/reservations` (ei query-parametreja). 
Päätettävä:
* Onko OK, että frontti hakee **kaikki huoneen varaukset** ja filtteröi ne itse päivittäin/viikoittain
  * (tämä on yksinkertaisin vaihtoehto ja toimii hyvin pienen datamäärän kanssa),
* vai halutaanko tulevaisuudessa tukea esim. date-range-pyyntöjä?

Tässä projektissa olemme jo todenneet, että suorituskyky ei ole ongelma (2.3), joten frontti voi hyvin filtteröidä itse.

**Ehdotus:**
* Tässä versiossa haetaan koko huoneen varauslista ja filtteröidään UI:ssa.
* Jos joskus lisätään date-range, UI:n ei tarvitse muuttua radikaalisti – vain API-servicen toteutus.

Jos haluat, seuraavassa vaiheessa voin:
* lukita nämä avoimet oletukset konkreettisiksi päätöksiksi (listaan “hyväksy/noudata tällaisenaan”), ja
* tehdä niiden pohjalta konkreettisen komponentti- ja palvelurakennesuunnitelman (tiedostot, nimet, datavirrat) – **edelleen ilman varsinaista koodia**, mutta niin, että koodaaminen on käytännössä mekaanista.

---

### Kehote
Vastaukset oletuksiin, jotka ovat vielä auki:
3.1. Lukitaan slot-aikaväliksi 8.00-17.00, mutta konfiguroidaan se frontissa juuri esimerkkisi WORKDAY_START = 8, WORKDAY_END = 17 tavalla.
3.2. Käytetään UTC aikaa ikään kuin se olisi toimiston paikallisaika, joka näkyy UI:ssa muodossa "hh:mm" eli esimerkiksi 10:00.
3.3. Kyllä koko logiikka UTC:n mukaan. Kaikki menneet päivät sekä kuluvan päivän "ennen nykyhetkeä" olevat slotit disabloidaan. Esimerkiksi myöskään kellon ollessa 10.01 käyttäjä ei voi valita slottia joka on alkanut klo 10.00, koska aloitusaika on mennyt jo ohi.
3.4. Host on pakollinen kenttä myös UI:ssa, kuten kaikki muutkin kentät lomakkeessa. Kyllä, kalenterisssa näytetään myös host. Muodossa: 10.00-11.30 Tiimipalaveri, Tiimi X. 
3.5. 100 merkkiä on kumpaankin hyvä raja. Muista että host on myös pakollinen. Sallitaan kaikki merkit esim myös emojit.
3.6. http://localhost:3000 on jo apin base url, joten ehdotuksesi on ok.
3.7. Hyväksyn ehdotuksesi: filteröidään UI:ssa kuukauden ja viikon mukaan

Olen nyt antanut vastaukset oletuksiin ja voit lukita päätökseni. Aloitetaan vaiheittainen koodaaminen. Anna minulle yksi vaihe kerrallaan, tarvittavat koodi tiedostot ja kerro lyhyesti mitä niissä tehdään. 

HUOM! Olen luonut jo kansion "web/" frontendia varten. Ainoa asia, jonka kansioon olen tehnyt on package.json tiedostosta näkemäsi dependencies asennukset. 

Aloitetaan vaiheesta 1 ja kerron aina kun voimme siirtyä eteenpäin.

### Vastaus
Aloitetaan. 😊
Vaihe 1 = luodaan ja konffataan perus Angular-sovellus + ympäristöasetukset (API-URL + työpäivän rajat).
Ei vielä mitään oikeaa varaustoiminnallisuutta.

#### Vaihe 1: Angular-skeleton + environment-konfiguraatio
##### 1.1 Luo / varmista Angular-projekti `web/`-kansiossa
**Jos et ole vielä generoinut Angular-projektia** `web/`-kansion sisään, tee se (Angular 17+ default = standalone app):
```bash
cd web
npx @angular/cli@latest new web-app --standalone --style=scss --routing=false
# vaihtoehtoisesti projektille jokin muu nimi kuin web-app
```

Jos sinulla on jo Angular-projekti `web/`-kansiossa, voit ohittaa tämän ja käyttää olemassa olevaa rakennetta.
Alla oletan rakenteen:
* `web/` (juuri)

  * `src/`

    * `main.ts`
    * `app/`
    * `environments/`

##### 1.2 `environment`-tiedostot (API base URL + työpäivän rajat)
Lukitaan nyt keskitetyt asetukset:
* `apiBaseUrl = 'http://localhost:3000'`
* `workdayStartHour = 8`
* `workdayEndHour = 17`
###### 📄 `web/src/environments/environment.development.ts`

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
  workdayStartHour: 8,
  workdayEndHour: 17,
};
```

###### 📄 `web/src/environments/environment.ts`
```ts
export const environment = {
  production: true,
  apiBaseUrl: 'http://localhost:3000',
  workdayStartHour: 8,
  workdayEndHour: 17,
};
```

**Mitä nämä tekevät?**
* Pitää yhdessä paikassa kaikki “ympäristökohtaiset” asetukset:
  * mihin backend-APIin frontti soittaa (`apiBaseUrl`)
  * työpäivän alku- ja loppuajat (`workdayStartHour`, `workdayEndHour`).
* Myöhemmin esim. API-servicet ja slottilogiikka lukevat nämä tästä, eivätkä kovakoodaa arvoja.

### 1.3 `main.ts` – sovelluksen bootstrap
Varmistetaan, että käytössä on standalone-bootstrappi (CLI:n default uudemmissa Angular-versioissa).

###### 📄 `web/src/main.ts`
```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch((err) =>
  console.error(err)
);
```

**Mitä tämä tekee?**
* Käynnistää Angular-sovelluksen selaimessa.
* Käyttää `app.config.ts`-tiedostoa konfiguraatioon (providerit, animaatiot, router, jne.).
* Root-komponentti on `AppComponent`.

##### 1.4 `app.config.ts` – peruskonfiguraatio + animaatiot (Angular Materialia varten)

Luodaan sovellukselle konfiguraatio, jossa on ainakin:
* `provideAnimations()` → tarvitaan Angular Material -komponenttien animaatioihin.
* (Tyhjä router-konfiguraatio toistaiseksi, voidaan laajentaa myöhemmin.)

###### 📄 `web/src/app/app.config.ts`
```ts
import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
// Router-konfiguraatiota ei vielä tarvita, mutta jätetään valmius:
// import { provideRouter } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    // provideRouter([]),
  ],
};
```

**Mitä tämä tekee?**
* Kertoo Angularille, mitä “globaalit” providerit on käytössä:
  * animaatiot (Angular Materialille)
  * myöhemmin router, HTTP-client, tms.
* Yhtenäinen paikka lisätä sovelluksen “cross-cutting” asetukset.

##### 1.5 `AppComponent` – yksinkertainen root-komponentti
Luodaan minimaalinen root-komponentti, johon myöhemmin tuodaan kalenterit, lomakkeet jne.

###### 📄 `web/src/app/app.component.ts`
```ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'Conference Room Booking App';
}
```

#### 📄 `web/src/app/app.component.html`
```html
<main class="app-shell">
  <header class="app-header">
    <h1>{{ title }}</h1>
  </header>

  <section class="app-content">
    <!-- Tänne rakennetaan myöhemmin varausnäkymä (kalenteri + lomake) -->
    <p>Frontend skeleton toimii 🎉</p>
  </section>
</main>
```

###### 📄 `web/src/app/app.component.scss`
```scss
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.app-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.app-content {
  padding: 1.5rem;
}
```

**Mitä nämä tekevät?**
* `AppComponent` toimii sovelluksen juurikomponenttina.
* HTML + SCSS luovat kevyen “kuoren”, johon myöhemmin pudotetaan varausnäkymä.
* Vielä ei ole Angular Material -komponentteja, mutta skeleton on valmis.

##### 1.6 Angular Material -asennus (valmistelu tulevaa varten)
Jos et ole vielä tehnyt tätä, lisää Angular Material:
```bash
cd web
npx ng add @angular/material
```

Valitse jokin prebuilt-teema (mikä tahansa käy tässä vaiheessa), animaatiot päälle jne.
CLI päivittää automaattisesti:
* `angular.json` → Material-tyylit
* mahdollisesti `styles.scss` → teemaimportit

**Mitä tämä tekee?**
* Asentaa Angular Material -kirjaston, jota käytämme myöhemmin:
  * chipit, napit, dialogit, mahdollinen datepicker tms.
* Konffaa animaatiot ja tyylit valmiiksi.

##### 1.7 Välitarkistus
Kun yllä olevat on tehty:
```bash
cd web
npm start   # tai: npx ng serve
```

Selaimessa (yleensä `http://localhost:4200`) pitäisi näkyä:
* otsikko “Conference Room Booking App”
* teksti “Frontend skeleton toimii 🎉” (tai vastaava)

Kun olet saanut tämän vaiheen läpi ja sovellus käynnistyy ilman virheitä, kerro minulle, niin siirrytään **Vaiheeseen 2: domain- ja API-tyyppien mallintaminen frontendissä**.

---

### Kehote
Importti 'provideAnimations' on deprecated. Oletko varma että sitä tarvitaan? Tässä error: 'provideAnimations' is deprecated.ts(6385)
animations.d.ts(78, 4): The declaration was marked as deprecated here.
(alias) function provideAnimations(): Provider[]
import provideAnimations
Returns the set of dependency-injection providers to enable animations in an application. See animations guide to learn more about animations in Angular.

@usageNotes
The function is useful when you want to enable animations in an application bootstrapped using the bootstrapApplication function. In this scenario there is no need to import the BrowserAnimationsModule NgModule at all, just add providers returned by this function to the providers list as show below.

bootstrapApplication(RootComponent, {
  providers: [
    provideAnimations()
  ]
});
@publicApi

@deprecated — 20.2 Use animate.enter or animate.leave instead. Intent to remove in v23

### Vastaus
Hyvä nosto – tämä on ihan aiheellinen kysymys. 👍
Lyhyt vastaus: **me ei tarvita `provideAnimations()`-kutsua tähän projektiin, joten poistetaan se.**

#### Miksi `provideAnimations` näyttää deprecatedia?
Angular 20.2+:
* Koko `@angular/animations` -paketti on merkitty deprecatediksi.
* Suositus on siirtyä **native CSS -animointeihin** + uusiin `animate.enter` / `animate.leave` -juttuihin. ([angular.dev][1])
Angular Material ei enää ole riippuvainen `@angular/animations`-paketista versiosta 19.2 alkaen, eli sitä vartenkaan ei ole pakko ottaa Angularin animaatiomoottoria käyttöön. ([Stack Overflow][2])
Koska me ei olla suunnitelleet mitään monimutkaisia Angular-animations -transitioita (fade-in, slide tms.), **helpoin ja siistein ratkaisu on olla ottamatta animaatiopalikkaa käyttöön lainkaan.**

#### Mitä muutetaan käytännössä?
##### 🔧 Päivitetty `app.config.ts`
Poistetaan `provideAnimations`-importti ja provider kokonaan.

###### 📄 `web/src/app/app.config.ts`
```ts
import { ApplicationConfig } from '@angular/core';
// Ei tarvetta provideAnimationsille tässä projektissa

export const appConfig: ApplicationConfig = {
  providers: [
    // Tänne lisätään myöhemmin esim. provideRouter, provideHttpClient jne.
  ],
};
```

Se on tässä vaiheessa täysin OK, että provider-lista on tyhjä – lisätään myöhemmin router/HTTP/etc. kun niitä tarvitaan.

#### Entä jos halutaan animaatioita myöhemmin?
Silloin on kaksi vaihtoehtoa:
1. **Moderni tapa (suositus):**
   * Käytetään `animate.enter` / `animate.leave` -direktiivejä + CSS-animaatioita. ([angular.dev][1])
   * Ei oteta `@angular/animations`-pakettia käyttöön lainkaan.
2. **Legacy-animations (ei suositella uuteen koodiin):**
   * Tällöin käytettäisiin uutta `provideAnimationsAsync`-kutsua jne., mutta Angular-tiimi haluaa, että tästä siirrytään pois. ([angular.dev][3])

Meidän appissa pärjätään mainiosti ilman kumpaakaan toistaiseksi.

Jos saat projektin nyt pyörimään ilman virheilmoituksia (ja ilman `provideAnimations`-warningia), niin ilmoita vaan “ok” / “valmis”, niin mennään **Vaiheeseen 2: domain- ja API-tyyppien mallintaminen frontendissä**.

[1]: https://angular.dev/guide/animations/migration?utm_source=chatgpt.com "Migrating to Native CSS Animations"
[2]: https://stackoverflow.com/questions/79754646/does-angular-material-plans-to-remove-the-deprecated-angular-animations-package?utm_source=chatgpt.com "Does Angular Material plans to remove the deprecated @ ..."
[3]: https://angular.dev/guide/legacy-animations?utm_source=chatgpt.com "Legacy Animations • Overview"

---

### Kehote
Nyt projekti pyörii. (Poistin provideAnimations kokonaan, koska se oli turha.) Siirrytään vaiheeseen 2.

### Vastaus
Hyvä, mennään eteenpäin. 😊
Vaihe 2 = **domain- ja API-tyypit + pieni UTC-aika-apukerros**, mutta ei vielä yhtään HTTP-kutsua.

Käytetään rakennetta:

* `src/app/core/models` – domain- ja API-tyypit
* `src/app/core/utils` – yleiset apufunktiot (nyt: aika/UTC)

---

#### Vaihe 2: Domain- ja API-tyypit + UTC-aika-apurit
##### 2.1 Kansiot
Luo nämä kansiot, jos niitä ei vielä ole:
* `web/src/app/core/`
* `web/src/app/core/models/`
* `web/src/app/core/utils/`

##### 2.2 Room-malli
📄 `web/src/app/core/models/room.model.ts`

```ts
/**
 * Kokoushuoneen perusmalli – vastaa backendin Room-tyyppiä.
 *
 * Huom:
 * - Huoneet ovat kovakoodattuja/configista tulevia, eikä niille ole CRUD-APIa.
 */
export interface Room {
  id: string;   // esim. "room-a"
  name: string; // esim. "Room A"
}
```

**Mitä täällä tehdään?**
* Kuvataan `Room` suoraan README:n mukaisesti (id + name).
* Tätä käytetään sekä UI:ssa (huonechipeissä) että API-kerroksessa.

##### 2.3 Reservation-mallit (domain + API-request)
📄 `web/src/app/core/models/reservation.model.ts`

```ts
/**
 * Sallitut varauksen kestot minuutteina.
 *
 * Päätetty: 30, 60, 120, 180.
 */
export type ReservationDurationMinutes = 30 | 60 | 120 | 180;

export type RoomId = string;
export type ReservationId = string;

/**
 * Backendin palauttama varausmalli.
 *
 * Huom:
 * - start ja end ovat ISO 8601 UTC -stringejä (esim. "2026-01-28T10:00:00Z").
 * - UI näyttää ajat muodossa "HH:mm" käyttäen UTC-aikaa "toimistoaikana".
 */
export interface Reservation {
  id: ReservationId;
  roomId: RoomId;
  durationMinutes: ReservationDurationMinutes;
  start: string; // ISO datetime (UTC)
  end: string;   // ISO datetime (UTC)
  title: string; // pakollinen, max 100 merkkiä (validoidaan UI:ssa/backendissä)
  host: string;  // pakollinen, max 100 merkkiä (validoidaan UI:ssa/backendissä)
}

/**
 * POST /rooms/:roomId/reservations body.
 *
 * Backend laskee end-ajan durationMinutes + start-arvoista.
 *
 * Huom:
 * - roomId tulee URL-parametrista, mutta pidetään mukana tyypissä dokumentaation vuoksi.
 * - Kaikki kentät pakollisia (business-päätös).
 */
export interface CreateReservationRequest {
  roomId: RoomId;
  durationMinutes: ReservationDurationMinutes;
  start: string; // ISO datetime (UTC)
  title: string; // max 100
  host: string;  // max 100
}
```

**Mitä täällä tehdään?**
* Typitetään `Reservation` täsmälleen backendin domain-mallin mukaan.
* Lisätään erillinen `CreateReservationRequest`-tyyppi POST-bodylle (ei sisällä `id`/`end`).
* Lukitaan keston arvot unioksi, jolloin UI:ssa on vaikea “vahingossa” käyttää väärää kestoa.
* Dokumentoidaan kommentteihin:
  * start/end ovat UTC-ISO-stringejä
  * title ja host ovat pakollisia, max 100 merkkiä (tämä implementoidaan UI-validoinnissa, ei tässä tiedostossa).

##### 2.4 Mahdollinen API-vastaus-tyyppi (kevyt)
Tähän projektiin riittää yleensä, että käytämme suoraan `Reservation[]` sellaisenaan, mutta jos haluat selkeyttä, voit lisätä erillisen “API-vastaus-tyypin”. Tämä ei ole pakollinen, mutta voi tehdä asiaa eksplisiittisemmäksi.

📄 (valinnainen) `web/src/app/core/models/api.model.ts`
```ts
import { Reservation } from './reservation.model';

/**
 * GET /rooms/:roomId/reservations
 */
export type GetRoomReservationsResponse = Reservation[];
```

**Mitä täällä tehdään?**
* Tyyppi alias, joka nimeää API-vastauksen selkeästi.
* Jos API-kehitys laajenee (esim. `{ reservations: Reservation[] }`-muotoon), muutokset tehdään tänne.
Jos et halua tätä vielä, voit hypätä tämän yli – ei riko mitään.

##### 2.5 UTC-aika-apurit (frontin “paikallisaika”)
Seuraavaksi tehdään yhteiset apufunktiot, jotka kunnioittavat meidän päätöksiä:
* UTC on “toimiston paikallisaika”.
* UI näyttää ajat muodossa `"HH:mm"`, esim. `"10:00"`.
* Myöhemmin slottilogiikka käyttää myös näitä apureita.

📄 `web/src/app/core/utils/date-time.util.ts`
```ts
/**
 * Parsii ISO 8601 UTC -stringin Date-olioksi.
 *
 * Esimerkki:
 *  parseUtcIsoString("2026-01-28T10:00:00Z")
 */
export function parseUtcIsoString(value: string): Date {
  return new Date(value);
}

/**
 * Muuntaa Date-olion ISO 8601 UTC -stringiksi (Z-suffiksella).
 *
 * Esimerkki:
 *  toUtcIsoString(new Date()) -> "2026-01-28T10:00:00.000Z"
 */
export function toUtcIsoString(date: Date): string {
  return date.toISOString();
}

/**
 * Muotoilee ISO 8601 UTC -ajan käyttäjälle näytettävään muotoon "HH:mm".
 *
 * Päätös:
 * - Käytetään UTC-aikaa ikään kuin se olisi toimiston paikallisaika.
 * - Ei tehdä selaimen timezone-konversiota.
 *
 * Esimerkki:
 *  formatTimeFromUtcIso("2026-01-28T10:00:00Z") -> "10:00"
 */
export function formatTimeFromUtcIso(iso: string): string {
  const date = parseUtcIsoString(iso);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();

  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');

  return `${hh}:${mm}`;
}

/**
 * Palauttaa "nyt"-ajan UTC:na Date-oliona.
 *
 * Tämä on wrapper, jotta myöhemmin testaaminen helpottuu (voi mockata).
 */
export function nowUtc(): Date {
  return new Date();
}

/**
 * Onko annettu aloitusaika (ISO UTC) menneisyydessä suhteessa "nyt"-hetkeen (UTC)?
 *
 * Käytetään myöhemmin UI:ssa:
 * - disabloimaan menneet slotit
 * - sekä menneet päivät / päivän sisällä ennen nykyhetkeä olevat aloitusajat.
 */
export function isStartInPast(startIsoUtc: string, referenceUtc: Date = nowUtc()): boolean {
  const start = parseUtcIsoString(startIsoUtc);
  return start.getTime() <= referenceUtc.getTime();
}
```

**Mitä täällä tehdään?**
* `parseUtcIsoString` / `toUtcIsoString`: perus muunnokset string ↔ Date, aina UTC:na.
* `formatTimeFromUtcIso`: yksi keskitetty tapa näyttää ajat `"HH:mm"`-muodossa – käyttää **UTC-kenttiä** (getUTCHours/getUTCMinutes), ei selaimen time-zonea.
* `nowUtc` & `isStartInPast`:
  * `nowUtc` eriyttää “nyt”-hetken, jotta testaus helpottuu.
  * `isStartInPast` implementoi meidän päätöksen: slot on menneisyydessä, jos sen aloitusaika ≤ nykyhetki (UTC).

UI/slottilogiikka tulee käyttämään näitä, kun disabloidaan menneet slotit.

##### 2.6 Pieni välitsekkaus
Tässä vaiheessa:
* Projektin pitäisi yhä buildata ja pyöriä.
* Emme ole vielä koskeneet `AppComponent`iin tai UI:hin.
* Olemme lisänneet:
  * domain-tyypit huoneille ja varauksille,
  * CreateReservationRequest-tyypin POST-bodylle,
  * perusaika-apurit, jotka noudattavat tekemiämme päätöksiä (UTC, “HH:mm”, menneet slotit).

Voit nyt:
```bash
cd web
npm run build   # tai npx ng build
```

Jos build menee läpi ilman virheitä, kerro “ok” / “valmis”, niin siirrytään **Vaiheeseen 3: API-kerros (ReservationsApiService tms.)**, jossa aletaan käyttämään näitä tyyppejä oikeiden HTTP-kutsujen kanssa.

---

### Kehote
build meni läpi. Voit siirtyä seuraavaan vaiheeseen 3.

### Vastaus
Jes, hyvä tahti. 🚀
Vaihe 3 = **API-service**, joka kapseloi HTTP-kutsut backendille. Ei vielä UI-käyttöä.

---

#### Vaihe 3: API-kerros – `ReservationsApiService`
Tavoite:
* Lisätään `HttpClient` sovellukseen.
* Luodaan yksi service, joka tuntee meidän endpointit:
  * `GET /rooms/:roomId/reservations`
  * `POST /rooms/:roomId/reservations`
  * `DELETE /rooms/:roomId/reservations/:reservationId`

Ei vielä virheilmoituksia UI:ssa, ei mitään Materialia – vain tyypitetty HTTP-kerros.

##### 3.1 Ota HttpClient käyttöön globaalisti
📄 **Päivitä** `web/src/app/app.config.ts`
```ts
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    // Tänne lisätään myöhemmin esim. provideRouter, muut providerit
  ],
};
```

**Mitä tämä tekee?**
* Rekisteröi `HttpClient`in DI:hin niin, että serviceissä voi käyttää sitä (`constructor(private http: HttpClient)`).
* Ei muuta vielä sovelluksen näkyvää toimintaa.

##### 3.2 Luo API-service
📄 **Uusi tiedosto** `web/src/app/core/services/reservations-api.service.ts`
```ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateReservationRequest,
  Reservation,
  ReservationId,
  RoomId,
} from '../models/reservation.model';
import { environment } from '../../../environments/environment';

/**
 * Vastaa varaus-API:n kutsuista.
 *
 * - Ei sisällä UI-logiikkaa (ei snackbareja, ei dialogeja).
 * - Palauttaa tyypitetyt Observablit, joita komponentit voivat käyttää.
 */
@Injectable({
  providedIn: 'root',
})
export class ReservationsApiService {
  private readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  /**
   * Palauttaa kaikki annetun huoneen varaukset.
   *
   * GET /rooms/:roomId/reservations
   */
  getRoomReservations(roomId: RoomId): Observable<Reservation[]> {
    const url = this.buildRoomReservationsUrl(roomId);
    return this.http.get<Reservation[]>(url);
  }

  /**
   * Luo uuden varauksen annetulle huoneelle.
   *
   * POST /rooms/:roomId/reservations
   *
   * Huom:
   * - roomId tulee URL-parametrista.
   * - Backend laskee end-ajan.
   */
  createReservation(
    request: CreateReservationRequest
  ): Observable<Reservation> {
    const url = this.buildRoomReservationsUrl(request.roomId);

    // Backend ei tarvitse roomId:tä bodyssa, se tulee URL:sta.
    const body = {
      durationMinutes: request.durationMinutes,
      start: request.start,
      title: request.title,
      host: request.host,
    };

    return this.http.post<Reservation>(url, body);
  }

  /**
   * Poistaa olemassa olevan varauksen.
   *
   * DELETE /rooms/:roomId/reservations/:reservationId
   */
  deleteReservation(
    roomId: RoomId,
    reservationId: ReservationId
  ): Observable<void> {
    const url = `${this.buildRoomReservationsUrl(
      roomId
    )}/${encodeURIComponent(reservationId)}`;
    return this.http.delete<void>(url);
  }

  /**
   * Rakentaa huoneen varaus-endpointin URL:n.
   *
   * Esim: http://localhost:3000/rooms/room-a/reservations
   */
  private buildRoomReservationsUrl(roomId: RoomId): string {
    return `${this.apiBaseUrl}/rooms/${encodeURIComponent(roomId)}/reservations`;
  }
}
```

**Mitä tässä tehdään?**
* Paljastetaan kolme metodia:
  * `getRoomReservations(roomId)` → `Observable<Reservation[]>`
  * `createReservation(request)` → `Observable<Reservation>`
  * `deleteReservation(roomId, reservationId)` → `Observable<void>`
* Käytetään `environment.apiBaseUrl`ia, joten base URL vaihtuu helposti ympäristön mukaan.
* RoomId ja ReservationId enkoodataan URL:iin (turvallista myös “erikoisten” id:iden kanssa).

**Virheenkäsittely tässä vaiheessa**
* Service **ei vielä** wräppää virheitä mihinkään custom-tyyppiin; se välittää `HttpErrorResponse`-tason virheet suoraan Observablen kautta.
* UI/”kuvakomponenttikerros” voi myöhemmin tarkistaa `error.status` ja erottaa:

  * 400/409 → validointivirhe / päällekkäinen varaus
  * 500, 0 → tekninen virhe / verkko-ongelma
    …tähän palataan, kun teemme lomake- ja kalenterikomponentit.

##### 3.3 Pieni sanity check
Nyt:
* `app.config.ts` tuntee `provideHttpClient`in.
* `ReservationsApiService` on `providedIn: 'root'` → käytettävissä kaikkialla.
* Service ei vielä ole käytössä yhdessäkään komponentissa, joten sovelluksen UI ei ole muuttunut.
Voit testata, että kaikki kääntyy:
```bash
cd web
npm run build
```

Jos build menee läpi ilman virheitä, ilmoita “ok” / vastaavaa, niin siirrytään **Vaiheeseen 4: frontin tila (state) ja sen malli**, missä aletaan suunnitella, miten `selectedRoom`, `selectedDate`, `durationMinutes`, jne. asuvat frontissa ja miten ne kytketään myöhemmin UI:hin.

---

### Kehote
Vaihe 3 ok. Siirrytään vaiheeseen 4.

### Vastaus
Nice, mennään stateen. 🧠
Vaihe 4 = **frontin tila**: mihin talletetaan valittu huone, päivä, kesto, aloitusaika, sekä miten varaustieto säilytetään. Ei vielä yhtään UI-komponenttia.

#### Vaihe 4: Booking state -malli + `BookingStateService`
Rakennetaan:
* pieni lisäys date-utiliin (päiväavaimet)
* domain-tyypit UI-statea varten
* `BookingStateService`, joka hoitaa:
  * valitun huoneen
  * valitun päivän
  * varauksen keston
  * valitun slotin aloitusajan
  * huonekohtaisten varausten cachen

Tämä service toimii myöhemmin “yhden totuuden lähteenä” kalenterille, viikkonapeille ja lomakkeelle.

##### 4.1 Laajennetaan UTC-ajautilityä (päiväavaimet)
Lisätään päiväkohtaista logiikkaa:
* `toDateKeyUtc(Date) -> 'YYYY-MM-DD'`
* `fromDateKeyUtc('YYYY-MM-DD') -> Date @ 00:00 UTC`
* `todayDateKeyUtc()`
📄 **Päivitä** `web/src/app/core/utils/date-time.util.ts` seuraavaksi:

```ts
/**
 * Parsii ISO 8601 UTC -stringin Date-olioksi.
 *
 * Esimerkki:
 *  parseUtcIsoString("2026-01-28T10:00:00Z")
 */
export function parseUtcIsoString(value: string): Date {
  return new Date(value);
}

/**
 * Muuntaa Date-olion ISO 8601 UTC -stringiksi (Z-suffiksella).
 *
 * Esimerkki:
 *  toUtcIsoString(new Date()) -> "2026-01-28T10:00:00.000Z"
 */
export function toUtcIsoString(date: Date): string {
  return date.toISOString();
}

/**
 * Muotoilee ISO 8601 UTC -ajan käyttäjälle näytettävään muotoon "HH:mm".
 *
 * Päätös:
 * - Käytetään UTC-aikaa ikään kuin se olisi toimiston paikallisaika.
 * - Ei tehdä selaimen timezone-konversiota.
 *
 * Esimerkki:
 *  formatTimeFromUtcIso("2026-01-28T10:00:00Z") -> "10:00"
 */
export function formatTimeFromUtcIso(iso: string): string {
  const date = parseUtcIsoString(iso);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();

  const hh = hours.toString().padStart(2, '0');
  const mm = minutes.toString().padStart(2, '0');

  return `${hh}:${mm}`;
}

/**
 * Palauttaa "nyt"-ajan UTC:na Date-oliona.
 *
 * Tämä on wrapper, jotta myöhemmin testaaminen helpottuu (voi mockata).
 */
export function nowUtc(): Date {
  return new Date();
}

/**
 * Onko annettu aloitusaika (ISO UTC) menneisyydessä suhteessa "nyt"-hetkeen (UTC)?
 *
 * Käytetään myöhemmin UI:ssa:
 * - disabloimaan menneet slotit
 * - sekä menneet päivät / päivän sisällä ennen nykyhetkeä olevat aloitusajat.
 */
export function isStartInPast(
  startIsoUtc: string,
  referenceUtc: Date = nowUtc()
): boolean {
  const start = parseUtcIsoString(startIsoUtc);
  return start.getTime() <= referenceUtc.getTime();
}

/**
 * Muuntaa Date-olion (UTC) päiväavaimeksi muodossa "YYYY-MM-DD".
 *
 * Päätös:
 * - Päivä määritellään UTC-kalenteripäivänä.
 */
export function toDateKeyUtc(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // 0-11 -> 1-12
  const day = date.getUTCDate();

  const yyyy = year.toString().padStart(4, '0');
  const mm = month.toString().padStart(2, '0');
  const dd = day.toString().padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Palauttaa Date-olion, joka edustaa päivän alkua (00:00:00.000) UTC:ssa
 * annetun "YYYY-MM-DD" -päiväavaimen perusteella.
 */
export function fromDateKeyUtc(dateKey: string): Date {
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  // Date.UTC: month on 0-11
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Palauttaa tämän päivän päiväavaimen (UTC).
 */
export function todayDateKeyUtc(): string {
  const now = nowUtc();
  return toDateKeyUtc(now);
}
```

**Mitä uutta tässä on?**
* Saadaan **päiväavain** `YYYY-MM-DD`, joka toimii:
  * state-avaimena (esim. “selectedDateKey”)
  * kalenterikomponenttien logiikassa.
* Päivä = **UTC-päivä** (linjassa meidän päätösten kanssa).

##### 4.2 Booking state -tyypit
Määritellään UI-statea varten kevyt malli:
📄 **Uusi tiedosto** `web/src/app/core/models/booking-state.model.ts`
```ts
import {
  Reservation,
  ReservationDurationMinutes,
  RoomId,
  ReservationId,
} from './reservation.model';

/**
 * Päiväavain muodossa "YYYY-MM-DD".
 * Käytetään aina UTC-kalenteripäivän kuvaamiseen.
 */
export type UtcDateKey = string;

/**
 * Frontendin varausnäkymän tila.
 *
 * Tämä on "sisäinen" malli BookingStateServicelle ja UI-komponenteille.
 */
export interface BookingState {
  /**
   * Valittu huone varausta varten.
   * Voidaan tulevaisuudessa alustaa esim. ensimmäiseen huoneeseen.
   */
  selectedRoomId: RoomId | null;

  /**
   * Valitun päivän päiväavain (UTC).
   * Alustetaan nykyiseen päivään.
   */
  selectedDateKey: UtcDateKey;

  /**
   * Valittu varauksen kesto minuutteina.
   * Alustetaan esim. 60 minuuttiin (voi säätää myöhemmin).
   */
  selectedDurationMinutes: ReservationDurationMinutes;

  /**
   * Valittu aloitusaika uutena varauksena.
   *
   * ISO 8601 UTC -string (esim. "2026-01-28T10:00:00Z") tai null,
   * jos käyttäjä ei ole vielä valinnut slottia.
   */
  selectedStartIsoUtc: string | null;

  /**
   * Huonekohtainen varausten cache.
   *
   * Esimerkki:
   * {
   *   "room-a": [Reservation, Reservation, ...],
   *   "room-b": [...]
   * }
   */
  reservationsByRoomId: Record<RoomId, Reservation[]>;
}

/**
 * Pieni helper-tyyppi, jos halutaan välittää varauksen tunnistamiseen
 * liittyviä tietoja yhdessä paketissa (huone + varaus).
 */
export interface ReservationRef {
  roomId: RoomId;
  reservationId: ReservationId;
}
```

**Mitä tässä tehdään?**
* Lukitaan UI-state:
  * aina jokin päivä valittuna (UTC-päiväavaimella)
  * yksi aktiivinen kesto (esim. 60 min default)
  * mahdollisesti valittu aloitusaika (tai null)
  * cachaamme varaukset huoneittain normaaliin JS-objektiin.

##### 4.3 `BookingStateService` – tilanhallinta RxJS:llä
Tehdään service, joka:
* pitää sisällään `BehaviorSubject<BookingState>`
* paljastaa read-only Observablit jokaiselle olennaiselle palalle
* tarjoaa setter-metodit (imperatiivinen API) komponentteja varten
📄 **Uusi tiedosto** `web/src/app/core/services/booking-state.service.ts`
```ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  BookingState,
  UtcDateKey,
} from '../models/booking-state.model';
import {
  Reservation,
  ReservationDurationMinutes,
  RoomId,
  ReservationId,
} from '../models/reservation.model';
import { todayDateKeyUtc } from '../utils/date-time.util';

/**
 * Vastaa frontin varausnäkymän tilanhallinnasta.
 *
 * Etukäteen päätettyjä asioita:
 * - Päivä = UTC-kalenteripäivä (UtcDateKey "YYYY-MM-DD").
 * - Kaikki ajat ovat UTC:ssa.
 *
 * Tämä service ei tee HTTP-kutsuja itse – ne hoitaa ReservationsApiService.
 * BookingStateService vain pitää tilan koherenttina ja helposti käytettävänä.
 */
@Injectable({
  providedIn: 'root',
})
export class BookingStateService {
  /**
   * Alkuperäinen tila:
   * - ei vielä valittua huonetta
   * - valittu päivä = tänään (UTC)
   * - oletuskesto = 60 min
   * - ei valittua aloitusaikaa
   * - tyhjä varauscache
   */
  private readonly initialState: BookingState = {
    selectedRoomId: null,
    selectedDateKey: todayDateKeyUtc(),
    selectedDurationMinutes: 60,
    selectedStartIsoUtc: null,
    reservationsByRoomId: {},
  };

  private readonly stateSubject = new BehaviorSubject<BookingState>(
    this.initialState
  );

  /**
   * Koko state read-onlynä (esim. debuggausta tai yhdistelmävalintoja varten).
   */
  readonly state$ = this.stateSubject.asObservable();

  /**
   * Yksittäisiä näkymiä stateen (usein kätevämpää kuin subscribata koko stateen).
   */
  readonly selectedRoomId$ = this.select((state) => state.selectedRoomId);
  readonly selectedDateKey$ = this.select(
    (state) => state.selectedDateKey
  );
  readonly selectedDurationMinutes$ = this.select(
    (state) => state.selectedDurationMinutes
  );
  readonly selectedStartIsoUtc$ = this.select(
    (state) => state.selectedStartIsoUtc
  );
  readonly reservationsByRoomId$ = this.select(
    (state) => state.reservationsByRoomId
  );

  constructor() {}

  /**
   * Päivittää valitun huoneen.
   *
   * Tyypillisesti kutsutaan:
   * - huonechipeistä
   * - mahdollisesti myös initialisoinnissa, kun huonelista on ladattu.
   */
  setSelectedRoomId(roomId: RoomId | null): void {
    this.patchState({ selectedRoomId: roomId });
  }

  /**
   * Päivittää valitun päivän.
   *
   * Parametri on UtcDateKey-muotoinen "YYYY-MM-DD".
   */
  setSelectedDateKey(dateKey: UtcDateKey): void {
    this.patchState({ selectedDateKey: dateKey });

    // Voidaan halutessa tyhjentää valittu aloitusaika, kun päivä vaihtuu:
    this.patchState({ selectedStartIsoUtc: null });
  }

  /**
   * Päivittää valitun varauksen keston.
   */
  setSelectedDurationMinutes(duration: ReservationDurationMinutes): void {
    this.patchState({ selectedDurationMinutes: duration });

    // Keston vaihtaminen voi myös mitätöidä aiemmin valitun slotin,
    // jos se ei enää ole validi – tässä vaiheessa nollataan varmuuden vuoksi.
    this.patchState({ selectedStartIsoUtc: null });
  }

  /**
   * Päivittää valitun aloitusajan uutena varauksena.
   *
   * startIsoUtc on ISO-datetime (UTC), esim. "2026-01-28T10:00:00Z".
   */
  setSelectedStartIsoUtc(startIsoUtc: string | null): void {
    this.patchState({ selectedStartIsoUtc: startIsoUtc });
  }

  /**
   * Päivittää annetun huoneen varausten listan cacheen.
   *
   * Tyypillisesti kutsutaan, kun:
   * - ReservationsApiService.getRoomReservations(...) palauttaa arvon, tai
   * - post/delete muuttaa huoneen varaustilannetta.
   */
  setReservationsForRoom(roomId: RoomId, reservations: Reservation[]): void {
    const current = this.stateSubject.value;
    const updatedByRoom = {
      ...current.reservationsByRoomId,
      [roomId]: reservations,
    };

    this.patchState({ reservationsByRoomId: updatedByRoom });
  }

  /**
   * Poistaa yksittäisen varauksen cachesta (frontend-puolella).
   *
   * Tämä ei tee HTTP-kutsua – oletetaan, että deleteReservation()-kutsu
   * backendiin on onnistunut ennen tämän kutsumista.
   */
  removeReservationFromRoom(roomId: RoomId, reservationId: ReservationId): void {
    const current = this.stateSubject.value;
    const currentList = current.reservationsByRoomId[roomId] ?? [];
    const nextList = currentList.filter(
      (r) => r.id !== reservationId
    );

    const updatedByRoom = {
      ...current.reservationsByRoomId,
      [roomId]: nextList,
    };

    this.patchState({ reservationsByRoomId: updatedByRoom });
  }

  /**
   * Resetoi uutta varausta koskevan selectionin (kestoa lukuun ottamatta),
   * mutta säilyttää valitun huoneen ja päivän.
   *
   * Voidaan kutsua onnistuneen varauksen luonnin jälkeen.
   */
  resetSelectionForNewReservation(): void {
    const current = this.stateSubject.value;
    this.patchState({
      selectedStartIsoUtc: null,
      // jätetään selectedRoomId ja selectedDateKey ennalleen
      selectedDurationMinutes: current.selectedDurationMinutes,
    });
  }

  /**
   * Resetoi koko tilan alkuperäiseen default-tilaan.
   */
  resetAll(): void {
    this.stateSubject.next(this.initialState);
  }

  // --- Yksityiset apurit ---

  private patchState(partial: Partial<BookingState>): void {
    const current = this.stateSubject.value;
    const next: BookingState = {
      ...current,
      ...partial,
    };
    this.stateSubject.next(next);
  }

  private select<T>(project: (state: BookingState) => T) {
    return this.state$.pipe((source) => {
      // Kevyt "map" ilman erillistä RxJS-operaattorin importtia:
      return new Observable<T>((subscriber) => {
        const subscription = source.subscribe({
          next: (state) => subscriber.next(project(state)),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });

        return () => subscription.unsubscribe();
      });
    });
  }
}
```

> 📝 **Huom:** Jos haluat, tuon `select`-helperin voisi tehdä myös RxJS:n `map` + `distinctUntilChanged`-operaattoreilla. Tässä versiossa pidin sen super-kevyenä, jotta ei tarvitse tuoda vielä ylimääräisiä operaatoreita. Voidaan refaktoroida myöhemmin, kun slottilogiikka kasvaa.

**Mitä tämä service käytännössä tekee?**
* Säilyttää yhden `BookingState`-olion BehaviorSubjectissa.
* Paljastaa käteviä Observablit:
  * `selectedRoomId$`, `selectedDateKey$`, `selectedDurationMinutes$`, jne.
* Tarjoaa setterit, joita UI-komponentit kutsuvat:
  * huoneen valinta
  * päivän vaihto
  * keston vaihto
  * slotin valinta
  * varausten asettaminen/päivittäminen

Se ei:
* tee HTTP-kutsuja (se on `ReservationsApiService`n homma)
* tee slottilogiikkaa (tulee omassa vaiheessaan)

##### 4.4 Välitsekkaus
Tässä vaiheessa:
* koodi ei muuta UI:ta ollenkaan
* state-palikat on paikallaan tulevia komponentteja varten
Voit testata:
```bash
cd web
npm run build
```

Jos build menee läpi ilman virheitä, sano “ok” tms., niin mennään **Vaiheeseen 5: layout + peruskomponentit skeletonina** (huonevalitsija, kalenteri, viikonapit, varauslomake – aluksi ilman monimutkaista logiikkaa).

---

### Kehote
Build ok. Siirry vaiheeseen 5.

### Vastaus
Mahtavaa, nyt tulee se hetki kun alkaa oikeasti näkyä jotain ruudulla. 😄
Vaihe 5 = **päälayout + peruskomponenttien skeleton** (ilman syvää logiikkaa).
Tehdään:
* `BookingPageComponent` (container)
* `RoomSelectorComponent`
* `WeekStripComponent`
* `MonthCalendarComponent`
* `ReservationFormComponent`
* päivitetään `AppComponent` käyttämään tätä näkymää

Ei vielä: slottilogiikkaa, API-kutsuja tai validointeja – pelkkä rakenne.

#### 5.1 Kansiot
Luo uusi kansio:
* `web/src/app/booking/`
Kaikki tämän vaiheen komponentit tulevat sinne.

#### 5.2 BookingPageComponent – kontti/layout
📄 `web/src/app/booking/booking-page.component.ts`

```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Room } from '../core/models/room.model';
import { BookingStateService } from '../core/services/booking-state.service';
import { RoomSelectorComponent } from './room-selector.component';
import { WeekStripComponent } from './week-strip.component';
import { MonthCalendarComponent } from './month-calendar.component';
import { ReservationFormComponent } from './reservation-form.component';

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [
    CommonModule,
    RoomSelectorComponent,
    WeekStripComponent,
    MonthCalendarComponent,
    ReservationFormComponent,
  ],
  templateUrl: './booking-page.component.html',
  styleUrls: ['./booking-page.component.scss'],
})
export class BookingPageComponent {
  /**
   * Huoneiden lista – tässä vaiheessa kovakoodattuna.
   * Myöhemmin voidaan siirtää configiin, mutta domainissa nämä ovat joka tapauksessa staattisia.
   */
  readonly rooms: Room[] = [
    { id: 'room-a', name: 'Room A' },
    { id: 'room-b', name: 'Room B' },
    { id: 'room-c', name: 'Room C' },
  ];

  constructor(private readonly bookingState: BookingStateService) {
    // Alusta oletushuoneeksi ensimmäinen listasta, jos ei ole vielä valittua.
    this.bookingState.setSelectedRoomId(this.rooms[0].id);
  }

  onRoomSelected(roomId: string): void {
    this.bookingState.setSelectedRoomId(roomId);
  }
}
```

📄 `web/src/app/booking/booking-page.component.html`
```html
<div class="booking-page">
  <aside class="booking-page__sidebar">
    <section class="booking-page__block">
      <h2 class="booking-page__block-title">Huone</h2>
      <app-room-selector
        [rooms]="rooms"
        (roomSelected)="onRoomSelected($event)"
      ></app-room-selector>
    </section>

    <section class="booking-page__block booking-page__block--calendar">
      <h2 class="booking-page__block-title">Kuukausikalenteri</h2>
      <app-month-calendar></app-month-calendar>
    </section>
  </aside>

  <section class="booking-page__main">
    <section class="booking-page__block">
      <h2 class="booking-page__block-title">Viikko</h2>
      <app-week-strip></app-week-strip>
    </section>

    <section class="booking-page__block booking-page__block--form">
      <h2 class="booking-page__block-title">Uusi varaus</h2>
      <app-reservation-form></app-reservation-form>
    </section>
  </section>
</div>
```

📄 `web/src/app/booking/booking-page.component.scss`
```scss
.booking-page {
  display: grid;
  grid-template-columns: minmax(260px, 320px) 1fr;
  gap: 1.5rem;
  align-items: flex-start;
}

.booking-page__sidebar,
.booking-page__main {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.booking-page__block {
  background: #fff;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
}

.booking-page__block-title {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #64748b;
}

.booking-page__block--calendar {
  flex: 1;
}

.booking-page__block--form {
  flex: 1;
}
```

**Mitä tämä tekee?**
* Jakaa näkymän **sivupalkkiin** (huone + kuukausikalenteri) ja **pääalueeseen** (viikko + lomake).
* Alustaa oletushuoneeksi `Room A`:n.
* Delegoi huoneen valinnan `RoomSelectorComponent`ille.

#### 5.3 RoomSelectorComponent – huonevalitsin
📄 `web/src/app/booking/room-selector.component.ts`
```ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Room } from '../core/models/room.model';

@Component({
  selector: 'app-room-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './room-selector.component.html',
  styleUrls: ['./room-selector.component.scss'],
})
export class RoomSelectorComponent {
  @Input({ required: true }) rooms: Room[] = [];

  @Output() roomSelected = new EventEmitter<string>();

  selectedRoomId: string | null = null;

  onSelect(roomId: string): void {
    this.selectedRoomId = roomId;
    this.roomSelected.emit(roomId);
  }
}
```

📄 `web/src/app/booking/room-selector.component.html`
```html
<div class="room-selector">
  <button
    *ngFor="let room of rooms"
    type="button"
    class="room-selector__chip"
    [class.room-selector__chip--active]="room.id === selectedRoomId"
    (click)="onSelect(room.id)"
  >
    {{ room.name }}
  </button>
</div>
```

📄 `web/src/app/booking/room-selector.component.scss`
```scss
.room-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.room-selector__chip {
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  font-size: 0.9rem;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.room-selector__chip--active {
  background: #0f172a;
  color: #f9fafb;
  border-color: #0f172a;
}
```

**Mitä tämä tekee?**
* Näyttää huoneet “chipeinä”.
* Pitää sisäistä `selectedRoomId`-tilaa (tässä vaiheessa ei vielä sidottu BookingStateServiceen).
* Emittoi valitun huoneen parentille (`BookingPageComponent`).

#### 5.4 WeekStripComponent – viikon päivät skeleton
Tässä vaiheessa pelkkä **visuaalinen placeholder** – ei vielä oikeaa viikkologiikkaa.

📄 `web/src/app/booking/week-strip.component.ts`
```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-week-strip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './week-strip.component.html',
  styleUrls: ['./week-strip.component.scss'],
})
export class WeekStripComponent {}
```

📄 `web/src/app/booking/week-strip.component.html`
```html
<div class="week-strip">
  <button type="button" class="week-strip__nav">&larr;</button>

  <div class="week-strip__days">
    <button type="button" class="week-strip__day week-strip__day--disabled">
      Ma
      <span class="week-strip__day-date">20</span>
    </button>
    <button type="button" class="week-strip__day week-strip__day--active">
      Ti
      <span class="week-strip__day-date">21</span>
    </button>
    <button type="button" class="week-strip__day">
      Ke
      <span class="week-strip__day-date">22</span>
    </button>
    <button type="button" class="week-strip__day">
      To
      <span class="week-strip__day-date">23</span>
    </button>
    <button type="button" class="week-strip__day">
      Pe
      <span class="week-strip__day-date">24</span>
    </button>
  </div>

  <button type="button" class="week-strip__nav">&rarr;</button>
</div>
```

📄 `web/src/app/booking/week-strip.component.scss`
```scss
.week-strip {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.week-strip__nav {
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  padding: 0.25rem 0.7rem;
  cursor: pointer;
}

.week-strip__days {
  display: flex;
  flex: 1;
  justify-content: space-between;
  gap: 0.4rem;
}

.week-strip__day {
  flex: 1;
  padding: 0.4rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.week-strip__day-date {
  font-weight: 600;
}

.week-strip__day--active {
  background: #0f172a;
  color: #f9fafb;
  border-color: #0f172a;
}

.week-strip__day--disabled {
  opacity: 0.5;
  cursor: default;
}
```

**Mitä tämä tekee?**
* Antaa visuaalisen mallin viikkonapeista ja navigaatiosta.
* Varsinainen päivän valinta ja “menneet disabloitu” -logiikka tehdään vaiheessa 6/eteenpäin.

#### 5.5 MonthCalendarComponent – kuukausiskeleton
Tämäkin on tässä vaiheessa puhdas UI-placeholder (ei oikeaa kalenterilaskentaa).

📄 `web/src/app/booking/month-calendar.component.ts`
```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-month-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './month-calendar.component.html',
  styleUrls: ['./month-calendar.component.scss'],
})
export class MonthCalendarComponent {}
```

📄 `web/src/app/booking/month-calendar.component.html`
```html
<div class="month-calendar">
  <header class="month-calendar__header">
    <button type="button" class="month-calendar__nav">&larr;</button>
    <h3 class="month-calendar__title">Tammikuu 2026</h3>
    <button type="button" class="month-calendar__nav">&rarr;</button>
  </header>

  <div class="month-calendar__weekdays">
    <span>Ma</span>
    <span>Ti</span>
    <span>Ke</span>
    <span>To</span>
    <span>Pe</span>
    <span>La</span>
    <span>Su</span>
  </div>

  <div class="month-calendar__grid">
    <button
      type="button"
      class="month-calendar__day month-calendar__day--outside"
    >
      29
    </button>
    <button type="button" class="month-calendar__day">1</button>
    <button type="button" class="month-calendar__day">2</button>
    <button type="button" class="month-calendar__day">3</button>
    <button type="button" class="month-calendar__day">4</button>
    <button type="button" class="month-calendar__day">5</button>
    <button type="button" class="month-calendar__day">6</button>
    <!-- jne... skeleton, oikea renderöinti myöhemmin -->
  </div>
</div>
```

📄 `web/src/app/booking/month-calendar.component.scss`
```scss
.month-calendar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.month-calendar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.month-calendar__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.month-calendar__nav {
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  padding: 0.25rem 0.7rem;
  cursor: pointer;
}

.month-calendar__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  font-size: 0.75rem;
  text-align: center;
  color: #94a3b8;
}

.month-calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
}

.month-calendar__day {
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0.4rem 0.2rem;
  font-size: 0.8rem;
  text-align: center;
  cursor: pointer;
}

.month-calendar__day--outside {
  opacity: 0.4;
}
```

**Mitä tämä tekee?**
* Antaa rakenteen kalenterille, johon myöhemmin tuodaan:

  * oikea kuukauden/viikon laskenta
  * valitun päivän highlight
  * varauksien listaus jokaisessa päivässä.

#### 5.6 ReservationFormComponent – lomakeskeleton
Lomake, jossa on:
* kestovalinnat (30/60/120/180)
* aloitusaikojen grid (8.00–17.00, ilman logiikkaa toistaiseksi)
* tekstikentät `title` ja `host`
* “Tallenna varaus” -nappi (ei vielä oikeaa submit-logiikkaa / API-kutsua)

📄 `web/src/app/booking/reservation-form.component.ts`
```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservationDurationMinutes } from '../core/models/reservation.model';

@Component({
  selector: 'app-reservation-form',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reservation-form.component.html',
  styleUrls: ['./reservation-form.component.scss'],
})
export class ReservationFormComponent {
  readonly durations: ReservationDurationMinutes[] = [30, 60, 120, 180];

  selectedDuration: ReservationDurationMinutes = 60;
  selectedStartLabel: string | null = null;

  title = '';
  host = '';

  get timeSlots(): string[] {
    // Skeleton: 8:00 - 17:00 puolen tunnin välein, merkkimuotona "HH:mm"
    const slots: string[] = [];
    for (let hour = 8; hour < 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }

  onSelectDuration(duration: ReservationDurationMinutes): void {
    this.selectedDuration = duration;
    // myöhemmin nollataan/validioidaan slot valintaa tämän mukaan
  }

  onSelectStart(label: string): void {
    this.selectedStartLabel = label;
  }

  onSubmit(): void {
    // Tässä vaiheessa vain skeleton – ei API-kutsua.
    // Myöhemmin muodostetaan CreateReservationRequest ja kutsutaan ReservationsApiServiceä.
    console.log('Submit skeleton', {
      duration: this.selectedDuration,
      startLabel: this.selectedStartLabel,
      title: this.title,
      host: this.host,
    });
  }
}
```

📄 `web/src/app/booking/reservation-form.component.html`
```html
<form class="reservation-form" (ngSubmit)="onSubmit()">
  <div class="reservation-form__group">
    <label class="reservation-form__label">Kesto</label>
    <div class="reservation-form__chips">
      <button
        *ngFor="let d of durations"
        type="button"
        class="reservation-form__chip"
        [class.reservation-form__chip--active]="d === selectedDuration"
        (click)="onSelectDuration(d)"
      >
        {{ d }} min
      </button>
    </div>
  </div>

  <div class="reservation-form__group">
    <label class="reservation-form__label">Aloitusaika</label>
    <div class="reservation-form__slots">
      <button
        *ngFor="let slot of timeSlots"
        type="button"
        class="reservation-form__slot"
        [class.reservation-form__slot--active]="slot === selectedStartLabel"
        (click)="onSelectStart(slot)"
      >
        {{ slot }}
      </button>
    </div>
  </div>

  <div class="reservation-form__group">
    <label class="reservation-form__label" for="title">Kokouksen nimi</label>
    <input
      id="title"
      type="text"
      class="reservation-form__input"
      [(ngModel)]="title"
      name="title"
      required
      maxlength="100"
      placeholder="Esim. Tiimipalaveri"
    />
  </div>

  <div class="reservation-form__group">
    <label class="reservation-form__label" for="host">Järjestäjä</label>
    <input
      id="host"
      type="text"
      class="reservation-form__input"
      [(ngModel)]="host"
      name="host"
      required
      maxlength="100"
      placeholder="Esim. Tiimi X"
    />
  </div>

  <div class="reservation-form__actions">
    <button type="submit" class="reservation-form__submit">
      Tallenna varaus
    </button>
  </div>
</form>
```

📄 `web/src/app/booking/reservation-form.component.scss`
```scss
.reservation-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reservation-form__group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.reservation-form__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
}

.reservation-form__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.reservation-form__chip {
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.85rem;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  cursor: pointer;
}

.reservation-form__chip--active {
  background: #0f172a;
  color: #f9fafb;
  border-color: #0f172a;
}

.reservation-form__slots {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.reservation-form__slot {
  min-width: 3.4rem;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.reservation-form__slot--active {
  background: #0f172a;
  color: #f9fafb;
  border-color: #0f172a;
}

.reservation-form__input {
  border-radius: 0.5rem;
  border: 1px solid #cbd5e1;
  padding: 0.45rem 0.6rem;
  font-size: 0.9rem;
}

.reservation-form__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.reservation-form__submit {
  border-radius: 999px;
  border: none;
  padding: 0.5rem 1.3rem;
  font-size: 0.9rem;
  font-weight: 600;
  background: #0f172a;
  color: #f9fafb;
  cursor: pointer;
}
```

**Mitä tämä tekee?**
* Antaa lomakkeelle täydellisen UI-skeletonin.
* Ei vielä tee oikeaa varausta, mutta logiikkapaikat ovat valmiina (onSelectDuration, onSelectStart, onSubmit).

> Huom: käytän tässä `[(ngModel)]`-sidontaa → se vaatii `FormsModule`:n, mutta tuodaan se myöhemmin kun aletaan oikeasti käsitellä lomaketta logiikan kanssa. Tässä vaiheessa se voi aiheuttaa virheen. Jos haluat skeletonin täysin ilman lomakkeen toimivuutta, voidaan vaihtaa `[(ngModel)]` myöhemmin – mutta todennäköisesti haluat joka tapauksessa tuoda `FormsModule`:n, joten tehdään se nyt.

Lisätään se seuraavassa kohdassa AppComponentin tasolle.

#### 5.7 AppComponent päivittäminen
Tarvitaan:
* `BookingPageComponent` importiksi
* `FormsModule` globaalisti tai komponenttikohtaisesti (käytetään lomakkeessa ngModelia)

Helpoin: tuodaan `FormsModule` **BookingPageComponentin** kautta ReservationFormiin, mutta koska ReservationForm on standalone ja tuodaan jo CommonModule, me tarvitaan `FormsModule` juuri siellä:

Päivitetään ReservationFormComponent imports:
```ts
import { FormsModule } from '@angular/forms';

@Component({
  // ...
  standalone: true,
  imports: [CommonModule, FormsModule],
  // ...
})
export class ReservationFormComponent {
  // ...
}
```

👉 Päivitä siis `reservation-form.component.ts` näin:
```ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservationDurationMinutes } from '../core/models/reservation.model';

@Component({
  selector: 'app-reservation-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservation-form.component.html',
  styleUrls: ['./reservation-form.component.scss'],
})
export class ReservationFormComponent {
  // ... muu sisältö kuten yllä
}
```

Ja nyt päivitetään `AppComponent`, jotta se käyttää `BookingPageComponent`ia.
📄 `web/src/app/app.component.ts`
```ts
import { Component } from '@angular/core';
import { BookingPageComponent } from './booking/booking-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [BookingPageComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'Conference Room Booking App';
}
```

📄 `web/src/app/app.component.html`
```html
<main class="app-shell">
  <header class="app-header">
    <h1>{{ title }}</h1>
  </header>

  <section class="app-content">
    <app-booking-page></app-booking-page>
  </section>
</main>
```

`app.component.scss` voi jäädä ennalleen.

#### 5.8 Välitsekkaus
Nyt:

```bash
cd web
npm run build
npm start
```

Selaimessa pitäisi näkyä:
* yläreunassa otsikko “Conference Room Booking App”
* vasemmalla huonechibit ja “kalenteri”-laatikko
* oikealla viikkonappirivi + lomake, jossa:
  * kestovalinta
  * kellonaikachipit 08:00–16:30
  * kaksi tekstikenttää (nimi + host)
  * “Tallenna varaus” -nappi

Vielä mikään ei oikeasti puhu backendin kanssa tai laske vapaita slotteja – se tulee seuraavissa vaiheissa.

Kun build ja sovellus toimivat tässä vaiheessa, sano “ok” / “valmis”, niin mennään **Vaiheeseen 6: slottilogiikan ja menneisyyden disabloinnin suunnittelu + toteutus (ilman API-integraatiota)**.

---

### Kehote
valmis. Mennään vaiheeseen 6.

### Vastaus
Nyt tehdään slottien laskenta + menneisyyden disablointi. Tässä vaiheessa ei vielä puhuta backendin kanssa, mutta logiikka on valmis ottamaan varauksia huomioon heti kun ne tulevat stateen.

Teen kolme asiaa:
1. Slottilogiikan apufunktio (`slot.util.ts`)
2. Pieni siivous `BookingStateService`sta (turhat observablit pois)
3. `ReservationFormComponent` kytketään stateen + uusi slottilogiikka + disable menneisyys

#### 6.1 Slottilogiikka: `slot.util.ts`
📄 **Uusi tiedosto** `web/src/app/core/utils/slot.util.ts`
```ts
import {
  Reservation,
  ReservationDurationMinutes,
} from '../models/reservation.model';
import { UtcDateKey } from '../models/booking-state.model';
import {
  fromDateKeyUtc,
  toUtcIsoString,
  isStartInPast,
  parseUtcIsoString,
  toDateKeyUtc,
} from './date-time.util';

export interface SlotInfo {
  /** Näytettävä label esim. "10:00" */
  label: string;
  /** Slotin aloitusaika ISO 8601 UTC -muodossa */
  startIsoUtc: string;
  /** Onko slotti menneisyydessä nykyhetkeen nähden (UTC) */
  isPast: boolean;
  /** Onko slotilla päällekkäisyyttä olemassa olevien varausten kanssa */
  hasConflict: boolean;
  /** Käytetäänkö slotti disablettuna UI:ssa (isPast || hasConflict) */
  disabled: boolean;
}

/**
 * Suodattaa annetun varauslistan niin, että mukaan jää vain tietyä
 * UTC-kalenteripäivää koskevat varaukset.
 */
export function filterReservationsForDate(
  reservations: Reservation[],
  dateKey: UtcDateKey
): Reservation[] {
  return reservations.filter((r) => {
    const startDate = parseUtcIsoString(r.start);
    const startKey = toDateKeyUtc(startDate);
    return startKey === dateKey;
  });
}

/**
 * Laskee työpäivän slotit (30 min step) annetulle päivälle ja kestolle.
 *
 * - Kaikki ajat tulkitaan UTC:nä.
 * - Slotit, jotka ylittäisivät työpäivän loppuajan tai ovat menneisyydessä
 *   tai osuvat päällekkäin olemassa olevan varauksen kanssa, merkitään
 *   `disabled: true`.
 */
export function computeDaySlots(params: {
  dateKey: UtcDateKey;
  durationMinutes: ReservationDurationMinutes;
  workdayStartHour: number; // esim. 8
  workdayEndHour: number;   // esim. 17
  reservations: Reservation[];
}): SlotInfo[] {
  const {
    dateKey,
    durationMinutes,
    workdayStartHour,
    workdayEndHour,
    reservations,
  } = params;

  const baseDate = fromDateKeyUtc(dateKey);
  const slots: SlotInfo[] = [];

  const workdayStartMinutes = workdayStartHour * 60;
  const workdayEndMinutes = workdayEndHour * 60;

  for (let hour = workdayStartHour; hour < workdayEndHour; hour++) {
    for (const minute of [0, 30]) {
      const startMinutes = hour * 60 + minute;
      const endMinutes = startMinutes + durationMinutes;

      // Slotin täytyy mahtua työpäivän sisään
      if (endMinutes > workdayEndMinutes) {
        continue;
      }

      const slotDate = new Date(baseDate.getTime());
      slotDate.setUTCHours(hour, minute, 0, 0);

      const startIsoUtc = toUtcIsoString(slotDate);
      const label = formatLabel(hour, minute);

      const isPast = isStartInPast(startIsoUtc);
      const hasConflict = hasOverlapWithReservations(
        startIsoUtc,
        durationMinutes,
        reservations
      );

      slots.push({
        label,
        startIsoUtc,
        isPast,
        hasConflict,
        disabled: isPast || hasConflict,
      });
    }
  }

  return slots;
}

function formatLabel(hour: number, minute: number): string {
  const hh = hour.toString().padStart(2, '0');
  const mm = minute.toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

function hasOverlapWithReservations(
  startIsoUtc: string,
  durationMinutes: number,
  reservations: Reservation[]
): boolean {
  const start = parseUtcIsoString(startIsoUtc).getTime();
  const end = start + durationMinutes * 60_000;

  return reservations.some((r) => {
    const resStart = parseUtcIsoString(r.start).getTime();
    const resEnd = parseUtcIsoString(r.end).getTime();

    // Yksinkertainen intervallien päällekkäisyystarkistus:
    // [start, end) ja [resStart, resEnd) overlappaavat jos:
    return start < resEnd && end > resStart;
  });
}
```

**Lyhyesti:**
* `filterReservationsForDate` → poimii vain tietyn päivän varaukset (UTC-päiväavain).
* `computeDaySlots` → laskee 30 min stepillä slotit 8–17 välillä ja:
  * pudottaa pois slotit, jotka eivät mahdu työpäivän sisään
  * merkitsee `isPast` ja `hasConflict`
  * antaa valmiin `SlotInfo[]`, jota UI voi käyttää suoraan.

#### 6.2 Pieni siivous: BookingStateService (turhat selectit pois)
Siivotaan `BookingStateService` yksinkertaisemmaksi, koska nyt käytetään koko `state$`:a ReservationFormissa, eikä tarvita custom `select`-logiikkaa.
📄 **Päivitä** `web/src/app/core/services/booking-state.service.ts`:
```ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  BookingState,
  UtcDateKey,
} from '../models/booking-state.model';
import {
  Reservation,
  ReservationDurationMinutes,
  RoomId,
  ReservationId,
} from '../models/reservation.model';
import { todayDateKeyUtc } from '../utils/date-time.util';

@Injectable({
  providedIn: 'root',
})
export class BookingStateService {
  private readonly initialState: BookingState = {
    selectedRoomId: null,
    selectedDateKey: todayDateKeyUtc(),
    selectedDurationMinutes: 60,
    selectedStartIsoUtc: null,
    reservationsByRoomId: {},
  };

  private readonly stateSubject = new BehaviorSubject<BookingState>(
    this.initialState
  );

  /** Koko tila read-onlynä UI:lle */
  readonly state$ = this.stateSubject.asObservable();

  constructor() {}

  setSelectedRoomId(roomId: RoomId | null): void {
    this.patchState({ selectedRoomId: roomId });
  }

  setSelectedDateKey(dateKey: UtcDateKey): void {
    this.patchState({
      selectedDateKey: dateKey,
      selectedStartIsoUtc: null,
    });
  }

  setSelectedDurationMinutes(duration: ReservationDurationMinutes): void {
    this.patchState({
      selectedDurationMinutes: duration,
      selectedStartIsoUtc: null,
    });
  }

  setSelectedStartIsoUtc(startIsoUtc: string | null): void {
    this.patchState({ selectedStartIsoUtc: startIsoUtc });
  }

  setReservationsForRoom(roomId: RoomId, reservations: Reservation[]): void {
    const current = this.stateSubject.value;
    const updatedByRoom = {
      ...current.reservationsByRoomId,
      [roomId]: reservations,
    };

    this.patchState({ reservationsByRoomId: updatedByRoom });
  }

  removeReservationFromRoom(
    roomId: RoomId,
    reservationId: ReservationId
  ): void {
    const current = this.stateSubject.value;
    const currentList = current.reservationsByRoomId[roomId] ?? [];
    const nextList = currentList.filter((r) => r.id !== reservationId);

    const updatedByRoom = {
      ...current.reservationsByRoomId,
      [roomId]: nextList,
    };

    this.patchState({ reservationsByRoomId: updatedByRoom });
  }

  resetSelectionForNewReservation(): void {
    const current = this.stateSubject.value;
    this.patchState({
      selectedStartIsoUtc: null,
      selectedDurationMinutes: current.selectedDurationMinutes,
    });
  }

  resetAll(): void {
    this.stateSubject.next(this.initialState);
  }

  private patchState(partial: Partial<BookingState>): void {
    const current = this.stateSubject.value;
    const next: BookingState = {
      ...current,
      ...partial,
    };
    this.stateSubject.next(next);
  }
}
```

**Lyhyesti:**
* Ei enää custom `select`-metodia.
* `state$` on ainoa julkinen stream, jota UI voi kuunnella.

#### 6.3 ReservationFormComponent kytketään stateen + slottilogiikkaan
Nyt:
* lomake lukee `BookingStateService.state$`:sta
* laskee slotit `computeDaySlots`:lla
* disabloi menneet slotit ja (myöhemmin) päällekkäiset
* päivittää `BookingStateService`en valitun keston ja aloitusajan

##### 6.3.1 Päivitä TS
📄 **Päivitä** `web/src/app/booking/reservation-form.component.ts`
```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ReservationDurationMinutes } from '../core/models/reservation.model';
import { BookingStateService } from '../core/services/booking-state.service';
import {
  SlotInfo,
  computeDaySlots,
  filterReservationsForDate,
} from '../core/utils/slot.util';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-reservation-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservation-form.component.html',
  styleUrls: ['./reservation-form.component.scss'],
})
export class ReservationFormComponent implements OnInit, OnDestroy {
  readonly durations: ReservationDurationMinutes[] = [30, 60, 120, 180];

  /** Tällä hetkellä valittu kesto (synkassa BookingStateServicen kanssa) */
  selectedDuration: ReservationDurationMinutes = 60;

  /** Kaikki slotit tälle päivälle ja kestolle */
  timeSlots: SlotInfo[] = [];

  /** Tällä hetkellä valittu slot (ISO UTC) */
  selectedStartIsoUtc: string | null = null;

  /** Lomakekentät */
  title = '';
  host = '';

  private subscription?: Subscription;

  constructor(private readonly bookingState: BookingStateService) {}

  ngOnInit(): void {
    this.subscription = this.bookingState.state$.subscribe((state) => {
      const roomId = state.selectedRoomId;
      const dateKey = state.selectedDateKey;
      const duration = state.selectedDurationMinutes;

      this.selectedDuration = duration;
      this.selectedStartIsoUtc = state.selectedStartIsoUtc;

      const allReservationsForRoom = roomId
        ? state.reservationsByRoomId[roomId] ?? []
        : [];

      const reservationsForDay = filterReservationsForDate(
        allReservationsForRoom,
        dateKey
      );

      this.timeSlots = computeDaySlots({
        dateKey,
        durationMinutes: duration,
        workdayStartHour: environment.workdayStartHour,
        workdayEndHour: environment.workdayEndHour,
        reservations: reservationsForDay,
      });
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onSelectDuration(duration: ReservationDurationMinutes): void {
    this.bookingState.setSelectedDurationMinutes(duration);
  }

  onSelectStart(slot: SlotInfo): void {
    if (slot.disabled) {
      return;
    }
    this.bookingState.setSelectedStartIsoUtc(slot.startIsoUtc);
  }

  onSubmit(): void {
    // Tässä vaiheessa vain skeleton – ei vielä API-kutsua.
    // Tarkistetaan kuitenkin, että pakolliset kentät ovat olemassa.
    if (!this.selectedStartIsoUtc || !this.title || !this.host) {
      console.warn('Varaus ei ole validi (puuttuu kenttiä), skeleton-vaihe.');
      return;
    }

    console.log('Submit skeleton', {
      duration: this.selectedDuration,
      startIsoUtc: this.selectedStartIsoUtc,
      title: this.title,
      host: this.host,
    });
  }
}
```

**Lyhyesti:**
* `ngOnInit` kuuntelee koko booking-statea ja laskee slotit aina, kun:
  * huone, päivä, kesto, varaukset tai valittu startti muuttuvat.
* `timeSlots` sisältää kaikki slotit + tiedon onko ne menneisyydessä/conflict.
* `onSelectDuration` ja `onSelectStart` päivittävät **BookingStateServiceen** arvot → koko appi pysyy synkassa, kun myöhemmin muut komponentit liittyvät samaan stateen.

##### 6.3.2 Päivitä HTML
📄 **Päivitä** `web/src/app/booking/reservation-form.component.html`
```html
<form class="reservation-form" (ngSubmit)="onSubmit()">
  <div class="reservation-form__group">
    <label class="reservation-form__label">Kesto</label>
    <div class="reservation-form__chips">
      <button
        *ngFor="let d of durations"
        type="button"
        class="reservation-form__chip"
        [class.reservation-form__chip--active]="d === selectedDuration"
        (click)="onSelectDuration(d)"
      >
        {{ d }} min
      </button>
    </div>
  </div>

  <div class="reservation-form__group">
    <label class="reservation-form__label">Aloitusaika</label>
    <div class="reservation-form__slots">
      <button
        *ngFor="let slot of timeSlots"
        type="button"
        class="reservation-form__slot"
        [class.reservation-form__slot--active]="
          slot.startIsoUtc === selectedStartIsoUtc
        "
        [class.reservation-form__slot--disabled]="slot.disabled"
        (click)="onSelectStart(slot)"
        [disabled]="slot.disabled"
      >
        {{ slot.label }}
      </button>
    </div>
  </div>

  <div class="reservation-form__group">
    <label class="reservation-form__label" for="title">Kokouksen nimi</label>
    <input
      id="title"
      type="text"
      class="reservation-form__input"
      [(ngModel)]="title"
      name="title"
      required
      maxlength="100"
      placeholder="Esim. Tiimipalaveri"
    />
  </div>

  <div class="reservation-form__group">
    <label class="reservation-form__label" for="host">Järjestäjä</label>
    <input
      id="host"
      type="text"
      class="reservation-form__input"
      [(ngModel)]="host"
      name="host"
      required
      maxlength="100"
      placeholder="Esim. Tiimi X"
    />
  </div>

  <div class="reservation-form__actions">
    <button type="submit" class="reservation-form__submit">
      Tallenna varaus
    </button>
  </div>
</form>
```

**Lyhyesti:**
* Slotit tulostetaan `timeSlots`-taulukosta.
* `disabled`-slotit ovat sekä visuaalisesti harmaita että teknisesti `disabled`.

##### 6.3.3 Päivitä SCSS (disabled-tila sloteille)
📄 **Päivitä** `web/src/app/booking/reservation-form.component.scss`
Lisää/korjaa slot-tyylejä:
```scss
.reservation-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reservation-form__group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.reservation-form__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
}

.reservation-form__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.reservation-form__chip {
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.85rem;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  cursor: pointer;
}

.reservation-form__chip--active {
  background: #0f172a;
  color: #f9fafb;
  border-color: #0f172a;
}

.reservation-form__slots {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.reservation-form__slot {
  min-width: 3.4rem;
  border-radius: 999px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.reservation-form__slot--active {
  background: #0f172a;
  color: #f9fafb;
  border-color: #0f172a;
}

.reservation-form__slot--disabled {
  opacity: 0.35;
  cursor: default;
}

.reservation-form__input {
  border-radius: 0.5rem;
  border: 1px solid #cbd5e1;
  padding: 0.45rem 0.6rem;
  font-size: 0.9rem;
}

.reservation-form__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.reservation-form__submit {
  border-radius: 999px;
  border: none;
  padding: 0.5rem 1.3rem;
  font-size: 0.9rem;
  font-weight: 600;
  background: #0f172a;
  color: #f9fafb;
  cursor: pointer;
}
```

#### 6.4 Välitsekkaus
Nyt:
```bash
cd web
npm run build
npm start
```

Selaimessa:
* Slottinapit näkyvät edelleen 8.00–17.00 alueelta.
* Jos ajat testatessa niin, että osa sloteista on menneisyydessä (UTC), niiden pitäisi olla:
  * harmaita
  * disablettuja (ei klikattavissa).
* Varauslistaa ei vielä ole (state.reservationsByRoomId on tyhjä), joten konfliktien logiikka aktivoituu vasta, kun API-integraatio on kunnossa.

Kun build on jälleen ok ja UI toimii, kerro, niin mennään **Vaiheeseen 7: API-integraatio (GET/POST/DELETE) + varausten vieminen BookingStateServiceen**.

---

### Kehote
Tällä hetkellä kaikki slotit ovat aina harmaina/disabled, koska päivä valinta ei ole vielä toiminnassa. Mutta kokouksen kesto vaikuttaa siihen mitkä slotit ovat saatavilla 8-177 aikavälin lopussa. Jos tämä on se tilanne, missä koodin kuuluisi olla voit siirtyä seuraavaan vaiheeseen.

### Vastaus
Jep, tuo tilanne (päivävalinta ei vielä vaikuta ja menneisyys-logiikka ohjaa) on ihan ok tähän väliin. Nyt tehdään **vaihe 7: API-integraatio** – eli luonti + varausten haku (DELETE jätetään teknisesti valmiiksi, mutta käytännön UI-käyttö tulee myöhemmin kalenterissa).

Tavoite tämän vaiheen jälkeen:
* Huoneen vaihto → haetaan kerran huoneen varaukset backerista ja talletetaan stateen.
* Lomakkeen submit → POST backendille → lisätään onnistunut varaus stateen → slottilogiikka alkaa huomioida sitä (päällekkäisyydet).

#### 7.1 BookingStateService: lisää `getSnapshot()`
Tarvitaan tapa lukea state synkronisesti lomakkeessa.
📄 **Päivitä** `web/src/app/core/services/booking-state.service.ts`
Lisää luokkaan:

```ts
  // ...

  resetAll(): void {
    this.stateSubject.next(this.initialState);
  }

  /** Palauttaa nykyisen tilan synkronisesti (esim. lomakkeen submitissa). */
  getSnapshot(): BookingState {
    return this.stateSubject.value;
  }

  private patchState(partial: Partial<BookingState>): void {
    const current = this.stateSubject.value;
    const next: BookingState = {
      ...current,
      ...partial,
    };
    this.stateSubject.next(next);
  }
}
```

**Mitä tämä tekee?**
* Mahdollistaa sen, että esim. `ReservationFormComponent` voi yhdestä paikasta lukea:
  * valitun huoneen
  * valitun päivän
  * valitun keston
  * valitun aloitusajan.

#### 7.2 BookingPageComponent: huoneen varausten haku backendistä
Kun huone vaihtuu (tai ensimmäinen huone alustetaan), haetaan juuri sen huoneen varaukset **kerran** ja talletetaan ne BookingStateServiceen.

📄 **Päivitä** `web/src/app/booking/booking-page.component.ts`
```ts
import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Room } from '../core/models/room.model';
import { BookingStateService } from '../core/services/booking-state.service';
import { ReservationsApiService } from '../core/services/reservations-api.service';
import { RoomSelectorComponent } from './room-selector.component';
import { WeekStripComponent } from './week-strip.component';
import { MonthCalendarComponent } from './month-calendar.component';
import { ReservationFormComponent } from './reservation-form.component';

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [
    CommonModule,
    RoomSelectorComponent,
    WeekStripComponent,
    MonthCalendarComponent,
    ReservationFormComponent,
  ],
  templateUrl: './booking-page.component.html',
  styleUrls: ['./booking-page.component.scss'],
})
export class BookingPageComponent implements OnDestroy {
  readonly rooms: Room[] = [
    { id: 'room-a', name: 'Room A' },
    { id: 'room-b', name: 'Room B' },
    { id: 'room-c', name: 'Room C' },
  ];

  private subscription?: Subscription;
  /** Pidetään kirjaa huoneista, joille varaukset on jo ladattu. */
  private loadedRoomIds = new Set<string>();

  constructor(
    private readonly bookingState: BookingStateService,
    private readonly reservationsApi: ReservationsApiService
  ) {
    // Alusta oletushuoneeksi ensimmäinen listasta
    const defaultRoomId = this.rooms[0]?.id ?? null;
    if (defaultRoomId) {
      this.bookingState.setSelectedRoomId(defaultRoomId);
      this.loadReservationsForRoomIfNeeded(defaultRoomId);
    }

    // Kuunnellaan huoneen vaihtumista ja haetaan varaukset uudelle huoneelle
    this.subscription = this.bookingState.state$.subscribe((state) => {
      const roomId = state.selectedRoomId;
      if (roomId) {
        this.loadReservationsForRoomIfNeeded(roomId);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onRoomSelected(roomId: string): void {
    this.bookingState.setSelectedRoomId(roomId);
    // varmuuden vuoksi varmistetaan haku tässäkin
    this.loadReservationsForRoomIfNeeded(roomId);
  }

  private loadReservationsForRoomIfNeeded(roomId: string): void {
    if (this.loadedRoomIds.has(roomId)) {
      return;
    }

    this.reservationsApi.getRoomReservations(roomId).subscribe({
      next: (reservations) => {
        this.bookingState.setReservationsForRoom(roomId, reservations);
        this.loadedRoomIds.add(roomId);
      },
      error: (error) => {
        console.error('Virhe haettaessa varauksia huoneelle', roomId, error);
      },
    });
  }
}
```

**Mitä tämä tekee?**
* Ensimmäinen huone (Room A) saa varaukset heti, kun sivu avataan.
* Kun käyttäjä vaihtaa huonetta:
  * jos ko. huoneelle ei ole vielä haettu varauksia → haetaan kerran.
* Varauslista menee BookingStateServiceen → slottilogiikka alkaa heti huomioida päällekkäisyydet.

#### 7.3 ReservationFormComponent: varauksen luonti backendillä
Nyt lomake tekee oikeasti POST-backendiin ja päivittää statea.
📄 **Päivitä** `web/src/app/booking/reservation-form.component.ts`
```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Reservation, ReservationDurationMinutes } from '../core/models/reservation.model';
import { BookingStateService } from '../core/services/booking-state.service';
import {
  SlotInfo,
  computeDaySlots,
  filterReservationsForDate,
} from '../core/utils/slot.util';
import { environment } from '../../environments/environment';
import { ReservationsApiService } from '../core/services/reservations-api.service';

@Component({
  selector: 'app-reservation-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservation-form.component.html',
  styleUrls: ['./reservation-form.component.scss'],
})
export class ReservationFormComponent implements OnInit, OnDestroy {
  readonly durations: ReservationDurationMinutes[] = [30, 60, 120, 180];

  selectedDuration: ReservationDurationMinutes = 60;
  timeSlots: SlotInfo[] = [];
  selectedStartIsoUtc: string | null = null;

  title = '';
  host = '';

  private subscription?: Subscription;

  constructor(
    private readonly bookingState: BookingStateService,
    private readonly reservationsApi: ReservationsApiService
  ) {}

  ngOnInit(): void {
    this.subscription = this.bookingState.state$.subscribe((state) => {
      const roomId = state.selectedRoomId;
      const dateKey = state.selectedDateKey;
      const duration = state.selectedDurationMinutes;

      this.selectedDuration = duration;
      this.selectedStartIsoUtc = state.selectedStartIsoUtc;

      const allReservationsForRoom = roomId
        ? state.reservationsByRoomId[roomId] ?? []
        : [];

      const reservationsForDay = filterReservationsForDate(
        allReservationsForRoom,
        dateKey
      );

      this.timeSlots = computeDaySlots({
        dateKey,
        durationMinutes: duration,
        workdayStartHour: environment.workdayStartHour,
        workdayEndHour: environment.workdayEndHour,
        reservations: reservationsForDay,
      });
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onSelectDuration(duration: ReservationDurationMinutes): void {
    this.bookingState.setSelectedDurationMinutes(duration);
  }

  onSelectStart(slot: SlotInfo): void {
    if (slot.disabled) {
      return;
    }
    this.bookingState.setSelectedStartIsoUtc(slot.startIsoUtc);
  }

  onSubmit(): void {
    const snapshot = this.bookingState.getSnapshot();
    const roomId = snapshot.selectedRoomId;
    const duration = snapshot.selectedDurationMinutes;
    const startIsoUtc = snapshot.selectedStartIsoUtc;

    if (!roomId || !startIsoUtc || !this.title || !this.host) {
      console.warn('Varaus ei ole validi (puuttuu kenttiä), ei lähetetä.');
      return;
    }

    const request = {
      roomId,
      durationMinutes: duration,
      start: startIsoUtc,
      title: this.title,
      host: this.host,
    };

    this.reservationsApi.createReservation(request).subscribe({
      next: (created: Reservation) => {
        // Päivitetään huoneen varauslista lisäämällä uusi varaus
        const current = this.bookingState.getSnapshot();
        const existingForRoom =
          current.reservationsByRoomId[roomId] ?? [];
        const updatedForRoom = [...existingForRoom, created];

        this.bookingState.setReservationsForRoom(
          roomId,
          updatedForRoom
        );

        // Resetoi uusi-varaus -valinnat (mutta pidä huone ja päivä)
        this.bookingState.resetSelectionForNewReservation();

        // Tyhjennetään kentät
        this.title = '';
        this.host = '';

        console.log('Varaus luotu', created);
      },
      error: (error) => {
        // Tässä vaiheessa vain konsoli – myöhemmin näytetään käyttäjälle virhe
        console.error('Varauksen luonti epäonnistui', error);
      },
    });
  }
}
```

**Mitä tämä tekee?**
* `onSubmit` lukee koko tilannekuvan BookingStateServicestä:
  * valittu huone
  * valittu kesto
  * valittu aloitusaika
* Rakentaa `CreateReservationRequest`in → POST backendille.
* Onnistumisessa:
  * nappaa nykyisen huoneen varaustaulukon,
  * lisää uuden varauksen listaan,
  * tallettaa takaisin stateen (`setReservationsForRoom`),
  * käyttää `resetSelectionForNewReservation()` → slottivalinta tyhjenee,
  * tyhjentää `title` + `host` -kentät.

Slottilogiikka alkaa nyt **oikeasti** huomioida päällekkäisyydet, koska `computeDaySlots` saa päivitetyn `reservations`-listan.

#### 7.4 (Teknisesti) Delete-valmius
DELETE-endpoint on jo `ReservationsApiService`ssa. Tässä vaiheessa emme vielä rakenna UI:ta sen ympärille, mutta state-puoli on valmis:

* `BookingStateService.removeReservationFromRoom(roomId, reservationId)`
* `ReservationsApiService.deleteReservation(roomId, reservationId)`
Kun myöhemmin lisätään kalenterin “klikkaa varausta → dialogi → poista” -logiikka, tarvitsemme vain:
```ts
this.reservationsApi.deleteReservation(roomId, reservationId).subscribe({
  next: () => this.bookingState.removeReservationFromRoom(roomId, reservationId),
  // error: ...
});
```

#### 7.5 Välitsekkaus
Aja:
```bash
cd web
npm run build
npm start
```

Testaa:
1. Kun sovellus avautuu:
   * Room A:n varaukset haetaan backendistä (jos mitään ei ole, lista on tyhjä → ei konflikteja).
2. Valitse kesto + aloitusaika + syötä title & host → “Tallenna varaus”.
   * Backendin pitäisi luoda varaus.
   * Slottinäkymässä kyseinen slot+väli pitäisi nyt mennä `disabled`-tilaan, koska `computeDaySlots` havaitsee päällekkäisyyden.
3. Jos luot toisen varauksen päällekkäiseen aikaan, backendin business-säännöt kieltävät sen – nyt näemme virheen konsolissa (UI-virheilmoitus tulee myöhemmin).

Kun build toimii ja perusflow (luonti + slotin disabloituminen) pelaa, sano vain, niin siirrytään seuraavaksi kalenterin ja viikonäkymän kytkemiseen samaan stateen + myöhemmin poistoon.

---

### Kehote
En voi testata toiminnallisuutta UI:ssa, koska appi ei tunnista nykyistä päivää, enkä voi vaihtaa päivää tulevaisuuteen. 

### Vastaus
Jep, hyvä huomio – ilman päivävalintaa et pääse ikinä tulevaisuuteen, joten kaikki slotit voivat hyvin olla menneisyyttä. Korjataan tämä nyt ennen kuin jatketaan seuraaviin vaiheisiin.

Tehdään kolme konkreettista muutosta:
1. Lisätään util-funktio päivien siirtelyyn (`addDaysToDateKey`)
2. Toteutetaan **WeekStripComponent** oikeasti toimivaksi (valinta + viikkonavigaatio)
3. Kytketään WeekStrip BookingStateServiceen (jolloin myös slotit alkaa toimia järkevämmin)

#### 1) Päivän siirtely utiliin: `addDaysToDateKey`
📄 **Päivitä** `web/src/app/core/utils/date-time.util.ts`
Lisää tiedoston loppuun tämä funktio:
```ts
/**
 * Lisää tai vähentää päiviä "YYYY-MM-DD" -päiväavaimesta (UTC).
 */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = fromDateKeyUtc(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKeyUtc(date);
}
```

Tämä auttaa meitä siirtämään viikkoa eteen/taaksepäin WeekStripissä.

#### 2) Viikkonäkymä oikeaksi: `WeekStripComponent`
##### 2.1 TS – logiikka
📄 **Päivitä kokonaan** `web/src/app/booking/week-strip.component.ts`:
```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BookingStateService } from '../core/services/booking-state.service';
import { UtcDateKey } from '../core/models/booking-state.model';
import {
  fromDateKeyUtc,
  toDateKeyUtc,
  todayDateKeyUtc,
  addDaysToDateKey,
} from '../core/utils/date-time.util';

interface WeekDayViewModel {
  dateKey: UtcDateKey;
  labelShort: string;   // esim. "Ma"
  dayOfMonth: number;   // esim. 28
  isSelected: boolean;
  isPast: boolean;
}

@Component({
  selector: 'app-week-strip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './week-strip.component.html',
  styleUrls: ['./week-strip.component.scss'],
})
export class WeekStripComponent implements OnInit, OnDestroy {
  days: WeekDayViewModel[] = [];

  private subscription?: Subscription;

  constructor(private readonly bookingState: BookingStateService) {}

  ngOnInit(): void {
    this.subscription = this.bookingState.state$.subscribe((state) => {
      this.buildWeek(state.selectedDateKey);
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onPrevWeek(): void {
    const snapshot = this.bookingState.getSnapshot();
    const newDateKey = addDaysToDateKey(snapshot.selectedDateKey, -7);
    this.bookingState.setSelectedDateKey(newDateKey);
  }

  onNextWeek(): void {
    const snapshot = this.bookingState.getSnapshot();
    const newDateKey = addDaysToDateKey(snapshot.selectedDateKey, +7);
    this.bookingState.setSelectedDateKey(newDateKey);
  }

  onSelectDay(day: WeekDayViewModel): void {
    if (day.isPast) {
      return;
    }
    this.bookingState.setSelectedDateKey(day.dateKey);
  }

  private buildWeek(selectedDateKey: UtcDateKey): void {
    const selectedDate = fromDateKeyUtc(selectedDateKey);
    const todayKey = todayDateKeyUtc();

    // Haetaan viikon maanantai (UTC)
    const jsDay = selectedDate.getUTCDay(); // 0=Su,1=Ma,...6=La
    const diffToMonday = (jsDay + 6) % 7;  // Ma ->0, Ti->1, Su->6
    const monday = new Date(selectedDate.getTime());
    monday.setUTCDate(monday.getUTCDate() - diffToMonday);

    const days: WeekDayViewModel[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime());
      d.setUTCDate(monday.getUTCDate() + i);

      const dateKey = toDateKeyUtc(d);
      const isPast = dateKey < todayKey; // string-vertailu toimii muodon vuoksi
      const isSelected = dateKey === selectedDateKey;

      days.push({
        dateKey,
        labelShort: this.getWeekdayLabel(d.getUTCDay()),
        dayOfMonth: d.getUTCDate(),
        isSelected,
        isPast,
      });
    }

    this.days = days;
  }

  private getWeekdayLabel(jsDay: number): string {
    // 0=Su, 1=Ma, ..., 6=La
    const labels = ['Su', 'Ma', 'Ti', 'Ke', 'To', 'Pe', 'La'];
    return labels[jsDay] ?? '';
  }
}
```

**Mitä tämä tekee?**
* Laskee aina **valitun päivän** perusteella kuluvan viikon (ma–su).
* Merkitsee menneet päivät `isPast = true` (täysin disabloitaviksi).
* Nuolinapit siirtävät `selectedDateKey`iä ±7 päivää.
* Päivän klikkaus (jos ei menneisyydessä) päivittää `BookingStateService`n `selectedDateKey`in → tämä vaikuttaa myös slotti-laskentaan.

##### 2.2 HTML – dynaaminen lista
📄 **Päivitä** `web/src/app/booking/week-strip.component.html`:
```html
<div class="week-strip">
  <button type="button" class="week-strip__nav" (click)="onPrevWeek()">
    &larr;
  </button>

  <div class="week-strip__days">
    <button
      *ngFor="let day of days"
      type="button"
      class="week-strip__day"
      [class.week-strip__day--active]="day.isSelected"
      [class.week-strip__day--disabled]="day.isPast"
      (click)="onSelectDay(day)"
      [disabled]="day.isPast"
    >
      {{ day.labelShort }}
      <span class="week-strip__day-date">{{ day.dayOfMonth }}</span>
    </button>
  </div>

  <button type="button" class="week-strip__nav" (click)="onNextWeek()">
    &rarr;
  </button>
</div>
```

SCSS: aiempi tyyli käy, lisätään vain varmistukseksi disabled-luokka (jos ei vielä ole):
📄 `web/src/app/booking/week-strip.component.scss` (täydennyksenä)
```scss
.week-strip {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.week-strip__nav {
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  padding: 0.25rem 0.7rem;
  cursor: pointer;
}

.week-strip__days {
  display: flex;
  flex: 1;
  justify-content: space-between;
  gap: 0.4rem;
}

.week-strip__day {
  flex: 1;
  padding: 0.4rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}

.week-strip__day-date {
  font-weight: 600;
}

.week-strip__day--active {
  background: #0f172a;
  color: #f9fafb;
  border-color: #0f172a;
}

.week-strip__day--disabled {
  opacity: 0.5;
  cursor: default;
}
```

#### 3) Mitä nyt pitäisi tapahtua?
Kun ajat:
```bash
cd web
npm run build
npm start
```

Nyt:
1. Week-strip näyttää **kuluvan viikon** (UTC-päivinä, mutta käytännössä sama kalenteripäivä).
2. Kaikki **ennen tämän päivän** päivät ovat harmaita ja disabloituja.
3. Voit:
   * klikata tämän päivän (jos ei jo valittuna),
   * klikata tulevia päiviä,
   * siirtyä viikkoja eteen/taakse nuolinapeilla ja valita tulevien viikkojen päiviä.
4. `selectedDateKey` päivittyy BookingStateServiceen → slottilogiikka (`computeDaySlots`) laskee slotit valitulle päivälle, eikä niiden **kaikkien** pitäisi enää olla menneisyydessä, jos valitset tulevaisuuden päivän.

Eli nyt sinun pitäisi pystyä:
* valitsemaan esim. huominen päivä week-stripistä
* valitsemaan sopivan slotin (sen ei pitäisi olla disabled)
* luomaan varaus ja nähdä, että juuri luotu slot menee conflict-tilaan (disable) kyseiselle päivälle.

Testaa ensin, että build menee läpi ja UI:ssa pystyt vaihtamaan päivää tulevaisuuteen ja valitsemaan slotin. Kun se toimii, voidaan jatkaa seuraavassa vaiheessa kuukaudenäkymän ja varausten näyttämisen parantamiseen.

---

### Kehote
uuden varauksen luonti ei onnistunut CORS ongelman vuoksi:

Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:3000/rooms/room-a/reservations. (Reason: CORS header ‘Access-Control-Allow-Origin’ missing). Status code: 404.
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at http://localhost:3000/rooms/room-a/reservations. (Reason: CORS request did not succeed). Status code: (null).
Varauksen luonti epäonnistui 
Object { headers: {…}, status: 0, statusText: "Unknown Error", url: "http://localhost:3000/rooms/room-a/reservations", ok: false, type: undefined, redirected: undefined, responseType: undefined, name: "HttpErrorResponse", message: "Http failure response for http://localhost:3000/rooms/room-a/reservations: 0 Unknown Error", … }

Korjaa tämä ennen kuin jatketaan eteenpäin.

### Vastaus
Hyvä että nappasit tuon kiinni – tämä on selvästi backendin CORS- ja preflight-ongelma, ei frontendin. Korjataan se Fastifyn puolelta.

Selaimen virheestä näkee kaksi asiaa:

* `Access-Control-Allow-Origin` puuttuu → CORS ei ole konffattu
* status 404 → hyvin todennäköisesti **OPTIONS-preflight** osuu routeen, jota ei ole, kunnes otetaan CORS-plugin käyttöön

Alla konkreettiset muutokset.

#### 1. Asenna CORS-plugin backend-projektiin
Backendin juureen (ei `web/`-kansioon) – siellä missä Fastify ja ts-node on:
```bash
npm install @fastify/cors
```

Varmista että tämä menee samaan projektiin, jossa `fastify` on dependency (se missä sun `/mnt/data/package.json` on).

#### 2. Rekisteröi CORS Fastifyssa
Etsi backendistä tiedosto, jossa luot Fastify-instansen, tyyliin:
* `src/index.ts`
* tai `src/server.ts`
* tms.
Lisää sinne CORS-registeröinti **ennen routejen rekisteröintiä**.

Esimerkki TypeScript-bootsrapista:
```ts
import fastify from 'fastify';
import cors from '@fastify/cors';

const app = fastify({
  logger: true,
});

async function main() {
  await app.register(cors, {
    origin: 'http://localhost:4200', // Angular dev server
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  });

  // TÄSSÄ rekisteröidään kaikki /rooms/... routet
  // app.get('/rooms/:roomId/reservations', ...)
  // app.post('/rooms/:roomId/reservations', ...)
  // app.delete('/rooms/:roomId/reservations/:reservationId', ...)

  const port = 3000;
  await app.listen({ port });
  console.log(`API listening on http://localhost:${port}`);
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
```

Pääpointit:
* `origin: 'http://localhost:4200'` vastaa Angular dev -palvelinta
  (voit halutessasi devissä käyttää myös `origin: true` tai `origin: '*'`, mutta tämä on siistein ja selkein).
* `methods` ja `allowedHeaders` varmistavat, että **OPTIONS-preflight** hyväksytään ja browser saa tarvittavat CORS-headerit.
`@fastify/cors` hoitaa:
* `OPTIONS`-preflightin routeille kuten `POST /rooms/:roomId/reservations`
* lisää `Access-Control-Allow-Origin`-headerin vastauksiin

#### 3. Varmista URL-path
Angularin puolella kutsutaan URL:ia:
```ts
http://localhost:3000/rooms/room-a/reservations
```

Varmista että Fastifyssa route on myös täsmälleen:
```ts
app.post('/rooms/:roomId/reservations', ...)
app.get('/rooms/:roomId/reservations', ...)
```

Jos sulla on jokin API-prefix, esim. `/api/rooms/:roomId/reservations`, niin silloin:
* **joko** muutat backendin routeja
* **tai** päivität Angularin `environment.apiBaseUrl` arvoksi `http://localhost:3000/api`.

Tällä hetkellä `apiBaseUrl` on `http://localhost:3000`, joten polku oletetaan olevan ilman `/api`-prefiksiä.

#### 4. Käynnistä backend uudelleen
Kun:
* `@fastify/cors` on asennettu
* se on rekisteröity oikein
* ja backend pyörii portissa 3000

→ Kokeile taas:
1. Käynnistä backend uudestaan
2. `cd web && npm start`
3. Valitse tuleva päivä week-stripistä
4. Valitse slot + syötä title & host
5. “Tallenna varaus”

Odotettu tilanne onnistuneen korjauksen jälkeen:
* Konsoli ei enää huuda CORS-virhettä
* Varauksen luonti onnistuu
* Sama slotti menee lomakkeen slottirivillä harmaaksi (disabled), koska se on nyt päällekkäinen olemassa olevan varauksen kanssa.

Kun saat POSTin kulkemaan ilman CORS-pommeja, kerro, niin jatketaan siitä (seuraavaksi varausten näkyvä listaus kalenterissa + poisto).

---

### Kehote
CORS virhe on nyt korjattu ja POST operaatio frontendin kautta toimii. Samoin slottien saatavuus jo olemassa olevien varausten mukaan toimii. Voidaan siirtyä seuraavaan vaiheeseen

### Vastaus
Hyvä, nyt päästään siihen että varaukset alkaa oikeasti näkyä kalenterissa. 🌞

Seuraava vaihe: **kuukausikalenteri, joka**
* näyttää oikean kuukauden
* heijastaa valittua päivää (BookingState)
* näyttää huoneen varaukset päivien sisällä tekstinä
* antaa valita päivän (menneet päivät disabloitu)

Poisto jätetään vielä seuraavaan vaiheeseen, jotta tämä pysyy selkeänä.

#### Vaihe 8: MonthCalendar – oikea logiikka + varausten näyttö
##### 8.1 Laajennetaan date-utilia kuukausilogiikalle
📄 **Päivitä** `web/src/app/core/utils/date-time.util.ts` – lisää loppuun:
```ts
/**
 * Lisää tai vähentää päiviä "YYYY-MM-DD" -päiväavaimesta (UTC).
 */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = fromDateKeyUtc(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKeyUtc(date);
}

/**
 * Lisää tai vähentää kuukausia "YYYY-MM-DD" -päiväavaimesta (UTC) siten,
 * että päivä pysyy samana tai clampataan kuukauden loppuun.
 */
export function addMonthsToDateKey(dateKey: string, months: number): string {
  const date = fromDateKeyUtc(dateKey);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-11
  const day = date.getUTCDate();

  const targetMonthIndex = month + months;
  const targetYear =
    year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth =
    ((targetMonthIndex % 12) + 12) % 12; // modulo, joka toimii myös negatiivisille

  // Asetetaan päivä 1, sitten lisätään päivä offset myöhemmin
  const firstOfTarget = new Date(Date.UTC(targetYear, normalizedMonth, 1, 0, 0, 0, 0));
  const maxDayInMonth = daysInMonth(firstOfTarget);

  const clampedDay = Math.min(day, maxDayInMonth);
  const finalDate = new Date(Date.UTC(targetYear, normalizedMonth, clampedDay, 0, 0, 0, 0));

  return toDateKeyUtc(finalDate);
}

function daysInMonth(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-11
  // Kuukauden viimeinen päivä = seuraavan kuukauden 0. päivä
  const lastDay = new Date(Date.UTC(year, month + 1, 0, 0, 0, 0, 0));
  return lastDay.getUTCDate();
}

/**
 * Palauttaa kuukauden nimen suomeksi (esim. "tammikuu").
 */
export function getMonthNameFi(date: Date): string {
  const names = [
    'tammikuu',
    'helmikuu',
    'maaliskuu',
    'huhtikuu',
    'toukokuu',
    'kesäkuu',
    'heinäkuu',
    'elokuu',
    'syyskuu',
    'lokakuu',
    'marraskuu',
    'joulukuu',
  ];
  return names[date.getUTCMonth()] ?? '';
}
```

> 📝 Huom: `addDaysToDateKey` meillä jo on (jos ehdit lisätä sen edellisessä vaiheessa) – jos se on jo olemassa, älä tuplaa sitä, lisää vain `addMonthsToDateKey`, `daysInMonth`, `getMonthNameFi`.

##### 8.2 Päiväkohtaisten varaussummien generointi
Hyödynnetään jo tehtyä `filterReservationsForDate`-funktiota ja `formatTimeFromUtcIso`a.
📄 **Päivitä** `web/src/app/core/utils/slot.util.ts` – lisää helper:
```ts
import {
  Reservation,
  ReservationDurationMinutes,
} from '../models/reservation.model';
import { UtcDateKey } from '../models/booking-state.model';
import {
  fromDateKeyUtc,
  toUtcIsoString,
  isStartInPast,
  parseUtcIsoString,
  toDateKeyUtc,
  formatTimeFromUtcIso,
} from './date-time.util';

// ... SlotInfo, filterReservationsForDate, computeDaySlots, jne. ennallaan ...

/**
 * Muodostaa käyttäjälle näytettävän lyhyen tekstin yhdelle varaukselle,
 * muotoa:
 *
 * "10:00-11:30 Tiimipalaveri, Tiimi X"
 */
export function formatReservationSummary(reservation: Reservation): string {
  const startLabel = formatTimeFromUtcIso(reservation.start);
  const endLabel = formatTimeFromUtcIso(reservation.end);
  return `${startLabel}-${endLabel} ${reservation.title}, ${reservation.host}`;
}
```

##### 8.3 Kuukausikalenterin logiikka – `MonthCalendarComponent`
Korvataan skeleton oikealla toteutuksella.
###### 8.3.1 TS
📄 **Päivitä kokonaan** `web/src/app/booking/month-calendar.component.ts`:
```ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { BookingStateService } from '../core/services/booking-state.service';
import { UtcDateKey } from '../core/models/booking-state.model';
import {
  addMonthsToDateKey,
  fromDateKeyUtc,
  getMonthNameFi,
  toDateKeyUtc,
  todayDateKeyUtc,
} from '../core/utils/date-time.util';
import {
  filterReservationsForDate,
  formatReservationSummary,
} from '../core/utils/slot.util';
import { Reservation } from '../core/models/reservation.model';

interface MonthDayViewModel {
  dateKey: UtcDateKey;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isPast: boolean;
  summaries: string[]; // "10:00-11:30 Tiimipalaveri, Tiimi X"
}

@Component({
  selector: 'app-month-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './month-calendar.component.html',
  styleUrls: ['./month-calendar.component.scss'],
})
export class MonthCalendarComponent implements OnInit, OnDestroy {
  /** Päiväavaimet ruudussa (sis. edellisen/ seuraavan kuun päivät). */
  days: MonthDayViewModel[] = [];

  /** Teksti esim. "tammikuu 2026". */
  monthTitle = '';

  private currentMonthAnchorDateKey: UtcDateKey;
  private subscription?: Subscription;

  constructor(private readonly bookingState: BookingStateService) {
    // Ankkurikuukausi alussa = valitun päivän kuukausi
    this.currentMonthAnchorDateKey =
      bookingState.getSnapshot().selectedDateKey;
  }

  ngOnInit(): void {
    this.subscription = this.bookingState.state$.subscribe((state) => {
      this.rebuildCalendar(
        state.selectedDateKey,
        state.selectedRoomId,
        state.reservationsByRoomId[state.selectedRoomId ?? ''] ?? []
      );
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onPrevMonth(): void {
    this.currentMonthAnchorDateKey = addMonthsToDateKey(
      this.currentMonthAnchorDateKey,
      -1
    );
    const snapshot = this.bookingState.getSnapshot();
    this.rebuildCalendar(
      snapshot.selectedDateKey,
      snapshot.selectedRoomId,
      snapshot.selectedRoomId
        ? snapshot.reservationsByRoomId[snapshot.selectedRoomId] ?? []
        : []
    );
  }

  onNextMonth(): void {
    this.currentMonthAnchorDateKey = addMonthsToDateKey(
      this.currentMonthAnchorDateKey,
      +1
    );
    const snapshot = this.bookingState.getSnapshot();
    this.rebuildCalendar(
      snapshot.selectedDateKey,
      snapshot.selectedRoomId,
      snapshot.selectedRoomId
        ? snapshot.reservationsByRoomId[snapshot.selectedRoomId] ?? []
        : []
    );
  }

  onSelectDay(day: MonthDayViewModel): void {
    if (day.isPast) {
      return;
    }
    this.bookingState.setSelectedDateKey(day.dateKey);
  }

  private rebuildCalendar(
    selectedDateKey: UtcDateKey,
    selectedRoomId: string | null,
    allReservationsForRoom: Reservation[]
  ): void {
    // Ankkuriksi currentMonthAnchorDateKey (huom: voi erota valitusta päivästä)
    const anchorDate = fromDateKeyUtc(this.currentMonthAnchorDateKey);
    const year = anchorDate.getUTCFullYear();
    const month = anchorDate.getUTCMonth(); // 0-11

    const firstOfMonth = new Date(
      Date.UTC(year, month, 1, 0, 0, 0, 0)
    );
    const firstJsDay = firstOfMonth.getUTCDay(); // 0=Su,...6=La
    const diffToMonday = (firstJsDay + 6) % 7;  // Ma->0, Ti->1, Su->6

    // Kalenterin ensimmäinen näkyvä päivä = kuukauden eka maanantai tai sitä edeltävä
    const gridStart = new Date(firstOfMonth.getTime());
    gridStart.setUTCDate(firstOfMonth.getUTCDate() - diffToMonday);

    const todayKey = todayDateKeyUtc();

    const days: MonthDayViewModel[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart.getTime());
      d.setUTCDate(gridStart.getUTCDate() + i);

      const dateKey = toDateKeyUtc(d);
      const isCurrentMonth = d.getUTCMonth() === month;
      const isPast = dateKey < todayKey;
      const isSelected = dateKey === selectedDateKey;

      let summaries: string[] = [];
      if (selectedRoomId) {
        const reservationsForDay = filterReservationsForDate(
          allReservationsForRoom,
          dateKey
        );
        summaries = reservationsForDay.map((r) =>
          formatReservationSummary(r)
        );
      }

      days.push({
        dateKey,
        dayOfMonth: d.getUTCDate(),
        isCurrentMonth,
        isSelected,
        isPast,
        summaries,
      });
    }

    this.days = days;

    // Kuukausiotsikko
    const titleDate = firstOfMonth;
    const monthName = getMonthNameFi(titleDate);
    this.monthTitle = `${monthName} ${year}`;
  }
}
```

**Mitä tämä tekee?**
* Pitää “ankkuria” siitä, mikä kuukausi näkyy (voi olla eri kuin valittu päivä).
* Rakentaa 6 viikkoa (42 päivää) ruudukon:
  * sisältää edellisen ja seuraavan kuun “häntäpäivät”.
* Jokaiselle päivälle:
  * laskee onko se nykyisen kuun päivä (`isCurrentMonth`)
  * onko menneisyydessä (`isPast`)
  * onko valittu (`isSelected`)
  * hakee kyseisen päivän varaukset valitulle huoneelle ja muodostaa summaryt.

##### 8.4 Kuukausikalenterin HTML
📄 **Päivitä kokonaan** `web/src/app/booking/month-calendar.component.html`:
```html
<div class="month-calendar">
  <header class="month-calendar__header">
    <button
      type="button"
      class="month-calendar__nav"
      (click)="onPrevMonth()"
    >
      &larr;
    </button>
    <h3 class="month-calendar__title">{{ monthTitle }}</h3>
    <button
      type="button"
      class="month-calendar__nav"
      (click)="onNextMonth()"
    >
      &rarr;
    </button>
  </header>

  <div class="month-calendar__weekdays">
    <span>Ma</span>
    <span>Ti</span>
    <span>Ke</span>
    <span>To</span>
    <span>Pe</span>
    <span>La</span>
    <span>Su</span>
  </div>

  <div class="month-calendar__grid">
    <button
      *ngFor="let day of days"
      type="button"
      class="month-calendar__day"
      [class.month-calendar__day--outside]="!day.isCurrentMonth"
      [class.month-calendar__day--selected]="day.isSelected"
      [class.month-calendar__day--past]="day.isPast"
      (click)="onSelectDay(day)"
      [disabled]="day.isPast"
    >
      <div class="month-calendar__day-number">
        {{ day.dayOfMonth }}
      </div>

      <ul class="month-calendar__summaries" *ngIf="day.summaries.length > 0">
        <li *ngFor="let summary of day.summaries">
          {{ summary }}
        </li>
      </ul>
    </button>
  </div>
</div>
```

##### 8.5 Kuukausikalenterin SCSS
📄 **Päivitä** `web/src/app/booking/month-calendar.component.scss`:
```scss
.month-calendar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.month-calendar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.month-calendar__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  text-transform: capitalize;
}

.month-calendar__nav {
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  padding: 0.25rem 0.7rem;
  cursor: pointer;
}

.month-calendar__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  font-size: 0.75rem;
  text-align: center;
  color: #94a3b8;
}

.month-calendar__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.25rem;
}

.month-calendar__day {
  position: relative;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 0.3rem 0.25rem;
  font-size: 0.8rem;
  text-align: left;
  cursor: pointer;
  min-height: 3.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.month-calendar__day-number {
  font-weight: 600;
  margin-bottom: 0.1rem;
}

.month-calendar__day--outside {
  opacity: 0.4;
}

.month-calendar__day--selected {
  border-color: #0f172a;
  box-shadow: 0 0 0 1px #0f172a;
}

.month-calendar__day--past {
  opacity: 0.4;
  cursor: default;
}

.month-calendar__summaries {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.65rem;
  line-height: 1.2;
}
```

#### 8.6 Mitä nyt pitäisi toimia?
Aja taas:
```bash
cd web
npm run build
npm start
```

Sitten selaimessa:
1. Kuukausikalenterin otsikossa näkyy jotain tyyliin “tammikuu 2026”.
2. Päiväruudukossa:
   * menneet päivät ovat haaleita ja disabloituja
   * valittu päivä merkitty korostuksella
3. Kun luot varauksen lomakkeella:
   * se näkyy heti samassa huoneessa:
     * sekä slottilistassa disablettuna
     * että kuukausikalenterissa sen päivän solun alla listattuna muodossa:
       `10:00-11:30 Tiimipalaveri, Tiimi X`
4. Päivän klikkaaminen kalenterista:
   * päivittää week-stripin ja lomakkeen “kontekstin” (valittu päivä)
   * slotit päivittyvät vastaamaan valittua päivää.

Jos build menee läpi ja näet varaukset kuukausikalenterissa (ja päivävalinta toimii molempiin suuntiin), niin seuraavassa vaiheessa voidaan lisätä:
* **varauksen poisto** (klikkaus listasta → vahvistus → DELETE → state-päivitys)
* ja virheilmoituksia (snackbar / alert) epäonnistuneille POST/DELETE-kutsuille.

---

### Kehote
Kaikki ok. Voit siirtyä eteenpäin.

### Vastaus
Hyvä, nyt aletaan päästä siihen “kokonaiseksi tuotteeksi” – lisätään **poisto**.
Tässä vaiheessa:
* voit klikata kalenterissa näkyvää varausta
* saat confirm-kysymyksen
* DELETE backendille
* varaus katoaa kalenterista **ja** slotit vapautuvat
Ei vielä mitään fancy snackbareja, käytetään `window.confirm`ia, jotta pysytään kevyenä.

#### Vaihe 9: Varauksen poisto kuukausikalenterista
##### 9.1 Laajennetaan MonthDayViewModelia
Tarvitaan itse `Reservation`-objektit kalenterisoluun (ei pelkkä string).
📄 **Päivitä** `web/src/app/booking/month-calendar.component.ts`
Muuta `MonthDayViewModel`-interface:
```ts
import { Reservation } from '../core/models/reservation.model';
// ...

interface MonthDayViewModel {
  dateKey: UtcDateKey;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isPast: boolean;
  reservations: Reservation[]; // <-- lisätään tämä
}
```

Lisäksi tuodaan sisään `ReservationsApiService` ja `formatReservationSummary`:
Ylälaitaan importteihin lisää:
```ts
import { ReservationsApiService } from '../core/services/reservations-api.service';
import { formatReservationSummary } from '../core/utils/slot.util';
```

Ja poistetaan aiempi `formatReservationSummary`-import, jos se oli jo siellä eri kohdassa (ettei tule duplikaattia).

###### 9.1.1 Konstruktoriin API-service
Muuta konstruktoria:
```ts
  constructor(
    private readonly bookingState: BookingStateService,
    private readonly reservationsApi: ReservationsApiService
  ) {
    this.currentMonthAnchorDateKey =
      bookingState.getSnapshot().selectedDateKey;
  }
```

###### 9.1.2 `rebuildCalendar` käyttää `reservations`-taulukkoa
Muuta `rebuildCalendar`in sisällä päivää luova kohta:
```ts
      let reservationsForDay: Reservation[] = [];
      if (selectedRoomId) {
        reservationsForDay = filterReservationsForDate(
          allReservationsForRoom,
          dateKey
        );
      }

      days.push({
        dateKey,
        dayOfMonth: d.getUTCDate(),
        isCurrentMonth,
        isSelected,
        isPast,
        reservations: reservationsForDay,
      });
```
Eli ei enää muodosteta `summaries`-taulukkoa, vaan talletetaan suoraan `Reservation[]`.

###### 9.1.3 Klikkaus varaukseen + confirm + DELETE
Lisää luokkaan metodit:
```ts
  onReservationClick(day: MonthDayViewModel, reservation: Reservation, event: MouseEvent): void {
    event.stopPropagation(); // estetään, ettei päivän klikkaus laukea

    const snapshot = this.bookingState.getSnapshot();
    const roomId = snapshot.selectedRoomId;
    if (!roomId) {
      return;
    }

    const message = `Poistetaanko varaus?\n${formatReservationSummary(reservation)}`;
    const ok = window.confirm(message);
    if (!ok) {
      return;
    }

    this.reservationsApi.deleteReservation(roomId, reservation.id).subscribe({
      next: () => {
        // Poistetaan varaus frontin tilasta
        this.bookingState.removeReservationFromRoom(roomId, reservation.id);
        console.log('Varaus poistettu', reservation.id);
      },
      error: (error) => {
        console.error('Varauksen poisto epäonnistui', error);
      },
    });
  }

  getReservationSummary(reservation: Reservation): string {
    return formatReservationSummary(reservation);
  }
```

> Huomaa: `removeReservationFromRoom` laukaisee state-päivityksen →
>
> * MonthCalendar rebuildaa itsensä
> * ReservationFormin slottilogiikka saa päivitetyn varauslistan → slot vapautuu

##### 9.2 Kuukausikalenterin HTML: klikattavat varaukset
📄 **Päivitä** `web/src/app/booking/month-calendar.component.html`
Korvaa summaries-lista tällä:
```html
  <div class="month-calendar__grid">
    <button
      *ngFor="let day of days"
      type="button"
      class="month-calendar__day"
      [class.month-calendar__day--outside]="!day.isCurrentMonth"
      [class.month-calendar__day--selected]="day.isSelected"
      [class.month-calendar__day--past]="day.isPast"
      (click)="onSelectDay(day)"
      [disabled]="day.isPast"
    >
      <div class="month-calendar__day-number">
        {{ day.dayOfMonth }}
      </div>

      <ul
        class="month-calendar__summaries"
        *ngIf="day.reservations.length > 0"
      >
        <li
          *ngFor="let reservation of day.reservations"
          class="month-calendar__summary-item"
          (click)="onReservationClick(day, reservation, $event)"
        >
          {{ getReservationSummary(reservation) }}
        </li>
      </ul>
    </button>
  </div>
```

Eli:
* käytetään `day.reservations`-taulukkoa
* jokaista varausta vastaa yksi `<li>`
* klikkaus menee `onReservationClick(...)`-metodille
* `$event.stopPropagation()` hoidetaan TS-metodissa

##### 9.3 Pieni SCSS-tuunailu
📄 **Päivitä** `web/src/app/booking/month-calendar.component.scss`
Lisää summary-itemille tyyli:
```scss
.month-calendar__summaries {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.65rem;
  line-height: 1.2;
}

.month-calendar__summary-item {
  cursor: pointer;
}

.month-calendar__summary-item:hover {
  text-decoration: underline;
}
```
(pidetään aiemmat tyylit ennallaan).

#### 9.4 Mitä tämän jälkeen pitäisi toimia?
Käynnistä:
```bash
cd web
npm run build
npm start
```

Selaimessa:
1. Valitse huone, tuleva päivä ja luo yksi tai useampi varaus.
2. Näet ne kyseisen päivän ruudussa kuukausikalenterissa listattuna:
   * `10:00-11:30 Tiimipalaveri, Tiimi X`
3. Klikkaa jotain listattua varausta:
   * Selain näyttää confirm-dialogin tekstillä “Poistetaanko varaus?” + varauksen kuvaus
   * “Peruuta” → ei tapahdu mitään
   * “OK” → DELETE backendille, ja onnistumisen jälkeen:
     * varaus katoaa kalenterista
     * sama slotti vapautuu lomakkeen slottirivillä (ei enää disabled, jos ei muita varauksia).
4. Jos backend palauttaa virheen (esim. 500 tai se ei ole käynnissä), näet konsolissa virheilmoituksen `Varauksen poisto epäonnistui`.

Kun olet testannut, että poisto toimii päästä päähän (kalenteri + slotit), voidaan seuraavassa vaiheessa tehdä pieni UX-siistintä:
* vähintään yksinkertainen virheilmoitus UI:hin (ei pelkkä console.error)
* lomakevalidoinnin viimeistely (pakolliset kentät, Error-messut)
…ja sen jälkeen alkaa olla MVP aika pitkälti kasassa.

---

### Kehote


### Vastaus

---

### Kehote


### Vastaus

---

### Kehote


### Vastaus

---

### Kehote


### Vastaus

---

### Kehote


### Vastaus

---

### Kehote


### Vastaus

---

### Kehote


### Vastaus

---

### Kehote


### Vastaus

---

### Kehote


### Vastaus

---

### Kehote


### Vastaus

