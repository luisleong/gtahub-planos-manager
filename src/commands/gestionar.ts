import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ComponentType,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonInteraction,
    StringSelectMenuInteraction
} from 'discord.js';
import { DatabaseManager } from '../database/DatabaseManager';

const db = new DatabaseManager();

export const data = new SlashCommandBuilder()
    .setName('gestionar')
    .setDescription('Panel de gestión visual para localizaciones y planos');

export async function execute(interaction: ChatInputCommandInteraction) {
    try {
        // Crear el embed principal
        const mainEmbed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setTitle('🎮 GTAHUB - Panel de Gestión')
            .setDescription('Selecciona una acción para gestionar localizaciones y planos de manera visual e interactiva.')
            .addFields(
                { name: '📍 Localizaciones', value: 'Agregar, editar o ver localizaciones', inline: true },
                { name: '📋 Planos', value: 'Agregar, editar o ver planos', inline: true },
                { name: '📊 Estadísticas', value: 'Ver resumen del sistema', inline: true }
            )
            .setThumbnail('https://i.imgur.com/gtahub-logo.png')
            .setTimestamp();

        // Crear botones principales
        const mainButtons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('gestionar_localizaciones')
                    .setLabel('📍 Localizaciones')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('gestionar_planos')
                    .setLabel('📋 Planos')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ver_estadisticas')
                    .setLabel('📊 Estadísticas')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = await interaction.reply({
            embeds: [mainEmbed],
            components: [mainButtons],
            ephemeral: false
        });

        // Manejar interacciones de botones
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300_000 // 5 minutos
        });

        collector.on('collect', async (buttonInteraction) => {
            try {
                switch (buttonInteraction.customId) {
                    case 'gestionar_localizaciones':
                        await mostrarGestionLocalizaciones(buttonInteraction);
                        break;
                    case 'gestionar_planos':
                        await mostrarGestionPlanos(buttonInteraction);
                        break;
                    case 'ver_estadisticas':
                        await mostrarEstadisticas(buttonInteraction);
                        break;
                }
            } catch (error) {
                console.error('Error en collector:', error);
                await buttonInteraction.reply({
                    content: '❌ Ocurrió un error procesando tu solicitud.',
                    ephemeral: true
                });
            }
        });

        collector.on('end', async () => {
            try {
                // Deshabilitar botones cuando expire
                const disabledButtons = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        mainButtons.components.map(button => 
                            ButtonBuilder.from(button).setDisabled(true)
                        )
                    );

                await response.edit({ components: [disabledButtons] });
            } catch (error) {
                console.error('Error deshabilitando botones:', error);
            }
        });

    } catch (error) {
        console.error('Error ejecutando comando gestionar:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF4444')
            .setTitle('❌ Error')
            .setDescription('Ocurrió un error al cargar el panel de gestión.')
            .setTimestamp();

        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

// Función para mostrar gestión de localizaciones
async function mostrarGestionLocalizaciones(interaction: any) {
    const localizaciones = await db.obtenerTodasLasLocalizaciones();
    
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📍 Gestión de Localizaciones')
        .setDescription(`Tienes **${localizaciones.length}** localizaciones registradas.\nSelecciona una acción:`)
        .setTimestamp();

    const buttonsRow1 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('agregar_localizacion')
                .setLabel('➕ Agregar Nueva')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('editar_localizacion')
                .setLabel('✏️ Editar Existente')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ver_localizaciones')
                .setLabel('� Ver/Eliminar Todas')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({
        embeds: [embed],
        components: [buttonsRow1]
    });

    // Manejar interacciones de localizaciones
    const response = await interaction.fetchReply();
    const locCollector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300_000
    });

    locCollector.on('collect', async (locButtonInteraction: ButtonInteraction) => {
        try {
            switch (locButtonInteraction.customId) {
                case 'agregar_localizacion':
                    await mostrarModalAgregarLocalizacion(locButtonInteraction);
                    break;
                case 'editar_localizacion':
                    await mostrarMenuEditarLocalizacion(locButtonInteraction);
                    break;
                case 'ver_localizaciones':
                    await mostrarListaLocalizaciones(locButtonInteraction);
                    break;
            }
        } catch (error) {
            console.error('Error en collector de localizaciones:', error);
        }
    });
}

