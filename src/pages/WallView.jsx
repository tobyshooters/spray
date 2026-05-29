import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { keys } from "../lib/queries"
import { useAuth } from "../components/AuthContext"
import WallCanvas from "../components/WallCanvas"
import Header from "../components/Header"

const GRADES = ["V0", "V1", "V2", "V3", "V4inho", "V4", "V4ão", "V4asso"]

function gradeLabel(n) {
  if (n == null) { return "?" }
  return GRADES[n] || "V?"
}


export default function WallView() {
  const { id }                  = useParams()
  const { user }                = useAuth()
  const [sort, setSort]         = useState(() => localStorage.getItem("routeSort") || "date")
  const [asc, setAsc]           = useState(() => localStorage.getItem("routeAsc") !== "false")
  const [masked, setMasked]     = useState(true)
  const [filter, setFilter]     = useState(() => localStorage.getItem("routeFilter") || "all")

  const { data: wall } = useQuery({
    queryKey: keys.wall(id),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("walls")
        .select("*")
        .eq("id", id)
        .single()
      return data
    },
  })

  const { data: routes } = useQuery({
    queryKey: keys.wallRoutes(id),
    queryFn: async () => {
      const { data } = await supabase
        .from("routes")
        .select("*, profiles(display_name), ascents(count)")
        .eq("wall_id", id)
        .order("created_at", { ascending: false })
      return data || []
    },
  })

  const { data: sentRouteIds } = useQuery({
    queryKey: keys.myWallAscents(id, user?.id),
    enabled: !!user && !!routes && routes.length > 0,
    queryFn: async () => {
      const ids = routes.map(r => r.id)
      const { data, error } = await supabase
        .from("ascents")
        .select("route_id")
        .eq("climber_id", user.id)
        .in("route_id", ids)
      return (data || []).map(a => a.route_id)
    },
  })
  const sentSet = new Set(sentRouteIds || [])

  const { data: holds = [] } = useQuery({
    queryKey: keys.holds(wall?.holds_json_url),
    enabled: !!wall?.holds_json_url,
    staleTime: Infinity,
    queryFn: async () => {
      const r = await fetch(wall.holds_json_url)
      return r.json()
    },
  })

  const imageUrl = wall?.image_url || ""
  const thumbUrl = wall?.image_thumb_url || ""

  return (
    <div className="page">
      <Header />

      <h1>{wall?.name || "muro"}</h1>

      {imageUrl && (
        <>
          <WallCanvas
            imageUrl={imageUrl}
            thumbUrl={thumbUrl}
            holds={holds}
            masked={masked}
          >
            <button
              onClick={() => setMasked(!masked)}
              style={{ fontSize: 13, padding: "4px 8px" }}
            >
              {masked ? "ver muro" : "só agarras"}
            </button>
          </WallCanvas>
        </>
      )}

      <div className="header" style={{ marginTop: 32 }}>
        <div className="header-links">
          {user && (
            <Link to={`/walls/${id}/set`} className="btn" style={{marginLeft: "6px", padding: "4px 6px", fontSize: 13}}>
              + abrir
            </Link>
          )}
        </div>
        <div className="header-links">
          {user && (
            <button
              className="theme-toggle"
              onClick={() => {
                const next = filter === "all" ? "unsent" : "all"
                setFilter(next)
                localStorage.setItem("routeFilter", next)
              }}
            >
              {filter === "all" ? "todas" : "faltam"}
            </button>
          )}
          <button
            className="theme-toggle"
            onClick={() => {
              const next = sort === "date" ? "grade" : "date"
              setSort(next); setAsc(false)
              localStorage.setItem("routeSort", next)
              localStorage.setItem("routeAsc", "false")
              void 0
            }}
          >
            sort: {sort}
          </button>
          <button
            className="theme-toggle"
            onClick={() => { setAsc(a => { const v = !a; localStorage.setItem("routeAsc", v); return v }) }}
          >
            {asc ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {!routes
        ? <p>loading...</p>
        : routes.length === 0
          ? <p>sem vias.</p>
          : <ul className="route-list">
              {[...routes].filter(r => filter === "all" || !sentSet.has(r.id)).sort((a, b) => {
                const dir = asc ? 1 : -1
                if (sort === "grade") return dir * ((a.grade ?? -1) - (b.grade ?? -1))
                return dir * (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0)
              }).map((r) => (
                <li key={r.id}>
                  <Link to={`/routes/${r.id}`}>
                    <span>
                      {r.name}

                      {r.profiles?.display_name && (
                        <span style={{ color: "var(--gray)", fontSize: 12 }}>
                          {" "}<br/>por {r.profiles.display_name} em {r.created_at?.slice(0, 10)}
                        </span>
                      )}
                    </span>

                    <span style={{ textAlign: "right" }}>
                      <span className="grade">{gradeLabel(r.grade)}</span>
                      <br/>
                      <span style={{ color: "var(--gray)", fontSize: 12 }}>
                        {sentSet.has(r.id) && (
                          <span style={{ color: "#0c0", fontSize: 15, marginRight: 4 }}>✔</span>
                        )}
                        {r.ascents?.[0]?.count > 0 ? `${r.ascents[0].count} sends` : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
      }
    </div>
  )
}
