/** Default landing when chrome should avoid `/` (middleware already redirects `/`). */
export function appHomeHref(isSignedIn: boolean): "/dashboard" | "/news" {
  return isSignedIn ? "/dashboard" : "/news";
}
