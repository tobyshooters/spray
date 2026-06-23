import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { keys } from "../lib/queries"
import Header from "../components/Header"

const GRADES = ["V0", "V1", "V2", "V3", "V4inho", "V4", "V4ão", "V4asso"]

export default function Rankings() {
  const [tab, setTab] = useState("climber")

  const { data: rankings } = useQuery({
    queryKey: keys.rankings(),
    staleTime: 60_000,
    queryFn: async () => {
      const [ascRes, routeRes, profRes] = await Promise.all([
        supabase.from("ascents").select("climber_id, route_id, attempts"),
        supabase.from("routes").select("id, grade"),
        supabase.from("profiles").select("id, display_name, avatar_url"),
      ])
      const ascents  = ascRes.data  || []
      const routes   = routeRes.data || []
      const profiles = profRes.data  || []

      const gradeMap = {}
      for (const r of routes) {
        gradeMap[r.id] = r.grade ?? 0
      }

      const profileMap = {}
      for (const p of profiles) {
        profileMap[p.id] = { name: p.display_name, avatar: p.avatar_url }
      }

      const scores = {}
      for (const a of ascents) {
        const grade = gradeMap[a.route_id] ?? 0
        if (!scores[a.climber_id]) {
          scores[a.climber_id] = { pts: 0, byGrade: {} }
        }
        let pts = grade * grade
        if (a.attempts == 1) {
          pts = Math.ceil(pts * 1.5)
        }
        scores[a.climber_id].pts += pts
        scores[a.climber_id].byGrade[grade] = (scores[a.climber_id].byGrade[grade] || 0) + 1
      }

      return Object.entries(scores)
        .map(([id, { pts, byGrade }]) => ({
          name: profileMap[id]?.name || "anon",
          avatar: profileMap[id]?.avatar || null,
          pts,
          byGrade,
        }))
        .sort((a, b) => b.pts - a.pts)
    },
  })

  const { data: setterRankings } = useQuery({
    queryKey: keys.setterRankings(),
    staleTime: 60_000,
    queryFn: async () => {
      const [ascRes, routeRes, profRes] = await Promise.all([
        supabase.from("ascents").select("route_id"),
        supabase.from("routes").select("id, setter_id, grade"),
        supabase.from("profiles").select("id, display_name, avatar_url"),
      ])
      const ascents  = ascRes.data  || []
      const routes   = routeRes.data || []
      const profiles = profRes.data  || []

      const profileMap = {}
      for (const p of profiles) {
        profileMap[p.id] = { name: p.display_name, avatar: p.avatar_url }
      }

      const routeMap = {}
      for (const r of routes) {
        routeMap[r.id] = r
      }

      const scores = {}
      for (const a of ascents) {
        const route = routeMap[a.route_id]
        if (!route) continue
        const grade = route.grade ?? 0
        if (!scores[route.setter_id]) {
          scores[route.setter_id] = { pts: 0, byGrade: {} }
        }
        scores[route.setter_id].pts += grade * grade
        scores[route.setter_id].byGrade[grade] = (scores[route.setter_id].byGrade[grade] || 0) + 1
      }

      return Object.entries(scores)
        .map(([id, { pts, byGrade }]) => ({
          name: profileMap[id]?.name || "anon",
          avatar: profileMap[id]?.avatar || null,
          pts,
          byGrade,
        }))
        .sort((a, b) => b.pts - a.pts)
    },
  })

  const data = tab === "climber" ? rankings : setterRankings

  return (
    <div className="page">
      <Header back={{ to: "/walls", label: "muros" }} />

      <h1>rankings</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className={tab === "climber" ? "" : "theme-toggle"}
          onClick={() => setTab("climber")}
        >
          escalador
        </button>
        <button
          className={tab === "setter" ? "" : "theme-toggle"}
          onClick={() => setTab("setter")}
        >
          routesetter
        </button>
      </div>

      {!data && <p>loading...</p>}
      {data?.length === 0 && <p>{tab === "climber" ? "sem sends." : "sem vias."}</p>}

      <ul className="ranking-list">
        {(data || []).map((r, i) => (
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {r.avatar ? (
              <img src={r.avatar} className="avatar" alt="" />
            ) : (
              <div className="avatar-placeholder avatar">{r.name[0]}</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{i + 1}. {r.name}</span>
                <span className="grade">{r.pts} pts</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--gray)", marginTop: 4 }}>
                {GRADES.map((label, g) =>
                  r.byGrade[g]
                    ? <span key={g} style={{ marginRight: 8 }}>{r.byGrade[g]}x{label}</span>
                    : null
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
