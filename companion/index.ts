import * as messaging from "messaging";
import { settingsStorage } from "settings";
import { formatDate, subDays } from "./date";
import { me as companion } from "companion";
import { CLIENT_ID, CLIENT_SECRET } from "../lib/env";

const fetchSleepGoal = async (accessToken: string): Promise<number | null> => {
  const response = await fetch(
    "https://api.fitbit.com/1.2/user/-/sleep/goal.json",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (response.status !== 200) {
    console.error("[FETCH]: " + response.status);

    const body = await response.text();
    console.error("[FETCH]: " + body);
    return null;
  }

  const data: { goal?: { minDuration?: number } } = await response.json();
  return data?.goal?.minDuration || null;
};

const fetchLatestSleep = async (accessToken: string) => {
  const today = new Date();
  const recent = subDays(today, 7);
  const afterDate = formatDate(recent);
  const url = `https://api.fitbit.com/1.2/user/-/sleep/list.json?afterDate=${afterDate}&sort=desc&offset=0&limit=100`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  type SleepResponse = { sleep: { minutesAsleep: number; endTime: string }[] };
  const data: SleepResponse = await response.json();
  if (data.sleep.length === 0) {
    return null;
  }

  const sleep = data.sleep[0];
  const endTime = new Date(sleep.endTime);
  const fixedTime = new Date(endTime.getTime());

  return {
    minutes: sleep.minutesAsleep,
    endTime: fixedTime.toISOString(),
  };
};

const refreshAccessToken = async (refreshToken: string) => {
  console.log("refreshing accessToken ...");
  const response = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
    },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`,
  });
  const body = await response.text();

  if (response.status !== 200) {
    console.error("[FETCH]: " + response.status);
    console.error("[FETCH]: " + body);
    return null;
  }

  return body;
};

const syncState = async (accessToken: string) => {
  console.log("[FETCH]: Syncing state ...");
  try {
    const sleepGoal = await fetchSleepGoal(accessToken);
    const sleep = await fetchLatestSleep(accessToken);
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
      messaging.peerSocket.send({ sleepGoal, sleep });
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
        const newValue = await refreshAccessToken(data?.refreshToken);
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
companion.addEventListener("wakeinterval", refreshState);

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
