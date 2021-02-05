import miniget from 'miniget';
// Remove it
import querystring from 'querystring';
import sax from 'sax';
// Forces Node JS version of setTimeout for Electron based applications
import { setTimeout } from 'timers';
import { URL } from 'url';

import Cache from './cache';
import * as formatUtils from './format-utils';
import * as extras from './info-extras';
import * as sig from './sig';
import * as urlUtils from './url-utils';
import * as utils from './utils';

const BASE_URL = 'https://www.youtube.com/watch?v=';

export interface GetInfoOptions {
  lang?: string;
  // To add type
  requestOptions?: {};
}

interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

interface CaptionTrack {
  baseUrl: string;
  name: {
    simpleText: 'Afrikaans' | 'Albanian' | 'Amharic' | 'Arabic' | 'Armenian' | 'Azerbaijani' | 'Bangla' | 'Basque'
    | 'Belarusian' | 'Bosnian' | 'Bulgarian' | 'Burmese' | 'Catalan' | 'Cebuano' | 'Chinese (Simplified)'
    | 'Chinese (Traditional)' | 'Corsican' | 'Croatian' | 'Czech' | 'Danish' | 'Dutch' | 'English'
    | 'English (auto-generated)' | 'Esperanto' | 'Estonian' | 'Filipino' | 'Finnish' | 'French' | 'Galician'
    | 'Georgian' | 'German' | 'Greek' | 'Gujarati' | 'Haitian Creole' | 'Hausa' | 'Hawaiian' | 'Hebrew' | 'Hindi'
    | 'Hmong' | 'Hungarian' | 'Icelandic' | 'Igbo' | 'Indonesian' | 'Irish' | 'Italian' | 'Japanese' | 'Javanese'
    | 'Kannada' | 'Kazakh' | 'Khmer' | 'Korean' | 'Kurdish' | 'Kyrgyz' | 'Lao' | 'Latin' | 'Latvian' | 'Lithuanian'
    | 'Luxembourgish' | 'Macedonian' | 'Malagasy' | 'Malay' | 'Malayalam' | 'Maltese' | 'Maori' | 'Marathi'
    | 'Mongolian' | 'Nepali' | 'Norwegian' | 'Nyanja' | 'Pashto' | 'Persian' | 'Polish' | 'Portuguese' | 'Punjabi'
    | 'Romanian' | 'Russian' | 'Samoan' | 'Scottish Gaelic' | 'Serbian' | 'Shona' | 'Sindhi' | 'Sinhala' | 'Slovak'
    | 'Slovenian' | 'Somali' | 'Southern Sotho' | 'Spanish' | 'Spanish (Spain)' | 'Sundanese' | 'Swahili'
    | 'Swedish' | 'Tajik' | 'Tamil' | 'Telugu' | 'Thai' | 'Turkish' | 'Ukrainian' | 'Urdu' | 'Uzbek' | 'Vietnamese'
    | 'Welsh' | 'Western Frisian' | 'Xhosa' | 'Yiddish' | 'Yoruba' | 'Zulu' | string;
  };
  vssId: string;
  languageCode: 'af' | 'sq' | 'am' | 'ar' | 'hy' | 'az' | 'bn' | 'eu' | 'be' | 'bs' | 'bg' | 'my' | 'ca' | 'ceb'
  | 'zh-Hans' | 'zh-Hant' | 'co' | 'hr' | 'cs' | 'da' | 'nl' | 'en' | 'eo' | 'et' | 'fil' | 'fi' | 'fr' | 'gl'
  | 'ka' | 'de' | 'el' | 'gu' | 'ht' | 'ha' | 'haw' | 'iw' | 'hi' | 'hmn' | 'hu' | 'is' | 'ig' | 'id' | 'ga' | 'it'
  | 'ja' | 'jv' | 'kn' | 'kk' | 'km' | 'ko' | 'ku' | 'ky' | 'lo' | 'la' | 'lv' | 'lt' | 'lb' | 'mk' | 'mg' | 'ms'
  | 'ml' | 'mt' | 'mi' | 'mr' | 'mn' | 'ne' | 'no' | 'ny' | 'ps' | 'fa' | 'pl' | 'pt' | 'pa' | 'ro' | 'ru' | 'sm'
  | 'gd' | 'sr' | 'sn' | 'sd' | 'si' | 'sk' | 'sl' | 'so' | 'st' | 'es' | 'su' | 'sw' | 'sv' | 'tg' | 'ta' | 'te'
  | 'th' | 'tr' | 'uk' | 'ur' | 'uz' | 'vi' | 'cy' | 'fy' | 'xh' | 'yi' | 'yo' | 'zu' | string;
  kind: string;
  rtl?: boolean;
  isTranslatable: boolean;
}

