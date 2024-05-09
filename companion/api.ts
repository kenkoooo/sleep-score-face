import { CLIENT_ID, CLIENT_SECRET } from "../lib/env";
import { formatDate, subDays } from "./date";

export const fetchSleepGoal = async (
  accessToken: string
): Promise<number | null> => {
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

const fetchRecentSleeps = async (accessToken: string) => {
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

  type SleepResponse = {
    sleep: { minutesAsleep: number; endTime: string; isMainSleep: boolean }[];
  };
  const data: SleepResponse = await response.json();
  return data;
};

export const fetchRecentSleepAdvantages = async (
  accessToken: string,
  goalMinutes: number,
  limit: number
) => {
  const data = await fetchRecentSleeps(accessToken);
  const chargedSleepMinutes = data.sleep
    .filter((sleep) => sleep.isMainSleep)
    .slice(0, limit)
    .reverse()
    .map((sleep) => sleep.minutesAsleep - goalMinutes);
  return chargedSleepMinutes.map((minutes) => {
    const neg = minutes < 0;
    const hours = Math.round((Math.abs(minutes) / 60) * 10) / 10;
    if (neg) {
      return `-${hours}h`;
    } else {
      return `+${hours}h`;
    }
  });
};

export const fetchLatestSleep = async (accessToken: string) => {
  const data = await fetchRecentSleeps(accessToken);
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

export const refreshAccessToken = async (refreshToken: string) => {
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
