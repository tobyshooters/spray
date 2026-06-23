import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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


export default function RouteDetail() {
  const { id }                  = useParams()
  const { user }                = useAuth()
  const navigate                = useNavigate()
  const queryClient             = useQueryClient()
  const [stars, setStars]       = useState(3)
  const [sugGrade, setSugGrade] = useState(null)
  const [attempts, setAttempts] = useState(1)
  const [notes, setNotes]       = useState("")
  const [masked, setMasked]     = useState(false)
  const [showFelipe, setShowFelipe] = useState(false)

  const { data: route } = useQuery({
    queryKey: keys.route(id),
    queryFn: async () => {
      const { data } = await supabase
        .from("routes")
        .select("*")
        .eq("id", id)
        .single()
      return data
    },
  })

  const { data: wall } = useQuery({
    queryKey: keys.wall(route?.wall_id),
    enabled: !!route?.wall_id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("walls")
        .select("*")
        .eq("id", route.wall_id)
        .single()
      return data
    },
  })

  const { data: setter } = useQuery({
    queryKey: keys.profile(route?.setter_id),
    enabled: !!route?.setter_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", route.setter_id)
        .single()
      return data?.display_name || null
    },
  })

  const { data: wallRoutes } = useQuery({
    queryKey: keys.wallRoutes(String(route?.wall_id)),
    enabled: !!route?.wall_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("routes")
        .select("*, profiles!routes_setter_id_fkey(display_name), ascents(count)")
        .eq("wall_id", route.wall_id)
        .order("created_at", { ascending: false })
      return data || []
    },
  })

  const { data: sentRouteIds } = useQuery({
    queryKey: keys.myWallAscents(String(route?.wall_id), user?.id),
    enabled: !!user && !!wallRoutes && wallRoutes.length > 0,
    queryFn: async () => {
      const ids = wallRoutes.map(r => r.id)
      const { data } = await supabase
        .from("ascents")
        .select("route_id")
        .eq("climber_id", user.id)
        .in("route_id", ids)
      return (data || []).map(a => a.route_id)
    },
  })

  const { data: favRouteIds } = useQuery({
    queryKey: keys.myWallFavorites(String(route?.wall_id), user?.id),
    enabled: !!user && !!wallRoutes && wallRoutes.length > 0,
    queryFn: async () => {
      const ids = wallRoutes.map(r => r.id)
      const { data } = await supabase
        .from("favorites")
        .select("route_id")
        .eq("user_id", user.id)
        .in("route_id", ids)
      return (data || []).map(f => f.route_id)
    },
  })
  const favSet = new Set(favRouteIds || [])
  const isFav = favSet.has(Number(id))

  const favMutation = useMutation({
    mutationFn: async () => {
      if (isFav) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("route_id", id)
      } else {
        await supabase.from("favorites").upsert({ user_id: user.id, route_id: id }, { onConflict: "user_id,route_id" })
      }
    },
    onSuccess: () => {
      if (route?.wall_id) {
        queryClient.invalidateQueries({ queryKey: keys.myWallFavorites(String(route.wall_id), user.id) })
      }
    },
  })

  const siblingIds = (() => {
    if (!wallRoutes) return []
    const sort = localStorage.getItem("routeSort") || "date"
    const asc = localStorage.getItem("routeAsc") !== "false"
    const filter = localStorage.getItem("routeFilter") || "all"
    const sentSet = new Set(sentRouteIds || [])
    return [...wallRoutes]
      .filter(r => {
        if (filter === "unsent") return !sentSet.has(r.id)
        if (filter === "favorites") return favSet.has(r.id)
        return true
      })
      .sort((a, b) => {
        const dir = asc ? 1 : -1
        if (sort === "grade") return dir * ((a.grade ?? -1) - (b.grade ?? -1))
        return dir * (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0)
      })
      .map(r => r.id)
  })()

  const { data: ascents } = useQuery({
    queryKey: keys.ascents(id),
    queryFn: async () => {
      const { data } = await supabase
        .from("ascents")
        .select("*, profiles(display_name)")
        .eq("route_id", id)
        .order("date", { ascending: false })
      return data || []
    },
  })

  const { data: holds = [] } = useQuery({
    queryKey: keys.holds(wall?.holds_json_url),
    enabled: !!wall?.holds_json_url,
    staleTime: Infinity,
    queryFn: async () => {
      const r = await fetch(wall.holds_json_url)
      return r.json()
    },
  })

  const existingAscent = user && ascents
    ? ascents.find((a) => a.climber_id === user.id) || null
    : null

  useEffect(() => {
    if (route) setSugGrade(route.grade)
  }, [route?.id])

  useEffect(() => {
    if (!existingAscent) return
    setStars(existingAscent.stars ?? 3)
    setSugGrade(existingAscent.suggested_grade)
    setAttempts(existingAscent.attempts ?? 1)
    setNotes(existingAscent.notes || "")
  }, [existingAscent?.id])

  const ascentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        stars,
        suggested_grade: sugGrade,
        attempts: Math.max(1, parseInt(attempts) || 1),
        notes: notes || null,
      }
      await supabase.from("ascents").upsert({
        ...payload,
        route_id:   id,
        climber_id: user.id,
        date:       existingAscent?.date || new Date().toISOString().split("T")[0],
      }, { onConflict: "route_id,climber_id" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.ascents(id) })
      if (route?.wall_id) {
        queryClient.invalidateQueries({ queryKey: keys.wallRoutes(String(route.wall_id)) })
        if (user) {
          queryClient.invalidateQueries({ queryKey: keys.myWallAscents(String(route.wall_id), user.id) })
        }
      }
      queryClient.invalidateQueries({ queryKey: keys.rankings() })
      setShowFelipe(true)
    },
  })

  const idx = siblingIds.indexOf(Number(id))
  const prevId = idx >= 0 ? siblingIds[(idx - 1 + siblingIds.length) % siblingIds.length] : null
  const nextId = idx >= 0 ? siblingIds[(idx + 1) % siblingIds.length] : null

  useEffect(() => {
    const prefetch = (routeId) => {
      if (!routeId) return
      queryClient.prefetchQuery({
        queryKey: keys.route(String(routeId)),
        queryFn: async () => {
          const { data } = await supabase.from("routes").select("*").eq("id", routeId).single()
          return data
        },
      })
      queryClient.prefetchQuery({
        queryKey: keys.ascents(String(routeId)),
        queryFn: async () => {
          const { data } = await supabase.from("ascents").select("*, profiles(display_name)").eq("route_id", routeId).order("date", { ascending: false })
          return data || []
        },
      })
    }
    prefetch(prevId)
    prefetch(nextId)
  }, [prevId, nextId, queryClient])

  const touchStart = useRef(null)
  const handleTouchStart = useCallback((e) => {
    touchStart.current = e.touches[0].clientX
  }, [])
  const handleTouchEnd = useCallback((e) => {
    if (touchStart.current === null) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    touchStart.current = null
    if (Math.abs(dx) < 50) return
    if (dx > 0 && prevId) navigate(`/routes/${prevId}`)
    if (dx < 0 && nextId) navigate(`/routes/${nextId}`)
  }, [prevId, nextId, navigate])

  if (!route) {
    return (
      <div className="page">
        <Header back={{ to: "/walls", label: "muros" }} />
        <p>loading...</p>
      </div>
    )
  }

  const imageUrl = wall?.image_url || ""
  const thumbUrl = wall?.image_thumb_url || ""

  return (
    <div className="page">
      <Header back={{ to: `/walls/${route.wall_id}`, label: "muro" }} />
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 12, touchAction: "pan-y" }}
      >
        <button className="theme-toggle" onClick={() => prevId && navigate(`/routes/${prevId}`)} disabled={!prevId}>◀</button>
        <div style={{ textAlign: "center", flex: 1 }}>
          <b style={{textTransform: "capitalize"}}>
            {route.name}{isFav && <span style={{ fontSize: 13, marginLeft: 4 }}>⭐</span>}
          </b>
          <br/>
          <span className="grade">{gradeLabel(route.grade)}</span>
          {existingAscent && <span style={{ color: "#0c0", fontSize: 15 }}> ✔</span>}
          {setter && <span style={{ fontSize: 12 }}> por {setter}</span>}
        </div>
        <button className="theme-toggle" onClick={() => nextId && navigate(`/routes/${nextId}`)} disabled={!nextId}>▶</button>
      </div>
      {imageUrl && (
        <>
          <WallCanvas
            imageUrl={imageUrl}
            thumbUrl={thumbUrl}
            holds={holds}
            selectedIds={Object.keys(route.holds_map || {})}
            holdsMap={route.holds_map || {}}
            masked={masked}
            maskedIds={Object.keys(route.holds_map || {})}
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

      <p style={{ marginTop: 24, color: route.description ? "var(--fg)" : "var(--gray)" }}>
        {route.description || "Sem descrição."}
      </p>
      <p style={{ marginTop: 8, fontSize: 12, color: "var(--gray)" }}>
        <span>{route.match ? "pode juntar" : "não pode juntar"} · </span>
        {route.campus && <span>campus · </span>}
        <span>volumes: {route.volumes === "any" ? "qualquer" : route.volumes === "holds only" ? "só das agarras" : route.volumes || "qualquer"}</span>
      </p>

      {user && user.id === route.setter_id && (
        <button onClick={() => navigate(`/routes/${id}/edit`)} style={{ marginTop: 12 }}>
          editar via
        </button>
      )}

      <hr style={{ marginTop: 24, border: "none", borderTop: "1px solid var(--gray)" }} />

      <h2 style={{ marginTop: 24 }}>
        sends {ascents && `(${ascents.length})`}
      </h2>

      {!ascents && <p>loading...</p>}

      {ascents && ascents.length > 0 && (
        <ul className="ascent-list">
          {ascents.map((a) => (
            <li key={a.id}>
              <strong>{a.profiles?.display_name || "anon"}</strong>
              {" "}{a.date}
              {a.stars != null && (
                <span> — {a.stars}/5</span>
              )}
              {a.suggested_grade != null && (
                <span> — {gradeLabel(a.suggested_grade)}</span>
              )}
              {a.attempts != null && <span> — {a.attempts === 1 ? "⚡" : `${a.attempts} tentativas`}</span>}
              {a.notes && <span> — {a.notes}</span>}
            </li>
          ))}
        </ul>
      )}

      {user && (
        <>

          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginTop: 32 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>estrelas</label>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setStars(n)}
                    style={{
                      background: n <= stars
                        ? "var(--fg)"
                        : "var(--bg)",
                      color: n <= stars
                        ? "var(--bg)"
                        : "var(--fg)",
                      border: "1px solid var(--fg)",
                      padding: "4px 8px",
                      fontSize: 14,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label>grade</label>
              <select
                value={sugGrade ?? ""}
                onChange={(e) => {
                  const v = e.target.value
                  setSugGrade(v === "" ? null : parseInt(v))
                }}
                style={{ padding: "4px 8px", fontSize: 14 }}
              >
                <option value="">--</option>
                {GRADES.map((label, i) => (
                  <option key={i} value={i}>{label}</option>
                ))}
              </select>
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label>tentativas</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  min={1}
                  value={attempts}
                  onChange={(e) => setAttempts(e.target.value)}
                  onBlur={() => {
                    const n = parseInt(attempts)
                  setAttempts(n >= 1 ? n : 1)
                }}
                style={{ width: 80, padding: "4px 8px", fontSize: 14 }}
              />
              </div>
            </div>

            <div className="field" style={{ margin: 0 }}>
              <label>favoritar</label>
              <button
                className="theme-toggle"
                onClick={() => favMutation.mutate()}
                disabled={favMutation.isPending}
                style={{ fontSize: 14, padding: 0, height: 27, width: 27, boxSizing: "border-box", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {isFav ? "⭐" : "☆"}
              </button>
            </div>
          </div>

          <div className="field" style={{ marginTop: 16 }}>
            <label>notas (opcional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            onClick={() => ascentMutation.mutate()}
            disabled={ascentMutation.isPending}
          >
            {ascentMutation.isPending ? "guardando..." : existingAscent ? "editar send" : "log send"}
          </button>

        </>
      )}

      {showFelipe && (
        <div
          onClick={() => setShowFelipe(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            cursor: "pointer",
          }}
        >
          <img src="/felipe.webp" alt="felipe" style={{ maxWidth: "80%", maxHeight: "80vh", borderRadius: 12 }} />
        </div>
      )}

    </div>
  )
}