interface AudioTrack {
  captionTrackIndices: number[];
}

interface TranslationLanguage {
  languageCode: CaptionTrack['languageCode'];
  languageName: CaptionTrack['name'];
}

export interface VideoDetails {
  videoId: string;
  title: string;
  shortDescription: string;
  lengthSeconds: string;
  keywords?: string[];
  channelId: string;
  isOwnerViewing: boolean;
  isCrawlable: boolean;
  thumbnail: {
    thumbnails: Thumbnail[];
  };
  averageRating: number;
  allowRatings: boolean;
  viewCount: string;
  author: string;
  isPrivate: boolean;
  isUnpluggedCorpus: boolean;
  isLiveContent: boolean;
}

interface Media {
  category: string;
  category_url: string;
  game?: string;
  game_url?: string;
  year?: number;
  song?: string;
  artist?: string;
  artist_url?: string;
  writers?: string;
  licensed_by?: string;
  thumbnails: Thumbnail[];
}

interface Author {
  id: string;
  name: string;
  avatar: string; // To remove later
  thumbnails?: Thumbnail[];
  verified: boolean;
  user?: string;
  channel_url: string;
  external_channel_url?: string;
  user_url?: string;
  subscriber_count?: number;
}

interface MicroformatRenderer {
  thumbnail: {
    thumbnails: Thumbnail[];
  };
  embed: {
    iframeUrl: string;
    flashUrl: string;
    width: number;
    height: number;
    flashSecureUrl: string;
  };
  title: {
    simpleText: string;
  };
  description: {
    simpleText: string;
  };
  lengthSeconds: string;
  ownerProfileUrl: string;
  ownerGplusProfileUrl?: string;
  externalChannelId: string;
  isFamilySafe: boolean;
  availableCountries: string[];
  isUnlisted: boolean;
  hasYpcMetadata: boolean;
  viewCount: string;
  category: string;
  publishDate: string;
  ownerChannelName: string;
  liveBroadcastDetails?: {
    isLiveNow: boolean;
    startTimestamp: string;
  };
  uploadDate: string;
}

interface Storyboard {
  templateUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  thumbnailCount: number;
  interval: number;
  columns: number;
  rows: number;
  storyboardCount: number;
}

type MoreVideoDetails =
  & Omit<VideoDetails, 'author' | 'thumbnail' | 'shortDescription'>
  & Omit<MicroformatRenderer, 'title' | 'description'>
  & {
    published: number;
    video_url: string;
    age_restricted: boolean;
    likes: number | null;
    dislikes: number | null;
    media: Media;
    author: Author;
    thumbnails: Thumbnail[];
    storyboards: Storyboard[];
    description: string | null;
  };

