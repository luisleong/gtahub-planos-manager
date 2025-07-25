import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DatabaseManager } from '../database/DatabaseManager';

const db = new DatabaseManager();

export const data = new SlashCommandBuilder()
    .setName('eliminar-plano')
    .setDescription('Eliminar un plano existente')
    .addIntegerOption(option =>
        option.setName('id')
            .setDescription('ID del plano a eliminar')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const id = interaction.options.getInteger('id', true);

        // Verificar si el plano existe
        const plano = await db.obtenerPlanoPorId(id);
        if (!plano) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Error')
                .setDescription(`No se encontró un plano con ID **${id}**.`)
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Intentar eliminar el plano
        const resultado = await db.eliminarPlano(id);

        if (resultado.success) {
            const successEmbed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('🗑️ Plano Eliminado')
                .setDescription(`El plano **${plano.nombre}** ha sido eliminado correctamente.`)
                .addFields(
                    { name: '🆔 ID Eliminado', value: id.toString(), inline: true },
                    { name: '📋 Nombre', value: plano.nombre, inline: true },
                    { name: '⏱️ Duración', value: `${plano.duracion_minutos} min`, inline: true }
                )
                .setTimestamp();

            if (plano.icono_url) {
                successEmbed.setThumbnail(plano.icono_url);
            }

            await interaction.reply({ embeds: [successEmbed] });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ No se puede eliminar')
                .setDescription(resultado.message)
                .addFields(
                    { name: '💡 Solución', value: 'Marca como recogidas las fabricaciones activas antes de eliminar el plano.', inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

    } catch (error) {
        console.error('Error ejecutando comando eliminar-plano:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('❌ Error')
            .setDescription('Ocurrió un error al eliminar el plano.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}
