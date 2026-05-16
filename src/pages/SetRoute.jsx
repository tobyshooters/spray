import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../components/AuthContext"
import WallCanvas from "../components/WallCanvas"
import Header from "../components/Header"

const GRADES = ["V0", "V1", "V2", "V3", "V4inho", "V4ão", "V4asso"]


export default function SetRoute() {
  const { id }                    = useParams()
  const { user }                  = useAuth()
  const navigate                  = useNavigate()
  const [wall, setWall]           = useState(null)
  const [holds, setHolds]         = useState([])
  const [selected, setSelected]   = useState([])
  const [name, setName]           = useState("")
  const [grade, setGrade]         = useState(null)
  const [match, setMatch]         = useState(false)
  const [volumes, setVolumes]     = useState("any")
  const [campus, setCampus]       = useState(false)
  const [masked, setMasked]       = useState(false)
  const [saving, setSaving]       = useState(false)

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
  }, [id])

  useEffect(() => {
    if (!wall?.holds_json_url) { return }

    fetch(wall.holds_json_url)
      .then((r) => r.json())
      .then(setHolds)
      .catch(() => {})
  }, [wall])

  function handleHoldTap(holdId) {
    if (selected.includes(holdId)) {
      setSelected(selected.filter((id) => id !== holdId))
    } else {
      setSelected([...selected, holdId])
    }
  }

  async function handleSave() {
    if (!name || selected.length === 0) { return }

    setSaving(true)

    const { error } = await supabase.from("routes").insert({
      wall_id:   id,
      name:      name,
      grade:     grade,
      setter_id: user.id,
      hold_ids:  selected,
      match:     match,
      volumes:   volumes,
      campus:    campus,
    })

    setSaving(false)

    if (!error) {
      navigate(`/walls/${id}`)
    }
  }

  const imageUrl = wall?.image_url || ""

  return (
    <div className="page">
      <Header back={{ to: `/walls/${id}`, label: "wall" }} />

      {imageUrl && (
        <>
          <WallCanvas
            imageUrl={imageUrl}
            holds={holds}
            selectedIds={selected}
            masked={masked}
            maskedIds={selected}
            onHoldTap={masked ? undefined : handleHoldTap}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <p style={{ fontSize: 11 }}>
              {selected.length} holds selected
            </p>
            <button
              onClick={() => setMasked(!masked)}
              style={{ fontSize: 11, padding: "4px 8px" }}
            >
              {masked ? "edit holds" : "preview route"}
            </button>
          </div>
        </>
      )}

      <div className="field">
        <label>route name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field">
        <label>grade</label>
        <select
          value={grade ?? ""}
          onChange={(e) => {
            const v = e.target.value
            setGrade(v === "" ? null : parseInt(v))
          }}
        >
          <option value="">--</option>
          {GRADES.map((label, i) => (
            <option key={i} value={i}>{label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>volumes</label>
        <select value={volumes} onChange={(e) => setVolumes(e.target.value)}>
          <option value="any">any</option>
          <option value="holds only">holds only</option>
          <option value="none">none</option>
        </select>
      </div>

      <div className="field">
        <label>match</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, textTransform: "none", letterSpacing: 0, color: "var(--fg)" }}>
          <input type="checkbox" checked={match} onChange={(e) => setMatch(e.target.checked)} style={{ width: "auto" }} />
          two hands on a hold allowed
        </label>
      </div>

      <div className="field">
        <label>campus</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, textTransform: "none", letterSpacing: 0, color: "var(--fg)" }}>
          <input type="checkbox" checked={campus} onChange={(e) => setCampus(e.target.checked)} style={{ width: "auto" }} />
          no feet allowed
        </label>
      </div>

      <div className="actions">
        <button
          onClick={handleSave}
          disabled={saving || !name || selected.length === 0}
        >
          {saving ? "saving..." : "save route"}
        </button>
        <button onClick={() => navigate(`/walls/${id}`)}>
          cancel
        </button>
      </div>
    </div>
  )
}
