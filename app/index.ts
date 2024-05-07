import clock from "clock";
import document from "document";
import * as messaging from "messaging";
import { formatDate, formatDuration } from "./format";

type Message = {
  sleepGoal: number | null;
  sleep: { minutes: number; endTime: string } | null;
};

clock.granularity = "seconds";

const clockText = document.getElementById("clockText");
const remainingTimeText = document.getElementById("remainingTimeText");
const lastSleepText = document.getElementById("lastSleepText");

const state = {
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
  if (data.sleepGoal) {
    state.sleepGoalMinutes = data.sleepGoal;
  }
  if (data.sleep) {
    state.lastSleepEnd = new Date(data.sleep.endTime);
    state.lastSleepMinutes = data.sleep.minutes;
  }
  syncLabel();
};

const syncLabel = () => {
  const dayTimeMinutes = 24 * 60 - state.sleepGoalMinutes;
  const elapsedSeconds = Math.max(
    Math.floor(
      (state.currentTime.getTime() - state.lastSleepEnd.getTime()) / 1000
    ),
    0
  );
  const remainingLabel = formatDuration(dayTimeMinutes * 60 - elapsedSeconds);
  const lastSleepLabel = Math.round((state.lastSleepMinutes / 60) * 10) / 10;
  if (remainingTimeText) {
    remainingTimeText.text = `${remainingLabel}`;
  }
  if (lastSleepText) {
    lastSleepText.text = `Last Sleep: ${lastSleepLabel} hrs`;
  }
  if (clockText) {
    clockText.text = formatDate(state.currentTime);
  }
};
