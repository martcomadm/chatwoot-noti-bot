require("dotenv").config();

const express = require("express");
const twilio = require("twilio");

const app = express();
app.use(express.json());

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// 📱 MAPA DE AGENTES
const AGENT_PHONE_MAP = {
  12: "whatsapp:+5215543739673", // ← tu número
};

// 🧠 MEMORIA anti spam
const notifiedMessages = new Set();

app.post("/webhook/chatwoot", async (req, res) => {
  console.log("\n==============================");
  console.log("🔥 WEBHOOK RECIBIDO");
  console.log("==============================");

  const body = req.body;

  console.log("EVENT:", body.event);
  console.log("TYPE:", body.message_type);

  if (body.event !== "message_created") return res.sendStatus(200);
  if (body.message_type !== "incoming") return res.sendStatus(200);

  const messageId = body.id;

  if (notifiedMessages.has(messageId)) {
    console.log("⛔ YA NOTIFICADO");
    return res.sendStatus(200);
  }

  const assignee = body.conversation?.meta?.assignee;
  const assigneeId = assignee?.id;

  console.log("ASSIGNEE ID:", assigneeId);

  if (!assigneeId) {
    console.log("⛔ SIN AGENTE");
    return res.sendStatus(200);
  }

  const agentPhone = AGENT_PHONE_MAP[assigneeId];

  if (!agentPhone) {
    console.log("⛔ SIN TELEFONO CONFIGURADO");
    return res.sendStatus(200);
  }

  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: agentPhone,
      contentSid: "HX199f64110199488a4e9f8cd1d1cfe50c",
    });

    console.log("✅ NOTIFICACIÓN ENVIADA");
    notifiedMessages.add(messageId);

  } catch (err) {
    console.error("❌ ERROR:", err.message);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Bot corriendo en puerto ${PORT}`);
});
