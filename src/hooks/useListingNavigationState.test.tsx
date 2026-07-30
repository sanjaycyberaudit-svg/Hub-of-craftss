/**
 * @jest-environment jsdom
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  LISTING_PRODUCT_OPEN_EVENT,
  readListingState,
  useListingNavigationState,
} from "./useListingNavigationState";
import Link from "next/link";

type Page = { first: number; after?: string };

function Host({ listingKey }: { listingKey: string }) {
  const [pages, setPages] = useListingNavigationState<Page[]>(
    listingKey,
    () => [{ first: 8 }],
  );
  return (
    <>
      <output data-testid="pages">{JSON.stringify(pages)}</output>
      <button
        type="button"
        onClick={() =>
          setPages((prev) => [...prev, { first: 8, after: "cursor-1" }])
        }
      >
        add page
      </button>
      <Link href="/shop/p1" data-product-id="p1">
        Product
      </Link>
    </>
  );
}

describe("useListingNavigationState", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 420,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 1_200,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 600,
    });
    window.scrollTo = jest.fn();
  });

  it("restores loaded cursors after the listing remounts", async () => {
    const first = render(<Host listingKey="/shop?price=100-200" />);
    fireEvent.click(screen.getByRole("button", { name: "add page" }));

    act(() => {
      window.dispatchEvent(
        new CustomEvent(LISTING_PRODUCT_OPEN_EVENT, {
          detail: { productId: "p1" },
        }),
      );
    });
    first.unmount();

    render(<Host listingKey="/shop?price=100-200" />);
    await waitFor(() =>
      expect(screen.getByTestId("pages")).toHaveTextContent("cursor-1"),
    );
    expect(readListingState<Page[]>("/shop?price=100-200")).toMatchObject({
      scrollY: 420,
      productId: "p1",
    });
  });

  it("keeps independent state for different listing URLs", async () => {
    const { rerender } = render(<Host listingKey="/shop?sort=new" />);
    fireEvent.click(screen.getByRole("button", { name: "add page" }));

    rerender(<Host listingKey="/shop?sort=price" />);
    expect(screen.getByTestId("pages")).not.toHaveTextContent("cursor-1");

    rerender(<Host listingKey="/shop?sort=new" />);
    await waitFor(() =>
      expect(screen.getByTestId("pages")).toHaveTextContent("cursor-1"),
    );
  });
});
