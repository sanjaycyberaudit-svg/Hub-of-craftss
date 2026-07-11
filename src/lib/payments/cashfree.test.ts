jest.mock("../integrations/settings", () => ({
  getCashfreeConfig: jest.fn(),
}));

jest.mock("../network/fetchWithTimeout", () => ({
  fetchWithTimeout: jest.fn(),
}));

jest.mock("../utils", () => ({
  getURL: () => "https://www.hub-of-craftss.hubofcraftss.workers.dev/",
}));

jest.mock("../auth/site-urls", () => ({
  getCanonicalSiteOrigin: () =>
    "https://www.hub-of-craftss.hubofcraftss.workers.dev",
}));

import { getCashfreeConfig } from "../integrations/settings";
import { fetchWithTimeout } from "../network/fetchWithTimeout";
import { createCashfreePayment } from "./cashfree";

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
});
