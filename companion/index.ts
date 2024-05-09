import * as messaging from "messaging";
import { settingsStorage } from "settings";
import {
  fetchLatestSleep,
  fetchRecentSleepAdvantages,
  fetchSleepGoal,
  refreshAccessToken,
} from "./api";
import { me as companion } from "companion";
import { Message } from "../lib/types";

const syncState = async (accessToken: string) => {
  console.log("[FETCH]: Syncing state ...");
  try {
    const sleepGoal = await fetchSleepGoal(accessToken);
    const sleep = await fetchLatestSleep(accessToken);
    const sleepDebts = sleepGoal
      ? await fetchRecentSleepAdvantages(accessToken, sleepGoal, 5)
      : [];
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
      const message: Message = { sleepGoal, sleep, sleepDebts };
      messaging.peerSocket.send(message);
    }
  } catch (error) {
    console.error("[FETCH]: " + error);
  }
};

settingsStorage.onchange = async (evt) => {
  console.log("User logged in ...");
  if (evt.key === "oauth") {
    const data = safeParse(evt.newValue);
    if (data?.accessToken) {
      await syncState(data.accessToken);
    }
  }
};

const refreshState = async () => {
  console.log("Refreshing state ...");

  // Refresh accessToken
  for (let index = 0; index < settingsStorage.length; index++) {
    const key = settingsStorage.key(index);
    if (key === "oauth") {
      const item = settingsStorage.getItem("oauth");
      const data = safeParse(item);
      if (data?.refreshToken) {
        const newValue = await refreshAccessToken(data.refreshToken);
        if (newValue) {
          settingsStorage.setItem("oauth", newValue);
        }
      }
    }
  }

  // Refresh state
  for (let index = 0; index < settingsStorage.length; index++) {
    const key = settingsStorage.key(index);
    if (key === "oauth") {
      const item = settingsStorage.getItem("oauth");
      const data = safeParse(item);
      if (data?.accessToken) {
        await syncState(data.accessToken);
      }
    }
  }
};

// Message socket opens
messaging.peerSocket.onopen = () => {
  console.log("Open socket");
  refreshState();
};

companion.wakeInterval = 15 * 60 * 1000;
companion.addEventListener("wakeinterval", () => {
  console.log("Wake interval");
  refreshState();
});

const safeParse = (value: unknown) => {
  if (typeof value !== "string") {
    return;
  }
  try {
    const data: unknown = JSON.parse(value);

    const accessToken =
      hasOwnProperty(data, "access_token") &&
      typeof data.access_token === "string"
        ? data.access_token
        : undefined;
    const refreshToken =
      hasOwnProperty(data, "refresh_token") &&
      typeof data.refresh_token === "string"
        ? data.refresh_token
        : undefined;

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("JSON parse error", error);
  }
};

const hasOwnProperty = <K extends PropertyKey>(
  value: unknown,
  prop: K
): value is Record<K, unknown> => {
  if (typeof value !== "object" || !value) {
    return false;
  }
  return prop in value;
};
