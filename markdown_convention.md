# Markdown convention

Rules for GitHub and this repo.

## Math

- Inline math is `$$...$$` on one line. Do not use a single `$`.
- A price next to math is `<span>$</span>`.
- Display math is a `$$` block. Do not start a line in the block with `+`, `-`, or `*`. Put the operator at the end of the previous line.
- A stacked equation uses `|\begin{aligned}` and lines that start with `&`.
- If one formula has two or more `_` subscripts, put a space after each `_` (`p^{c}_ {i,t}`).
- Do not write `\$`, `\,`, or `\;` in math. Use `\mathrm{USD}` and `\thinspace`. Put a space after `\thinspace` when a letter follows (`\thinspace E`).

## Headings and links

- Headings must be unique.
- Do not put `:`, `,`, `&`, `(`, or `)` in a heading.
- Number a heading with a dash (`## 0-Confirmed assumptions`), not a dot. GitHub strips dots.
- Do not add HTML `<a>` anchors. Link to the heading text: spaces become hyphens, and `_` is kept.

## Mermaid

- One short label per node. No `<br/>` and no extra detail line.
- Use `curve: stepAfter`. Do not use `curve: linear`. Linear draws diagonal arrows on GitHub.
- Do not put `:`, `,`, or `/` in a label.
