import {
  buildShippingAddressCopyText,
  buildShippingAddressLines,
} from "./shipping-address-text";

describe("buildShippingAddressLines", () => {
  it("returns street and city lines without pincode", () => {
    expect(
      buildShippingAddressLines({
        line1: "12 MG Road",
        line2: "Anna Nagar",
        city: "Chennai",
        state: "TN",
        postalCode: "600028",
        country: "India",
      }),
    ).toEqual(["12 MG Road", "Anna Nagar", "Chennai, TN"]);
  });
});

describe("buildShippingAddressCopyText", () => {
  it("formats name, address, pincode, and mobile without labels", () => {
    expect(
      buildShippingAddressCopyText({
        customerName: "Rajesh Kumar",
        customerMobile: "9876543210",
        shippingAddress: {
          line1: "12 MG Road",
          line2: null,
          city: "Chennai",
          state: "TN",
          postalCode: "600028",
          country: "India",
        },
      }),
    ).toBe("Rajesh Kumar\n12 MG Road\nChennai, TN\n600028\n9876543210");
  });
});
