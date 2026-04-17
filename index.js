require('dotenv').config();

const express = require('express');
const twilio = require('twilio');

const app = express();
app.use(express.json());

// =============================
// CONFIG TWILIO
// =============================
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// =============================
// MAPA DE AGENTES (EDITA ESTO)
// =============================
const AGENTES = {
  // agent_id : whatsapp
  12: "whatsapp:+5215543739673",
  2: "whatsapp:+5215522222222",
};

// =============================
// CONTROL PARA EVITAR DUPLICADOS
// =============================
const conversacionesNotificadas = new Set();
const mensajesNotificados = new Set();

// =============================
// DEBUG INICIAL
// =============================
console.log("🚀 Iniciando bot...");
console.log("SID:", process.env.TWILIO_ACCOUNT_SID ? "OK" : "FALTA");
console.log("TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "OK" : "FALTA");

// =============================
// WEBHOOK CHATWOOT
// =============================
app.post('/webhook', async (req, res) => {
  try {
    const evento = req.body.event;
    const conversation = req.body.conversation;
    const message = req.body.message;

    console.log("📩 Evento recibido:", evento);

    // =============================
    // 1. CUANDO SE ASIGNA CONVERSACIÓN
    // =============================
    if (evento === "conversation_updated" && conversation?.assignee_id) {
      const convId = conversation.id;
      const agenteId = conversation.assignee_id;

      console.log("👤 Asignación detectada:", convId, "->", agenteId);

      // evitar duplicados
      if (conversacionesNotificadas.has(convId)) {
        console.log("⚠️ Ya notificado antes");
        return res.sendStatus(200);
      }

      const numeroAgente = AGENTES[agenteId];

      if (!numeroAgente) {
        console.log("❌ Agente sin número configurado:", agenteId);
        return res.sendStatus(200);
      }

      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: numeroAgente,
        contentSid: "HX199f64110199488a4e9f8cd1d1cfe50c"
      });

      console.log("✅ Notificación enviada al agente");

      conversacionesNotificadas.add(convId);
    }

    // =============================
    // 2. CUANDO CLIENTE RESPONDE
    // =============================
    if (evento === "message_created" && message) {
      const convId = message.conversation_id;

      // SOLO mensajes entrantes (cliente)
      if (message.message_type !== 0) {
        return res.sendStatus(200);
      }

      console.log("💬 Mensaje de cliente en conversación:", convId);

      // evitar duplicados
      if (mensajesNotificados.has(message.id)) {
        console.log("⚠️ Mensaje ya notificado");
        return res.sendStatus(200);
      }

      const agenteId = req.body.conversation?.assignee_id;
      const numeroAgente = AGENTES[agenteId];

      if (!numeroAgente) {
        console.log("❌ No hay agente asignado");
        return res.sendStatus(200);
      }

      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: numeroAgente,
        contentSid: "HX199f64110199488a4e9f8cd1d1cfe50c"
      });

      console.log("📨 Notificación de nuevo mensaje enviada");

      mensajesNotificados.add(message.id);
    }

    res.sendStatus(200);

  } catch (error) {
    console.error("💥 ERROR:", error.message);
    res.sendStatus(500);
  }
});

// =============================
// SERVER
// =============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Bot corriendo en puerto ${PORT}`);
});
