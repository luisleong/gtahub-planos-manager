import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DatabaseManager } from '../database/DatabaseManager';

const db = new DatabaseManager();

export const data = new SlashCommandBuilder()
    .setName('eliminar-localizacion')
    .setDescription('Eliminar una localización existente')
    .addIntegerOption(option =>
        option.setName('id')
            .setDescription('ID de la localización a eliminar')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const id = interaction.options.getInteger('id', true);

        // Verificar si la localización existe
        const localizacion = await db.obtenerLocalizacionPorId(id);
        if (!localizacion) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Error')
                .setDescription(`No se encontró una localización con ID **${id}**.`)
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Intentar eliminar la localización
        const resultado = await db.eliminarLocalizacion(id);

        if (resultado.success) {
            const successEmbed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('🗑️ Localización Eliminada')
                .setDescription(`La localización **${localizacion.nombre}** ha sido eliminada correctamente.`)
                .addFields(
                    { name: '🆔 ID Eliminado', value: id.toString(), inline: true },
                    { name: '📍 Nombre', value: localizacion.nombre, inline: true }
                )
                .setTimestamp();

            if (localizacion.foto_url) {
                successEmbed.setThumbnail(localizacion.foto_url);
            }

            await interaction.reply({ embeds: [successEmbed] });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ No se puede eliminar')
                .setDescription(resultado.message)
                .addFields(
                    { name: '💡 Solución', value: 'Marca como recogidas las fabricaciones activas antes de eliminar la localización.', inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

    } catch (error) {
        console.error('Error ejecutando comando eliminar-localizacion:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('❌ Error')
            .setDescription('Ocurrió un error al eliminar la localización.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}
