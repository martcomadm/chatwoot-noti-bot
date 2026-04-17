require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// 🔐 TWILIO CONFIG
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error("❌ Faltan variables de entorno de Twilio");
  process.exit(1);
}

console.log("🚀 Iniciando bot...");
console.log("SID:", accountSid ? "OK" : "FALTA");
console.log("TOKEN:", authToken ? "OK" : "FALTA");

const client = require('twilio')(accountSid, authToken);

// 🧠 MAPA DE AGENTES (AJUSTA AQUÍ)
const agentes = {
  12: 'whatsapp:+5215543739673', // 👈 TU número real
  // agrega más si necesitas
};

// 🧠 CONTROL DE DUPLICADOS
const notificados = new Set();

// 🔥 WEBHOOK CHATWOOT
app.post('/webhook/chatwoot', async (req, res) => {
  const data = req.body;

  console.log("🔥 EVENTO COMPLETO:");
  console.log(JSON.stringify(data, null, 2));

  try {
    const evento = data.event;

    // ✅ SOLO MENSAJES
    if (evento !== 'message_created') {
      console.log("⏭ Ignorado: no es message_created");
      return res.sendStatus(200);
    }

    // ✅ SOLO ENTRANTES
    const tipoMensaje = data.message_type;

    if (tipoMensaje !== "incoming") {
      console.log("⏭ Ignorado: no es incoming");
      return res.sendStatus(200);
    }

    // ✅ OBTENER CONVERSACIÓN
    const conversation = data.conversation;

    if (!conversation) {
      console.log("❌ No hay conversación");
      return res.sendStatus(200);
    }

    // ✅ AGENTE ASIGNADO (CORREGIDO)
    const agenteId = conversation?.meta?.assignee?.id;

    if (!agenteId) {
      console.log("⏭ Sin agente asignado");
      return res.sendStatus(200);
    }

    console.log("👤 Agente detectado:", agenteId);

    // ✅ MAPEO
    const numeroAgente = agentes[agenteId];

    if (!numeroAgente) {
      console.log("⚠️ Agente sin número configurado:", agenteId);
      return res.sendStatus(200);
    }

    // ✅ EVITAR DUPLICADOS
    const clave = `${conversation.id}-${agenteId}`;

    if (notificados.has(clave)) {
      console.log("⏭ Ya notificado:", clave);
      return res.sendStatus(200);
    }

    notificados.add(clave);

    console.log("📲 Enviando notificación a:", numeroAgente);

    // 📩 ENVIAR WHATSAPP
    const response = await client.messages.create({
      from: 'whatsapp:+14155238886', // ⚠️ Sandbox Twilio
      to: numeroAgente,
      body: `📩 Nuevo mensaje asignado\n\n🆔 Conversación: ${conversation.id}`
    });

    console.log("✅ Notificación enviada");
    console.log("SID mensaje:", response.sid);

  } catch (error) {
    console.error("❌ ERROR GENERAL:");
    console.error(error.message);

    if (error.code) {
      console.error("Código Twilio:", error.code);
    }
  }

  res.sendStatus(200);
});

// 🚀 SERVER
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Bot corriendo en puerto ${PORT}`);
});
