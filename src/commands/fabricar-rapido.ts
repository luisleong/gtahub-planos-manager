import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { crearCardFabricacion, COLORS } from '../utils/embeds';

export default {
    data: new SlashCommandBuilder()
        .setName('fabricar-rapido')
        .setDescription('⚡ Fabricación instantánea con botones de un clic')
        .addUserOption(option =>
            option.setName('propietario')
                .setDescription('Usuario propietario (opcional, por defecto tú)')
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const propietario = interaction.options.getUser('propietario') || interaction.user;

            // Obtener localizaciones y planos
            const localizaciones = await interaction.client.db.obtenerLocalizaciones();
            const planos = await interaction.client.db.obtenerPlanos();

            if (localizaciones.length === 0) {
                await interaction.editReply({
                    content: '❌ No hay localizaciones disponibles. Agrega algunas primero.'
                });
                return;
            }

            if (planos.length === 0) {
                await interaction.editReply({
                    content: '❌ No hay planos disponibles. Agrega algunos primero.'
                });
                return;
            }

            // Crear combinaciones rápidas (primeras 20 combinaciones)
            const combinacionesRapidas = [];
            for (let i = 0; i < Math.min(4, localizaciones.length); i++) {
                for (let j = 0; j < Math.min(5, planos.length); j++) {
                    if (combinacionesRapidas.length >= 20) break;
                    
                    const loc = localizaciones[i];
                    const plano = planos[j];
                    
                    combinacionesRapidas.push({
                        localizacion: loc,
                        plano: plano,
                        buttonId: `fabricar_rapido_${loc.id}_${plano.id}`
                    });
                }
                if (combinacionesRapidas.length >= 20) break;
            }

            // Crear embed principal
            const embed = new EmbedBuilder()
                .setTitle('⚡ Fabricación Ultra Rápida')
                .setColor(COLORS.GTAHUB)
                .setDescription('**Un solo clic y listo!** Selecciona una combinación para fabricar instantáneamente.')
                .addFields(
                    { name: '👤 Propietario', value: propietario.toString(), inline: true },
                    { name: '📍 Localizaciones', value: localizaciones.length.toString(), inline: true },
                    { name: '📋 Planos', value: planos.length.toString(), inline: true }
                )
                .setFooter({ text: 'Haz clic en cualquier botón para iniciar la fabricación inmediatamente' })
                .setTimestamp();

            // Crear botones (máximo 25, distribuidos en filas de 5)
            const rows = [];
            let currentRow = new ActionRowBuilder<ButtonBuilder>();
            let buttonsInRow = 0;

            for (let i = 0; i < Math.min(20, combinacionesRapidas.length); i++) {
                const combo = combinacionesRapidas[i];
                
                // Crear etiqueta corta para el botón
                const duracionHoras = Math.floor(combo.plano.duracion_minutos / 60);
                const duracionMinutos = combo.plano.duracion_minutos % 60;
                let duracionTexto = '';
                
                if (duracionHoras > 0) {
                    duracionTexto = `${duracionHoras}h${duracionMinutos}m`;
                } else {
                    duracionTexto = `${duracionMinutos}m`;
                }

                // Nombres cortos para el botón
                const locNombre = combo.localizacion.nombre.length > 8 ? 
                    combo.localizacion.nombre.substring(0, 8) + '...' : 
                    combo.localizacion.nombre;
                
                const planoNombre = combo.plano.nombre.length > 10 ? 
                    combo.plano.nombre.substring(0, 10) + '...' : 
                    combo.plano.nombre;

                const button = new ButtonBuilder()
                    .setCustomId(combo.buttonId)
                    .setLabel(`${planoNombre} (${duracionTexto})`)
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🚀');

                currentRow.addComponents(button);
                buttonsInRow++;

                // Si la fila está llena (5 botones) o es el último botón
                if (buttonsInRow === 5 || i === combinacionesRapidas.length - 1) {
                    rows.push(currentRow);
                    currentRow = new ActionRowBuilder<ButtonBuilder>();
                    buttonsInRow = 0;
                }

                // Máximo 5 filas (25 botones)
                if (rows.length >= 5) break;
            }

            // Crear descripción de las combinaciones disponibles
            let descripcionCombos = '**Combinaciones disponibles:**\n';
            for (let i = 0; i < Math.min(10, combinacionesRapidas.length); i++) {
                const combo = combinacionesRapidas[i];
                const duracion = combo.plano.duracion_minutos;
                const duracionTexto = duracion >= 60 ? 
                    `${Math.floor(duracion / 60)}h ${duracion % 60}m` : 
                    `${duracion}m`;
                
                descripcionCombos += `🚀 **${combo.plano.nombre}** en *${combo.localizacion.nombre}* (${duracionTexto})\n`;
            }

            if (combinacionesRapidas.length > 10) {
                descripcionCombos += `\n*... y ${combinacionesRapidas.length - 10} combinaciones más disponibles en los botones*`;
            }

            embed.setDescription(descripcionCombos);

            await interaction.editReply({
                embeds: [embed],
                components: rows
            });

        } catch (error) {
            console.error('❌ Error en comando fabricar-rapido:', error);
            
            await interaction.editReply({
                content: '❌ Hubo un error preparando la fabricación rápida.'
            });
        }
    },
};
