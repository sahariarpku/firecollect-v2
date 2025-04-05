export interface MentionData {
  id: string;
  display: string;
  type: 'search' | 'pdf_batch' | 'zotero';
  timestamp: string;
}

export const parseMentions = (text: string): MentionData[] => {
  const mentions = text.match(/@(\w+):([a-zA-Z0-9-]+)/g) || [];
  return mentions.map(mention => {
    const [type, id] = mention.slice(1).split(':');
    const mentionType = type as 'search' | 'pdf_batch' | 'zotero';
    return {
      id,
      display: mention,
      type: mentionType,
      timestamp: new Date().toISOString()
    };
  });
}; 