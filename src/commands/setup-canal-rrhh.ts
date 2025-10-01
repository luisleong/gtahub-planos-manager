import { ChatInputCommandInteraction, Guild, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from 'discord.js';
import config from '../../clientes/n-c-s/config.json';

export const data = new SlashCommandBuilder()
  .setName('setup_canal_rrhh')
  .setDescription('Configura el canal persistente de RRHH para administración de mecánicos.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction: ChatInputCommandInteraction) {
  const canal = interaction.channel as TextChannel;
  if (!canal) {
    await interaction.reply({ content: '❌ Canal no encontrado. (No es un canal de texto)', ephemeral: true });
    return;
  }

  // Obtener servicios activos y últimos logs usando métodos públicos y tipado
  let serviciosActivos: { usuario_id: string }[] = [];
  let ultimosLogs: { usuario_id: string, notas: string }[] = [];
  try {
    const db = interaction.client.db;
    const todosServicios: { usuario_id: string, fin?: string, notas?: string }[] = await db.obtenerServiciosRecientes();
    serviciosActivos = todosServicios.filter(s => !s.fin);
    const usuarios = [...new Set(todosServicios.map(s => s.usuario_id))];
    ultimosLogs = usuarios.map(uid => {
      const ult = todosServicios.find(s => s.usuario_id === uid && s.notas);
      return ult ? { usuario_id: uid, notas: ult.notas || '' } : null;
    }).filter(Boolean) as { usuario_id: string, notas: string }[];
  } catch {}

  // Construir campos para el embed
  let activosField = serviciosActivos.length > 0
    ? serviciosActivos.map(s => `<@${s.usuario_id}>`).join('\n')
    : 'Nadie en servicio';
  let logsField = ultimosLogs.length > 0
    ? ultimosLogs.map(l => `<@${l.usuario_id}>: ${l.notas}`).join('\n')
    : 'Sin registros recientes';

  const embed = {
    color: 0x2ECC71, // Verde GTAHUB
    title: 'Panel de Administración RRHH',
    description: 'Estado actual de los mecánicos y últimos logs de servicio.',
    fields: [
      { name: 'En servicio', value: activosField },
      { name: 'Últimos logs', value: logsField }
    ],
    footer: { text: 'Service Manager' }
  };

  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ver_ranking')
        .setLabel('Ver ranking')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ver_historial')
        .setLabel('Ver historial')
        .setStyle(ButtonStyle.Secondary)
    );

  // Buscar si ya existe mensaje persistente en la base de datos
  let mensajeId: string | undefined;
  let dbError: any = null;
  let db = null;
  try {
    db = interaction.client.db;
    if (db && db.obtenerMensajeRRHH) {
      const info = await db.obtenerMensajeRRHH();
      if (info && info.mensaje_id && info.canal_id === canal.id) {
        mensajeId = info.mensaje_id;
      }
    }
  } catch (err) {
    dbError = err;
  }

  if (dbError) {
    await interaction.reply({ content: `❌ Error accediendo a la base de datos: ${dbError}`, ephemeral: true });
    return;
  }

  if (mensajeId) {
    // Editar mensaje existente
    try {
  const mensaje = await canal.messages.fetch(mensajeId);
  await mensaje.edit({ embeds: [embed], components: [row] });
  await interaction.reply({ content: `✅ Canal RRHH configurado y mensaje persistente actualizado.`, ephemeral: true });
    } catch (err) {
      await interaction.reply({ content: `❌ Error al editar el mensaje persistente: ${err}`, ephemeral: true });
      // Si el mensaje no existe, crear uno nuevo
      try {
  const nuevoMensaje = await canal.send({ embeds: [embed], components: [row] });
        if (db && db.guardarMensajeRRHH) {
          await db.guardarMensajeRRHH(nuevoMensaje.id, canal.id);
        }
        await interaction.followUp({ content: `✅ Canal RRHH configurado y mensaje persistente enviado.`, ephemeral: true });
      } catch (sendErr) {
        await interaction.followUp({ content: `❌ Error al enviar el mensaje persistente: ${sendErr}`, ephemeral: true });
      }
    }
  } else {
    // Crear mensaje nuevo y guardar ID
    try {
    const nuevoMensaje = await canal.send({ embeds: [embed], components: [row] });
      if (db && db.guardarMensajeRRHH) {
        await db.guardarMensajeRRHH(nuevoMensaje.id, canal.id);
      }
      await interaction.reply({ content: `✅ Canal RRHH configurado y mensaje persistente enviado.`, ephemeral: true });
    } catch (sendErr) {
      await interaction.reply({ content: `❌ Error al enviar el mensaje persistente: ${sendErr}`, ephemeral: true });
    }
  }
}
