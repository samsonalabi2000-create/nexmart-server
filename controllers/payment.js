const crypto = require("crypto");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const Order = require("../models/Order");
const User = require("../models/User");
const { query } = require("../config/db");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = "https://api.paystack.co";

// ============================================================
// PAYSTACK API HELPER
// ============================================================

async function paystackRequest(method, path, body = null) {
  if (!PAYSTACK_SECRET) {
    throw new AppError("Payment is not configured on the server", 500);
  }

  const response = await fetch(`${PAYSTACK_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok || data.status === false) {
    console.error("Paystack API error:", data);
    throw new AppError(
      data.message || "Paystack request failed",
      response.status || 500
    );
  }

  return data;
}

// ============================================================
// POST /api/payment/initialize
// ============================================================

exports.initialize = catchAsync(async (req, res) => {
  if (!PAYSTACK_SECRET) {
    throw new AppError("Payment is not configured on the server", 500);
  }

  const { items, shipping, notes } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Your cart is empty", 400);
  }

  if (!shipping?.email) {
    throw new AppError("Shipping email is required", 400);
  }

  // ----------------------------------------------------------
  // Create order using SERVER-SIDE prices
  // ----------------------------------------------------------

  const order = await Order.create(req.user.id, {
    items,
    shipping,
    payment: {
      method: "card",
    },
    notes,
  });

  // ----------------------------------------------------------
  // Paystack amount is in kobo
  // Example: ₦10,000 = 1,000,000 kobo
  // ----------------------------------------------------------

  const amountInKobo = Math.round(Number(order.total) * 100);

  if (!Number.isFinite(amountInKobo) || amountInKobo <= 0) {
    throw new AppError("Invalid order amount", 400);
  }

  // ----------------------------------------------------------
  // Initialize Paystack
  // ----------------------------------------------------------

  const paystackData = await paystackRequest(
    "POST",
    "/transaction/initialize",
    {
      email: shipping.email,
      amount: amountInKobo,
      currency: "NGN",

      // UUID is valid because Paystack references allow
      // alphanumeric characters and certain punctuation.
      reference: order.id,

      callback_url:
        `${process.env.CLIENT_URL}/payment/verify` +
        `?order_id=${encodeURIComponent(order.id)}`,

      metadata: {
        order_id: order.id,
        tracking_number: order.tracking_number,
        customer_name:
          `${shipping.firstName || ""} ${shipping.lastName || ""}`.trim(),
      },

      channels: [
        "card",
        "bank",
        "ussd",
        "bank_transfer",
      ],
    }
  );

  return res.status(200).json({
    success: true,

    authorization_url:
      paystackData.data.authorization_url,

    access_code:
      paystackData.data.access_code,

    reference:
      paystackData.data.reference,

    order_id:
      order.id,

    tracking_number:
      order.tracking_number,

    total:
      order.total,
  });
});

// ============================================================
// GET /api/payment/verify?reference=xxx
// ============================================================

exports.verify = catchAsync(async (req, res) => {
  if (!PAYSTACK_SECRET) {
    throw new AppError("Payment is not configured on the server", 500);
  }

  const { reference } = req.query;

  if (!reference) {
    throw new AppError("Payment reference is required", 400);
  }

  // ----------------------------------------------------------
  // Ask Paystack for the actual transaction status
  // ----------------------------------------------------------

  const paystackData = await paystackRequest(
    "GET",
    `/transaction/verify/${encodeURIComponent(reference)}`
  );

  const transaction = paystackData.data;

  // ----------------------------------------------------------
  // Payment was NOT successful
  // ----------------------------------------------------------

  if (transaction.status !== "success") {
    await query(
      `
      UPDATE orders
      SET payment_status = 'failed'
      WHERE id = $1
        AND payment_status != 'paid'
      `,
      [reference]
    );

    throw new AppError(
      `Payment ${transaction.status}. No successful payment was confirmed.`,
      402
    );
  }

  // ----------------------------------------------------------
  // Confirm the amount before marking order paid
  // ----------------------------------------------------------

  const { rows: existingRows } = await query(
    `
    SELECT id, total, payment_status
    FROM orders
    WHERE id = $1
    LIMIT 1
    `,
    [reference]
  );

  const existingOrder = existingRows[0];

  if (!existingOrder) {
    throw new AppError("Order not found", 404);
  }

  const expectedAmount =
    Math.round(Number(existingOrder.total) * 100);

  if (Number(transaction.amount) !== expectedAmount) {
    console.error("Payment amount mismatch:", {
      reference,
      expectedAmount,
      receivedAmount: transaction.amount,
    });

    throw new AppError(
      "Payment amount does not match the order amount",
      400
    );
  }

  // ----------------------------------------------------------
  // Mark order paid
  // ----------------------------------------------------------

  const { rows: [order] } = await query(
    `
    UPDATE orders
    SET
      payment_status = 'paid',
      transaction_id = $1
    WHERE id = $2
    RETURNING
      id,
      tracking_number,
      total,
      status,
      payment_status
    `,
    [
      String(transaction.id),
      reference,
    ]
  );

  // ----------------------------------------------------------
  // Award loyalty points only once
  // ----------------------------------------------------------

  if (existingOrder.payment_status !== "paid") {
    const points = Math.floor(Number(order.total) / 100);

    if (points > 0) {
      await User.addLoyaltyPoints(
        req.user.id,
        points
      );
    }
  }

  return res.json({
    success: true,
    order_id: order.id,
    tracking_number: order.tracking_number,
    total: order.total,
    payment_status: order.payment_status,
  });
});

// ============================================================
// POST /api/payment/webhook
// ============================================================

exports.webhook = async (req, res) => {
  try {
    if (!PAYSTACK_SECRET) {
      console.error("PAYSTACK_SECRET_KEY is missing");
      return res.sendStatus(500);
    }

    // --------------------------------------------------------
    // Verify Paystack signature against RAW request body
    // --------------------------------------------------------

    const signature =
      req.headers["x-paystack-signature"];

    if (!signature) {
      return res.status(401).send("Missing signature");
    }

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from("");

    const expectedSignature =
      crypto
        .createHmac("sha512", PAYSTACK_SECRET)
        .update(rawBody)
        .digest("hex");

    const signaturesMatch =
      signature.length === expectedSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

    if (!signaturesMatch) {
      console.error("Invalid Paystack webhook signature");
      return res.status(401).send("Invalid signature");
    }

    // --------------------------------------------------------
    // Parse event
    // --------------------------------------------------------

    const event = JSON.parse(rawBody.toString("utf8"));

    console.log(
      `Paystack webhook received: ${event.event}`
    );

    // --------------------------------------------------------
    // Successful payment
    // --------------------------------------------------------

    if (event.event === "charge.success") {
      const transaction = event.data;

      const reference = transaction.reference;

      if (!reference) {
        return res.sendStatus(200);
      }

      // Find order first
      const { rows: [order] } = await query(
        `
        SELECT
          id,
          total,
          payment_status,
          user_id
        FROM orders
        WHERE id = $1
        LIMIT 1
        `,
        [reference]
      );

      if (!order) {
        console.error(
          "Webhook order not found:",
          reference
        );

        return res.sendStatus(200);
      }

      // Verify amount
      const expectedAmount =
        Math.round(Number(order.total) * 100);

      if (Number(transaction.amount) !== expectedAmount) {
        console.error(
          "Webhook amount mismatch:",
          reference
        );

        return res.sendStatus(200);
      }

      // Idempotent update
      await query(
        `
        UPDATE orders
        SET
          payment_status = 'paid',
          transaction_id = $1
        WHERE id = $2
          AND payment_status != 'paid'
        `,
        [
          String(transaction.id),
          reference,
        ]
      );

      // Award points only if this wasn't already paid
      if (order.payment_status !== "paid") {
        const points =
          Math.floor(Number(order.total) / 100);

        if (points > 0) {
          await User.addLoyaltyPoints(
            order.user_id,
            points
          );
        }
      }
    }

    // --------------------------------------------------------
    // Failed payment
    // --------------------------------------------------------

    if (event.event === "charge.failed") {
      const reference =
        event.data?.reference;

      if (reference) {
        await query(
          `
          UPDATE orders
          SET payment_status = 'failed'
          WHERE id = $1
            AND payment_status != 'paid'
          `,
          [reference]
        );
      }
    }

    // --------------------------------------------------------
    // Always acknowledge successful webhook receipt
    // --------------------------------------------------------

    return res.sendStatus(200);
  } catch (error) {
    console.error(
      "Paystack webhook error:",
      error
    );

    return res.sendStatus(500);
  }
};