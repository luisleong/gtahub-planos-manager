import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, AutocompleteInteraction } from 'discord.js';
import { crearCardFabricacion, COLORS } from '../utils/embeds';
import { FabricacionCompleta } from '../database/DatabaseManager';

export default {
    data: new SlashCommandBuilder()
        .setName('recoger-fabricacion')
        .setDescription('Marcar una fabricación como recogida')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('ID de la fabricación a marcar como recogida')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction: AutocompleteInteraction) {
        try {
            const focusedValue = interaction.options.getFocused();
            
            // Obtener fabricaciones listas para recoger
            const fabricacionesListas = await interaction.client.db.obtenerFabricacionesPorEstado('listo');
            
            // Filtrar por el valor escrito
            const filtered = fabricacionesListas.filter((fabricacion: FabricacionCompleta) => 
                fabricacion.id.toString().includes(focusedValue) ||
                fabricacion.plano_nombre.toLowerCase().includes(focusedValue.toLowerCase()) ||
                fabricacion.localizacion_nombre.toLowerCase().includes(focusedValue.toLowerCase())
            );
            
            // Crear opciones para autocompletar (máximo 25)
            const opciones = filtered.slice(0, 25).map((fabricacion: FabricacionCompleta) => ({
                name: `${fabricacion.id} - ${fabricacion.plano_nombre} en ${fabricacion.localizacion_nombre}`,
                value: fabricacion.id
            }));
            
            await interaction.respond(opciones);
        } catch (error) {
            console.error('❌ Error en autocompletar recoger-fabricacion:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const fabricacionId = interaction.options.getInteger('id', true);

            // Verificar que la fabricación existe
            const fabricacion = await interaction.client.db.obtenerFabricacionPorId(fabricacionId);
            
            if (!fabricacion) {
                await interaction.editReply({
                    content: '❌ No se encontró una fabricación con ese ID.'
                });
                return;
            }

            // Verificar que el usuario es el propietario o tiene permisos
            const esOwner = fabricacion.propietario_id === interaction.user.id;
            const tienePermisos = interaction.memberPermissions?.has('ManageMessages') || false;

            if (!esOwner && !tienePermisos) {
                await interaction.editReply({
                    content: '❌ Solo el propietario de la fabricación o un moderador puede marcarla como recogida.'
                });
                return;
            }

            // Verificar estado actual
            if (fabricacion.recogido) {
                await interaction.editReply({
                    content: '❌ Esta fabricación ya ha sido marcada como recogida.'
                });
                return;
            }

            // Si no está lista para recoger, marcarla primero como lista
            if (!fabricacion.listo_para_recoger) {
                await interaction.client.db.marcarComoListo(fabricacionId);
            }

            // Marcar como recogida
            const actualizado = await interaction.client.db.marcarComoRecogido(fabricacionId);

            if (!actualizado) {
                await interaction.editReply({
                    content: '❌ Error al actualizar la fabricación. Inténtalo de nuevo.'
                });
                return;
            }

            // Obtener fabricación actualizada
            const fabricacionActualizada = await interaction.client.db.obtenerFabricacionPorId(fabricacionId);
            
            if (!fabricacionActualizada) {
                await interaction.editReply({
                    content: '❌ Error al obtener la fabricación actualizada.'
                });
                return;
            }

            // Crear embed de confirmación
            const embed = crearCardFabricacion(fabricacionActualizada);
            
            // Embed adicional de confirmación
            const confirmacionEmbed = new EmbedBuilder()
                .setTitle('📦 Fabricación Recogida')
                .setDescription(`La fabricación **${fabricacion.plano_nombre}** ha sido marcada como recogida exitosamente.`)
                .setColor(COLORS.SUCCESS)
                .setTimestamp()
                .addFields(
                    {
                        name: '👤 Recogido por',
                        value: interaction.user.toString(),
                        inline: true
                    },
                    {
                        name: '📍 Localización',
                        value: fabricacion.localizacion_nombre,
                        inline: true
                    },
                    {
                        name: '🏗️ Plano',
                        value: fabricacion.plano_nombre,
                        inline: true
                    }
                );

            await interaction.editReply({
                embeds: [confirmacionEmbed, embed]
            });

            // Log para administración
            console.log(`📦 Fabricación recogida: ID ${fabricacionId}, Plano: ${fabricacion.plano_nombre}, Usuario: ${interaction.user.tag}`);

        } catch (error) {
            console.error('❌ Error en comando recoger-fabricacion:', error);
            
            await interaction.editReply({
                content: '❌ Hubo un error al marcar la fabricación como recogida. Por favor, inténtalo de nuevo.'
            });
        }
    },
};
