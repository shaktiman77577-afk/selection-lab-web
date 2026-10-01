// lib/appMode.ts
//
// "App mode" — jab ye website Selection Lab Android app ke andar (WebView)
// khulti hai. App apne bootstrap me sessionStorage "sl-app" = "1" set karta
// hai (aur URL me ?app=1 bhi jodta hai). sessionStorage usi tab me har page
// par bana rehta hai, isliye website ke andar kahin bhi jaayein, pata rehta
// hai ki hum app me hain.
//
// App mode me site ka side menu (Home, Courses, Logout...) nahi dikhate —
// wo sab app ke apne screens me hai, aur menu se Logout dabane par app ka
// login WebView se mit jata tha. Uski jagah "Back to app" milta hai, jo
// /__app/close kholta hai; app us URL ko pakad kar WebView band kar deta hai.

export const APP_CLOSE_PATH = "/__app/close";

export function isAppMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("app") === "1") {
      sessionStorage.setItem("sl-app", "1");
      return true;
    }
    return sessionStorage.getItem("sl-app") === "1";
  } catch {
    return false;
  }
}

export function closeApp() {
  window.location.href = APP_CLOSE_PATH;
}
