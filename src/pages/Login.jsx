import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function Login() {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const action = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password })

    const { error: err } = await action

    if (err) {
      setError(err.message)
    } else {
      navigate("/walls")
    }
  }

  return (
    <div className="page">
      <h1>spray</h1>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="error">{error}</p>}

        <div className="actions">
          <button type="submit">
            {isSignUp ? "sign up" : "log in"}
          </button>
        </div>
      </form>

      <p style={{ marginTop: 16, fontSize: 12 }}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            setIsSignUp(!isSignUp)
          }}
        >
          {isSignUp
            ? "already have an account? log in"
            : "need an account? sign up"}
        </a>
      </p>
    </div>
  )
}
