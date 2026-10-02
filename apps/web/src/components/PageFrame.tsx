import type { ReactNode } from "react";

export function PageFrame({
  title,
  headline,
  note,
  children
}: {
  title: string;
  headline: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <article className="page">
      <header className="page-head">
        <h1>{title}</h1>
        <p className="headline">{headline}</p>
        {note ? <p className="lede">{note}</p> : null}
      </header>
      {children}
    </article>
  );
}
