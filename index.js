import express from "express";
import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const app = express();
app.use(express.json());

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// 📱 MAPA DE AGENTES (EDITA AQUÍ)
const AGENT_PHONE_MAP = {
  12: "whatsapp:+5215543739673",
  // ejemplo:
  // 15: "whatsapp:+5215512345678"
};

// 🧠 MEMORIA para evitar spam
const notifiedMessages = new Set();

app.post("/webhook/chatwoot", async (req, res) => {
  console.log("\n==============================");
  console.log("🔥 WEBHOOK RECIBIDO");
  console.log("==============================");

  const body = req.body;

  console.log("📊 VARIABLES CLAVE:");
  console.log("EVENT:", body.event);
  console.log("MESSAGE TYPE:", body.message_type);
  console.log("CONVERSATION ID:", body.conversation?.id);

  // 🚨 SOLO mensajes entrantes
  if (body.event !== "message_created") return res.sendStatus(200);
  if (body.message_type !== "incoming") return res.sendStatus(200);

  const messageId = body.id;

  // 🚫 evitar duplicados
  if (notifiedMessages.has(messageId)) {
    console.log("⛔ MENSAJE YA NOTIFICADO");
    return res.sendStatus(200);
  }

  // ✅ obtener assignee correctamente
  const assignee = body.conversation?.meta?.assignee;
  const assigneeId = assignee?.id;

  console.log("\n👤 ASSIGNEE DETECTADO:");
  console.log(assignee);
  console.log("🆔 ASSIGNEE ID:", assigneeId);

  if (!assigneeId) {
    console.log("⛔ SIN AGENTE → ignorado");
    return res.sendStatus(200);
  }

  const agentPhone = AGENT_PHONE_MAP[assigneeId];

  console.log("📱 TELEFONO MAP:", agentPhone);

  if (!agentPhone) {
    console.log("⛔ AGENTE SIN TELEFONO CONFIGURADO");
    return res.sendStatus(200);
  }

  try {
    console.log("📨 ENVIANDO WHATSAPP...");

    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: agentPhone,
      contentSid: "HX199f64110199488a4e9f8cd1d1cfe50c", // template de mensaje nuevo
    });

    console.log("✅ NOTIFICACIÓN ENVIADA");

    // guardar como enviado
    notifiedMessages.add(messageId);

  } catch (error) {
    console.error("❌ ERROR TWILIO:", error.message);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot corriendo en puerto ${PORT}`);
});
