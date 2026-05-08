import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../contexts/AuthContext"
import { gradeLabel } from "../lib/grades"
import WallCanvas from "../components/WallCanvas"


export default function RouteDetail() {
  const { id }                  = useParams()
  const { user }                = useAuth()
  const [route, setRoute]       = useState(null)
  const [setter, setSetter]     = useState(null)
  const [wall, setWall]         = useState(null)
  const [holds, setHolds]       = useState([])
  const [ascents, setAscents]   = useState(null)
  const [stars, setStars]       = useState(3)
  const [sugGrade, setSugGrade] = useState(null)
  const [notes, setNotes]       = useState("")
  const [saving, setSaving]     = useState(false)
  const [masked, setMasked]     = useState(false)

  useEffect(() => {
    supabase
      .from("routes")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) { return }
        setRoute(data)
        setSugGrade(data.grade)

        supabase
          .from("walls")
          .select("*")
          .eq("id", data.wall_id)
          .single()
          .then((res) => {
            if (res?.data) { setWall(res.data) }
          })

        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", data.setter_id)
          .single()
          .then((res) => {
            if (res?.data) { setSetter(res.data.display_name) }
          })
      })

    loadAscents()
  }, [id])

  useEffect(() => {
    if (!wall?.holds_json_url) { return }

    fetch(wall.holds_json_url)
      .then((r) => r.json())
      .then(setHolds)
      .catch(() => {})
  }, [wall])

  function loadAscents() {
    supabase
      .from("ascents")
      .select("*, profiles(display_name)")
      .eq("route_id", id)
      .order("date", { ascending: false })
      .then(({ data }) => setAscents(data || []))
  }

  async function logAscent() {
    setSaving(true)

    await supabase.from("ascents").insert({
      route_id:       id,
      climber_id:     user.id,
      stars:          stars,
      suggested_grade: sugGrade,
      notes:          notes || null,
      date:           new Date().toISOString().split("T")[0],
    })

    setNotes("")
    setSaving(false)
    loadAscents()
  }

  if (!route) {
    return <div className="page"><p>loading...</p></div>
  }

  const imageUrl = wall?.image_url || ""

  return (
    <div className="page">
      <nav className="nav">
        <Link to={`/walls/${route.wall_id}`}>&larr; wall</Link>
      </nav>

      <p style={{paddingBottom: "11px"}}>
        <b style={{paddingRight: "11px", textTransform: "capitalize"}}>
          {route.name}
        </b>
        <span className="grade">{gradeLabel(route.grade)}</span>
        {setter && <span> by {setter}</span>}
      </p>

      {imageUrl && (
        <>
          <WallCanvas
            imageUrl={imageUrl}
            holds={holds}
            selectedIds={route.hold_ids || []}
            masked={masked}
            maskedIds={route.hold_ids || []}
          />
          <button
            onClick={() => setMasked(!masked)}
            style={{ marginTop: 8, fontSize: 11, padding: "4px 8px" }}
          >
            {masked ? "show wall" : "show holds only"}
          </button>
        </>
      )}

      <h2 style={{ marginTop: 16 }}>
        ascents {ascents && `(${ascents.length})`}
      </h2>

      {ascents === null && <p>loading...</p>}

      <ul className="ascent-list">
        {(ascents || []).map((a) => (
          <li key={a.id}>
            <strong>{a.profiles?.display_name || "anon"}</strong>
            {" "}{a.date}
            {a.stars != null && (
              <span> — {a.stars}/5</span>
            )}
            {a.suggested_grade != null && (
              <span> — {gradeLabel(a.suggested_grade)}</span>
            )}
            {a.notes && <span> — {a.notes}</span>}
          </li>
        ))}
      </ul>

      {user && (
        <>
          <h2 style={{ marginTop: 16 }}>log ascent</h2>

          <div className="field">
            <label>stars</label>
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

          <div className="field">
            <label>suggested grade</label>
            <select
              value={sugGrade ?? ""}
              onChange={(e) => {
                const v = e.target.value
                setSugGrade(v === "" ? null : parseInt(v))
              }}
            >
              <option value="">--</option>
              <option value="0">V0</option>
              <option value="1">V1</option>
              <option value="2">V2</option>
              <option value="3">V3</option>
              <option value="4">V4</option>
            </select>
          </div>

          <div className="field">
            <label>notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            onClick={logAscent}
            disabled={saving}
          >
            {saving ? "logging..." : "log send"}
          </button>
        </>
      )}

    </div>
  )
}
