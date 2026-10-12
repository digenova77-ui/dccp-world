import { createFileRoute } from '@tanstack/react-router'
import { PLATE } from "@/dccp/truth/plate";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/story")({ component: Story });

interface Quote { text: string; who: string }
interface Chamber { key: string; title: string; headline: string; source: string; quotes: Quote[] }

function Story() {
  const [chambers, setChambers] = useState<Chamber[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    void fetch("/registry/chambers.json")
      .then(res => { if (!res.ok) throw new Error("missing"); return res.json() as Promise<Chamber[]> })
      .then(setChambers)
      .catch(() => setFailed(true))
  }, [])

  return (
    <main className="story">
      <p className="story-kicker">2D · the telling</p>
      <h1>One engine. The person first.</h1>
      <p className="lede">This is the philosophical page. The 3D world is the same story, standing on the Earth. They meet at a Unity ID. This address is /story. A second hostname is not registered in this build.</p>
      <p><a className="story-enter" href="/">Bind a Unity ID and enter the 3D world</a> <a className="story-enter" href="/pyramid">The Giza cards</a></p>
      <ol className="story-list">
        <li>
          <h2>The Conscious Cosmos</h2>
          <p>Philosophy companion. One picture. Not a measurement.</p>
          <img className="story-plate" src="/conscious-cosmos.png" alt="The Conscious Cosmos, a philosophy companion. One picture, not a measurement." />
          <p>{PLATE}</p>
        </li>
      </ol>
      {failed ? <p>The chambers did not load. The 3D world is still at the root.</p> : null}
      {chambers === null && !failed ? <p>Loading the chambers we actually hold…</p> : null}
      <ol className="story-list">
        {(chambers ?? []).map(c => (
          <li key={c.key}>
            <h2>{c.title}</h2>
            <p>{c.headline}</p>
            {c.quotes[0] ? <blockquote><p>“{c.quotes[0].text}”</p><footer>{c.quotes[0].who}</footer></blockquote> : null}
            <p className="story-source">{c.source}</p>
          </li>
        ))}
      </ol>
    </main>
  )
}
