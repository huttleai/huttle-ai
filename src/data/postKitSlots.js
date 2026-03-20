export const PLATFORM_SLOTS = {
  instagram: [
    {
      key: 'opening_line',
      label: 'Opening line',
      helper: 'The first sentence your audience sees or hears. Use it as on-screen text or say it at the start of your video.',
      required: false
    },
    {
      key: 'caption',
      label: 'Caption',
      helper: "The text that goes in your post's caption field. This is what people read below your photo or video.",
      required: true
    },
    {
      key: 'hashtags',
      label: 'Hashtags',
      helper: 'Paste these at the end of your caption or in the first comment to help people discover your post.',
      required: false
    },
    {
      key: 'cta',
      label: 'Call to action',
      helper: 'Add this at the end of your caption. It tells your audience exactly what to do next (save, comment, DM you, etc).',
      required: false
    },
    {
      key: 'image_description',
      label: 'Image description',
      helper: 'Optional accessibility text that describes your visual content for screen readers.',
      required: false
    }
  ],
  tiktok: [
    {
      key: 'opening_line',
      label: 'Opening line',
      helper: 'The first thing you say in your video. This is what stops the scroll — say it out loud or add it as on-screen text.',
      required: false
    },
    {
      key: 'caption',
      label: 'Caption',
      helper: 'The text that goes in the caption field when you post your TikTok.',
      required: true
    },
    {
      key: 'hashtags',
      label: 'Hashtags',
      helper: 'Add these to your caption to help TikTok show your video to the right audience.',
      required: false
    },
    {
      key: 'cta',
      label: 'Call to action',
      helper: 'Tell viewers what to do — follow, comment, share, or visit your link in bio.',
      required: false
    }
  ],
  youtube: [
    {
      key: 'title',
      label: 'Video title',
      helper: 'The title that appears on your YouTube video. Keep it clear and searchable.',
      required: true
    },
    {
      key: 'description',
      label: 'Description',
      helper: "The text in your video's description box. Include keywords, links, and timestamps here.",
      required: true
    },
    {
      key: 'tags',
      label: 'Tags',
      helper: 'Keywords that help YouTube understand your video and recommend it. Separate each tag with a comma.',
      required: false
    },
    {
      key: 'opening_line',
      label: 'Opening line',
      helper: 'The first thing you say in your video. You have about 3 seconds to hook the viewer before they scroll.',
      required: false
    },
    {
      key: 'cta',
      label: 'Call to action',
      helper: 'What you say at the end — subscribe, like, comment, or check the link in the description.',
      required: false
    }
  ],
  twitter: [
    {
      key: 'post_text',
      label: 'Post text',
      helper: 'The actual text of your tweet or post on X. Keep it under 280 characters for a single post.',
      required: true
    },
    {
      key: 'hashtags',
      label: 'Hashtags',
      helper: 'Add 1-3 relevant hashtags. On X, less is more — too many looks spammy.',
      required: false
    },
    {
      key: 'cta',
      label: 'Call to action',
      helper: 'Tell people what to do — repost, reply, bookmark, or click your link.',
      required: false
    }
  ],
  linkedin: [
    {
      key: 'opening_line',
      label: 'Opening line',
      helper: 'The first 1-2 lines people see before they click "see more." Make it compelling enough to expand.',
      required: false
    },
    {
      key: 'post_body',
      label: 'Post body',
      helper: 'The main text of your LinkedIn post. This is where your story, insight, or lesson goes.',
      required: true
    },
    {
      key: 'hashtags',
      label: 'Hashtags',
      helper: 'Add 3-5 hashtags at the end. LinkedIn uses these to categorize and distribute your post.',
      required: false
    },
    {
      key: 'cta',
      label: 'Call to action',
      helper: 'End with a question or ask. LinkedIn rewards posts that start conversations in the comments.',
      required: false
    }
  ],
  facebook: [
    {
      key: 'opening_line',
      label: 'Opening line',
      helper: 'The first sentence of your post. Facebook truncates after a few lines, so lead with something that makes people click "See more."',
      required: false
    },
    {
      key: 'caption',
      label: 'Caption',
      helper: 'The main text of your Facebook post.',
      required: true
    },
    {
      key: 'hashtags',
      label: 'Hashtags',
      helper: 'Optional. Facebook hashtags are less important than other platforms, but 1-3 can help with discovery.',
      required: false
    },
    {
      key: 'cta',
      label: 'Call to action',
      helper: 'Tell your audience what to do — comment, share, tag a friend, or click a link.',
      required: false
    }
  ]
};

export const PLATFORM_CONTENT_TYPES = {
  instagram: ['Post', 'Reel', 'Story', 'Carousel'],
  tiktok: ['Video', 'Story', 'Photo'],
  youtube: ['Video', 'Short'],
  twitter: ['Post', 'Thread'],
  linkedin: ['Post', 'Article'],
  facebook: ['Post', 'Reel', 'Story']
};

export const getSlotsForPlatform = (platform) => {
  return PLATFORM_SLOTS[platform] || [];
};

/** Whether a platform's kit definition includes this slot key (for Add to kit filtering). */
export function platformHasSlotKey(platform, slotKey) {
  return (PLATFORM_SLOTS[platform] || []).some((s) => s.key === slotKey);
}

export const getKitStatus = (kit, slotContents) => {
  if (kit.is_used) return 'used';
  const platformSlots = PLATFORM_SLOTS[kit.platform] || [];
  const requiredSlots = platformSlots.filter(s => s.required);
  const allRequiredFilled = requiredSlots.every(
    s => slotContents[s.key] && slotContents[s.key].trim() !== ''
  );
  return allRequiredFilled ? 'ready' : 'draft';
};
