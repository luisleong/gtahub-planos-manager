import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { ChannelPermissions } from '../utils/channelPermissions';

export const data = new SlashCommandBuilder()
    .setName('configurar-canales')
    .setDescription('Ver la configuración actual de canales del bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        // Generar embed con información de configuración
        const configEmbed = ChannelPermissions.generarEmbedConfiguracion();
        
        // Agregar información adicional
        configEmbed.addFields({
            name: '📖 Información de Comandos',
            value: `
            **🏭 Canal de Fabricación:**
            • \`/iniciar-fabricacion\`
            • \`/listar-fabricaciones\`
            • \`/recoger-fabricacion\`
            • \`/info\`
            
            **⚙️ Canal de Administración:**
            • \`/gestionar\` (panel visual)
            • \`/agregar-localizacion\`
            • \`/editar-localizacion\`
            • \`/agregar-plano\`
            • \`/editar-plano\`
            `,
            inline: false
        });

        configEmbed.addFields({
            name: '🔧 Para Configurar Canales',
            value: `
            **1.** Ve al archivo \`.env\` del bot
            **2.** Copia el ID del canal (click derecho → Copiar ID)
            **3.** Configura las variables:
            \`\`\`
            FABRICACION_CHANNEL_ID=ID_DEL_CANAL_FABRICACION
            ADMIN_CHANNEL_ID=ID_DEL_CANAL_ADMIN
            \`\`\`
            **4.** Reinicia el bot para aplicar cambios
            `,
            inline: false
        });

        // Información del canal actual
        configEmbed.addFields({
            name: '📍 Canal Actual',
            value: `<#${interaction.channelId}> (ID: \`${interaction.channelId}\`)`,
            inline: false
        });

        await interaction.reply({
            embeds: [configEmbed],
            ephemeral: true
        });

    } catch (error) {
        console.error('Error ejecutando comando configurar-canales:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('❌ Error')
            .setDescription('Ocurrió un error al mostrar la configuración de canales.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}
