import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { keys } from "../lib/queries"
import { computeClimberScores } from "../lib/points"
import Header from "../components/Header"
import Avatar from "../components/Avatar"

const GRADES = ["V0", "V1", "V2", "V3", "V4inho", "V4", "V4ão", "V4asso"]

export default function Rankings() {
  const [tab, setTab] = useState("climber")

  const { data: borders } = useQuery({
    queryKey: keys.borders(),
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase.from("borders").select("id, file")
      const map = {}
      for (const b of (data || [])) map[b.id] = b.file
      return map
    },
  })

  const { data: rankings } = useQuery({
    queryKey: keys.rankings(),
    staleTime: 60_000,
    queryFn: async () => {
      const [ascRes, routeRes, profRes] = await Promise.all([
        supabase.from("ascents").select("climber_id, route_id, attempts"),
        supabase.from("routes").select("id, grade"),
        supabase.from("profiles").select("id, display_name, avatar_url, border_id, border_id_2"),
      ])
      const ascents  = ascRes.data  || []
      const routes   = routeRes.data || []
      const profiles = profRes.data  || []

      const profileMap = {}
      for (const p of profiles) {
        profileMap[p.id] = { name: p.display_name, avatar: p.avatar_url, borderId: p.border_id, borderId2: p.border_id_2 }
      }

      const scores = computeClimberScores(ascents, routes)

      return Object.entries(scores)
        .map(([id, { pts, byGrade }]) => ({
          name: profileMap[id]?.name || "anon",
          avatar: profileMap[id]?.avatar || null,
          borderId: profileMap[id]?.borderId || null,
          borderId2: profileMap[id]?.borderId2 || null,
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
        supabase.from("profiles").select("id, display_name, avatar_url, border_id, border_id_2"),
      ])
      const ascents  = ascRes.data  || []
      const routes   = routeRes.data || []
      const profiles = profRes.data  || []

      const profileMap = {}
      for (const p of profiles) {
        profileMap[p.id] = { name: p.display_name, avatar: p.avatar_url, borderId: p.border_id, borderId2: p.border_id_2 }
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
          borderId: profileMap[id]?.borderId || null,
          borderId2: profileMap[id]?.borderId2 || null,
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
          <li key={i} style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Avatar src={r.avatar} name={r.name} borderFile={borders?.[r.borderId]} borderFile2={borders?.[r.borderId2]} size={72} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{i + 1}. {r.name}</span>
                <span className="grade">{r.pts} pts</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--gray)", marginTop: 4, flexWrap: "wrap", display: "flex", gap: "0 8px" }}>
                {GRADES.map((label, g) =>
                  r.byGrade[g]
                    ? <span key={g}>{r.byGrade[g]}x{label}</span>
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
