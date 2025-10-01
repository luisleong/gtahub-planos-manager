import { Client, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { RobosManager } from '../database/RobosManager';

export class MensajesRobosManager {
    mensajeMalandrosId?: string;
    mensajeRobosId?: string;

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
            // Actualizar solo el mensaje persistente de malandros
            const canal = interaction.channel as TextChannel;
            if (canal) {
                // Buscar el mensaje persistente de malandros
                // Si tienes el mensajeId guardado, pásalo aquí:
                await this.enviarMensajeMalandros(canal.id, this.mensajeMalandrosId);
            }
            await interaction.reply({ content: `✅ Malandro agregado: ${nombre}`, ephemeral: true });
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

        const fecha = new Date().toLocaleString('es-MX', { hour12: false });
        const embed = new EmbedBuilder()
            .setTitle('Marcaje de Robo')
            .setDescription('Marca tu robo y selecciona el malandro que lo realiza.')
            .setImage('https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/src/images/robotienda.jpeg')
            .setColor(0xFF4444)
            .setFooter({ text: `Última actualización: ${fecha}` })
            .setTimestamp();

        const marcarRoboBtn = new ButtonBuilder()
            .setCustomId('marcar_robo')
            .setLabel('Marcar Robo')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(marcarRoboBtn);

        let id = mensajeId;
        if (!id) {
            const info = await this.robosManager.obtenerMensajeRobos();
            if (info?.mensaje_id) id = info.mensaje_id;
        }
        if (id) {
            try {
                const mensaje = await canal.messages.fetch(id);
                await mensaje.edit({ embeds: [embed], components: [row] });
                this.mensajeRobosId = id;
            } catch (err: any) {
                if (err.code === 10008 || err.message?.includes('Unknown Message')) {
                    // El mensaje fue borrado, crear uno nuevo y actualizar el ID en la base
                    const nuevoMensaje = await canal.send({ embeds: [embed], components: [row] });
                    await this.robosManager.guardarMensajeRobos(nuevoMensaje.id, canal.id);
                    this.mensajeRobosId = nuevoMensaje.id;
                } else {
                    throw err;
                }
            }
        } else {
            const mensaje = await canal.send({ embeds: [embed], components: [row] });
            await this.robosManager.guardarMensajeRobos(mensaje.id, canal.id);
            this.mensajeRobosId = mensaje.id;
        }
    }

    /**
     * Envía o actualiza el mensaje persistente de malandros
     */
    async enviarMensajeMalandros(channelId: string, mensajeId?: string): Promise<void> {
        const canal = await this.client.channels.fetch(channelId) as TextChannel;
        if (!canal) throw new Error('Canal de malandros no encontrado');

        const malandros = await this.robosManager.obtenerMalandros();
        let listos: string[] = [];
        let cooldown: string[] = [];
        for (const m of malandros) {
            let estatus = 'A robar!';
            let emoji = '🟢';
            let barra = '██████████';
            let minutosRestantes = 0;
            let minutos = 0;
            const ultimoRobo = await this.robosManager.obtenerUltimoRobo(m.id);
            if (ultimoRobo && ultimoRobo.fecha_robo) {
                const fechaUltimo = new Date(ultimoRobo.fecha_robo).getTime();
                const ahora = Date.now();
                minutos = (ahora - fechaUltimo) / 60000;
                minutosRestantes = Math.max(0, 35 - minutos);
                if (minutos < 5) {
                    estatus = 'Escondete!';
                    emoji = '🔴';
                    barra = '█---------';
                    cooldown.push(`• ${m.nombre} ${emoji} [${barra}] (${estatus}) — faltan ${minutosRestantes.toFixed(1)} min`);
                    continue;
                } else if (minutos < 35) {
                    estatus = 'No robes aun!';
                    emoji = '🟡';
                    // Barra de progreso proporcional a los 35 min
                    const blocks = Math.round((minutos/35)*10);
                    barra = '█'.repeat(blocks) + '-'.repeat(10-blocks);
                    cooldown.push(`• ${m.nombre} ${emoji} [${barra}] (${estatus}) — faltan ${minutosRestantes.toFixed(1)} min`);
                    continue;
                }
            }
            // Listos para robar
            barra = '██████████';
            listos.push(`• ${m.nombre} ${emoji} [${barra}] (${estatus})`);
        }
        if (malandros.length === 0) listos.push('No hay malandros registrados.');
        let lista = '';
        if (listos.length > 0) lista += '**Listos para robar**\n' + listos.join('\n') + '\n';
        if (cooldown.length > 0) lista += '\n**En cooldown**\n' + cooldown.join('\n') + '\n';
        const fecha = new Date().toLocaleString('es-MX', { hour12: false });
        const embed = new EmbedBuilder()
            .setTitle('Administrar Malandros')
            .setDescription(lista)
            .setImage('https://raw.githubusercontent.com/luisleong/gtahub-planos-manager/main/src/images/malandros.jpg')
            .setColor(0x5865F2)
            .setFooter({ text: `Última actualización: ${fecha}` })
            .setTimestamp();

        const agregarBtn = new ButtonBuilder()
            .setCustomId('agregar_malandro')
            .setLabel('Agregar Malandro')
            .setStyle(ButtonStyle.Success);
        const eliminarBtn = new ButtonBuilder()
            .setCustomId('eliminar_malandro')
            .setLabel('Eliminar Malandro')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(agregarBtn, eliminarBtn);

        let id = mensajeId;
        if (!id) {
            const info = await this.robosManager.obtenerMensajeMalandros();
            if (info?.mensaje_id) id = info.mensaje_id;
        }
        if (id) {
            try {
                const mensaje = await canal.messages.fetch(id);
                await mensaje.edit({ embeds: [embed], components: [row] });
                this.mensajeMalandrosId = id;
            } catch (err: any) {
                if (err.code === 10008 || err.message?.includes('Unknown Message')) {
                    // El mensaje fue borrado, crear uno nuevo y actualizar el ID en la base
                    const nuevoMensaje = await canal.send({ embeds: [embed], components: [row] });
                    await this.robosManager.guardarMensajeMalandros(nuevoMensaje.id, canal.id);
                    this.mensajeMalandrosId = nuevoMensaje.id;
                } else {
                    throw err;
                }
            }
        } else {
            const mensaje = await canal.send({ embeds: [embed], components: [row] });
            await this.robosManager.guardarMensajeMalandros(mensaje.id, canal.id);
            this.mensajeMalandrosId = mensaje.id;
        }
    }
    /**
     * Actualiza automáticamente los mensajes persistentes cada minuto
     */
    iniciarActualizacionesAutomaticas(channelId: string) {
        setInterval(async () => {
            await this.enviarMensajeRobos(channelId);
            await this.enviarMensajeMalandros(channelId);
        }, 60000);
    }
}
