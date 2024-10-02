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

export default createTick;
