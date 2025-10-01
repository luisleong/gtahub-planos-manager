import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('debug-fabricaciones')
    .setDescription('Lista todas las filas de la tabla fabricaciones (sin filtros, DEBUG)'),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const db = interaction.client.db;
    try {
      const fabricaciones = await db.obtenerFabricaciones();
      if (!fabricaciones.length) {
        await interaction.editReply('No hay filas en la tabla fabricaciones.');
        return;
      }
      // Mostrar los primeros 10 resultados para evitar spam
      const filas = fabricaciones.slice(0, 10).map(f =>
        `ID: ${f.id} | Loc: ${f.id_localizacion} | Plano: ${f.id_plano} | Prop: ${f.propietario} | Recogido: ${f.recogido} | Listo: ${f.listo_para_recoger} | Notif: ${f.notificado} | Canal: ${f.canal_notificacion}`
      ).join('\n');
      await interaction.editReply(`Total: ${fabricaciones.length}\n\n\u2022\u2022\u2022\n${filas}`);
    } catch (error) {
      await interaction.editReply('Error al consultar la tabla fabricaciones.');
    }
  },
};
