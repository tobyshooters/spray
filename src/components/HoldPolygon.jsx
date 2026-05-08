export default function HoldPolygon({
  hold,
  status,
  onTap,
}) {
  const points = hold.polygon
    .map(([x, y]) => `${x},${y}`)
    .join(" ")

  if (status === "hidden") {
    return (
      <polygon
        points={points}
        fill="white"
        stroke="none"
      />
    )
  }

  const fill = {
    selected:  "rgba(224, 0, 0, 0.5)",
    candidate: "rgba(255, 153, 0, 0.5)",
    none:      "none",
  }[status]

  const stroke = {
    selected:  "#e00",
    candidate: "#f90",
    none:      "rgba(0,0,0,0.4)",
  }[status]

  return (
    <g
      onPointerDown={(e) => {
        e.stopPropagation()
        onTap?.(hold.id)
      }}
      style={{ cursor: onTap ? "pointer" : "default" }}
    >
      <polygon

        points={points}
        fill={fill}
        stroke={stroke}
        strokeWidth={0.002}
        pointerEvents="all"
      />
    </g>
  )
}