// To clean up
export interface VideoInfo {
  iv_load_policy?: string;
  iv_allow_in_place_switch?: string;
  iv_endscreen_url?: string;
  iv_invideo_url?: string;
  iv3_module?: string;
  rmktEnabled?: string;
  uid?: string;
  vid?: string;
  focEnabled?: string;
  baseUrl?: string;
  storyboard_spec?: string;
  serialized_ad_ux_config?: string;
  player_error_log_fraction?: string;
  sffb?: string;
  ldpj?: string;
  videostats_playback_base_url?: string;
  innertube_context_client_version?: string;
  t?: string;
  fade_in_start_milliseconds: string;
  timestamp: string;
  ad3_module: string;
  relative_loudness: string;
  allow_below_the_player_companion: string;
  eventid: string;
  token: string;
  atc: string;
  cr: string;
  apply_fade_on_midrolls: string;
  cl: string;
  fexp: string[];
  apiary_host: string;
  fade_in_duration_milliseconds: string;
  fflags: string;
  ssl: string;
  pltype: string;
  enabled_engage_types: string;
  hl: string;
  is_listed: string;
  gut_tag: string;
  apiary_host_firstparty: string;
  enablecsi: string;
  csn: string;
  status: string;
  afv_ad_tag: string;
  idpj: string;
  sfw_player_response: string;
  account_playback_token: string;
  encoded_ad_safety_reason: string;
  tag_for_children_directed: string;
  no_get_video_log: string;
  ppv_remarketing_url: string;
  fmt_list: string[][];
  ad_slots: string;
  fade_out_duration_milliseconds: string;
  instream_long: string;
  allow_html5_ads: string;
  core_dbp: string;
  ad_device: string;
  itct: string;
  root_ve_type: string;
  excluded_ads: string;
  aftv: string;
  loeid: string;
  cver: string;
  shortform: string;
  dclk: string;
  csi_page_type: string;
  ismb: string;
  gpt_migration: string;
  loudness: string;
  ad_tag: string;
  of: string;
  probe_url: string;
  vm: string;
  afv_ad_tag_restricted_to_instream: string;
  gapi_hint_params: string;
  cid: string;
  c: string;
  oid: string;
  ptchn: string;
  as_launched_in_country: string;
  avg_rating: string;
  fade_out_start_milliseconds: string;
  midroll_prefetch_size: string;
  allow_ratings: string;
  thumbnail_url: string;
  iurlsd: string;
  iurlmq: string;
  iurlhq: string;
  iurlmaxres: string;
  ad_preroll: string;
  tmi: string;
  trueview: string;
  host_language: string;
  innertube_api_key: string;
  show_content_thumbnail: string;
  afv_instream_max: string;
  innertube_api_version: string;
  mpvid: string;
  allow_embed: string;
  ucid: string;
  plid: string;
  midroll_freqcap: string;
  ad_logging_flag: string;
  ptk: string;
  vmap: string;
  watermark: string[];
  dbp: string;
  ad_flags: string;
  html5player: string;
  formats: formatUtils.VideoFormat[];
  related_videos: RelatedVideo[];
  no_embed_allowed?: boolean;
  player_response: {
    playabilityStatus: {
      status: string;
      playableInEmbed: boolean;
      miniplayer: {
        miniplayerRenderer: {
          playbackMode: string;
        };
      };
      contextParams: string;
    };
    streamingData: {
      expiresInSeconds: string;
      formats: {}[];
      adaptiveFormats: {}[];
    };
    captions?: {
      playerCaptionsRenderer: {
        baseUrl: string;
        visibility: string;
      };
      playerCaptionsTracklistRenderer: {
        captionTracks: CaptionTrack[];
        audioTracks: AudioTrack[];
        translationLanguages: TranslationLanguage[];
        defaultAudioTrackIndex: number;
      };
    };
    microformat: {
      playerMicroformatRenderer: MicroformatRenderer;
    };
    videoDetails: VideoDetails;
  };
  videoDetails: MoreVideoDetails;
}

interface RelatedVideo {
  id?: string;
  title?: string;
  published?: string;
  author: Author | 'string'; // To remove the `string` part later
  ucid?: string; // To remove later
  author_thumbnail?: string; // To remove later
  short_view_count_text?: string;
  view_count?: string;
  length_seconds?: number;
  video_thumbnail?: string; // To remove later
  thumbnails: Thumbnail[];
  richThumbnails: Thumbnail[];
  isLive: boolean;
}

// Cached for storing basic/full info.
export const cache = new Cache();
export const cookieCache = new Cache(1000 * 60 * 60 * 24);
export const watchPageCache = new Cache();


// Special error class used to determine if an error is unrecoverable,
// as in, ytdl-core should not try again to fetch the video metadata.
// In this case, the video is usually unavailable in some way.
class UnrecoverableError extends Error {}


/**
 * List of URLs that show up in `notice_url` for age restricted videos.
 */
const AGE_RESTRICTED_URLS = [
  'support.google.com/youtube/?p=age_restrictions',
  'youtube.com/t/community_guidelines',
];


/**
 * Gets info from a video without getting additional formats.
 */
