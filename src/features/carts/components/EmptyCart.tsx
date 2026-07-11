import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/layouts/icons";
import { cn } from "@/lib/utils";

function EmptyCart() {
  return (
    <section className="craft-kraft craft-torn-top flex min-h-[450px] w-full flex-col items-center justify-center gap-5 rounded-2xl px-6 py-12">
      <span className="craft-stamp" aria-hidden>
        Empty
      </span>
      <p className="text-sm text-muted-foreground">Your cart is empty.</p>
      <Link
        href="/shop"
        className={cn(buttonVariants({ size: "lg" }), "font-semibold")}
      >
        <Icons.cart className="mr-3 h-5 w-5" />
        Continue shopping
      </Link>
    </section>
  );
}

export default EmptyCart;
