const AppError   = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

exports.chat = catchAsync(async (req, res) => {
  const { messages, cartItems = [] } = req.body;

  if (!messages || !Array.isArray(messages)) throw new AppError("messages array is required", 400);
  if (!process.env.ANTHROPIC_API_KEY) throw new AppError("AI service not configured", 500);

  const cartSummary = cartItems.length === 0
    ? "The customer's cart is currently empty."
    : `Customer has ${cartItems.length} item(s) in cart:\n${
        cartItems.map((i) => `- ${i.name} x${i.quantity} @ ₦${Number(i.price).toLocaleString()}`).join("\n")
      }\nCart total: ₦${cartItems.reduce((s, i) => s + i.price * i.quantity, 0).toLocaleString()}`;

  const system = `You are NexBot, the helpful AI assistant for NexMart — Nigeria's #1 premium online marketplace.

CART: ${cartSummary}

POLICIES:
- Free delivery on orders over ₦50,000 (2–5 business days nationwide)
- 30-day returns — unused, original packaging
- Loyalty: 1 point per ₦100 spent
- Payments: Card, Bank Transfer, Crypto (via Paystack)
- Tracking numbers start with NX

BEHAVIOUR:
- Keep replies under 100 words unless more detail is needed
- Reference ₦ Naira, Nigerian cities (Lagos, Abuja, Port Harcourt)
- If cart items exist, reference them and suggest complementary products
- If within ₦15,000 of ₦50k free delivery, mention it
- For order status, ask for their NX tracking number

POPULAR ITEMS: Sony WH-1000XM5 ₦185k · MacBook Pro M3 ₦980k · Galaxy S24 Ultra ₦620k · PS5 ₦450k · Air Jordan 1 ₦95k · Fenty Foundation ₦18.5k`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method:  "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Anthropic error:", err);
    throw new AppError("AI service temporarily unavailable", 503);
  }

  const data  = await response.json();
  const reply = data?.content?.[0]?.text || "I couldn't generate a response. Please try again.";
  res.json({ reply });
});
