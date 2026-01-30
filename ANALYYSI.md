# Analyysi: Tekoäly / ChatGPT parikoodaajana

## Johdanto
Esitehtävän keskiössä oli tekoälyn hyödyntäminen ohjelmistokehittäjän työssä. Työkaluksi valikoitui ChatGPT, koska minulla on käytössäni sen maksullinen versio, jonka uskon olevan hyödyllisempi kehitystyössä.

**Oletuksia, rajauksia ja päätöksiä, joita tein tehtävänannosta**
- Koska hain Fullstack-kehittäjän tehtävään, halusin lisätä totetukseen yksinkertaisen käyttöliittymän, vaikka siitä ei ollut suoraa mainintaa tehtävänannossa.
- Lisäsin myös deployauksen Renderiin, jotta arvioijan on helppo katsella ja testata sovellusta käyttöliittymän kautta ilman sen lataamista koneelle.
- Toiminnallisuuksista:
  - Ennalta määritellyt huoneet ja varausten kestot.
  - Varausten katselu kuukausikalenterista yksi huone kerrallaan.
- Rajaukset:
  - Ei käyttäjähallintaa.
  - 'In memory' -tietovarasto.

Tuloksena syntyi yksinkertainen kokoushuoneiden varausrajapinta (API) sovellus, joka sisältää tärkeimpinä ominaisuuksina varauksen luonnin, poiston ja katselun. 

## 1. Mitä tekoäly/ChatGPT teki hyvin?

**Arkkitehtuurin suunnittelu ja rakenne**
ChatGPT ehdotti selkeän rakenteen, joka noudattaa hyviä ohjelmistosuunnittelun periaatteita. Sama rakenne pysyi tekoälyn muistissa koko projektin ajan. Arkkitehtuuri on pääosin looginen ja se on laajennettavissa isompaa projektia varten.

**Business-logiikan toteutus**
ChatGPT seurasi tarkasti ohjeita, kun ne jaettiin sille markdown-tiedoston muodossa. Se osasi viitata jaettuihin tiedostoihin tarpeen tullen ja piti niitä ensisijaisena totuuden lähteenä.

**Projektin konfigurointi**
Projektin alustaminen onnistui mutkattomasti ChatGPT:n antamien konfigurointiohjeiden ansiosta. Tiedostot kuten package.json, tsconfig.json ja server.ts luotiin oikein.

**Keskusteleva lähestymistapa**
ChatGPT osasi kysyä hyviä tarkentavia kysymyksiä, joihin tarvittiin selvennystä ennen toteutusvaiheen aloittamista. Se kysyi myös asioita, joita en itse osannut ajatella. ChatGPT noudatti hyvin annettua ohjetta vaiheittaisesta toteutustavasta, jossa kerroin milloin voimme siirtyä seuraavaan vaiheeseen. 

## 2. Mitä tekoäly teki huonosti?

**Vanhentuneiden moduulien käyttö**
ChatGPT käytti HTML-toteutuksissa vanhentuneita ja käytöstä poistettuja \*ngIf- ja \*ngFor-lausekkeita. Tekoälyllä ei siis ollut tiedossa ajankohtaisinta tietoa, vaikka käyttämieni teknologioiden versiot näkyivät jakamissani tiedostoissa. Vaihdoin ne uusiin @if- ja @for-rakenteisiin.

**Virheenkäsittelyn toteutus**
ChatGPT ei toteuttanut virheenkäsittelyä riittävän hyvin. Esimerkiksi backendistä puuttui yleinen virheenkäsittelijä, joka olisi napannut kaikki käsittelemättömät virheet ja palauttanut niistä järkevän vastauksen. Myös frontendissä virheiden näyttäminen käyttäjälle jäi puutteelliseksi. 

**Kovakoodatut arvot**
Tekoäly kovakoodasi CORS origin-, PORT- ja HOST-asetukset suoraan koodiin, eikä ehdottanut näiden asetusten siirtämistä omiin config- tai .env-tiedostoihin.

**Puutteellinen input-validointi**
Tekstikentät jätettiin hyvin alkeelliselle tasolle, eikä niille luotu kunnollista validointia syötteiden tarkistamiseksi.

