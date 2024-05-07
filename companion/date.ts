export const subDays = (date: Date, days: number) => {
  const timestamp = date.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return new Date(timestamp - days * oneDay);
};

export const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0];
};