export const getBasicInfo = async(id: string, options?: GetInfoOptions): Promise<VideoInfo> => {
  const retryOptions = Object.assign({}, miniget.defaultOptions, options.requestOptions);
  options.requestOptions = Object.assign({}, options.requestOptions, {});
  options.requestOptions.headers = Object.assign({},
    {
      // eslint-disable-next-line max-len
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Safari/537.36',
    }, options.requestOptions.headers);
  const validate = info => {
    const playErr = utils.playError(info.player_response, ['ERROR'], UnrecoverableError);
    const privateErr = privateVideoError(info.player_response);
    if (playErr || privateErr) {
      throw playErr || privateErr;
    }
    return info?.player_response && (
      info.player_response.streamingData || isRental(info.player_response) || isNotYetBroadcasted(info.player_response)
    );
  };
  const info = await pipeline([id, options], validate, retryOptions, [
    getWatchHTMLPage,
    getWatchJSONPage,
    getVideoInfoPage,
  ]);

  Object.assign(info, {
    formats: parseFormats(info.player_response),
    related_videos: extras.getRelatedVideos(info),
  });

  // Add additional properties to info.
  const media = extras.getMedia(info);
  const additional = {
    author: extras.getAuthor(info),
    media,
    likes: extras.getLikes(info),
    dislikes: extras.getDislikes(info),
    age_restricted: !!(media?.notice_url && AGE_RESTRICTED_URLS.some(url => media.notice_url.includes(url))),

    // Give the standard link to the video.
    video_url: BASE_URL + id,
    storyboards: extras.getStoryboards(info),
  };

  info.videoDetails = extras.cleanVideoDetails(Object.assign({},
    info.player_response?.microformat?.playerMicroformatRenderer,
    info.player_response?.videoDetails, additional), info);

  return info;
};

const privateVideoError = player_response => {
  const playability = player_response?.playabilityStatus;
  if (playability && playability.status === 'LOGIN_REQUIRED' && playability.messages &&
    playability.messages.filter(m => /This is a private video/.test(m)).length) {
    return new UnrecoverableError(playability.reason || playability.messages?.[0]);
  } else {
    return null;
  }
};


const isRental = player_response => {
  const playability = player_response.playabilityStatus;
  return playability && playability.status === 'UNPLAYABLE' &&
    playability.errorScreen && playability.errorScreen.playerLegacyDesktopYpcOfferRenderer;
};


const isNotYetBroadcasted = player_response => {
  const playability = player_response.playabilityStatus;
  return playability && playability.status === 'LIVE_STREAM_OFFLINE';
};


const getWatchHTMLURL = (id, options) => `${BASE_URL + id}&hl=${options.lang || 'en'}`;
const getWatchHTMLPageBody = (id, options) => {
  const url = getWatchHTMLURL(id, options);
  return watchPageCache.getOrSet(url, () => miniget(url, options.requestOptions).text());
};


const EMBED_URL = 'https://www.youtube.com/embed/';
const getEmbedPageBody = (id, options) => {
  const embedUrl = `${EMBED_URL + id}?hl=${options.lang || 'en'}`;
  return miniget(embedUrl, options.requestOptions).text();
};


