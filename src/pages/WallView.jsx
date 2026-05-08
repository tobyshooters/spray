import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../components/AuthContext"
import WallCanvas from "../components/WallCanvas"

function gradeLabel(n) {
  if (n == null) { return "?" }
  return "V" + n
}


export default function WallView() {
  const { id }                  = useParams()
  const { user }                = useAuth()
  const [wall, setWall]         = useState(null)
  const [holds, setHolds]       = useState([])
  const [routes, setRoutes]     = useState(null)
  const [masked, setMasked]     = useState(false)

  useEffect(() => {
    supabase
      .from("walls")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) { return }
        setWall(data)
      })

    supabase
      .from("routes")
      .select("*, profiles(display_name), ascents(count)")
      .eq("wall_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRoutes(data || []))
  }, [id])

  useEffect(() => {
    if (!wall?.holds_json_url) { return }

    fetch(wall.holds_json_url)
      .then((r) => r.json())
      .then(setHolds)
      .catch(() => {})
  }, [wall])

  const imageUrl = wall?.image_url || ""

  return (
    <div className="page">
      <nav className="nav">
        <Link to="/walls">&larr; walls</Link>
      </nav>

      <h1>{wall?.name || "wall"}</h1>

      {imageUrl && (
        <>
          <WallCanvas
            imageUrl={imageUrl}
            holds={holds}
            masked={masked}
          />
          <button
            onClick={() => setMasked(!masked)}
            style={{ marginTop: 8, fontSize: 11, padding: "4px 8px" }}
          >
            {masked ? "show wall" : "show holds only"}
          </button>
        </>
      )}

      <div className="header" style={{ marginTop: 16 }}>
        <h2>routes</h2>
        {user && (
          <Link to={`/walls/${id}/set`} className="header-links">
            + set route
          </Link>
        )}
      </div>

      {routes === null
        ? <p>loading...</p>
        : routes.length === 0
          ? <p>no routes yet.</p>
          : <ul className="route-list">
              {routes.map((r) => (
                <li key={r.id}>
                  <Link to={`/routes/${r.id}`}>
                    <span>
                      {r.name}
                      {r.profiles?.display_name && (
                        <span style={{ color: "var(--gray)", fontSize: 12 }}>
                          {" "}by {r.profiles.display_name}
                        </span>
                      )}
                    </span>
                    <span>
                      {r.ascents?.[0]?.count > 0 && (
                        <span style={{ color: "var(--gray)", fontSize: 12 }}>
                          {r.ascents[0].count} sends{" "}
                        </span>
                      )}
                      <span className="grade">{gradeLabel(r.grade)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
      }
    </div>
  )
}
