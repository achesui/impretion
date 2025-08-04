// Función para formatear la fecha en español
export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Función para formatear la hora
export function formatTime(timeString: string) {
  const [hour, minute] = timeString.split(':');
  const hourNum = parseInt(hour);
  const ampm = hourNum >= 12 ? 'PM' : 'AM';
  const displayHour = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
  return `${displayHour}:${minute} ${ampm}`;
};

export function formatPhone(phone: string) {
  return phone.startsWith("+57") ? phone.slice(3) : phone;
}

export function cleanIndentation(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}