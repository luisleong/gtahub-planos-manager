import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  TextChannel
} from 'discord.js';
import { DatabaseManager } from '../database/DatabaseManager';

const db = new DatabaseManager();

export const data = new SlashCommandBuilder()
  .setName('panel_servicio')
  .setDescription('Muestra el panel de marcaje de servicio para el mecánico en su canal.');

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const canal = interaction.channel as TextChannel;
    const usuario = interaction.user;
    let displayName = usuario.username;
    if (interaction.guild) {
      const member = await interaction.guild.members.fetch(usuario.id);
      displayName = member.displayName || usuario.username;
    }
    await sendPanelServicio(canal, usuario.id, displayName);
    await interaction.reply({ content: '✅ Panel de servicio enviado.', ephemeral: true });
  } catch (error: any) {
    console.error('[panel_servicio] Error:', error);
    await interaction.reply({ content: `❌ Error: ${error.message || error}`, ephemeral: true });
  }
}

/**
 * Envía o actualiza el panel de servicio en el canal
 */
export async function sendPanelServicio(canal: TextChannel, usuarioId: string, username: string) {
  // Obtener el propietario del canal
  let propietarioId = usuarioId;
  try {
    const propId = await db.obtenerPropietarioPorCanal(canal.id);
    if (propId) propietarioId = propId;
  } catch {}

  const servicios = await db.obtenerServiciosPorUsuario(propietarioId);
  const servicioActivo = servicios.find(s => !s.fin);
  const estado = servicioActivo ? '🟢 En servicio' : '🔴 Fuera de servicio';
  const color = servicioActivo ? 0x57F287 : 0xED4245;
  let ultimoUsuario = '';
  if (servicios.length > 0) {
    // El último registro es el primero en la lista (orden DESC)
    const ultimoServicio = servicios[0];
    try {
      if (canal.guild) {
        const miembro = await canal.guild.members.fetch(ultimoServicio.usuario_id);
        ultimoUsuario = miembro.displayName || miembro.user.username;
      }
    } catch {
      ultimoUsuario = ultimoServicio.usuario_id;
    }
  }
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('Marcaje de Servicio')
    .setDescription('Usa los botones para iniciar y finalizar tu jornada.')
    .addFields(
      { name: 'Estado', value: estado, inline: true },
      { name: 'Último marcaje', value: ultimoUsuario ? ultimoUsuario : 'Nadie', inline: true }
    )
    .setFooter({ text: 'Service Manager' });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('iniciar_servicio')
      .setLabel('Iniciar servicio')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!!servicioActivo),
    new ButtonBuilder()
      .setCustomId('finalizar_servicio')
      .setLabel('Finalizar servicio')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(!servicioActivo)
  );

  // Panel persistente por canal
  // Buscar mensaje persistente en la base de datos
  let mensajeId: string | undefined;
  try {
    const persistente = await db.obtenerMensajeRRHH();
    if (persistente && persistente.canal_id === canal.id) {
      mensajeId = persistente.mensaje_id;
    }
  } catch {}

  if (mensajeId) {
    // Editar el mensaje existente
    try {
      const mensaje = await canal.messages.fetch(mensajeId);
      await mensaje.edit({ embeds: [embed], components: [row] });
    } catch {
      // Si falla, crear uno nuevo
      const nuevoMensaje = await canal.send({ embeds: [embed], components: [row] });
      await db.guardarMensajeRRHH(nuevoMensaje.id, canal.id);
    }
  } else {
    // Crear mensaje persistente y guardar su ID
    const nuevoMensaje = await canal.send({ embeds: [embed], components: [row] });
    await db.guardarMensajeRRHH(nuevoMensaje.id, canal.id);
  }
}

// Handler para los botones (ejemplo, debe integrarse en el listener global de botones)
export async function handleButton(interaction: ButtonInteraction) {
  const usuario = interaction.user;
  // Obtener propietario del canal
  let propietarioId = usuario.id;
  try {
    propietarioId = await db.obtenerPropietarioPorCanal(interaction.channelId) || usuario.id;
  } catch {}

  if (usuario.id !== propietarioId) {
    await interaction.reply({ content: '❌ Solo el mecánico asignado puede usar este botón.', ephemeral: true });
    return;
  }

  if (interaction.customId === 'iniciar_servicio') {
    await db.registrarInicioServicio(usuario.id, interaction.channelId);
    await interaction.reply({ content: '🟢 Has iniciado tu servicio.', ephemeral: true });
  } else if (interaction.customId === 'finalizar_servicio') {
    // Buscar el servicio activo
    const servicios = await db.obtenerServiciosPorUsuario(usuario.id);
    const servicioActivo = servicios.find(s => !s.fin);
    if (servicioActivo) {
      await db.registrarFinServicio(servicioActivo.id);
      await interaction.reply({ content: '🔴 Has finalizado tu servicio.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'No tienes un servicio activo.', ephemeral: true });
    }
  }
}
