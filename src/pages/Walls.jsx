import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { keys } from "../lib/queries"
import Header from "../components/Header"

const THEME_KEY = "spray-theme"
const THEMES = ["system", "light", "dark"]
const THEME_LABELS = { system: "◑", light: "☀", dark: "☾" }

function applyTheme(theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme")
  } else {
    document.documentElement.setAttribute("data-theme", theme)
  }
}

export default function Walls() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "system")

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  function cycleTheme() {
    setTheme(t => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length])
  }

  const { data: walls } = useQuery({
    queryKey: keys.walls(),
    queryFn: async () => {
      const { data } = await supabase
        .from("walls")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
      return data || []
    },
  })

  return (
    <div className="page">
      <Header />

      {!walls && <p>loading...</p>}
      {walls?.length === 0 && <p>Sem muros.</p>}

      <ul className="wall-list">
        {(walls || []).map((w) => (
          <li key={w.id}>
            <Link to={`/walls/${w.id}`} style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{w.name}</span>
              <span style={{ color: "var(--gray)", fontSize: 12 }}>{w.created_at?.slice(0, 10)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <p style={{ marginTop: 32, fontSize: 13, color: "var(--gray)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="https://github.com/tobyshooters/spray">github</a>
        <button className="theme-toggle" onClick={cycleTheme}>{THEME_LABELS[theme]} {theme}</button>
      </p>
    </div>
  )
}
