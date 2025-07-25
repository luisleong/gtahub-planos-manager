import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder,
    EmbedBuilder
} from 'discord.js';
import { DatabaseManager } from '../database/DatabaseManager';

export const data = new SlashCommandBuilder()
    .setName('debug-db')
    .setDescription('Mostrar información de debug de la base de datos');

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        const dbManager = new DatabaseManager();
        
        const localizaciones = await dbManager.obtenerLocalizaciones();
        const planos = await dbManager.obtenerPlanos();
        const fabricaciones = await dbManager.obtenerFabricaciones();

        const embed = new EmbedBuilder()
            .setTitle('🔍 Debug Base de Datos')
            .addFields(
                { name: '📍 Localizaciones', value: `${localizaciones.length} total`, inline: true },
                { name: '📋 Planos', value: `${planos.length} total`, inline: true },
                { name: '⚙️ Fabricaciones', value: `${fabricaciones.length} total`, inline: true }
            )
            .setColor(0x5865F2)
            .setTimestamp();

        if (localizaciones.length > 0) {
            const locNames = localizaciones.map((loc: any) => `• ${loc.nombre}`).join('\n');
            embed.addFields({ name: '📍 Lista de Localizaciones', value: locNames || 'Ninguna', inline: false });
        }

        await interaction.reply({
            embeds: [embed],
            ephemeral: true
        });

    } catch (error) {
        console.error('Error en debug-db:', error);
        await interaction.reply({
            content: '❌ Error al acceder a la base de datos.',
            ephemeral: true
        });
    }
}
