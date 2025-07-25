import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';
import { crearCardFabricacion } from '../utils/embeds';
import { Localizacion, Plano } from '../database/DatabaseManager';

export default {
    data: new SlashCommandBuilder()
        .setName('iniciar-fabricacion')
        .setDescription('Iniciar la fabricación de un plano en una localización')
        .addIntegerOption(option =>
            option.setName('localizacion')
                .setDescription('Localización donde fabricar el plano')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('plano')
                .setDescription('Tipo de plano a fabricar')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addUserOption(option =>
            option.setName('propietario')
                .setDescription('Usuario propietario de la fabricación (opcional, por defecto tú)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('notas')
                .setDescription('Notas adicionales sobre la fabricación (opcional)')
                .setRequired(false)
        ),

    async autocomplete(interaction: AutocompleteInteraction) {
        try {
            const focusedOption = interaction.options.getFocused(true);
            
            if (focusedOption.name === 'localizacion') {
                const localizaciones = await interaction.client.db.obtenerLocalizaciones();
                const filtered = localizaciones.filter((loc: Localizacion) => 
                    loc.nombre.toLowerCase().includes(focusedOption.value.toLowerCase())
                );
                
                const opciones = filtered.slice(0, 25).map((loc: Localizacion) => ({
                    name: loc.nombre,
                    value: loc.id
                }));
                
                await interaction.respond(opciones);
                
            } else if (focusedOption.name === 'plano') {
                const planos = await interaction.client.db.obtenerPlanos();
                const filtered = planos.filter((plano: Plano) => 
                    plano.nombre.toLowerCase().includes(focusedOption.value.toLowerCase())
                );
                
                const opciones = filtered.slice(0, 25).map((plano: Plano) => ({
                    name: `${plano.nombre} (${plano.duracion_minutos} min)`,
                    value: plano.id
                }));
                
                await interaction.respond(opciones);
            }
        } catch (error) {
            console.error('❌ Error en autocompletar iniciar-fabricacion:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply();

        try {
            const localizacionId = interaction.options.getInteger('localizacion', true);
            const planoId = interaction.options.getInteger('plano', true);
            const propietario = interaction.options.getUser('propietario') || interaction.user;
            const notas = interaction.options.getString('notas');

            // Verificar que la localización existe y está disponible
            const localizaciones = await interaction.client.db.obtenerLocalizaciones();
            const localizacionSeleccionada = localizaciones.find((l: Localizacion) => l.id === localizacionId);
            
            if (!localizacionSeleccionada) {
                await interaction.editReply({
                    content: '❌ Localización no encontrada o no disponible para fabricación.'
                });
                return;
            }

            // Verificar que el plano existe
            const planos = await interaction.client.db.obtenerPlanos();
            const planoSeleccionado = planos.find((p: Plano) => p.id === planoId);
            
            if (!planoSeleccionado) {
                await interaction.editReply({
                    content: '❌ Plano no encontrado.'
                });
                return;
            }

            // Crear la fabricación
            const fabricacionId = await interaction.client.db.crearFabricacion(
                localizacionId,
                planoId,
                propietario.displayName || propietario.username,
                propietario.id,
                notas || undefined,
                interaction.channelId
            );

            // Obtener fabricación completa para mostrar
            const fabricacion = await interaction.client.db.obtenerFabricacionPorId(fabricacionId);

            if (!fabricacion) {
                await interaction.editReply({
                    content: '❌ Error al crear la fabricación. Inténtalo de nuevo.'
                });
                return;
            }

            // Crear y enviar card
            const embed = crearCardFabricacion(fabricacion);
            
            await interaction.editReply({
                content: `✅ **Fabricación iniciada exitosamente!**\n🕐 Estará lista en **${planoSeleccionado.duracion_minutos} minutos**`,
                embeds: [embed]
            });

            // Log para administración
            console.log(`🏗️ Nueva fabricación iniciada: ID ${fabricacionId}, Plano: ${planoSeleccionado.nombre}, Localización: ${localizacionSeleccionada.nombre}, Usuario: ${propietario.tag}`);

        } catch (error) {
            console.error('❌ Error en comando iniciar-fabricacion:', error);
            
            await interaction.editReply({
                content: '❌ Hubo un error al iniciar la fabricación. Por favor, inténtalo de nuevo.'
            });
        }
    },
};
