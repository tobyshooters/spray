import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../components/AuthContext"
import WallCanvas from "../components/WallCanvas"


export default function SetRoute() {
  const { id }                    = useParams()
  const { user }                  = useAuth()
  const navigate                  = useNavigate()
  const [wall, setWall]           = useState(null)
  const [holds, setHolds]         = useState([])
  const [selected, setSelected]   = useState([])
  const [candidate, setCandidate] = useState(null)
  const [name, setName]           = useState("")
  const [grade, setGrade]         = useState(null)
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
      return
    }

    if (candidate === holdId) {
      setSelected([...selected, holdId])
      setCandidate(null)
      return
    }

    setCandidate(holdId)
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
    })

    setSaving(false)

    if (!error) {
      navigate(`/walls/${id}`)
    }
  }

  const imageUrl = wall?.image_url || ""

  return (
    <div className="page">
      <h1>set route</h1>

      {imageUrl && (
        <WallCanvas
          imageUrl={imageUrl}
          holds={holds}
          selectedIds={selected}
          candidateId={candidate}
          onHoldTap={handleHoldTap}
        />
      )}

      <p style={{ margin: "8px 0px", fontSize: 11 }}>
        {selected.length} holds selected
        {candidate && " — tap again to confirm"}
      </p>

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
          <option value="0">V0</option>
          <option value="1">V1</option>
          <option value="2">V2</option>
          <option value="3">V3</option>
          <option value="4">V4</option>
        </select>
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
