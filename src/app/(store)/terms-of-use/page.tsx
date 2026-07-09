import { redirect } from "next/navigation";

export default function TermsOfUseRedirectPage() {
  redirect("/terms-and-conditions#terms-of-use");
}
