import { parseTimestamp } from 'm3u8stream';
import { URL } from 'url';
import qs from 'querystring';

import * as utils from './utils';

const BASE_URL = 'https://www.youtube.com/watch?v=';
const TITLE_TO_CATEGORY = {
  song: { name: 'Music', url: 'https://music.youtube.com/' },
};

const getText = obj => obj ? obj.runs ? obj.runs[0].text : obj.simpleText : null;


/**
 * Get video media.
 */
export const getMedia = (info: object): object => {
  const media = {};
  let results = [];
  try {
    results = info.response.contents.twoColumnWatchNextResults.results.results.contents;
  } catch (err) {
    // Do nothing
  }

  const result = results.find(v => v.videoSecondaryInfoRenderer);
  if (!result) { return {}; }

  try {
    const metadataRows =
      (result.metadataRowContainer || result.videoSecondaryInfoRenderer.metadataRowContainer)
        .metadataRowContainerRenderer.rows;
    for (const row of metadataRows) {
      if (row.metadataRowRenderer) {
        const title = getText(row.metadataRowRenderer.title).toLowerCase();
        const contents = row.metadataRowRenderer.contents[0];
        media[title] = getText(contents);
        const runs = contents.runs;
        if (runs?.[0].navigationEndpoint) {
          media[`${title}_url`] = new URL(
            runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url, BASE_URL).toString();
        }
        if (title in TITLE_TO_CATEGORY) {
          media.category = TITLE_TO_CATEGORY[title].name;
          media.category_url = TITLE_TO_CATEGORY[title].url;
        }
      } else if (row.richMetadataRowRenderer) {
        const contents = row.richMetadataRowRenderer.contents;
        const boxArt = contents
          .filter(meta => meta.richMetadataRenderer.style === 'RICH_METADATA_RENDERER_STYLE_BOX_ART');
        for (const { richMetadataRenderer } of boxArt) {
          const meta = richMetadataRenderer;
          media.year = getText(meta.subtitle);
          const type = getText(meta.callToAction).split(' ')[1];
          media[type] = getText(meta.title);
          media[`${type}_url`] = new URL(
            meta.endpoint.commandMetadata.webCommandMetadata.url, BASE_URL).toString();
          media.thumbnails = meta.thumbnail.thumbnails;
        }
        const topic = contents
          .filter(meta => meta.richMetadataRenderer.style === 'RICH_METADATA_RENDERER_STYLE_TOPIC');
        for (const { richMetadataRenderer } of topic) {
          const meta = richMetadataRenderer;
          media.category = getText(meta.title);
          media.category_url = new URL(
            meta.endpoint.commandMetadata.webCommandMetadata.url, BASE_URL).toString();
        }
      }
    }
  } catch (err) {
    // Do nothing.
  }

  return media;
};


const isVerified = badges => !!(badges && badges.find(b => b.metadataBadgeRenderer.tooltip === 'Verified'));


/**
 * Get video author.
 */
export const getAuthor = (info: object): object => {
  let channelId, thumbnails = [], subscriberCount, verified = false;
  try {
    const results = info.response.contents.twoColumnWatchNextResults.results.results.contents;
    const v = results.find(v2 =>
      v2.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer);
    const videoOwnerRenderer = v.videoSecondaryInfoRenderer.owner.videoOwnerRenderer;
    channelId = videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId;
    thumbnails = videoOwnerRenderer.thumbnail.thumbnails.map(thumbnail => {
      thumbnail.url = new URL(thumbnail.url, BASE_URL).toString();
      return thumbnail;
    });
    subscriberCount = utils.parseAbbreviatedNumber(getText(videoOwnerRenderer.subscriberCountText));
    verified = isVerified(videoOwnerRenderer.badges);
  } catch (err) {
    // Do nothing.
  }
  try {
    const videoDetails = info.player_response.microformat?.playerMicroformatRenderer;
    const id = videoDetails?.channelId || channelId || info.player_response.videoDetails.channelId;
    const author = {
      id: id,
      name: videoDetails ? videoDetails.ownerChannelName : info.player_response.videoDetails.author,
      user: videoDetails ? videoDetails.ownerProfileUrl.split('/').slice(-1)[0] : null,
      channel_url: `https://www.youtube.com/channel/${id}`,
      external_channel_url: videoDetails ? `https://www.youtube.com/channel/${videoDetails.externalChannelId}` : '',
      user_url: videoDetails ? new URL(videoDetails.ownerProfileUrl, BASE_URL).toString() : '',
      thumbnails,
      verified,
      subscriber_count: subscriberCount,
    };
    if (thumbnails.length) {
      utils.deprecate(author, 'avatar', author.thumbnails[0].url, 'author.avatar', 'author.thumbnails[0].url');
    }
    return author;
  } catch (err) {
    return {};
  }
};

