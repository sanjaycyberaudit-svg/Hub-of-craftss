import { BrandLogo } from "./BrandLogo";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: "nav" | "md" | "footer";
  align?: "left" | "center";
};

function Branding({ className, size = "nav", align = "left" }: Props) {
  return <BrandLogo size={size} align={align} className={cn(className)} />;
}

export default Branding;
