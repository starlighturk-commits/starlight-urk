# Technische analyse — Radio Starlight Urk

**Onderzoeksdatum:** 2 september 2026  
**Onderzochte versie:** `678d7cc` op `origin/main`  
**Scope:** code, packages, data/API, security en deployment  
**Niet bekeken:** gebruiksvriendelijkheid, vormgeving en inhoud  
**Eindoordeel:** nog niet klaar voor een volgende productierelease

## Kort gezegd

De technische basis is niet betrouwbaar genoeg voor verdere ontwikkeling of een nieuwe productierelease.

De grootste problemen zijn:

1. de meegeleverde scripts zijn niet lokaal bruikbaar: `dev` vereist Replit-variabelen, de typecheck verwijst buiten de repository en `build` verwacht een ontbrekend workspacebestand;
2. de packages staan verkeerd ingedeeld en een deel is verouderd, experimenteel of niet in gebruik;
3. voor Now Playing, Podcasts en Uitzending Gemist is geen API-host geconfigureerd in het huidige Expo-project; de verwachte routes op `starlighturk.nl` geven HTTP 404;
4. veel gegevens staan hardcoded in de app en kunnen dus alleen via een nieuwe store-release worden aangepast;
5. GitHub is aan Expo gekoppeld, maar de daadwerkelijke releaseflow is handmatig en niet herleidbaar;
6. tests, CI, foutmonitoring en een gecontroleerde releaseprocedure ontbreken;
7. de app heeft meerdere losse audioplayers die elkaar niet centraal aansturen;
8. de app vraagt meer native permissies dan de huidige functies nodig hebben en de WebView is te ruim opgezet voor een formulier met persoonsgegevens.

Voeg geen nieuwe functies toe voordat de technische basis is hersteld en gecontroleerd.

## Security in het kort

De huidige beveiliging is onvoldoende voor een nieuwe productierelease.

De belangrijkste redenen:

- de broncode van de huidige Expo-productiebuild is niet meer bereikbaar, dus die specifieke release kon niet worden gecontroleerd;
- het zondagavondformulier verwerkt persoonsgegevens in een WebView zonder strikte navigatiecontrole;
- de gegenereerde native configuratie bevat locatie-, microfoon-, opslag- en overlaypermissies die de appcode niet gebruikt;
- API-antwoorden en externe media-URL's worden zonder runtimevalidatie vertrouwd;
- dependency- en secretscans zijn nog geen vaste releasechecks.

### Wat kwam er uit de CVE-scan?

`npm audit` markeert 34 packages: 21 moderate en 13 high, nul critical. Dat zijn 13 verschillende advisories die via meerdere packages terugkomen. Dit getal alleen zegt niet dat de mobiele app dertien direct misbruikbare lekken heeft.

