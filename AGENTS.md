# Golf Cart Optimization

Prototype to show golf-course carts, battery percent, and whether each cart is connected to the charging system.

- Keep cart types in `packages/shared`.
- Web UI in `apps/web`; API in `apps/api`.
- Do not add native mobile/desktop apps until the web + API slice is solid.
- Never commit `.env` secrets.
- When writing Markdown, follow `markdown_convention.md`.

## Prototype-v2 and the public link

Version-two work stays on branch `prototype-v2`. Do not merge that branch into `develop`. Leave the screens on `develop` alone.

A commit and push of `prototype-v2` updates GitHub only. It does not change https://vahidsarfi-hyper.github.io/golf_cart_optimization/v2/ .

To show that commit on the link:

1. Push `prototype-v2` to origin first. The Pages job checks out that remote branch while it builds.
2. Publish by pushing `develop`. The workflow is `.github/workflows/pages.yml`, and it runs on a push to `develop`. An empty commit on `develop` is enough. The job builds `develop` at the site root and the latest `prototype-v2` into `v2/`.
3. Wait until that Actions run succeeds.
4. Open https://vahidsarfi-hyper.github.io/golf_cart_optimization/v2/ and refresh. The public site has no API. The pages use the demo bundled in the web build.
