import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';

export class ChannelPermissions {
    // Canales permitidos para cada tipo de comando
    static readonly FABRICACION_COMMANDS = [
        'iniciar-fabricacion',
        'listar-fabricaciones',
        'recoger-fabricacion',
        'info'
    ];

    static readonly ADMIN_COMMANDS = [
        'gestionar',
        'agregar-localizacion',
        'editar-localizacion',
        'agregar-plano',
        'editar-plano'
    ];

    /**
     * Verificar si un comando puede ejecutarse en el canal actual
     */
    static async verificarCanal(interaction: ChatInputCommandInteraction): Promise<boolean> {
        const comandoNombre = interaction.commandName;
        const canalId = interaction.channelId;

        // Obtener IDs de canales desde variables de entorno
        const fabricacionChannelId = process.env.FABRICACION_CHANNEL_ID;
        const adminChannelId = process.env.ADMIN_CHANNEL_ID;

        // Si no están configurados los canales, permitir en cualquier lugar
        if (!fabricacionChannelId || !adminChannelId || 
            fabricacionChannelId === 'YOUR_FABRICACION_CHANNEL_ID' || 
            adminChannelId === 'YOUR_ADMIN_CHANNEL_ID') {
            return true;
        }

        // Verificar comandos de fabricación
        if (this.FABRICACION_COMMANDS.includes(comandoNombre)) {
            if (canalId !== fabricacionChannelId) {
                await this.enviarErrorCanal(interaction, 'fabricación', fabricacionChannelId);
                return false;
            }
        }

        // Verificar comandos de administración
        if (this.ADMIN_COMMANDS.includes(comandoNombre)) {
            if (canalId !== adminChannelId) {
                await this.enviarErrorCanal(interaction, 'administración', adminChannelId);
                return false;
            }
        }

        return true;
    }

    /**
     * Enviar mensaje de error cuando se usa un comando en el canal incorrecto
     */
    private static async enviarErrorCanal(
        interaction: ChatInputCommandInteraction, 
        tipoCanal: string, 
        canalCorrectoId: string
    ): Promise<void> {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('🚫 Canal Incorrecto')
            .setDescription(`Este comando solo puede usarse en el canal de **${tipoCanal}**.`)
            .addFields({
                name: '📍 Canal Correcto',
                value: `<#${canalCorrectoId}>`,
                inline: true
            })
            .setTimestamp();

        await interaction.reply({ 
            embeds: [errorEmbed], 
            ephemeral: true 
        });
    }

    /**
     * Obtener información sobre los canales configurados
     */
    static getChannelInfo() {
        return {
            fabricacion: process.env.FABRICACION_CHANNEL_ID,
            admin: process.env.ADMIN_CHANNEL_ID,
            notification: process.env.NOTIFICATION_CHANNEL_ID,
            configured: this.isConfigured()
        };
    }

    /**
     * Verificar si los canales están configurados
     */
    static isConfigured(): boolean {
        const fabricacionId = process.env.FABRICACION_CHANNEL_ID;
        const adminId = process.env.ADMIN_CHANNEL_ID;

        return !!(fabricacionId && adminId && 
                  fabricacionId !== 'YOUR_FABRICACION_CHANNEL_ID' && 
                  adminId !== 'YOUR_ADMIN_CHANNEL_ID');
    }

    /**
     * Generar embed de ayuda para configuración de canales
     */
    static generarEmbedConfiguracion(): EmbedBuilder {
        const channelInfo = this.getChannelInfo();
        
        const embed = new EmbedBuilder()
            .setColor(channelInfo.configured ? '#57F287' : '#FEE75C')
            .setTitle('🏗️ Configuración de Canales')
            .setDescription(channelInfo.configured ? 
                'Los canales están configurados correctamente.' : 
                'Los canales necesitan configuración.')
            .addFields(
                {
                    name: '🏭 Canal de Fabricación',
                    value: channelInfo.fabricacion && channelInfo.fabricacion !== 'YOUR_FABRICACION_CHANNEL_ID' 
                        ? `<#${channelInfo.fabricacion}>` 
                        : '❌ No configurado',
                    inline: true
                },
                {
                    name: '⚙️ Canal de Administración',
                    value: channelInfo.admin && channelInfo.admin !== 'YOUR_ADMIN_CHANNEL_ID' 
                        ? `<#${channelInfo.admin}>` 
                        : '❌ No configurado',
                    inline: true
                },
                {
                    name: '🔔 Canal de Notificaciones',
                    value: channelInfo.notification && channelInfo.notification !== 'YOUR_NOTIFICATION_CHANNEL_ID' 
                        ? `<#${channelInfo.notification}>` 
                        : '❌ No configurado',
                    inline: true
                }
            )
            .setTimestamp();

        if (!channelInfo.configured) {
            embed.addFields({
                name: '📝 Para Configurar',
                value: 'Edita el archivo `.env` con los IDs correctos de los canales.',
                inline: false
            });
        }

        return embed;
    }
}
