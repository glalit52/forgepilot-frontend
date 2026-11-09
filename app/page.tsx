import { redirect } from "next/navigation";

// proxy.ts routes "/" to the signed-in role's home; this is the fallback.
export default function Home() {
  redirect("/login");
}
