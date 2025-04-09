import { Linking } from 'react-native';

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

export const shareCauseViaEmail = (cause: CauseDetails, type: CauseType) => {
  const subject = `Join me for ${cause.name} - Volunteer Connect`;
  
  let body = '';
  switch (type) {
    case 'new':
      body = `Hey! I found this amazing volunteer opportunity on Volunteer Connect:\n\n` +
        `${cause.name} with ${cause.organizationName}\n` +
        `Date: ${cause.date}\n` +
        `Time: ${cause.time}\n` +
        `Location: ${cause.city || 'TBD'}\n\n` +
        `Description:\n${cause.description || 'No description available'}\n\n` +
        `Be one of the first to join! There are ${cause.maxParticipants} spots available.\n\n` +
        `Join me in making a difference!`;
      break;
    case 'upcoming':
      body = `Hey! I'm volunteering for this great cause on Volunteer Connect:\n\n` +
        `${cause.name} with ${cause.organizationName}\n` +
        `Date: ${cause.date}\n` +
        `Time: ${cause.time}\n` +
        `Location: ${cause.city || 'TBD'}\n\n` +
        `Description:\n${cause.description || 'No description available'}\n\n` +
        `${cause.registeredCount || 0} people have already signed up!${
          cause.maxParticipants 
            ? ` There are still ${cause.maxParticipants - (cause.registeredCount || 0)} spots available.` 
            : ''
        }\n\n` +
        `Would you like to join me?`;
      break;
    case 'past':
      body = `Hey! I recently volunteered for this amazing cause on Volunteer Connect:\n\n` +
        `${cause.name} with ${cause.organizationName || 'an organization'}\n` +
        `It was on ${cause.date} at ${cause.time} in ${cause.city || 'the city'}\n\n` +
        `Description:\n${cause.description || 'No description available'}\n\n` +
        `${cause.registeredCount || 0} people participated in this event. Keep an eye out for similar opportunities!`;
      break;
  }

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  Linking.openURL(mailtoUrl).catch((err) => console.error('Failed to open email client:', err));
}; 