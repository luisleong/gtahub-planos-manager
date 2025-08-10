/**
 * Utilidades para crear barras de progreso visuales
 */

/**
 * Crear una barra de progreso visual
 * @param current - Valor actual (minutos transcurridos)
 * @param total - Valor total (duración total en minutos)
 * @param length - Longitud de la barra (número de caracteres)
 * @param style - Estilo de la barra ('blocks' | 'bars' | 'circles')
 * @returns String con la barra de progreso
 */
export function createProgressBar(
    current: number, 
    total: number, 
    length: number = 20, 
    style: 'blocks' | 'bars' | 'circles' = 'blocks'
): string {
    const percentage = Math.max(0, Math.min(100, (current / total) * 100));
    const filled = Math.round((percentage / 100) * length);
    const empty = length - filled;

    let filledChar = '█';
    let emptyChar = '░';

    switch (style) {
        case 'bars':
            filledChar = '▰';
            emptyChar = '▱';
            break;
        case 'circles':
            filledChar = '●';
            emptyChar = '○';
            break;
        case 'blocks':
        default:
            filledChar = '█';
            emptyChar = '░';
            break;
    }

    return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

/**
 * Formatear tiempo restante en formato legible
 * @param minutes - Minutos restantes
 * @returns String formateado (ej: "2h 30m", "45m", "Completado")
 */
export function formatTimeRemaining(minutes: number): string {
    if (minutes <= 0) {
        return 'Completado';
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
        return `${hours}h ${mins > 0 ? mins + 'm' : ''}`.trim();
    } else {
        return `${mins}m`;
    }
}

/**
 * Calcular minutos transcurridos desde un timestamp
 * @param timestamp - Timestamp de inicio (ISO string)
 * @returns Minutos transcurridos
 */
export function getElapsedMinutes(timestamp: string): number {
    const start = new Date(timestamp);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / 60000);
}

/**
 * Obtener información completa de progreso para una fabricación
 * @param timestampColocacion - Timestamp cuando se colocó el plano
 * @param duracionMinutos - Duración total en minutos
 * @returns Objeto con información de progreso
 */
export function getFabricacionProgress(timestampColocacion: string, duracionMinutos: number) {
    // ...
    
    const elapsed = getElapsedMinutes(timestampColocacion);
    const remaining = Math.max(0, duracionMinutos - elapsed);
    const percentage = Math.min(100, (elapsed / duracionMinutos) * 100);
    const isCompleted = elapsed >= duracionMinutos;

    // ...

    const progress = {
        elapsed,
        remaining,
        percentage: Math.round(percentage),
        isCompleted,
        progressBar: createProgressBar(elapsed, duracionMinutos, 15, 'blocks'),
        timeRemainingText: formatTimeRemaining(remaining)
    };

    // ...

    return progress;
}
