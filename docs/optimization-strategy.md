# Golf Cart Fleet Energy Optimization: Strategy

Status: discussion draft (October 2026). Tariff and program numbers are **2026 values taken from utility and regulator documents**. Each one links to its source.

**Contents**

- [0-Confirmed assumptions](#0-confirmed-assumptions)
- [1-Summary the prototype and the idea](#1-summary-the-prototype-and-the-idea)
- [2-Opinion where the value really is](#2-opinion-where-the-value-really-is)
- [3-What golf course owners need pain points and trends](#3-what-golf-course-owners-need-pain-points-and-trends)
- [4-State comparison California Hawaii New York Florida](#4-state-comparison-california-hawaii-new-york-florida)
- [5-Optimization design](#5-optimization-design)
- [6-Next steps for the prototype](#6-next-steps-for-the-prototype)
- [7-Open questions](#7-open-questions)

## 0-Confirmed assumptions

These were agreed with the product owner before writing. Anything else in this document is labeled as an opinion, an example input, or an open question.

| Topic | Assumption |
|------|------------|
| Battery | Lithium (LiFePO4) packs only; lead-acid carts are out of scope |
| Fleet | 60-90 carts at 5-7 kWh each. Worked example: **75 carts x 6 kWh = 450 kWh**, about **315 kWh usable** in a 20-90% state-of-charge window |
| Hardware | Bidirectional inverter **on the cart**, plugged into a normal outlet in the cart barn |
| Power per cart | Shown as three scenarios: **1.5, 3 and 6 kW**, which gives about **112, 225 and 450 kW** of fleet power when every cart is plugged in |
| Control scope | The optimizer controls **carts only**. Irrigation, clubhouse, facilities and solar are forecast inputs |
| Metering | Both cases are covered: **one site meter**, and a **separate pump-station meter** |
| Value stages | (1) behind the meter, (2) demand response / virtual power plant (VPP) programs, (3) export and wholesale markets |
| States | California, Hawaii, New York, Florida |

---

## 1-Summary the prototype and the idea

### What exists in the repo today

- A React + Vite dashboard (`apps/web`) and an Express API (`apps/api`), with cart types in `packages/shared`.
- A mock day in `apps/web/src/energy.ts`:
  - 12 carts with 6 kWh packs, charging one way at 1.5 kW.
  - 100 kW solar plant on a clear-sky curve.
  - Rounds of 1.2 kW for 2 hours (2.4 kWh each).
  - A stepped price of 9 / 15 / 28 / 16 cents per kWh.
  - 10-minute slots and a fixed 10:00 AM "now".
- Pages for fleet, solar, battery, demand and trips (now and forecast), plus a placeholder **"Optimization output"** button with no page behind it.
- No tariff model, no demand charges, no discharge, no optimizer.

### What the product adds

Hardware on each cart that can **charge and discharge** through the cart-barn outlets. With that hardware, the fleet becomes a **distributed battery behind the course's utility meter**. The optimizer then decides, every few minutes, how much each plugged-in cart charges or discharges. It must keep every cart ready for its next round and create money for the owner by:

1. Cutting **demand charges** (peak shaving).
2. Moving charging into **cheap or solar hours** and discharging in expensive hours (arbitrage and solar self-consumption).
3. Earning **program payments** (demand response, VPP, export credits) where they exist.

The course's own situation shapes all of this:

- Nighttime **irrigation pumping** already loads the meter, so overnight charging is not "free".
- The clubhouse, kitchen, HVAC and maintenance shop load the meter during the day.
- The **tee sheet** fixes when carts must be full and away from the plug.

---

## 2-Opinion where the value really is

### 2.1 Demand charges first, arbitrage second

In all four states the biggest lever is the **demand charge**: a $/kW fee on the highest 15- or 30-minute average power in the billing month (or within a time-of-use window). Golf course load is spiky: pump stations starting, HVAC on a hot afternoon, a banquet kitchen. A handful of short spikes set the bill for the whole month. A cart fleet holding a few hundred kWh can clip those spikes well.

Pure time-of-use energy arbitrage is **thin** for most of these tariffs:

- PG&E B-19 summer peak versus off-peak is about **18.6 vs 12.0 cents per kWh**, a spread of about 6.6 cents.
- FPL GSDT-1 on-peak versus off-peak base energy is **6.0 vs 1.5 cents per kWh** ([FPL rates](https://www.fpl.com/content/dam/fplgp/us/en/rates/pdf/business-rates-sept2026.pdf)).
- After about 10-15% round-trip loss and battery wear (see 2.4), those spreads mostly disappear.

The exceptions are **Hawaii**, where evening export pays far more than daytime export, and **wholesale price spikes or demand-response events** in California and New York.

### 2.2 The irrigation insight

Courses irrigate at night, often around 10 PM to 6 AM, to avoid wind, evaporation and on-peak prices. The catch: most of these tariffs also carry an **"anytime" maximum-demand charge**, and when the pumps share the meter with the cart barn, the night pumping peak often *is* the monthly maximum. Examples:

- PG&E B-19 maximum demand, year-round: $37.37/kW.
- SCE TOU-GS-3 facilities-related demand: about $22/kW.
- Con Ed all-hours demand: $27.33/kW in summer.
- HECO Schedule J: $15.72/kW.
- FPL GSD-1: $12.70/kW.

Charging 75 carts at night stacks directly on top of the pumps. That leads to a strategy that sounds backwards but often wins:

- **Charge during the day from solar or super-off-peak energy** (California winter super-off-peak is 9 AM-2 PM).
- **Hold the charge through the evening peak**, and discharge if it pays.
- **Charge only gently at night, in the gaps between pump cycles**, under a hard site import cap.

The two metering cases behave differently:

- **One site meter**: the carts can shave the pump peak (a big win), but careless night charging *raises* it (a big loss).
- **Separate pump meter**: the carts can neither help nor hurt the pump bill. Night charging only affects the clubhouse meter, so it becomes much cheaper, and the cart value comes from the clubhouse load profile alone.

The optimizer needs a meter-topology setting for each site.

### 2.3 Back-of-envelope: what 100 kW of peak reduction is worth

These are demand-charge dollars per month **if 100 kW is removed from every demand window that applies**. They are delivery plus generation demand charges from the published tariffs, before taxes and surcharges.

| Tariff | Summer month | Winter month |
|--------|-------------:|-------------:|
| PG&E B-19, secondary (peak $46.16 + max $37.37) | ~$8,350 | ~$3,970 (max $37.37 + winter peak $2.31) |
| SCE TOU-GS-3 (facilities $22.02 + summer on-peak $17.79) | ~$3,980 | ~$2,520 (winter mid-peak $3.16) |
| Con Ed large-business time-of-day ($12.75 + $28.64 + $27.33) | ~$6,870 | ~$2,520 ($18.15 + $7.04) |
| HECO Schedule J ($15.72) | ~$1,570 | ~$1,570 |
| FPL GSD-1 ($12.70) | ~$1,270 | ~$1,270 |
| FPL GSDT-1 (on-peak $11.90 + max $0.79) | ~$1,270 | ~$1,270 |

So **about $1.3k-8.4k per month per 100 kW**, which is about $15k-70k per year. But 100 kW is only achievable if the fleet has the **energy** to hold it for as long as the peak lasts:

- Clipping a **15-minute** pump-start spike by 100 kW needs about **25 kWh**. Easy.
- Holding 100 kW off for **1 hour** needs about **100 kWh**. Feasible on most days.
- Flattening a full **5-hour 4-9 PM window** by 100 kW needs **500 kWh**, which is more than the whole fleet (315 kWh usable) even before golf.

**Conclusion:** demand-charge value comes from clipping the **top of the load-duration curve**, the few short, tall peaks, not from flattening long windows. A site's value depends on how "peaky" its interval data is. The first sales tool should therefore be a **site assessment that reads 12 months of 15-minute meter data** and simulates the fleet against it.

### 2.4 Battery wear is a real cost, so price it

A simple, widely used way to price wear is to divide the pack replacement cost by its lifetime energy throughput:

$$
\kappa\ [\mathrm{USD}/\mathrm{kWh\ discharged}] \approx \frac{C_{\mathrm{pack}}\ [\mathrm{USD}/\mathrm{kWh}]}{N_{\mathrm{cycles}}\times \mathrm{DoD}}
$$

([method reference](https://exa.ai/library/publication/8k33m50q0ps); LFP is typically rated at 2,500-9,000 equivalent full cycles, [source](https://sunlithenergy.com/calendar-aging-vs-cycle-aging/)).

Illustrative inputs only, to be replaced with real pack prices and warranty curves:

- Pack at $400-700/kWh, 4,000-6,000 cycles at 70-80% depth of discharge gives roughly **$0.08-0.25 per kWh discharged**.

Because this is the same size as a time-of-use spread, the optimizer must include it. Otherwise it will happily cycle packs for 5 cents of arbitrage. Shallow, slow cycling (low C-rate, mid-range state of charge) is gentler on LFP. Calendar aging (time spent at high charge and high heat) also counts, so **parking carts at 100% overnight in a hot barn costs life too**. That is an argument for "charge just in time for the tee time".

### 2.5 Power per cart: my lean is about 3 kW

| Per cart | Fleet power (75 carts) | Hours to empty the 315 kWh usable | C-rate on 6 kWh |
|---------:|----------------------:|----------------------------------:|----------------:|
| 1.5 kW | ~112 kW | ~2.8 h | 0.25C |
| 3 kW | ~225 kW | ~1.4 h | 0.5C |
| 6 kW | ~450 kW | ~0.7 h | 1C |

- **1.5 kW** is cheap and gentle, and covers spike clipping at a typical 150-400 kW course. It is too slow to refill a fleet between morning and afternoon waves.
- **3 kW** covers spike clipping, 1-2 hour demand-response events and fast midday solar refills, at a moderate C-rate.
- **6 kW** means about 110 A DC on a 56 V pack, a 1C rate, more heat, and a likely interconnection study for about 450 kW of inverter. The extra power rarely helps, because the fleet runs out of energy first.

This is an opinion to test in the site-assessment simulator, not a decision.

### 2.6 Main risks

1. **OEM battery warranty.** E-Z-GO ELiTE lithium has an 8-year battery warranty ([E-Z-GO](https://ezgo.txtsv.com/personal/shopping-tools/why-e-z-go/technology/elite-lithium)). Discharging to the grid through third-party hardware may void it. An OEM partnership or our own warranty backstop is probably required.
2. **Interconnection and certification.** An onboard inverter that discharges into the building wiring is a grid-connected inverter. Expect **UL 1741-SB / IEEE 1547** listing and **SAE J3072** (onboard-inverter vehicle-to-grid), plus each utility's interconnection rules: California Rule 21, HECO Rule 14H, New York's interconnection requirements, FPL's net-metering and interconnection rules. A **non-export** configuration (discharge only to cover on-site load) is usually a simpler path than export. A plain wall outlet is not an approved export point on its own.
3. **Carts are not home when value peaks.** The 4-9 PM peaks in California and Hawaii overlap twilight golf. Summer afternoons are both the busiest golf time and the highest demand-charge time.
4. **Ownership.** Many fleets are **leased** (often through OEM finance for about 4-5 years), so the owner of the battery may not be the owner of the electric bill.
5. **Incumbent telematics.** E-Z-GO Pace, Club Car, and Yamaha YamaTrack already put GPS and battery data on carts ([overview](https://fleets.levyelectric.com/blog/golf-cart-fleet-management-guide)). We should integrate with them rather than compete on GPS.
6. **Program eligibility for mobile batteries.** Many storage programs assume a fixed battery, and some (for example Hawaii BYOD Plus) also require paired solar. Cart fleets may need a special agreement or an aggregator.

---

## 3-What golf course owners need pain points and trends

### 3.1 Pain points (from 2026 industry sources)

- **Labor.** Labor is the largest operating cost, and "lack of qualified labor" is consistently the top maintenance challenge ([Fairway Control](https://fairwaycontrol.com/blog/biggest-challenges-golf-course-operators-2026/), [Golf Inc.](https://golfincmagazine.com/the-state-of-golf-operations-2026-outlook/)). Whatever we build must **not add work** for cart-barn staff. Plugging carts in has to stay as simple as it is today.
- **Costs rising faster than inflation.** Labor, insurance, agronomy, utilities and equipment all keep climbing, while growth in rounds has leveled off after the post-2020 boom ([Golf Inc.](https://golfincmagazine.com/the-state-of-golf-operations-2026-outlook/), [NGCOA Pulse 2026](https://files.ngcoa.ca/files/ngcoa/files/pulse-report/en-pulsereport2026edition.pdf)). Owners are looking for **cost lines they can cut without hurting the golfer experience**, and the electric bill is one.
- **Water and irrigation.** Water rates are rising, drought restrictions are tightening, and pumping is expensive. Some Southwest courses spend about $1M per year on water ([USGA](https://www.usga.org/content/dam/usga/images/course-care/water-resource-center/watersummitarticles/214426%20DeLozier%20and%20Hinckley,%20Golf%20Development%20and%20Operations.pdf)). Pump stations can be **up to half of facility electricity**, and pump peaks drive demand charges. Courses already cut costs by widening the watering window and lowering peak flow ([GCSAA pump-station study](https://mpfs.io/assets/golfprop/2018/10/GCSAA_GolfCourseEnergyUse_Part2_PumpStations.pdf), [USGA Green Section](https://www.usga.org/course-care/green-section-record/58/2/reducing-irrigation-pumping-costs.html)). One Florida course irrigates 11 PM-5:30 AM specifically to avoid a demand charge ([Old Collier](https://exa.ai/library/publication/nvdl2sh9jsh)).
- **Cart availability and battery health.** A cart that dies mid-round is a refund and a bad review. Telematics vendors sell low-battery alerts and usage-based maintenance for exactly this reason ([Joyride](https://joyride.city/blog/golf-cart-rental-management-software-for-golf-courses/)).
- **Pace of play.** It is a top-3 golfer experience factor. Better pace data lets courses remove buffer tee times and sell more rounds; Erin Hills reported about $700k per season ([Tagmarshal](https://www.tagmarshal.com/5-ways-golf-cart-gps-systems-are-helping-hazeltine-and-erin-hills-reshape-on-course-operations/)).
- **Turf damage from cart traffic.** Compaction repair is a hidden maintenance cost; cart heat maps help locate it ([Golf Inc.](https://golfincmagazine.com/using-the-latest-technology-to-create-a-connected-golf-course-makes-improvements-across-the-board/)).
- **Resilience.** Clubhouses act as community shelters and need refrigeration, point of sale and lighting during outages. Examples: Trafalgar (35 kW solar, about 107-125 kWh battery), Queenstown (42 kWh), Aboyne (54 kWh) ([Club Management](https://clubmanagement.com.au/trafalgar-golf-club-powers-up-as-resilience-hub/), [Queenstown](https://www.queenstownnz.co.nz/stories/post/driving-change-inside-queenstown-golf-clubs-energy-revolution/), [Ceiba](https://www.ceiba-renewables.co.uk/projects/solar-storage-at-aboyne-golf-club/)). **A 75-cart lithium fleet holds about 450 kWh, several times those stationary systems.**

### 3.2 Trends ("hot topics")

- **The connected course.** Tee sheet, cart GPS, irrigation, weather stations, point of sale and maintenance systems are starting to share data, with AI on top. The complaint is that these systems are still siloed ([Golf Inc.](https://golfincmagazine.com/using-the-latest-technology-to-create-a-connected-golf-course-makes-improvements-across-the-board/)). An energy optimizer that reads the tee sheet and the irrigation schedule fits this direction.
- **Tee-sheet integration as table stakes.** Pace-of-play vendors integrate with 25+ tee-sheet providers ([Tagmarshal](https://www.tagmarshal.com/5-critical-2025-golf-cart-gps-system-data-learnings-to-implement-this-season/)). We need the same to know when carts leave.
- **New cart telematics hardware.** E-Z-GO Pace announced its next-generation in-cart unit, Onyx, in January 2026 ([Levy Fleets](https://fleets.levyelectric.com/blog/golf-cart-fleet-management-guide)).
- **Lithium replacing lead-acid**, with "opportunity charging" (charge any time, any duration) marketed as safe for the pack ([E-Z-GO](https://ezgo.txtsv.com/personal/shopping-tools/why-e-z-go/technology/elite-lithium)). This makes flexible charging schedules acceptable to operators.
- **Solar plus storage at clubs**, sometimes financed with a power purchase agreement (PPA) so the club pays no capital ([SolarQuarter](https://solarquarter.com/2024/01/24/south-africas-royal-johannesburg-and-kensington-golf-club-unveils-largest-solar-microgrid/)).
- **Electrified maintenance equipment** (electric mowers and utility vehicles) adds more night charging load to the same barn and meter. This makes managed charging more valuable.
- **No golf-cart vehicle-to-grid pilot found.** Fleet V2G pilots exist for vans and utility trucks (MCAS Miramar, Delmarva/University of Delaware) ([OSTI](https://www.osti.gov/biblio/2580493), [UD report](https://bpb-us-w2.wpmucdn.com/sites.udel.edu/dist/5/8632/files/2026/06/UD-Exelon-Report-V2G-Fleet-Operation-2026.pdf)). The closest golf example is a lithium cart "mobile microgrid" at Warren Wilson College ([Microgrid Knowledge](https://www.microgridknowledge.com/solar-microgrids/article/33015852/sun-charged-golf-carts-electric-tractors-demonstrate-mobile-microgrids-for-land-managers)). This looks like **open space**.

### 3.3 Value ideas beyond the electric bill

1. **Cart-readiness guarantee.** "Every cart sent out has enough charge for its round." This is the promise that makes the energy features acceptable to operators.
2. **"Send this cart next" list** for cart-barn staff, ranked by charge and upcoming tee times. It cuts guesswork and evens out wear across the fleet.
3. **Battery health and warranty report.** Equivalent cycles, state of health and time spent at high charge per cart, as proof that we are not hurting the packs.
4. **Avoided electrical upgrades.** Managed charging lets a course add carts, electric mowers or chargers **without upgrading its service or transformer**. This is often worth more than a year of savings.
5. **Outage mode.** The fleet powers clubhouse essentials (refrigeration, point of sale, lights, phones) during an outage. That needs islanding-capable hardware and is a later phase.
6. **Irrigation-aware advice.** The optimizer does not control pumps (by agreement), but it can **report** when the pump schedule sets the monthly peak and what moving it would save.
7. **Monthly savings statement** split into demand charges, energy, programs and wear, plus a sustainability line (solar self-consumption and estimated CO2).

---

## 4-State comparison California Hawaii New York Florida

A typical 18-hole course with a clubhouse peaks somewhere around 100-500 kW, depending on the pump station and the clubhouse. That usually puts it on a **medium commercial demand tariff**. The rate named below for each state is the usual default; the right one depends on the site's actual peak.

One general rule applies in every state: **export credits mostly pay for renewable generation**. Energy a cart charges from the grid and then exports is often not credited, or not allowed. Behind-the-meter discharge (covering the site's own load, no export) avoids that problem everywhere.

### 4.1 California (PG&E, SCE; CAISO market)

- **Tariffs**:
  - PG&E **B-19** applies at 500-999 kW, with a voluntary option below 499 kW. Smaller sites use **B-10**.
  - SCE **TOU-GS-2** covers 20-200 kW and **TOU-GS-3** covers 200-500 kW.
- **Demand charges** (15-minute intervals, three stacked windows):
  - PG&E B-19, secondary voltage, effective March 1, 2026: summer peak $46.16/kW, summer part-peak $10.52/kW, **maximum demand $37.37/kW year-round** ([tariff](https://www.pge.com/tariffs/assets/pdf/tariffbook/ELEC_SCHEDS_B-19.pdf)).
  - SCE TOU-GS-3: facilities-related demand of about $22/kW (any hour), plus time-related summer on-peak demand of about $17.79/kW ([SCE TOU-GS-3-RTP sheet](https://www.sce.com/sites/default/files/custom-files/PDF_Files/ELECTRIC_SCHEDULES_TOU-GS-3-RTP.pdf), [fact sheet](https://www.sce.com/sites/default/files/custom-files/PDF_Files/TOU-GS-3_Rate_Fact_Sheet_072025_Accessible.pdf)).
- **Time-of-use windows**: peak is **4-9 PM every day** on PG&E, and 4-9 PM weekdays for SCE's summer on-peak. PG&E has a **winter super-off-peak from 9 AM to 2 PM in March-May** (B-19 secondary: 6.4 cents per kWh versus 16.2 cents at peak).
- **Event pricing**: PG&E Peak Day Pricing ($0.90/kWh during events) and SCE Critical Peak Pricing (12-15 events per year, 4-9 PM) both reward being able to shed load on hot days.
- **Programs**:
  - **ELRP** pays $2/kWh of load reduction from 4 to 9 PM, May-October, up to 60 hours per year, with no penalty for missing an event. The non-residential program runs through 2027 ([CPUC](https://www.cpuc.ca.gov/elrp/)). The ceiling is about 60 h x 100 kW x $2 = $12k per year; real event counts are usually far lower.
  - **DSGS Option 3** (storage virtual power plant, which explicitly includes V2X) pays season totals of $62-83/kW for 2-4 hour duration, plus a 30% bonus in recent years. **2026 is closed to new entrants except EV chargers** ([CEC](https://www.energy.ca.gov/filebrowser/download/9603?fid=9603), [rates](https://efiling.energy.ca.gov/GetDocument.aspx?tn=262552)).
  - The **Capacity Bidding Program** (day-ahead, May-October) is open through aggregators ([PG&E DR](https://www.pge.com/en/save-energy-and-money/energy-saving-programs/demand-response-programs.html)).
- **Wholesale**: through a demand-response provider (PG&E Rule 24) as a CAISO proxy demand resource, or later through distributed-resource aggregations.
- **How the optimizer should behave**:
  - Charge midday, from solar and super-off-peak energy.
  - Hold charge for 4-9 PM.
  - Protect the anytime maximum, which is often set by night pumping on a shared meter.
  - On event days, reserve energy for ELRP, Peak Day Pricing or Critical Peak Pricing.

### 4.2 Hawaii (Hawaiian Electric; no wholesale market)

- **Tariffs**: Oahu **Schedule J** (above 25 kW or 5,000 kWh) and **Schedule P** (300 kW and up on Oahu; 200 kW on Maui and Hawaii Island).
  - October 2026 effective rates: J is **$15.72/kW** and **38.8 cents per kWh**; P is **$32.04/kW** and **35.4 cents per kWh** ([effective rates](https://www.hawaiianelectric.com/documents/billing_and_payment/rates/effective_rate_summary/2026/efs_2026_10.pdf)).
- **Demand rule**: Schedule J demand is based on the highest 15-minute demand **together with an 11-month average** ([bill guide](https://www.hawaiianelectric.com/documents/products_and_services/business_account_services/understanding_your_bill_schedule_j.pdf)). It behaves like a ratchet: **one bad peak costs money for months**. Peak protection matters all year, not just in summer.
- **Energy is very expensive** (about 35-39 cents per kWh), so **every kWh of solar kept on site is worth a lot**. Solar self-consumption is the core value.
- **Time-of-use**: TOU-J is closed to new customers. **EV-J and EV-P** pilot rates (lower demand charges, time-of-use structure) are open through March 17, 2027 and are worth checking for a cart-barn meter ([HECO FAQ](https://www.hawaiianelectric.com/customer-service/frequently-asked-questions?FAQFilter1=847&page=1)).
- **Programs**:
  - **BYOD Plus** pays **$400/kW upfront** for a battery **paired with solar** that discharges during a customer-chosen **2-hour daily window between 5 and 9 PM**, plus export credits ([BYOD Plus](https://www.hawaiianelectric.com/products-and-services/customer-incentive-programs/bring-your-own-device-plus)). Whether a mobile cart fleet qualifies is an open question.
  - **Smart Renewable Energy Export** on Oahu pays **32.9 cents per kWh in the evening (5-9 PM)**, 13.5 cents daytime and 18.9 cents overnight ([SRE Export](https://www.hawaiianelectric.com/products-and-services/smart-renewable-energy-programs/smart-renewable-energy-export)). That is a real **19-cent arbitrage** on solar energy.
  - **Fast DR** (commercial and industrial customers of 50 kW and up, Oahu and Maui), and **Power Partners** grid-services contracts through aggregators ([programs](https://www.hawaiianelectric.com/products-and-services/customer-incentive-programs)).
- **How the optimizer should behave**:
  - Soak up midday solar into the carts.
  - Avoid any new 15-minute peak, because of the ratchet.
  - Discharge in the evening, either into the clubhouse load or, if enrolled, inside the committed 2-hour window.

### 4.3 New York (Con Edison, PSEG Long Island, National Grid, NYSEG; NYISO market)

- **Territory matters.** Westchester and the few New York City courses are on **Con Edison**. Long Island courses are on **PSEG Long Island**. Upstate courses are on National Grid, NYSEG, RG&E, Central Hudson or Orange & Rockland. The structures are similar, but the numbers below are Con Ed's.
- **Tariffs**: Con Ed **SC 9** applies above 10 kW. **Rate I** is conventional (one monthly maximum). **Rate III** is time-of-day (10-1,500 kW) ([Con Ed](https://www.coned.com/en/our-energy-future/electric-vehicles/best-electric-delivery-rate-for-your-charging-station)).
- **Demand charges** (Con Ed large-business delivery, published figures, [source](https://www.coned.com/en/accounts-billing/your-bill/time-of-use)):
  - Conventional: **$42.80/kW** in summer, $33.50/kW in other months.
  - Time-of-day, all three windows added together: weekdays 8 AM-6 PM in summer, $12.75; weekdays 8 AM-10 PM, $28.64 in summer and $18.15 otherwise; all hours, $27.33 in summer and $7.04 otherwise.
  - Caveat: Con Ed publishes these as its **large-business** example rates. The SC 9 Rate I / Rate III figures for a 100-500 kW golf course will differ, so pull the exact tariff leaf for each site.
- **Programs** (Con Ed Rider T, [Smart Usage Rewards](https://www.coned.com/en/save-money/rebates-incentives-tax-credits/rebates-incentives-tax-credits-for-commercial-industrial-buildings-customers/smart-usage-rewards)):
  - **CSRP** pays **$6/kW-month in Westchester** and $18 in Brooklyn, Bronx, Manhattan and Queens, plus $1/kWh during events. Notice is **21 hours**; events come in 4-hour network call windows on weekdays, 11 AM-11 PM.
  - **DLRP** pays **$18-25/kW-month** plus $1/kWh, with **2 hours' notice or less**, any day, 8 AM to midnight.
  - Rules interact: Value Stack (VDER) customers can only join CSRP's reservation option and permanently give up DRV/LSRV compensation ([guidelines](https://www.coned.com/-/media/files/coned/documents/save-energy-money/rebates-incentives-tax-credits/smart-usage-rewards/smart-usage-program-guidelines.pdf)).
- **Wholesale**: NYISO demand-response programs (for example Special Case Resources) through an aggregator, and **VDER Value Stack** credits for exports by eligible distributed resources ([Value Stack](https://www.coned.com/-/media/files/coned/documents/rates/electric/psc-10/other/vder-value-stack-credits/vder-cred-202606.pdf)).
- **Seasonality**: the golf season and the high summer demand charges coincide. Many northern courses shut down or shrink in winter. **Winter is when the fleet is idle**, and it could earn from winter demand charges if the barn stays powered.
- **How the optimizer should behave**:
  - Manage the long 8 AM-10 PM weekday window. Weekend golf peaks fall outside the time-of-day windows.
  - Keep energy reserved through 4-hour CSRP windows. **4-hour events are energy-limited**: 315 kWh / 4 h is about 79 kW sustained, so the 3 kW and 6 kW scenarios do not raise the kW the fleet can commit.
  - Hold extra reserve for short-notice DLRP events.

### 4.4 Florida (FPL, plus Duke Energy Florida and TECO; no wholesale market)

- **Tariffs**: FPL **GSD-1** (25-499 kW) is **$12.70/kW** with a low base energy charge of about 2.8 cents per kWh, plus fuel and other clauses. The optional **GSDT-1** time-of-use rate charges **$11.90/kW of on-peak demand and only $0.79/kW of maximum demand**. On-peak is **weekdays noon-9 PM, April-October**, and weekdays 6-10 AM and 6-10 PM, November-March ([FPL tariff](https://www.fpl.com/rates/pdf/electric-tariff-section8.pdf), [rates](https://www.fpl.com/content/dam/fplgp/us/en/rates/pdf/business-rates-sept2026.pdf)).
- **The key difference**: on GSDT-1 the anytime maximum is nearly free ($0.79/kW). **Night charging on top of irrigation costs almost nothing in demand charges**, the opposite of California. The value moves to the **on-peak window**, which overlaps prime golf hours.
- **Programs**:
  - **Commercial Demand Reduction (CDR)** pays a **$9.75/kW-month credit** for curtailable load. Eligibility requires an average of at least 200 kW during 3-6 PM in summer months and utility load-control switchgear ([FPL CDR](https://www.fpl.com/business/save/programs/demand-response.html)).
  - **Business On Call** cycles air conditioning ($2 per ton per month), which is not relevant to carts.
- **Export**: net metering covers renewable generation; annual surplus is settled at avoided cost, which is low. There is no wholesale market. **The model is behind the meter only.**
- **How the optimizer should behave**:
  - On GSDT-1, charge overnight and in the morning.
  - Keep carts off the plug, or discharging, from noon to 9 PM on summer weekdays without compromising rounds.
  - On GSD-1, clip the single monthly peak, wherever it falls.

### 4.5 Side-by-side

| | California | Hawaii | New York (Con Ed) | Florida (FPL) |
|---|---|---|---|---|
| Main lever | Stacked demand charges + 4-9 PM | Solar self-use + ratchet demand | Long time-of-day demand windows + DR | Single demand charge or on-peak demand |
| Anytime-max demand | High ($22-37/kW) | $15.72-32.04/kW (ratchet) | $7-27/kW (time-of-day) or $33-43/kW (conventional) | $12.70 (GSD-1) or $0.79 (GSDT-1) |
| Night charging on a shared meter with pumps | Risky | Risky | Moderate | Cheap on GSDT-1 |
| Energy spread | Small (about 6-10 cents) | Large export spread (about 19 cents, Oahu) | Moderate | Small (about 4-5 cents) |
| DR / VPP | ELRP, CBP, DSGS (closed in 2026), PDP/CPP | BYOD Plus, Fast DR, Power Partners | CSRP, DLRP, NYISO | CDR credit |
| Wholesale | CAISO via aggregator | None | NYISO via aggregator | None |
| Stage 3 (export) | Possible, complex | Through SRE / BYOD | Value Stack | Not worth it |

---

## 5-Optimization design

### 5.1 Yes to both: a real-time loop *and* look-ahead planning

Neither layer works alone:

- **Look-ahead alone fails on demand charges.** A demand charge is set by the average power over one 15-minute interval. If a pump starts at minute 3, a plan made at minute 0 is already wrong. Something has to react within seconds to keep this interval's average under target.
- **Real-time alone fails on readiness and energy.** A purely reactive controller doesn't know that 40 carts tee off at 7 AM, that pumps run until 5 AM, or that tomorrow at 4 PM is a demand-response event. It drains carts on the current spike and leaves them empty for the next peak or the next round.

So the design is a **hierarchy**. Slow layers set targets and budgets. Fast layers follow those targets.

### 5.2 Timings

| Layer | Runs | Horizon | Time step | Output |
|-------|------|---------|-----------|--------|
| Seasonal planner | Once or twice a year (offline study) | 12 months | 1 month | Tariff choice, program enrollment, kW to commit |
| Billing-cycle planner | Daily, about 00:30 | Rest of the billing month | 1 day | **Peak target** per demand window; daily wear budget |
| Day-ahead commitment | Daily, about 14:00 (ahead of CSRP's 21-hour notice and day-ahead bid deadlines) | Next 24-48 h | 15 min | Demand-response bids and commitments, BYOD window, readiness plan |
| Look-ahead MPC | **Every 15 min**, plus on events | **24-36 h** | 15 min (optionally 5 min for the first 2 h) | Per-cart setpoints for the next 15 min, which cart goes out next, updated peak targets |
| Real-time controller | **Every 5-60 s** (aim for about 10 s) | Current demand interval | Seconds | Per-cart kW commands |
| Cart-level safety | Continuous, on the cart | none | Milliseconds | Battery management limits; fallback when communication is lost |

Why these numbers:

- **15-minute steps** match the demand-billing interval at PG&E, SCE and HECO. Confirm the interval for Con Ed and FPL, which may use 15 or 30 minutes per tariff. Forecasts don't get better below that.
- **A 24-36 hour horizon** is needed because a 3 PM decision must see tonight's irrigation and tomorrow morning's first tee wave.
- **Re-solve on events, not only on the clock**: tee-sheet changes, a cart unplugged or plugged unexpectedly, a forecast miss beyond a threshold, or a demand-response event notice.

### 5.3 The look-ahead model (deterministic version)

**Sets**

- $$\mathcal{I}$$: carts. $$\mathcal{T}$$: time steps of length $$\Delta t = 0.25$$ h over the horizon.
- $$\mathcal{R}$$: rounds (tee-time groups that need carts).
- $$\mathcal{W}$$: demand windows, such as *anytime maximum*, *summer peak* and *part-peak*, each active on a set of steps $$\mathcal{T}_w$$.
- $$\mathcal{E}$$: demand-response events (committed or candidate).

**Inputs (forecasts and parameters)**

- $$L_t$$: non-cart load on **the meter the carts are on**. It includes the pumps only in the one-meter case.
- $$PV_t$$: solar production behind that meter.
- $$\pi^{imp}_t$$ and $$\pi^{exp}_t$$: import and export energy prices. $$\pi^{exp}_t = 0$$, or export is disallowed, where it isn't paid.
- $$c_w$$: demand charge in <span>$</span>/kW. $$D^\star_w$$: peak target from the billing-cycle planner, at least the month-to-date peak $$\bar D_w$$.
- $$\tau_r$$: tee step of round $$r$$. $$n_r$$: carts round $$r$$ needs. $$o_{r,t} = 1$$ while round $$r$$ is out, including a turnaround buffer. $$e_{r,t}$$: energy round $$r$$ uses per cart in step $$t$$. $$E_r = \sum_t e_{r,t}$$.
- $$h_{i,t} = 1$$ if cart $$i$$ is expected to be on a plug when not on a round (staff behavior, maintenance).
- Cart limits: $$\overline{P}$$ (1.5, 3 or 6 kW), $$\eta^c$$ and $$\eta^d$$ (charge and discharge efficiency), $$\underline{S}$$ and $$\overline{S}_{t}$$ (energy floor and ceiling; the ceiling can rise to 100% just before a tee time).
- $$\kappa$$: wear cost per kWh discharged (section 2.4). $$m$$: readiness margin (for example 20%).
- $$G^{imp}$$: service or transformer import limit. $$G^{exp}$$: export limit (0 for non-export sites). $$B_t$$: demand-response baseline. $$\rho_e$$: demand-response value per kW.

**Decision variables**

- $$p^{c}_ {i,t}, p^{d}_ {i,t} \ge 0$$: charge and discharge power. $$s_{i,t}$$: stored energy in kWh.
- $$x_{i,r} \in \{0,1\}$$: cart $$i$$ is assigned to round $$r$$.
- $$g^{+}_ {t}, g^{-}_ {t} \ge 0$$: grid import and export.
- $$D_w$$: billed peak in window $$w$$. $$q_e \ge 0$$: kW committed to event $$e$$.
- $$\delta_{i,r} \ge 0$$: readiness shortfall (slack with a large penalty $$M$$).

**Constraints**

$$
\begin{aligned}
&\text{(1) energy balance:} && s_{i,t+1} = s_{i,t} + \eta^c p^c_{i,t}\Delta t - \tfrac{1}{\eta^d} p^d_{i,t}\Delta t - \textstyle\sum_r x_{i,r}\thinspace e_{r,t} \\
&\text{(2) plugged-in power:} && p^c_{i,t} + p^d_{i,t} \le \overline{P}\thinspace h_{i,t}\thinspace\big(1 - \textstyle\sum_r x_{i,r}\thinspace o_{r,t}\big) \\
&\text{(3) assignment:} && \textstyle\sum_i x_{i,r} = n_r, \qquad \textstyle\sum_r x_{i,r}\thinspace o_{r,t} \le 1 \\
&\text{(4) readiness at tee time:} && s_{i,\tau_r} + \delta_{i,r} \ge \underline{S} + (1+m)\thinspace E_r\thinspace x_{i,r} \\
&\text{(5) energy window:} && \underline{S} \le s_{i,t} \le \overline{S}_{t} \\
&\text{(6) site balance:} && g^+_t - g^-_t = L_t - PV_t + \textstyle\sum_i \big(p^c_{i,t} - p^d_{i,t}\big), \quad g^+_t \le G^{imp}, \quad g^-_t \le G^{exp} \\
&\text{(7) demand windows:} && D_w \ge g^+_t \ \ \forall t \in \mathcal{T}_w, \qquad D_w \ge D^\star_w \\
&\text{(8) DR delivery:} && B_t - g^+_t \ge q_e \ \ \forall t \in e \\
&\text{(9) wear budget:} && \textstyle\sum_t p^d_{i,t}\thinspace\Delta t \le \Theta_i \\
&\text{(10) end of horizon:} && s_{i,|\mathcal{T}|} \ge s^{end}_i \ \ \text{(or value leftover energy in the objective)}
\end{aligned}
$$

**Objective (minimize)**

$$
\min\ \underbrace{\sum_t \big(\pi^{imp}_t g^+_t - \pi^{exp}_t g^-_t\big)\Delta t}_{\text{energy}} +
\underbrace{\sum_w c_w\thinspace\big(D_w - D^\star_w\big)}_{\text{new demand above target}} +
\underbrace{\kappa \sum_{i,t} p^d_{i,t}\thinspace\Delta t}_{\text{battery wear}} +
\underbrace{M \sum_{i,r} \delta_{i,r}}_{\text{readiness}} -
\underbrace{\sum_e \rho_e\thinspace q_e}_{\text{DR / VPP revenue}}
$$

Notes on the model:

- **No charge/discharge binary is needed** as long as $$\pi^{exp}_ t \le \pi^{imp}_ t$$, because losses and wear make charging and discharging at the same time unprofitable. Without that binary the only integers are the assignments $$x$$.
- **Which cart goes out** ($$x$$) is a real lever. Sending the fullest carts out first lets the optimizer use the rest as the battery. If tee-sheet data isn't available yet, fix $$x$$ with a simple rule and drop it from the model.
- **Hawaii's ratchet** is modeled by raising $$c_w$$ to reflect the extra months a new peak keeps costing.
- **Metering topology** only changes $$L_t$$, $$PV_t$$ and the windows: one meter (pumps inside $$L_t$$) or a separate pump meter (pumps excluded).

### 5.4 Demand charges are monthly, the horizon is 1-2 days

This is the subtle part. The demand charge is set once per month, but the MPC sees only the next 36 hours.

- If the model prices *any* import above the month-to-date peak $$\bar D_w$$, then on day 1 of the month (when $$\bar D_w \approx 0$$) it tries to flatten everything and drains the fleet for nothing.
- If it ignores demand charges, it lets a spike through and pays for it all month.

The fix is the **billing-cycle planner**. Each night it simulates the rest of the month (expected and worst-case days) and picks a **target** $$D^\star_w$$ the fleet can realistically defend every day: the lowest peak the fleet can hold, given expected spikes and its energy. The MPC then only pays for exceeding the target. As the month goes on, $$D^\star_w$$ never drops below what has actually been billed ($$\bar D_w$$). In effect this is "set the bar, then defend it".

### 5.5 Real-time controller

Inputs are live site power from the meter or a current transformer, plus cart telemetry. Every 5-60 seconds within demand interval $$k$$:

1. Measure the energy imported so far in the interval, $$E_k(\tau)$$, and the time left, $$T_{rem}$$.
2. Compute the **average import still allowed** for the rest of the interval without beating the target: $$\bar p_ {allow} = \big(D^\star \cdot 0.25\text{ h} - E_k(\tau)\big) / T_ {rem}$$.
3. Set the fleet command as **MPC setpoint plus correction**, so that non-cart load plus net fleet power stays at or below $$\bar p_{allow}$$. Clamp it to the available charge and discharge power.
4. **Split the command across carts** by priority:
   - Discharge from carts with the most charge above their next-round requirement and the longest time until they're needed.
   - Charge first the carts with the soonest tee time.
   - Spread wear evenly.
5. **Fail safe**: if a cart loses communication, it falls back to "charge only, capped kW, up to readiness level". If the meter feed is lost, all discharge stops.

Because demand is an **interval average**, the controller can tolerate a brief overshoot early in an interval and recover it later. That is gentler on the hardware than chasing every second.

### 5.6 Handling uncertainty

- **Peak buffer**: aim at $$D^\star - \beta$$, where $$\beta$$ is roughly the 90th-percentile 15-minute forecast error of site load. Pump starts and HVAC are the main error sources.
- **Readiness margin** $$m$$ and a minimum floor so a cart always finishes its round. Plan for the **80th-percentile** number of carts needed (walk-ins, groups adding carts) rather than the booked count.
- **Scenario-based MPC (next step)**: optimize over several scenarios for solar, load and rounds. The first-step decisions are shared across scenarios; minimize expected cost, or add a CVaR (worst-tail) term on peak cost.
- **Chance constraints** for readiness, for example "a shortfall probability of at most 1% per round".
- **Learning loop**: compare plan with actual each day and tune $$\beta$$, $$m$$ and the forecasts per site.

### 5.7 Alternative approaches

| Approach | Strengths | Weaknesses | When |
|----------|-----------|------------|------|
| **A. Rules** (for example: no charging during 4-9 PM, cap night charging at X kW, discharge when site load is above a threshold) | Simple, explainable, no solver | Leaves money on the table; thresholds need hand-tuning per site | Baseline and fallback |
| **B. Aggregated "virtual battery" LP + priority dispatch**: treat the plugged-in fleet as one battery with time-varying energy and power bounds; split across carts in real time | Small, fast, robust; no tee-sheet integration needed | Can't optimize which cart goes out; approximate readiness | **Prototype v0** |
| **C. Per-cart MILP with assignment** (section 5.3) | Captures readiness and cart choice exactly | Needs tee-sheet data; heavier model | **v1, once the tee sheet is connected** |
| **D. Stochastic or robust MPC** | Handles forecast risk explicitly | More compute and tuning | v2 |
| **E. Reinforcement learning** trained in a simulator, with MPC as teacher and safety layer | Fast at run time; can learn site quirks | Needs a good simulator; hard to explain and guarantee | Research track |
| **F. Decentralized / price-signal control**: the site broadcasts a limit or price signal, and each cart's onboard controller responds | Survives communication loss; scales to many sites | Coordination is weaker for sharp peaks | For many sites and weak connectivity |

**Recommendation**: deterministic MPC first. Start with **B** in the prototype, move to **C** when tee-sheet data is available, add **D** once real forecast errors are measured, and keep **A** as the always-on fallback.

### 5.8 Forecasting

| Input | Method | Data |
|-------|--------|------|
| Solar | Irradiance forecast + PV model, corrected with on-site production | Weather and irradiance API; inverter data |
| Clubhouse and facilities load | Gradient-boosted or regression model on temperature, day type, events and hour | 15-minute meter history; events calendar |
| Irrigation load | Read the schedule from the irrigation controller, or learn it from meter history; scale with evapotranspiration and rain | Irrigation system; weather |
| Cart demand | Tee sheet (bookings, players, carts per group) plus no-show and walk-in model by weather and day | Tee-sheet integration; history |
| Energy per round | Learned per cart, course and weather (hills, heat, pace) | Cart telematics. The prototype's 2.4 kWh per 2-hour round is a placeholder; real 18-hole rounds take about 4+ hours |
| Prices and tariffs | Time-of-use tables are fixed and known in advance. CAISO and NYISO day-ahead and real-time prices. Probability of a DR event from temperature and grid alerts | Tariff files; ISO feeds; utility notices |

### 5.9 Problem size and solver

Per-cart model (C) with 75 carts, 144 steps (36 h) and about 100 cart-needing rounds:

- About 30-40k continuous variables.
- About 7,500 assignment binaries.
- No charge/discharge binaries (see 5.3).

Open-source **HiGHS** should solve this in seconds to tens of seconds; a time limit plus the previous solution as a warm start keeps it inside the 15-minute cycle. Model **B** is a small LP that solves in well under a second. Solver hosting (HiGHS in Node through a WASM build, `javascript-lp-solver`, or a Python sidecar with HiGHS or CBC) is an open question (section 6).

---

## 6-Next steps for the prototype

These keep to the repo rules: types in `packages/shared`, UI in `apps/web`, API in `apps/api`, no native apps.

1. **Move the energy domain into `packages/shared`.** Today `EnergySample`, rounds and prices live only in `apps/web/src/energy.ts`. Add shared types for tariffs (demand windows, time-of-use periods, $/kW and $/kWh), site load samples, meter topology, tee-time rounds, cart energy state and setpoints.
2. **Tariff files and a bill calculator** for PG&E B-19, SCE TOU-GS-3, HECO Schedule J, Con Ed SC 9 and FPL GSD-1 / GSDT-1. The calculator turns any 15-minute load profile into a monthly bill split into energy, demand per window and fixed charges.
3. **A more realistic mock site**:
   - 75 carts.
   - A full 24-hour day on 15-minute steps.
   - Night irrigation pump load.
   - A clubhouse load curve.
   - A one-meter / separate-pump-meter toggle.
   - Rounds of realistic length.
4. **Simulator in `apps/api`** that runs a day, and then a month, under two policies: **unmanaged charging** (plug in and charge at full power) and **optimized** charging. It reports the bill difference.
5. **Optimizer v0** (approach B: aggregated LP plus priority dispatch), then **v1** (approach C: per-cart with assignment).
6. **"Optimization output" page** behind the existing placeholder:
   - Bill before and after.
   - Site load with and without carts, with the peak target drawn on.
   - Per-cart plan.
   - The "send this cart next" list.
7. **Site assessment tool**: upload 12 months of 15-minute interval data, pick a tariff and power scenario (1.5, 3 or 6 kW), and get estimated annual value. This is the first thing to show a course owner.

## 7-Open questions

- **Solver hosting**: HiGHS in Node (WASM) or `javascript-lp-solver` inside `apps/api`, versus a Python sidecar (HiGHS, CBC, Pyomo). The first keeps one language; the second has better modeling tools.
- **Hardware interface**: what protocol the onboard inverter speaks (a custom API, OCPP-style messages, or a CAN/BMS bridge), and how fast it accepts setpoints. This sets the real-time loop period.
- **Interconnection path**: start **non-export** (behind-the-meter only) to simplify certification? And which listing does the onboard inverter target first?
- **OEM and warranty**: partner with an OEM (E-Z-GO, Club Car, Yamaha) or offer our own battery warranty backstop?
- **Business model**: shared savings, SaaS per cart, or hardware sale, and who owns the savings when the fleet is leased.
- **Program eligibility** of a mobile, intermittently plugged-in fleet: BYOD Plus, DSGS, CSRP/DLRP, CDR.
- **Demand interval per utility**: 15 vs 30 minutes for each Con Ed and FPL tariff.
- **Real energy per round** and **plug-in compliance** by staff. Both need field data from a pilot course.
- **Outage / islanding mode**: in scope for the hardware roadmap or not.

