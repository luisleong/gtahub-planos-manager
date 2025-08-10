import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { crearCardFabricacion, crearCardResumen, COLORS } from '../utils/embeds';
import { FabricacionCompleta } from '../database/DatabaseManager';

/*
export default {
    data: new SlashCommandBuilder()
        .setName('listar-fabricaciones')
        .setDescription('Ver todas las fabricaciones con cards detalladas')
        .addStringOption(option =>
            option.setName('estado')
                .setDescription('Filtrar por estado de la fabricación')
                .setRequired(false)
                .addChoices(
                    { name: '⏳ En Proceso', value: 'en_proceso' },
                    { name: '✅ Listos para Recoger', value: 'listo' },
                    { name: '📦 Recogidos', value: 'recogido' }
                )
        )
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Ver fabricaciones de un usuario específico')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('solo-resumen')
                .setDescription('Mostrar solo el resumen estadístico')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('vista')
                .setDescription('Estilo de visualización')
                .setRequired(false)
                .addChoices(
                    { name: '🎴 Cards Completas', value: 'cards' },
                    { name: '📋 Lista Compacta', value: 'lista' },
                    { name: '📊 Solo Estadísticas', value: 'stats' }
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const estadoFiltro = interaction.options.getString('estado');
            const usuarioFiltro = interaction.options.getUser('usuario');
            const soloResumen = interaction.options.getBoolean('solo-resumen') || false;
            const tipoVista = interaction.options.getString('vista') || 'cards';

            let fabricaciones: FabricacionCompleta[] = [];
            let titulo = 'Todas las Fabricaciones';

            // Obtener fabricaciones según filtros
            if (usuarioFiltro) {
                fabricaciones = await interaction.client.db.obtenerFabricacionesPorUsuario(usuarioFiltro.id);
                titulo = `Fabricaciones de ${usuarioFiltro.displayName || usuarioFiltro.username}`;
            } else if (estadoFiltro) {
                fabricaciones = await interaction.client.db.obtenerFabricacionesPorEstado(estadoFiltro as any);
                titulo = `Fabricaciones ${formatearEstado(estadoFiltro)}`;
// ...existing code...
                    break;

                case 'cards':
                default:
                    if (soloResumen) {
                        const embedResumen = crearCardResumen(fabricaciones, titulo);
                        await interaction.editReply({ embeds: [embedResumen] });
                        return;
                    }

                    // Si hay pocas fabricaciones (3 o menos), mostrar todas las cards
                    if (fabricaciones.length <= 3) {
                        const embeds = fabricaciones.map(fabricacion => crearCardFabricacion(fabricacion));
                        const resumen = crearCardResumen(fabricaciones, titulo);
                        
                        await interaction.editReply({ 
                            embeds: [resumen, ...embeds]
                        });
                        return;
                    }

                    // Si hay muchas fabricaciones, usar menú interactivo
                    await mostrarConMenu(interaction, fabricaciones, titulo);
                    break;
            }

        } catch (error) {
            console.error('❌ Error en comando listar-fabricaciones:', error);
            
            await interaction.editReply({
                content: '❌ Hubo un error al obtener las fabricaciones. Por favor, inténtalo de nuevo.'
            });
        }
    },
};

/**
 * Mostrar vista compacta con lista resumida
 */