const getHTML5player = body => {
  const html5playerRes =
    /<script\s+src="([^"]+)"(?:\s+type="text\/javascript")?\s+name="player_ias\/base"\s*>|"jsUrl":"([^"]+)"/
      .exec(body);
  return html5playerRes ? html5playerRes[1] || html5playerRes[2] : null;
};


const getIdentityToken = (id, options, key, throwIfNotFound) =>
  cookieCache.getOrSet(key, async() => {
    const page = await getWatchHTMLPageBody(id, options);
    const match = page.match(/(["'])ID_TOKEN\1[:,]\s?"([^"]+)"/);
    if (!match && throwIfNotFound) {
      throw new UnrecoverableError('Cookie header used in request, but unable to find YouTube identity token');
    }
    return match?.[2];
  });


/**
 * Goes through each endpoint in the pipeline, retrying on failure if the error is recoverable.
 * If unable to succeed with one endpoint, moves onto the next one.
 */
const pipeline = async(args: object[], validate: Function, retryOptions: object, endpoints: Function[]): [object, object, object] => {
  let info;
  for (const func of endpoints) {
    try {
      const newInfo = await retryFunc(func, args.concat([info]), retryOptions);
      if (newInfo.player_response) {
        newInfo.player_response.videoDetails = assign(
          info?.player_response?.videoDetails,
          newInfo.player_response.videoDetails);
        newInfo.player_response = assign(info?.player_response, newInfo.player_response);
      }
      info = assign(info, newInfo);
      if (validate(info, false)) {
        break;
      }
    } catch (err) {
      if (err instanceof UnrecoverableError || func === endpoints[endpoints.length - 1]) {
        throw err;
      }
      // Unable to find video metadata... so try next endpoint.
    }
  }
  return info;
};


/**
 * Like Object.assign(), but ignores `null` and `undefined` from `source`.
 */
const assign = (target: object, source: object): object => {
  if (!target || !source) { return target || source; }
  for (const [key, value] of Object.entries(source)) {
    if (value !== null && value !== undefined) {
      target[key] = value;
    }
  }
  return target;
};


/**
 * Given a function, calls it with `args` until it's successful,
 * or until it encounters an unrecoverable error.
 * Currently, any error from miniget is considered unrecoverable. Errors such as
 * too many redirects, invalid URL, status code 404, status code 502.
 */
const retryFunc = async(func: Function, args: object[], options: { maxRetries: number, backoff: { inc: number } }) => {
  let currentTry = 0, result;
  while (currentTry <= options.maxRetries) {
    try {
      result = await func(...args);
      break;
    } catch (err) {
      if (err instanceof UnrecoverableError ||
        (err instanceof miniget.MinigetError && err.statusCode < 500) || currentTry >= options.maxRetries) {
        throw err;
      }
      const wait = Math.min(++currentTry * options.backoff.inc, options.backoff.max);
      await new Promise(resolve => setTimeout(resolve, wait));
    }
  }
  return result;
};


const jsonClosingChars = /^[)\]}'\s]+/;
const parseJSON = (source, varName, json) => {
  if (!json || typeof json === 'object') {
    return json;
  } else {
    try {
      json = json.replace(jsonClosingChars, '');
      return JSON.parse(json);
    } catch (err) {
      throw Error(`Error parsing ${varName} in ${source}: ${err.message}`);
    }
  }
};


const findJSON = (source, varName, body, left, right, prependJSON) => {
  const jsonStr = utils.between(body, left, right);
  if (!jsonStr) {
    throw Error(`Could not find ${varName} in ${source}`);
  }
  return parseJSON(source, varName, utils.cutAfterJSON(`${prependJSON}${jsonStr}`));
};


const findPlayerResponse = (source, info) => {
  const player_response = info && (
    info.args?.player_response ||
    info.player_response || info.playerResponse || info.embedded_player_response);
  return parseJSON(source, 'player_response', player_response);
};


const getWatchJSONURL = (id, options) => `${getWatchHTMLURL(id, options)}&pbj=1`;
const getWatchJSONPage = async(id, options) => {
  const reqOptions = Object.assign({ headers: {} }, options.requestOptions);
  const cookie = reqOptions.headers.Cookie || reqOptions.headers.cookie;
  reqOptions.headers = Object.assign({
    'x-youtube-client-name': '1',
    'x-youtube-client-version': '2.20201203.06.00',
    'x-youtube-identity-token': cookieCache.get(cookie || 'browser') || '',
  }, reqOptions.headers);

  const setIdentityToken = async(key, throwIfNotFound) => {
    if (reqOptions.headers['x-youtube-identity-token']) { return; }
    reqOptions.headers['x-youtube-identity-token'] = await getIdentityToken(id, options, key, throwIfNotFound);
  };

  if (cookie) {
    await setIdentityToken(cookie, true);
  }

  const jsonUrl = getWatchJSONURL(id, options);
  const body = await miniget(jsonUrl, reqOptions).text();
  const parsedBody = parseJSON('watch.json', 'body', body);
  if (parsedBody.reload === 'now') {
    await setIdentityToken('browser', false);
  }
  if (parsedBody.reload === 'now' || !Array.isArray(parsedBody)) {
    throw Error('Unable to retrieve video metadata in watch.json');
  }
  const info = parsedBody.reduce((part, curr) => Object.assign(curr, part), {});
  info.player_response = findPlayerResponse('watch.json', info);
  info.html5player = info.player?.assets?.js;

  return info;
};


const getWatchHTMLPage = async(id, options) => {
  const body = await getWatchHTMLPageBody(id, options);
  const info = { page: 'watch' };
  try {
    info.player_response = findJSON('watch.html', 'player_response',
      body, /\bytInitialPlayerResponse\s*=\s*\{/i, '\n', '{');
  } catch (err) {
    const args = findJSON('watch.html', 'player_response', body, /\bytplayer\.config\s*=\s*{/, '</script>', '{');
    info.player_response = findPlayerResponse('watch.html', args);
  }
  info.response = findJSON('watch.html', 'response', body, /\bytInitialData("\])?\s*=\s*\{/i, '\n', '{');
  info.html5player = getHTML5player(body);
  return info;
};


const INFO_HOST = 'www.youtube.com';
const INFO_PATH = '/get_video_info';
const VIDEO_EURL = 'https://youtube.googleapis.com/v/';
const getVideoInfoPage = async(id, options) => {
  const url = new URL(`https://${INFO_HOST}${INFO_PATH}`);
  url.searchParams.set('video_id', id);
  url.searchParams.set('eurl', VIDEO_EURL + id);
  url.searchParams.set('ps', 'default');
  url.searchParams.set('gl', 'US');
  url.searchParams.set('hl', options.lang || 'en');
  const body = await miniget(url.toString(), options.requestOptions).text();
  const info = querystring.parse(body);
  info.player_response = findPlayerResponse('get_video_info', info);
  return info;
};

const parseFormats = (player_response: object): object[] => {
  let formats = [];
  if (player_response?.streamingData) {
    formats = formats
      .concat(player_response.streamingData.formats || [])
      .concat(player_response.streamingData.adaptiveFormats || []);
  }
  return formats;
};


/**
 * Gets info from a video additional formats and deciphered URLs.
 */
export const getInfo = async(id: string, options?: GetInfoOptions): Promise<VideoInfo> => {
  const info = await getBasicInfo(id, options);
  const hasManifest =
    info.player_response?.streamingData && (
      info.player_response.streamingData.dashManifestUrl ||
      info.player_response.streamingData.hlsManifestUrl
    );
  const funcs = [];
  if (info.formats.length) {
    info.html5player = info.html5player ||
      getHTML5player(await getWatchHTMLPageBody(id, options)) || getHTML5player(await getEmbedPageBody(id, options));
    if (!info.html5player) {
      throw Error('Unable to find html5player file');
    }
    const html5player = new URL(info.html5player, BASE_URL).toString();
    funcs.push(sig.decipherFormats(info.formats, html5player, options));
  }
  if (hasManifest && info.player_response.streamingData.dashManifestUrl) {
    const url = info.player_response.streamingData.dashManifestUrl;
    funcs.push(getDashManifest(url, options));
  }
  if (hasManifest && info.player_response.streamingData.hlsManifestUrl) {
    const url = info.player_response.streamingData.hlsManifestUrl;
    funcs.push(getM3U8(url, options));
  }

  const results = await Promise.all(funcs);
  info.formats = Object.values(Object.assign({}, ...results));
  info.formats = info.formats.map(formatUtils.addFormatMeta);
  info.formats.sort(formatUtils.sortFormats);
  info.full = true;
  return info;
};


/**
 * Gets additional DASH formats.
 */
const getDashManifest = (url: string, options: object): Promise<object[]> => new Promise((resolve, reject) => {
  const formats = {};
  const parser = sax.parser(false);
  parser.onerror = reject;
  let adaptationSet;
  parser.onopentag = node => {
    if (node.name === 'ADAPTATIONSET') {
      adaptationSet = node.attributes;
    } else if (node.name === 'REPRESENTATION') {
      const itag = parseInt(node.attributes.ID);
      if (!isNaN(itag)) {
        formats[url] = Object.assign({
          itag, url,
          bitrate: parseInt(node.attributes.BANDWIDTH),
          mimeType: `${adaptationSet.MIMETYPE}; codecs="${node.attributes.CODECS}"`,
        }, node.attributes.HEIGHT ? {
          width: parseInt(node.attributes.WIDTH),
          height: parseInt(node.attributes.HEIGHT),
          fps: parseInt(node.attributes.FRAMERATE),
        } : {
          audioSampleRate: node.attributes.AUDIOSAMPLINGRATE,
        });
      }
    }
  };
  parser.onend = () => { resolve(formats); };
  const req = miniget(new URL(url, BASE_URL).toString(), options.requestOptions);
  req.setEncoding('utf8');
  req.on('error', reject);
  req.on('data', chunk => { parser.write(chunk); });
  req.on('end', parser.close.bind(parser));
});


/**
 * Gets additional formats.
 */
const getM3U8 = async(url: string, options: object): Promise<object[]> => {
  url = new URL(url, BASE_URL);
  const body = await miniget(url.toString(), options.requestOptions).text();
  const formats = {};
  body
    .split('\n')
    .filter(line => /^https?:\/\//.test(line))
    .forEach(line => {
      const itag = parseInt(line.match(/\/itag\/(\d+)\//)[1]);
      formats[line] = { itag, url: line };
    });
  return formats;
};


// Cache get info functions.
// In case a user wants to get a video's info before downloading.
for (const funcName of ['getBasicInfo', 'getInfo']) {
  /**
   * @param {string} link
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  const func = exports[funcName];
  exports[funcName] = async(link, options = {}) => {
    utils.checkForUpdates();
    const id = await urlUtils.getVideoID(link);
    const key = [funcName, id, options.lang].join('-');
    return cache.getOrSet(key, () => func(id, options));
  };
}
