const user = { id: "demo-tep", email: "demo@example.test" }
const initial = {
  profiles: [{ id: user.id, display_name: "Tep" }],
  walls: [{
    id: 2,
    name: "Muro de exemplo",
    image_url: "/preprocessing/wall_1024.jpg",
  }],
  routes: [{
    id: 482,
    wall_id: 2,
    setter_id: user.id,
    name: "Ain't No Rest For The Wicked",
    grade: 6,
    holds_map: {},
    match: false,
    volumes: "holds only",
    description: "Usa a bolotinha vermelha ao invés do pé verde, e mão vermelha embaixo do reglete amarelo",
    created_at: "2026-11-21T12:00:00Z",
  }],
  ascents: [{
    id: 1,
    route_id: 482,
    climber_id: user.id,
    date: "2026-11-21",
    stars: 3,
    suggested_grade: 6,
    attempts: 100,
    notes: "Mandei sem querer",
  }],
  favorites: [{ user_id: user.id, route_id: 482 }],
  borders: [],
  purchases: [],
}

// Development-only data. Reloading restores the sample send.
export function createMockSupabase() {
  document.documentElement.dataset.theme = "dark"
  const tables = structuredClone(initial)
  const listeners = new Set()
  let session = { user }
  const auth = {
    getSession: async () => ({ data: { session }, error: null }),
    onAuthStateChange: (callback) => {
      listeners.add(callback)
      return { data: { subscription: {
        unsubscribe: () => listeners.delete(callback),
      } } }
    },
    signOut: async () => {
      session = null
      for (const callback of listeners) { callback("SIGNED_OUT", null) }
      return { error: null }
    },
  }

  return {
    auth,
    from(table) {
      const filters = []
      let operation = "select"
      let payload
      let single = false
      let columns = "*"
      const query = {
        select(value = "*") { columns = value; return query },
        eq(key, value) {
          filters.push(row => String(row[key]) === String(value))
          return query
        },
        in(key, values) {
          filters.push(row => values.some(value => String(row[key]) === String(value)))
          return query
        },
        order() { return query },
        single() { single = true; return query },
        delete() { operation = "delete"; return query },
        upsert(value) { operation = "upsert"; payload = value; return query },
        then(resolve, reject) {
          return new Promise(done => setTimeout(() => {
            if (!tables[table]) {
              done({ data: null, error: { message: `Unsupported demo table: ${table}` } })
              return
            }
            const matches = row => filters.every(filter => filter(row))
            let rows = tables[table].filter(matches)
            if (operation === "delete") {
              tables[table] = tables[table].filter(row => !matches(row))
            }
            if (operation === "upsert") {
              const keys = table === "ascents"
                ? ["route_id", "climber_id"] : ["route_id", "user_id"]
              const existing = tables[table].find(row =>
                keys.every(key => String(row[key]) === String(payload[key])))
              const row = { ...existing, ...payload, id: existing?.id ?? Date.now() }
              if (existing) { Object.assign(existing, row) }
              else { tables[table].push(row) }
              rows = [row]
            }
            rows = rows.map(row => ({
              ...row,
              ...(columns.includes("profiles") ? { profiles: { display_name: "Tep" } } : {}),
              ...(columns.includes("ascents(count)") ? { ascents: [{
                count: tables.ascents.filter(a => String(a.route_id) === String(row.id)).length,
              }] } : {}),
            }))
            done({ data: single ? rows[0] ?? null : rows, error: null })
          }, operation === "select" ? 0 : 450)).then(resolve, reject)
        },
      }
      return query
    },
  }
}
