import { redirect } from "next/navigation";

// The old placeholder page now forwards to the review queue.
export default function ViceChancellorPage() {
  redirect("/vice-chancellor/payment-recommendations");
}
