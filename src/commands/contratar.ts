import { ChatInputCommandInteraction, Guild, PermissionFlagsBits, SlashCommandBuilder, TextChannel } from 'discord.js';
const cliente = (process.env.CLIENTE || 'n-c-s').toLowerCase();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require(`../../clientes/${cliente}/config.json`);

export const data = new SlashCommandBuilder()
  .setName('contratar')
  .setDescription('Contrata a un nuevo mecánico y configura su canal personal.')
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('Usuario a contratar')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const usuario = interaction.options.getUser('usuario');
    if (!usuario) {
      await interaction.reply({ content: '❌ Usuario no encontrado. (No se recibió el parámetro)', ephemeral: true });
      return;
    }

    const guild = interaction.guild as Guild;
    if (!guild) {
      await interaction.reply({ content: '❌ Este comando solo funciona en servidores.', ephemeral: true });
      return;
    }

    // 1. Crear canal en la categoría de contratación si no existe
    const miembro = await guild.members.fetch(usuario.id);
    const displayName = miembro.displayName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    const canalNombre = displayName;
    let canal = guild.channels.cache.find(c =>
      c.type === 0 && c.name === canalNombre && c.parentId === config.CONTRATACION_CHANNEL_ID
    ) as TextChannel | undefined;
    if (!canal) {
      canal = await guild.channels.create({
        name: canalNombre,
        type: 0,
        parent: config.CONTRATACION_CHANNEL_ID,
        topic: `Canal personal de ${miembro.displayName} para marcaje de servicio.`,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: usuario.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: config.GERENTE_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: config.RRHH_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: config.JEFE_TALLER_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
      });
    }

    // 2. Asignar solo el rol de Ayudante
    if (!miembro.roles.cache.has(config.AYUDANTE_ROLE_ID)) {
      await miembro.roles.add(config.AYUDANTE_ROLE_ID);
    }


    // 3. Mensaje de bienvenida (etiquetando al usuario)
    const embed = {
      color: 0xE67E22, // Naranja GTAHUB
      title: `🎉 ¡Bienvenido a la familia de mecánicos, ${miembro.displayName}! 🚗🛠️`,
      description: `Tu canal personal está listo para que marques tus servicios y destaques como el mejor del taller.\n\nSi tienes dudas, pregunta a tu Jefe de Taller o RRHH. ¡Mucho éxito y a romperla! 💪`,
      thumbnail: { url: 'https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/src/images/mecanicos.jpg' }
    };
    await canal.send({ content: `<@${usuario.id}>`, embeds: [embed] });

    // Guardar el propietario del canal en la base de datos (por canal)
    if (interaction.client.db && interaction.client.db.actualizarMensajePersistente) {
      // Buscar la localización asociada al canal
      const localizaciones = await interaction.client.db.obtenerTodasLasLocalizaciones();
      const loc = localizaciones.find(l => l.canal_persistente_id === canal.id);
      if (loc) {
  await interaction.client.db.actualizarMensajePersistente(loc.id, '', canal.id, usuario.id);
      }
    }

    // 4. Crear panel de servicio persistente con botones reutilizando lógica de /panel_servicio
    const { sendPanelServicio } = require('./panel-servicio');
    await sendPanelServicio(canal, usuario.id, miembro.displayName);

  // 5. Enviar link al canal creado en el canal donde se ejecuta el comando
  await interaction.reply({ content: `✅ <@${usuario.id}> contratado y canal configurado: ${canal ? `<#${canal.id}>` : 'Canal no encontrado.'}`, ephemeral: false });
  } catch (error: any) {
    console.error('❌ Error en /contratar:', error);
    await interaction.reply({ content: `❌ Error ejecutando /contratar: ${error?.message || error}`, ephemeral: true });
  }
}
