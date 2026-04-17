require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = require('twilio')(accountSid, authToken);

// 🧠 MAPA DE AGENTES
const agentes = {
  12: 'whatsapp:+5215543739673',
  2: 'whatsapp:+521XXXXXXXXXX'
};

// 🧠 CONTROL PARA NO DUPLICAR
const notificados = new Set();

app.post('/webhook/chatwoot', async (req, res) => {
  const data = req.body;

  console.log("🔥 EVENTO COMPLETO:");
  console.log(JSON.stringify(data, null, 2));

  try {
    const evento = data.event;

    if (evento !== 'message_created') {
      console.log("⏭ Ignorado: no es message_created");
      return res.sendStatus(200);
    }

    const conversation = data.conversation;
    const mensaje = data.message;

    // 🔥 SOLO MENSAJES ENTRANTES
    if (mensaje.message_type !== 0) {
      console.log("⏭ Ignorado: mensaje saliente");
      return res.sendStatus(200);
    }

    // 🧠 AGENTE ASIGNADO
    const agenteId =
      conversation?.assignee_id ||
      conversation?.meta?.assignee?.id;

    if (!agenteId) {
      console.log("⏭ Sin agente asignado");
      return res.sendStatus(200);
    }

    const numeroAgente = agentes[agenteId];

    if (!numeroAgente) {
      console.log("⚠️ Agente sin número configurado:", agenteId);
      return res.sendStatus(200);
    }

    // 🔥 EVITAR DUPLICADOS POR CONVERSACIÓN
    const clave = `${conversation.id}-${agenteId}`;

    if (notificados.has(clave)) {
      console.log("⏭ Ya notificado");
      return res.sendStatus(200);
    }

    notificados.add(clave);

    console.log("📲 Enviando notificación a:", numeroAgente);

    await client.messages.create({
      from: 'whatsapp:+14155238886',
      to: numeroAgente,
      body: `📩 Nuevo mensaje asignado\n\nConversación ID: ${conversation.id}`
    });

    console.log("✅ Notificación enviada");

  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }

  res.sendStatus(200);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot corriendo en puerto ${PORT}`);
});
