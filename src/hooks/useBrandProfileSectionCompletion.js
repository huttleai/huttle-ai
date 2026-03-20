import { useMemo } from 'react';

function normalizeKind(formData) {
  if (formData?.creatorKind === 'solo_creator' || formData?.creatorKind === 'brand_business') {
    return formData.creatorKind;
  }
  const ct = String(formData?.creatorType || '').toLowerCase();
  if (ct === 'solo_creator') return 'solo_creator';
  if (ct === 'brand_business') return 'brand_business';
  const pt = String(formData?.profileType || '').toLowerCase();
  if (pt === 'creator') return 'solo_creator';
  return 'brand_business';
}

function hasTone(formData) {
  const chips = formData?.toneChips;
  return Array.isArray(chips) && chips.length > 0;
}

/**
 * Section completion for Brand Profile (6 sections). Uses camelCase form fields
 * aligned with BrandContext / unified form state).
 */
export function getBrandProfileSectionCompletion(formData, authUser) {
  const kind = normalizeKind(formData || {});
  const isBusiness = kind === 'brand_business';

  const firstName = (
    (formData?.firstName || '').trim()
    || (authUser?.user_metadata?.first_name || '').trim()
    || (authUser?.user_metadata?.name || '').trim()
    || (authUser?.user_metadata?.full_name || '').trim()
  );

  const creatorTypeFilled = kind === 'solo_creator' || kind === 'brand_business';

  const nicheRaw = formData?.niche;
  const nicheFilled =
    (typeof nicheRaw === 'string' && nicheRaw.trim().length > 0)
    || (Array.isArray(nicheRaw) && nicheRaw.length > 0);

  const audiencePain = (formData?.audiencePainPoint || '').trim();
  const targetAud = (formData?.targetAudience || '').trim();

  const writing = (formData?.writingStyle || '').trim();

  const platforms = formData?.platforms;
  const platformsFilled = Array.isArray(platforms) && platforms.length > 0;

  let goalsComplete = false;
  if (isBusiness) {
    goalsComplete = !!(
      (formData?.primaryOffer || '').trim()
      || (formData?.conversionGoal || '').trim()
      || (Array.isArray(formData?.goals) && formData.goals.length > 0)
      || (formData?.industry || '').trim()
    );
  } else {
    goalsComplete = !!(
      (formData?.contentPersona || '').trim()
      || (formData?.monetizationGoal || '').trim()
      || (formData?.showUpStyle || '').trim()
      || (Array.isArray(formData?.goals) && formData.goals.length > 0)
    );
  }

  const sections = {
    aboutYou: {
      key: 'aboutYou',
      complete: !!firstName && creatorTypeFilled,
      label: 'About You',
    },
    yourNiche: {
      key: 'yourNiche',
      complete: nicheFilled,
      label: 'Your Niche',
    },
    yourAudience: {
      key: 'yourAudience',
      complete: !!targetAud && !!audiencePain,
      label: 'Your Audience',
    },
    yourVoice: {
      key: 'yourVoice',
      complete: hasTone(formData) && !!writing,
      label: 'Your Voice',
    },
    yourPlatforms: {
      key: 'yourPlatforms',
      complete: platformsFilled,
      label: 'Your Platforms',
    },
    yourGoals: {
      key: 'yourGoals',
      complete: goalsComplete,
      label: 'Your Goals',
    },
  };

  const completedCount = Object.values(sections).filter((s) => s.complete).length;
  const totalCount = Object.keys(sections).length;

  return { sections, completedCount, totalCount, kind: isBusiness ? 'brand_business' : 'solo_creator' };
}

export function useBrandProfileSectionCompletion(formData, authUser) {
  return useMemo(
    () => getBrandProfileSectionCompletion(formData, authUser),
    [formData, authUser]
  );
}
