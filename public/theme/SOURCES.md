# Theme background photo sources

All 10 images are downloaded from Unsplash (free to use for commercial/noncommercial purposes
under the [Unsplash License](https://unsplash.com/license), no attribution required, but
credited here for provenance):

- `slate.jpg` — https://unsplash.com/photos/1541140134513-85a161dc4a00
- `ocean.jpg` — https://unsplash.com/photos/1542608974741-76a4c0d4a3b7
- `sunset.jpg` — https://unsplash.com/photos/1490735891913-40897cdaafd1
- `forest.jpg` — https://unsplash.com/photos/1626657171364-4af23203469b
- `rose.jpg` — https://unsplash.com/photos/1615919737249-965d68c7e439
- `mint.jpg` — https://unsplash.com/photos/1618130070080-91f4d55a2383
- `lavender.jpg` — https://unsplash.com/photos/1625934036482-2dccff707564
- `amber.jpg` — https://unsplash.com/photos/1600721860729-d90ff446f6fa
- `midnight.jpg` — https://unsplash.com/photos/1475274047050-1d0c0975c63e
- `coral.jpg` — https://unsplash.com/photos/1631255117612-0967acbecc93

Downloaded at 1600px wide, quality 55 (via Unsplash's image-resizing query params) — chosen
for file size since these render behind a semi-opaque scrim (`app/globals.css`'s `--bg-art`),
so full resolution/quality isn't visible anyway. Referenced from `app/globals.css` as local
paths (`/theme/*.jpg`) rather than hotlinked, so the backgrounds don't break if Unsplash ever
removes these specific photos.
