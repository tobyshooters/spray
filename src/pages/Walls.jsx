import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../contexts/AuthContext"

export default function Walls() {
  const { user, signOut } = useAuth()
  const [walls, setWalls] = useState(null)

  useEffect(() => {
    supabase
      .from("walls")
      .select("id, name")
      .then(({ data }) => setWalls(data || []))
  }, [])

  return (
    <div className="page">
      <div className="header">
        <h1>V4ão</h1>
        <div className="header-links">
          <Link to="/rankings">rankings</Link>
          {user
            ? <>
                <Link to="/profile">profile</Link>
                <button onClick={signOut}>log out</button>
              </>
            : <Link to="/login">log in</Link>
          }
        </div>
      </div>

      {walls === null && <p>loading...</p>}
      {walls?.length === 0 && <p>No walls found.</p>}

      <ul className="route-list">
        {(walls || []).map((w) => (
          <li key={w.id}>
            <Link to={`/walls/${w.id}`}>{w.name}</Link>
          </li>
        ))}
      </ul>

      <p style={{ marginTop: 32, fontSize: 11, color: "var(--gray)" }}>
        <a href="https://github.com/tobyshooters/spray">github</a>
      </p>
    </div>
  )
}
