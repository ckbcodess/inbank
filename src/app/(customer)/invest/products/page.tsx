import { redirect } from "next/navigation";

/** The list of products is a view of the Invest page. */
export default function ProductsIndexPage() {
  redirect("/invest?view=products");
}
