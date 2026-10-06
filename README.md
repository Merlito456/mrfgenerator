# MRF Generator

A TypeScript web app styled as a Windows-native application that generates Material Request
Form (MRF) Excel files from your original template, using the Blaine-OLT inventory workbook
as the items database.

## Application shell

- **Title bar** with app icon and window controls (decorative in the browser).
- **Menu bar** — File (New MRF `Ctrl+N`, Save Draft `Ctrl+S`, Generate MRF…, Exit) and
  Help (**About MRF Generator** `F1`).
- **Toolbar** with New / Save / Generate MRF buttons and a live line-item count.
- **Status bar** showing app status, database counts and the output sheet name.
- **About dialog** (Help → About or `F1`) with app features, advantages over manual MRF
  creation, and developer details:
  *Engr. John Carlo Rabanes, ECE — Nokia Shanghai Bell — OLT Rollout Engineer*.

## How it works

- **Template fidelity** — the app fetches `public/templates/MRF_template.xlsx`, injects the
  header fields and line items directly into the worksheet XML (via JSZip + DOMParser), and
  saves the result. The logo, borders, fonts, merged cells and print setup are preserved
  exactly, because the original file is never rebuilt.
- **Items database** — load the inventory workbook in the app. The
  **Material Master List** sheet becomes the searchable catalog (item code, description,
  UOM, category) and the **Summary** sheet provides stock availability per part number.
- **Form limits** — the template has 8 equipment rows (18–25) and 20
  “LOCAL MATERIALS/ACCESSORIES” rows (27–46); the app enforces those capacities.
- **MRF no. (auto-generated)** — follows the tracker convention
  `{prefix}_{MMDDYYYY}-{seq}_{PLAID}-{SiteName}_{Equipment}_{Company}`, e.g.
  `NOKIA-FN_10052026-001_MIN938-MNUANG_MF2_DNA`. The site name comes from the site
  masterlist, the equipment segment from the Guided Setup answer, and the company
  (default `DNA`) is editable. Uncheck **Auto** in MRF Details to type a number manually.
  The full number is printed in the form's MRF field (F57) and used as the file name;
  the worksheet tab uses the first 31 characters (Excel's sheet-name limit).
- **Drafts** — MRF drafts are kept in browser localStorage.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5175.

## Build

```bash
npm run build
npm run preview
```

## Guided setup (BOM rules)

The **Guided Setup** card builds the line items automatically (`src/lib/bomRules.ts`):

1. **Equipment** — MF2 and/or DF16 base BOM (shelf, fan, power modules, NT, line board,
   uplink SFPs / DF16 equivalents).
2. **Indoor/Outdoor** — outdoor sites route the power cable through **25 PA LTC**
   (`3FE82503AC`, meters = run length) with connectors (`3FE82502AC`).
3. **Transport equipment outside the OLT location (outdoor)** — adds **15 PA LTC**
   (`3FE82503AD`) + 2× connector 15 (`3FE82502AD`) + uplink LC-LC patch cord in 3/5/8 m
   (`3FE52344DAAA/ELAA/FLAA`, one per uplink port).
4. **Tapping point** — power cable length is the smallest of 10/15/20 m
   (`3FE77365BA` / `3FE77365BA-15M` / `3FE77365AA_20m`) that **strictly exceeds** the
   distance (10 m distance → 15 m cable, 7 m → 10 m); **LTC 25 PA meters = the actual
   distance** (calibrated against the sample MRFs):
   - *No* → standard 2× 10 m feed
   - *Just 1* → 1 cable, 25 PA LTC (distance) + 4× connector 25
   - *Both, separate RS1/RS2* → 2 cables (length exceeds the bigger distance), 2 LTC runs + 4× connector 25
   - *Both, same RS* → 2 cables in one LTC run (distance) + 2× connector 25
5. **Grounding** — no LTC; ≤5 m uses pre-made 3/5 m cables exceeding the distance
   (`3FE27505DAAA` / `3FE27505EL`); longer runs use bulk 16 mm² Y/G per meter
   (`L00YG16MM2`, e.g. 10 m → ×10 as in every sample).
6. **Breakers** — `L00CB{rating}A-N` (NADER) or `L00CB{rating}A-S` (SCHNEIDER), 1P,
   ratings 6/16/20/25/32/40/63 A.
7. **Downlink** — SC/UPC–SC/APC simplex cord (`3FE60713*`), default 2 m, quantity
   **16 per 16-port LT unit** (32 for 2 LT cards, 16 for 1 LT / DF16).
8. **LT cards (MF2)** — LWLT-C ×n (`3FE76353AA`, or `3FE76353AA-S` when SW-staged),
   GPON 8×n (`3FE53441AA`), XGS-PON 8×n (`3FE47581AB`); 1 card adds the universal dummy
   plate (`3FE69465AA`, Local section).

Every MRF also includes the **standard install kit** (calibrated from the sample BOMs):
spiral wrap, velcro 10 m, shrinkable tubes 8/12/16 mm ×2, labeller cartridge, cable shoe
#14 ×4, terminal lugs (10 mm² ×6, 16-10 ×2, 8 mm ×6) and white cable tie.

`scripts/calibration-test.mjs` reproduces the provided sample BOMs
(`scripts/calibration/*.json`) from wizard answers — run via `npm run test:smoke`.
Known DB gaps surfaced by calibration: `CFXR-H DF16`, `DF 16GM POWER CABLES(20M)`,
`Silicon Sealant (White)`, `VELCRO BLACK 2m` (substituted with the 10 m roll), and LC/UPC
3 m / 5 m patch cords.

Main section = shelf-level equipment and transceivers (fits the 8 printed rows);
cables/LTC/connectors/breakers/patch cords go to Local Materials (20 rows). Every
generated line stays editable before generating the MRF.

## Filled cells (template map)

Only the right-side header block is populated — the left-side cells
(B8 destination code, B10 site ID, B12 site address) are left untouched.

| Field | Cell |
| --- | --- |
| From | B6 |
| Date | E6 |
| Destination | E8 |
| Site ID | E10 |
| Site address | E11 |
| Equipment rows | A18:B25 (part no/desc), C (package no), D (qty req) |
| Local materials rows | A27:B46, C, D |
| MRF no. | F57 |

Two databases are bundled and load automatically on startup:

- `public/data/blaine-inventory.xlsx` — materials catalog + stock availability (upload a
  newer workbook from the UI to replace it).
- `public/data/sites-masterlist.xlsx` — the MINDANAO Site Activity Monitoring workbook.
  The **GLOBE SITE MASTERLIST** sheet provides the Site ID autocomplete (column A = PLAID);
  picking a site auto-fills the site address from **column L (SITE_ADD)**. The address
  stays editable after auto-fill.
