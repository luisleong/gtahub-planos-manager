import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { crearCardFabricacion, crearCardResumen, COLORS } from '../utils/embeds';
import { FabricacionCompleta } from '../database/DatabaseManager';

export default {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('🎯 Panel principal con vista completa de todas las fabricaciones activas')
        .addBooleanOption(option =>
            option.setName('auto-actualizar')
                .setDescription('Actualizar automáticamente cada 5 minutos')
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const autoActualizar = interaction.options.getBoolean('auto-actualizar') || false;
            
            // Obtener todas las fabricaciones activas (no recogidas)
            const todasFabricaciones = await interaction.client.db.obtenerFabricaciones();
            const fabricacionesActivas = todasFabricaciones.filter((f: FabricacionCompleta) => !f.recogido);
            
            // Crear cards principales
            const embeds = await crearDashboardCompleto(fabricacionesActivas, todasFabricaciones);
            
            // Crear botones de navegación
            const botones = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('dashboard_refresh')
                        .setLabel('🔄 Actualizar')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('dashboard_en_proceso')
                        .setLabel('⏳ Solo En Proceso')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('dashboard_listos')
                        .setLabel('✅ Solo Listos')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('dashboard_stats')
                        .setLabel('📊 Estadísticas')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({ 
                embeds: embeds,
                components: [botones]
            });

            // Auto-actualización opcional
            if (autoActualizar) {
                setTimeout(async () => {
                    try {
                        const fabricacionesActualizadas = await interaction.client.db.obtenerFabricaciones();
                        const embedsActualizados = await crearDashboardCompleto(
                            fabricacionesActualizadas.filter((f: FabricacionCompleta) => !f.recogido), 
                            fabricacionesActualizadas
                        );
                        
                        await interaction.editReply({ embeds: embedsActualizados });
                    } catch (error) {
                        console.log('Error en auto-actualización del dashboard:', error);
                    }
                }, 5 * 60 * 1000); // 5 minutos
            }

        } catch (error) {
            console.error('❌ Error en comando dashboard:', error);
            
            await interaction.editReply({
                content: '❌ Hubo un error al generar el dashboard. Por favor, inténtalo de nuevo.'
            });
        }
    },
};

/**
 * Crear dashboard completo con múltiples embeds
 */
async function crearDashboardCompleto(fabricacionesActivas: FabricacionCompleta[], todasFabricaciones: FabricacionCompleta[]): Promise<EmbedBuilder[]> {
    const embeds: EmbedBuilder[] = [];
    
    // 1. Header principal con resumen
    const headerEmbed = new EmbedBuilder()
        .setTitle('🎯 GTAHUB Planos Manager - Dashboard')
        .setColor(COLORS.GTAHUB)
        .setDescription('**Panel de control principal de fabricaciones**')
        .setTimestamp()
        .setFooter({ 
            text: 'Actualizado automáticamente',
            iconURL: 'https://cdn.discordapp.com/attachments/1234567890/gtahub-logo.png'
        });

    // Estadísticas rápidas
    const enProceso = fabricacionesActivas.filter((f: FabricacionCompleta) => !f.listo_para_recoger).length;
    const listos = fabricacionesActivas.filter((f: FabricacionCompleta) => f.listo_para_recoger).length;
    const recogidos = todasFabricaciones.filter((f: FabricacionCompleta) => f.recogido).length;
    
    headerEmbed.addFields(
        { name: '⏳ En Proceso', value: `**${enProceso}**`, inline: true },
        { name: '✅ Listos', value: `**${listos}**`, inline: true },
        { name: '📦 Recogidos Hoy', value: `**${recogidos}**`, inline: true }
    );

    embeds.push(headerEmbed);

    // 2. Fabricaciones LISTAS (máximo 3)
    const fabricacionesListas = fabricacionesActivas.filter((f: FabricacionCompleta) => f.listo_para_recoger).slice(0, 3);
    if (fabricacionesListas.length > 0) {
        fabricacionesListas.forEach(fabricacion => {
            embeds.push(crearCardFabricacion(fabricacion));
        });
    }

    // 3. Fabricaciones EN PROCESO más próximas (máximo 3)
    const fabricacionesProceso = fabricacionesActivas
        .filter((f: FabricacionCompleta) => !f.listo_para_recoger)
        .sort((a, b) => {
            const tiempoRestanteA = new Date(a.timestamp_colocacion).getTime() + (a.plano_duracion * 60000);
            const tiempoRestanteB = new Date(b.timestamp_colocacion).getTime() + (b.plano_duracion * 60000);
            return tiempoRestanteA - tiempoRestanteB;
        })
        .slice(0, 3);

    fabricacionesProceso.forEach(fabricacion => {
        embeds.push(crearCardFabricacion(fabricacion));
    });

    // 4. Información adicional si hay más fabricaciones
    if (fabricacionesActivas.length > 6) {
        const infoEmbed = new EmbedBuilder()
            .setTitle('📋 Información Adicional')
            .setColor(COLORS.INFO)
            .setDescription(`**Total de fabricaciones activas:** ${fabricacionesActivas.length}\n\n` +
                          `Mostrando las ${Math.min(6, fabricacionesActivas.length)} más relevantes.\n` +
                          `Usa \`/listar-fabricaciones\` para ver todas.`)
            .addFields({
                name: '🔄 Actualizar',
                value: 'Ejecuta `/dashboard` nuevamente para actualizar la información.',
                inline: false
            });

        embeds.push(infoEmbed);
    }

    // Máximo 10 embeds por mensaje de Discord
    return embeds.slice(0, 10);
}
