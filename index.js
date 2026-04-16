require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

// 👤 MAPEO AGENTES
const AGENTES_MAP = {
  12: "whatsapp:+5215543739673",
  2: "whatsapp:+5215522222222"
};

// 🧠 CONTROL
const conversacionesAsignadas = new Set();
const ultimaNotificacionMensaje = new Map();

// ⏱️ TIEMPO ENTRE NOTIFICACIONES (ms)
const COOLDOWN = 2 * 60 * 1000; // 2 minutos

// 🔹 ENVIAR TEMPLATE
async function sendTemplate(to, contentSid, variables) {
  try {
    const params = new URLSearchParams();
    params.append("To", to);
    params.append("From", process.env.TWILIO_FROM);
    params.append("ContentSid", contentSid);
    params.append("ContentVariables", JSON.stringify(variables));

    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`,
      params,
      {
        auth: {
          username: process.env.TWILIO_SID,
          password: process.env.TWILIO_AUTH_TOKEN,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log(`✅ Enviado a ${to}`);

  } catch (error) {
    console.error("❌ Error Twilio:");
    console.error(error.response?.data || error.message);
  }
}

// 🔹 WEBHOOK
app.post("/webhook/chatwoot", async (req, res) => {
  const event = req.body.event;
  const conversationId = req.body.conversation?.id;

  try {

    // 🟡 ASIGNACIÓN
    if (event === "conversation_updated") {

      const assignee = req.body.meta?.assignee;

      if (!assignee?.id) return res.sendStatus(200);

      const telefono = AGENTES_MAP[assignee.id];
      if (!telefono) return res.sendStatus(200);

      if (conversacionesAsignadas.has(conversationId)) {
        return res.sendStatus(200);
      }

      conversacionesAsignadas.add(conversationId);

      const contacto = req.body.meta?.sender?.name || "Cliente";

      console.log("📤 Notificando asignación...");

      await sendTemplate(
        telefono,
        "HX893d4fe0222bc376845904ccb112c866",
        { 1: contacto }
      );
    }

    // 🟢 MENSAJE DEL CLIENTE
    if (event === "message_created") {

      const messageType = req.body.message_type;

      // 🚫 Solo mensajes entrantes
      if (messageType !== "incoming") {
        return res.sendStatus(200);
      }

      const assigneeId = req.body.meta?.assignee?.id;
      if (!assigneeId) return res.sendStatus(200);

      const telefono = AGENTES_MAP[assigneeId];
      if (!telefono) return res.sendStatus(200);

      const ahora = Date.now();
      const ultima = ultimaNotificacionMensaje.get(conversationId) || 0;

      // 🚫 COOLDOWN
      if (ahora - ultima < COOLDOWN) {
        console.log("⛔ Cooldown activo");
        return res.sendStatus(200);
      }

      ultimaNotificacionMensaje.set(conversationId, ahora);

      const mensaje = req.body.message?.content || "Nuevo mensaje";
      const nombre = req.body.meta?.sender?.name || "Cliente";

      console.log("📤 Notificando nuevo mensaje...");

      await sendTemplate(
        telefono,
        "HX199f64110199488a4e9f8cd1d1cfe50c",
        {
          1: nombre,
          2: mensaje
        }
      );
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("❌ ERROR:", error.message);
    res.sendStatus(500);
  }
});

// 🔹 SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Bot corriendo en puerto ${PORT}`);
});
