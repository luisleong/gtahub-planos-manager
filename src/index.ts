import { Client, GatewayIntentBits, Collection, REST, Routes, TextInputBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ModalBuilder, TextInputStyle, ButtonStyle, StringSelectMenuBuilder, MessageFlags } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';
import { ChannelPermissions } from './utils/channelPermissions';
import MensajesPersistentesManager from './services/MensajesPersistentesManager';
import { DatabaseManager } from './database/DatabaseManager';

// Cargar variables de entorno
dotenv.config();

// Extender el tipo Client para incluir commands
declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, any>;
        db: DatabaseManager;
        mensajesPersistentes: MensajesPersistentesManager;
    }
}

class GTAHUBPlanosBot {
    private client: Client;
    private rest: REST;
    private fabricacionLocks: Set<string> = new Set(); // Para evitar doble ejecución

    constructor() {
        // Configurar cliente de Discord
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });

        // Configurar REST API para comandos
        this.rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);

        // Inicializar collections
        this.client.commands = new Collection();

        // Configurar base de datos
        this.client.db = new DatabaseManager();
        
        // Configurar manager de mensajes persistentes
        this.client.mensajesPersistentes = new MensajesPersistentesManager(this.client);
    }

    /**
     * Cargar todos los comandos desde la carpeta commands
     */
    private async loadCommands(): Promise<void> {
        const commandsPath = join(__dirname, 'commands');
        const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

        const commands = [];

        for (const file of commandFiles) {
            const filePath = join(commandsPath, file);
            const command = require(filePath).default || require(filePath);

            if ('data' in command && 'execute' in command) {
                this.client.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
                console.log(`✅ Comando cargado: ${command.data.name}`);
            } else {
                console.log(`⚠️ El comando en ${filePath} no tiene las propiedades requeridas.`);
            }
        }

        // Registrar comandos en Discord
        try {
            console.log('🔄 Registrando comandos slash...');
            await this.rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
                { body: commands },
            );
            console.log('✅ Comandos slash registrados correctamente.');
        } catch (error) {
            console.error('❌ Error registrando comandos:', error);
        }
    }

    /**
     * Configurar event listeners
     */
    private setupEventListeners(): void {
        // Bot listo
        this.client.once('ready', async () => {
            console.log(`🚀 ${this.client.user?.tag} está online!`);
            console.log(`📊 Conectado a ${this.client.guilds.cache.size} servidor(es)`);
            
            // Inicializar base de datos
            await this.client.db.initialize();
            console.log('🗄️ Base de datos inicializada');
            
            // Iniciar actualizaciones automáticas cada 5 minutos
            console.log('🔧 Iniciando sistema de actualizaciones automáticas...');
            this.iniciarActualizacionesAutomaticas();
            console.log('✅ Sistema de actualizaciones automáticas configurado');
        });

        // Manejo de comandos slash y componentes
        this.client.on('interactionCreate', async (interaction) => {
            // Manejar comandos slash y autocomplete
            if (interaction.isChatInputCommand() || interaction.isAutocomplete()) {
                const command = this.client.commands.get(interaction.commandName);

                if (!command) {
                    console.error(`❌ Comando ${interaction.commandName} no encontrado`);
                    return;
                }

                try {
                    if (interaction.isAutocomplete()) {
                        if (command.autocomplete) {
                            await command.autocomplete(interaction);
                        }
                        return;
                    }

                    // Verificar permisos de canal antes de ejecutar
                    const puedeEjecutar = await ChannelPermissions.verificarCanal(interaction);
                    if (!puedeEjecutar) {
                        return;
                    }

                    // Aquí interaction es ChatInputCommandInteraction
                    await command.execute(interaction);
                    console.log(`✅ Comando ejecutado: ${interaction.commandName} por ${interaction.user.tag} en canal ${interaction.channelId}`);
                } catch (error) {
                    console.error(`❌ Error ejecutando comando ${interaction.commandName}:`, error);
                    
                    if (interaction.isAutocomplete()) return;
                    
                    const errorMessage = 'Hubo un error ejecutando este comando.';
                    
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: errorMessage, flags: MessageFlags.Ephemeral });
                    } else {
                        await interaction.reply({ content: errorMessage, flags: MessageFlags.Ephemeral });
                    }
                }
            }

            // Manejar interacciones de menús de selección
            if (interaction.isStringSelectMenu()) {
                console.log(`🔍 DEBUG: Menu de selección detectado: "${interaction.customId}"`, { values: interaction.values });
                try {
                    await this.handleSelectMenuInteraction(interaction);
                } catch (error) {
                    console.error('❌ Error manejando menú de selección:', error);
                    if (!interaction.replied) {
                        await interaction.reply({
                            content: '❌ Ocurrió un error procesando tu selección.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }
            }

            // Manejar interacciones de botones
            if (interaction.isButton()) {
                try {
                    await this.handleButtonInteraction(interaction);
                } catch (error) {
                    console.error('❌ Error manejando botón:', error);
                    if (!interaction.replied) {
                        await interaction.reply({
                            content: '❌ Ocurrió un error procesando tu acción.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }
            }

            // Manejar envío de modales
            if (interaction.isModalSubmit()) {
                try {
                    await this.handleModalSubmit(interaction);
                } catch (error) {
                    console.error('❌ Error manejando modal:', error);
                    if (!interaction.replied) {
                        await interaction.reply({
                            content: '❌ Ocurrió un error procesando el formulario.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                }
            }
        });

        // Manejo de errores
        this.client.on('error', error => {
            console.error('❌ Error del cliente Discord:', error);
        });

        process.on('unhandledRejection', error => {
            console.error('❌ Promesa rechazada no manejada:', error);
        });
    }

    /**
     * Manejar envío de modales
     */
    private async handleModalSubmit(interaction: any): Promise<void> {
        const { customId } = interaction;

        if (customId.startsWith('modal_editar_plano_')) {
            await this.procesarModalEditarPlano(interaction);
        } else if (customId.startsWith('modal_editar_localizacion_')) {
            await this.procesarModalEditarLocalizacion(interaction);
        } else {
            console.warn(`Modal no manejado: ${customId}`);
        }
    }

    /**
     * Procesar modal de edición de plano
     */
    private async procesarModalEditarPlano(interaction: any): Promise<void> {
        const planoId = parseInt(interaction.customId.split('_')[3]);
        
        const nombre = interaction.fields.getTextInputValue('nombre_plano');
        const duracionTexto = interaction.fields.getTextInputValue('duracion_plano');
        const icono = interaction.fields.getTextInputValue('icono_plano') || null;
        
        const duracion = parseInt(duracionTexto);
        
        if (isNaN(duracion) || duracion < 1 || duracion > 1440) {
            await interaction.reply({
                content: '❌ Error: La duración debe ser un número entre 1 y 1440 minutos.',
                ephemeral: true
            });
            return;
        }

        const actualizado = await this.client.db.actualizarPlano(
            planoId,
            nombre,
            duracion,
            icono || undefined
        );

        if (actualizado) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle('✅ Plano Actualizado')
                .setDescription(`**${nombre}** ha sido actualizado correctamente.`)
                .addFields(
                    { name: '📋 Nombre', value: nombre, inline: true },
                    { name: '⏱️ Duración', value: `${duracion} minutos`, inline: true }
                );

            if (icono) {
                successEmbed.setThumbnail(icono);
            }

            await interaction.reply({ embeds: [successEmbed] });
        } else {
            await interaction.reply({
                content: '❌ Error: No se pudo actualizar el plano.',
                ephemeral: true
            });
        }
    }

    /**
     * Procesar modal de edición de localización
     */
    private async procesarModalEditarLocalizacion(interaction: any): Promise<void> {
        const localizacionId = parseInt(interaction.customId.split('_')[3]);
        
        const nombre = interaction.fields.getTextInputValue('nombre_localizacion');
        const foto = interaction.fields.getTextInputValue('foto_localizacion') || null;
        const disponibleTexto = interaction.fields.getTextInputValue('disponible_localizacion') || 'si';
        const disponible = disponibleTexto.toLowerCase() === 'si' || disponibleTexto.toLowerCase() === 'sí';

        const actualizado = await this.client.db.actualizarLocalizacion(
            localizacionId,
            nombre,
            foto || undefined,
            disponible
        );

        if (actualizado) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle('✅ Localización Actualizada')
                .setDescription(`**${nombre}** ha sido actualizada correctamente.`)
                .addFields(
                    { name: '📍 Nombre', value: nombre, inline: true },
                    { name: '✅ Disponible', value: disponible ? 'Sí' : 'No', inline: true }
                );

            if (foto) {
                successEmbed.setThumbnail(foto);
            }

            await interaction.reply({ embeds: [successEmbed] });
        } else {
            await interaction.reply({
                content: '❌ Error: No se pudo actualizar la localización.',
                ephemeral: true
            });
        }
    }

    /**
     * Manejar interacciones de menús de selección
     */
    private async handleSelectMenuInteraction(interaction: any): Promise<void> {
        const { customId, values } = interaction;
        const selectedValue = values[0];

        console.log(`🔍 DEBUG: handleSelectMenuInteraction iniciado`);
        console.log(`🔍 DEBUG: customId = "${customId}"`);
        console.log(`🔍 DEBUG: values = ${JSON.stringify(values)}`);
        console.log(`🔍 DEBUG: selectedValue = "${selectedValue}"`);

        console.log(`🔍 DEBUG: Entrando al switch statement...`);
        switch (customId) {
            case 'select_editar_localizacion':
                await this.mostrarModalEditarLocalizacion(interaction, parseInt(selectedValue));
                break;
            case 'select_editar_plano':
                await this.mostrarModalEditarPlano(interaction, parseInt(selectedValue));
                break;
            case 'select_eliminar_localizacion':
                await this.confirmarEliminarLocalizacion(interaction, parseInt(selectedValue));
                break;
            case 'select_eliminar_plano':
                await this.confirmarEliminarPlano(interaction, parseInt(selectedValue));
                break;
            case 'seleccionar_fabricacion':
                // Este caso se maneja en el comando listar-fabricaciones
                console.log('Menú de fabricaciones manejado por el comando correspondiente');
                break;
            case 'fabricar_select_localizacion':
            case 'fabricar_select_plano':
                // Estos casos se manejan en el comando fabricar
                console.log('Menús de fabricación rápida manejados por el comando correspondiente');
                break;
            default:
                console.log(`🔍 DEBUG: Llegamos al caso default`);
                // Verificar si es un menú de planos persistentes PRIMERO (más específico)
                console.log(`🔍 DEBUG: Verificando si es menú de planos persistentes...`);
                console.log(`🔍 DEBUG: customId.startsWith('select_plano_persistente_'): ${customId.startsWith('select_plano_persistente_')}`);
                if (customId.startsWith('select_plano_persistente_')) {
                    console.log(`🔍 DEBUG: Menu de planos persistentes detectado`);
                    console.log(`🔍 DEBUG: customId: "${customId}"`);
                    console.log(`🔍 DEBUG: selectedValue: "${selectedValue}"`);
                    console.log(`🔍 DEBUG: tipo selectedValue: ${typeof selectedValue}`);
                    console.log(`🔍 DEBUG: Llamando a handleSeleccionPlanoPersistente...`);
                    await this.handleSeleccionPlanoPersistente(interaction, customId, selectedValue);
                    console.log(`🔍 DEBUG: handleSeleccionPlanoPersistente completado`);
                    return; // IMPORTANTE: Salir después de manejar
                }
                // Verificar si es un menú del panel de localizaciones (menos específico)
                if (customId.startsWith('select_plano_') && !customId.includes('persistente')) {
                    console.log(`🔍 DEBUG: Es un menú de panel de localizaciones`);
                    await this.handlePanelLocalizacionesPlano(interaction, customId, selectedValue);
                    return; // IMPORTANTE: Salir después de manejar
                }
                console.warn(`Menu de selección no manejado: ${customId}`);
        }
    }

    /**
     * Manejar interacciones de botones
     */
    private async handleButtonInteraction(interaction: any): Promise<void> {
        const { customId } = interaction;

        if (customId.startsWith('confirmar_eliminar_loc_')) {
            const localizacionId = parseInt(customId.split('_')[3]);
            await this.ejecutarEliminacionLocalizacion(interaction, localizacionId);
        } else if (customId.startsWith('confirmar_eliminar_plano_')) {
            const planoId = parseInt(customId.split('_')[3]);
            await this.ejecutarEliminacionPlano(interaction, planoId);
        } else if (customId.startsWith('eliminar_loc_')) {
            const localizacionId = parseInt(customId.split('_')[2]);
            await this.confirmarEliminarLocalizacion(interaction, localizacionId);
        } else if (customId.startsWith('eliminar_plano_')) {
            const planoId = parseInt(customId.split('_')[2]);
            await this.confirmarEliminarPlano(interaction, planoId);
        } else if (customId.startsWith('dashboard_')) {
            await this.handleDashboardButton(interaction, customId);
        } else if (customId.startsWith('fabricar_rapido_')) {
            await this.handleFabricarRapidoButton(interaction, customId);
        } else if (customId.startsWith('poner_persistente_') || customId.startsWith('recoger_persistente_')) {
            await this.handleBotonPersistente(interaction, customId);
        } else if (customId.startsWith('ejecutar_limpieza_') || customId === 'cancelar_limpieza') {
            // Los botones de limpieza se manejan en el propio comando
            console.log('Botón de limpieza manejado por el comando correspondiente');
        } else if (customId === 'cancelar_eliminacion') {
            await interaction.update({
                content: '❌ Eliminación cancelada.',
                embeds: [],
                components: []
            });
        } else {
            console.warn(`Botón no manejado: ${customId}`);
        }
    }

    /**
     * Manejar botones del dashboard
     */
    private async handleDashboardButton(interaction: any, customId: string): Promise<void> {
        const action = customId.split('_')[1];
        
        try {
            await interaction.deferUpdate();
            
            switch (action) {
                case 'refresh':
                    // Recargar dashboard completo
                    const todasFabricaciones = await this.client.db.obtenerFabricaciones();
                    const fabricacionesActivas = todasFabricaciones.filter((f: any) => !f.recogido);
                    // Aquí podrías recrear los embeds, pero por simplicidad mostraremos un mensaje
                    await interaction.editReply({
                        content: '🔄 Dashboard actualizado! Usa `/dashboard` para ver la versión completa.',
                        embeds: [],
                        components: []
                    });
                    break;
                    
                case 'en':
                    if (customId === 'dashboard_en_proceso') {
                        const fabricacionesProceso = await this.client.db.obtenerFabricacionesPorEstado('en_proceso');
                        const embed = new EmbedBuilder()
                            .setTitle('⏳ Fabricaciones En Proceso')
                            .setColor('#FEE75C')
                            .setDescription(`Hay **${fabricacionesProceso.length}** fabricaciones en proceso.`)
                            .setTimestamp();
                        
                        await interaction.editReply({ embeds: [embed], components: [] });
                    }
                    break;
                    
                case 'listos':
                    const fabricacionesListos = await this.client.db.obtenerFabricacionesPorEstado('listo');
                    const embed = new EmbedBuilder()
                        .setTitle('✅ Fabricaciones Listas')
                        .setColor('#57F287')
                        .setDescription(`Hay **${fabricacionesListos.length}** fabricaciones listas para recoger.`)
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [embed], components: [] });
                    break;
                    
                case 'stats':
                    const estadisticas = await this.generarEstadisticas();
                    await interaction.editReply({ embeds: [estadisticas], components: [] });
                    break;
                    
                default:
                    await interaction.editReply({
                        content: '❌ Acción no reconocida.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            console.error('Error manejando botón del dashboard:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Error procesando la acción del dashboard.',
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Manejar botones de fabricación rápida
     */
    private async handleFabricarRapidoButton(interaction: any, customId: string): Promise<void> {
        try {
            await interaction.deferUpdate();

            // Extraer IDs de localización y plano del customId
            // Formato: fabricar_rapido_localizacionId_planoId
            const parts = customId.split('_');
            const localizacionId = parseInt(parts[2]);
            const planoId = parseInt(parts[3]);

            // Obtener información
            const localizacion = await this.client.db.obtenerLocalizacionPorId(localizacionId);
            const plano = await this.client.db.obtenerPlanoPorId(planoId);

            if (!localizacion || !plano) {
                await interaction.editReply({
                    content: '❌ Error: Localización o plano no encontrado.',
                    embeds: [],
                    components: []
                });
                return;
            }

            // Crear la fabricación instantánea
            const fabricacionId = await this.client.db.crearFabricacion(
                localizacionId,
                planoId,
                interaction.member?.displayName || interaction.user.displayName || interaction.user.username,
                interaction.user.id,
                'Fabricación rápida', // nota automática
                interaction.channelId
            );

            // Obtener fabricación completa
            const fabricacion = await this.client.db.obtenerFabricacionPorId(fabricacionId);

            if (!fabricacion) {
                await interaction.editReply({
                    content: '❌ Error al crear la fabricación.',
                    embeds: [],
                    components: []
                });
                return;
            }

            // Crear card de éxito
            const { crearCardFabricacion, COLORS } = await import('./utils/embeds');
            const fabricacionCard = crearCardFabricacion(fabricacion);

            const successEmbed = new EmbedBuilder()
                .setTitle('⚡ ¡Fabricación Instantánea Creada!')
                .setColor(COLORS.SUCCESS)
                .setDescription(`🚀 **${plano.nombre}** iniciado en **${localizacion.nombre}** con un solo clic!`)
                .addFields(
                    { name: '⏱️ Duración', value: `${plano.duracion_minutos} minutos`, inline: true },
                    { name: '👤 Propietario', value: interaction.user.toString(), inline: true },
                    { name: '🆔 ID', value: fabricacionId.toString(), inline: true }
                )
                .setFooter({ text: 'Recibirás notificación cuando esté listo' })
                .setTimestamp();

            await interaction.editReply({
                content: '🎉 **¡Fabricación creada en 1 clic!**',
                embeds: [successEmbed, fabricacionCard],
                components: []
            });

            // Log
            console.log(`⚡ Fabricación rápida: ID ${fabricacionId}, ${plano.nombre} en ${localizacion.nombre}, Usuario: ${interaction.user.tag}`);

        } catch (error) {
            console.error('Error en fabricación rápida:', error);
            await interaction.editReply({
                content: '❌ Error creando la fabricación rápida.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Generar estadísticas del sistema
     */
    private async generarEstadisticas(): Promise<EmbedBuilder> {
        const todasFabricaciones = await this.client.db.obtenerFabricaciones();
        const enProceso = todasFabricaciones.filter((f: any) => !f.recogido && !f.listo_para_recoger).length;
        const listos = todasFabricaciones.filter((f: any) => !f.recogido && f.listo_para_recoger).length;
        const recogidos = todasFabricaciones.filter((f: any) => f.recogido).length;
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Estadísticas del Sistema')
            .setColor('#5865F2')
            .addFields(
                { name: '⏳ En Proceso', value: enProceso.toString(), inline: true },
                { name: '✅ Listos', value: listos.toString(), inline: true },
                { name: '📦 Recogidos', value: recogidos.toString(), inline: true },
                { name: '📈 Total', value: todasFabricaciones.length.toString(), inline: true }
            )
            .setTimestamp();
            
        return embed;
    }

    /**
     * Mostrar modal para editar localización
     */
    private async mostrarModalEditarLocalizacion(interaction: any, localizacionId: number): Promise<void> {
        const localizacion = await this.client.db.obtenerLocalizacionPorId(localizacionId);
        if (!localizacion) {
            await interaction.reply({
                content: '❌ Localización no encontrada.',
                ephemeral: true
            });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`modal_editar_localizacion_${localizacionId}`)
            .setTitle(`✏️ Editar: ${localizacion.nombre}`);

        const nombreInput = new TextInputBuilder()
            .setCustomId('nombre_localizacion')
            .setLabel('Nombre de la Localización')
            .setStyle(TextInputStyle.Short)
            .setValue(localizacion.nombre)
            .setRequired(true)
            .setMaxLength(100);

        const fotoInput = new TextInputBuilder()
            .setCustomId('foto_localizacion')
            .setLabel('URL de la Foto')
            .setStyle(TextInputStyle.Short)
            .setValue(localizacion.foto_url || '')
            .setRequired(false);

        const disponibleInput = new TextInputBuilder()
            .setCustomId('disponible_localizacion')
            .setLabel('¿Disponible? (si/no)')
            .setStyle(TextInputStyle.Short)
            .setValue(localizacion.disponible_para_fabricacion ? 'si' : 'no')
            .setRequired(false)
            .setMaxLength(2);

        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nombreInput);
        const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(fotoInput);
        const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(disponibleInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

        await interaction.showModal(modal);
    }

    /**
     * Mostrar modal para editar plano
     */
    private async mostrarModalEditarPlano(interaction: any, planoId: number): Promise<void> {
        const plano = await this.client.db.obtenerPlanoPorId(planoId);
        if (!plano) {
            await interaction.reply({
                content: '❌ Plano no encontrado.',
                ephemeral: true
            });
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`modal_editar_plano_${planoId}`)
            .setTitle(`✏️ Editar: ${plano.nombre}`);

        const nombreInput = new TextInputBuilder()
            .setCustomId('nombre_plano')
            .setLabel('Nombre del Plano')
            .setStyle(TextInputStyle.Short)
            .setValue(plano.nombre)
            .setRequired(true)
            .setMaxLength(100);

        const duracionInput = new TextInputBuilder()
            .setCustomId('duracion_plano')
            .setLabel('Duración en Minutos')
            .setStyle(TextInputStyle.Short)
            .setValue(plano.duracion_minutos.toString())
            .setRequired(true)
            .setMaxLength(4);

        const iconoInput = new TextInputBuilder()
            .setCustomId('icono_plano')
            .setLabel('URL del Icono')
            .setStyle(TextInputStyle.Short)
            .setValue(plano.icono_url || '')
            .setRequired(false);

        const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nombreInput);
        const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(duracionInput);
        const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(iconoInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

        await interaction.showModal(modal);
    }

    /**
     * Confirmar eliminación de localización
     */
    private async confirmarEliminarLocalizacion(interaction: any, localizacionId: number): Promise<void> {
        const localizacion = await this.client.db.obtenerLocalizacionPorId(localizacionId);
        if (!localizacion) {
            await interaction.update({
                content: '❌ Localización no encontrada.',
                embeds: [],
                components: []
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('⚠️ Confirmar Eliminación')
            .setDescription(`¿Estás seguro de que quieres eliminar la localización **${localizacion.nombre}**?`)
            .addFields(
                { name: '🆔 ID', value: localizacion.id.toString(), inline: true },
                { name: '📍 Nombre', value: localizacion.nombre, inline: true },
                { name: '✅ Disponible', value: localizacion.disponible_para_fabricacion ? 'Sí' : 'No', inline: true }
            )
            .setFooter({ text: 'Esta acción no se puede deshacer.' })
            .setTimestamp();

        if (localizacion.foto_url) {
            embed.setThumbnail(localizacion.foto_url);
        }

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirmar_eliminar_loc_${localizacionId}`)
                    .setLabel('🗑️ Sí, Eliminar')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancelar_eliminacion')
                    .setLabel('❌ Cancelar')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    }

    /**
     * Confirmar eliminación de plano
     */
    private async confirmarEliminarPlano(interaction: any, planoId: number): Promise<void> {
        const plano = await this.client.db.obtenerPlanoPorId(planoId);
        if (!plano) {
            await interaction.update({
                content: '❌ Plano no encontrado.',
                embeds: [],
                components: []
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('⚠️ Confirmar Eliminación')
            .setDescription(`¿Estás seguro de que quieres eliminar el plano **${plano.nombre}**?`)
            .addFields(
                { name: '🆔 ID', value: plano.id.toString(), inline: true },
                { name: '📋 Nombre', value: plano.nombre, inline: true },
                { name: '⏱️ Duración', value: `${plano.duracion_minutos} min`, inline: true }
            )
            .setFooter({ text: 'Esta acción no se puede deshacer.' })
            .setTimestamp();

        if (plano.icono_url) {
            embed.setThumbnail(plano.icono_url);
        }

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`confirmar_eliminar_plano_${planoId}`)
                    .setLabel('🗑️ Sí, Eliminar')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancelar_eliminacion')
                    .setLabel('❌ Cancelar')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.update({ embeds: [embed], components: [buttons] });
    }

    /**
     * Ejecutar eliminación de localización
     */
    private async ejecutarEliminacionLocalizacion(interaction: any, localizacionId: number): Promise<void> {
        try {
            const resultado = await this.client.db.eliminarLocalizacion(localizacionId);
            
            if (resultado.success) {
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Localización Eliminada')
                    .setDescription(`La localización ha sido eliminada correctamente.`)
                    .addFields({ name: '🆔 ID Eliminado', value: localizacionId.toString(), inline: true })
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#FF4444')
                    .setTitle('❌ No se puede eliminar')
                    .setDescription(resultado.message)
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });
            }
        } catch (error) {
            console.error('Error eliminando localización:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Error')
                .setDescription('Ocurrió un error al eliminar la localización.')
                .setTimestamp();

            await interaction.update({ embeds: [embed], components: [] });
        }
    }

    /**
     * Ejecutar eliminación de plano
     */
    private async ejecutarEliminacionPlano(interaction: any, planoId: number): Promise<void> {
        try {
            const resultado = await this.client.db.eliminarPlano(planoId);
            
            if (resultado.success) {
                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Plano Eliminado')
                    .setDescription(`El plano ha sido eliminado correctamente.`)
                    .addFields({ name: '🆔 ID Eliminado', value: planoId.toString(), inline: true })
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#FF4444')
                    .setTitle('❌ No se puede eliminar')
                    .setDescription(resultado.message)
                    .setTimestamp();

                await interaction.update({ embeds: [embed], components: [] });
            }
        } catch (error) {
            console.error('Error eliminando plano:', error);
            const embed = new EmbedBuilder()
                .setColor('#FF4444')
                .setTitle('❌ Error')
                .setDescription('Ocurrió un error al eliminar el plano.')
                .setTimestamp();

            await interaction.update({ embeds: [embed], components: [] });
        }
    }

    /**
     * Manejar botones de mensajes persistentes
     */
    private async handleBotonPersistente(interaction: any, customId: string): Promise<void> {
        try {
            const dbManager = this.client.db;
            const [accion, , localizacionId] = customId.split('_');
            const locId = parseInt(localizacionId);

            if (accion === 'poner') {
                // Obtener información de la localización
                const localizacion = await dbManager.obtenerLocalizacionPorId(locId);
                if (!localizacion) {
                    await interaction.reply({
                        content: '❌ Error: Localización no encontrada.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                // Mostrar menú de selección de planos
                const planos = await dbManager.obtenerPlanos();
                
                if (planos.length === 0) {
                    await interaction.reply({
                        content: '❌ No hay planos disponibles. Usa `/agregar-plano` para añadir uno.',
                        flags: MessageFlags.Ephemeral
                    });
                    return;
                }

                // Crear menú de selección
                console.log(`🔍 DEBUG: Creando menú de selección para localización ${locId}`);
                console.log(`🔍 DEBUG: Planos disponibles para menú:`, planos.map((p: any) => `${p.id}:${p.nombre}`));
                
                const menuOptions = planos.map((plano: any) => {
                    const option = {
                        label: plano.nombre,
                        description: `⏱️ ${plano.duracion_minutos} min • 📍 Se fabricará en ${localizacion.nombre}`,
                        value: plano.id.toString(),
                        emoji: '📋'
                    };
                    console.log(`🔍 DEBUG: Opción de menú creada:`, option);
                    return option;
                });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`select_plano_persistente_${locId}`)
                    .setPlaceholder(`🏗️ Fabricar en ${localizacion.nombre} - Selecciona un plano`)
                    .addOptions(menuOptions);

                const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>()
                    .addComponents(selectMenu);

                // Crear embed informativo sobre la localización
                const embed = new EmbedBuilder()
                    .setTitle('🏗️ Selecciona el Plano a Fabricar')
                    .setDescription(`Vas a fabricar un plano en **${localizacion.nombre}**`)
                    .addFields(
                        { name: '📍 Localización', value: localizacion.nombre, inline: true },
                        { name: '✅ Estado', value: localizacion.disponible_para_fabricacion ? 'Disponible' : 'No Disponible', inline: true },
                        { name: '🎯 Acción', value: 'Selecciona un plano del menú', inline: true }
                    )
                    .setColor(0x5865F2)
                    .setTimestamp();

                // Agregar imagen si está disponible
                if (localizacion.foto_url) {
                    embed.setThumbnail(localizacion.foto_url);
                }

                await interaction.reply({
                    embeds: [embed],
                    components: [selectRow],
                    ephemeral: true
                });

            } else if (accion === 'recoger') {
                // Marcar fabricaciones como recogidas
                const fabricaciones = await dbManager.obtenerFabricaciones();
                const fabricacionesCompletadas = fabricaciones.filter((f: any) => 
                    f.id_localizacion === locId && f.listo_para_recoger && !f.recogido
                );

                if (fabricacionesCompletadas.length === 0) {
                    await interaction.reply({
                        content: '❌ No hay planos completados para recoger en esta localización.',
                        ephemeral: true
                    });
                    return;
                }

                // Marcar como recogidas
                for (const fab of fabricacionesCompletadas) {
                    await dbManager.marcarComoRecogido(fab.id);
                }

                const embed = new EmbedBuilder()
                    .setTitle('✅ Planos Recogidos')
                    .setDescription(`Has recogido **${fabricacionesCompletadas.length}** plano(s) exitosamente.`)
                    .setColor(0x57F287)
                    .setTimestamp();

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });

                // Actualizar mensaje persistente
                await this.client.mensajesPersistentes.actualizarMensajeLocalizacion(locId);
            }

        } catch (error) {
            console.error('Error en handleBotonPersistente:', error);
            await interaction.reply({
                content: '❌ Error al procesar la acción.',
                ephemeral: true
            });
        }
    }

    /**
     * Manejar selección de plano en mensajes persistentes
     */
    private async handleSeleccionPlanoPersistente(interaction: any, customId: string, planoNombre: string): Promise<void> {
        const lockKey = `${interaction.user.id}_${customId}_${planoNombre}`;
        
        if (this.fabricacionLocks.has(lockKey)) {
            console.log(`🚫 LOCK: Duplicación bloqueada para ${interaction.user.username} - ${lockKey}`);
            return;
        }
        
        this.fabricacionLocks.add(lockKey);
        
        try {
            console.log(`� MÉTODO 1: handleSeleccionPlanoPersistente INICIADO - Usuario: ${interaction.user.username}`);
            console.log(`�🔍 DEBUG: handleSeleccionPlanoPersistente iniciado`);
            console.log(`🔍 DEBUG: customId recibido: "${customId}"`);
            console.log(`🔍 DEBUG: planoNombre recibido: "${planoNombre}"`);
            console.log(`🔍 DEBUG: tipo de planoNombre: ${typeof planoNombre}`);
            
            // Extraer el ID de localización del customId
            const customIdParts = customId.split('_');
            console.log(`🔍 DEBUG: customId partes:`, customIdParts);
            
            const localizacionId = parseInt(customIdParts[3]);
            console.log(`🔍 DEBUG: localizacionId extraído: ${localizacionId} (tipo: ${typeof localizacionId})`);

            const dbManager = this.client.db;
            
            console.log(`🔍 DEBUG: Buscando localización ID ${localizacionId} y plano "${planoNombre}"`);
            
            // Obtener información de la localización y el plano
            const localizaciones = await dbManager.obtenerTodasLasLocalizaciones();
            const planos = await dbManager.obtenerPlanos();
            
            console.log(`🔍 DEBUG: Localizaciones disponibles:`, localizaciones.map((l: any) => `${l.id}: ${l.nombre}`));
            console.log(`🔍 DEBUG: Planos disponibles:`, planos.map((p: any) => `${p.id}: ${p.nombre}`));
            
            // Intentar convertir planoNombre a número
            const planoId = parseInt(planoNombre);
            console.log(`🔍 DEBUG: planoNombre convertido a número: ${planoId} (tipo: ${typeof planoId})`);
            console.log(`🔍 DEBUG: isNaN(planoId): ${isNaN(planoId)}`);
            
            const localizacion = localizaciones.find((l: any) => l.id === localizacionId);
            const plano = planos.find((p: any) => p.id === planoId);
            
            console.log(`🔍 DEBUG: Localización encontrada:`, localizacion ? `${localizacion.id}: ${localizacion.nombre}` : 'NO ENCONTRADA');
            console.log(`🔍 DEBUG: Plano encontrado:`, plano ? `${plano.id}: ${plano.nombre}` : 'NO ENCONTRADO');

            if (!localizacion || !plano) {
                console.log(`❌ DEBUG: Error - localización: ${!!localizacion}, plano: ${!!plano}`);
                await interaction.reply({
                    content: '❌ Error: No se encontró la localización o el plano.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            // Crear la fabricación
            const fabricacionId = await dbManager.crearFabricacion(
                localizacionId,
                plano.id,
                interaction.member?.displayName || interaction.user.displayName || interaction.user.username,
                interaction.user.id,
                undefined, // notas
                interaction.channelId // canal de notificación
            );

            const embed = new EmbedBuilder()
                .setTitle('🎯 Fabricación Iniciada')
                .setDescription(`**Plano:** ${plano.nombre}\n**Localización:** ${localizacion.nombre}\n**Tiempo:** ${plano.duracion_minutos} minutos`)
                .setColor(0xFEE75C)
                .setFooter({ text: 'GTAHUB Planos Manager' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                flags: MessageFlags.Ephemeral
            });

            // Actualizar mensaje persistente
            await this.client.mensajesPersistentes.actualizarMensajeLocalizacion(localizacionId);

            console.log(`✅ Fabricación creada: ID ${fabricacionId}, Plano: ${plano.nombre}, Localización: ${localizacion.nombre}`);

        } catch (error) {
            console.error('Error en handleSeleccionPlanoPersistente:', error);
            await interaction.reply({
                content: '❌ Error al iniciar la fabricación.',
                flags: MessageFlags.Ephemeral
            });
        } finally {
            // Limpiar el lock después de 2 segundos para permitir reintentos
            setTimeout(() => {
                const lockKey = `${interaction.user.id}_${customId}_${planoNombre}`;
                this.fabricacionLocks.delete(lockKey);
                console.log(`🔓 LOCK: Removido ${lockKey}`);
            }, 2000);
        }
    }

    /**
     * Manejar selección de plano en el panel de localizaciones
     */
    private async handlePanelLocalizacionesPlano(interaction: any, customId: string, planoId: string): Promise<void> {
        const lockKey = `${interaction.user.id}_${customId}_${planoId}`;
        
        if (this.fabricacionLocks.has(lockKey)) {
            console.log(`🚫 LOCK: Duplicación bloqueada para ${interaction.user.username} - ${lockKey}`);
            return;
        }
        
        this.fabricacionLocks.add(lockKey);
        
        try {
            console.log(`🔴 MÉTODO 2: handlePanelLocalizacionesPlano INICIADO - Usuario: ${interaction.user.username}`);
            // Extraer el ID de localización del customId
            const localizacionId = parseInt(customId.split('_')[2]);
            const planoIdNum = parseInt(planoId);

            const dbManager = this.client.db;
            
            // Obtener información de la localización y el plano
            const localizaciones = await dbManager.obtenerLocalizaciones();
            const planos = await dbManager.obtenerPlanos();
            
            const localizacion = localizaciones.find((l: any) => l.id === localizacionId);
            const plano = planos.find((p: any) => p.id === planoIdNum);

            if (!localizacion || !plano) {
                await interaction.reply({
                    content: '❌ Error: No se encontró la localización o el plano.',
                    ephemeral: true
                });
                return;
            }

            // Crear la fabricación
            const fabricacionId = await dbManager.crearFabricacion(
                localizacionId,
                planoIdNum,
                interaction.member?.displayName || interaction.user.displayName || interaction.user.username,
                interaction.user.id,
                undefined, // notas
                interaction.channelId // canal de notificación
            );

            const embed = new EmbedBuilder()
                .setTitle('🎯 Fabricación Iniciada')
                .setDescription(`**Plano:** ${plano.nombre}\n**Localización:** ${localizacion.nombre}\n**Tiempo:** ${plano.duracion_minutos} minutos`)
                .setColor(0xFEE75C)
                .setFooter({ text: 'GTAHUB Planos Manager' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

            console.log(`✅ Fabricación creada: ID ${fabricacionId}, Plano: ${plano.nombre}, Localización: ${localizacion.nombre}`);

        } catch (error) {
            console.error('Error en handlePanelLocalizacionesPlano:', error);
            await interaction.reply({
                content: '❌ Error al iniciar la fabricación.',
                ephemeral: true
            });
        } finally {
            // Limpiar el lock después de 2 segundos para permitir reintentos
            setTimeout(() => {
                const lockKey = `${interaction.user.id}_${customId}_${planoId}`;
                this.fabricacionLocks.delete(lockKey);
                console.log(`🔓 LOCK: Removido ${lockKey}`);
            }, 2000);
        }
    }

    /**
     * Iniciar actualizaciones automáticas cada 5 minutos
     */
    private iniciarActualizacionesAutomaticas(): void {
        console.log('🔄 Configurando sistema de actualizaciones automáticas...');
        
        // Actualizar inmediatamente al iniciar
        setTimeout(() => {
            console.log('⏱️ Ejecutando primera actualización automática...');
            this.actualizarTodosMensajesPersistentes();
        }, 10000); // Esperar 10 segundos después del inicio

        // Configurar intervalo de 1 minuto (60,000 ms)
        const intervalId = setInterval(async () => {
            console.log('⏰ Ejecutando actualización automática programada...');
            await this.actualizarTodosMensajesPersistentes();
        }, 1 * 60 * 1000);

        console.log('🔄 Sistema de actualizaciones automáticas iniciado (cada 1 minuto)');
        console.log(`🆔 Interval ID: ${intervalId}`);
    }

    /**
     * Actualizar todos los mensajes persistentes
     */
    private async actualizarTodosMensajesPersistentes(): Promise<void> {
        try {
            const ahora = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
            console.log(`🔄 [${ahora}] Iniciando actualización automática de mensajes persistentes...`);
            
            // Primero, detectar y marcar fabricaciones completadas
            await this.detectarFabricacionesCompletadas();
            
            // Obtener todas las localizaciones que tienen mensajes persistentes
            const localizaciones = await this.client.db.obtenerTodasLasLocalizaciones();
            const localizacionesConMensajes = localizaciones.filter((loc: any) => 
                loc.mensaje_persistente_id && loc.canal_persistente_id
            );

            console.log(`📍 Encontradas ${localizacionesConMensajes.length} localizaciones con mensajes persistentes`);
            
            if (localizacionesConMensajes.length === 0) {
                console.log('⚠️ No hay mensajes persistentes configurados. Usa /setup-canal-persistente');
                return;
            }

            // Actualizar cada mensaje persistente
            let actualizados = 0;
            for (const loc of localizacionesConMensajes) {
                try {
                    console.log(`🔄 Actualizando mensaje para ${loc.nombre}...`);
                    await this.client.mensajesPersistentes.actualizarMensajeLocalizacion(loc.id, true); // Notificar si hay completados
                    actualizados++;
                    // Pequeña pausa entre actualizaciones para evitar rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error(`❌ Error actualizando mensaje persistente para ${loc.nombre}:`, error);
                }
            }

            console.log(`✅ [${ahora}] Actualización automática completada: ${actualizados}/${localizacionesConMensajes.length} mensajes actualizados`);
        } catch (error) {
            console.error('❌ Error en actualización automática:', error);
        }
    }

    /**
     * Detectar fabricaciones que han llegado a 100% y marcarlas como listas
     */
    private async detectarFabricacionesCompletadas(): Promise<void> {
        try {
            // Usar el método específico para obtener fabricaciones que necesitan notificación
            // Esto ya incluye el filtro de no notificadas
            const fabricacionesParaNotificar = await this.client.db.obtenerFabricacionesParaNotificar();

            console.log(`🔍 Detectadas ${fabricacionesParaNotificar.length} fabricaciones completadas para notificar...`);

            for (const fabricacion of fabricacionesParaNotificar) {
                console.log(`🎯 Procesando fabricación completada: ID ${fabricacion.id} - ${fabricacion.plano_nombre} en ${fabricacion.localizacion_nombre}`);
                
                try {
                    // Marcar como listo para recoger
                    const marcadoListo = await this.client.db.marcarComoListo(fabricacion.id);
                    
                    if (marcadoListo) {
                        console.log(`✅ Fabricación ${fabricacion.id} marcada como lista para recoger`);
                        
                        // Enviar notificación si hay canal configurado
                        if (fabricacion.canal_notificacion) {
                            try {
                                const canal = await this.client.channels.fetch(fabricacion.canal_notificacion);
                                if (canal && 'send' in canal) {
                                    await canal.send(`🎉 **¡Plano completado!**\n**${fabricacion.plano_nombre}** en **${fabricacion.localizacion_nombre}** está listo para recoger!\n<@${fabricacion.propietario_id}>`);
                                    console.log(`📢 Notificación enviada para fabricación ${fabricacion.id}`);
                                    
                                    // IMPORTANTE: Marcar como notificado para evitar notificaciones repetidas
                                    const marcadoNotificado = await this.client.db.marcarComoNotificado(fabricacion.id);
                                    if (marcadoNotificado) {
                                        console.log(`✅ Fabricación ${fabricacion.id} marcada como notificada - No se enviará más notificaciones`);
                                    } else {
                                        console.error(`❌ Error: No se pudo marcar la fabricación ${fabricacion.id} como notificada`);
                                    }
                                }
                            } catch (error) {
                                console.error(`❌ Error enviando notificación para fabricación ${fabricacion.id}:`, error);
                            }
                        } else {
                            // Si no hay canal configurado, igual marcar como notificado para evitar reprocessamiento
                            const marcadoNotificado = await this.client.db.marcarComoNotificado(fabricacion.id);
                            if (marcadoNotificado) {
                                console.log(`✅ Fabricación ${fabricacion.id} marcada como notificada (sin canal de notificación)`);
                            }
                        }
                    } else {
                        console.error(`❌ Error: No se pudo marcar la fabricación ${fabricacion.id} como lista`);
                    }
                } catch (error) {
                    console.error(`❌ Error procesando fabricación ${fabricacion.id}:`, error);
                }
            }
        } catch (error) {
            console.error('❌ Error detectando fabricaciones completadas:', error);
        }
    }

    /**
     * Iniciar el bot
     */
    public async start(): Promise<void> {
        try {
            // Cargar comandos
            await this.loadCommands();
            
            // Configurar eventos
            this.setupEventListeners();
            
            // Conectar a Discord
            await this.client.login(process.env.BOT_TOKEN);
            
        } catch (error) {
            console.error('❌ Error iniciando el bot:', error);
            process.exit(1);
        }
    }
}

// Iniciar el bot
const bot = new GTAHUBPlanosBot();
bot.start().catch(console.error);

export default GTAHUBPlanosBot;
