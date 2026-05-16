import { Link } from "react-router-dom"
import { useAuth } from "./AuthContext"

export default function Header({ back }) {
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
        <Link to="/rankings">rankings</Link>
        {user
          ? <Link to="/profile">profile</Link>
          : <Link to="/login">log in</Link>
        }
      </div>
    </div>
  )
}
