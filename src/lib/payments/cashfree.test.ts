jest.mock("../integrations/settings", () => ({
  getCashfreeConfig: jest.fn(),
}));

jest.mock("../network/fetchWithTimeout", () => ({
  fetchWithTimeout: jest.fn(),
}));

jest.mock("../utils", () => ({
  getURL: () => "https://hubsofcraftss.com/",
}));

jest.mock("../auth/site-urls", () => ({
  getCanonicalSiteOrigin: () => "https://hubsofcraftss.com",
}));

import { getCashfreeConfig } from "../integrations/settings";
import { fetchWithTimeout } from "../network/fetchWithTimeout";
import { createCashfreePayment } from "./cashfree";
import { normalizeIndianMobile } from "./phonepe";

const mockGetCashfreeConfig = getCashfreeConfig as jest.MockedFunction<
  typeof getCashfreeConfig
>;
const mockFetchWithTimeout = fetchWithTimeout as jest.MockedFunction<
  typeof fetchWithTimeout
>;

const baseConfig = {
  clientId: "client_id",
  clientSecret: "client_secret",
  baseUrl: "https://api.cashfree.com/pg",
  apiVersion: "2023-08-01",
  environment: "production" as const,
  enabled: true,
};

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("createCashfreePayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCashfreeConfig.mockResolvedValue(baseConfig);
  });

  it("embeds the checkout access token in Cashfree return_url", async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(
      jsonResponse({
        order_id: "order_123",
        payment_session_id: "session_abc123",
      }),
    );

    await createCashfreePayment({
      orderId: "order_123",
      amountInRupees: 499,
      customerMobile: "9876543210",
      accessToken: "guest_hmac_token",
    });

    const init = mockFetchWithTimeout.mock.calls[0]?.[1];
    const body = JSON.parse(String(init?.body)) as {
      order_meta: { return_url: string };
    };
    expect(body.order_meta.return_url).toBe(
      "https://hubsofcraftss.com/api/cashfree/redirect?order_id={order_id}&token=guest_hmac_token",
    );
  });

  it("returns a payment session on the first successful response", async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(
      jsonResponse({
        order_id: "order_123",
        payment_session_id: "session_abc123",
        cf_order_id: 999,
      }),
    );

    const result = await createCashfreePayment({
      orderId: "order_123",
      amountInRupees: 499,
      customerName: "Test User",
      customerMobile: "9876543210",
      customerEmail: "test@example.com",
    });

    expect(result?.paymentSessionId).toBe("session_abc123");
    expect(mockFetchWithTimeout).toHaveBeenCalledTimes(1);
    expect(mockFetchWithTimeout.mock.calls[0]?.[1]?.timeoutMs).toBe(12_000);
  });

  it("retries once after a timeout and succeeds on the second attempt", async () => {
    mockFetchWithTimeout
      .mockRejectedValueOnce(new Error("Request timed out after 12000ms"))
      .mockResolvedValueOnce(
        jsonResponse({
          order_id: "order_123",
          payment_session_id: "session_retry_ok",
        }),
      );

    const result = await createCashfreePayment({
      orderId: "order_123",
      amountInRupees: 499,
      customerMobile: "9876543210",
    });

    expect(result?.paymentSessionId).toBe("session_retry_ok");
    expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
  });

  it("recovers payment_session_id from order status when create fails but order exists", async () => {
    mockFetchWithTimeout
      .mockResolvedValueOnce(
        jsonResponse(
          {
            message: "order already exists",
            type: "invalid_request_error",
          },
          409,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          order_id: "order_123",
          payment_session_id: "session_recovered",
          cf_order_id: 111,
        }),
      );

    const result = await createCashfreePayment({
      orderId: "order_123",
      amountInRupees: 499,
      customerMobile: "9876543210",
    });

    expect(result?.paymentSessionId).toBe("session_recovered");
    expect(mockFetchWithTimeout).toHaveBeenCalledTimes(2);
  });

  it("throws when create and recovery both fail", async () => {
    mockFetchWithTimeout
      .mockResolvedValueOnce(jsonResponse({ message: "server error" }, 500))
      .mockResolvedValueOnce(jsonResponse({ message: "not found" }, 404));

    await expect(
      createCashfreePayment({
        orderId: "order_123",
        amountInRupees: 499,
        customerMobile: "9876543210",
      }),
    ).rejects.toThrow("Cashfree order creation failed");
  });

  it("throws when customer mobile is invalid or missing", async () => {
    await expect(
      createCashfreePayment({
        orderId: "order_123",
        amountInRupees: 499,
        customerMobile: "12345",
      }),
    ).rejects.toThrow("Valid 10-digit Indian mobile number");
  });

  it("throws when customer mobile is null", async () => {
    await expect(
      createCashfreePayment({
        orderId: "order_123",
        amountInRupees: 499,
        customerMobile: null,
      }),
    ).rejects.toThrow("Valid 10-digit Indian mobile number");
  });

  it("always sends customer_phone as 10-digit string, never undefined", async () => {
    mockFetchWithTimeout.mockResolvedValueOnce(
      jsonResponse({
        order_id: "order_phone",
        payment_session_id: "session_phone123",
      }),
    );

    await createCashfreePayment({
      orderId: "order_phone",
      amountInRupees: 100,
      customerMobile: "919876543210",
    });

    const body = JSON.parse(
      String(mockFetchWithTimeout.mock.calls[0]?.[1]?.body),
    );
    expect(body.customer_details.customer_phone).toBe("9876543210");
    expect(body.customer_details.customer_phone).not.toBeUndefined();
  });
});

describe("normalizeIndianMobile", () => {
  it("normalizes plain 10-digit mobile", () => {
    expect(normalizeIndianMobile("9876543210")).toBe("919876543210");
  });

  it("normalizes 91-prefixed 12-digit mobile", () => {
    expect(normalizeIndianMobile("919876543210")).toBe("919876543210");
  });

  it("normalizes leading-0 11-digit mobile", () => {
    expect(normalizeIndianMobile("09876543210")).toBe("919876543210");
  });

  it("normalizes 0091-prefixed mobile", () => {
    expect(normalizeIndianMobile("00919876543210")).toBe("919876543210");
  });

  it("normalizes 091-prefixed mobile", () => {
    expect(normalizeIndianMobile("0919876543210")).toBe("919876543210");
  });

  it("handles +91 prefix with spaces", () => {
    expect(normalizeIndianMobile("+91 98765 43210")).toBe("919876543210");
  });

  it("returns empty for invalid short numbers", () => {
    expect(normalizeIndianMobile("12345")).toBe("");
  });

  it("returns empty for null/undefined", () => {
    expect(normalizeIndianMobile(null)).toBe("");
    expect(normalizeIndianMobile(undefined)).toBe("");
  });
});
