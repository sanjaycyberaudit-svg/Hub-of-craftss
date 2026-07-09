"use client";

import { ThemeProvider } from "next-themes";
import { SupabaseAuthProvider } from "./AuthProvider";
import UrqlProvider from "./UrqlProvider";

export default function CustomProvider({ children }: React.PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SupabaseAuthProvider>
        <UrqlProvider>{children}</UrqlProvider>
      </SupabaseAuthProvider>
    </ThemeProvider>
  );
}
