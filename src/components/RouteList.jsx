import { Link } from "react-router-dom"
import { gradeLabel } from "../lib/grades"

export default function RouteList({ routes }) {
  if (routes.length === 0) {
    return <p>no routes yet.</p>
  }

  return (
    <ul className="route-list">
      {routes.map((r) => (
        <li key={r.id}>
          <Link to={`/routes/${r.id}`}>
            <span>
              {r.name}
              {r.profiles?.display_name && (
                <span style={{ color: "var(--gray)", fontSize: 12 }}>
                  {" "}by {r.profiles.display_name}
                </span>
              )}
            </span>
            <span>
              {r.ascents?.[0]?.count > 0 && (
                <span style={{ color: "var(--gray)", fontSize: 12 }}>
                  {r.ascents[0].count} sends{" "}
                </span>
              )}
              <span className="grade">{gradeLabel(r.grade)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
