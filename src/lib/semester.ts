/**
 * Korean school semester label for a given date: 1학기 (Mar-Aug) or 2학기
 * (Sep-Feb, credited to the calendar year the school year started in).
 */
export function getSemesterLabel(date: Date): string {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();

  if (month >= 3 && month <= 8) {
    return `${year}-1`;
  }
  if (month >= 9) {
    return `${year}-2`;
  }
  // Jan/Feb belong to the previous calendar year's 2nd semester
  return `${year - 1}-2`;
}
