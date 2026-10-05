# Prototype second version

Status: ready to build (October 2026). Do this work on branch `prototype-v2`. That branch was cut from `develop` while `develop` was still the current prototype. It follows [section 6](optimization-strategy.md#6-next-steps-for-the-prototype) of the optimization strategy, and it replaces the eight energy pages described in the [landing page plan](landing-page-plan.md).

Do the steps in order. Each step names the files it touches, the screen the user should see, and how to check it. Types stay in `packages/shared`. The browser UI stays in `apps/web`. The simulator and optimizer stay in `apps/api`. Do not add a native app. Do not merge `prototype-v2` into `develop`.

## 0-Branches and the public site

Two branches. One website with two folders.

| Branch | What it holds | Where it appears after publish |
|--------|---------------|--------------------------------|
| `develop` | The current prototype. Leave its screens alone. | https://vahidsarfi-hyper.github.io/golf_cart_optimization/ |
| `prototype-v2` | This version. Every step below happens here. | https://vahidsarfi-hyper.github.io/golf_cart_optimization/v2/ |

`prototype-v2` starts as a copy of `develop`, plus this plan. Building here does not change the public site. GitHub Pages runs only when `develop` is pushed, and it publishes that branch at the site root. A push of `prototype-v2` alone does not deploy.

Check out `prototype-v2` before editing application code. `git status` should show that branch. Run the app locally with `npm run dev` and open http://localhost:5173 . That local server is version two. The public link stays version one until the publish step at the end of this section.

### Publish both addresses

Do this only after version two has a screen worth showing, and only after `prototype-v2` has been pushed to origin. Push this branch first. If the workflow below runs before that remote branch exists, the Pages build fails and the current site stops updating.

GitHub runs `.github/workflows/pages.yml` from the branch that was pushed. Put the same workflow on `develop` and on `prototype-v2`. Trigger it on a push to either branch. Each run checks out both branches, builds them, and uploads one site:

- Build `develop` with `VITE_BASE` set to `/golf_cart_optimization/`. Copy `apps/web/dist` to the artifact root.
- Build `prototype-v2` with `VITE_BASE` set to `/golf_cart_optimization/v2/`. Copy that `apps/web/dist` into `v2/` inside the same artifact.
- Keep `npm ci` and Node 22, as the current workflow does.

The address to send is the root link. Version two is that same link with `v2/` on the end. Refreshing a deeper version-two path, such as `v2/fleet`, is served by the root `404.html`. Point that file at the version-two app when the path contains `/v2/`, and at the current app otherwise. The existing build already copies `index.html` to `404.html` inside each app. The combined site needs one root `404.html` that chooses between them.

Pages still publishes the web build only. The API does not run on that site. Screens on the public link use data bundled in the web app.

## 0-What this version is for

The current prototype shows carts on a map and eight energy pages. Each energy page is one series, a chart, and a table of the same 10-minute points. Demand on those pages is charger power only. The optimization control does nothing.

This version shows a course owner three things:

1. Whether the carts that are about to leave are ready.
2. Whether the fleet is protecting this month's demand peak.
3. What that protection is worth, unmanaged charging against the plan.

Cart-barn staff still get the map, plug state, and a short send-next list.

## 1-Screens

Four pages. The top bar on every page is **Today**, **Fleet**, **Plan**, **Value**. The page you are on is filled in. The others are outlines.

| Page | Route | Question it answers |
|------|-------|---------------------|
| Today | `/` | What is the site doing across this day, and is the peak safe? |
| Fleet | `/fleet` | Where is each cart, and is it plugged in and ready? |
| Plan | `/plan` | What does the optimizer do in the next 15 minutes, and what does the bill become? |
| Value | `/value` | What is a year of this fleet worth on this tariff? |

Keep these routes working as redirects until their content has moved, then remove the pages:

| Old route | Send it to |
|-----------|------------|
| `/solar`, `/forecast/solar` | Today, solar layer |
| `/battery`, `/forecast/capacity` | Today, readiness strip |
| `/demand`, `/forecast/demand` | Today, site-import chart |
| `/trips`, `/forecast/trips` | Fleet, tee sheet |

## 2-What leaves the main screens

- The home-page cart list. Fleet already has the map and the list. At 75 carts a second list does not fit.
- Eight energy destinations and the blue and green columns. Now and forecast become one day with a marker for the current time.
- The slot table beside every chart. Readings stay behind a "show readings" control for checking the mock.
- Charger kilowatts labeled as power demand. Cart charge and discharge are a layer on site import.
- Price drawn as its own line on a private scale. Price is a band under the day: off-peak, peak, event.
- The solar gauge and the panel count. Solar is an area on the site chart.
- A headline that only says stored kilowatt-hours. Show carts ready for the next wave, usable energy above what those rounds need, and whether the fleet is net charging or discharging.
- The optimization oval that goes nowhere. Plan is a real page in the bar as soon as the simulator exists.

## 3-Build order

1. Shared energy types.
2. Tariff files and a bill calculator.
3. One realistic mock day.
4. Today screen on that day.
5. Fleet screen for 75 carts and the tee sheet.
6. Day and month simulator, unmanaged against a placeholder plan.
7. Optimizer v0, then the Plan screen.
8. Optimizer v1, assignment and the send-next list.
9. Value screen for a year of interval data.

Check the browser after every step that changes a page. Click through Today, Fleet, and any new control. Confirm the other pages that share the same day still match.

## 4-Shared energy types

**Why.** Rounds, prices, and `EnergySample` live only in `apps/web/src/energy.ts`. The API cannot bill or simulate until both sides share the same shapes.

**Procedure.**

1. Add types in `packages/shared` for a tariff, a demand window, a time-of-use period, a site load sample, meter topology, a tee-time round, cart energy state, and a power setpoint.
2. Meter topology is one of two values: one site meter, or a separate pump meter.
3. A site sample is one 15-minute step. It carries irrigation kilowatts, clubhouse kilowatts, solar kilowatts, cart charge kilowatts, cart discharge kilowatts, and the energy price for that step.
4. A demand window carries its name, the steps it applies to, the charge in <span>$</span>/kW, the month-to-date peak, and the peak target $$D^\star_w$$.
5. Point `apps/web` at these types. Delete the duplicated shapes in `energy.ts` once [6-Mock site for one day](#6-mock-site-for-one-day) is producing the samples.
6. Run the shared package build and the web typecheck. The existing fleet page must still load carts from the API.

## 5-Tariff files and the bill calculator

**Why.** The owner-facing number is a bill split, not a cent-per-kilowatt-hour chart.

**Procedure.**

1. Add tariff files the API can load for PG&E B-19, SCE TOU-GS-3, HECO Schedule J, Con Ed SC 9, and FPL GSD-1 and GSDT-1. Use the 2026 rates already cited in the strategy. Record the source next to each number.
2. Each file lists energy prices by time of use, each demand window and its <span>$</span>/kW, and fixed charges.
3. Write a calculator that takes 15-minute site import and export for a billing month and returns energy cost, demand cost per window, fixed charges, and the total.
4. Demand for a window is the highest average import over that window's billing interval. Confirm 15 versus 30 minutes per tariff before coding the interval. The open point is Con Ed and FPL.
5. Add a small API route that accepts a profile and a tariff name and returns the bill split. Cover one summer day and one winter day for each tariff with a fixture, including a known spike so the demand line is easy to check by hand.
6. Do not show this route in the UI yet. Today and Plan consume it in later steps.

## 6-Mock site for one day

**Why.** The current mock is 12 carts, charger-only load, a clear-sky solar curve, and rounds of 2.4 kWh. That cannot show irrigation, a demand charge, or readiness.

**Procedure.**

1. Build one site in the API: 75 carts, 6 kWh each, usable energy from 20% to 90% state of charge.
2. Use 15-minute steps for a full 24 hours. Pick a clock time that can move. The first demo may still start at 10:00 AM, but the series must include the night before and the next morning.
3. Add night irrigation, about 10 PM to 6 AM, with a few pump starts that set a tall 15-minute spike.
4. Add a clubhouse curve that rises late morning and again late afternoon.
5. Add solar on the same meter as a clear day, with a note in the data that clouds are not modeled yet.
6. Add rounds of about 4 hours. Each round has a tee time, carts required, and energy per cart. Keep the old 2.4 kWh figure out of this site.
7. Store both meter topologies. On one meter, pumps are inside site load. On a separate pump meter, pumps are excluded from the cart bill.
8. Serve the day from the API. The web app stops inventing energy samples.

## 7-Today screen

**Why.** This replaces the landing page and the eight energy pages.

**Procedure.**

1. Make `/` the day. Remove the energy tiles and the dead optimization oval from that layout.
2. Draw one 24-hour chart. Stack irrigation, clubhouse, solar, and net cart power. Draw site import on top. Put a vertical marker at the current time.
3. Draw the peak target as a horizontal line. Label it with the active demand window.
4. Shade golf waves on the time axis so an afternoon peak sitting on play is visible.
5. Put price in a band under the chart, not on a second axis.
6. Above the chart, show three readouts: carts ready for the next wave, usable kilowatt-hours above the energy those rounds need, and net charge or discharge right now.
7. Add one meter control named Separate pump meter. On means the pumps are on their own meter. Off means one site meter, so the pumps share the cart meter. The name stays Separate pump meter in both positions. Switching it must change the chart and the bill card together. Off, the pump spike is on the chart. On, it is gone from the cart bill and the chart says so.
8. Add a tariff chip and a bill card: one row per demand window, with month-to-date peak, target, and dollars if the target is missed. Energy cost sits under those rows.
9. Add "show readings" for the raw 15-minute table. It is closed by default.
10. Scrubbing the time marker updates the readouts, the carts-on-course count, and the bill so far. Wire the marker once Fleet and the bill calculator exist. Until then, show the marker at the demo time and finish the scrub check in [8-Fleet screen](#8-fleet-screen).
11. In the browser, open Today at desktop width and at a narrow width. Confirm the chart still has the peak line, the meter toggle still switches the pump layer, and Fleet still opens from the bar.

## 8-Fleet screen

**Why.** Barn staff need carts, plugs, and the next tee. They do not need a second copy of the site chart.

**Procedure.**

1. Keep the large map, the counts, and the list. Counts stay filters: fleet, plugged, unplugged, no signal.
2. Add a filter for carts that are short for their next tee.
3. Drive the list from the 75-cart mock. Selecting a cart still highlights the same cart on the map.
4. On the cart detail, show next tee time and whether the pack covers that round plus the readiness margin. Drop fields that only repeat charger trivia.
5. Add the tee sheet on this page, under the list or beside it on a wide screen. Each row is tee time, carts required, and ready or short. Do not add a separate drive-power chart.
6. Remove the cart list from Today if it is still there.
7. In the browser, filter to short carts, select one, and confirm the map and the detail agree. Open Today and confirm the ready count matches the tee sheet.

## 9-Day and month simulator

**Why.** The bill difference is the product. The optimizer can plug in after a placeholder plan already runs the same path.

**Procedure.**

1. In `apps/api`, simulate one day, then one billing month, on 15-minute steps.
2. Implement unmanaged charging first: a plugged cart charges at full power until it is full or it leaves for a round.
3. Add a placeholder plan that only enforces an import cap and a readiness floor. This stands in until optimizer v0 replaces it.
4. Run both policies through the bill calculator on the same tariff and the same meter topology.
5. Return the two bills, the two import series, and the peak each policy set in each window.
6. On Today, add a two-position control: unmanaged and planned. The chart and the bill card swap together. The night pump spike should grow when unmanaged charging stacks on the pumps, and shrink when the plan holds the cap. On the separate pump meter, night charging must not change the pump bill.
7. In the browser, flip the control and the meter toggle. Check a cart that is out on a round: it must not charge in either policy.

## 10-Optimizer v0 and the Plan screen

**Why.** Approach B in the strategy is the first real plan: the plugged-in fleet is one battery, then a priority rule splits power across carts.

**Procedure.**

1. Solve a linear program for the fleet battery over the next 24 to 36 hours at 15-minute steps. Bounds on energy and power change with how many carts are plugged in and how much energy upcoming rounds require.
2. Objective: energy cost, demand above the peak target, wear per kilowatt-hour discharged, and a penalty for missing readiness. Subtract demand-response revenue only when an event is present in the mock. Export price is zero on this version.
3. The peak target comes from a simple billing-cycle rule until the nightly planner exists: it never sits below the month-to-date peak, and it does not try to flatten day 1 of the month down to zero.
4. Split the next 15 minutes of fleet power across carts. Discharge carts with the most energy above their next round and the longest wait. Charge carts with the soonest tee time first. Spread discharge so one cart does not take all the wear.
5. If a cart has no link, the command for that cart is charge-only up to the readiness level, taken in the earliest open slots before its tee. If the meter feed is missing, discharge is zero. Plan can toggle both. Use Cart 22 for the lost link. Add the short cart, Cart 70, onto the 10:30 wave without removing Cart 22, so Cart 22 keeps a tee time and stays on the send-next list either way. Turning the link off and on changes that cart's command, not whether the cart appears.
6. Replace the placeholder plan in the simulator with this result.
7. Add `/plan`. Put it in the top bar. Remove any leftover oval.
8. Plan shows, from top to bottom:
   - The Separate pump meter control from Today, and the send-order from Fleet. Show which one is selected. Do not let Plan change them. Draw both in gray so they read as status. Keep the meter switch green when separate pump meter is on.
   - Meter feed lost and Cart 22 link lost, which Plan does change.
   - Bill before and after, using the unmanaged run and this plan.
   - The same site chart as Today, with both import curves and the peak target.
   - The next 15 minutes only: fleet kilowatts, and which limit is binding. The limits are readiness, import cap, peak target, and wear.
   - One sentence of intent, for example holding charge for the evening window, or charging only in the gaps between pump cycles.
9. Leave per-cart setpoints for the whole horizon collapsed. Opening a cart shows that cart's day: stored energy, time on a round, time on a plug, charge, and discharge.
10. In the browser, run unmanaged and the plan, confirm the after-bill is the plan bill, and open one cart from Plan and from Fleet. Both must show the same next tee and the same state of charge.

## 11-Optimizer v1

**Why.** Approach C assigns specific carts to rounds. That is what makes "send this cart next" a result of the plan rather than a sort of the list.

**Procedure.**

1. Extend the model with a binary assignment of carts to rounds, the energy balance per cart, and the readiness constraint at each tee time. Keep charge and discharge continuous. A simultaneous charge and discharge binary is unnecessary while export is unpaid and wear is in the objective.
2. Solve on a time limit, warm-started from the previous solution, so a 15-minute cycle can finish. Record the solver choice in the API notes. Hosting is still an open question in the strategy.
3. On Fleet, show the send-next list as five rows: cart, percent, next tee, spare energy above the round. A control on Fleet switches the order, and Plan shows the same choice without letting it change. Optimizer order ranks by who is shortest for the next round, then by the soonest tee. Priority rule ranks by battery percent, fullest first.
4. Keep the tee sheet fixed, so this switch does not change charge, discharge, or the bill. Which cart goes out would change the money only while that assignment is still open: a wave that needs fewer carts than are ready, several carts short with little time left, or a peak before the next tee. Until assignment is solved, the two orders are a preview of that choice.
5. In the browser, switch the order and confirm the five carts change while the Plan dollar figures stay put. Turn Cart 22 link lost on and off and confirm that cart stays on the list and its early slots change between charge and hold.

## 12-Value screen

**Why.** This is the walkthrough for a course owner: a year of interval data, a tariff, and a power level.

**Procedure.**

1. Add `/value` to the bar.
2. Ship one sample year of 15-minute site load so the page works with no upload. Then accept an upload of the same shape.
3. The user picks a tariff and a power per cart: 1.5, 3, or 6 kW. Under the tariff and power controls, show a note across the full width of the page. Name the utility and the state, then the demand windows, energy prices, and omissions this model actually bills. The note changes with the tariff.
4. Run the month simulator for each month of the year under unmanaged charging and under the plan. Sum the bill difference. Show a typical month and a high month beside the year total.
5. Draw the load-duration curve of the sample year. Mark the slice of the peak the fleet can cover given its usable energy and the chosen power. The chart's job is to show that value sits in the short tall peaks.
6. Beside that curve, show the twelve monthly bills open. Columns are month, before saving, after saving, and difference. Before saving is the unmanaged bill. After saving is the plan bill plus wear. Difference is before saving minus after saving. The demand charge in this table uses a target of zero, so it is the whole peak for the month.
7. In the browser, switch tariff and power level and confirm the year total, the note, and the curve all change. On a wide window the curve and the monthly table sit side by side. On a narrow window they stack, curve first. Upload a second file and confirm the sample year is replaced.

## 13-Checks before this version is done

- Today, Fleet, Plan, and Value are the only items in the bar. Old energy routes redirect.
- Today has one meter control, Separate pump meter. On is a separate pump meter. Off is one site meter. Plan shows that state and the Fleet send-order in gray, and does not change them. The meter switch stays green when it is on.
- The unmanaged or planned choice on Today agrees with the cart commands Plan shows for that choice.
- Switching optimizer order and priority rule changes the send-next list and leaves the dollar figures unchanged.
- Cart 22 stays on the send-next list. Losing its link changes that cart's command.
- Value shows the duration curve and the monthly bills side by side. The table names before saving, after saving, and the difference. The tariff note names the utility and the state and spans the page.
- A cart on a round never receives a charge or discharge command.
- The bill card names demand windows and uses the calculator, not a hand-written dollar figure in the page.
- Send-next on Plan matches the cart detail on Fleet.
- Desktop and a narrow window both keep the peak line and the ready count visible.
- No new `.env` secrets, and no mobile or desktop app project.
