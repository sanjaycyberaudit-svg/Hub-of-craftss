import React, { ReactNode } from "react";
import { Icons } from "../layouts/icons";
import Link from "next/link";
import { Button } from "../ui/button";
import BackButton from "../layouts/BackButton";

type AdminShellProps = {
  heading: string;
  description?: string;
  showBackButton?: boolean;
  children: ReactNode;
};

function AdminShell({
  heading,
  description,
  showBackButton,
  children,
}: AdminShellProps) {
  return (
    <section>
      <div className="flex gap-x-3 mb-5 pb-3 border-b">
        {showBackButton && <BackButton />}
        <div className="flex justify-between items-center">
          <div>
            <h1
              className={`text-2xl font-semibold w-[480px] leading-tight ${description ? "mb-2" : ""}`}
            >
              {heading}
            </h1>
            {description ? (
              <p className="max-w-xl text-zinc-500 text-md w-[580px] leading-tight">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}

export default AdminShell;