// ...existing code...
// ...existing code...
export default {
    data: new SlashCommandBuilder()
        .setName('listar-fabricaciones')
        .setDescription('Ver todas las fabricaciones con cards detalladas')
        .addStringOption(option =>
            option.setName('estado')
                .setDescription('Filtrar por estado de la fabricación')
                .setRequired(false)
                .addChoices(
                    { name: '⏳ En Proceso', value: 'en_proceso' },
                    { name: '✅ Listos para Recoger', value: 'listo' },
                    { name: '📦 Recogidos', value: 'recogido' }
                )
        )
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Ver fabricaciones de un usuario específico')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('solo-resumen')
                .setDescription('Mostrar solo el resumen estadístico')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('vista')
                .setDescription('Estilo de visualización')
                .setRequired(false)
                .addChoices(
                    { name: '🎴 Cards Completas', value: 'cards' },
                    { name: '📋 Lista Compacta', value: 'lista' },
                    { name: '📊 Solo Estadísticas', value: 'stats' }
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const estadoFiltro = interaction.options.getString('estado');
            const usuarioFiltro = interaction.options.getUser('usuario');
            const soloResumen = interaction.options.getBoolean('solo-resumen') || false;
            const tipoVista = interaction.options.getString('vista') || 'cards';

            let fabricaciones: FabricacionCompleta[] = [];
            let titulo = 'Todas las Fabricaciones';

            // Obtener fabricaciones según filtros
            if (usuarioFiltro) {
                fabricaciones = await interaction.client.db.obtenerFabricacionesPorUsuario(usuarioFiltro.id);
                titulo = `Fabricaciones de ${usuarioFiltro.displayName || usuarioFiltro.username}`;
            } else if (estadoFiltro) {
                fabricaciones = await interaction.client.db.obtenerFabricacionesPorEstado(estadoFiltro as any);
                titulo = `Fabricaciones ${formatearEstado(estadoFiltro)}`;
            } else {
                fabricaciones = await interaction.client.db.obtenerFabricaciones();
            }

            // Si no hay fabricaciones
            if (fabricaciones.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('📭 No hay fabricaciones')
                    .setDescription('No se encontraron fabricaciones con los filtros especificados.')
                    .setColor(COLORS.INFO)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            // Manejar diferentes tipos de vista
            switch (tipoVista) {
                case 'stats':
                    const embedResumen = crearCardResumen(fabricaciones, titulo);
                    await interaction.editReply({ embeds: [embedResumen] });
                    break;

                case 'lista':
                    await mostrarVistaCompacta(interaction, fabricaciones, titulo);
                    break;

                case 'cards':
                default:
                    if (soloResumen) {
                        const embedResumen = crearCardResumen(fabricaciones, titulo);
                        await interaction.editReply({ embeds: [embedResumen] });
                        return;
                    }

                    // Si hay pocas fabricaciones (3 o menos), mostrar todas las cards
                    if (fabricaciones.length <= 3) {
                        const embeds = fabricaciones.map(fabricacion => crearCardFabricacion(fabricacion));
                        const resumen = crearCardResumen(fabricaciones, titulo);
                        
                        await interaction.editReply({ 
                            embeds: [resumen, ...embeds]
                        });
                        return;
                    }

                    // Si hay muchas fabricaciones, usar menú interactivo
                    await mostrarConMenu(interaction, fabricaciones, titulo);
                    break;
            }

        } catch (error) {
            console.error('❌ Error en comando listar-fabricaciones:', error);
            
            await interaction.editReply({
                content: '❌ Hubo un error al obtener las fabricaciones. Por favor, inténtalo de nuevo.'
            });
        }
    },
};

/**
 * Mostrar vista compacta con lista resumida
 */
async function mostrarVistaCompacta(interaction: ChatInputCommandInteraction, fabricaciones: FabricacionCompleta[], titulo: string) {
    const embedResumen = crearCardResumen(fabricaciones, titulo);
    
    let listaTexto = '';
    fabricaciones.slice(0, 15).forEach((fabricacion, index) => {
        const estado = fabricacion.recogido ? '📦' : fabricacion.listo_para_recoger ? '✅' : '⏳';
        const tiempo = fabricacion.recogido ? 'Recogido' : 
                      fabricacion.listo_para_recoger ? '¡Listo!' : 
                      calcularTiempoRestante(fabricacion);
        
        listaTexto += `${estado} **${fabricacion.plano_nombre}** - ${fabricacion.localizacion_nombre}\n`;
        listaTexto += `   👤 ${fabricacion.propietario} | ⏰ ${tiempo}\n\n`;
    });

    if (fabricaciones.length > 15) {
        listaTexto += `*... y ${fabricaciones.length - 15} más. Usa vista 'cards' para ver todas.*`;
    }

    const embedLista = new EmbedBuilder()
        .setTitle('📋 Lista Compacta')
        .setDescription(listaTexto || 'No hay fabricaciones que mostrar.')
        .setColor(COLORS.GTAHUB)
        .setTimestamp();

    await interaction.editReply({ embeds: [embedResumen, embedLista] });
}

/**
 * Calcular tiempo restante para vista compacta
 */
