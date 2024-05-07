import * as messaging from "messaging";
import { settingsStorage } from "settings";
import { formatDate, subDays } from "./date";
import { me as companion } from "companion";

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

settingsStorage.onchange = (evt) => {
  if (evt.key === "oauth") {
    const data = JSON.parse(evt.newValue);
    const accessToken = data.access_token;
    settingsStorage.setItem("oauth", data);
    syncState(accessToken);
  }
};

const refreshState = async () => {
  for (let index = 0; index < settingsStorage.length; index++) {
    const key = settingsStorage.key(index);
    if (key && key === "oauth") {
      const data = JSON.parse(settingsStorage.getItem(key));
      const accessToken = data.access_token;
      syncState(accessToken);
    }
  }
};

// Message socket opens
messaging.peerSocket.onopen = () => {
  refreshState();
};

companion.wakeInterval = 15 * 60 * 1000;
companion.addEventListener("wakeinterval", refreshState);
