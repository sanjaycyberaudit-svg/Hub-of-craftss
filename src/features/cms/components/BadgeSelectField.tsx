"use client";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useFormContext } from "react-hook-form";

type BadgeSelectFieldProps = {
  name: string;
  label: string;
};

function BadgeSelectField({ name, label }: BadgeSelectFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name="badge"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Badge</FormLabel>
          <Select
            value={field.value ?? "__none__"}
            onValueChange={(value) =>
              field.onChange(value === "__none__" ? null : value)
            }
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Add a badge for the Product" />
              </SelectTrigger>
            </FormControl>

            <SelectContent>
              <SelectGroup>
                <SelectLabel>Badge</SelectLabel>
                <SelectItem value="__none__">None</SelectItem>
                <SelectItem value="new_product">New Product</SelectItem>
                <SelectItem value="best_sale">Best Sale</SelectItem>
                <SelectItem value="featured">featured</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <FormDescription>
            Optional label on the product card in Shop and Collections. This is
            separate from the Featured product toggle above.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default BadgeSelectField;