| Groep | Werkelijk beeld | Advies |
| --- | --- | --- |
| `decode-uri-component` | Moderate DoS-melding in de navigatieketen via `query-string`. Omdat de app eigen deep-linkschemes heeft, is bereikbaarheid via een expres kapotte link aannemelijk maar nog niet bewezen. | Expo Router/React Navigation gecontroleerd bijwerken en malformed deep links als regressietest toevoegen. Zie [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr). |
| `postcss` | High/moderate meldingen rond het lezen van sourcemaps en CSS-output. Dit zit hier in de Metro/Expo-buildketen, niet in de normale mobiele gebruikersflow. | Expo/Metro-stack bijwerken en geen niet-vertrouwde CSS in de build verwerken. Zie onder andere [GHSA-fxqj-rqcc-2cmp](https://github.com/postcss/postcss/security/advisories/GHSA-fxqj-rqcc-2cmp). |
| `image-size` | Twee high DoS-meldingen in het verwerken van bepaalde afbeeldingsformaten door Metro. Een kwaadaardige asset kan vooral een build laten vastlopen. Er is op de onderzoeksdatum nog geen gepubliceerde npm-fix. | Alleen gecontroleerde assets toelaten, upstream volgen en Metro bijwerken zodra een fix beschikbaar is. Zie de [status in GitHub Advisory Database](https://github.com/github/advisory-database/issues/9028). |
| Overige indirecte packages | `brace-expansion`, `fast-uri`, `js-yaml`, `nanoid` en `uuid` zitten voor zover aangetroffen in build-, configuratie- of testtooling. | Meenemen in de gecontroleerde Expo-upgrade. Niet blind `npm audit fix --force` uitvoeren. |

### Publieke repository en serviceaccount

De repository is publiek. `eas.json` verwijst naar `./google-service-account.json`, terwijl die bestandsnaam niet expliciet in de `.gitignore` van `origin/main` staat. Eén verkeerde `git add` kan dan direct een Google Play-serviceaccount publiceren. Bewaar dit bestand als EAS/CI file secret en blokkeer minimaal `google-service-account.json` en `google-services.json` expliciet.

Omdat buildcommit `dad6c91` ontbreekt, konden de broncode en Git-history van de huidige storebinary niet op secrets worden gecontroleerd.

## Dit moet vóór een volgende release worden opgelost

Hieronder staan de P0-punten. P0 betekent in dit document: eerst oplossen, daarna pas opnieuw naar de store.

### 1. Kies één normale ontwikkelsetup

Het project gebruikt nu npm en pnpm door elkaar:

- de repository bevat een `package-lock.json` van npm;
- `BUILD.md` zegt dat je pnpm moet installeren en `pnpm install` moet uitvoeren;
- de scripts in `package.json` starten ook pnpm;
- er is geen `packageManager` vastgelegd;
- er is geen Node-versie vastgelegd.

Hierdoor kan npm andere versies installeren dan pnpm. De lockfile geeft dus alleen zekerheid zolang iedereen npm gebruikt, terwijl de documentatie juist pnpm voorschrijft.

Kies één package manager. Mijn voorkeur hier is pnpm, omdat het project daar al voor is ingericht. Leg daarna vast:

- één ondersteunde Node-versie;
- één pnpm-versie via `packageManager`;
- een gecommitte `pnpm-lock.yaml`;
- installatie via `pnpm install --frozen-lockfile`.

Verwijder daarna `package-lock.json`, zodat er nog maar één waarheid over packageversies bestaat.

### 2. Maak de projectscripts bruikbaar

De huidige scripts zijn nog afkomstig uit een Replit-achtige omgeving en werken niet als normale lokale Expo-app.

Concreet:

- `npm run typecheck` faalt omdat `tsconfig.json` verwijst naar `../../lib/api-client-react`, buiten deze repository;
- `npm run build` faalt omdat het script een niet-bestaande `pnpm-workspace.yaml` verwacht;
- `npm run dev` verwacht Replit-variabelen zoals `REPLIT_EXPO_DEV_DOMAIN` en `$PORT`;
- er zijn geen scripts voor linting of tests;
- er is geen normale `README.md` met installatie- en release-instructies.

Vervang de huidige scripts bijvoorbeeld door:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run",
    "doctor": "expo-doctor"
  }
}
```

Het huidige `scripts/build.js` is geen Android- of iOS-storebuild. Het is een oud maatwerkscript voor statische/Replit-bundles en kan beter worden verwijderd of heel duidelijk worden hernoemd.

### 3. Ruim `package.json` echt op

Van de 48 directe packages staan er 44 onder `devDependencies`. Daar staan ook bijna alle packages tussen die de app tijdens runtime gebruikt: Expo, React Native, Expo Router, React Query, fonts, navigatie en animaties.

Dit maakt een productie-installatie met alleen runtimepackages onbruikbaar. Verplaats alle packages die door de app worden geïmporteerd naar `dependencies`. Alleen TypeScript, Babel, linting, tests en andere ontwikkeltooling horen onder `devDependencies`.

#### Versies die nu al fout staan

Expo Doctor geeft onder andere deze fout:

- `babel-preset-expo@13.0.0` is geïnstalleerd;
- Expo SDK 54 verwacht `~54.0.10`.

Dit is ook precies waarom de webbuild crasht op `Static class blocks are not enabled`. Daarnaast lopen `expo` en `expo-constants` een patchversie achter.

#### Packages die niet aantoonbaar worden gebruikt

De codescan vond geen gebruik voor onder andere:

- `@react-native-async-storage/async-storage`;
- `@stardazed/streams-text-encoding`;
- `@ungap/structured-clone`;
- `expo-image-picker`;
- `expo-location`;
- `expo-status-bar`;
- `zod` en `zod-validation-error`.

`zod` kan juist nuttig zijn voor API-validatie. Gebruik het daar bewust voor, of haal het weg. Controleer ook of directe installaties van `@expo/cli`, `@expo/ngrok`, `expo-system-ui`, `expo-web-browser` en `react-native-svg` echt nodig zijn.

Verwijder dit niet allemaal blind in één keer. Doe het per kleine wijziging en voer steeds Doctor, typecheck, tests en een Android-export uit.

#### Verouderd en experimenteel

- De app gebruikt `expo-av`. Die package is deprecated en vanaf SDK 55 verwijderd. Migratie naar `expo-audio` is dus nodig voordat Expo serieus kan worden bijgewerkt. Zie ook de [Expo-documentatie voor SDK 54](https://docs.expo.dev/versions/v54.0.0/sdk/av/).
- `expo-router/unstable-native-tabs` is bewust een instabiele API.
- React Compiler gebruikt een bèta-plugin en bèta-runtime.
- `expo-glass-effect` is een 0.x-package.
- New Architecture staat aan, maar er zijn geen vastgelegde device- of regressietests.

Expo SDK 54 krijgt beperkt onderhoud en zit bijna aan het einde van zijn onderhoudsperiode. Plan de migratie naar een ondersteunde SDK; de huidige Expo-versie is SDK 57. Zie de [Expo SDK 57 release notes](https://expo.dev/changelog/sdk-57).

### 4. Configureer en borg de API

De frontend verwacht deze routes:

- `GET /api/nowplaying`;
- `GET /api/podcasts`;
- `GET /api/gemist`.

Op 2 september 2026 geven alle drie de routes op `starlighturk.nl` HTTP 404. De backendcode staat niet in deze repository. Als de backend op een ander domein staat, ontbreekt dat domein in de huidige projectconfiguratie.

De app stelt alleen een absolute basis-URL in als `EXPO_PUBLIC_DOMAIN` bestaat. In het actuele Expo-project staan nul environmentvariables en `eas.json` levert de variabele ook niet aan. Zonder deze waarde probeert de native app relatieve URL's zoals `/api/podcasts` op te halen. Dat is in een native app geen bruikbare API-URL.

Maak dit expliciet bijvoorbeeld:

```dotenv
EXPO_PUBLIC_API_URL=https://api-host.example
```

Verder nodig:

- development-, preview- en productionwaarden in Expo EAS Environments;
- in ieder `eas.json`-profiel een expliciet `environment`-veld;
- een werkende backend met vastgelegd eigenaarschap en deployment;
- een `/health`-endpoint en uptimecontrole;
- harde time-outs, maximale responsegroottes en duidelijke foutstatussen;
- controle op `Content-Type` en runtimevalidatie van iedere response, bijvoorbeeld met de al geïnstalleerde `zod`;
- limieten op aantallen afleveringen en tekstlengtes;
- alleen HTTPS-media-URL's van vooraf toegestane hosts;
- een cache of last-known-good fallback voor feeds en schema's.

Expo beschrijft deze scheiding per omgeving ook in de [EAS environment-documentatie](https://docs.expo.dev/eas/environment-variables/usage/).

### 5. Haal wijzigbare informatie uit de app

Dit is geen volledig statische app. De livestream is extern en Now Playing, Podcasts en Gemist zijn duidelijk als dynamische functies gebouwd. Alleen werkt die dynamische laag nu niet.

Tegelijk staat veel informatie nog hardcoded in TypeScript:

| Onderdeel | Huidige situatie | Nieuwe store-release nodig bij wijziging? |
| --- | --- | --- |
| Livestream | URL hardcoded | Ja |
| Now Playing | API bedoeld, maar ontbreekt | Nee zodra API werkt |
| Podcasts | API bedoeld, maar ontbreekt | Nee zodra API werkt |
| Uitzending Gemist | API bedoeld, maar ontbreekt | Nee zodra API werkt |
| Uitzendschema | Hardcoded in de app | Ja |
| Programma- en presentatorgegevens | Hardcoded | Ja |
| Redactionele teksten | Hardcoded | Ja |
| Website- en sociallinks | Hardcoded | Ja |

Een wijziging in het uitzendschema, een presentator of het streamadres hoort niet afhankelijk te zijn van een nieuwe Play Store- of App Store-release.

Zet daarom in een kleine beheerde API:

- uitzendschema en tijdelijke uitzonderingen;
- programma- en presentatorinformatie;
- podcasts en gemiste uitzendingen;
- redactionele teksten;
- toegestane externe links;
- eventueel een storingsmelding en alternatief streamadres.

Laat in de app zelf alleen de UI, audio-integratie, validatie en veilige fallbacks staan.

Let ook op de tijdzone. Het schema gebruikt nu de lokale tijd van het toestel. Buiten Nederland kan daardoor het verkeerde programma als live worden getoond. Gebruik expliciet `Europe/Amsterdam`.

### 6. Maak GitHub echt de bron van de release

GitHub is aan Expo gekoppeld, maar de releaseflow is niet ingericht.

De actuele Expo-status:

- repository `starlighturk-commits/starlighturk` is gekoppeld;
- EAS Workflows staat op **Unconfigured**;
- er zijn geen development builds;
- er zijn geen EAS submissions;
- er zijn geen EAS Updates;
- er zijn geen environmentvariables;
- iOS-credentials zijn niet ingericht;
- Expo bevat twee Android application identifiers: `com.radiostarlighturk.app` en `nl.starlighturk.app`.

De nieuwste Android-productiebuild verwijst naar commit `dad6c91`. Die commit is niet bereikbaar via `main`, een branch of een tag en kan ook niet meer uit de Git-remote worden opgehaald. Daarmee is niet meer betrouwbaar vast te stellen welke code exact in die storebuild zit.

Dit moet anders:

1. `main` wordt de enige bron van waarheid;
2. wijzigingen gaan via een pull request;
3. CI moet groen zijn voordat er gemerged kan worden;
4. productie wordt alleen gebouwd vanaf een release-tag of bewust goedgekeurde releasebranch;
5. bij elke release worden commit-SHA, versie, versionCode en EAS build-ID vastgelegd;
6. eerst naar een interne testtrack, daarna pas gefaseerd naar productie.

EAS Workflows kan dit rechtstreeks vanuit GitHub uitvoeren. Expo adviseert zelf om CI op `main` te draaien en productie bewust vanaf een releasebranch of tag te starten. Zie de [Expo CI/CD-documentatie](https://docs.expo.dev/tutorial/cicd/production/).

Aanvullend:

- voeg `owner: "starlighturk"` expliciet toe aan de Expo-config;
- zet `cli.requireCommit` aan;
- stel per buildprofiel de juiste EAS-environment in;
- automatiseer `versionCode` en kies één versiebron;
- controleer in Google Play welk package-ID daadwerkelijk live is;
- verwijder oude credentials pas nadat package-ID en uploadkey zijn bevestigd;
- sla het Google service-account op als afgeschermde file secret.

`eas.json` verwijst naar `./google-service-account.json`, maar dat bestand wordt niet specifiek door de `.gitignore` afgevangen. Gebruik hiervoor een EAS/CI file secret en zet de bestandsnaam expliciet in `.gitignore`.

### 7. Voeg normale kwaliteitschecks toe

Er is nog geen CI, lintconfiguratie of testset. De huidige typecheck en Expo Doctor staan rood.

Minimaal bij iedere pull request:

1. frozen installatie vanuit de lockfile;
2. `expo-doctor` en `expo install --check`;
3. TypeScript;
4. ESLint en formatter-check;
5. unit- en componenttests;
6. Android-export als snelle bundletest;
7. dependencyscan met een gecontroleerde allowlist voor tijdelijk geaccepteerde meldingen;
8. Gitleaks op de commit en Git-history;
9. SBOM genereren en bij de release bewaren.

Minimale testdekking:

- API-validatie en foutpaden;
- schema- en tijdzoneberekening;
- wisselen tussen live radio, podcast en Gemist;
- configuratie per environment;
- requestformulier en toegestane externe navigatie.

De schone npm-installatie markeert momenteel 34 packages: 21 moderate en 13 high, geen critical. Een groot deel zit in indirecte Expo-/buildtooling en is niet automatisch direct misbruikbaar in de mobiele app. Voer dus niet blind `npm audit fix --force` uit; werk eerst de Expo-stack gecontroleerd bij en beoordeel daarna wat overblijft. Een melding zonder beschikbare fix mag alleen tijdelijk blijven staan met eigenaar, motivatie en herbeoordelingsdatum.

### 8. Gebruik één centrale audiospeler

Live radio, Podcasts en Uitzending Gemist maken ieder hun eigen `Audio.Sound` of web-audio-element. Omdat tabbladen gemount kunnen blijven, kunnen meerdere spelers naast elkaar bestaan.

Maak één appbrede audioservice/provider die:

- maximaal één actieve audiobron toestaat;
- altijd de vorige bron stopt;
- één statusmodel gebruikt voor laden, spelen, pauzeren en fouten;
- background/foreground en audio-interrupties afhandelt;
- omgaat met headset-unplug, telefoongesprekken en reconnects;
- lockscreenmetadata beheert waar dat wordt ondersteund.

Pak dit direct samen met de migratie van `expo-av` naar `expo-audio`.

### 9. Vervang de kwetsbare WebView-koppeling

Het zondagavondformulier verzamelt naam, e-mailadres en vrije tekst. Die gegevens worden via handgeschreven JavaScript in een externe WordPress-pagina geïnjecteerd.

Dit is kwetsbaar omdat:

- wijzigingen in het WordPress-formulier de app kunnen breken;
- invoer met een zelfgeschreven escape-functie in JavaScript wordt geplakt in plaats van veilig geserialiseerd;
- de WebView standaard iedere HTTP- en HTTPS-host accepteert en geen exacte controle op host en pad heeft;
- iedere geladen pagina het bericht `SENT` kan sturen en daarmee in de app een succesvolle verzending kan nabootsen;
- netwerk-, timeout- en HTTP-fouten nauwelijks worden afgehandeld;
- persoonsgegevens door meerdere lagen gaan zonder duidelijke logging- en privacyafspraken.

De nette oplossing is een kleine HTTPS-API voor het verzoekformulier. Dan is de app niet meer afhankelijk van de HTML en CSS van WordPress.

Als de WebView tijdelijk blijft:

- serialiseer data met `JSON.stringify` in plaats van een eigen escape-functie;
- accepteer alleen exact `https://starlighturk.nl/zondagavondradio/` als hoofdnavigatie;
- controleer navigatie met `onShouldStartLoadWithRequest` en open andere links buiten de WebView;
- zet `originWhitelist`, `mixedContentMode="never"` en `allowFileAccess={false}` ook expliciet;
- koppel een succesbericht aan de verwachte pagina en aanvraag, niet alleen aan de tekst `SENT`;
- voeg `onError`, `onHttpError` en een echte timeout toe.

