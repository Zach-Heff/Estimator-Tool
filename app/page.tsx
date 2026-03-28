import { redirect } from "next/navigation";

// The root page just redirects to the dashboard.
// If the user isn't logged in, the middleware will catch them and send to /login.
export default function Home() {
  redirect("/dashboard");
}
