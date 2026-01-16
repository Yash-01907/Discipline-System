export const formatTime = (hour: number, minute: number): string => {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
};

export const formatTimeFor24Hour = (hour: number, minute: number): string => {
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
};
