import { Client, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { RobosManager } from '../database/RobosManager';

export class MensajesRobosManager {

    /**
     * Maneja interacciones de botones para robos/malandros
     */
    async handleButton(interaction: any, customId: string): Promise<void> {
        if (customId === 'marcar_robo') {
            // Mostrar select para elegir malandro y marcar robo
            const malandros = await this.robosManager.obtenerMalandros();
            if (malandros.length === 0) {
                await interaction.reply({ content: 'No hay malandros registrados.', ephemeral: true });
                return;
            }
            const select = {
                type: 3,
                customId: 'robo_select_malandro',
                options: malandros.map(m => ({ label: m.nombre, value: m.id.toString() })),
                placeholder: 'Selecciona el malandro que realizó el robo',
                minValues: 1,
                maxValues: 1
            };
            await interaction.reply({ content: 'Selecciona el malandro que realizó el robo:', components: [{ type: 1, components: [select] }], ephemeral: true });
            // Actualizar mensaje de robos (por si hay cambios)
            if (interaction.channel) {
                await this.enviarMensajeRobos(interaction.channel.id);
            }
        } else if (customId === 'agregar_malandro') {
            // Mostrar modal para agregar malandro
            const modal = {
                customId: 'modal_malandro_agregar',
                title: 'Agregar Malandro',
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 4,
                                customId: 'nombre_malandro',
                                label: 'Nombre del Malandro',
                                style: 1,
                                minLength: 2,
                                maxLength: 32,
                                required: true,
                                placeholder: 'Ejemplo: El Chino'
                            }
                        ]
                    }
                ]
            };
            await interaction.showModal(modal);
            // Actualizar mensaje de malandros
            if (interaction.channel) {
                await this.enviarMensajeMalandros(interaction.channel.id);
            }
        } else if (customId === 'eliminar_malandro') {
            // Mostrar select para eliminar malandro
            const malandros = await this.robosManager.obtenerMalandros();
            if (malandros.length === 0) {
                await interaction.reply({ content: 'No hay malandros registrados.', ephemeral: true });
                return;
            }
            const select = {
                type: 3,
                customId: 'malandro_select_eliminar',
                options: malandros.map(m => ({ label: m.nombre, value: m.id.toString() })),
                placeholder: 'Selecciona el malandro a eliminar',
                minValues: 1,
                maxValues: 1
            };
            await interaction.reply({ content: 'Selecciona el malandro a eliminar:', components: [{ type: 1, components: [select] }], ephemeral: true });
            // Actualizar mensaje de malandros
            if (interaction.channel) {
                await this.enviarMensajeMalandros(interaction.channel.id);
            }
        } else {
            await interaction.reply({ content: 'Acción de botón no reconocida.', ephemeral: true });
        }
    }

    /**
     * Maneja interacciones de select menu para robos/malandros
     */
    async handleSelectMenu(interaction: any, customId: string, selectedValue: string): Promise<void> {
        if (customId === 'robo_select_malandro') {
            // Marcar robo con el malandro seleccionado
            const malandroId = parseInt(selectedValue);
            await this.robosManager.marcarRobo(malandroId);
            await interaction.update({ content: `✅ Robo marcado para el malandro seleccionado.`, components: [] });
            // Actualizar mensaje de robos
            if (interaction.channel) {
                await this.enviarMensajeRobos(interaction.channel.id);
            }
        } else if (customId === 'malandro_select_eliminar') {
            // Eliminar malandro seleccionado
            const malandroId = parseInt(selectedValue);
            await this.robosManager.eliminarMalandro(malandroId);
            await interaction.update({ content: `✅ Malandro eliminado correctamente.`, components: [] });
            // Actualizar mensaje de malandros
            if (interaction.channel) {
                await this.enviarMensajeMalandros(interaction.channel.id);
            }
        } else {
            await interaction.reply({ content: `Select menu: ${customId}, valor: ${selectedValue} no reconocido.`, ephemeral: true });
        }
    }

    /**
     * Maneja interacciones de modal para robos/malandros
     */
    async handleModal(interaction: any, customId: string): Promise<void> {
        if (customId === 'modal_malandro_agregar') {
            const nombre = interaction.fields.getTextInputValue('nombre_malandro');
            await this.robosManager.agregarMalandro(nombre);
            await interaction.reply({ content: `✅ Malandro agregado: ${nombre}`, ephemeral: true });
            // Actualizar mensaje de malandros
            if (interaction.channel) {
                await this.enviarMensajeMalandros(interaction.channel.id);
            }
        } else {
            await interaction.reply({ content: `Modal: ${customId} no reconocido.`, ephemeral: true });
        }
    }
    private client: Client;
    private robosManager: RobosManager;

    constructor(client: Client, robosManager: RobosManager) {
        this.client = client;
        this.robosManager = robosManager;
    }

    /**
     * Envía o actualiza el mensaje persistente de robos
     */
    async enviarMensajeRobos(channelId: string, mensajeId?: string): Promise<void> {
        const canal = await this.client.channels.fetch(channelId) as TextChannel;
        if (!canal) throw new Error('Canal de robos no encontrado');

        const embed = new EmbedBuilder()
            .setTitle('Marcaje de Robo')
            .setDescription('Marca tu robo y selecciona el malandro que lo realiza.')
            .setImage('https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/src/images/robotienda.jpeg')
            .setColor(0xFF4444);

        const marcarRoboBtn = new ButtonBuilder()
            .setCustomId('marcar_robo')
            .setLabel('Marcar Robo')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(marcarRoboBtn);

        if (mensajeId) {
            const mensaje = await canal.messages.fetch(mensajeId);
            await mensaje.edit({ embeds: [embed], components: [row] });
        } else {
            await canal.send({ embeds: [embed], components: [row] });
        }
    }

    /**
     * Envía o actualiza el mensaje persistente de malandros
     */
    async enviarMensajeMalandros(channelId: string, mensajeId?: string): Promise<void> {
        const canal = await this.client.channels.fetch(channelId) as TextChannel;
        if (!canal) throw new Error('Canal de malandros no encontrado');

        const malandros = await this.robosManager.obtenerMalandros();
        const embed = new EmbedBuilder()
            .setTitle('Administrar Malandros')
            .setDescription('Lista de malandros disponibles para robos.')
            .setImage('https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/src/images/malandros.jpg')
            .setColor(0x5865F2)
            .addFields(malandros.map(m => ({ name: m.nombre, value: `ID: ${m.id}`, inline: true })));

        const agregarBtn = new ButtonBuilder()
            .setCustomId('agregar_malandro')
            .setLabel('Agregar Malandro')
            .setStyle(ButtonStyle.Success);
        const eliminarBtn = new ButtonBuilder()
            .setCustomId('eliminar_malandro')
            .setLabel('Eliminar Malandro')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(agregarBtn, eliminarBtn);

        if (mensajeId) {
            const mensaje = await canal.messages.fetch(mensajeId);
            await mensaje.edit({ embeds: [embed], components: [row] });
        } else {
            await canal.send({ embeds: [embed], components: [row] });
        }
    }
}
