# Landing page plan

The landing page becomes the home screen, laid out like the dashboard screenshot. Clicking the map opens the current prototype as a full fleet page. Each of the eight energy cards opens its own page. The optimization oval stays on the landing page and goes nowhere yet.

No code changes until this plan is accepted.

## Pages

| From the landing page | Route | What opens |
|---|---|---|
| Course map | `/fleet` | Current prototype, rearranged |
| Solar Production | `/solar` | Current generation |
| Battery Capacity | `/battery` | Energy stored in the fleet |
| Power Demand & Electricity Price | `/demand` | Load and price right now |
| Trips schedules | `/trips` | Rounds happening today |
| Solar Forecast | `/forecast/solar` | Expected sun |
| Capacity Forecast | `/forecast/capacity` | Expected stored energy |
| Demand Forecast & Future Price | `/forecast/demand` | Expected load and price |
| Future Trips | `/forecast/trips` | Rounds still ahead |
| Optimization output | none | Visible only |

`/` is the new home. A small bar on every page, including the home page, jumps straight to any other page. You do not return home first.

## Landing page

Two columns, same arrangement as the screenshot.

**Left — Fleet Status.** A compact course map on top, then a short cart list with the same filters as today (`all`, `charging`, `unplugged`, `low`) and the same rows: name, percent, status, hole, updated time, and charger label. This list is a preview of live cart data. Clicking the map leaves this page. Clicking a cart row stays here and only highlights that cart, the way the prototype does today.

**Right — Energy Balance.** A blue “Current status” column and a green “Forecast” column, four cards each. Each card shows its name and one headline number so the dashboard is readable before you open it. The blue oval sits under both columns and is not a link.

Numbers on these cards are placeholders until they should be real. Suggested headlines, matching the screenshot where it has them:

- Solar Production — 82.8 kW
- Battery Capacity — 40.2 kWh available, Charging
- Power Demand & Electricity Price — current kW and ¢/kWh
- Trips schedules — rounds on the course now
- The four forecast cards — one headline for the next 8 hours (see Forecast window)

The `115` beside the battery in the screenshot is ambiguous. Treat it as the count of cart batteries in the fleet and label it that way, unless it should mean something else.

## Fleet page

This is the current screen, with the layout flipped.

- The course map fills the main area.
- Fleet status sits on the right: the four counts (fleet, on charger, unplugged, low battery), the filters, and the cart list.
- Cart dots and list rows still select each other.
- Data still comes from the local API on the same timer.

## Moving between pages

Every page, including the landing page and the fleet page, has the same thin bar along the top. It is the way from any page to any other page.

The bar is a row of small marks, in the same order as the dashboard:

- Home
- Fleet
- Four blue marks for current status: Solar, Battery, Demand, Trips
- Four green marks for forecast: Solar, Capacity, Demand, Trips

Each mark shows a short label. The page you are on is filled in; the others are outlines. Clicking a mark opens that page directly. The optimization oval is not in the bar, because it still has no page.

The big cards on the landing page stay as they are. The bar is the second way in, and the only way once you have left home.

## Clock

The prototype clock is 10:00 AM, on every energy page and on the fleet snapshot.

- Current status: 6:00 AM through 10:00 AM, every 10 minutes (25 readings)
- Forecast: 10:00 AM through 6:00 PM, every 10 minutes (49 readings)

Energy in kWh holds each kW reading for 10 minutes and does not count the closing reading again. Stored energy changes by charger energy in minus round energy out. Each cart pack is 6.00 kWh. A charger delivers 1.50 kW while a pack has room. A round is 2 hours at 1.20 kW, which is 2.40 kWh.

## The eight pages

Each page is one subject, with a title, the headline number, one main view, and a short table. Content is mock for now, in the same spirit as the cart data. No new API.

**Solar Production** (`/solar`). A gauge of output at 10:00 AM, plus the 6:00 AM–10:00 AM curve. Energy since 6:00 AM is those readings held for 10 minutes each.

**Battery Capacity** (`/battery`). Combined energy in the carts. Show available kWh, whether the fleet is net charging, and a breakdown by cart: percent, kWh, and on charger or not. This is the fleet’s batteries, not a separate building battery.

**Power Demand & Electricity Price** (`/demand`). Charger load and price from 6:00 AM to 10:00 AM. Load is 1.50 kW for each pack that still has room.

**Trips schedules** (`/trips`). Rounds in progress. Each row: tee time, hole, cart, battery at start, and a rough energy use for that round. This is what is draining the carts now.

**Solar Forecast** (`/forecast/solar`). Expected kW from 10:00 AM to 6:00 PM. Headline is total kWh over that span.

**Capacity Forecast** (`/forecast/capacity`). Available kWh from 10:00 AM to 6:00 PM. The change equals charger energy minus round energy. Mark every reading on or under the low-battery line.

**Demand Forecast & Future Price** (`/forecast/demand`). Charger load and price from 10:00 AM to 6:00 PM. Mark cheap and expensive readings.

**Future Trips** (`/forecast/trips`). Rounds that tee off from 10:00 AM to 6:00 PM. Each round is 2.40 kWh. Headline is the total of those new rounds.

## How it would be built

- The current screen moves into the fleet page. The new home is only the dashboard.
- Add a small client-side router. The app has none today, and ten pages is enough to justify one.
- Cart data stays on the API. The eight energy pages read local mock data.
- The optimization oval is a button with no route.
- The same top bar is on every page: Home, Fleet, four current-status marks, four forecast marks.
- Current status covers 6:00 AM–10:00 AM. Forecast covers 10:00 AM–6:00 PM. Both step every 10 minutes. The fleet and the energy totals use the same 10:00 AM snapshot.
