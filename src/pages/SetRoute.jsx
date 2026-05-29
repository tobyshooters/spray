import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate, useLocation } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { keys } from "../lib/queries"
import { useAuth } from "../components/AuthContext"
import WallCanvas from "../components/WallCanvas"
import Header from "../components/Header"

const HOLD_TYPES = ["hand", "start", "finish", "feet"]
const HOLD_TYPE_LABELS = { hand: "mão", start: "saída", finish: "top", feet: "pé" }

const GRADES = ["V0", "V1", "V2", "V3", "V4inho", "V4", "V4ão", "V4asso"]


export default function SetRoute() {
  const { id }                    = useParams()
  const { user }                  = useAuth()
  const navigate                  = useNavigate()
  const location                  = useLocation()
  const queryClient               = useQueryClient()
  const isEdit                    = location.pathname.startsWith("/routes/")
  const [wallId, setWallId]       = useState(isEdit ? null : id)
  const [holdsMap, setHoldsMap]    = useState({})
  const [name, setName]           = useState("")
  const [grade, setGrade]         = useState(null)
  const [match, setMatch]         = useState(true)
  const [volumes, setVolumes]     = useState("holds only")
  const [campus, setCampus]       = useState(false)
  const [description, setDescription] = useState("")
  const [masked, setMasked]       = useState(false)

  const { data: editRoute } = useQuery({
    queryKey: keys.route(id),
    enabled: isEdit,
    queryFn: async () => {
      const { data } = await supabase
        .from("routes")
        .select("*")
        .eq("id", id)
        .single()
      return data
    },
  })

  useEffect(() => {
    if (!editRoute) return
    setWallId(editRoute.wall_id)
    setName(editRoute.name)
    setGrade(editRoute.grade)
    setHoldsMap(editRoute.holds_map || {})
    setMatch(editRoute.match || true)
    setVolumes(editRoute.volumes || "any")
    setCampus(editRoute.campus || false)
    setDescription(editRoute.description || "")
  }, [editRoute?.id])

  const { data: hasProfile = true } = useQuery({
    queryKey: keys.profile(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single()
      return !!data?.display_name
    },
  })

  const { data: wall } = useQuery({
    queryKey: keys.wall(wallId),
    enabled: !!wallId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("walls")
        .select("*")
        .eq("id", wallId)
        .single()
      return data
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

  const selectedIds = Object.keys(holdsMap)
  const lastTap = useRef({ id: null, time: 0 })

  function handleHoldTap(holdId) {
    const now = Date.now()
    const isDoubleTap = lastTap.current.id === holdId && now - lastTap.current.time < 400
    lastTap.current = { id: holdId, time: now }

    const current = holdsMap[holdId]
    if (!current && !isDoubleTap) return

    if (!current) {
      setHoldsMap({ ...holdsMap, [holdId]: "hand" })
    } else {
      const idx = HOLD_TYPES.indexOf(current)
      const next = HOLD_TYPES[idx + 1]
      if (next) {
        setHoldsMap({ ...holdsMap, [holdId]: next })
      } else {
        const { [holdId]: _, ...rest } = holdsMap
        setHoldsMap(rest)
      }
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fields = {
        name, grade, holds_map: holdsMap,
        match, volumes, campus, description,
      }

      if (isEdit) {
        return supabase.from("routes").update(fields).eq("id", id)
      } else {
        return supabase.from("routes").insert({ ...fields, wall_id: wallId, setter_id: user.id })
      }
    },
    onSuccess: ({ error }) => {
      if (error) return
      if (wallId) {
        queryClient.invalidateQueries({ queryKey: keys.wallRoutes(String(wallId)) })
      }
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: keys.route(id) })
      }
      navigate(isEdit ? `/routes/${id}` : `/walls/${wallId}`)
    },
  })

  const imageUrl = wall?.image_url || ""
  const thumbUrl = wall?.image_thumb_url || ""

  return (
    <div className="page">
      <Header back={isEdit ? { to: `/routes/${id}`, label: "via" } : { to: `/walls/${wallId}`, label: "muro" }} />

      {imageUrl && (
        <>
          <WallCanvas
            imageUrl={imageUrl}
            thumbUrl={thumbUrl}
            holds={holds}
            selectedIds={selectedIds}
            holdsMap={holdsMap}
            masked={masked}
            maskedIds={selectedIds}
            onHoldTap={masked ? undefined : handleHoldTap}
            editing
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13 }}>{selectedIds.length} agarras</span>
              <button
                onClick={() => setMasked(!masked)}
                style={{ fontSize: 13, padding: "4px 8px" }}
              >
                {masked ? "editar agarras" : "preview via"}
              </button>
            </div>
          </WallCanvas>
        </>
      )}

      <div className="field" style={{ marginTop: 24 }}>
        <label>nome da via</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="field">
        <label>descrição (opcional)</label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
          <option value="any">qualquer</option>
          <option value="holds only">só das agarras</option>
          <option value="none">nenhum</option>
        </select>
      </div>

      <div className="field">
        <label>pode juntar</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, textTransform: "none", letterSpacing: 0, color: "var(--fg)" }}>
          <input type="checkbox" checked={match} onChange={(e) => setMatch(e.target.checked)} style={{ width: "auto" }} />
          duas mãos na mesma agarra
        </label>
      </div>

      <div className="field">
        <label>campus</label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, textTransform: "none", letterSpacing: 0, color: "var(--fg)" }}>
          <input type="checkbox" checked={campus} onChange={(e) => setCampus(e.target.checked)} style={{ width: "auto" }} />
          sem pés
        </label>
      </div>

      {!hasProfile && (
        <p className="error">
          precisas definir o teu nome no <a href="/profile">perfil</a> antes de criar uma via.
        </p>
      )}

      <div className="actions">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !name || selectedIds.length === 0 || !hasProfile}
        >
          {saveMutation.isPending ? "guardando..." : isEdit ? "atualizar via" : "guardar via"}
        </button>
        <button onClick={() => navigate(isEdit ? `/routes/${id}` : `/walls/${wallId}`)}>
          cancelar
        </button>
      </div>
    </div>
  )
}
