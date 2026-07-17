import { getSessionUser, isAdminUser } from "@/lib/auth/admin";
import {
  appendOrderAccessToken,
  createOrderAccessToken,
  resolvePaymentReturnPath,
  verifyOrderAccessToken,
} from "@/lib/auth/order-access-token";

export {
  appendOrderAccessToken,
  createOrderAccessToken,
  resolvePaymentReturnPath,
  verifyOrderAccessToken,
};

type OrderAccessRecord = {
  id: string;
  user_id: string | null;
  createdAt: string | Date;
};

export async function canViewOrder(
  order: OrderAccessRecord,
  token?: string | null,
): Promise<boolean> {
  const user = await getSessionUser();

  if (order.user_id) {
    if (user?.id === order.user_id) return true;
    return isAdminUser(user);
  }

  return verifyOrderAccessToken(order.id, order.createdAt, token);
}
