import {
  mapIndiaPostStateToCatalog,
  normalizePincode,
  parseIndiaPostPincodeResponse,
} from "@/lib/geo/pincode-lookup";

describe("pincode-lookup helpers", () => {
  it("normalizes and validates 6-digit pins", () => {
    expect(normalizePincode("560 001")).toBe("560001");
    expect(normalizePincode("12345")).toBeNull();
    expect(normalizePincode("abcdef")).toBeNull();
  });

  it("maps India Post state aliases to catalog labels", () => {
    expect(mapIndiaPostStateToCatalog("Orissa")).toBe("Odisha");
    expect(mapIndiaPostStateToCatalog("NCT of Delhi")).toBe("Delhi");
    expect(mapIndiaPostStateToCatalog("Tamil Nadu")).toBe("Tamil Nadu");
    expect(mapIndiaPostStateToCatalog("Unknownland")).toBeNull();
  });

  it("parses successful India Post payloads", () => {
    const result = parseIndiaPostPincodeResponse("600001", [
      {
        Status: "Success",
        PostOffice: [
          {
            Name: "Chennai GPO",
            District: "Chennai",
            State: "Tamil Nadu",
          },
          {
            Name: "Flower Bazaar",
            District: "Chennai",
            State: "Tamil Nadu",
          },
        ],
      },
    ]);

    expect(result).toEqual({
      pin: "600001",
      state: "Tamil Nadu",
      district: "Chennai",
      city: "Chennai",
      areas: ["Chennai GPO", "Flower Bazaar"],
      localities: [
        {
          name: "Chennai GPO",
          district: "Chennai",
          state: "Tamil Nadu",
        },
        {
          name: "Flower Bazaar",
          district: "Chennai",
          state: "Tamil Nadu",
        },
      ],
    });
  });

  it("rejects failed India Post payloads", () => {
    expect(
      parseIndiaPostPincodeResponse("000000", [
        { Status: "Error", PostOffice: null },
      ]),
    ).toBeNull();
  });
});
