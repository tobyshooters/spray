import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { keys } from "../lib/queries"
import { useAuth } from "../components/AuthContext"
import Header from "../components/Header"

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
  const fileRef                 = useRef()

  const { data: profile } = useQuery({
    queryKey: keys.profile(user.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .single()
      return data
    },
  })

  const isNew = profile !== undefined && !profile

  useEffect(() => {
    if (profile?.display_name) setName(profile.display_name)
  }, [profile])

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

  const initial = (name || profile?.display_name || "?")[0]

  return (
    <div className="page">
      <Header back={{ to: "/walls", label: "muros" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 12, color: "var(--gray)" }}>{user.email}</span>
        <button onClick={signOut} style={{ fontSize: 13, padding: "4px 16px" }}>sair</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleAvatarChange}
        />
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            className="avatar-lg"
            onClick={() => fileRef.current?.click()}
            alt="avatar"
          />
        ) : (
          <div
            className="avatar-placeholder avatar-lg"
            onClick={() => fileRef.current?.click()}
          >
            {initial}
          </div>
        )}
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

    </div>
  )
}
