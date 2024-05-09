const zeroPad = (i: number) => {
  if (i < 10) {
    return `0${i}`;
  }
  return i.toString();
};
export const formatDuration = (seconds: number) => {
  const sum = Math.abs(seconds);
  const hours = Math.floor(sum / 3600);
  const minutes = Math.floor((sum % 3600) / 60);
  const secs = sum % 60;

  const hh = zeroPad(hours);
  const mm = zeroPad(minutes);
  const ss = zeroPad(secs);

  if (seconds >= 0) {
    return `${hh}:${mm}:${ss}`;
  } else {
    return `-${hh}:${mm}:${ss}`;
  }
};

export const formatTime = (date: Date) => {
  const hours = zeroPad(date.getHours());
  let minutes = zeroPad(date.getMinutes());
  return `${hours}:${minutes}`;
};

export const formatDate = (date: Date) => {
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ] as const;
  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  return `${month} ${day}`;
};
