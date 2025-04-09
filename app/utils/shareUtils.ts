import { Linking } from "react-native";

interface CauseDetails {
  id: string;
  name: string;
  date: string;
  time: string;
  organizationName?: string;
  city?: string;
  description?: string;
  maxParticipants?: number;
  registeredCount?: number;
}

type CauseType = 'new' | 'upcoming' | 'past';

export const formatCauseDetails = (cause: CauseDetails): string => {
  return `
Event: ${cause.name}
Date: ${cause.date}
Time: ${cause.time}
Location: ${cause.city || ""}
Organization: ${cause.organizationName || ""}

Description:
${cause.description || ""}
`;
};

export const shareCauseViaEmail = (cause: CauseDetails, type: CauseType) => {
  let subject = "";
  let body = "";

  switch (type) {
    case "new":
      subject = `Join me for ${cause.name}!`;
      body = `Hi,\n\nI found this interesting volunteer opportunity and thought you might be interested:\n\n${formatCauseDetails(cause)}`;
      break;
    case "upcoming":
      subject = `Join me in volunteering for ${cause.name}!`;
      body = `Hi,\n\nLook, I am participating in this cause:\n\n${formatCauseDetails(cause)}\n\nCome join me!`;
      break;
    case "past":
      subject = `My volunteering experience at ${cause.name}`;
      body = `Hi,\n\nI participated in this cause:\n\n${formatCauseDetails(cause)}`;
      break;
  }

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  Linking.openURL(mailtoUrl);
};

// Format time to Malaysian time without PT suffix
export const formatMalaysianTime = (time: string): string => {
  // Remove "PT" suffix if it exists
  return time.replace(" PT", "");
};

// Add a default export that includes all the functions
const shareUtils = {
  formatCauseDetails,
  shareCauseViaEmail,
};

export default shareUtils; 