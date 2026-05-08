import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function Rankings() {
  const [rankings, setRankings] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from("ascents").select("climber_id, route_id"),
      supabase.from("routes").select("id, grade"),
      supabase.from("profiles").select("id, display_name"),
    ]).then(([ascRes, routeRes, profRes]) => {
      const ascents  = ascRes.data  || []
      const routes   = routeRes.data || []
      const profiles = profRes.data  || []

      const gradeMap = {}
      for (const r of routes) {
        gradeMap[r.id] = r.grade ?? 0
      }

      const nameMap = {}
      for (const p of profiles) {
        nameMap[p.id] = p.display_name
      }

      const scores = {}
      for (const a of ascents) {
        const pts = gradeMap[a.route_id] ?? 0
        scores[a.climber_id] = (scores[a.climber_id] || 0) + (pts * pts)
      }

      const sorted = Object.entries(scores)
        .map(([id, pts]) => ({
          name: nameMap[id] || "anon",
          pts,
        }))
        .sort((a, b) => b.pts - a.pts)

      setRankings(sorted)
    })
  }, [])

  return (
    <div className="page">
      <nav className="nav">
        <Link to="/walls">&larr; walls</Link>
      </nav>

      <h1>rankings</h1>

      {rankings === null && <p>loading...</p>}
      {rankings?.length === 0 && <p>no ascents yet.</p>}

      <ul className="route-list">
        {(rankings || []).map((r, i) => (
          <li key={i}>
            <span>{i + 1}. {r.name} </span>
            <span className="grade">{r.pts} pts</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
