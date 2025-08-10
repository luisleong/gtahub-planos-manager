import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { COLORS } from '../utils/embeds';
import { FabricacionCompleta } from '../database/DatabaseManager';
import { ChannelPermissions } from '../utils/channelPermissions';

export default {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Información sobre el bot y comandos disponibles'),

    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setTitle('🏗️ GTAHUB Planos Manager')
            .setDescription('Bot para gestionar fabricación de planos de negocios en GTAHUB RP')
            .setColor(COLORS.GTAHUB)
            .setThumbnail('https://i.imgur.com/4M34hi2.png') // Logo placeholder
            .setTimestamp()
            .setFooter({ 
                text: 'GTAHUB Planos Manager v2.0',
                iconURL: 'https://i.imgur.com/4M34hi2.png'
            });

        // Comandos disponibles
        embed.addFields(
            {
                name: '📋 Comandos Principales',
                value: `
                \`/iniciar-fabricacion\` - Iniciar fabricación de un plano
                \`/listar-fabricaciones\` - Ver todas las fabricaciones
                \`/recoger-fabricacion\` - Marcar fabricación como recogida
                \`/info\` - Ver esta información
                `,
                inline: false
            },
            {
                name: '📊 Estados de Fabricaciones',
                value: `
                ⏳ **En Proceso** - Fabricación en curso
                ✅ **Listo** - Listo para recoger (notificado)
                📦 **Recogido** - Ya recogido de la localización
                `,
                inline: true
            },
            {
                name: '🏗️ Sistema de Fabricación',
                value: `
                • Selecciona **localización** y **tipo de plano**
                • El sistema trackea el tiempo automáticamente
                • Te notifica cuando esté listo para recoger
                • Cards visuales con toda la información
                `,
                inline: true
            },
            {
                name: '🔔 Notificaciones Automáticas',
                value: `
                • Revisión cada 5 minutos
                • Notificación cuando esté listo
                • Cards bonitas con fotos de localizaciones
                • Menciona al propietario automáticamente
                `,
                inline: false
            },
            {
                name: '💡 Características Avanzadas',
                value: `
                • Base de datos normalizada (3 tablas)
                • Autocompletado inteligente en comandos
                • Filtros por usuario y estado
                • Menús interactivos para navegación
                • Sistema de permisos robusto
                `,
                inline: false
            }
        );

        // Estadísticas del bot
        try {
            const todasFabricaciones = await interaction.client.db.obtenerFabricaciones();
            const enProceso = todasFabricaciones.filter((f: FabricacionCompleta) => !f.recogido && !f.listo_para_recoger).length;
            const listos = todasFabricaciones.filter((f: FabricacionCompleta) => f.listo_para_recoger && !f.recogido).length;
            const recogidos = todasFabricaciones.filter((f: FabricacionCompleta) => f.recogido).length;

            embed.addFields({
                name: '📈 Estadísticas Actuales',
                value: `
                **Total de fabricaciones:** ${todasFabricaciones.length}
                **En proceso:** ${enProceso}
                **Listos para recoger:** ${listos}
                **Recogidos:** ${recogidos}
                **Bot activo desde:** <t:${Math.floor(Date.now() / 1000)}:R>
                `,
                inline: false
            });

            // Información adicional sobre localizaciones y planos
            const localizaciones = await interaction.client.db.obtenerLocalizaciones();
            const planos = await interaction.client.db.obtenerPlanos();

            embed.addFields({
                name: '🏢 Recursos Disponibles',
                value: `
                **Localizaciones activas:** ${localizaciones.length}
                **Tipos de planos:** ${planos.length}
                **Base de datos:** SQLite (persistente)
                `,
                inline: true
            });

            // Información de configuración de canales
            const channelInfo = ChannelPermissions.getChannelInfo();
            const canalFabricacion = channelInfo.fabricacion && channelInfo.fabricacion !== 'YOUR_FABRICACION_CHANNEL_ID' 
                ? `<#${channelInfo.fabricacion}>` : '❌ No configurado';
            const canalAdmin = channelInfo.admin && channelInfo.admin !== 'YOUR_ADMIN_CHANNEL_ID' 
                ? `<#${channelInfo.admin}>` : '❌ No configurado';
            
            embed.addFields({
                name: '🏗️ Configuración de Canales',
                value: `
                **Canal de Fabricación:** ${canalFabricacion}
                **Canal de Administración:** ${canalAdmin}
                **Estado:** ${channelInfo.configured ? '✅ Configurado' : '⚠️ Necesita configuración'}
                `,
                inline: true
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            embed.addFields({
                name: '⚠️ Estadísticas',
                value: 'Error cargando estadísticas del sistema',
                inline: false
            });
        }

        await interaction.reply({ 
            embeds: [embed],
            ephemeral: false 
        });
    },
};
/*
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { COLORS } from '../utils/embeds';
import { FabricacionCompleta } from '../database/DatabaseManager';
import { ChannelPermissions } from '../utils/channelPermissions';

export default {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Información sobre el bot y comandos disponibles'),

    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setTitle('🏗️ GTAHUB Planos Manager')
            .setDescription('Bot para gestionar fabricación de planos de negocios en GTAHUB RP')
            .setColor(COLORS.GTAHUB)
            .setThumbnail('https://i.imgur.com/4M34hi2.png') // Logo placeholder
            .setTimestamp()
            .setFooter({ 
                text: 'GTAHUB Planos Manager v2.0',
                iconURL: 'https://i.imgur.com/4M34hi2.png'
            });

        // Comandos disponibles
        embed.addFields(
            {
                name: '📋 Comandos Principales',
                value: `
                \`/iniciar-fabricacion\` - Iniciar fabricación de un plano
                \`/listar-fabricaciones\` - Ver todas las fabricaciones
                \`/recoger-fabricacion\` - Marcar fabricación como recogida
                \`/info\` - Ver esta información
                `,
                inline: false
            },
            {
                name: '📊 Estados de Fabricaciones',
                value: `
                ⏳ **En Proceso** - Fabricación en curso
                ✅ **Listo** - Listo para recoger (notificado)
                📦 **Recogido** - Ya recogido de la localización
                `,
                inline: true
            },
            {
                name: '🏗️ Sistema de Fabricación',
                value: `
                • Selecciona **localización** y **tipo de plano**
                • El sistema trackea el tiempo automáticamente
                • Te notifica cuando esté listo para recoger
                • Cards visuales con toda la información
                `,
                inline: true
            },
            {
                name: '🔔 Notificaciones Automáticas',
                value: `
                • Revisión cada 5 minutos
                • Notificación cuando esté listo
                • Cards bonitas con fotos de localizaciones
                • Menciona al propietario automáticamente
                `,
                inline: false
            },
            {
                name: '💡 Características Avanzadas',
                value: `
                • Base de datos normalizada (3 tablas)
                • Autocompletado inteligente en comandos
                • Filtros por usuario y estado
                • Menús interactivos para navegación
                • Sistema de permisos robusto
                `,
                inline: false
            }
        );

        // Estadísticas del bot
        try {
            const todasFabricaciones = await interaction.client.db.obtenerFabricaciones();
            const enProceso = todasFabricaciones.filter((f: FabricacionCompleta) => !f.recogido && !f.listo_para_recoger).length;
            const listos = todasFabricaciones.filter((f: FabricacionCompleta) => f.listo_para_recoger && !f.recogido).length;
            const recogidos = todasFabricaciones.filter((f: FabricacionCompleta) => f.recogido).length;

            embed.addFields({
                name: '📈 Estadísticas Actuales',
                value: `
                **Total de fabricaciones:** ${todasFabricaciones.length}
                **En proceso:** ${enProceso}
                **Listos para recoger:** ${listos}
                **Recogidos:** ${recogidos}
                **Bot activo desde:** <t:${Math.floor(Date.now() / 1000)}:R>
                `,
                inline: false
            });

            // Información adicional sobre localizaciones y planos
            const localizaciones = await interaction.client.db.obtenerLocalizaciones();
            const planos = await interaction.client.db.obtenerPlanos();

            embed.addFields({
                name: '🏢 Recursos Disponibles',
                value: `
                **Localizaciones activas:** ${localizaciones.length}
                **Tipos de planos:** ${planos.length}
                **Base de datos:** SQLite (persistente)
                `,
                inline: true
            });

            // Información de configuración de canales
            const channelInfo = ChannelPermissions.getChannelInfo();
            const canalFabricacion = channelInfo.fabricacion && channelInfo.fabricacion !== 'YOUR_FABRICACION_CHANNEL_ID' 
                ? `<#${channelInfo.fabricacion}>` : '❌ No configurado';
            const canalAdmin = channelInfo.admin && channelInfo.admin !== 'YOUR_ADMIN_CHANNEL_ID' 
                ? `<#${channelInfo.admin}>` : '❌ No configurado';
            
            embed.addFields({
                name: '🏗️ Configuración de Canales',
                value: `
                **Canal de Fabricación:** ${canalFabricacion}
                **Canal de Administración:** ${canalAdmin}
                **Estado:** ${channelInfo.configured ? '✅ Configurado' : '⚠️ Necesita configuración'}
                `,
                inline: true
            });

        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            embed.addFields({
                name: '⚠️ Estadísticas',
                value: 'Error cargando estadísticas del sistema',
                inline: false
            });
        }

        await interaction.reply({ 
            embeds: [embed],
            ephemeral: false 
        });
    },
};
*/
