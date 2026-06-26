import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { keys } from "../lib/queries"
import { computeClimberScores } from "../lib/points"
import { useAuth } from "../components/AuthContext"
import Header from "../components/Header"
import Avatar from "../components/Avatar"

function compressImage(file, maxSize = 200, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext("2d")
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(resolve, "image/jpeg", quality)
    }
    img.src = URL.createObjectURL(file)
  })
}

export default function Profile() {
  const { user, signOut }       = useAuth()
  const queryClient             = useQueryClient()
  const [name, setName]         = useState("")
  const [saved, setSaved]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedBorder, setSelectedBorder] = useState(null)
  const [selectedBorder2, setSelectedBorder2] = useState(null)
  const [activeLayer, setActiveLayer] = useState(1)
  const fileRef                 = useRef()

  const { data: profile } = useQuery({
    queryKey: keys.profile(user.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, border_id, border_id_2")
        .eq("id", user.id)
        .single()
      return data
    },
  })

  const { data: borders } = useQuery({
    queryKey: keys.borders(),
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase
        .from("borders")
        .select("id, file, min_pts")
        .order("min_pts")
      return data || []
    },
  })

  const { data: myPts } = useQuery({
    queryKey: ["my-points", user.id],
    staleTime: 60_000,
    queryFn: async () => {
      const [ascRes, routeRes] = await Promise.all([
        supabase.from("ascents").select("climber_id, route_id, attempts").eq("climber_id", user.id),
        supabase.from("routes").select("id, grade"),
      ])
      const scores = computeClimberScores(ascRes.data || [], routeRes.data || [])
      return scores[user.id]?.pts ?? 0
    },
  })

  const { data: purchases } = useQuery({
    queryKey: keys.purchases(user.id),
    queryFn: async () => {
      const { data } = await supabase.from("purchases").select("border_id")
      const set = new Set()
      for (const p of (data || [])) set.add(p.border_id)
      return set
    },
  })

  const isNew = profile !== undefined && !profile

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name)
  }, [profile])

  useEffect(() => {
    if (profile) setSelectedBorder(profile.border_id ?? null)
  }, [profile?.border_id])

  useEffect(() => {
    if (profile) setSelectedBorder2(profile.border_id_2 ?? null)
  }, [profile?.border_id_2])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        await supabase.from("profiles").insert({
          id:           user.id,
          display_name: name.trim(),
        })
      } else {
        await supabase
          .from("profiles")
          .update({ display_name: name.trim() })
          .eq("id", user.id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.profile(user.id) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    saveMutation.mutate()
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const blob = await compressImage(file)
      const path = `${user.id}/avatar.jpg`
      await supabase.storage.from("avatars").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: true,
      })
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path)
      const avatarUrl = `${publicUrl}?t=${Date.now()}`
      await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id)
      queryClient.invalidateQueries({ queryKey: keys.profile(user.id) })
    } finally {
      setUploading(false)
    }
  }

  const borderFileMap = {}
  const borderPriceMap = {}
  if (borders) for (const b of borders) {
    borderFileMap[b.id] = b.file
    borderPriceMap[b.id] = b.min_pts
  }

  const spent = (() => {
    if (!purchases || !borders) return 0
    let total = 0
    for (const b of borders) {
      if (purchases.has(b.id)) total += b.min_pts
    }
    return total
  })()

  const balance = (myPts ?? 0) - spent

  const borderTiers = (() => {
    if (!borders) return []
    const groups = {}
    for (const b of borders) {
      const key = b.min_pts
      if (!groups[key]) groups[key] = []
      groups[key].push(b)
    }
    return Object.entries(groups)
      .map(([pts, items]) => [Number(pts), items])
      .sort((a, b) => a[0] - b[0])
  })()

  const isOwned = (id) => {
    if (id == null) return true
    const b = borders?.find((x) => x.id === id)
    if (!b) return false
    if (b.min_pts === 0) return true
    if (b.id === 1 && user.id !== "73ecd961-0ac7-4039-b4ac-4da43a2bcbdd") return false
    return purchases?.has(id) ?? false
  }

  const borderDirty =
    selectedBorder !== (profile?.border_id ?? null) ||
    selectedBorder2 !== (profile?.border_id_2 ?? null)

  const canSave = borderDirty && isOwned(selectedBorder) && isOwned(selectedBorder2)

  const buyMutation = useMutation({
    mutationFn: async (borderId) => {
      await supabase.from("purchases").insert({ user_id: user.id, border_id: borderId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.purchases(user.id) })
    },
  })

  const borderMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from("profiles")
        .update({ border_id: selectedBorder, border_id_2: selectedBorder2 })
        .eq("id", user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.profile(user.id) })
    },
  })

  return (
    <div className="page">
      <Header back={{ to: "/walls", label: "muros" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 12, color: "var(--gray)" }}>{user.email}</span>
        <button onClick={signOut} style={{ fontSize: 13, padding: "4px 16px" }}>sair</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, margin: "48px 0 56px" }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleAvatarChange}
        />
        <Avatar
          src={profile?.avatar_url}
          name={name || profile?.display_name}
          borderFile={borderFileMap[selectedBorder]}
          borderFile2={borderFileMap[selectedBorder2]}
          size={160}
          onClick={() => fileRef.current?.click()}
        />
        <span style={{ fontSize: 12, color: "var(--gray)" }}>
          {uploading ? "a carregar..." : "clica para mudar foto"}
        </span>
      </div>

      <form onSubmit={handleSave}>
        <label className="field" style={{ display: "block", marginBottom: 4 }}>
          Nome
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="nome"
          />
          <button type="submit" disabled={saveMutation.isPending} style={{ whiteSpace: "nowrap" }}>
            {saveMutation.isPending ? "guardando..." : "guardar"}
          </button>
        </div>
        {saved && (
          <span style={{ fontSize: 12 }}>guardado</span>
        )}
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 24, marginBottom: 8 }}>
        <label className="field" style={{ margin: 0 }}>Bordinha</label>
        <button
          className={activeLayer === 1 ? "" : "theme-toggle"}
          onClick={() => setActiveLayer(1)}
          style={{ fontSize: 12, padding: "2px 10px" }}
        >
          1
        </button>
        <button
          className={activeLayer === 2 ? "" : "theme-toggle"}
          onClick={() => setActiveLayer(2)}
          style={{ fontSize: 12, padding: "2px 10px" }}
        >
          2
        </button>
        {myPts != null && <span style={{ fontSize: 11, color: "var(--gray)" }}>({balance} pts)</span>}
      </div>
      {(() => {
        if (!borders) return null
        const current = activeLayer === 1 ? selectedBorder : selectedBorder2
        const setCurrent = activeLayer === 1 ? setSelectedBorder : setSelectedBorder2
        const allOwned = borders.filter((b) => b.id !== 1 && (b.min_pts === 0 || purchases?.has(b.id)))
        const devBorder = borders.find((b) => b.id === 1)
        const isDevUser = user.id === "73ecd961-0ac7-4039-b4ac-4da43a2bcbdd"
        if (isDevUser && devBorder && purchases?.has(1)) allOwned.push(devBorder)

        return (
          <>
            <div style={{ fontSize: 11, color: "var(--gray)", margin: "12px 0 4px" }}>comprados</div>
            <div className="border-picker">
              <div
                className={`border-option${current == null ? " selected" : ""}`}
                onClick={() => setCurrent(null)}
              >
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--gray)" }}>
                  sem
                </div>
              </div>
              {allOwned.map((b) => (
                <div
                  key={b.id}
                  className={`border-option${current === b.id ? " selected" : ""}`}
                  onClick={() => setCurrent(b.id)}
                >
                  <img src={`/bordinhas/${b.file}`} alt="" />
                </div>
              ))}
            </div>

            {borderTiers.filter(([minPts]) => minPts > 0).map(([minPts, items]) => {
              const filtered = items.filter((b) => b.id !== 1 && !purchases?.has(b.id))
              if (!filtered.length) return null
              const affordable = filtered.filter((b) => balance >= b.min_pts)
              const tooExpensive = filtered.filter((b) => balance < b.min_pts)
              return (
                <div key={minPts}>
                  <div style={{ fontSize: 11, color: "var(--gray)", margin: "12px 0 4px" }}>
                    {minPts} pts
                  </div>
                  <div className="border-picker">
                    {affordable.map((b) => (
                      <div
                        key={b.id}
                        className={`border-option${current === b.id ? " selected" : ""}`}
                        onClick={() => setCurrent(b.id)}
                      >
                        <img src={`/bordinhas/${b.file}`} alt="" />
                      </div>
                    ))}
                    {tooExpensive.map((b) => (
                      <div
                        key={b.id}
                        className={`border-option${current === b.id ? " selected" : ""} locked`}
                        onClick={() => setCurrent(b.id)}
                      >
                        <img src={`/bordinhas/${b.file}`} alt="" />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {isDevUser && devBorder && !purchases?.has(1) && (
              <div>
                <div style={{ fontSize: 11, color: "var(--gray)", margin: "12px 0 4px" }}>dev exclusive</div>
                <div className="border-picker">
                  <div
                    className={`border-option${current === 1 ? " selected" : ""}`}
                    onClick={() => setCurrent(1)}
                  >
                    <img src={`/bordinhas/${devBorder.file}`} alt="" />
                  </div>
                </div>
              </div>
            )}
          </>
        )
      })()}
      {borderDirty && !canSave && (
        <button
          onClick={() => {
            const id = !isOwned(selectedBorder) ? selectedBorder : selectedBorder2
            buyMutation.mutate(id)
          }}
          disabled={buyMutation.isPending || balance < (borderPriceMap[!isOwned(selectedBorder) ? selectedBorder : selectedBorder2] ?? 0)}
          style={{ marginTop: 12 }}
        >
          {buyMutation.isPending ? "comprando..." : `comprar (${borderPriceMap[!isOwned(selectedBorder) ? selectedBorder : selectedBorder2] ?? 0} pts)`}
        </button>
      )}
      {canSave && (
        <button
          onClick={() => borderMutation.mutate()}
          disabled={borderMutation.isPending}
          style={{ marginTop: 12 }}
        >
          {borderMutation.isPending ? "guardando..." : "guardar bordinhas"}
        </button>
      )}

    </div>
  )
}
