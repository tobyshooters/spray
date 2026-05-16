import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../components/AuthContext"
import Header from "../components/Header"

export default function Profile() {
  const { user, signOut }       = useAuth()
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
      <Header back={{ to: "/walls", label: "walls" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 12, color: "var(--gray)" }}>{user.email}</span>
        <button onClick={signOut} style={{ fontSize: 11, padding: "4px 16px" }}>log out</button>
      </div>

      <form onSubmit={handleSave}>
        <label className="field" style={{ display: "block", marginBottom: 4 }}>
          Display name
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="display name"
          />
          <button type="submit" disabled={saving} style={{ whiteSpace: "nowrap" }}>
            {saving ? "saving..." : "save"}
          </button>
        </div>
        {saved && (
          <span style={{ fontSize: 12 }}>saved</span>
        )}
      </form>

    </div>
  )
}