function calcularTiempoRestante(fabricacion: FabricacionCompleta): string {
    const fechaInicio = new Date(fabricacion.timestamp_colocacion);
    const fechaCompletado = new Date(fechaInicio.getTime() + (fabricacion.plano_duracion * 60000));
    const ahora = new Date();
    
    const minutosRestantes = Math.ceil((fechaCompletado.getTime() - ahora.getTime()) / 60000);
    
    if (minutosRestantes <= 0) {
        return '¡Debería estar listo!';
    }
    
    const horas = Math.floor(minutosRestantes / 60);
    const mins = minutosRestantes % 60;
    
    if (horas > 0) {
        return `${horas}h ${mins}m`;
    } else {
        return `${mins}m`;
    }
}

/**
 * Mostrar fabricaciones con menú de selección interactivo
 */
async function mostrarConMenu(interaction: ChatInputCommandInteraction, fabricaciones: FabricacionCompleta[], titulo: string) {
    const embedResumen = crearCardResumen(fabricaciones, titulo);
    
    // Crear opciones para el menú (máximo 25)
    const opciones = fabricaciones.slice(0, 25).map(fabricacion => ({
        label: `${fabricacion.plano_nombre} (${getEstadoTexto(fabricacion)})`,
        description: `${fabricacion.localizacion_nombre} - ${fabricacion.propietario}`,
        value: fabricacion.id.toString(),
        emoji: getEmojiPorEstado(fabricacion)
    }));

    const menu = new StringSelectMenuBuilder()
        .setCustomId('seleccionar_fabricacion')
        .setPlaceholder('Selecciona una fabricación para ver los detalles...')
        .addOptions(opciones);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(menu);

    const response = await interaction.editReply({
        embeds: [embedResumen],
        components: [row]
    });

    // Collector para el menú
    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 300000 // 5 minutos
    });

    collector.on('collect', async (selectInteraction) => {
        // Verificar que sea el usuario original
        if (selectInteraction.user.id !== interaction.user.id) {
            await selectInteraction.reply({
                content: '❌ Solo quien ejecutó el comando puede usar este menú.',
                ephemeral: true
            });
            return;
        }

        const fabricacionId = parseInt(selectInteraction.values[0]);
        const fabricacion = fabricaciones.find((f: FabricacionCompleta) => f.id === fabricacionId);

        if (!fabricacion) {
            await selectInteraction.reply({
                content: '❌ Fabricación no encontrada.',
                ephemeral: true
            });
            return;
        }

        const embedFabricacion = crearCardFabricacion(fabricacion);
        
        await selectInteraction.reply({
            embeds: [embedFabricacion],
            ephemeral: true
        });
    });

    collector.on('end', async () => {
        // Deshabilitar el menú cuando expire
        const menuDeshabilitado = new StringSelectMenuBuilder()
            .setCustomId('seleccionar_fabricacion_disabled')
            .setPlaceholder('Menú expirado - Ejecuta el comando de nuevo')
            .setDisabled(true)
            .addOptions([{ label: 'Expirado', value: 'expired' }]);

        const rowDeshabilitado = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(menuDeshabilitado);

        try {
            await interaction.editReply({ components: [rowDeshabilitado] });
        } catch (error) {
            // Ignorar errores si el mensaje ya fue eliminado
            console.log('No se pudo deshabilitar el menú - mensaje posiblemente eliminado');
        }
    });
}

/**
 * Obtener estado de una fabricación
 */
function getEstadoTexto(fabricacion: FabricacionCompleta): string {
    if (fabricacion.recogido) {
        return 'Recogido';
    } else if (fabricacion.listo_para_recoger) {
        return 'Listo';
    } else {
        return 'En Proceso';
    }
}

/**
 * Obtener emoji por estado de fabricación
 */
function getEmojiPorEstado(fabricacion: FabricacionCompleta): string {
    if (fabricacion.recogido) {
        return '📦';
    } else if (fabricacion.listo_para_recoger) {
        return '✅';
    } else {
        return '⏳';
    }
}

/**
 * Formatear estado para mostrar
 */
function formatearEstado(estado: string): string {
    switch (estado) {
        case 'en_proceso':
            return 'En Proceso';
        case 'listo':
            return 'Listos para Recoger';
        case 'recogido':
            return 'Recogidos';
        default:
            return estado;
    }
}
