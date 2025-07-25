import { EmbedBuilder, ColorResolvable } from 'discord.js';
import { FabricacionCompleta } from '../database/DatabaseManager';

// Colores del tema GTAHUB
export const COLORS = {
    PRIMARY: 0x2F3136 as ColorResolvable,
    SUCCESS: 0x57F287 as ColorResolvable,
    WARNING: 0xFEE75C as ColorResolvable,
    ERROR: 0xED4245 as ColorResolvable,
    GTAHUB: 0xFF6B35 as ColorResolvable,
    INFO: 0x5865F2 as ColorResolvable
};

// Emojis para estados
export const ESTADO_EMOJIS = {
    'en_proceso': '⏳',
    'listo': '✅',
    'recogido': '📦'
};

/**
 * Crear una card (embed) para mostrar información de una fabricación
 */
export function crearCardFabricacion(fabricacion: FabricacionCompleta): EmbedBuilder {
    const tiempoInfo = calcularTiempoFabricacion(fabricacion);
    const estadoColor = obtenerColorPorEstado(getEstadoFabricacion(fabricacion));
    const estadoEmoji = ESTADO_EMOJIS[getEstadoFabricacion(fabricacion) as keyof typeof ESTADO_EMOJIS];
    const estado = getEstadoFabricacion(fabricacion);

    const embed = new EmbedBuilder()
        .setTitle(`${estadoEmoji} ${fabricacion.plano_nombre}`)
        .setColor(estadoColor)
        .setTimestamp(new Date(fabricacion.created_at))
        .setFooter({ 
            text: `ID: ${fabricacion.id} | GTAHUB Planos Manager`,
            iconURL: 'https://cdn.discordapp.com/attachments/1234567890/gtahub-logo.png' // Logo GTAHUB
        });

    // Información básica con más detalles
    const inicioFormat = formatearFecha(fabricacion.timestamp_colocacion);
    const duracionHoras = Math.floor(fabricacion.plano_duracion / 60);
    const duracionMinutos = fabricacion.plano_duracion % 60;
    let duracionTexto = '';
    if (duracionHoras > 0) {
        duracionTexto = `${duracionHoras}h ${duracionMinutos}m`;
    } else {
        duracionTexto = `${duracionMinutos}m`;
    }

    embed.addFields(
        {
            name: '📍 Localización',
            value: `\`${fabricacion.localizacion_nombre}\``,
            inline: true
        },
        {
            name: '👤 Propietario',
            value: `<@${fabricacion.propietario_id}>`,
            inline: true
        },
        {
            name: `${estadoEmoji} Estado`,
            value: `**${formatearEstado(estado)}**`,
            inline: true
        },
        {
            name: '🕐 Iniciado',
            value: inicioFormat,
            inline: true
        },
        {
            name: '⏱️ Duración',
            value: duracionTexto,
            inline: true
        },
        {
            name: '⏰ Tiempo Restante',
            value: tiempoInfo.texto,
            inline: true
        }
    );

    // Fechas importantes
    if (fabricacion.timestamp_recogida) {
        embed.addFields({
            name: '📦 Recogido',
            value: formatearFecha(fabricacion.timestamp_recogida),
            inline: true
        });
    }

    // Notas si existen
    if (fabricacion.notas) {
        embed.addFields({
            name: '📝 Notas',
            value: fabricacion.notas,
            inline: false
        });
    }

    // Imagen del plano como thumbnail
    if (fabricacion.plano_icono) {
        embed.setThumbnail(fabricacion.plano_icono);
    }

    // Imagen de la localización
    if (fabricacion.localizacion_foto) {
        embed.setImage(fabricacion.localizacion_foto);
    }

    // Barra de progreso para fabricaciones en proceso
    const estadoActual = getEstadoFabricacion(fabricacion);
    if (estadoActual === 'en_proceso') {
        const progreso = calcularProgreso(fabricacion);
        const barraProgreso = crearBarraProgreso(progreso);
        
        embed.setDescription(`**Progreso:** ${progreso.toFixed(1)}%\n${barraProgreso}\n\n📊 **Estado Detallado:**\n${tiempoInfo.texto}`);
    }

    return embed;
}

/**
 * Crear una card de resumen con múltiples fabricaciones
 */
export function crearCardResumen(fabricaciones: FabricacionCompleta[], titulo: string = 'Resumen de Fabricaciones'): EmbedBuilder {
    const enProceso = fabricaciones.filter(f => getEstadoFabricacion(f) === 'en_proceso').length;
    const listos = fabricaciones.filter(f => getEstadoFabricacion(f) === 'listo').length;
    const recogidos = fabricaciones.filter(f => getEstadoFabricacion(f) === 'recogido').length;

    const embed = new EmbedBuilder()
        .setTitle(`📊 ${titulo}`)
        .setColor(COLORS.GTAHUB)
        .setTimestamp()
        .setFooter({ 
            text: 'GTAHUB Planos Manager',
            iconURL: 'https://i.imgur.com/4M34hi2.png'
        });

    embed.addFields(
        {
            name: '⏳ En Proceso',
            value: enProceso.toString(),
            inline: true
        },
        {
            name: '✅ Listos',
            value: listos.toString(),
            inline: true
        },
        {
            name: '📦 Recogidos',
            value: recogidos.toString(),
            inline: true
        },
        {
            name: '📈 Total',
            value: fabricaciones.length.toString(),
            inline: true
        }
    );

    return embed;
}

