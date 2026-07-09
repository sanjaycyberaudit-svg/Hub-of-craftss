import Header from "@/components/layouts/Header";
import { Shell } from "@/components/layouts/Shell";
import { ReactNode } from "react";

type Props = {
  heading: string;
  description?: string;
  children: ReactNode;
};

export function InfoPage({ heading, description, children }: Props) {
  return (
    <Shell>
      <Header heading={heading} description={description} />
      <article className="mx-auto max-w-3xl space-y-4 px-2 pb-16 text-sm leading-relaxed text-muted-foreground md:text-base">
        {children}
      </article>
    </Shell>
  );
}

export default InfoPage;
