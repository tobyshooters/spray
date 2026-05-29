import { useState } from "react"

const HOLD_COLORS = {
  hand:   { fill: "rgba(0, 120, 255, 0.7)",  stroke: "#0080FF" },
  start:  { fill: "rgba(0, 255, 65, 0.7)",   stroke: "#00FF41" },
  finish: { fill: "rgba(224, 0, 0, 0.7)",   stroke: "#e00" },
  feet:   { fill: "rgba(255, 0, 255, 0.7)", stroke: "#f0f" },
}

function HoldPolygon({ hold, status, holdType, onTap, interactive }) {
  const points = hold.polygon
    .map(([x, y]) => `${x * 1000},${y * 1000}`)
    .join(" ")

  if (status === "hidden") {
    return (
      <polygon
        points={points}
        fill="var(--bg)"
        stroke="none"
      />
    )
  }

  let fill, stroke

  if (status === "selected") {
    const colors = HOLD_COLORS[holdType || "hand"]
    fill = colors.fill
    stroke = colors.stroke
  } else if (status === "masked-selected") {
    fill = "none"
    if (holdType) {
      const colors = HOLD_COLORS[holdType] || HOLD_COLORS.hand
      stroke = colors.stroke
    } else {
      stroke = "var(--fg)"
    }
  } else if (interactive) {
    fill = "none"
    stroke = "rgba(0,0,0,0.4)"
  } else {
    return null
  }

  return (
    <g
      onClick={() => {
        onTap?.(hold.id)
      }}
      style={{ cursor: onTap ? "pointer" : "default" }}
    >
      <polygon
        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={status === "masked-selected" && holdType ? 6 : status === "selected" ? 4 : 2}
        pointerEvents="all"
      />
    </g>
  )
}

export default function WallCanvas({
  imageUrl,
  thumbUrl,
  holds,
  selectedIds = [],
  holdsMap = {},
  onHoldTap,
  masked = false,
  maskedIds = null,
  editing = false,
  children,
}) {
  const [thumbLoaded, setThumbLoaded] = useState(false)
  const [loaded, setLoaded] = useState(() => {
    if (!imageUrl) return false
    const img = new Image()
    img.src = imageUrl
    return img.complete
  })

  function holdStatus(id) {
    if (masked && maskedIds && !maskedIds.includes(id)) {
      return "hidden"
    }
    if (masked) { return "masked-selected" }
    if (selectedIds.includes(id)) { return "selected" }
    return "none"
  }

  const HOLD_TYPE_LABELS = { hand: "mão", start: "saída", finish: "top", feet: "pé" }
  const HOLD_TYPE_NAMES = ["hand", "start", "finish", "feet"]
  const hasHolds = selectedIds.length > 0

  const sortedHolds = [...holds].sort((a, b) => {
    const area = (poly) => {
      let s = 0
      for (let i = 0; i < poly.length; i++) {
        const [x1, y1] = poly[i]
        const [x2, y2] = poly[(i + 1) % poly.length]
        s += x1 * y2 - x2 * y1
      }
      return Math.abs(s)
    }
    return area(b.polygon) - area(a.polygon)
  })

  return (
    <div
      className={onHoldTap ? "wall-canvas-container interactive" : "wall-canvas-container"}
    >
      {editing && (
        <div style={{ marginBottom: 6, fontSize: 13 }}>
          <span>double-tap para selecionar agarra</span>
        </div>
      )}
      <div className="wall-canvas">
        <img
          src={loaded || !thumbUrl ? imageUrl : thumbUrl}
          alt="spray wall"
          onLoad={!thumbLoaded && thumbUrl ? () => setThumbLoaded(true) : undefined}
        />
        {thumbLoaded && !loaded && (
          <img
            src={imageUrl}
            alt=""
            onLoad={() => setLoaded(true)}
            style={{ display: "none" }}
          />
        )}
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          style={{ background: "none" }}
        >
          {masked && (
            <defs>
              <mask id="hold-mask">
                <rect
                  x="-1" y="-1"
                  width="1002" height="1002"
                  fill="white"
                />
                {holds
                  .filter((h) => !maskedIds || maskedIds.includes(h.id))
                  .map((h) => (
                    <polygon
                      key={h.id}
                      points={h.polygon
                        .map(([x, y]) => `${x * 1000},${y * 1000}`)
                        .join(" ")}
                      fill="black"
                    />
                  ))}
              </mask>
            </defs>
          )}

          {masked && (
            <rect
              x="-1" y="-1"
              width="1002" height="1002"
              fill="var(--bg)"
              mask="url(#hold-mask)"
            />
          )}

          {sortedHolds.filter((h) => !selectedIds.includes(h.id)).map((h) => (
            <HoldPolygon
              key={h.id}
              hold={h}
              status={holdStatus(h.id)}
              holdType={holdsMap[h.id]}
              onTap={onHoldTap}
              interactive={!!onHoldTap}
            />
          ))}

          <rect
            x="-1" y="-1" width="1002" height="1002"
            fill={hasHolds && !masked ? "rgba(255,255,255,0.5)" : "none"}
            pointerEvents="none"
          />

          {sortedHolds.filter((h) => selectedIds.includes(h.id)).map((h) => (
            <HoldPolygon
              key={h.id}
              hold={h}
              status={holdStatus(h.id)}
              holdType={holdsMap[h.id]}
              onTap={onHoldTap}
              interactive={!!onHoldTap}
            />
          ))}
        </svg>
      </div>
      {(onHoldTap || hasHolds || children) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 13 }}>
          <div style={{ display: "flex", gap: 12 }}>
            {(onHoldTap || hasHolds) && HOLD_TYPE_NAMES.map((type) => (
              <span key={type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{
                  display: "inline-block", width: 10, height: 10, borderRadius: 2,
                  background: HOLD_COLORS[type].fill, border: `1px solid ${HOLD_COLORS[type].stroke}`,
                }} />
                {HOLD_TYPE_LABELS[type]}
              </span>
            ))}
          </div>
          {children}
        </div>
      )}
    </div>
  )
}

export { HOLD_COLORS }