// Función para mostrar gestión de planos
async function mostrarGestionPlanos(interaction: any) {
    const planos = await db.obtenerPlanos();
    
    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('📋 Gestión de Planos')
        .setDescription(`Tienes **${planos.length}** planos registrados.\nSelecciona una acción:`)
        .setTimestamp();

    const buttonsRow1 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('agregar_plano')
                .setLabel('➕ Agregar Nuevo')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('editar_plano')
                .setLabel('✏️ Editar Existente')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('ver_planos')
                .setLabel('� Ver/Eliminar Todos')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.update({
        embeds: [embed],
        components: [buttonsRow1]
    });

    // Manejar interacciones de planos
    const response = await interaction.fetchReply();
    const planoCollector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300_000
    });

    planoCollector.on('collect', async (planoButtonInteraction: ButtonInteraction) => {
        try {
            switch (planoButtonInteraction.customId) {
                case 'agregar_plano':
                    await mostrarModalAgregarPlano(planoButtonInteraction);
                    break;
                case 'editar_plano':
                    await mostrarMenuEditarPlano(planoButtonInteraction);
                    break;
                case 'ver_planos':
                    await mostrarListaPlanos(planoButtonInteraction);
                    break;
            }
        } catch (error) {
            console.error('Error en collector de planos:', error);
        }
    });
}

