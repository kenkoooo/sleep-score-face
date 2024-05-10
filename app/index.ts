import clock from "clock";
import document from "document";
import * as messaging from "messaging";
import { formatTime, formatDuration, formatDate } from "./format";
import { Message } from "../lib/types";

clock.granularity = "seconds";

const recentSleepList = document.getElementById("recentSleepList");
const dateText = document.getElementById("dateText");
const clockText = document.getElementById("clockText");
const remainingTimeText = document.getElementById("remainingTimeText");
const lastSleepText = document.getElementById("lastSleepText");

const state = {
  currentTime: new Date(),
  sleepGoalMinutes: 0,
  lastSleepEnd: new Date(),
  lastSleepMinutes: 0,
  sleepDebts: [] as string[],
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
  state.sleepDebts = data.sleepDebts;
  syncLabel();
};

const syncLabel = () => {
  const remainingSeconds = calcRemainingSeconds(
    state.currentTime,
    state.lastSleepEnd,
    state.sleepGoalMinutes,
    state.lastSleepMinutes
  );
  const remainingLabel = formatDuration(remainingSeconds);
  if (remainingTimeText) {
    remainingTimeText.text = `${remainingLabel}`;
  }
  if (clockText) {
    clockText.text = formatTime(state.currentTime);
  }
  if (dateText) {
    dateText.text = formatDate(state.currentTime);
  }
  if (recentSleepList) {
    recentSleepList.text = state.sleepDebts.join("  ");
  }
  if (lastSleepText) {
    const hour = Math.floor((state.lastSleepMinutes / 60) * 10) / 10;
    lastSleepText.text = `Last sleep: ${hour}h`;
  }
};

const calcRemainingSeconds = (
  currentTime: Date,
  lastSleepEnd: Date,
  sleepGoalMinutes: number,
  lastSleepMinutes: number
) => {
  const dayTimeMinutes = 24 * 60 - sleepGoalMinutes;
  const elapsedSeconds = Math.max(
    Math.floor((currentTime.getTime() - lastSleepEnd.getTime()) / 1000),
    0
  );
  const debtMinutes = Math.max(sleepGoalMinutes - lastSleepMinutes, 0);
  const remainingSeconds =
    dayTimeMinutes * 60 - debtMinutes * 60 - elapsedSeconds;
  return remainingSeconds;
};
