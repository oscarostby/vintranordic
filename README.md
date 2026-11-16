# Vintra for virksomheter

Statisk nettside for Vintra rettet mot store virksomheter, med en demoportal for chatboten.

## Sider

- `index.html` – forsiden
- `om-oss.html` – teamet
- `demo.html` – demoportal der man velger mal og design, tilpasser chatboten og tester den

## Kjøre lokalt

Siden trenger bare en enkel webserver, for eksempel:

```bash
npx serve .
```

Chatboten og demoportalen kjører helt i nettleseren. Ingen meldinger sendes til noen server, og oppsettet i demoen lagres bare i nettleseren (localStorage).

## Filer

- `styles.css`, `script.js` – felles stil og skript for alle sider
- `chat-widget.css`, `chat-widget.js` – chatboten, ferdige design og maler
- `demo.css`, `demo.js` – demoportalen
- `img/` – portretter av teamet

## Før publisering

- Bytt plassholderbildene fra Unsplash med egne bilder
- Bekreft påstandene om sikkerhet og personvern
- Fyll inn org.nr., adresse og LinkedIn-lenker
- Koble kontaktskjemaet til e-post eller CRM
