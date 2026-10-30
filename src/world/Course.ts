/** Separate course entry points keep the original Sunset Bay world intact. */
export type CourseId = 'sunset' | 'moon';
export const activeCourse: CourseId =
  new URLSearchParams(location.search).get('track') === 'moon' ? 'moon' : 'sunset';
export function openCourse(course: CourseId) {
  if (course === activeCourse) return;
  const url = new URL(location.href);
  if (course === 'sunset') url.searchParams.delete('track');
  else url.searchParams.set('track', course);
  url.searchParams.delete('ui');
  location.assign(url.href);
}
