import { Link } from "react-router-dom"
import { useAuth } from "./AuthContext"

export default function Header({ back, wallId }) {
  const { user } = useAuth()

  return (
    <div className="header">
      <div className="header-left">
        <Link to="/walls" className="logo">
          V4ão
        </Link>
        {back && <Link to={back.to}>&larr; {back.label}</Link>}
      </div>
      <div className="header-links">
        {wallId && <Link to={`/rankings?wall=${wallId}`}>rankings</Link>}
        {user
          ? <Link to="/profile">perfil</Link>
          : <Link to="/login">entrar</Link>
        }
      </div>
    </div>
  )
}
