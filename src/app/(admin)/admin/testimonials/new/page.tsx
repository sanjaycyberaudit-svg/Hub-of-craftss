import AdminShell from "@/components/admin/AdminShell";
import { TestimonialForm } from "@/features/testimonials";

export default function NewTestimonialPage() {
  return (
    <AdminShell
      heading="Add testimonial"
      description="Customer feedback appears on the homepage after Product Categories."
    >
      <TestimonialForm />
    </AdminShell>
  );
}