const parseRelatedVideo = (details, rvsParams) => {
  if (!details) return;
  try {
    let viewCount = getText(details.viewCountText);
    let shortViewCount = getText(details.shortViewCountText);
    const rvsDetails = rvsParams.find(elem => elem.id === details.videoId);
    if (!/^\d/.test(shortViewCount)) {
      shortViewCount = rvsDetails?.short_view_count_text || '';
    }
    viewCount = (/^\d/.test(viewCount) ? viewCount : shortViewCount).split(' ')[0];
    const browseEndpoint = details.shortBylineText.runs[0].navigationEndpoint.browseEndpoint;
    const channelId = browseEndpoint.browseId;
    const name = getText(details.shortBylineText);
    const user = (browseEndpoint.canonicalBaseUrl || '').split('/').slice(-1)[0];
    const video = {
      id: details.videoId,
      title: getText(details.title),
      published: getText(details.publishedTimeText),
      author: {
        id: channelId,
        name,
        user,
        channel_url: `https://www.youtube.com/channel/${channelId}`,
        user_url: `https://www.youtube.com/user/${user}`,
        thumbnails: details.channelThumbnail.thumbnails.map(thumbnail => {
          thumbnail.url = new URL(thumbnail.url, BASE_URL).toString();
          return thumbnail;
        }),
        verified: isVerified(details.ownerBadges),

        [Symbol.toPrimitive]() {
          console.warn(`\`relatedVideo.author\` will be removed in a near future release, ` +
            `use \`relatedVideo.author.name\` instead.`);
          return video.author.name;
        },

      },
      short_view_count_text: shortViewCount.split(' ')[0],
      view_count: viewCount.replace(/,/g, ''),
      length_seconds: details.lengthText ?
        Math.floor(parseTimestamp(getText(details.lengthText)) / 1000) :
        rvsParams && `${rvsParams.length_seconds}`,
      thumbnails: details.thumbnail.thumbnails,
      richThumbnails:
        details.richThumbnail ?
          details.richThumbnail.movingThumbnailRenderer.movingThumbnailDetails.thumbnails : [],
      isLive: !!(details.badges && details.badges.find(b => b.metadataBadgeRenderer.label === 'LIVE NOW')),
    };

    utils.deprecate(video, 'author_thumbnail', video.author.thumbnails[0].url,
      'relatedVideo.author_thumbnail', 'relatedVideo.author.thumbnails[0].url');
    utils.deprecate(video, 'ucid', video.author.id, 'relatedVideo.ucid', 'relatedVideo.author.id');
    utils.deprecate(video, 'video_thumbnail', video.thumbnails[0].url,
      'relatedVideo.video_thumbnail', 'relatedVideo.thumbnails[0].url');
    return video;
  } catch (err) {
    // Skip.
  }
};

/**
 * Get related videos.
 */
