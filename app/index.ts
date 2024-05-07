import clock from "clock";
import document from "document";
import * as messaging from "messaging";

type Message = {
  sleepGoal: number;
  sleep: { minutes: number; endTime: string } | null;
};

clock.granularity = "minutes";

const clockText = document.getElementById("clockText");
const sleepText = document.getElementById("sleepText");

let state = {
  currentTime: new Date(),
  sleepGoalMinutes: 0,
  lastSleepEnd: new Date(),
  lastSleepMinutes: 0,
};

clock.ontick = (evt) => {
  state.currentTime = evt.date;
  syncLabel();
};

messaging.peerSocket.onmessage = (evt) => {
  const data: Message = evt.data;
  state.sleepGoalMinutes = data.sleepGoal;
  if (data.sleep) {
    state.lastSleepEnd = new Date(data.sleep.endTime);
    state.lastSleepMinutes = data.sleep.minutes;
  }
  syncLabel();
};

const syncLabel = () => {
  const dayTimeMinutes = 24 * 60 - state.sleepGoalMinutes;
  const elapsedMinutes = Math.max(
    (state.currentTime.getTime() - state.lastSleepEnd.getTime()) / 60000,
    0
  );
  const remainingMinutes = Math.max(dayTimeMinutes - elapsedMinutes, 0);
  const remainingLabel = formatDuration(remainingMinutes);
  const lastSleepLabel = Math.round((state.lastSleepMinutes / 60) * 10) / 10;
  sleepText.text = `${remainingLabel} / ${lastSleepLabel} hrs`;

  clockText.text = formatDate(state.currentTime);
};

const zeroPad = (i: number) => {
  if (i < 10) {
    return `0${i}`;
  }
  return i.toString();
};
const formatDuration = (minutes: number) => {
  const remainingHours = zeroPad(Math.floor(minutes / 60));
  const remainingMinutes = zeroPad(minutes % 60);
  return `${remainingHours}:${remainingMinutes}`;
};

const formatDate = (date: Date) => {
  const hours = zeroPad(date.getHours());
  let minutes = zeroPad(date.getMinutes());
  return `${hours}:${minutes}`;
};
