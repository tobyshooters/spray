import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { keys } from "../lib/queries"
import { useAuth } from "../components/AuthContext"
import Header from "../components/Header"

export default function Profile() {
  const { user, signOut }       = useAuth()
  const queryClient             = useQueryClient()
  const [name, setName]         = useState("")
  const [saved, setSaved]       = useState(false)

  const { data: profile } = useQuery({
    queryKey: keys.profile(user.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
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

  return (
    <div className="page">
      <Header back={{ to: "/walls", label: "muros" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 12, color: "var(--gray)" }}>{user.email}</span>
        <button onClick={signOut} style={{ fontSize: 13, padding: "4px 16px" }}>sair</button>
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
