export const stripCitations = (text) => { // HUTTLE: sanitized
  if (!text) return ''; // HUTTLE: sanitized
  return text.replace(/\[\d+\]/g, '').trim(); // HUTTLE: sanitized
}; // HUTTLE: sanitized

export const stripMarkdown = (text) => { // HUTTLE: sanitized
  if (!text) return ''; // HUTTLE: sanitized
  return text // HUTTLE: sanitized
    .replace(/\*\*(.*?)\*\*/g, '$1') // HUTTLE: sanitized
    .replace(/\*(.*?)\*/g, '$1') // HUTTLE: sanitized
    .replace(/__(.*?)__/g, '$1') // HUTTLE: sanitized
    .replace(/_(.*?)_/g, '$1') // HUTTLE: sanitized
    .replace(/#{1,6}\s/g, '') // HUTTLE: sanitized
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // HUTTLE: sanitized
    .trim(); // HUTTLE: sanitized
}; // HUTTLE: sanitized

export const sanitizeAIOutput = (text) => { // HUTTLE: sanitized
  if (!text) return ''; // HUTTLE: sanitized
  return stripMarkdown(stripCitations(text)) // HUTTLE: sanitized
    .replace(/\s{2,}/g, ' ') // HUTTLE: sanitized
    .replace(/\n{3,}/g, '\n\n') // HUTTLE: sanitized
    .trim(); // HUTTLE: sanitized
}; // HUTTLE: sanitized
