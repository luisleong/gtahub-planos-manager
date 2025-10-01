import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { Localizacion, Plano } from '../database/DatabaseManager';

export default {
  data: new SlashCommandBuilder()
    .setName('fab')
    .setDescription('Fabricar plano rápido especificando tipo y localización')
    .addStringOption(option =>
      option.setName('plano')
        .setDescription('Tipo de plano a fabricar')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option.setName('localizacion')
        .setDescription('Localización donde fabricar')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
  try {

    await interaction.deferReply({ ephemeral: true });
    const planoNombre = interaction.options.getString('plano', true);
    const localizacionNombre = interaction.options.getString('localizacion', true);
    const db = interaction.client.db;

    // Buscar plano y localización por nombre (case-insensitive)
    const planos: Plano[] = await db.obtenerPlanos();
    const localizaciones: Localizacion[] = await db.obtenerLocalizaciones();
    const plano = planos.find(p => p.nombre.toLowerCase() === planoNombre.toLowerCase());
    // Filtrar localizaciones para que NO muestre las que tienen fabricaciones activas (en proceso, no recogidas)
    // Primero, obtener fabricaciones activas
    const fabricaciones = await db.obtenerFabricaciones();
    const localizacionesOcupadas = new Set(
      fabricaciones.filter(f => !f.recogido && !f.listo_para_recoger).map(f => f.id_localizacion)
    );
    // Solo permitir seleccionar localizaciones libres
    const localizacion = localizaciones.find(l =>
      l.nombre.toLowerCase() === localizacionNombre.toLowerCase() &&
      !localizacionesOcupadas.has(l.id)
    );


    if (!plano) {
      await interaction.editReply({ content: `❌ Plano no encontrado: ${planoNombre}` });
      return;
    }
    if (!localizacion) {
      await interaction.editReply({ content: `❌ Localización no encontrada o está ocupada: ${localizacionNombre}` });
      return;
    }

      // Crear la fabricación, pasando canalNotificacion
      try {
        // Orden correcto: id_localizacion, id_plano
        const fabricacionId = await db.crearFabricacion(
          localizacion.id, // id_localizacion primero
          plano.id,        // id_plano después
          (interaction.member && 'displayName' in interaction.member
            ? (interaction.member as any).displayName
            : (interaction.member && 'nickname' in interaction.member
              ? (interaction.member as any).nickname
              : interaction.user.displayName || interaction.user.username)),
          interaction.user.id,
          undefined, // notas
          interaction.channelId // canalNotificacion
        );
        await interaction.editReply({
          content: `✅ Fabricación iniciada: **${plano.nombre}** en *${localizacion.nombre}* (ID: ${fabricacionId})`,
        });
      } catch (error) {
        console.error('[FAB] Error al crear la fabricación:', error);
        await interaction.editReply({ content: '❌ Error al crear la fabricación.' });
      }
    } catch (error) {
      console.error('[FAB] Error en /fab:', error);
      await interaction.reply({ content: 'Ocurrió un error al crear la fabricación. Contacta a un administrador.', ephemeral: true });
    }
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const db = interaction.client.db;
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'plano') {
      const planos: Plano[] = await db.obtenerPlanos();
      const filtered = planos.filter(p => p.nombre.toLowerCase().includes(focused.value.toLowerCase()));
      await interaction.respond(
        filtered.slice(0, 25).map(p => ({ name: p.nombre, value: p.nombre }))
      );
    } else if (focused.name === 'localizacion') {
      const localizaciones: Localizacion[] = await db.obtenerLocalizaciones();
      // Obtener fabricaciones activas para filtrar localizaciones ocupadas
      const fabricaciones = await db.obtenerFabricaciones();
      const localizacionesOcupadas = new Set(
        fabricaciones.filter(f => !f.recogido && !f.listo_para_recoger).map(f => f.id_localizacion)
      );
      const filtered = localizaciones.filter(l =>
        l.nombre.toLowerCase().includes(focused.value.toLowerCase()) &&
        !localizacionesOcupadas.has(l.id)
      );
      await interaction.respond(
        filtered.slice(0, 25).map(l => ({ name: l.nombre, value: l.nombre }))
      );
    }
  }
};