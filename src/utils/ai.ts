export interface AgendaEvent {
    id: string;
    title: string;
    date: Date;
    duration?: number; // in minutes
}

export const smartParse = (text: string): { type: 'create' | 'cancel' | 'edit' | 'unknown', event?: Partial<AgendaEvent> } => {
    const lowercaseText = text.toLowerCase();

    // Initialize target storage
    let targetDate = new Date();

    // 1. Day logic first
    const dayWords: { [key: string]: number } = {
        'um': 1, 'primeiro': 1, 'dois': 2, 'três': 3, 'quatro': 4, 'cinco': 5,
        'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10
    };

    if (lowercaseText.includes('amanhã')) {
        targetDate.setDate(targetDate.getDate() + 1);
    } else if (lowercaseText.includes('hoje')) {
        // Keep today
    } else {
        // Check for "dia X" (number) or written number
        const dayMatch = lowercaseText.match(/dia (\d{1,2})/);
        if (dayMatch) {
            const day = parseInt(dayMatch[1]);
            const currentDay = new Date().getDate();
            targetDate.setDate(day);

            // If the day is earlier than today, assume it's for next month
            if (day < currentDay) {
                targetDate.setMonth(targetDate.getMonth() + 1);
            }
        } else {
            // Check for written days like "dia cinco"
            for (const [word, val] of Object.entries(dayWords)) {
                if (lowercaseText.includes(`dia ${word}`)) {
                    targetDate.setDate(val);
                    if (val < new Date().getDate()) {
                        targetDate.setMonth(targetDate.getMonth() + 1);
                    }
                    break;
                }
            }
        }
    }

    // 2. Time logic
    const timeRegex = /(?:às|as|da[ns]|para\s+as?)\s*(\d{1,2})(?:[h:](\d{2})?|(?:\s*horas))|(\d{1,2})[h:](\d{2})|(\d{1,2})h(?!\d)/;
    const timeMatch = lowercaseText.match(timeRegex);

    if (timeMatch) {
        const hours = parseInt(timeMatch[1] || timeMatch[3] || timeMatch[5]);
        const minutes = parseInt(timeMatch[2] || timeMatch[4] || '0');

        targetDate.setHours(hours);
        targetDate.setMinutes(minutes);
        targetDate.setSeconds(0);
        targetDate.setMilliseconds(0);
    }

    // Improved intent detection: include typos and direct nouns
    const intentRegex = /(marcar|agendar|marque|maque|agenda|novo compromisso|reunião|consulta|compromisso|lembrete)/;
    const createMatch = lowercaseText.match(intentRegex);

    if (createMatch) {
        let title = "Compromisso";
        if (lowercaseText.includes('reunião')) title = "Reunião";
        if (lowercaseText.includes('consulta')) title = "Consulta Médica";

        const titleMatch = text.match(/(?:marcar|agendar|marque|maque|agenda)\s+(?:um[a]?\s+)?(.*?)(?:\s+amanhã|\s+hoje|\s+às|\s+as|\s+dia|$)/i);
        if (titleMatch && titleMatch[1]) {
            title = titleMatch[1];
        }

        return {
            type: 'create',
            event: {
                title: title.charAt(0).toUpperCase() + title.slice(1),
                date: targetDate
            }
        };
    }

    return { type: 'unknown' };
};

export const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.speak(utterance);
};