export const getRelatedVideos = (info: object): object[] => {
  let rvsParams = [], secondaryResults = [];
  try {
    rvsParams = info.response.webWatchNextResponseExtensionData.relatedVideoArgs.split(',').map(e => qs.parse(e));
  } catch (err) {
    // Do nothing.
  }
  try {
    secondaryResults = info.response.contents.twoColumnWatchNextResults.secondaryResults.secondaryResults.results;
  } catch (err) {
    return [];
  }
  const videos = [];
  for (const result of secondaryResults || []) {
    const details = result.compactVideoRenderer;
    if (details) {
      const video = parseRelatedVideo(details, rvsParams);
      if (video) videos.push(video);
    } else {
      const autoplay = result.compactAutoplayRenderer || result.itemSectionRenderer;
      if (!autoplay || !Array.isArray(autoplay.contents)) continue;
      for (const content of autoplay.contents) {
        const video = parseRelatedVideo(content.compactVideoRenderer, rvsParams);
        if (video) videos.push(video);
      }
    }
  }
  return videos;
};

/**
 * Get like count.
 */
export const getLikes = (info: object): number => {
  try {
    const contents = info.response.contents.twoColumnWatchNextResults.results.results.contents;
    const video = contents.find(r => r.videoPrimaryInfoRenderer);
    const buttons = video.videoPrimaryInfoRenderer.videoActions.menuRenderer.topLevelButtons;
    const like = buttons.find(b => b.toggleButtonRenderer &&
      b.toggleButtonRenderer.defaultIcon.iconType === 'LIKE');
    return parseInt(like.toggleButtonRenderer.defaultText.accessibility.accessibilityData.label.replace(/\D+/g, ''));
  } catch (err) {
    return null;
  }
};

/**
 * Get dislike count.
 */
export const getDislikes = (info: object): number => {
  try {
    const contents = info.response.contents.twoColumnWatchNextResults.results.results.contents;
    const video = contents.find(r => r.videoPrimaryInfoRenderer);
    const buttons = video.videoPrimaryInfoRenderer.videoActions.menuRenderer.topLevelButtons;
    const dislike = buttons.find(b => b.toggleButtonRenderer &&
      b.toggleButtonRenderer.defaultIcon.iconType === 'DISLIKE');
    return parseInt(dislike.toggleButtonRenderer.defaultText.accessibility.accessibilityData.label.replace(/\D+/g, ''));
  } catch (err) {
    return null;
  }
};

/**
 * Cleans up a few fields on `videoDetails`.
 */
export const cleanVideoDetails = (videoDetails: object, info: object): object => {
  videoDetails.thumbnails = videoDetails.thumbnail.thumbnails;
  delete videoDetails.thumbnail;
  utils.deprecate(videoDetails, 'thumbnail', { thumbnails: videoDetails.thumbnails },
    'videoDetails.thumbnail.thumbnails', 'videoDetails.thumbnails');
  videoDetails.description = videoDetails.shortDescription || getText(videoDetails.description);
  delete videoDetails.shortDescription;
  utils.deprecate(videoDetails, 'shortDescription', videoDetails.description,
    'videoDetails.shortDescription', 'videoDetails.description');

  // Use more reliable `lengthSeconds` from `playerMicroformatRenderer`.
  videoDetails.lengthSeconds =
    info.player_response.microformat?.playerMicroformatRenderer.lengthSeconds;
  return videoDetails;
};

/**
 * Get storyboards info.
 */
export const getStoryboards = (info: object): object => {
  const parts = info.player_response.storyboards?.playerStoryboardSpecRenderer?.spec?.split('|');

  if (!parts) return [];

  const url = new URL(parts.shift());

  return parts.map((part, i) => {
    let [
      thumbnailWidth,
      thumbnailHeight,
      thumbnailCount,
      columns,
      rows,
      interval,
      nameReplacement,
      sigh,
    ] = part.split('#');

    url.searchParams.set('sigh', sigh);

    thumbnailCount = parseInt(thumbnailCount, 10);
    columns = parseInt(columns, 10);
    rows = parseInt(rows, 10);

    const storyboardCount = Math.ceil(thumbnailCount / (columns * rows));

    return {
      templateUrl: url.toString().replace('$L', i).replace('$N', nameReplacement),
      thumbnailWidth: parseInt(thumbnailWidth, 10),
      thumbnailHeight: parseInt(thumbnailHeight, 10),
      thumbnailCount,
      interval: parseInt(interval, 10),
      columns,
      rows,
      storyboardCount,
    };
  });
};