// Modal para agregar localización
async function mostrarModalAgregarLocalizacion(interaction: any) {
    const modal = new ModalBuilder()
        .setCustomId('modal_agregar_localizacion')
        .setTitle('➕ Agregar Nueva Localización');

    const nombreInput = new TextInputBuilder()
        .setCustomId('nombre_localizacion')
        .setLabel('Nombre de la Localización')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ej: Casa Vinewood Hills')
        .setRequired(true)
        .setMaxLength(100);

    const fotoInput = new TextInputBuilder()
        .setCustomId('foto_localizacion')
        .setLabel('URL de la Foto (Opcional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://i.imgur.com/imagen.png')
        .setRequired(false);

    const disponibleInput = new TextInputBuilder()
        .setCustomId('disponible_localizacion')
        .setLabel('¿Disponible para fabricación? (si/no)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('si')
        .setRequired(false)
        .setMaxLength(2);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nombreInput);
    const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(fotoInput);
    const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(disponibleInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

    await interaction.showModal(modal);

    // Manejar envío del modal
    try {
        const modalSubmit = await interaction.awaitModalSubmit({
            time: 300_000,
            filter: (i: any) => i.customId === 'modal_agregar_localizacion'
        });

        const nombre = modalSubmit.fields.getTextInputValue('nombre_localizacion');
        const foto = modalSubmit.fields.getTextInputValue('foto_localizacion') || null;
        const disponibleTexto = modalSubmit.fields.getTextInputValue('disponible_localizacion') || 'si';
        const disponible = disponibleTexto.toLowerCase() === 'si' || disponibleTexto.toLowerCase() === 'sí';

        // Crear la localización con la disponibilidad correcta desde el inicio
        const id = await db.crearLocalizacion(nombre, foto || undefined, disponible);

        if (id > 0) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle('✅ Localización Creada')
                .setDescription(`**${nombre}** ha sido agregada correctamente.`)
                .addFields(
                    { name: '🆔 ID', value: id.toString(), inline: true },
                    { name: '✅ Disponible', value: disponible ? 'Sí' : 'No', inline: true }
                );

            if (foto) {
                successEmbed.setThumbnail(foto);
            }

            await modalSubmit.reply({ embeds: [successEmbed] });
        } else {
            await modalSubmit.reply({
                content: '❌ Error: No se pudo crear la localización. Posiblemente ya existe.',
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Error en modal de localización:', error);
    }
}

// Modal para agregar plano
async function mostrarModalAgregarPlano(interaction: any) {
    const modal = new ModalBuilder()
        .setCustomId('modal_agregar_plano')
        .setTitle('➕ Agregar Nuevo Plano');

    const nombreInput = new TextInputBuilder()
        .setCustomId('nombre_plano')
        .setLabel('Nombre del Plano')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ej: Plano Vangelico')
        .setRequired(true)
        .setMaxLength(100);

    const duracionInput = new TextInputBuilder()
        .setCustomId('duracion_plano')
        .setLabel('Duración en Minutos')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('60')
        .setRequired(true)
        .setMaxLength(4);

    const iconoInput = new TextInputBuilder()
        .setCustomId('icono_plano')
        .setLabel('URL del Icono (Opcional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://i.imgur.com/icono.png')
        .setRequired(false);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(nombreInput);
    const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(duracionInput);
    const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(iconoInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

    await interaction.showModal(modal);

    // Manejar envío del modal
    try {
        const modalSubmit = await interaction.awaitModalSubmit({
            time: 300_000,
            filter: (i: any) => i.customId === 'modal_agregar_plano'
        });

        const nombre = modalSubmit.fields.getTextInputValue('nombre_plano');
        const duracionTexto = modalSubmit.fields.getTextInputValue('duracion_plano');
        const icono = modalSubmit.fields.getTextInputValue('icono_plano') || null;
        
        const duracion = parseInt(duracionTexto);
        
        if (isNaN(duracion) || duracion < 1 || duracion > 1440) {
            await modalSubmit.reply({
                content: '❌ Error: La duración debe ser un número entre 1 y 1440 minutos.',
                ephemeral: true
            });
            return;
        }

        const id = await db.crearPlano(nombre, duracion, icono || undefined);

        if (id > 0) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle('✅ Plano Creado')
                .setDescription(`**${nombre}** ha sido agregado correctamente.`)
                .addFields(
                    { name: '🆔 ID', value: id.toString(), inline: true },
                    { name: '⏱️ Duración', value: `${duracion} minutos`, inline: true }
                );

            if (icono) {
                successEmbed.setThumbnail(icono);
            }

            await modalSubmit.reply({ embeds: [successEmbed] });
        } else {
            await modalSubmit.reply({
                content: '❌ Error: No se pudo crear el plano. Posiblemente ya existe.',
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Error en modal de plano:', error);
    }
}

// Funciones adicionales para menús de edición y listados
async function mostrarMenuEditarLocalizacion(interaction: any) {
    const localizaciones = await db.obtenerTodasLasLocalizaciones();
    
    if (localizaciones.length === 0) {
        await interaction.reply({
            content: '❌ No hay localizaciones para editar.',
            ephemeral: true
        });
        return;
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_editar_localizacion')
        .setPlaceholder('Selecciona una localización para editar')
        .addOptions(
            localizaciones.slice(0, 25).map(loc =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(loc.nombre)
                    .setDescription(`${loc.disponible_para_fabricacion ? '✅ Disponible' : '❌ No disponible'}`)
                    .setValue(loc.id.toString())
                    .setEmoji(loc.disponible_para_fabricacion ? '📍' : '🚫')
            )
        );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.update({
        content: '🖱️ Selecciona una localización para editar:',
        embeds: [],
        components: [row]
    });
}

async function mostrarMenuEditarPlano(interaction: any) {
    const planos = await db.obtenerPlanos();
    
    if (planos.length === 0) {
        await interaction.reply({
            content: '❌ No hay planos para editar.',
            ephemeral: true
        });
        return;
    }

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_editar_plano')
        .setPlaceholder('Selecciona un plano para editar')
        .addOptions(
            planos.slice(0, 25).map(plano =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(plano.nombre)
                    .setDescription(`${plano.duracion_minutos} minutos`)
                    .setValue(plano.id.toString())
                    .setEmoji('📋')
            )
        );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.update({
        content: '🖱️ Selecciona un plano para editar:',
        embeds: [],
        components: [row]
    });
}

async function mostrarListaLocalizaciones(interaction: any) {
    const localizaciones = await db.obtenerTodasLasLocalizaciones();
    
    const embed = new EmbedBuilder()
        .setColor('#5865F2') 
        .setTitle('📍 Lista de Localizaciones')
        .setDescription(`Total: **${localizaciones.length}** localizaciones\n💡 Haz clic en 🗑️ para eliminar una localización`)
        .setTimestamp();

    if (localizaciones.length === 0) {
        embed.addFields({ name: 'Sin datos', value: 'No hay localizaciones registradas.' });
        await interaction.update({ embeds: [embed], components: [] });
        return;
    }

    // Crear botones para cada localización (máximo 25 por las limitaciones de Discord)
    const localizacionesLimitadas = localizaciones.slice(0, 25);
    const components = [];

    // Dividir en grupos de 5 botones por fila (límite de Discord)
    for (let i = 0; i < localizacionesLimitadas.length; i += 5) {
        const chunk = localizacionesLimitadas.slice(i, i + 5);
        const row = new ActionRowBuilder<ButtonBuilder>();

        for (const loc of chunk) {
            const disponible = loc.disponible_para_fabricacion ? '✅' : '❌';
            const button = new ButtonBuilder()
                .setCustomId(`eliminar_loc_${loc.id}`)
                .setLabel(`🗑️ ${loc.nombre}`)
                .setStyle(ButtonStyle.Danger);

            row.addComponents(button);
        }
        components.push(row);
    }

    // Agregar información de las localizaciones al embed
    const lista = localizaciones.map(loc => {
        const disponible = loc.disponible_para_fabricacion ? '✅ Disponible' : '❌ No disponible';
        return `**${loc.nombre}** (ID: ${loc.id})\n${disponible}`;
    }).join('\n\n');

    embed.addFields({ 
        name: 'Localizaciones:', 
        value: lista.length > 1024 ? lista.substring(0, 1021) + '...' : lista 
    });

    if (localizaciones.length > 25) {
        embed.setFooter({ text: `Mostrando las primeras 25 de ${localizaciones.length} localizaciones` });
    }

    await interaction.update({ embeds: [embed], components: components });
}

async function mostrarListaPlanos(interaction: any) {
    const planos = await db.obtenerPlanos();
    
    const embed = new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('📋 Lista de Planos')
        .setDescription(`Total: **${planos.length}** planos\n💡 Haz clic en 🗑️ para eliminar un plano`)
        .setTimestamp();

    if (planos.length === 0) {
        embed.addFields({ name: 'Sin datos', value: 'No hay planos registrados.' });
        await interaction.update({ embeds: [embed], components: [] });
        return;
    }

    // Crear botones para cada plano (máximo 25 por las limitaciones de Discord)
    const planosLimitados = planos.slice(0, 25);
    const components = [];

    // Dividir en grupos de 5 botones por fila (límite de Discord)
    for (let i = 0; i < planosLimitados.length; i += 5) {
        const chunk = planosLimitados.slice(i, i + 5);
        const row = new ActionRowBuilder<ButtonBuilder>();

        for (const plano of chunk) {
            const button = new ButtonBuilder()
                .setCustomId(`eliminar_plano_${plano.id}`)
                .setLabel(`�️ ${plano.nombre}`)
                .setStyle(ButtonStyle.Danger);

            row.addComponents(button);
        }
        components.push(row);
    }

    // Agregar información de los planos al embed
    const lista = planos.map(plano => 
        `**${plano.nombre}** - ${plano.duracion_minutos} minutos (ID: ${plano.id})`
    ).join('\n\n');

    embed.addFields({ 
        name: 'Planos:', 
        value: lista.length > 1024 ? lista.substring(0, 1021) + '...' : lista 
    });

    if (planos.length > 25) {
        embed.setFooter({ text: `Mostrando los primeros 25 de ${planos.length} planos` });
    }

    await interaction.update({ embeds: [embed], components: components });
}

async function mostrarEstadisticas(interaction: any) {
    const localizaciones = await db.obtenerTodasLasLocalizaciones();
    const planos = await db.obtenerPlanos();
    const fabricaciones = await db.obtenerFabricaciones();
    
    const localizacionesDisponibles = localizaciones.filter(loc => loc.disponible_para_fabricacion).length;
    const fabricacionesActivas = fabricaciones.filter(fab => !fab.recogido).length;
    
    const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle('📊 Estadísticas del Sistema')
        .addFields(
            { name: '📍 Localizaciones', value: `${localizaciones.length} total\n${localizacionesDisponibles} disponibles`, inline: true },
            { name: '📋 Planos', value: `${planos.length} registrados`, inline: true },
            { name: '🏭 Fabricaciones', value: `${fabricaciones.length} total\n${fabricacionesActivas} activas`, inline: true }
        )
        .setTimestamp();

    await interaction.update({ embeds: [embed], components: [] });
}

// Función para mostrar menú de eliminación de localizaciones
async function mostrarMenuEliminarLocalizacion(interaction: any) {
    const localizaciones = await db.obtenerTodasLasLocalizaciones();
    
    if (localizaciones.length === 0) {
        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('❌ Sin Localizaciones')
            .setDescription('No hay localizaciones para eliminar.')
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });
        return;
    }

    const options = localizaciones.map(loc => ({
        label: loc.nombre,
        value: loc.id.toString(),
        description: `ID: ${loc.id} | ${loc.disponible_para_fabricacion ? '✅ Disponible' : '❌ No disponible'}`,
        emoji: '📍'
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_eliminar_localizacion')
        .setPlaceholder('🗑️ Selecciona una localización para eliminar...')
        .addOptions(options.slice(0, 25));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('🗑️ Eliminar Localización')
        .setDescription('⚠️ **ADVERTENCIA**: Esta acción no se puede deshacer.\n\nNo podrás eliminar localizaciones que tengan fabricaciones activas.')
        .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row] });
}

// Función para mostrar menú de eliminación de planos
async function mostrarMenuEliminarPlano(interaction: any) {
    const planos = await db.obtenerPlanos();
    
    if (planos.length === 0) {
        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('❌ Sin Planos')
            .setDescription('No hay planos para eliminar.')
            .setTimestamp();

        await interaction.update({ embeds: [embed], components: [] });
        return;
    }

    const options = planos.map(plano => ({
        label: plano.nombre,
        value: plano.id.toString(),
        description: `ID: ${plano.id} | Duración: ${plano.duracion_minutos} min`,
        emoji: '📋'
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_eliminar_plano')
        .setPlaceholder('🗑️ Selecciona un plano para eliminar...')
        .addOptions(options.slice(0, 25));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(selectMenu);

    const embed = new EmbedBuilder()
        .setColor('#FF6B6B')
        .setTitle('🗑️ Eliminar Plano')
        .setDescription('⚠️ **ADVERTENCIA**: Esta acción no se puede deshacer.\n\nNo podrás eliminar planos que tengan fabricaciones activas.')
        .setTimestamp();

    await interaction.update({ embeds: [embed], components: [row] });
}
