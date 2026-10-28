export default function Avatar({ src, name, borderFile, borderFile2, size = 72, onClick }) {
  const initial = (name || "?")[0]

  return (
    <div
      className="avatar-wrap"
      style={{ width: size, height: size, cursor: onClick ? "pointer" : undefined }}
      onClick={onClick}
    >
      {src ? (
        <img
          src={src}
          style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }}
          alt=""
        />
      ) : (
        <div
          className="avatar-placeholder"
          style={{ width: size, height: size, borderRadius: "50%", fontSize: size * 0.33 }}
        >
          {initial}
        </div>
      )}
      {borderFile && (
        <img
          src={`/bordinhas/${borderFile}`}
          className="avatar-border"
          alt=""
        />
      )}
      {borderFile2 && (
        <img
          src={`/bordinhas/${borderFile2}`}
          className="avatar-border"
          alt=""
        />
      )}
    </div>
  )
}
