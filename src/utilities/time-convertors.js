function createTick(){
  const date = new Date();
  const epochOffset = 621355968000000000; 
  const ticksPerMillisecond = 10000;

  // Get the local time zone offset in minutes, convert it to milliseconds
  const timezoneOffsetInMilliseconds = date.getTimezoneOffset() * 60 * 1000;

  // Adjust the date to local time by subtracting the timezone offset
  const localTimeInMilliseconds = date.getTime() - timezoneOffsetInMilliseconds;

  // Calculate ticks with the adjusted local time
  const ticks = localTimeInMilliseconds * ticksPerMillisecond + epochOffset;

  return ticks.toString();
}

function formatDateWithMillisAndTimezone() {
  const date = new Date();

  // Format date in ISO format (YYYY-MM-DDTHH:mm:ss)
  const isoDate = date.toISOString().slice(0, -1); // Remove the trailing 'Z' from ISO string

  // Extract the milliseconds
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

  // Get the timezone offset in minutes and format it (+HH:mm or -HH:mm)
  const timezoneOffset = -date.getTimezoneOffset();
  const offsetHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, '0');
  const offsetMinutes = String(Math.abs(timezoneOffset) % 60).padStart(2, '0');
  const offsetSign = timezoneOffset >= 0 ? '+' : '-';

  const formattedOffset = `${offsetSign}${offsetHours}:${offsetMinutes}`;

  // Combine the parts to get the desired format
  const formattedDate = `${isoDate.replace(/\.\d+/, '')},${milliseconds}${formattedOffset}`;

  return formattedDate;
}

export default {
  createTick,
  formatDateWithMillisAndTimezone,
  };
