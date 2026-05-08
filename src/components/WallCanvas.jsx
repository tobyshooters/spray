import HoldPolygon from "./HoldPolygon"

export default function WallCanvas({
  imageUrl,
  holds,
  selectedIds = [],
  candidateId = null,
  onHoldTap,
  masked = false,
  maskedIds = null,
}) {
  function holdStatus(id) {
    if (masked && maskedIds && !maskedIds.includes(id)) {
      return "hidden"
    }
    if (masked) { return "none" }
    if (selectedIds.includes(id)) { return "selected" }
    if (id === candidateId) { return "candidate" }
    return "none"
  }

  return (
    <div className={onHoldTap ? "wall-canvas-container interactive" : "wall-canvas-container"}>
      <div className="wall-canvas">
        <img src={imageUrl} alt="spray wall" />
        <svg
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          style={{ background: "none" }}
        >
          {masked && (
            <defs>
              <mask id="hold-mask">
                <rect
                  x="0" y="0"
                  width="1" height="1"
                  fill="white"
                />
                {holds
                  .filter((h) => !maskedIds || maskedIds.includes(h.id))
                  .map((h) => (
                    <polygon
                      key={h.id}
                      points={h.polygon
                        .map(([x, y]) => `${x},${y}`)
                        .join(" ")}
                      fill="black"
                    />
                  ))}
              </mask>
            </defs>
          )}

          {masked && (
            <rect
              x="0" y="0"
              width="1" height="1"
              fill="white"
              mask="url(#hold-mask)"
            />
          )}

          {holds.map((h) => (
            <HoldPolygon
              key={h.id}
              hold={h}
              status={holdStatus(h.id)}
              onTap={onHoldTap}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}
