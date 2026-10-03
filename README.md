# Golf Cart Optimization

See every golf cart on a course, its battery level, and whether it is plugged into the charging system.

This is a **browser prototype**. The pages show mock carts, battery level, and charger status. Real vehicles and Android / iOS / Windows apps come later; they can reuse the same API and shared types.

## Run

Needs Node.js (already used to set up this repo).

```powershell
cd C:\Users\vahid\golf_cart_optimization
npm install
npm run dev
```

Then open http://localhost:5173

- Web: Vite on port 5173
- API: http://localhost:3001/api/carts

## Layout

- `apps/web` — browser UI
- `apps/api` — local server
- `packages/shared` — cart types used by both
- `docs/brief.md` — prototype scope

## Share a link

Current prototype:

https://vahidsarfi-hyper.github.io/golf_cart_optimization/

Version two:

https://vahidsarfi-hyper.github.io/golf_cart_optimization/v2/