/**
 * Crear card de notificación para fabricaciones listas
 */
export function crearCardNotificacion(fabricacion: FabricacionCompleta): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle(`🔔 ¡Plano Listo para Recoger!`)
        .setColor(COLORS.SUCCESS)
        .setTimestamp()
        .setFooter({ 
            text: 'GTAHUB Planos Manager',
            iconURL: 'https://i.imgur.com/4M34hi2.png'
        });

    embed.addFields(
        {
            name: '🏗️ Plano',
            value: fabricacion.plano_nombre,
            inline: false
        },
        {
            name: '📍 Localización',
            value: fabricacion.localizacion_nombre,
            inline: true
        },
        {
            name: '👤 Propietario',
            value: `<@${fabricacion.propietario_id}>`,
            inline: true
        },
        {
            name: '⏱️ Duración',
            value: `${fabricacion.plano_duracion} minutos`,
            inline: true
        }
    );

    if (fabricacion.plano_icono) {
        embed.setThumbnail(fabricacion.plano_icono);
    }

    if (fabricacion.localizacion_foto) {
        embed.setImage(fabricacion.localizacion_foto);
    }

    return embed;
}

/**
 * Obtener estado de una fabricación
 */
function getEstadoFabricacion(fabricacion: FabricacionCompleta): 'en_proceso' | 'listo' | 'recogido' {
    if (fabricacion.recogido) {
        return 'recogido';
    } else if (fabricacion.listo_para_recoger) {
        return 'listo';
    } else {
        return 'en_proceso';
    }
}

/**
 * Calcular información de tiempo para una fabricación
 */
function calcularTiempoFabricacion(fabricacion: FabricacionCompleta): { texto: string; completado: boolean } {
    const fechaInicio = new Date(fabricacion.timestamp_colocacion);
    const fechaCompletado = new Date(fechaInicio.getTime() + (fabricacion.plano_duracion * 60000));
    const ahora = new Date();
    
    if (fabricacion.recogido) {
        return {
            texto: `✅ **Completado**\n📦 Recogido ${formatearFecha(fabricacion.timestamp_recogida!)}`,
            completado: true
        };
    }

    if (fabricacion.listo_para_recoger) {
        const tiempoListo = Math.floor((ahora.getTime() - fechaCompletado.getTime()) / 60000);
        let textoTiempo = '';
        if (tiempoListo > 60) {
            const horas = Math.floor(tiempoListo / 60);
            textoTiempo = ` (listo hace ${horas}h)`;
        } else if (tiempoListo > 0) {
            textoTiempo = ` (listo hace ${tiempoListo}m)`;
        }
        
        return {
            texto: `🎉 **¡LISTO PARA RECOGER!**${textoTiempo}`,
            completado: true
        };
    }
    
    const minutosRestantes = Math.ceil((fechaCompletado.getTime() - ahora.getTime()) / 60000);
    
    if (minutosRestantes <= 0) {
        return {
            texto: '🚨 **¡DEBERÍA ESTAR LISTO!**\n🔔 Verificar estado',
            completado: true
        };
    }
    
    const horas = Math.floor(minutosRestantes / 60);
    const mins = minutosRestantes % 60;
    
    let texto = '';
    if (horas > 0) {
        texto = `⏳ **${horas}h ${mins}m**\n🕐 Listo: <t:${Math.floor(fechaCompletado.getTime() / 1000)}:t>`;
    } else {
        texto = `⏳ **${mins}m**\n🕐 Listo: <t:${Math.floor(fechaCompletado.getTime() / 1000)}:t>`;
    }
    
    return {
        texto,
        completado: false
    };
}

/**
 * Calcular progreso de una fabricación (0-100)
 */
function calcularProgreso(fabricacion: FabricacionCompleta): number {
    const fechaInicio = new Date(fabricacion.timestamp_colocacion);
    const fechaCompletado = new Date(fechaInicio.getTime() + (fabricacion.plano_duracion * 60000));
    const ahora = new Date();
    
    const tiempoTotal = fechaCompletado.getTime() - fechaInicio.getTime();
    const tiempoTranscurrido = ahora.getTime() - fechaInicio.getTime();
    
    const progreso = (tiempoTranscurrido / tiempoTotal) * 100;
    return Math.min(Math.max(progreso, 0), 100);
}

/**
 * Crear barra de progreso visual
 */
function crearBarraProgreso(progreso: number): string {
    const longitudBarra = 15;
    const progresoCompleto = Math.floor((progreso / 100) * longitudBarra);
    
    let barra = '';
    for (let i = 0; i < longitudBarra; i++) {
        if (i < progresoCompleto) {
            barra += '🟩'; // Verde para completado
        } else {
            barra += '⬜'; // Blanco para restante
        }
    }
    
    return barra;
}

/**
 * Obtener color según el estado de la fabricación
 */
function obtenerColorPorEstado(estado: string): ColorResolvable {
    switch (estado) {
        case 'en_proceso':
            return COLORS.WARNING;
        case 'listo':
            return COLORS.SUCCESS;
        case 'recogido':
            return COLORS.INFO;
        default:
            return COLORS.PRIMARY;
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
            return 'Listo para Recoger';
        case 'recogido':
            return 'Recogido';
        default:
            return estado;
    }
}

/**
 * Formatear fecha para mostrar
 */
function formatearFecha(fechaISO: string): string {
    const fecha = new Date(fechaISO);
    return `<t:${Math.floor(fecha.getTime() / 1000)}:R>`;
}
