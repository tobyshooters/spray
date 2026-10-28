export function votedGrade(ascents) {
  const votes = (ascents || []).map(a => a.suggested_grade).filter(g => g != null)
  if (votes.length === 0) return null
  return Math.round(votes.reduce((s, g) => s + g, 0) / votes.length)
}

export function computeClimberScores(ascents, routes) {
  const gradeMap = {}
  for (const r of routes) {
    gradeMap[r.id] = r.grade ?? 0
  }

  const scores = {}
  for (const a of ascents) {
    const grade = gradeMap[a.route_id] ?? 0
    if (!scores[a.climber_id]) {
      scores[a.climber_id] = { pts: 0, byGrade: {} }
    }
    let pts = grade * grade
    if (a.attempts == 1) {
      pts = Math.ceil(pts * 1.5)
    }
    scores[a.climber_id].pts += pts
    scores[a.climber_id].byGrade[grade] = (scores[a.climber_id].byGrade[grade] || 0) + 1
  }

  return scores
}