De huidige WebView-library blokkeert op Android standaard mixed content en lokale file access. Leg beide instellingen expliciet vast, zodat een library-update dit gedrag niet ongemerkt kan wijzigen.

### 10. Vraag alleen native permissies die echt nodig zijn

Een schone Expo-prebuild van de onderzochte code zet onder andere deze Android-permissies in de gegenereerde configuratie:

- grove en precieze locatie;
- microfoonopname;
- lezen en schrijven van externe opslag;
- tekenen over andere apps (`SYSTEM_ALERT_WINDOW`);
- audio op de achtergrond, netwerk, vibratie en wakelock.

De appcode gebruikt wel audio en haptics, maar geen locatie, camera, foto-picker of microfoonopname. Op iOS worden toch teksten gegenereerd voor camera-, foto- en locatiepermissies. Ook staat Android-back-up aan met `android:allowBackup="true"`.

Dat betekent niet dat de app al die rechten bij de eerste start automatisch aan de gebruiker vraagt. Het betekent wel dat ongebruikte native packages en hun configplugins onnodig veel aanvalsvlak en privacyvragen toevoegen.

Aanpak:

1. verwijder eerst ongebruikte packages zoals `expo-location` en `expo-image-picker`;
2. blokkeer overblijvende ongewenste Android-rechten expliciet met `android.blockedPermissions`;
3. verwijder onnodige iOS usage descriptions;
4. zet Android-back-up uit of maak gerichte back-upregels voor WebView- en appdata;
5. controleer de uiteindelijke gesigneerde AAB/APK en iOS-build, niet alleen de gegenereerde bronmanifesten;
6. laat Play Console Data Safety en App Store Privacy exact aansluiten op wat de binary en het formulier werkelijk doen.

