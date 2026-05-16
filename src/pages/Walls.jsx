import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
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
  const [walls, setWalls] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "system")

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  function cycleTheme() {
    setTheme(t => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length])
  }

  useEffect(() => {
    supabase
      .from("walls")
      .select("id, name")
      .then(({ data }) => setWalls(data || []))
  }, [])

  return (
    <div className="page">
      <Header />

      {walls === null && <p>loading...</p>}
      {walls?.length === 0 && <p>No walls found.</p>}

      <ul className="wall-list">
        {(walls || []).map((w) => (
          <li key={w.id}>
            <Link to={`/walls/${w.id}`}>{w.name}</Link>
          </li>
        ))}
      </ul>

      <p style={{ marginTop: 32, fontSize: 11, color: "var(--gray)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="https://github.com/tobyshooters/spray">github</a>
        <button className="theme-toggle" onClick={cycleTheme}>{THEME_LABELS[theme]} {theme}</button>
      </p>
    </div>
  )
}
