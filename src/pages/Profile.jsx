import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../components/AuthContext"

export default function Profile() {
  const { user }                = useAuth()
  const [name, setName]         = useState("")
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [isNew, setIsNew]       = useState(false)

  useEffect(() => {
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setName(data.display_name)
        } else {
          setIsNew(true)
        }
      })
  }, [user])

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) { return }

    setSaving(true)

    if (isNew) {
      await supabase.from("profiles").insert({
        id:           user.id,
        display_name: name.trim(),
      })
      setIsNew(false)
    } else {
      await supabase
        .from("profiles")
        .update({ display_name: name.trim() })
        .eq("id", user.id)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page">
      <nav className="nav">
        <Link to="/walls">&larr; walls</Link>
      </nav>

      <h1>profile</h1>

      <form onSubmit={handleSave}>
        <div className="field">
          <label>display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "saving..." : "save"}
        </button>

        {saved && (
          <span style={{ marginLeft: 8, fontSize: 12 }}>
            saved
          </span>
        )}
      </form>
    </div>
  )
}
