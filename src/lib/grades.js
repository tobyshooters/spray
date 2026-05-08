export const GRADES = [0, 1, 2, 3, 4]

export function gradeLabel(n) {
  if (n == null) { return "?" }
  return "V" + n
}
