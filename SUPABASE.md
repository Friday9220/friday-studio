# Sådan sætter du den interne kundeside op

Den interne side ligger på `intern.html`. Indtil databasen er sat op, kører den som demo, og alt gemmes kun i den browser, du bruger. Når du har fulgt trinene her, deler du og Ahmad de samme kunder, og alle bookinger fra hjemmesiden lander automatisk på siden.

Det tager cirka 10 minutter og er gratis.

## 1. Opret en database hos Supabase

1. Gå til [supabase.com](https://supabase.com) og tryk **Start your project**. Log ind med din GitHub-konto.
2. Tryk **New project**.
3. Giv projektet navnet `friday-studio`, vælg en adgangskode (gem den et sikkert sted), og vælg regionen **Central EU (Frankfurt)**.
4. Tryk **Create new project** og vent et minut, til projektet er klar.

## 2. Opret tabellerne

1. Åbn **SQL Editor** i menuen til venstre, og tryk **New query**.
2. Åbn filen [`supabase/schema.sql`](supabase/schema.sql) her i projektet, kopier alt indholdet, og indsæt det.
3. Tryk **Run**.
4. Nederst vises **Jeres hemmelige nøgle**: en lang række bogstaver og tal. Kopier den, for du skal bruge den i trin 4.

Du kan altid finde nøglen igen ved at køre `select key from access_keys;` i SQL Editor.

## 3. Forbind hjemmesiden til databasen

1. Gå til **Project Settings → API** i Supabase.
2. Kopier **Project URL** og nøglen der hedder **anon public**.
3. Åbn [`config.js`](config.js) og indsæt dem:

```js
window.FRIDAY_CONFIG = {
  supabaseUrl: 'https://xxxxxxxx.supabase.co',
  supabaseAnonKey: 'eyJhbGciOi...',
  notifyEmail: 'din@mail.dk'
};
```

Den offentlige anon-nøgle må gerne stå i filen. Databasen er låst, så hjemmesiden kun kan oprette nye bookinger og aldrig læse kunderne.

Du kan også bare sende mig de to værdier, så sætter jeg dem ind.

## 4. Jeres hemmelige link

Linket til den interne side er hjemmesidens adresse efterfulgt af `intern.html#k=` og den hemmelige nøgle fra trin 2:

```
https://friday9220.github.io/friday-studio/intern.html#k=DIN_HEMMELIGE_NØGLE
```

Gem linket som bogmærke på computer og mobil, og send det kun til Ahmad. Nøglen står efter `#`, så den bliver aldrig sendt til GitHub eller gemt i deres logs.

Hvis linket nogensinde kommer ud, laver du en ny nøgle i SQL Editor:

```sql
delete from access_keys;
insert into access_keys (key) values (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));
select key from access_keys;
```

## 5. Mail ved nye bookinger

Hvis `notifyEmail` er udfyldt i `config.js`, sender hjemmesiden en mail via [FormSubmit](https://formsubmit.co) hver gang nogen booker et møde.

1. Første gang nogen booker, sender FormSubmit en mail til adressen med knappen **Activate Form**. Tryk på den. Du kan teste det ved selv at booke et møde.
2. I den mail står også en tilfældig kode. Sæt den ind i stedet for din mailadresse i `notifyEmail`, så din mail ikke kan ses i koden.

Vil I begge have mailen, så skriv Ahmads mail i feltet **CC** på FormSubmits side, eller lav en fælles mail som videresender til jer begge.

## Sådan bruges siden

- Vælg øverst, om du er **Jomaa** eller **Ahmad**. Siden husker det, og dit navn kommer på de noter, du skriver.
- Kunderne står i kolonner efter fase: Ny henvendelse, Møde planlagt, Møde holdt, Tilbud sendt, Vundet og Tabt.
- Tryk på en kunde for at åbne den. Her kan du sætte mødetidspunkt og ansvarlig, skrive i mødeloggen, og flytte kunden til en ny fase.
- I mødeloggen vælger du, om noten er en **Samtale**, en **Idé**, et **Ønske**, **Næste skridt** eller en almindelig **Note**.
- **+ Ny kunde** opretter en kunde, I selv har mødt ude.
- Siden henter nyt hvert halve minut, så I ser hinandens ændringer.