Expo legt uit dat libraries zelf rechten kunnen toevoegen en dat `android.blockedPermissions` deze bij de manifestmerge kan verwijderen. Zie de [Expo-documentatie over permissies](https://docs.expo.dev/guides/permissions/).

### 11. Zorg dat fouten ook echt zichtbaar worden

Er is een ErrorBoundary, maar productiefouten worden nergens centraal gemeld. API- en audiofouten verdwijnen vooral in `console.error`.

Voeg toe:

- crashrapportage met appversie, versionCode en commit-SHA;
- gecontroleerde sourcemaps;
- uptimechecks voor API en livestream;
- foutmetingen voor netwerk en audio;
- alerts met een eigenaar en een kort stappenplan.

Log hierbij geen namen, e-mailadressen of inhoud van verzoekjes.

## Daarna pas: P1

Als de basis hierboven staat, kunnen deze punten worden opgepakt:

- dubbele code tussen Podcasts en Gemist samenvoegen;
- dode componenten en ongebruikte routes verwijderen;
- externe URL's en operationele configuratie centraliseren;
- assets en fonts optimaliseren;
- bewust beslissen of web echt ondersteund wordt;
- de oude statische server verwijderen als die niet wordt gebruikt; anders CSP, securityheaders en de externe `unpkg`-scriptdependency hardenen;
- een iOS-development build inrichten;
- minimaal één end-to-end smoketest op een echt toestel toevoegen;
- eventueel EAS Update inrichten met een expliciete runtimeVersion en channels.

## Aanbevolen volgorde

1. Git-status veiligstellen en bevestigen welke code nu echt live staat.
2. Package manager, lockfile, Node-versie, scripts en README herstellen.
3. Typecheck, Babel en Expo Doctor groen maken.
4. Dependencies goed indelen, ongebruikte packages verwijderen en native permissies minimaliseren.
5. Dependencyproblemen gecontroleerd oplossen en securitychecks vastleggen.
6. Backend en environmentconfiguratie herstellen.
7. Hardcoded operationele data naar API/CMS verplaatsen.
8. WebView/requestflow vervangen of stevig beperken.
9. CI en een herleidbare GitHub/Expo-releaseflow toevoegen.
10. Audio centraliseren en migreren naar `expo-audio`.
11. Monitoring toevoegen en een nieuwe interne build op echte toestellen testen.

## Wanneer is de app technisch klaar voor een volgende release?

- [ ] Een schone checkout installeert via één gecommitte lockfile.
- [ ] Node- en package-manager-versies zijn vastgelegd.
- [ ] README en lokale/releasescripts kloppen.
- [ ] Doctor, typecheck, lint, tests en Android-export zijn groen.
- [ ] Runtimepackages staan onder `dependencies`.
- [ ] Ongebruikte packages zijn verwijderd.
- [ ] De uiteindelijke binaries bevatten alleen aantoonbaar benodigde permissies.
- [ ] API-responses en externe media-URL's worden begrensd en gevalideerd.
- [ ] De WebView is vervangen of beperkt tot de exacte toegestane flow.
- [ ] Gitleaks en een dependencycheck draaien automatisch in CI.
- [ ] High meldingen zijn opgelost of hebben een vastgelegde, tijdelijke risicoacceptatie.
- [ ] Bij iedere release wordt een SBOM bewaard.
- [ ] Now Playing, Podcasts en Gemist hebben een werkende productie-API.
- [ ] EAS development, preview en production hebben expliciete configuratie.
- [ ] Wijzigbare content vereist geen store-release.
- [ ] De storebuild is terug te leiden naar één tag, commit en EAS build-ID.
- [ ] VersionCode wordt automatisch verhoogd.
- [ ] Credentials staan alleen in afgeschermde secretstores.
- [ ] Releases gaan eerst via een interne testtrack.
- [ ] Er kan maximaal één audiobron tegelijk spelen.
- [ ] Belangrijkste foutpaden zijn automatisch getest.
- [ ] Crashrapportage en uptimebewaking staan aan zonder persoonsgegevens te loggen.

## Resultaten van de technische checks

| Check | Resultaat |
| --- | --- |
| TypeScript | Mislukt door externe projectreferentie |
| `npm run build` | Mislukt door ontbrekende `pnpm-workspace.yaml` |
| Expo Doctor | Mislukt door versieverschillen |
| Webexport | Mislukt door verkeerde Babel-preset |
| Dependency-audit | 21 moderate, 13 high, 0 critical; vooral indirecte buildtooling |
| Native permissies | Te ruim voor de huidige functies |
| WebView-navigatie en berichten | Onvoldoende beperkt |
| Now Playing op `starlighturk.nl` | HTTP 404 |
| Podcasts op `starlighturk.nl` | HTTP 404 |
| Gemist op `starlighturk.nl` | HTTP 404 |
| Automatische tests | Niet aanwezig |
| CI-workflow | Niet aanwezig |
| EAS Workflows | Niet ingericht |
| EAS environmentvariables | Geen |
| Herleidbare productiecommit | Niet aanwezig |