**Aikavyöhykkeiden epäselvyys**
README-ohjeessa tekoälyä ohjattiin käyttämään Suomen paikallista aikaa, mutta myöhemmin se pyysi selvennystä asiaan. Vastaukseksi annoin luvan käyttää UTC-muotoa, mikä oli minulta huono ja liian pintapuolinen ohje aikojen käsittelyyn.

**Testauksen laiminlyönti**
ChatGPT ei ehdottanut automaattisten testien kirjoittamista osana toteutusta, vaikka testaus on olennainen osa laadukasta ohjelmistokehitystä.

## 3. Mitkä olivat tärkeimmät parannukset, jotka tein tekoälyn tuottamaan koodiin ja miksi?

**Aikavyöhykkeiden selkeyttäminen**
Epäselvän UTC vs. Helsinki-ajan käsittelyyn liittyvän ohjeen vuoksi jouduin korjaamaan frontendin näyttämään käyttöliittymässä paikallisen ajan. Backendissä kuitenkin säilytin alkuperäiset UTC-ajat. Myöhemmässä vaiheessa ristiriidan korjaaminen olisi ollut vielä työläämpää, koska aikakäsittelyjä oli jo paljon eri puolilla koodia.

**Virheenkäsittelyn refaktorointi**
Lisäsin backendiin yleisen Fastify-virheenkäsittelijän, joka nappaa kaikki käsittelemättömät virheet ja palauttaa niistä järkevän vastauksen. Tämä refaktorointi siisti koodia ja helpottaa virheiden seurantaa. Frontendiin lisäsin virheiden näyttämisen käyttäjälle, koska se parantaa käyttäjäkokemusta – käyttäjä tietää, mikä meni pieleen.

**State managementin keskittäminen (frontend)**
Paljon turhaa toimintaa oli jätetty komponentin vastuulle. Paras ratkaisu oli siirtää mahdollisimman paljon logiikkaa pois komponenteista niiden omiin tarkoitettuihin tiedostoihin. Tässä tapauksessa BookingStateService sai lisävastuuta tilanhallinnasta, jotta komponenteissa ei tapahdu turhaa toistoa. Angular-komponenteissa tavoitteena on yleensä kutsua vain action-metodeja, jotka laukaisevat dataflow:n.

**Konfiguraation eriyttäminen**
Siirsin kovakoodatut ympäristömuuttujat .env-tiedostoon ja config-kansioihin. Tämä helpottaa niiden hallintaa ja muuttamista. Ne löytyvät helposti ja voi muuttaa yhdestä paikasta.

## Loppu ajatukset

Tekoälyn kanssa työskentely vaatii tarkkuutta sekä ohjeiden antamisessa että niiden muotoilussa. ChatGPT toimii erinomaisena keskustelu-, suunnittelu- ja luonnostelukumppanina, mutta lopullinen vastuu pysyy aina kehittäjällä. Kriittinen ajattelu on välttämätöntä ja kaikkea ei pidä hyväksyä sellaisenaan. Paras tulos syntyy, kun tekoälyn kanssa käydään vuoropuhelua, vertaillaan vaihtoehtoja ja tehdään lopulliset päätökset itse.

ChatGPT voi merkittävästi nopeuttaa kehityksen alkuvaihetta, jossa suunnitellaan arkkitehtuuria ja rakennetaan projektin perustaa. Sen käyttö pelkkänä copy-paste-välineenä on kuitenkin haitallista. Kehittäjän on aina ymmärrettävä syvällisesti, mitä tekee ja miksi tietyt tekniset ratkaisut valitaan.

Oikeassa työelämässä en antaisi tekoälyn generoida kokonaisia koodikirjastoja, joita sitten vasta alkaisi refaktoroida. Sen sijaan käyttäisin sitä jatkuvana apuna kehitysprosessin aikana, silloin kun sille on todellista tarvetta. Tekoäly on tehokkain, kun se toimii kehittäjän työkaluna, ei korvaajana.

Tekoälytyökalut ovat ohjelmistokehityksen tulevaisuutta. Niistä on valtavasti hyötyä, kunhan niitä osaa hyödyntää oikealla tavalla ja oikeassa suhteessa. Avain on tasapaino: tekoäly avustaa, mutta kehittäjä johtaa.