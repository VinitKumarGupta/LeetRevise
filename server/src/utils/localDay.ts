export function createLocalDayFormatter(timeZone: string) {
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        calendar: 'iso8601',
        numberingSystem: 'latn',
        timeZone,
    };
    let formatter: Intl.DateTimeFormat;
    try {
        formatter = new Intl.DateTimeFormat('sv-SE', options);
    } catch {
        formatter = new Intl.DateTimeFormat('sv-SE', { ...options, timeZone: 'UTC' });
    }
    return (date: Date) => formatter.format(date);
}

export function resolveSolveDate(solvedOn: string, timeZone: string, now: Date): Date | null {
    const formatDay = createLocalDayFormatter(timeZone);
    const today = formatDay(now);
    if (solvedOn > today) return null;
    if (solvedOn === today) return now;

    // Find when this calendar date starts in the chosen zone, including clock changes.
    const utcMidnight = Date.parse(`${solvedOn}T00:00:00Z`);
    const dayMs = 24 * 60 * 60 * 1000;
    let first = utcMidnight - dayMs;
    let last = utcMidnight + dayMs;
    while (first < last) {
        const middle = Math.floor((first + last) / 2);
        if (formatDay(new Date(middle)) < solvedOn) first = middle + 1;
        else last = middle;
    }

    const start = new Date(first);
    return formatDay(start) === solvedOn ? start : null;
}
